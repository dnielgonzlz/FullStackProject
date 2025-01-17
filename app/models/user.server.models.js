const crypto = require('crypto');
const Joi = require('joi');
const db = require('../../database');

// Generates password hash using PBKDF2 with provided salt
const getHash = function(password, salt) {
    return crypto.pbkdf2Sync(password, salt, 100000, 256, 'sha256').toString('hex');
};

// Creates a new user account with password hashing
const createUserInDB = (user, callback) => {
    // Verify email uniqueness before creating account
    const checkEmailSql = `SELECT COUNT(*) as count FROM users WHERE email = ?`;
    db.get(checkEmailSql, [user.email.trim().toLowerCase()], (err, row) => {
        if (err) {
            return callback({
                status: 500,
                error_message: 'Server error'
            });
        }

        if (row && row.count > 0) {
            return callback({
                status: 400,
                error_message: 'Email already exists'
            });
        }

        // Generate salt and hash password for security
        const salt = crypto.randomBytes(64);
        const hash = getHash(user.password, salt);

        // Insert new user with hashed credentials
        const sql = `INSERT INTO users (first_name, last_name, email, password, salt)
                     VALUES (?, ?, ?, ?, ?)`;
        const values = [
            user.first_name.trim(),
            user.last_name.trim(), 
            user.email.trim().toLowerCase(),
            hash,
            salt.toString('hex')
        ];

        db.run(sql, values, function(err) {
            if (err) {
                if (err.code === 'SQLITE_CONSTRAINT') {
                    return callback({
                        status: 400,
                        error_message: 'Email already exists'
                    });
                }
                return callback({
                    status: 500,
                    error_message: 'Server error'
                });
            }

            return callback(null, this.lastID);
        });
    });
};

// Authenticates user login and manages session tokens
const loginUserInDB = (credentials, callback) => {
    // Normalize email for case-insensitive comparison
    const normalizedEmail = credentials.email.trim().toLowerCase();
    
    // Retrieve user details for authentication
    const sql = `SELECT user_id, email, password, salt, first_name, last_name, session_token
                 FROM users 
                 WHERE email = ?`;

    db.get(sql, [normalizedEmail], (err, user) => {
        if (err) {
            return callback({
                status: 500,
                error_message: 'Server error'
            });
        }

        if (!user) {
            return callback({
                status: 400,
                error_message: 'Invalid email or password'
            });
        }

        try {
            // Verify password using stored salt
            const hashedPassword = getHash(
                credentials.password, 
                Buffer.from(user.salt, 'hex')
            );

            // Compare password hashes for authentication
            if (hashedPassword !== user.password) {
                return callback({
                    status: 400,
                    error_message: 'Invalid email or password'
                });
            }

            // Return existing session token if valid
            if (user.session_token) {
                return callback(null, {
                    status: 200,
                    user_id: user.user_id,
                    session_token: user.session_token
                });
            }

            // Generate new session token if none exists
            const sessionToken = crypto.randomBytes(16).toString('hex');

            // Store new session token
            const updateSql = `
                UPDATE users 
                SET session_token = ? 
                WHERE user_id = ?`;

            db.run(updateSql, [sessionToken, user.user_id], function(err) {
                if (err) {
                    return callback({
                        status: 500,
                        error_message: 'Server error'
                    });
                }

                return callback(null, {
                    status: 200,
                    user_id: user.user_id,
                    session_token: sessionToken
                });
            });
        } catch (error) {
            return callback({
                status: 500,
                error_message: 'Server error'
            });
        }
    });
};

// Handles user logout by clearing session token
const logoutUserInDB = (user_id, session_token, callback) => {
    // Verify session token validity
    const checkSessionSql = `
        SELECT user_id 
        FROM users 
        WHERE session_token = ?`;

    db.get(checkSessionSql, [session_token], (err, row) => {
        if (err) {
            return callback({
                status: 500,
                error_message: 'Database error while checking session'
            });
        }

        if (!row) {
            return callback({
                status: 401,
                error_message: 'Invalid session'
            });
        }

        // Clear session token for logout
        const logoutSql = `
            UPDATE users 
            SET session_token = NULL
            WHERE session_token = ?`;

        db.run(logoutSql, [session_token], function(err) {
            if (err) {
                return callback({
                    status: 500,
                    error_message: 'Failed to log out user'
                });
            }

            return callback(null, {
                status: 200,
                message: 'Successfully logged out'
            });
        });
    });
};

// Retrieves session token for a specific user
const getTokenFromDB = (user_id, done) => {
    const sql = `
        SELECT session_token 
        FROM users 
        WHERE user_id = ?`;

    db.get(sql, [user_id], (err, row) => {
        if (err) {
            return done({
                status: 500,
                error_message: 'Database error while retrieving token'
            });
        }

        if (!row || !row.session_token) {
            return done({
                status: 404, 
                error_message: 'Token not found'
            });
        }

        return done(null, {
            status: 200,
            session_token: row.session_token
        });
    });
};

// Updates or sets a new session token for a user
const setTokenInDB = (user_id, token, callback) => {
    const sql = `
        UPDATE users 
        SET session_token = ? 
        WHERE user_id = ?`;

    db.run(sql, [token, user_id], function(err) {
        if (err) {
            return callback({
                status: 500,
                error_message: 'Database error while setting token'
            });
        }

        if (this.changes === 0) {
            return callback({
                status: 404,
                error_message: 'User not found'
            });
        }

        return callback(null, {
            status: 200,
            message: 'Token set successfully', 
            session_token: token
        });
    });
};

// Invalidates a session token
const removeTokenFromDB = (token, callback) => {
    const sql = `
        UPDATE users 
        SET session_token = NULL 
        WHERE session_token = ?`;

    db.run(sql, [token], function(err) {
        if (err) {
            return callback({
                status: 500,
                error_message: 'Database error while removing token'
            });
        }

        if (this.changes === 0) {
            return callback({
                status: 404,
                error_message: 'Token not found'
            });
        }

        return callback(null, {
            status: 200,
            message: 'Token removed successfully'
        });
    });
};

// Retrieves user ID associated with a session token
const getIDFromTokenInDB = (token, callback) => {
    const sql = `
        SELECT user_id 
        FROM users 
        WHERE session_token = ?`;

    db.get(sql, [token], (err, row) => {
        if (err) {
            return callback({
                status: 500,
                error_message: 'Database error while retrieving user ID'
            });
        }

        if (!row) {
            return callback({
                status: 404,
                error_message: 'Token not found'
            });
        }

        return callback(null, {
            status: 200,
            user_id: row.user_id
        });
    });
};
 
module.exports = {
    createUserInDB,    
    loginUserInDB,     
    logoutUserInDB,    
    getTokenFromDB,    
    setTokenInDB,      
    removeTokenFromDB, 
    getIDFromTokenInDB 
};