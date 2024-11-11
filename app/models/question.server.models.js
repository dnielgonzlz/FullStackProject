const Joi = require('joi');
const db = require('../../database');

const askQuestionInDB = (event_id, user_id, question, callback) => {
    console.log('🔍 DB: Starting question creation process');

    db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        // First check if the event exists
        const checkEventSql = `SELECT 1 FROM events WHERE event_id = ?`;

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

            // Then check if user is allowed to ask questions
            const checkAccessSql = `
                SELECT 1
                FROM events e
                WHERE e.event_id = ? 
                AND (
                    e.creator_id = ? 
                    OR EXISTS (
                        SELECT 1 
                        FROM attendees a 
                        WHERE a.event_id = e.event_id 
                        AND a.user_id = ?
                    )
                )`;

            console.log('🔍 DB: Checking user access');
            db.get(checkAccessSql, [event_id, user_id, user_id], (err, hasAccess) => {
                if (err) {
                    console.error('❌ DB: Error checking access:', err);
                    db.run('ROLLBACK');
                    return callback({
                        status: 500,
                        error_message: 'Database error while checking access'
                    });
                }

                if (!hasAccess) {
                    console.log('❌ DB: User not authorized to ask questions');
                    db.run('ROLLBACK');
                    return callback({
                        status: 403,
                        error_message: 'You cannot ask questions on events you are not registered for or your own events'
                    });
                }

                console.log('✅ DB: User authorized to ask questions');

                // Insert the question - Modified to match schema exactly
                const insertSql = `
                    INSERT INTO questions (
                        question,
                        asked_by,
                        event_id,
                        votes
                    ) VALUES (?, ?, ?, 0)`;

                const params = [
                    question,
                    user_id,
                    event_id
                ];

                console.log('📝 DB: Inserting question with params:', {
                    question: question,
                    asked_by: user_id,
                    event_id: event_id
                });

                db.run(insertSql, params, function(err) {
                    if (err) {
                        console.error('❌ DB: Error creating question:', err);
                        db.run('ROLLBACK');
                        return callback({
                            status: 500,
                            error_message: 'Failed to create question'
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

                        console.log('✅ DB: Question created successfully with ID:', this.lastID);
                        return callback(null, {
                            status: 201,
                            question_id: this.lastID
                        });
                    });
                });
            });
        });
    });
};



const deleteQuestionFromDB = (question_id, user_id, callback) => {
    console.log('🔍 DB: Starting question deletion process');

    db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        const checkPermissionSql = `
            SELECT q.asked_by, e.creator_id
            FROM questions q
            JOIN events e ON q.event_id = e.event_id
            WHERE q.question_id = ?`;

        console.log('🔍 DB: Checking permissions for question:', question_id);
        db.get(checkPermissionSql, [question_id], (err, row) => {
            if (err) {
                console.error('❌ DB: Error checking permissions:', err);
                db.run('ROLLBACK');
                return callback({
                    status: 500,
                    error_message: 'Database error while checking permissions'
                });
            }

            if (!row) {
                console.log('❌ DB: Question not found');
                db.run('ROLLBACK');
                return callback({
                    status: 404,
                    error_message: 'Not Found'
                });
            }

            console.log('👤 DB: Checking user authorization:', {
                user_id: user_id,
                asked_by: row.asked_by,
                creator_id: row.creator_id
            });

            // Check if user is either the question author or the event creator
            if (row.asked_by !== user_id && row.creator_id !== user_id) {
                console.log('❌ DB: User not authorized to delete question');
                db.run('ROLLBACK');
                return callback({
                    status: 403,
                    error_message: 'You can only delete questions that have authored, or for events that you have created'
                });
            }

            // Delete the question
            const deleteSql = `DELETE FROM questions WHERE question_id = ?`;

            console.log('📝 DB: Deleting question');
            db.run(deleteSql, [question_id], function(err) {
                if (err) {
                    console.error('❌ DB: Error deleting question:', err);
                    db.run('ROLLBACK');
                    return callback({
                        status: 500,
                        error_message: 'Server Error'
                    });
                }

                db.run('COMMIT', (err) => {
                    if (err) {
                        console.error('❌ DB: Error committing transaction:', err);
                        db.run('ROLLBACK');
                        return callback({
                            status: 500,
                            error_message: 'Server Error'
                        });
                    }

                    console.log('✅ DB: Question deleted successfully');
                    return callback(null, { status: 200 });
                });
            });
        });
    });
};


