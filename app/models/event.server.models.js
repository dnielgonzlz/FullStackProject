const Joi = require('joi');
const db = require('../../database');

const createEventInDB = (event, creator_id, done) => {
    db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        // Insert base event details into events table
        const eventSql = `
            INSERT INTO events (
                name, description, location, start, 
                close_registration, max_attendees, creator_id
            ) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        
        const eventValues = [
            event.name,
            event.description, 
            event.location,
            event.start,
            event.close_registration,
            event.max_attendees,
            creator_id
        ];

        db.run(eventSql, eventValues, function(err) {
            if (err) {
                db.run('ROLLBACK');
                return done(err);
            }

            const eventId = this.lastID;

            // Process categories if provided
            if (event.categories && event.categories.length > 0) {
                const uniqueCategories = [...new Set(event.categories)];
                let insertedCount = 0;
                
                const insertCategory = (categoryId) => {
                    const categorySql = `
                        INSERT OR IGNORE INTO event_categories (event_id, category_id)
                        VALUES (?, ?)
                    `;

                    db.run(categorySql, [eventId, categoryId], (err) => {
                        if (err) {
                            db.run('ROLLBACK');
                            return done({
                                status: 500,
                                error_message: 'Error linking categories to event'
                            });
                        }

                        insertedCount++;
                        if (insertedCount === uniqueCategories.length) {
                            // Commit transaction after all categories are processed
                            db.run('COMMIT', (err) => {
                                if (err) {
                                    db.run('ROLLBACK');
                                    return done({
                                        status: 500,
                                        error_message: 'Error committing transaction'
                                    });
                                }
                                return done(null, { event_id: eventId });
                            });
                        }
                    });
                };

                uniqueCategories.forEach(categoryId => {
                    insertCategory(categoryId);
                });
            } else {
                // Commit transaction if no categories to process
                db.run('COMMIT', (err) => {
                    if (err) {
                        db.run('ROLLBACK');
                        return done({
                            status: 500,
                            error_message: 'Error committing transaction'
                        });
                    }
                    return done(null, { event_id: eventId });
                });
            }
        });
    });
};

// Retrieves complete event details including attendees and questions
const getEventFromDB = (event_id, callback) => {
    // Complex query to fetch event details, creator info, attendees, and questions
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
        (SELECT COUNT(*) + 1 FROM attendees WHERE event_id = e.event_id) as number_attending,
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
                FROM (
                    SELECT user_id FROM attendees WHERE event_id = e.event_id
                    UNION
                    SELECT e.creator_id
                ) att
                JOIN users a_user ON att.user_id = a_user.user_id
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
                ORDER BY q.question_id DESC
            ),
            '[]'
        ) as questions
    FROM events e
    JOIN users u ON e.creator_id = u.user_id
    WHERE e.event_id = ?`;

    db.get(sql, [event_id], (err, row) => {
        if (err) {
            return callback(err);
        }
        
        if (!row) {
            return callback(new Error('Event not found'));
        }

        try {
            // Convert JSON strings to objects for attendees and questions
            if (typeof row.attendees === 'string') {
                row.attendees = JSON.parse(row.attendees);
            }
            if (typeof row.questions === 'string') {
                row.questions = JSON.parse(row.questions);
            }

            // Sort questions by vote count in descending order
            if (Array.isArray(row.questions)) {
                row.questions.sort((a, b) => b.votes - a.votes);
            }

            // Format response object with nested structure
            const formattedRow = {
                event_id: row.event_id,
                name: row.name,
                description: row.description,
                location: row.location,
                start: row.start,
                close_registration: row.close_registration,
                max_attendees: row.max_attendees,
                creator: {
                    creator_id: row.creator_id,
                    first_name: row.creator_first_name,
                    last_name: row.creator_last_name,
                    email: row.creator_email
                },
                number_attending: row.number_attending,
                attendees: row.attendees,
                questions: row.questions
            };

            return callback(null, formattedRow);
        } catch (parseErr) {
            return callback(parseErr);
        }
    });
};

// Updates event details after verifying creator permissions
const updateEventInDB = (event_id, user_id, updatedFields, callback) => {
    // Verify user is the event creator before allowing updates
    const checkCreatorSql = `
        SELECT creator_id 
        FROM events 
        WHERE event_id = ?`;

    db.get(checkCreatorSql, [event_id], (err, event) => {
        if (err) {
            return callback(err);
        }

        if (!event) {
            return callback(new Error('Event not found'));
        }

        if (event.creator_id !== user_id) {
            return callback(new Error('Unauthorized to update this event'));
        }

        // Dynamically build update query based on provided fields
        const updateFields = [];
        const params = [];
        
        Object.keys(updatedFields).forEach(field => {
            updateFields.push(`${field} = ?`);
            params.push(updatedFields[field]);
        });
        
        params.push(event_id);

        const updateSql = `
            UPDATE events 
            SET ${updateFields.join(', ')}
            WHERE event_id = ?`;

        db.run(updateSql, params, function(err) {
            if (err) {
                return callback(err);
            }

            return callback(null, { 
                event_id: event_id,
                changes: this.changes
            });
        });
    });
};

