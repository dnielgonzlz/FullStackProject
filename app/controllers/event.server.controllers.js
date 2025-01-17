const Joi = require('joi');
const events = require('../models/event.server.models');
const {cleanText} = require('../lib/profanity');

/**
 * Event Controller Module
 * Handles all event-related operations including creation, retrieval, updates, and deletion.
 * Uses Joi for input validation and includes profanity filtering for text fields.
 */

/**
 * Creates a new event with validation and sanitization
 * @param {Object} req - Request object containing event details in body
 * @param {Object} res - Response object
 * 
 * Validates:
 * - Event name and description (required, profanity filtered)
 * - Location (required)
 * - Start time (must be in future)
 * - Registration close time (must be 14 days before start)
 * - Max attendees (positive number)
 * - Categories (optional array of category IDs)
 */
const create_event = (req, res) => {
    // Define validation schema for event creation
    const eventSchema = Joi.object({
        name: Joi.string()
            .required()
            .messages({
                'string.empty': 'Event name is required',
                'any.required': 'Event name is required'
            }),
        description: Joi.string()
            .required()
            .messages({
                'string.empty': 'Event description is required',
                'any.required': 'Event description is required'
            }),
        location: Joi.string()
            .required()
            .messages({
                'string.empty': 'Event location is required',
                'any.required': 'Event location is required'
            }),
        start: Joi.string()
            .pattern(/^\d+$/)
            .required()
            .custom((value, helpers) => {
                // Validate that event start time is in the future
                const startTime = parseInt(value);
                const currentTime = Date.now();
                
                if (startTime <= currentTime) {
                    return helpers.error('custom.startTime');
                }
                return value;
            })
            .messages({
                'string.pattern.base': 'Start time must be a valid timestamp',
                'any.required': 'Start time is required',
                'custom.startTime': 'Event cannot start in the past'
            }),
        close_registration: Joi.string()
            .pattern(/^\d+$/)
            .required()
            .custom((value, helpers) => {
                // Validate registration close time is before event start and at least 14 days gap
                const regClose = parseInt(value);
                const startTime = parseInt(helpers.state.ancestors[0].start);
                const minimumGap = 14 * 24 * 60 * 60 * 1000; // 14 days in milliseconds
                
                console.log('Validating registration close:', {
                    regClose,
                    startTime,
                    minimumGap,
                    difference: startTime - regClose
                });
                
                if (regClose >= startTime) {
                    return helpers.error('custom.registrationClose');
                }
                
                if (startTime - regClose < minimumGap) {
                    return helpers.error('custom.minimumGap');
                }
                
                return value;
            })
            .messages({
                'string.pattern.base': 'Registration close time must be a valid timestamp',
                'any.required': 'Registration close time is required',
                'custom.registrationClose': 'Registration must close before event starts',
                'custom.minimumGap': 'Registration must close at least 14 days before the event'
            }),
        max_attendees: Joi.number()
            .integer()
            .min(1)
            .required()
            .messages({
                'number.base': 'Maximum attendees must be a number',
                'number.min': 'Maximum attendees must be at least 1',
                'any.required': 'Maximum attendees is required'
            }),
        categories: Joi.array()
            .items(Joi.number().integer().positive())
            .optional()
            .messages({
                'array.base': 'Categories must be an array',
                'number.base': 'Category IDs must be numbers'
            })
    });

    // Validate request body against schema
    const { error } = eventSchema.validate(req.body);
    if (error) {
        return res.status(400).json({
            error_message: error.details[0].message
        });
    }

    // Create sanitized event object from validated request body
    const event = {
        name: cleanText(req.body.name), // Apply profanity filter
        description: cleanText(req.body.description), // Apply profanity filter
        location: req.body.location,
        start: req.body.start,
        close_registration: req.body.close_registration,
        max_attendees: req.body.max_attendees,
        categories: req.body.categories || []
    };

    // Get creator_id from authenticated user session
    const creator_id = req.user_id;

    // Attempt to create event in database
    events.createEventInDB(event, creator_id, (err, result) => {
        if (err) {
            return res.status(500).json({
                error_message: 'Failed to create event'
            });
        }
        return res.status(201).json({
            event_id: result.event_id
        });
    });
};

