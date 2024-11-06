const Joi = require('joi');
const db = require('../../database');

const createEventInDB = (event, creator_id, done) => {
    const sql = `INSERT INTO events (
        name, 
        description, 
        location, 
        start_date, 
        close_registration, 
        max_attendees,
        creator_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`;

    const params = [
        event.name,               // string: "NodeJS developer meetup Manchester"
        event.description,        // string: "Our regular monthly catch-up..."
        event.location,           // string: "Federal Cafe and Bar"
        event.start_date,             // integer: 89983256
        event.close_registration, // integer: 89983256
        event.max_attendees,      // integer: 20
        creator_id
    ];
    
    db.run(sql, params, function(err) {
        if (err) {
            return done(err);
        }
        return done(null, { event_id: this.lastID });
    });
};

const getEventFromDB = (event_id, callback) => {
    console.log('🔍 DB: Starting database query for event ID:', event_id);

    const sql = `
        SELECT 
            e.event_id,
            e.name,
            e.description,
            e.location,
            e.start_date,
            e.close_registration,
            e.max_attendees,
            u.user_id as creator_id,
            u.first_name as creator_first_name,
            u.last_name as creator_last_name,
            u.email as creator_email,
            (SELECT COUNT(*) FROM attendees WHERE event_id = e.event_id) as number_attending,
            COALESCE(
                (
                    SELECT json_group_array(
                        json_object(
                            'user_id', a_user.user_id,
                            'first_name', a_user.first_name,
                            'last_name', a_user.last_name,
                            'email', a_user.email
                        )
                    )
                    FROM attendees a
                    JOIN users a_user ON a.user_id = a_user.user_id
                    WHERE a.event_id = e.event_id
                ),
                '[]'
            ) as attendees,
            COALESCE(
                (
                    SELECT json_group_array(
                        json_object(
                            'question_id', q.question_id,
                            'question', q.question,
                            'asked_by', q.asked_by,
                            'votes', q.votes
                        )
                    )
                    FROM questions q
                    WHERE q.event_id = e.event_id
                ),
                '[]'
            ) as questions
        FROM events e
        JOIN users u ON e.creator_id = u.user_id
        WHERE e.event_id = ?`;

    const params = [event_id];
    
    console.log('📝 DB: Executing SQL query with params:', { event_id });
    
    db.get(sql, params, (err, row) => {
        if (err) {
            console.error('❌ DB: Database error:', err);
            return callback(err);
        }
        
        if (!row) {
            console.log('❌ DB: Event not found for ID:', event_id);
            return callback(new Error('Event not found'));
        }

        console.log('✅ DB: Raw data retrieved successfully');

        try {
            console.log('🔄 DB: Processing result');
            
            // Parse JSON strings
            if (typeof row.attendees === 'string') {
                row.attendees = JSON.parse(row.attendees);
            }
            if (typeof row.questions === 'string') {
                row.questions = JSON.parse(row.questions);
            }

            // Format the creator object and the complete response
            const formattedRow = {
                event_id: row.event_id,
                name: row.name,
                description: row.description,
                location: row.location,
                start_date: row.start_date,
                close_registration: row.close_registration,
                max_attendees: row.max_attendees,
                creator: {
                    user_id: row.creator_id,
                    first_name: row.creator_first_name,
                    last_name: row.creator_last_name,
                    email: row.creator_email
                },
                number_attending: row.number_attending,
                attendees: row.attendees,
                questions: row.questions
            };

            console.log('✅ DB: Data formatting completed');
            console.log('📊 DB: Data structure:', {
                event_id: formattedRow.event_id,
                name: formattedRow.name,
                creator_id: formattedRow.creator.user_id,
                attendees_count: formattedRow.attendees.length,
                questions_count: formattedRow.questions.length
            });
            console.log('✅ DB: Processed result successfully');
            return callback(null, formattedRow);
        } catch (parseErr) {
            console.error('❌ DB: Data processing error:', parseErr);
            return callback(parseErr);
        }
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
        validatedEvent.start_date,
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
            e.start_date,
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
    
    const queryParams = [];

    // Add search condition if query provided
    if (value.q) {
        sql += ` AND (
            e.name LIKE ? OR 
            e.description LIKE ? OR 
            e.location LIKE ?
        )`;
        queryParams.push(`%${value.q}%`, `%${value.q}%`, `%${value.q}%`);
    }

    // Add status conditions
    switch (value.status) {
        case 'MY_EVENTS':
            sql += ` AND e.creator_id = ?`;
            queryParams.push(user_id);
            break;
        case 'ATTENDING':
            sql += ` AND EXISTS (
                SELECT 1 FROM attendees a 
                WHERE a.event_id = e.event_id 
                AND a.user_id = ?
            )`;
            queryParams.push(user_id);
            break;
        case 'OPEN':
            sql += ` AND e.close_registration > ?`;
            queryParams.push(Date.now());
            break;
        case 'ARCHIVE':
            sql += ` AND e.close_registration < ?`;
            queryParams.push(Date.now());
            break;
    }

    // Add pagination
    sql += ` ORDER BY e.start_date DESC LIMIT ? OFFSET ?`;
    queryParams.push(value.limit, value.offset);

    db.all(sql, queryParams, (err, rows) => {
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
 * @property {number} start_date - Start timestamp
 * @property {number} close_registration - Registration closing timestamp
 * @property {number} max_attendees - Maximum number of attendees
 */

module.exports = {
    createEventInDB,      // Create a new event
    getEventFromDB,        // Get event details by ID
    updateEventInDB,     // Update an existing event
    registerAttendanceInDB, // Register user for event
    deleteEventFromDB,     // Delete an event
    searchEvents     // Search and filter events
};