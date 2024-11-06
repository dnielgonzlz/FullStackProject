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

    // Call the model function
    events.createEventInDB(event, (err, result) => {
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

// Get a single event details
const get_event = (event_id, done) => {
    // Input validation schema
    const inputSchema = Joi.object({
        event_id: Joi.number().integer().required()
    });

    // Validate input
    const { error } = inputSchema.validate({ event_id });
    if (error) {
        return done(error);
    }

    // Output validation schema
    const eventDetailsSchema = Joi.object({
        event_id: Joi.number().integer().required(),
        creator: Joi.object().required(),  // Assuming creator is an object with user details
        name: Joi.string().required(),
        description: Joi.string().required(),
        location: Joi.string().required(),
        start_date: Joi.number().integer().required(),
        close_registration: Joi.number().integer().required(),
        max_attendees: Joi.number().integer().required(),
        number_attending: Joi.number().integer().required(),
        attendees: Joi.array().items(Joi.object()).required(),  // Array of attendee objects
        questions: Joi.array().items(Joi.object()).required()   // Array of question objects
    });

    getEventFromDB(event_id, (err, row) => {
        if (err) {
            return done(err);
        }

        // Validate the output against the schema
        const { error: validationError, value } = eventDetailsSchema.validate(row);
        if (validationError) {
            return done(validationError);
        }

        return done(null, value);
    });
};

// Update an event
const update_single_event = (event_id, event, done) => {
    // Input validation schemas
    const paramsSchema = Joi.object({
        event_id: Joi.number()
            .integer()
            .required()
            .positive()
    });

    const eventUpdateSchema = Joi.object({
        name: Joi.string()
            .required()
            .example('NodeJS developer meetup Manchester'),

        description: Joi.string()
            .required()
            .example('Our regular monthly catch-up to discuss all things Node'),

        location: Joi.string()
            .required()
            .example('Federal Cafe and Bar'),

        start_date: Joi.number()
            .integer()
            .required()
            .example(89983256),

        close_registration: Joi.number()
            .integer()
            .required()
            .example(89983256),

        max_attendees: Joi.number()
            .integer()
            .required()
            .min(1)
            .example(20)
    });

    // Validate event_id
    const { error: idError } = paramsSchema.validate({ event_id });
    if (idError) {
        return done(idError);
    }

    // Validate event update data
    const { error: eventError, value: validatedEvent } = eventUpdateSchema.validate(event);
    if (eventError) {
        return done(eventError);
    }

    updateEventInDB(event_id, validatedEvent, done);
};

// Register Attendenance to an Event
const register_attendance_to_event = (event_id, user_id, done) => {
    // Input validation schema
    const inputSchema = Joi.object({
        event_id: Joi.number()
            .integer()
            .required()
            .positive(),
        user_id: Joi.number()
            .integer()
            .required()
            .positive()
    });

    // Validate inputs
    const { error } = inputSchema.validate({ event_id, user_id });
    if (error) {
        return done(error);
    }

    registerAttendanceInDB(event_id, user_id, done);
};

// Delete an event given an id
const delete_event = (event_id, user_id, done) => {
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
            }),
        user_id: Joi.number()
            .integer()
            .required()
            .positive()
    });

    // Validate input
    const { error } = inputSchema.validate({ event_id, user_id });
    if (error) {
        return done({
            status: 400,
            error_message: error.details[0].message
        });
    }

    deleteEventFromDB(event_id, user_id, done);
};

// Search for an event
const search_event = (params, user_id, done) => {
    // Input validation schema
    const searchSchema = Joi.object({
        q: Joi.string()
            .allow('') // Empty string allowed for no query
            .default('')
            .description('String to search for event names'),

        status: Joi.string()
            .valid('MY_EVENTS', 'ATTENDING', 'OPEN', 'ARCHIVE')
            .required()
            .description('Filter for event status'),

        limit: Joi.number()
            .integer()
            .min(1)
            .max(100)
            .default(20)
            .description('Number of items to return'),

        offset: Joi.number()
            .integer()
            .min(0)
            .default(0)
            .description('Number of items to skip')
    });

    // Validate input
    const { error, value } = searchSchema.validate(params);
    if (error) {
        return done({
            status: 400,
            error_message: error.details[0].message
        });
    }

    searchEventsInDB(value, user_id, done);
};

module.exports = {
    create_event: create_event,
    get_event: get_event,
    update_single_event: update_single_event,
    register_attendance_to_event: register_attendance_to_event,
    delete_event: delete_event,
    search_event: search_event
}