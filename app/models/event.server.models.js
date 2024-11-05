//TODO: I need to build here the queries for SQLite for each of the operations
//TODO: POST - Create a new event
//TODO: GET - Get a single event detail
//TODO: PATCH - Update a single event
//TODO: POST - Register to attend an event
//TODO: DELETE - Delete an event
//TODO: GET - Search for an event
const Joi = require('joi');

const createEvent = (event, done) => {
    const sql = `INSERT INTO events (name, description, location, start, close_registration, max_attendees)
                 VALUES (?, ?, ?, ?, ?, ?)`;
    const params = [
        event.name,               // string: "NodeJS developer meetup Manchester"
        event.description,        // string: "Our regular monthly catch-up..."
        event.location,           // string: "Federal Cafe and Bar"
        event.start,             // integer: 89983256
        event.close_registration, // integer: 89983256
        event.max_attendees      // integer: 20
    ];
    
    db.run(sql, params, function(err) {
        if (err) {
            return done(err);
        }
        return done(null, { event_id: this.lastID });
    });
};

const getEventFromDB = (event_id, callback) => {
    const sql = `
        SELECT 
            e.*,
            u.* as creator,
            (SELECT COUNT(*) FROM attendees WHERE event_id = e.event_id) as number_attending,
            (
                SELECT json_group_array(json_object(
                    'user_id', a.user_id,
                    'name', u.name,
                    'email', u.email
                ))
                FROM attendees a
                JOIN users u ON a.user_id = u.user_id
                WHERE a.event_id = e.event_id
            ) as attendees,
            (
                SELECT json_group_array(json_object(
                    'question_id', q.question_id,
                    'question', q.question,
                    'required', q.required
                ))
                FROM questions q
                WHERE q.event_id = e.event_id
            ) as questions
        FROM events e
        JOIN users u ON e.creator_id = u.user_id
        WHERE e.event_id = ?`;

    const params = [event_id];
    
    db.get(sql, params, (err, row) => {
        if (err) {
            return callback(err);
        }
        
        if (!row) {
            return callback(new Error('Event not found'));
        }

        // Parse JSON strings if using SQLite
        try {
            if (typeof row.attendees === 'string') {
                row.attendees = JSON.parse(row.attendees);
            }
            if (typeof row.questions === 'string') {
                row.questions = JSON.parse(row.questions);
            }
        } catch (parseErr) {
            return callback(parseErr);
        }

        return callback(null, row);
    });
};

const updateEventInDB = (event_id, validatedEvent, callback) => {
    const sql = `
        UPDATE events 
        SET name = ?, 
            description = ?, 
            location = ?, 
            start = ?, 
            close_registration = ?, 
            max_attendees = ?
        WHERE event_id = ?`;

    const params = [
        validatedEvent.name,
        validatedEvent.description,
        validatedEvent.location,
        validatedEvent.start,
        validatedEvent.close_registration,
        validatedEvent.max_attendees,
        event_id
    ];
    
    db.run(sql, params, function(err) {
        if (err) {
            return callback(err);
        }

        if (this.changes === 0) {
            return callback(new Error('Event not found or no changes made'));
        }

        return callback(null, { 
            success: true,
            event_id: event_id,
            changes: this.changes
        });
    });
};


const registerAttendanceInDB = (event_id, user_id, callback) => {
    db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        // First check if the event exists and get its details
        const eventCheckSql = `
            SELECT 
                e.*,
                (SELECT COUNT(*) FROM attendees WHERE event_id = e.event_id) as current_attendees
            FROM events e
            WHERE event_id = ?`;

        db.get(eventCheckSql, [event_id], (err, event) => {
            if (err) {
                db.run('ROLLBACK');
                return callback(err);
            }

            if (!event) {
                db.run('ROLLBACK');
                return callback({
                    status: 404,
                    error_message: 'Event not found'
                });
            }

            // Check if registration is closed
            if (event.close_registration <= Date.now()) {
                db.run('ROLLBACK');
                return callback({
                    status: 403,
                    error_message: 'Registration is closed'
                });
            }

            // Check if event is at capacity
            if (event.current_attendees >= event.max_attendees) {
                db.run('ROLLBACK');
                return callback({
                    status: 403,
                    error_message: 'Event is at capacity'
                });
            }

            // Check if user is already registered
            const duplicateCheckSql = `
                SELECT 1 FROM attendees 
                WHERE event_id = ? AND user_id = ?`;

            db.get(duplicateCheckSql, [event_id, user_id], (err, existing) => {
                if (err) {
                    db.run('ROLLBACK');
                    return callback(err);
                }

                if (existing) {
                    db.run('ROLLBACK');
                    return callback({
                        status: 403,
                        error_message: 'You are already registered'
                    });
                }

                // All checks passed, insert the registration
                const insertSql = `
                    INSERT INTO attendees (event_id, user_id, registered_at) 
                    VALUES (?, ?, ?)`;
                
                db.run(insertSql, [event_id, user_id, Date.now()], function(err) {
                    if (err) {
                        db.run('ROLLBACK');
                        return callback({
                            status: 500,
                            error_message: 'Failed to register for event'
                        });
                    }

                    db.run('COMMIT', (err) => {
                        if (err) {
                            db.run('ROLLBACK');
                            return callback({
                                status: 500,
                                error_message: 'Failed to commit transaction'
                            });
                        }

                        // Successfully registered
                        return callback(null, {
                            status: 200,
                            event_id: event_id,
                            user_id: user_id,
                            registered_at: Date.now()
                        });
                    });
                });
            });
        });
    });
};