/**
 * Retrieves detailed information about a specific event
 * @param {Object} req - Request object with event_id in params
 * @param {Object} res - Response object
 * 
 * Returns:
 * - Basic event details
 * - Creator information
 * - Attendee count
 * - Questions
 * - Full attendee list (only if requester is event creator)
 */
const get_event = (req, res) => {
    // Validate event ID parameter
    const inputSchema = Joi.object({
        event_id: Joi.number()
            .integer()
            .required()
            .messages({
                'number.base': 'Event ID must be a number',
                'number.integer': 'Event ID must be an integer',
                'any.required': 'Event ID is required'
            })
    });

    // Validate input parameters
    const { error } = inputSchema.validate({ event_id: parseInt(req.params.event_id) });
    if (error) {
        return res.status(400).json({
            error_message: error.details[0].message
        });
    }

    // Define schema for validating event details response
    const eventDetailsSchema = Joi.object({
        event_id: Joi.number().integer().required(),
        creator: Joi.object().required(),
        name: Joi.string().required(),
        description: Joi.string().required(),
        location: Joi.string().required(),
        start: Joi.number().integer().required(),
        close_registration: Joi.number().integer().required(),
        max_attendees: Joi.number().integer().required(),
        number_attending: Joi.number().integer().required(),
        attendees: Joi.array().items(Joi.object()).optional(),
        questions: Joi.array().items(Joi.object()).required()
    });

    // Retrieve event from database
    events.getEventFromDB(parseInt(req.params.event_id), (err, row) => {
        if (err) {
            if (err.message === 'Event not found') {
                return res.status(404).json({
                    error_message: 'Event not found'
                });
            }
            return res.status(500).json({
                error_message: 'Internal server error'
            });
        }

        // Check if requesting user is the event creator
        const isCreator = req.user_id !== null && 
                         req.user_id !== undefined && 
                         Number(req.user_id) === Number(row.creator.creator_id);

        // Construct response object
        const response = {
            event_id: row.event_id,
            creator: row.creator,
            name: row.name,
            description: row.description,
            location: row.location,
            start: row.start,
            close_registration: row.close_registration,
            max_attendees: row.max_attendees,
            number_attending: row.number_attending,
            questions: row.questions
        };

        // Only include attendees list if user is the creator
        if (isCreator) {
            response.attendees = row.attendees;
        }

        // Validate response data structure
        const { error: validationError, value } = eventDetailsSchema.validate(response);
        if (validationError) {
            return res.status(500).json({
                error_message: 'Data validation error'
            });
        }

        return res.status(200).json(value);
    });
};

/**
 * Updates an existing event's details
 * @param {Object} req - Request object with event_id in params and updates in body
 * @param {Object} res - Response object
 * 
 * Allows partial updates to:
 * - Name (profanity filtered)
 * - Description (profanity filtered)
 * - Location
 * - Start time (must be future)
 * - Registration close time
 * - Max attendees (must be positive)
 * 
 * Only event creator can update
 */