const upvoteQuestionInDB = (question_id, user_id, callback) => {
    console.log('🔍 DB: Starting upvote process');

    db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        // First check if the question exists
        const checkQuestionSql = `
            SELECT 1 
            FROM questions 
            WHERE question_id = ?`;

        console.log('🔍 DB: Checking if question exists');
        db.get(checkQuestionSql, [question_id], (err, question) => {
            if (err) {
                console.error('❌ DB: Error checking question:', err);
                db.run('ROLLBACK');
                return callback({
                    status: 500,
                    error_message: 'Server Error'
                });
            }

            if (!question) {
                console.log('❌ DB: Question not found');
                db.run('ROLLBACK');
                return callback({
                    status: 404,
                    error_message: 'Not Found'
                });
            }

            // Check if user has already voted
            const checkVoteSql = `
                SELECT 1 
                FROM votes 
                WHERE question_id = ? AND voter_id = ?`;

            console.log('🔍 DB: Checking for existing vote');
            db.get(checkVoteSql, [question_id, user_id], (err, existingVote) => {
                if (err) {
                    console.error('❌ DB: Error checking vote:', err);
                    db.run('ROLLBACK');
                    return callback({
                        status: 500,
                        error_message: 'Server Error'
                    });
                }

                if (existingVote) {
                    console.log('❌ DB: User has already voted');
                    db.run('ROLLBACK');
                    return callback({
                        status: 403,
                        error_message: 'You have already voted on this question'
                    });
                }

                // Record the vote
                const insertVoteSql = `
                    INSERT INTO votes (question_id, voter_id) 
                    VALUES (?, ?)`;

                console.log('📝 DB: Recording vote');
                db.run(insertVoteSql, [question_id, user_id], (err) => {
                    if (err) {
                        console.error('❌ DB: Error recording vote:', err);
                        db.run('ROLLBACK');
                        return callback({
                            status: 500,
                            error_message: 'Server Error'
                        });
                    }

                    // Update the vote count
                    const updateVotesSql = `
                        UPDATE questions 
                        SET votes = votes + 1 
                        WHERE question_id = ?`;

                    console.log('📝 DB: Updating vote count');
                    db.run(updateVotesSql, [question_id], function(err) {
                        if (err) {
                            console.error('❌ DB: Error updating vote count:', err);
                            db.run('ROLLBACK');
                            return callback({
                                status: 500,
                                error_message: 'Server Error'
                            });
                        }

                        db.run('COMMIT', (err) => {
                            if (err) {
                                console.error('❌ DB: Error committing transaction:', err);
                                db.run('ROLLBACK');
                                return callback({
                                    status: 500,
                                    error_message: 'Server Error'
                                });
                            }

                            console.log('✅ DB: Vote recorded successfully');
                            return callback(null, { status: 200 });
                        });
                    });
                });
            });
        });
    });
};


const downvoteQuestionInDB = (question_id, user_id, callback) => {
    console.log('🔍 DB: Starting downvote process');

    db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        // First check if the question exists
        const checkQuestionSql = `
            SELECT votes 
            FROM questions 
            WHERE question_id = ?`;

        console.log('🔍 DB: Checking if question exists');
        db.get(checkQuestionSql, [question_id], (err, question) => {
            if (err) {
                console.error('❌ DB: Error checking question:', err);
                db.run('ROLLBACK');
                return callback({
                    status: 500,
                    error_message: 'Server Error'
                });
            }

            if (!question) {
                console.log('❌ DB: Question not found');
                db.run('ROLLBACK');
                return callback({
                    status: 404,
                    error_message: 'Not Found'
                });
            }

            // Check if user has already voted
            const checkVoteSql = `
                SELECT 1 
                FROM votes 
                WHERE question_id = ? AND voter_id = ?`;

            console.log('🔍 DB: Checking for existing vote');
            db.get(checkVoteSql, [question_id, user_id], (err, existingVote) => {
                if (err) {
                    console.error('❌ DB: Error checking vote:', err);
                    db.run('ROLLBACK');
                    return callback({
                        status: 500,
                        error_message: 'Server Error'
                    });
                }

                if (!existingVote) {
                    console.log('❌ DB: User has not voted on this question');
                    db.run('ROLLBACK');
                    return callback({
                        status: 403,
                        error_message: 'You have already voted on this question'
                    });
                }

                // Delete the vote
                const deleteVoteSql = `
                    DELETE FROM votes 
                    WHERE question_id = ? AND voter_id = ?`;

                console.log('📝 DB: Removing vote');
                db.run(deleteVoteSql, [question_id, user_id], (err) => {
                    if (err) {
                        console.error('❌ DB: Error removing vote:', err);
                        db.run('ROLLBACK');
                        return callback({
                            status: 500,
                            error_message: 'Server Error'
                        });
                    }

                    // Update the question's vote count
                    const updateVotesSql = `
                        UPDATE questions 
                        SET votes = votes - 1 
                        WHERE question_id = ? AND votes > 0`;

                    console.log('📝 DB: Updating vote count');
                    db.run(updateVotesSql, [question_id], function(err) {
                        if (err) {
                            console.error('❌ DB: Error updating vote count:', err);
                            db.run('ROLLBACK');
                            return callback({
                                status: 500,
                                error_message: 'Server Error'
                            });
                        }

                        db.run('COMMIT', (err) => {
                            if (err) {
                                console.error('❌ DB: Error committing transaction:', err);
                                db.run('ROLLBACK');
                                return callback({
                                    status: 500,
                                    error_message: 'Server Error'
                                });
                            }

                            console.log('✅ DB: Vote removed successfully');
                            return callback(null, { status: 200 });
                        });
                    });
                });
            });
        });
    });
};


module.exports = {
    askQuestionInDB,      // Create a new question for an event
    deleteQuestionFromDB,   // Delete a question (creator or event owner only)
    upvoteQuestionInDB,   // Upvote a question
    downvoteQuestionInDB  // Remove upvote from a question
};