const deleteEventFromDB = (event_id, user_id, callback) => {
    db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        // First check if the event exists and verify ownership
        const checkEventSql = `
            SELECT creator_id 
            FROM events 
            WHERE event_id = ?`;

        db.get(checkEventSql, [event_id], (err, event) => {
            if (err) {
                db.run('ROLLBACK');
                return callback({
                    status: 500,
                    error_message: 'Database error while checking event'
                });
            }

            if (!event) {
                db.run('ROLLBACK');
                return callback({
                    status: 404,
                    error_message: 'Event not found'
                });
            }

            // Check if the user is the creator of the event
            if (event.creator_id !== user_id) {
                db.run('ROLLBACK');
                return callback({
                    status: 403,
                    error_message: 'You can only delete your own events'
                });
            }

            // Delete the event
            const deleteSql = `DELETE FROM events WHERE event_id = ?`;

            db.run(deleteSql, [event_id], function(err) {
                if (err) {
                    db.run('ROLLBACK');
                    return callback({
                        status: 500,
                        error_message: 'Failed to delete event'
                    });
                }

                if (this.changes === 0) {
                    db.run('ROLLBACK');
                    return callback({
                        status: 404,
                        error_message: 'Event not found'
                    });
                }

                db.run('COMMIT', (err) => {
                    if (err) {
                        db.run('ROLLBACK');
                        return callback({
                            status: 500,
                            error_message: 'Failed to commit transaction'
                        });
                    }

                    // Successfully deleted
                    return callback(null, {
                        status: 200,
                        message: 'Event successfully deleted'
                    });
                });
            });
        });
    });
};

const searchEvents = (params, user_id, done) => {
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

    // Base query to join events with creators
    let sql = `
        SELECT 
            e.event_id,
            e.name,
            e.description,
            e.location,
            e.start,
            e.close_registration,
            e.max_attendees,
            json_object(
                'creator_id', u.user_id,
                'first_name', u.first_name,
                'last_name', u.last_name,
                'email', u.email
            ) as creator
        FROM events e
        JOIN users u ON e.creator_id = u.user_id
        WHERE 1=1
    `;
    
    const params = [];

    // Add search condition if query provided
    if (value.q) {
        sql += ` AND (
            e.name LIKE ? OR 
            e.description LIKE ? OR 
            e.location LIKE ?
        )`;
        params.push(`%${value.q}%`, `%${value.q}%`, `%${value.q}%`);
    }

    // Add status conditions
    switch (value.status) {
        case 'MY_EVENTS':
            sql += ` AND e.creator_id = ?`;
            params.push(user_id);
            break;
        case 'ATTENDING':
            sql += ` AND EXISTS (
                SELECT 1 FROM attendees a 
                WHERE a.event_id = e.event_id 
                AND a.user_id = ?
            )`;
            params.push(user_id);
            break;
        case 'OPEN':
            sql += ` AND e.close_registration > ?`;
            params.push(Date.now());
            break;
        case 'ARCHIVE':
            sql += ` AND e.close_registration < ?`;
            params.push(Date.now());
            break;
    }

    // Add pagination
    sql += ` ORDER BY e.start DESC LIMIT ? OFFSET ?`;
    params.push(value.limit, value.offset);

    db.all(sql, params, (err, rows) => {
        if (err) {
            return done({
                status: 500,
                error_message: 'Database error while searching events'
            });
        }

        // Parse the creator JSON string if using SQLite
        const events = rows.map(row => ({
            ...row,
            creator: typeof row.creator === 'string' ? 
                JSON.parse(row.creator) : row.creator
        }));

        return done(null, {
            status: 200,
            events: events,
            pagination: {
                limit: value.limit,
                offset: value.offset,
                total: events.length
            }
        });
    });
};

/**
 * Event management module
 * @module events
 */

/**
 * @typedef {Object} Event
 * @property {number} event_id - Unique identifier for the event
 * @property {string} name - Name of the event
 * @property {string} description - Description of the event
 * @property {string} location - Location of the event
 * @property {number} start - Start timestamp
 * @property {number} close_registration - Registration closing timestamp
 * @property {number} max_attendees - Maximum number of attendees
 */

module.exports = {
    createEvent,      // Create a new event
    getEvent,        // Get event details by ID
    updateEvent,     // Update an existing event
    registerAttendance, // Register user for event
    deleteEvent,     // Delete an event
    searchEvents     // Search and filter events
};