const Joi = require('joi');
const events = require('../models/event.server.models');

// Create a New Event
const create_event = (req, res) => {
    console.log('🚀 EVENT: Starting event creation process');

    // Input validation schema
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
                const regClose = parseInt(value);
                const startTime = parseInt(helpers.state.ancestors[0].start);
                
                if (regClose >= startTime) {
                    return helpers.error('custom.registrationClose');
                }
                return value;
            })
            .messages({
                'string.pattern.base': 'Registration close time must be a valid timestamp',
                'any.required': 'Registration close time is required',
                'custom.registrationClose': 'Registration must close before event starts'
            }),
        max_attendees: Joi.number()
            .integer()
            .min(1)
            .required()
            .messages({
                'number.base': 'Maximum attendees must be a number',
                'number.min': 'Maximum attendees must be at least 1',
                'any.required': 'Maximum attendees is required'
            })
    })
    .required()
    .unknown(false)
    .messages({
        'object.unknown': 'Invalid property provided'
    });


    // Get auth token from header
    const token = req.headers['x-authorization'];
    if (!token) {
        return res.status(401).json({
            error_message: 'Unauthorized'
        });
    }

    // Validate input
    const { error } = eventSchema.validate(req.body);
    if (error) {
        console.log('❌ EVENT: Validation failed:', error.details[0].message);
        return res.status(400).json({
            error_message: error.details[0].message
        });
    }

    console.log('✅ EVENT: Input validation passed');

    // Create event object from validated request body
    const event = {
        name: req.body.name,
        description: req.body.description,
        location: req.body.location,
        start: req.body.start,                    // Parse string timestamp to integer
        close_registration: req.body.close_registration,  // Parse string timestamp to integer
        max_attendees: req.body.max_attendees
    };

    console.log('📝 EVENT: Created event object:', event);

    // Get creator_id from authenticated user (req.user_id is set by authenticate middleware)
    const creator_id = req.user_id;

    // Call the model function
    events.createEventInDB(event, creator_id, (err, result) => {
        if (err) {
            console.log('❌ EVENT: Database error:', err);
            return res.status(500).json({
                error_message: 'Failed to create event'
            });
        }
        
        console.log('✅ EVENT: Successfully created event with ID:', result.event_id);
        return res.status(201).json({
            event_id: result.event_id
        });
    });
};


const get_event = (req, res) => {
    console.log('🚀 GET EVENT: Starting retrieval process');
    
    // Input validation schema
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

    // Validate input
    console.log('🔍 GET EVENT: Validating event ID:', req.params.event_id);
    const { error } = inputSchema.validate({ event_id: parseInt(req.params.event_id) });
    if (error) {
        console.log('❌ GET EVENT: Input validation failed:', error.message);
        return res.status(400).json({
            error_message: error.details[0].message
        });
    }
    console.log('✅ GET EVENT: Input validation passed');

    // Output validation schema - Updated to use 'start' instead of 'start_date'
    const eventDetailsSchema = Joi.object({
        event_id: Joi.number().integer().required(),
        creator: Joi.object().required(),
        name: Joi.string().required(),
        description: Joi.string().required(),
        location: Joi.string().required(),
        start: Joi.number().integer().required(),  // Changed from start_date to start
        close_registration: Joi.number().integer().required(),
        max_attendees: Joi.number().integer().required(),
        number_attending: Joi.number().integer().required(),
        attendees: Joi.array().items(Joi.object()).required(),
        questions: Joi.array().items(Joi.object()).required()
    });

    console.log('🔄 GET EVENT: Calling database function');
    events.getEventFromDB(parseInt(req.params.event_id), (err, row) => {
        if (err) {
            console.log('❌ GET EVENT: Database error:', err.message);
            if (err.message === 'Event not found') {
                return res.status(404).json({
                    error_message: 'Event not found'
                });
            }
            return res.status(500).json({
                error_message: 'Internal server error'
            });
        }

        // Validate the output against the schema
        console.log('🔍 GET EVENT: Validating database response');
        const { error: validationError, value } = eventDetailsSchema.validate(row);
        if (validationError) {
            console.log('❌ GET EVENT: Output validation failed:', validationError.message);
            return res.status(500).json({
                error_message: 'Data validation error'
            });
        }

        console.log('✅ GET EVENT: Successfully retrieved and validated event data');
        return res.status(200).json(value);
    });
};

