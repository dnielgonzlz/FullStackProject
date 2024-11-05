const Joi = require('joi');
const db = require('../../database');

const askQuestionInDB = (event_id, user_id, question, callback) => {
    db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        // First check if the event exists and if user is allowed to ask questions
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

        db.get(checkAccessSql, [event_id, user_id, user_id], (err, hasAccess) => {
            if (err) {
                db.run('ROLLBACK');
                return callback({
                    status: 500,
                    error_message: 'Database error while checking access'
                });
            }

            if (!hasAccess) {
                db.run('ROLLBACK');
                return callback({
                    status: 403,
                    error_message: 'You cannot ask questions on events you are not registered for or your own events'
                });
            }

            // Insert the question
            const insertSql = `
                INSERT INTO questions (
                    question,
                    asked_by,
                    event_id,
                    votes,
                    created_at
                ) VALUES (?, ?, ?, 0, ?)`;

            const params = [
                question,
                user_id,
                event_id,
                Date.now()
            ];

            db.run(insertSql, params, function(err) {
                if (err) {
                    db.run('ROLLBACK');
                    return callback({
                        status: 500,
                        error_message: 'Failed to create question'
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

                    // Successfully created
                    return callback(null, {
                        status: 201,
                        question_id: this.lastID
                    });
                });
            });
        });
    });
};

const deleteQuestionFromDB = (question_id, user_id, callback) => {
    db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        // First check if the question exists and if user has permission to delete it
        const checkPermissionSql = `
            SELECT q.asked_by, e.creator_id
            FROM questions q
            JOIN events e ON q.event_id = e.event_id
            WHERE q.question_id = ?`;

        db.get(checkPermissionSql, [question_id], (err, row) => {
            if (err) {
                db.run('ROLLBACK');
                return callback({
                    status: 500,
                    error_message: 'Database error while checking permissions'
                });
            }

            if (!row) {
                db.run('ROLLBACK');
                return callback({
                    status: 404,
                    error_message: 'Question not found'
                });
            }

            // Check if user is either the question author or the event creator
            if (row.asked_by !== user_id && row.creator_id !== user_id) {
                db.run('ROLLBACK');
                return callback({
                    status: 403,
                    error_message: 'You can only delete questions that you have authored, or for events that you have created'
                });
            }

            // Delete the question
            const deleteSql = `DELETE FROM questions WHERE question_id = ?`;

            db.run(deleteSql, [question_id], function(err) {
                if (err) {
                    db.run('ROLLBACK');
                    return callback({
                        status: 500,
                        error_message: 'Failed to delete question'
                    });
                }

                if (this.changes === 0) {
                    db.run('ROLLBACK');
                    return callback({
                        status: 404,
                        error_message: 'Question not found'
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
                        message: 'Question successfully deleted'
                    });
                });
            });
        });
    });
};

const upvoteQuestionInDB = (question_id, user_id, callback) => {
    db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        // First check if the question exists
        const checkQuestionSql = `
            SELECT 1 
            FROM questions 
            WHERE question_id = ?`;

        db.get(checkQuestionSql, [question_id], (err, question) => {
            if (err) {
                db.run('ROLLBACK');
                return callback({
                    status: 500,
                    error_message: 'Database error while checking question'
                });
            }

            if (!question) {
                db.run('ROLLBACK');
                return callback({
                    status: 404,
                    error_message: 'Question not found'
                });
            }

            // Check if user has already voted
            const checkVoteSql = `
                SELECT 1 
                FROM votes 
                WHERE question_id = ? AND voter_id = ?`;

            db.get(checkVoteSql, [question_id, user_id], (err, existingVote) => {
                if (err) {
                    db.run('ROLLBACK');
                    return callback({
                        status: 500,
                        error_message: 'Database error while checking vote'
                    });
                }

                if (existingVote) {
                    db.run('ROLLBACK');
                    return callback({
                        status: 403,
                        error_message: 'You have already voted on this question'
                    });
                }

                // Record the vote
                const insertVoteSql = `
                    INSERT INTO votes (
                        question_id, 
                        voter_id,
                        voted_at
                    ) VALUES (?, ?, ?)`;

                db.run(insertVoteSql, [question_id, user_id, Date.now()], (err) => {
                    if (err) {
                        db.run('ROLLBACK');
                        return callback({
                            status: 500,
                            error_message: 'Failed to record vote'
                        });
                    }

                    // Update the vote count
                    const updateVotesSql = `
                        UPDATE questions 
                        SET votes = votes + 1 
                        WHERE question_id = ?`;

                    db.run(updateVotesSql, [question_id], function(err) {
                        if (err) {
                            db.run('ROLLBACK');
                            return callback({
                                status: 500,
                                error_message: 'Failed to update vote count'
                            });
                        }

                        if (this.changes === 0) {
                            db.run('ROLLBACK');
                            return callback({
                                status: 404,
                                error_message: 'Question not found'
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

                            // Successfully voted
                            return callback(null, {
                                status: 200,
                                message: 'Vote recorded successfully',
                                question_id: question_id
                            });
                        });
                    });
                });
            });
        });
    });
};

