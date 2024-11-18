const Joi = require('joi');
const db = require('../../database');

const createEventInDB = (event, creator_id, done) => {
    console.log('🔍 DB: Starting event creation');

    const sql = `INSERT INTO events (
        name, 
        description, 
        location, 
        start,           
        close_registration, 
        max_attendees,
        creator_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`;
    
    const params = [
        event.name,
        event.description,
        event.location,
        event.start,      
        event.close_registration,
        event.max_attendees,
        creator_id
    ];

    // Debug log the exact SQL and parameters
    console.log('📝 DB: SQL Query:', sql);
    console.log('📝 DB: Parameters:', params);
    
    // First verify the table exists and its schema
    db.get("SELECT sql FROM sqlite_master WHERE type='table' AND name='events'", [], (err, row) => {
        if (err) {
            console.error('❌ DB: Error checking table:', err);
            return done(err);
        }
        
        if (!row) {
            console.error('❌ DB: Events table does not exist');
            return done(new Error('Table does not exist'));
        }

        console.log('📝 DB: Found events table with schema:', row.sql);
        
        // Proceed with insert
        db.run(sql, params, function(err) {
            if (err) {
                console.error('❌ DB: Error creating event:', err);
                console.error('❌ DB: Error details:', err.message);
                return done(err);
            }
            console.log('✅ DB: Event created successfully with ID:', this.lastID);
            return done(null, { event_id: this.lastID });
        });
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
        e.start,
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
                        'votes', q.votes,
                        'asked_by', json_object(
                            'user_id', qu.user_id,
                            'first_name', qu.first_name
                        )
                    )
                )
                FROM questions q
                JOIN users qu ON q.asked_by = qu.user_id
                WHERE q.event_id = e.event_id
                ORDER BY q.question_id ASC
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

        console.log('✅ DB: Raw data retrieved:', row);

        try {
            // Parse JSON strings
            if (typeof row.attendees === 'string') {
                row.attendees = JSON.parse(row.attendees);
            }
            if (typeof row.questions === 'string') {
                row.questions = JSON.parse(row.questions);
            }

            // Format the response object with 'start' instead of 'start_date'
            const formattedRow = {
                event_id: row.event_id,
                name: row.name,
                description: row.description,
                location: row.location,
                start: row.start,            // Changed from start_date to start
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

            console.log('✅ DB: Formatted response:', formattedRow);
            return callback(null, formattedRow);
        } catch (parseErr) {
            console.error('❌ DB: Error processing data:', parseErr);
            return callback(parseErr);
        }
    });
};

const updateEventInDB = (event_id, user_id, updatedFields, callback) => {
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

        if (event.creator_id !== user_id) {
            console.log('❌ DB: User not authorized to update this event');
            return callback(new Error('Unauthorized to update this event'));
        }

        // Build dynamic UPDATE query based on provided fields
        const updateFields = [];
        const params = [];
        
        Object.keys(updatedFields).forEach(field => {
            updateFields.push(`${field} = ?`);
            params.push(updatedFields[field]);
        });
        
        // Add event_id to params
        params.push(event_id);

        const updateSql = `
            UPDATE events 
            SET ${updateFields.join(', ')}
            WHERE event_id = ?`;
        
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
    // First check if event exists and get its details
    const checkEventSql = `
        SELECT 
            e.event_id,
            e.creator_id,
            e.close_registration,
            e.max_attendees,
            (SELECT COUNT(*) FROM attendees WHERE event_id = e.event_id) as current_attendees
        FROM events e
        WHERE e.event_id = ?`;

    db.get(checkEventSql, [event_id], (err, event) => {
        if (err) {
            return callback({
                status: 500,
                error_message: 'Database error'
            });
        }

        if (!event) {
            return callback({
                status: 404,
                error_message: 'Event not found'
            });
        }

        // Check if user is the creator
        if (event.creator_id === user_id) {
            return callback({
                status: 403,
                error_message: 'You are already registered'
            });
        }

        // Check if registration is closed (either archived or past close date)
        if (event.close_registration === -1 || Date.now() > event.close_registration) {
            return callback({
                status: 403,
                error_message: 'Registration is closed'
            });
        }

        // Check if event is at capacity
        const checkCapacitySql = `
            SELECT COUNT(*) as count 
            FROM attendees 
            WHERE event_id = ?`;

        db.get(checkCapacitySql, [event_id], (err, result) => {
            if (err) {
                return callback({
                    status: 500,
                    error_message: 'Database error'
                });
            }

            // Add 1 to count for the creator who is automatically registered
            if ((result.count + 1) >= event.max_attendees) {
                return callback({
                    status: 403,
                    error_message: 'Event is at capacity'
                });
            }

            // Check if user is already registered
            const checkRegistrationSql = `
                SELECT 1 FROM attendees 
                WHERE event_id = ? AND user_id = ?`;

            db.get(checkRegistrationSql, [event_id, user_id], (err, existing) => {
                if (err) {
                    return callback({
                        status: 500,
                        error_message: 'Database error'
                    });
                }

                if (existing) {
                    return callback({
                        status: 403,
                        error_message: 'You are already registered'
                    });
                }

                // All checks passed, register the user
                const insertSql = `INSERT INTO attendees (event_id, user_id) VALUES (?, ?)`;
                
                db.run(insertSql, [event_id, user_id], function(err) {
                    if (err) {
                        return callback({
                            status: 500,
                            error_message: 'Failed to register'
                        });
                    }
                    
                    return callback(null, {
                        status: 200,
                        event_id: event_id,
                        user_id: user_id
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
    sql += ` ORDER BY e.start DESC LIMIT ? OFFSET ?`;
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

        return callback(null, events);
    });
};

module.exports = {
    createEventInDB,      // Create a new event
    getEventFromDB,        // Get event details by ID
    updateEventInDB,     // Update an existing event
    registerAttendanceInDB, // Register user for event
    archiveEventInDB,     // Delete an event
    searchEventsInDB     // Search and filter events
};