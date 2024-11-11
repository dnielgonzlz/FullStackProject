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
                'string.empty': 'Event name is required'
            }),
        description: Joi.string()
            .required()
            .messages({
                'string.empty': 'Event description is required'
            }),
        location: Joi.string()
            .required()
            .messages({
                'string.empty': 'Event location is required'
            }),
        start_date: Joi.number()
            .integer()
            .required()
            .messages({
                'number.base': 'Start time must be a timestamp',
                'any.required': 'Start time is required'
            }),
        close_registration: Joi.number()
            .integer()
            .required()
            .messages({
                'number.base': 'Registration close time must be a timestamp',
                'any.required': 'Registration close time is required'
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
    });

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
        start_date: req.body.start_date,
        close_registration: req.body.close_registration,
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

    // Output validation schema
    const eventDetailsSchema = Joi.object({
        event_id: Joi.number().integer().required(),
        creator: Joi.object().required(),
        name: Joi.string().required(),
        description: Joi.string().required(),
        location: Joi.string().required(),
        start_date: Joi.number().integer().required(),
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
                'any.required': 'Event ID is required'
            })
    });

    const eventUpdateSchema = Joi.object({
        name: Joi.string()
            .required()
            .example('NodeJS developer meetup Manchester')
            .messages({
                'string.empty': 'Name is required'
            }),

        description: Joi.string()
            .required()
            .example('Our regular monthly catch-up to discuss all things Node')
            .messages({
                'string.empty': 'Description is required'
            }),

        location: Joi.string()
            .required()
            .example('Federal Cafe and Bar')
            .messages({
                'string.empty': 'Location is required'
            }),

        start_date: Joi.number()
            .integer()
            .required()
            .example(89983256)
            .messages({
                'number.base': 'Start date must be a timestamp'
            }),

        close_registration: Joi.number()
            .integer()
            .required()
            .example(89983256)
            .messages({
                'number.base': 'Close registration must be a timestamp'
            }),

        max_attendees: Joi.number()
            .integer()
            .required()
            .min(1)
            .example(20)
            .messages({
                'number.base': 'Maximum attendees must be a number',
                'number.min': 'Maximum attendees must be at least 1'
            })
    });

    // Validate event_id
    console.log('🔍 UPDATE EVENT: Validating event ID:', req.params.event_id);
    const { error: idError } = paramsSchema.validate({ event_id: parseInt(req.params.event_id) });
    if (idError) {
        console.log('❌ UPDATE EVENT: Invalid event ID:', idError.message);
        return res.status(400).json({
            error_message: idError.details[0].message
        });
    }

    // Validate event update data
    console.log('🔍 UPDATE EVENT: Validating event data');
    const { error: eventError, value: validatedEvent } = eventUpdateSchema.validate(req.body);
    if (eventError) {
        console.log('❌ UPDATE EVENT: Invalid event data:', eventError.message);
        return res.status(400).json({
            error_message: eventError.details[0].message
        });
    }

    console.log('✅ UPDATE EVENT: Validation passed, updating event');
    events.updateEventInDB(parseInt(req.params.event_id), req.user_id, validatedEvent, (err, result) => {
        if (err) {
            console.log('❌ UPDATE EVENT: Database error:', err.message);
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

        console.log('✅ UPDATE EVENT: Successfully updated event:', result);
        return res.status(200).json({
            message: 'Event updated successfully',
            event_id: result.event_id
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

    events.registerAttendanceInDB(event_id, user_id, (err, result) => {
        if (err) {
            console.log('❌ REGISTER: Error:', err.error_message || err.message);
            
            // Handle different error cases
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
        return res.status(201).json({
            message: 'Successfully registered for event',
            event_id: result.event_id,
            user_id: result.user_id,
            registered_at: result.registered_at
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

    // Input validation schema
    const searchSchema = Joi.object({
        q: Joi.string()
            .allow('')
            .optional()
            .description('Search string for event names'),

        status: Joi.string()
            .valid('MY_EVENTS', 'ATTENDING', 'OPEN', 'ARCHIVE')
            .required()
            .description('Filter for event status'),

        limit: Joi.number()
            .integer()
            .min(1)
            .max(100)
            .default(20)
            .optional()
            .description('Number of items to return'),

        offset: Joi.number()
            .integer()
            .min(0)
            .default(0)
            .optional()
            .description('Number of items to skip')
    });

    // Get query parameters
    const searchParams = {
        q: req.query.q || '',
        status: req.query.status,
        limit: parseInt(req.query.limit) || 20,
        offset: parseInt(req.query.offset) || 0
    };

    // Validate input
    const { error } = searchSchema.validate(searchParams);
    if (error) {
        console.log('❌ SEARCH: Validation failed:', error.message);
        return res.status(400).json({
            error_message: error.details[0].message
        });
    }

    console.log('✅ SEARCH: Validation passed, searching with params:', searchParams);

    // Get user_id from authenticate middleware
    const user_id = req.user_id;

    events.searchEventsInDB(searchParams, user_id, (err, result) => {
        if (err) {
            console.log('❌ SEARCH: Error:', err.error_message);
            return res.status(err.status).json({
                error_message: err.error_message
            });
        }

        console.log('✅ SEARCH: Search completed successfully');
        // Return array of events as per API docs
        return res.status(200).json(result.events);
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