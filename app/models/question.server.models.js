const Joi = require('joi');
const db = require('../../database');

// Creates a new question for an event after verifying user permissions
const askQuestionInDB = (event_id, user_id, question, callback) => {
    // Verify event exists before adding question
    const checkEvent = `SELECT * FROM events WHERE event_id = ?`;

    db.get(checkEvent, [event_id], (err, event) => {
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

        // Verify user is registered for the event
        const checkAccess = `
            SELECT * FROM attendees 
            WHERE event_id = ? AND user_id = ?`;

        db.get(checkAccess, [event_id, user_id], (err, attendee) => {
            if (err) {
                return callback({
                    status: 500,
                    error_message: 'Database error' 
                });
            }

            // Prevent event creator from asking questions
            if (!attendee || event.creator_id === user_id) {
                return callback({
                    status: 403,
                    error_message: 'You must be registered for this event to ask questions'
                });
            }

            // Insert the new question
            const insertQuestion = `
                INSERT INTO questions (question, asked_by, event_id, votes)
                VALUES (?, ?, ?, 0)`;

            db.run(insertQuestion, [question, user_id, event_id], function(err) {
                if (err) {
                    return callback({
                        status: 500,
                        error_message: 'Could not create question'
                    });
                }

                return callback(null, {
                    status: 201,
                    question_id: this.lastID
                });
            });
        });
    });
};

// Deletes a question after verifying permissions
const deleteQuestionFromDB = (question_id, user_id, callback) => {
    // Check question ownership and event creator permissions
    const sql = `
        SELECT questions.asked_by, events.creator_id 
        FROM questions
        JOIN events ON questions.event_id = events.event_id
        WHERE questions.question_id = ?`;

    db.get(sql, [question_id], (err, row) => {
        if (err) {
            return callback({
                status: 500,
                error_message: 'Database error'
            });
        }

        if (!row) {
            return callback({
                status: 404,
                error_message: 'Question not found'
            });
        }

        // Allow deletion only by question author or event creator
        if (row.asked_by !== user_id && row.creator_id !== user_id) {
            return callback({
                status: 403,
                error_message: 'Not allowed to delete this question'
            });
        }

        // Remove the question
        db.run('DELETE FROM questions WHERE question_id = ?', 
            [question_id], 
            (err) => {
                if (err) {
                    return callback({
                        status: 500,
                        error_message: 'Error deleting question'
                    });
                }

                return callback(null, {
                    status: 200
                });
            }
        );
    });
};

// Adds an upvote to a question and updates vote count
const upvoteQuestionInDB = (question_id, user_id, callback) => {
    // Verify question exists
    const checkQuestion = `SELECT * FROM questions WHERE question_id = ?`;

    db.get(checkQuestion, [question_id], (err, question) => {
        if (err) {
            return callback({
                status: 500,
                error_message: 'Server error'
            });
        }

        if (!question) {
            return callback({
                status: 404,
                error_message: 'Question not found'
            });
        }

        // Check for existing vote by this user
        const checkVote = `SELECT * FROM votes WHERE question_id = ? AND voter_id = ?`;

        db.get(checkVote, [question_id, user_id], (err, vote) => {
            if (err) {
                return callback({
                    status: 500,
                    error_message: 'Server error'
                });
            }

            if (vote) {
                return callback({
                    status: 403,
                    error_message: 'You already voted on this question'
                });
            }

            // Record the vote
            const addVote = `INSERT INTO votes (question_id, voter_id) VALUES (?, ?)`;

            db.run(addVote, [question_id, user_id], (err) => {
                if (err) {
                    return callback({
                        status: 500,
                        error_message: 'Server error'
                    });
                }

                // Increment the question's vote count
                const updateVotes = `UPDATE questions SET votes = votes + 1 WHERE question_id = ?`;

                db.run(updateVotes, [question_id], (err) => {
                    if (err) {
                        return callback({
                            status: 500,
                            error_message: 'Server error'
                        });
                    }

                    return callback(null, { status: 200 });
                });
            });
        });
    });
};

// Adds a downvote to a question and updates vote count
const downvoteQuestionInDB = (question_id, user_id, callback) => {
    db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        // Verify question exists
        const sql1 = `SELECT * FROM questions WHERE question_id = ?`;

        db.get(sql1, [question_id], (err, question) => {
            if (err) {
                db.run('ROLLBACK');
                return callback({
                    status: 500,
                    error_message: 'Server Error'
                });
            }

            if (!question) {
                db.run('ROLLBACK');
                return callback({
                    status: 404,
                    error_message: 'Not Found'
                });
            }

            // Check for existing vote
            const sql2 = `SELECT * FROM votes WHERE question_id = ? AND voter_id = ?`;

            db.get(sql2, [question_id, user_id], (err, vote) => {
                if (err) {
                    db.run('ROLLBACK');
                    return callback({
                        status: 500,
                        error_message: 'Server Error'
                    });
                }

                if (vote) {
                    db.run('ROLLBACK');
                    return callback({
                        status: 403,
                        error_message: 'You have already voted on this question'
                    });
                }

                // Record the vote
                const sql3 = `INSERT INTO votes (question_id, voter_id) VALUES (?, ?)`;

                db.run(sql3, [question_id, user_id], (err) => {
                    if (err) {
                        db.run('ROLLBACK');
                        return callback({
                            status: 500,
                            error_message: 'Server Error'
                        });
                    }

                    // Decrement the question's vote count
                    const sql4 = `UPDATE questions SET votes = votes - 1 WHERE question_id = ?`;

                    db.run(sql4, [question_id], function(err) {
                        if (err) {
                            db.run('ROLLBACK');
                            return callback({
                                status: 500,
                                error_message: 'Server Error'
                            });
                        }

                        // Commit all changes
                        db.run('COMMIT', (err) => {
                            if (err) {
                                db.run('ROLLBACK');
                                return callback({
                                    status: 500,
                                    error_message: 'Server Error'
                                });
                            }

                            return callback(null, { status: 200 });
                        });
                    });
                });
            });
        });
    });
};

module.exports = {
    askQuestionInDB,      
    deleteQuestionFromDB, 
    upvoteQuestionInDB,   
    downvoteQuestionInDB  
};