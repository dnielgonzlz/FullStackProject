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


const updateEventInDB = (event_id, user_id, validatedEvent, callback) => {
    console.log('🔍 DB: Starting database update for event ID:', event_id);
    console.log('👤 DB: Authenticated user ID:', user_id);

    // First check if user is the event creator
    const checkCreatorSql = `
        SELECT creator_id 
        FROM events 
        WHERE event_id = ?`;

    db.get(checkCreatorSql, [event_id], (err, event) => {
        if (err) {
            console.error('❌ DB: Error checking event creator:', err);
            return callback(err);
        }

        if (!event) {
            console.log('❌ DB: Event not found');
            return callback(new Error('Event not found'));
        }

        console.log('👥 DB: Event creator ID:', event.creator_id);
        console.log('🔍 DB: Comparing creator_id vs user_id:', {
            creator_id: event.creator_id,
            user_id: user_id,
            matches: event.creator_id === user_id
        });

        if (event.creator_id !== user_id) {
            console.log('❌ DB: User not authorized to update this event');
            return callback(new Error('Unauthorized to update this event'));
        }

        // If user is authorized, proceed with update
        const updateSql = `
            UPDATE events 
            SET name = ?, 
            description = ?, 
                location = ?, 
                start_date = ?, 
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
        
        console.log('📝 DB: Executing update query');
        db.run(updateSql, params, function(err) {
            if (err) {
                console.error('❌ DB: Error updating event:', err);
                return callback(err);
            }

            console.log('✅ DB: Successfully updated event');
            return callback(null, { 
                event_id: event_id,
                changes: this.changes
            });
        });
    });
};



const registerAttendanceInDB = (event_id, user_id, callback) => {
    console.log('🔍 DB: Starting registration process');
    
    db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        // First check if the event exists and get its details
        const eventCheckSql = `
            SELECT 
                e.*,
                (SELECT COUNT(*) FROM attendees WHERE event_id = e.event_id) as current_attendees
            FROM events e
            WHERE event_id = ?`;

        console.log('🔍 DB: Checking event details for event_id:', event_id);
        db.get(eventCheckSql, [event_id], (err, event) => {
            if (err) {
                console.error('❌ DB: Error checking event:', err);
                db.run('ROLLBACK');
                return callback(err);
            }

            if (!event) {
                console.log('❌ DB: Event not found');
                db.run('ROLLBACK');
                return callback({
                    status: 404,
                    error_message: 'Event not found'
                });
            }

            console.log('📊 DB: Full event details:', {
                event_id: event.event_id,
                current_attendees: event.current_attendees,
                max_attendees: event.max_attendees,
                close_registration: event.close_registration,
                current_time: Date.now()
            });

            // Check if registration is closed
            const currentTime = Date.now();
            console.log('⏰ DB: Time check:', {
                current_time: currentTime,
                close_time: event.close_registration,
                is_closed: currentTime >= event.close_registration
            });

            if (currentTime >= event.close_registration) {
                console.log('❌ DB: Registration is closed');
                db.run('ROLLBACK');
                return callback({
                    status: 403,
                    error_message: 'Registration is closed'
                });
            }

            // Check if event is at capacity
            if (event.current_attendees >= event.max_attendees) {
                console.log('❌ DB: Event is at capacity');
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

            console.log('🔍 DB: Checking if user is already registered:', {
                event_id,
                user_id
            });

            db.get(duplicateCheckSql, [event_id, user_id], (err, existing) => {
                if (err) {
                    console.error('❌ DB: Error checking existing registration:', err);
                    db.run('ROLLBACK');
                    return callback(err);
                }

                if (existing) {
                    console.log('❌ DB: User already registered');
                    db.run('ROLLBACK');
                    return callback({
                        status: 403,
                        error_message: 'You are already registered'
                    });
                }

                // All checks passed, insert the registration
                const insertSql = `
                    INSERT INTO attendees (event_id, user_id) 
                    VALUES (?, ?)`;
                
                console.log('✏️ DB: Attempting to insert registration');
                
                db.run(insertSql, [event_id, user_id], function(err) {
                    if (err) {
                        console.error('❌ DB: Error inserting registration:', err);
                        db.run('ROLLBACK');
                        return callback({
                            status: 500,
                            error_message: 'Failed to register for event'
                        });
                    }

                    console.log('✅ DB: Registration inserted successfully');
                    
                    db.run('COMMIT', (err) => {
                        if (err) {
                            console.error('❌ DB: Error committing transaction:', err);
                            db.run('ROLLBACK');
                            return callback({
                                status: 500,
                                error_message: 'Failed to commit transaction'
                            });
                        }

                        console.log('✅ DB: Transaction committed successfully');
                        return callback(null, {
                            status: 201,
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

const archiveEventInDB = (event_id, user_id, callback) => {
    console.log('🔍 DB: Starting event archive process');
    
    db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        // First check if the event exists and verify ownership
        const checkEventSql = `
            SELECT creator_id 
            FROM events 
            WHERE event_id = ?`;

        db.get(checkEventSql, [event_id], (err, event) => {
            if (err) {
                console.error('❌ DB: Error checking event:', err);
                db.run('ROLLBACK');
                return callback({
                    status: 500,
                    error_message: 'Database error while checking event'
                });
            }

            if (!event) {
                console.log('❌ DB: Event not found');
                db.run('ROLLBACK');
                return callback({
                    status: 404,
                    error_message: 'Event not found'
                });
            }

            // Check if the user is the creator of the event
            if (event.creator_id !== user_id) {
                console.log('❌ DB: Unauthorized - user is not event creator');
                db.run('ROLLBACK');
                return callback({
                    status: 403,
                    error_message: 'You can only archive your own events'
                });
            }

            // Archive the event by setting close_registration to -1
            const archiveSql = `
                UPDATE events 
                SET close_registration = -1 
                WHERE event_id = ?`;

            console.log('📝 DB: Archiving event');
            db.run(archiveSql, [event_id], function(err) {
                if (err) {
                    console.error('❌ DB: Error archiving event:', err);
                    db.run('ROLLBACK');
                    return callback({
                        status: 500,
                        error_message: 'Failed to archive event'
                    });
                }

                if (this.changes === 0) {
                    console.log('❌ DB: No event found to archive');
                    db.run('ROLLBACK');
                    return callback({
                        status: 404,
                        error_message: 'Event not found'
                    });
                }

                db.run('COMMIT', (err) => {
                    if (err) {
                        console.error('❌ DB: Error committing transaction:', err);
                        db.run('ROLLBACK');
                        return callback({
                            status: 500,
                            error_message: 'Failed to commit transaction'
                        });
                    }

                    console.log('✅ DB: Successfully archived event');
                    return callback(null, {
                        status: 200,
                        message: 'Event successfully archived'
                    });
                });
            });
        });
    });
};


const searchEventsInDB = (params, user_id, callback) => {
    console.log('🔍 DB: Starting event search');

    // Base query
    let sql = `
        SELECT 
            e.event_id,
            e.name,
            e.description,
            e.location,
            e.start_date as start,
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
    if (params.q) {
        sql += ` AND e.name LIKE ?`;
        queryParams.push(`%${params.q}%`);
    }

    // Add status conditions
    switch (params.status) {
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
    queryParams.push(params.limit, params.offset);

    console.log('📝 DB: Executing search query');
    db.all(sql, queryParams, (err, rows) => {
        if (err) {
            console.error('❌ DB: Database error:', err);
            return callback({
                status: 500,
                error_message: 'Server Error'
            });
        }

        console.log('✅ DB: Search completed, formatting results');
        // Format results to match API response structure
        const events = rows.map(row => ({
            event_id: row.event_id,
            creator: typeof row.creator === 'string' ? 
                JSON.parse(row.creator) : row.creator,
            name: row.name,
            description: row.description,
            location: row.location,
            start: row.start,
            close_registration: row.close_registration,
            max_attendees: row.max_attendees
        }));

        return callback(null, {
            status: 200,
            events: events
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
    archiveEventInDB,     // Delete an event
    searchEventsInDB     // Search and filter events
};