const update_single_event = (req, res) => {
    // Validate event ID parameter
    const paramsSchema = Joi.object({
        event_id: Joi.number()
            .integer()
            .required()
            .positive()
            .messages({
                'number.base': 'Event ID must be a number',
                'number.integer': 'Event ID must be an integer',
                'number.positive': 'Event ID must be positive',
                'any.required': 'Event ID is required'
            })
    });

    // Define schema for partial updates
    const eventUpdateSchema = Joi.object({
        name: Joi.string()
            .optional()
            .messages({
                'string.empty': 'Event name cannot be empty if provided'
            }),
        description: Joi.string()
            .optional()
            .messages({
                'string.empty': 'Event description cannot be empty if provided'
            }),
        location: Joi.string()
            .optional()
            .messages({
                'string.empty': 'Event location cannot be empty if provided'
            }),
        start: Joi.string()
            .pattern(/^\d+$/)
            .optional()
            .custom((value, helpers) => {
                // Validate start time is in future
                const startTime = parseInt(value);
                const currentTime = Date.now();
                
                if (startTime <= currentTime) {
                    return helpers.error('custom.startTime');
                }
                return value;
            })
            .messages({
                'string.pattern.base': 'Start time must be a valid timestamp',
                'custom.startTime': 'Event cannot start in the past'
            }),
        close_registration: Joi.string()
            .pattern(/^\d+$/)
            .optional()
            .custom((value, helpers) => {
                // Validate registration closes before event starts
                const regClose = parseInt(value);
                const startTime = helpers.state.ancestors[0].start ? 
                    parseInt(helpers.state.ancestors[0].start) : 
                    null;
                
                if (startTime !== null && regClose >= startTime) {
                    return helpers.error('custom.registrationClose');
                }
                return value;
            })
            .messages({
                'string.pattern.base': 'Registration close time must be a valid timestamp',
                'custom.registrationClose': 'Registration must close before event starts'
            }),
        max_attendees: Joi.number()
            .integer()
            .min(1)
            .optional()
            .messages({
                'number.base': 'Maximum attendees must be a number',
                'number.min': 'Maximum attendees must be at least 1'
            })
    })
    .min(1)
    .messages({
        'object.min': 'At least one field must be provided for update'
    });

    // Validate event ID
    const { error: idError } = paramsSchema.validate({ 
        event_id: parseInt(req.params.event_id) 
    });
    if (idError) {
        return res.status(400).json({
            error_message: idError.details[0].message
        });
    }

    // Check for empty request body
    if (Object.keys(req.body).length === 0) {
        return res.status(400).json({
            error_message: 'No update data provided'
        });
    }

    // Validate update data
    const { error: eventError } = eventUpdateSchema.validate(req.body);
    if (eventError) {
        return res.status(400).json({
            error_message: eventError.details[0].message
        });
    }

    // Process and sanitize update data
    const updatedEvent = { ...req.body };
    if (updatedEvent.start) {
        updatedEvent.start = parseInt(updatedEvent.start);
    }
    if (updatedEvent.close_registration) {
        updatedEvent.close_registration = parseInt(updatedEvent.close_registration);
    }
    // Apply profanity filter to text fields
    if (updatedEvent.name) {
        updatedEvent.name = cleanText(updatedEvent.name);
    }
    if (updatedEvent.description) {
        updatedEvent.description = cleanText(updatedEvent.description);
    }

    // Update event in database
    events.updateEventInDB(parseInt(req.params.event_id), req.user_id, updatedEvent, (err, result) => {
        if (err) {
            if (err.message === 'Event not found') {
                return res.status(404).json({
                    error_message: 'Event not found'
                });
            }
            if (err.message === 'Unauthorized to update this event') {
                return res.status(403).json({
                    error_message: 'Unauthorized to update this event'
                });
            }
            return res.status(500).json({
                error_message: 'Failed to update event'
            });
        }
    
        return res.status(200).json({
            message: 'Event updated successfully'
        });
    });
};

/**
 * Registers a user's attendance to an event
 * @param {Object} req - Request object with event_id in params
 * @param {Object} res - Response object
 * 
 * Checks:
 * - Event exists
 * - Event has capacity
 * - Registration is still open
 * - User isn't already registered
 */
const register_attendance_to_event = (req, res) => {
    // Validate event ID parameter
    const inputSchema = Joi.object({
        event_id: Joi.number()
            .integer()
            .required()
            .positive()
            .messages({
                'number.base': 'Event ID must be a number',
                'number.integer': 'Event ID must be an integer',
                'number.positive': 'Event ID must be positive',
                'any.required': 'Event ID is required'
            })
    });

    // Validate input
    const { error } = inputSchema.validate({ 
        event_id: parseInt(req.params.event_id)
    });

    if (error) {
        return res.status(400).json({
            error_message: error.details[0].message
        });
    }

    // Get authenticated user ID and event ID
    const user_id = req.user_id;
    const event_id = parseInt(req.params.event_id);

    // Check event capacity before registration
    events.getEventFromDB(event_id, (err, event) => {
        if (err) {
            return res.status(404).json({
                error_message: 'Event not found'
            });
        }

        // Prevent registration if event is at capacity
        if (event.number_attending >= event.max_attendees) {
            return res.status(403).json({
                error_message: 'Event is at capacity'
            });
        }

        // Process registration
        events.registerAttendanceInDB(event_id, user_id, (err, result) => {
            if (err) {
                switch(err.status) {
                    case 404:
                        return res.status(404).json({
                            error_message: 'Event not found'
                        });
                    case 403:
                        return res.status(403).json({
                            error_message: err.error_message
                        });
                    default:
                        return res.status(500).json({
                            error_message: 'Failed to register for event'
                        });
                }
            }

            return res.status(200).json({
                message: 'Successfully registered for event',
                event_id: result.event_id,
                user_id: result.user_id,
                registered_at: result.registered_at
            });
        });
    });
};

