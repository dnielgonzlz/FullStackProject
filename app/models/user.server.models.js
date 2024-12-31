const crypto = require('crypto');
const Joi = require('joi');
const db = require('../../database');

// Hash function 
const getHash = function(password, salt) {
    return crypto.pbkdf2Sync(password, salt, 100000, 256, 'sha256').toString('hex');
};

const createUserInDB = (user, callback) => {
    // Check if email exists first
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

        // Create salt and hash password
        const salt = crypto.randomBytes(64);
        const hash = getHash(user.password, salt);

        // Insert the new user
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

const loginUserInDB = (credentials, callback) => {
    // Normalize email for comparison
    const normalizedEmail = credentials.email.trim().toLowerCase();
    
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
            // Hash the provided password with stored salt
            const hashedPassword = getHash(
                credentials.password, 
                Buffer.from(user.salt, 'hex')
            );

            // Compare password hashes
            if (hashedPassword !== user.password) {
                return callback({
                    status: 400,
                    error_message: 'Invalid email or password'
                });
            }

            // If user already has a session token, return it
            if (user.session_token) {
                return callback(null, {
                    status: 200,
                    user_id: user.user_id,
                    session_token: user.session_token
                });
            }

            // Generate session token only if one doesn't exist
            const sessionToken = crypto.randomBytes(16).toString('hex');

            // Update session token
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


const logoutUserInDB = (user_id, session_token, callback) => {
    console.log('🔍 DB: Starting logout process for user:', user_id);

    // First verify that the session token exists in the database
    const checkSessionSql = `
        SELECT user_id 
        FROM users 
        WHERE session_token = ?`;

    db.get(checkSessionSql, [session_token], (err, row) => {
        if (err) {
            console.error('❌ DB: Error checking session:', err);
            return callback({
                status: 500,
                error_message: 'Database error while checking session'
            });
        }

        if (!row) {
            console.log('❌ DB: Invalid session token');
            return callback({
                status: 401,
                error_message: 'Invalid session'
            });
        }

        console.log('✅ DB: Session verified, proceeding with logout');

        // Clear the session token
        const logoutSql = `
            UPDATE users 
            SET session_token = NULL
            WHERE session_token = ?`;

        db.run(logoutSql, [session_token], function(err) {
            if (err) {
                console.error('❌ DB: Error during logout:', err);
                return callback({
                    status: 500,
                    error_message: 'Failed to log out user'
                });
            }

            console.log('✅ DB: Successfully logged out user:', user_id);
            return callback(null, {
                status: 200,
                message: 'Successfully logged out'
            });
        });
    });
};

const getTokenFromDB = (user_id, done) => {
    // Get session token for user
    const sql = `
        SELECT session_token 
        FROM users 
        WHERE user_id = ?`;

    db.get(sql, [user_id], (err, row) => {
        // Handle database errors
        if (err) {
            return done({
                status: 500,
                error_message: 'Database error while retrieving token'
            });
        }

        // Return 404 if no token found
        if (!row || !row.session_token) {
            return done({
                status: 404, 
                error_message: 'Token not found'
            });
        }

        // Return token if found
        return done(null, {
            status: 200,
            session_token: row.session_token
        });
    });
};

const setTokenInDB = (user_id, token, callback) => {
    // SQL query to update user's session token
    const sql = `
        UPDATE users 
        SET session_token = ? 
        WHERE user_id = ?`;

    // Run the update query
    db.run(sql, [token, user_id], function(err) {
        // Check for database errors
        if (err) {
            return callback({
                status: 500,
                error_message: 'Database error while setting token'
            });
        }

        // Check if user exists
        if (this.changes === 0) {
            return callback({
                status: 404,
                error_message: 'User not found'
            });
        }

        // Return success response
        return callback(null, {
            status: 200,
            message: 'Token set successfully', 
            session_token: token
        });
    });
};

const removeTokenFromDB = (token, callback) => {
    // SQL query to remove session token
    const sql = `
        UPDATE users 
        SET session_token = NULL 
        WHERE session_token = ?`;

    // Execute query to remove token
    db.run(sql, [token], function(err) {
        // Handle database errors
        if (err) {
            return callback({
                status: 500,
                error_message: 'Database error while removing token'
            });
        }

        // Check if token existed
        if (this.changes === 0) {
            return callback({
                status: 404,
                error_message: 'Token not found'
            });
        }

        // Return success
        return callback(null, {
            status: 200,
            message: 'Token removed successfully'
        });
    });
};

const getIDFromTokenInDB = (token, callback) => {
    // Query to get user ID from session token
    const sql = `
        SELECT user_id 
        FROM users 
        WHERE session_token = ?`;

    // Execute database query
    db.get(sql, [token], (err, row) => {
        // Handle any database errors
        if (err) {
            return callback({
                status: 500,
                error_message: 'Database error while retrieving user ID'
            });
        }

        // Return error if token not found
        if (!row) {
            return callback({
                status: 404,
                error_message: 'Token not found'
            });
        }

        // Return user ID if found
        return callback(null, {
            status: 200,
            user_id: row.user_id
        });
    });
};
 
 // User Authentication Module
module.exports = {
    createUserInDB,    
    loginUserInDB,     
    logoutUserInDB,    
    getTokenFromDB,    
    setTokenInDB,      
    removeTokenFromDB, 
    getIDFromTokenInDB 
};