const downvoteQuestionInDB = (question_id, user_id, callback) => {
    db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        // First check if the question exists
        const checkQuestionSql = `
            SELECT votes 
            FROM questions 
            WHERE question_id = ?`;

        db.get(checkQuestionSql, [question_id], (err, question) => {
            if (err) {
                db.run('ROLLBACK');
                return callback({
                    status: 500,
                    error_message: 'Database error while checking question'
                });
            }

            if (!question) {
                db.run('ROLLBACK');
                return callback({
                    status: 404,
                    error_message: 'Question not found'
                });
            }

            // Check if user has already voted
            const checkVoteSql = `
                SELECT 1 
                FROM votes 
                WHERE question_id = ? AND voter_id = ?`;

            db.get(checkVoteSql, [question_id, user_id], (err, existingVote) => {
                if (err) {
                    db.run('ROLLBACK');
                    return callback({
                        status: 500,
                        error_message: 'Database error while checking vote'
                    });
                }

                if (!existingVote) {
                    db.run('ROLLBACK');
                    return callback({
                        status: 403,
                        error_message: 'You have not voted on this question'
                    });
                }

                // Delete the vote
                const deleteVoteSql = `
                    DELETE FROM votes 
                    WHERE question_id = ? AND voter_id = ?`;

                db.run(deleteVoteSql, [question_id, user_id], (err) => {
                    if (err) {
                        db.run('ROLLBACK');
                        return callback({
                            status: 500,
                            error_message: 'Failed to remove vote'
                        });
                    }

                    // Update the question's vote count
                    const updateVotesSql = `
                        UPDATE questions 
                        SET votes = votes - 1 
                        WHERE question_id = ? AND votes > 0`;

                    db.run(updateVotesSql, [question_id], function(err) {
                        if (err) {
                            db.run('ROLLBACK');
                            return callback({
                                status: 500,
                                error_message: 'Failed to update vote count'
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

                            // Successfully downvoted
                            return callback(null, {
                                status: 200,
                                message: 'Vote removed successfully',
                                question_id: question_id
                            });
                        });
                    });
                });
            });
        });
    });
};

/**
 * Question management module
 * @module questions
 */

/**
 * @typedef {Object} Question
 * @property {number} question_id - Unique identifier for the question
 * @property {string} question - The question text
 * @property {number} asked_by - User ID of the question author
 * @property {number} event_id - ID of the event this question belongs to
 * @property {number} votes - Number of votes on the question
 * @property {number} created_at - Timestamp when question was created
 */

/**
 * @typedef {Object} Vote
 * @property {number} question_id - ID of the question being voted on
 * @property {number} voter_id - ID of the user voting
 * @property {number} voted_at - Timestamp of the vote
 */

module.exports = {
    /** 
     * Create a new question for an event
     * @function askQuestion
     * @param {number} event_id - ID of the event
     * @param {number} user_id - ID of the asking user
     * @param {Object} questionData - Question data
     * @param {string} questionData.question - The question text
     * @param {function} done - Callback function
     */
    askQuestion,

    /** 
     * Delete a question
     * @function deleteQuestion
     * @param {number} question_id - ID of the question to delete
     * @param {number} user_id - ID of user attempting deletion
     * @param {function} done - Callback function
     */
    deleteQuestion,

    /** 
     * Upvote a question
     * @function upvoteQuestion
     * @param {number} question_id - ID of the question to upvote
     * @param {number} user_id - ID of the voting user
     * @param {function} done - Callback function
     */
    upvoteQuestion,

    /** 
     * Downvote a question (remove upvote)
     * @function downvoteQuestion
     * @param {number} question_id - ID of the question to downvote
     * @param {number} user_id - ID of the voting user
     * @param {function} done - Callback function
     */
    downvoteQuestion
};

// Question management functions
module.exports = {
    askQuestion,      // Create a new question for an event
    deleteQuestion,   // Delete a question (creator or event owner only)
    upvoteQuestion,   // Upvote a question
    downvoteQuestion  // Remove upvote from a question
};