/**
 * Archives (soft deletes) an event
 * @param {Object} req - Request object with event_id in params
 * @param {Object} res - Response object
 * 
 * Only event creator can archive
 * Archived events remain in database but aren't shown in regular searches
 */
const delete_event = (req, res) => {
    // Validate event ID parameter
    const inputSchema = Joi.object({
        event_id: Joi.number()
            .integer()
            .required()
            .positive()
            .messages({
                'number.base': 'Event ID must be a number',
                'number.integer': 'Event ID must be an integer',
                'any.required': 'Event ID is required'
            })
    });

    // Validate input
    const { error } = inputSchema.validate({ event_id: parseInt(req.params.event_id) });
    if (error) {
        return res.status(400).json({
            error_message: error.details[0].message
        });
    }

    // Get authenticated user ID and event ID
    const user_id = req.user_id;
    const event_id = parseInt(req.params.event_id);

    // Archive the event
    events.archiveEventInDB(event_id, user_id, (err, result) => {
        if (err) {
            return res.status(err.status).json({
                error_message: err.error_message
            });
        }

        return res.status(200).json({
            message: 'Event successfully archived'
        });
    });
};

/**
 * Searches for events based on various criteria
 * @param {Object} req - Request object with query parameters
 * @param {Object} res - Response object
 * 
 * Search parameters:
 * - q: Search text
 * - status: MY_EVENTS/ATTENDING/OPEN/ARCHIVE
 * - categories: Comma-separated category IDs
 * - limit: Results per page (1-100)
 * - offset: Pagination offset
 */
const search_event = (req, res) => {
    // Process and validate pagination parameters
    let limit = parseInt(req.query.limit) || 20;
    let offset = parseInt(req.query.offset) || 0;

    // Enforce pagination limits
    if (limit < 1) limit = 1;
    if (limit > 100) limit = 100;
    if (offset < 0) offset = 0;

    // Check authentication for restricted searches
    if ((req.query.status === 'MY_EVENTS' || req.query.status === 'ATTENDING') && !req.user_id) {
        return res.status(400).json({
            error_message: 'Authentication required for this status'
        });
    }

    // Prepare search parameters
    const searchParams = {
        q: req.query.q || '',
        status: req.query.status,
        categories: req.query.categories ? req.query.categories.split(',').map(Number) : [],
        limit: limit,
        offset: offset
    };

    // Validate search parameters
    const searchSchema = Joi.object({
        q: Joi.string()
            .allow('')
            .optional(),
        status: Joi.string()
            .valid('MY_EVENTS', 'ATTENDING', 'OPEN', 'ARCHIVE')
            .optional(),
        categories: Joi.array()
            .items(Joi.number().integer().positive())
            .optional(),
        limit: Joi.number()
            .integer()
            .min(1)
            .max(100)
            .default(20),
        offset: Joi.number()
            .integer()
            .min(0)
            .default(0)
    });

    // Validate search parameters
    const { error } = searchSchema.validate(searchParams);
    if (error) {
        return res.status(400).json({
            error_message: error.details[0].message
        });
    }

    // Execute search
    events.searchEventsInDB(searchParams, req.user_id, (err, result) => {
        if (err) {
            return res.status(err.status).json({
                error_message: err.error_message
            });
        }

        return res.status(200).json(result);
    });
};

/**
 * Retrieves list of all event categories with active event counts
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * 
 * Returns array of:
 * - category_id
 * - name
 * - active_events_count
 */
const get_categories = (req, res) => {
    // Retrieve categories from database
    events.getCategoriesFromDB((err, categories) => {
        if (err) {
            return res.status(err.status || 500).json({
                error_message: err.error_message || 'Internal server error'
            });
        }

        // Validate category data structure
        const categorySchema = Joi.array().items(
            Joi.object({
                category_id: Joi.number().required(),
                name: Joi.string().required(),
                active_events_count: Joi.number().required()
            })
        );

        // Validate response data
        const { error, value } = categorySchema.validate(categories);
        if (error) {
            console.error('Categories validation error:', error);
            return res.status(500).json({
                error_message: 'Error formatting categories'
            });
        }

        return res.status(200).json(value);
    });
};

module.exports = {
    create_event,
    get_event,
    update_single_event,
    register_attendance_to_event,
    delete_event,
    search_event,
    get_categories
}