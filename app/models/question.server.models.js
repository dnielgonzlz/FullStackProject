const Joi = require('joi');
const db = require('../../database');

const askQuestionInDB = (event_id, user_id, question, callback) => {
    console.log('Starting to create question');

    // Check if event exists
    const checkEvent = `SELECT * FROM events WHERE event_id = ?`;

    db.get(checkEvent, [event_id], (err, event) => {
        if (err) {
            console.log('Error checking event:', err);
            return callback({
                status: 500,
                error_message: 'Database error'
            });
        }

        if (!event) {
            console.log('Event not found');
            return callback({
                status: 404, 
                error_message: 'Event not found'
            });
        }

        // Check if user is registered for event
        const checkAccess = `
            SELECT * FROM attendees 
            WHERE event_id = ? AND user_id = ?`;

        db.get(checkAccess, [event_id, user_id], (err, attendee) => {
            if (err) {
                console.log('Error checking access:', err);
                return callback({
                    status: 500,
                    error_message: 'Database error' 
                });
            }

            // User must be registered and not the creator
            if (!attendee || event.creator_id === user_id) {
                console.log('User not authorized');
                return callback({
                    status: 403,
                    error_message: 'You must be registered for this event to ask questions'
                });
            }

            // Add the question
            const insertQuestion = `
                INSERT INTO questions (question, asked_by, event_id, votes)
                VALUES (?, ?, ?, 0)`;

            db.run(insertQuestion, [question, user_id, event_id], function(err) {
                if (err) {
                    console.log('Error creating question:', err);
                    return callback({
                        status: 500,
                        error_message: 'Could not create question'
                    });
                }

                console.log('Question created with ID:', this.lastID);
                return callback(null, {
                    status: 201,
                    question_id: this.lastID
                });
            });
        });
    });
};



const deleteQuestionFromDB = (question_id, user_id, callback) => {
    console.log('Starting to delete question');

    // First check if question exists and get permissions
    const sql = `
        SELECT questions.asked_by, events.creator_id 
        FROM questions
        JOIN events ON questions.event_id = events.event_id
        WHERE questions.question_id = ?`;

    db.get(sql, [question_id], (err, row) => {
        if (err) {
            console.log('Database error:', err);
            return callback({
                status: 500,
                error_message: 'Database error'
            });
        }

        // Question not found
        if (!row) {
            return callback({
                status: 404,
                error_message: 'Question not found'
            });
        }

        // Check if user can delete
        if (row.asked_by !== user_id && row.creator_id !== user_id) {
            return callback({
                status: 403,
                error_message: 'Not allowed to delete this question'
            });
        }

        // Delete the question
        db.run('DELETE FROM questions WHERE question_id = ?', 
            [question_id], 
            (err) => {
                if (err) {
                    console.log('Error deleting:', err);
                    return callback({
                        status: 500,
                        error_message: 'Error deleting question'
                    });
                }

                console.log('Question deleted!');
                return callback(null, {
                    status: 200
                });
            }
        );
    });
};


const upvoteQuestionInDB = (question_id, user_id, callback) => {
    console.log('Starting upvote');

    // Check if question exists
    const checkQuestion = `SELECT * FROM questions WHERE question_id = ?`;

    db.get(checkQuestion, [question_id], (err, question) => {
        if (err) {
            console.log('Error checking question:', err);
            return callback({
                status: 500,
                error_message: 'Server error'
            });
        }

        if (!question) {
            console.log('Question not found');
            return callback({
                status: 404,
                error_message: 'Question not found'
            });
        }

        // Check if user already voted
        const checkVote = `SELECT * FROM votes WHERE question_id = ? AND voter_id = ?`;

        db.get(checkVote, [question_id, user_id], (err, vote) => {
            if (err) {
                console.log('Error checking vote:', err);
                return callback({
                    status: 500,
                    error_message: 'Server error'
                });
            }

            if (vote) {
                console.log('Already voted');
                return callback({
                    status: 403,
                    error_message: 'You already voted on this question'
                });
            }

            // Add vote
            const addVote = `INSERT INTO votes (question_id, voter_id) VALUES (?, ?)`;

            db.run(addVote, [question_id, user_id], (err) => {
                if (err) {
                    console.log('Error adding vote:', err);
                    return callback({
                        status: 500,
                        error_message: 'Server error'
                    });
                }

                // Update vote count
                const updateVotes = `UPDATE questions SET votes = votes + 1 WHERE question_id = ?`;

                db.run(updateVotes, [question_id], (err) => {
                    if (err) {
                        console.log('Error updating votes:', err);
                        return callback({
                            status: 500,
                            error_message: 'Server error'
                        });
                    }

                    console.log('Vote added successfully');
                    return callback(null, { status: 200 });
                });
            });
        });
    });
};


const downvoteQuestionInDB = (question_id, user_id, callback) => {
    console.log('Starting downvote');

    db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        // Check if question exists
        const sql1 = `SELECT * FROM questions WHERE question_id = ?`;

        db.get(sql1, [question_id], (err, question) => {
            if (err) {
                console.log('Error:', err);
                db.run('ROLLBACK');
                return callback({
                    status: 500,
                    error_message: 'Server Error'
                });
            }

            if (!question) {
                console.log('Question not found');
                db.run('ROLLBACK');
                return callback({
                    status: 404,
                    error_message: 'Not Found'
                });
            }

            // Check if already voted
            const sql2 = `SELECT * FROM votes WHERE question_id = ? AND voter_id = ?`;

            db.get(sql2, [question_id, user_id], (err, vote) => {
                if (err) {
                    console.log('Error:', err);
                    db.run('ROLLBACK');
                    return callback({
                        status: 500,
                        error_message: 'Server Error'
                    });
                }

                if (vote) {
                    console.log('Already voted');
                    db.run('ROLLBACK');
                    return callback({
                        status: 403,
                        error_message: 'You have already voted on this question'
                    });
                }

                // Add vote record
                const sql3 = `INSERT INTO votes (question_id, voter_id) VALUES (?, ?)`;

                db.run(sql3, [question_id, user_id], (err) => {
                    if (err) {
                        console.log('Error:', err);
                        db.run('ROLLBACK');
                        return callback({
                            status: 500,
                            error_message: 'Server Error'
                        });
                    }

                    // Update vote count
                    const sql4 = `UPDATE questions SET votes = votes - 1 WHERE question_id = ?`;

                    db.run(sql4, [question_id], function(err) {
                        if (err) {
                            console.log('Error:', err);
                            db.run('ROLLBACK');
                            return callback({
                                status: 500,
                                error_message: 'Server Error'
                            });
                        }

                        db.run('COMMIT', (err) => {
                            if (err) {
                                console.log('Error:', err);
                                db.run('ROLLBACK');
                                return callback({
                                    status: 500,
                                    error_message: 'Server Error'
                                });
                            }

                            console.log('Vote added successfully');
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