// Update an event
const update_single_event = (req, res) => {
    console.log('🚀 UPDATE EVENT: Starting update process');

    // Input validation schemas
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

    // Schema that allows partial updates
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
                const regClose = parseInt(value);
                const startTime = helpers.state.ancestors[0].start ? 
                    parseInt(helpers.state.ancestors[0].start) : 
                    null;
                
                // Only validate against start time if both are provided
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
    .min(1) // Require at least one field to be present
    .messages({
        'object.min': 'At least one field must be provided for update'
    });

    // Validate event_id
    const { error: idError } = paramsSchema.validate({ 
        event_id: parseInt(req.params.event_id) 
    });
    if (idError) {
        return res.status(400).json({
            error_message: idError.details[0].message
        });
    }

    // If request body is empty, return 400
    if (Object.keys(req.body).length === 0) {
        return res.status(400).json({
            error_message: 'No update data provided'
        });
    }

    // Validate request body
    const { error: eventError } = eventUpdateSchema.validate(req.body);
    if (eventError) {
        return res.status(400).json({
            error_message: eventError.details[0].message
        });
    }

    // Convert string timestamps to integers if they exist
    const updatedEvent = { ...req.body };
    if (updatedEvent.start) {
        updatedEvent.start = parseInt(updatedEvent.start);
    }
    if (updatedEvent.close_registration) {
        updatedEvent.close_registration = parseInt(updatedEvent.close_registration);
    }

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

// Register Attendenance to an Event
const register_attendance_to_event = (req, res) => {
    console.log('🚀 REGISTER: Starting event registration process');

    // Input validation schema
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

    // Validate event_id from params
    console.log('🔍 REGISTER: Validating event ID:', req.params.event_id);
    const { error } = inputSchema.validate({ 
        event_id: parseInt(req.params.event_id)
    });

    if (error) {
        console.log('❌ REGISTER: Validation failed:', error.message);
        return res.status(400).json({
            error_message: error.details[0].message
        });
    }

    // Get user_id from authenticate middleware
    const user_id = req.user_id;
    const event_id = parseInt(req.params.event_id);

    console.log('✅ REGISTER: Validation passed, proceeding with registration');
    console.log('👤 REGISTER: User ID:', user_id);
    console.log('🎫 REGISTER: Event ID:', event_id);

    // First, get event details and check capacity
    events.getEventFromDB(event_id, (err, event) => {
        if (err) {
            console.log('❌ REGISTER: Error getting event details:', err.message);
            return res.status(404).json({
                error_message: 'Event not found'
            });
        }

        // Check if event is at capacity
        if (event.number_attending >= event.max_attendees) {
            console.log('❌ REGISTER: Event is at capacity');
            return res.status(403).json({
                error_message: 'Event is at capacity'
            });
        }

        // If not at capacity, proceed with registration
        events.registerAttendanceInDB(event_id, user_id, (err, result) => {
            if (err) {
                console.log('❌ REGISTER: Error:', err.error_message || err.message);
                
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

            console.log('✅ REGISTER: Successfully registered for event');
            return res.status(200).json({
                message: 'Successfully registered for event',
                event_id: result.event_id,
                user_id: result.user_id,
                registered_at: result.registered_at
            });
        });
    });
};

const delete_event = (req, res) => {
    console.log('🚀 DELETE EVENT: Starting archive process');

    // Input validation schema
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
        console.log('❌ DELETE EVENT: Validation failed:', error.message);
        return res.status(400).json({
            error_message: error.details[0].message
        });
    }

    // Get user_id from authenticate middleware
    const user_id = req.user_id;
    const event_id = parseInt(req.params.event_id);

    console.log('🔍 DELETE EVENT: Archiving event:', { event_id, user_id });

    events.archiveEventInDB(event_id, user_id, (err, result) => {
        if (err) {
            console.log('❌ DELETE EVENT: Error:', err.error_message);
            return res.status(err.status).json({
                error_message: err.error_message
            });
        }

        console.log('✅ DELETE EVENT: Successfully archived event');
        return res.status(200).json({
            message: 'Event successfully archived'
        });
    });
};

// Search for an event
const search_event = (req, res) => {
    console.log('🚀 SEARCH: Starting event search');

    // Get and validate query parameters
    let limit = parseInt(req.query.limit) || 20;  // Default to 20
    let offset = parseInt(req.query.offset) || 0;  // Default to 0

    // Validate limit bounds
    if (limit < 1) limit = 1;
    if (limit > 100) limit = 100;

    // Validate offset bounds
    if (offset < 0) offset = 0;

    const searchParams = {
        q: req.query.q || '',
        status: req.query.status,
        limit: limit,
        offset: offset
    };

    // Input validation schema
    const searchSchema = Joi.object({
        q: Joi.string()
            .allow('')
            .optional(),
        status: Joi.string()
            .valid('MY_EVENTS', 'ATTENDING', 'OPEN', 'ARCHIVE')
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

    // Validate input
    const { error } = searchSchema.validate(searchParams);
    if (error) {
        console.log('❌ SEARCH: Validation failed:', error.message);
        return res.status(400).json({
            error_message: error.details[0].message
        });
    }

    // Only require authentication for MY_EVENTS and ATTENDING status
    if (searchParams.status === 'MY_EVENTS' || searchParams.status === 'ATTENDING') {
        if (!req.user_id) {
            return res.status(400).json({
                error_message: 'Unauthorized'
            });
        }
    }

    const user_id = req.user_id || null;

    events.searchEventsInDB(searchParams, user_id, (err, result) => {
        if (err) {
            console.log('❌ SEARCH: Error:', err.error_message);
            return res.status(err.status).json({
                error_message: err.error_message
            });
        }

        console.log('✅ SEARCH: Search completed successfully');
        return res.status(200).json(result);
    });
};


module.exports = {
    create_event: create_event,
    get_event: get_event,
    update_single_event: update_single_event,
    register_attendance_to_event: register_attendance_to_event,
    delete_event: delete_event,
    search_event: search_event
}