// Handles user registration for an event with capacity and timing checks
const registerAttendanceInDB = (event_id, user_id, callback) => {
    // Check event details and registration eligibility
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

        // Verify event exists and perform registration checks
        if (!event) {
            return callback({
                status: 404,
                error_message: 'Event not found'
            });
        }

        // Prevent creator from registering as attendee
        if (event.creator_id === user_id) {
            return callback({
                status: 403,
                error_message: 'You are already registered'
            });
        }

        // Check if registration period is still open
        if (event.close_registration === -1 || Date.now() > event.close_registration) {
            return callback({
                status: 403,
                error_message: 'Registration is closed'
            });
        }

        // Verify event capacity
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

            // Check if event is at capacity (including creator)
            if ((result.count + 1) >= event.max_attendees) {
                return callback({
                    status: 403,
                    error_message: 'Event is at capacity'
                });
            }

            // Check for existing registration
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

                // Register user for the event
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

// Archives an event by setting close_registration to -1
const archiveEventInDB = (event_id, user_id, callback) => {
    db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        // Verify event ownership before archiving
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

            // Verify event exists and user has permission
            if (!event) {
                db.run('ROLLBACK');
                return callback({
                    status: 404,
                    error_message: 'Event not found'
                });
            }

            if (event.creator_id !== user_id) {
                db.run('ROLLBACK');
                return callback({
                    status: 403,
                    error_message: 'You can only archive your own events'
                });
            }

            // Archive the event
            const archiveSql = `
                UPDATE events 
                SET close_registration = -1 
                WHERE event_id = ?`;

            db.run(archiveSql, [event_id], function(err) {
                if (err) {
                    db.run('ROLLBACK');
                    return callback({
                        status: 500,
                        error_message: 'Failed to archive event'
                    });
                }

                if (this.changes === 0) {
                    db.run('ROLLBACK');
                    return callback({
                        status: 404,
                        error_message: 'Event not found'
                    });
                }

                // Commit the transaction
                db.run('COMMIT', (err) => {
                    if (err) {
                        db.run('ROLLBACK');
                        return callback({
                            status: 500,
                            error_message: 'Failed to commit transaction'
                        });
                    }

                    return callback(null, {
                        status: 200,
                        message: 'Event successfully archived'
                    });
                });
            });
        });
    });
};

// Searches events based on various filters and parameters
const searchEventsInDB = (params, user_id, callback) => {
    // Base query with joins for related data
    let sql = `
        SELECT DISTINCT
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
        LEFT JOIN event_categories ec ON e.event_id = ec.event_id
        WHERE 1=1
    `;
    
    const queryParams = [];

    // Add search filters based on parameters
    if (params.q) {
        sql += ` AND (e.name LIKE ? OR e.description LIKE ? OR e.location LIKE ?)`;
        queryParams.push(`%${params.q}%`, `%${params.q}%`, `%${params.q}%`);
    }

    if (params.categories && params.categories.length > 0) {
        sql += ` AND ec.category_id IN (${params.categories.join(',')})`;
    }

    // Apply status filters
    if (params.status) {
        switch (params.status) {
            case 'MY_EVENTS':
                if (!user_id) {
                    return callback({
                        status: 401,
                        error_message: 'Authentication required for MY_EVENTS'
                    });
                }
                sql += ` AND e.creator_id = ?`;
                queryParams.push(user_id);
                break;
            case 'ATTENDING':
                if (!user_id) {
                    return callback({
                        status: 401,
                        error_message: 'Authentication required for ATTENDING'
                    });
                }
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
    }

    // Add pagination
    sql += ` GROUP BY e.event_id ORDER BY e.start DESC LIMIT ? OFFSET ?`;
    queryParams.push(params.limit, params.offset);

    // Execute search query
    db.all(sql, queryParams, (err, rows) => {
        if (err) {
            return callback({
                status: 500,
                error_message: 'Server Error'
            });
        }

        // Format results
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

// Retrieves all categories with count of active events
const getCategoriesFromDB = (callback) => {
    const sql = `
        SELECT 
            c.category_id,
            c.name,
            COUNT(DISTINCT CASE 
                WHEN e.close_registration > ? 
                THEN ec.event_id 
                ELSE NULL 
            END) as active_events_count
        FROM categories c
        LEFT JOIN event_categories ec ON c.category_id = ec.category_id
        LEFT JOIN events e ON ec.event_id = e.event_id
        GROUP BY c.category_id, c.name
        ORDER BY c.name ASC
    `;
    
    const currentTimestamp = Date.now();
    
    db.all(sql, [currentTimestamp], (err, rows) => {
        if (err) {
            return callback({
                status: 500,
                error_message: 'Database error while retrieving categories'
            });
        }
        
        // Format category counts
        const formattedRows = rows.map(row => ({
            ...row,
            active_events_count: parseInt(row.active_events_count) || 0
        }));
        
        return callback(null, formattedRows);
    });
};

module.exports = {
    createEventInDB,    
    getEventFromDB,     
    updateEventInDB,    
    registerAttendanceInDB,
    archiveEventInDB,
    searchEventsInDB,
    getCategoriesFromDB
};