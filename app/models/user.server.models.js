const crypto = require('crypto');
const Joi = require('joi');
const db = require('../../database');

// Hash function 
const getHash = function(password, salt) {
    return crypto.pbkdf2Sync(password, salt, 100000, 256, 'sha256').toString('hex');
};

const createUserInDB = (user, callback) => {
    // Create salt and hash password 
    const salt = crypto.randomBytes(64);
    const hash = getHash(user.password, salt);

    const sql = `INSERT INTO users (first_name, last_name, email, password, salt)
                 VALUES (?, ?, ?, ?, ?)`;
    const values = [
        user.first_name,
        user.last_name,
        user.email,
        hash,
        salt.toString('hex')
    ];
    
    db.run(sql, values, function(err) {
        if (err) {
            console.error('Error inserting user into database:', err); // Add logging
            return callback(err);
        }
        return callback(null, this.lastID);
    });
};



const loginUserInDB = (credentials, callback) => {
    console.log('🔍 DB: Starting user lookup for email:', credentials.email);
    
    const sql = `SELECT user_id, email, password, salt, first_name, last_name 
                 FROM users 
                 WHERE email = ?`;

    db.get(sql, [credentials.email], (err, user) => {
        if (err) {
            console.error('❌ DB: Error during user lookup:', err);
            return callback({
                status: 500,
                error_message: 'Database error during login'
            });
        }

        if (!user) {
            console.log('❌ DB: No user found with email:', credentials.email);
            return callback({
                status: 400,
                error_message: 'Invalid email or password'
            });
        }

        console.log('✅ DB: User found, verifying password');

        // Hash the provided password with stored salt
        const hashedPassword = getHash(
            credentials.password, 
            Buffer.from(user.salt, 'hex')
        );

        // Compare password hashes
        if (hashedPassword !== user.password) {
            console.log('❌ DB: Password mismatch');
            return callback({
                status: 400,
                error_message: 'Invalid email or password'
            });
        }

        console.log('✅ DB: Password verified successfully');

        // Generate session token
        const sessionToken = crypto.randomBytes(16).toString('hex');
        console.log('✅ DB: Generated new session token');

        // Update session token only
        const updateSql = `
            UPDATE users 
            SET session_token = ? 
            WHERE user_id = ?`;
        
        console.log('🔄 DB: Attempting to update user:', {
            user_id: user.user_id,
            tokenLength: sessionToken.length
        });

        // Log the actual SQL and parameters being used
        console.log('SQL:', updateSql);
        console.log('Parameters:', [sessionToken, user.user_id]);

        db.run(updateSql, [sessionToken, user.user_id], function(err) {
            if (err) {
                console.error('❌ DB: Error updating session token:', err);
                return callback({
                    status: 500,
                    error_message: 'Failed to update login information'
                });
            }

            if (this.changes === 0) {
                console.error('❌ DB: No rows updated during login update');
                return callback({
                    status: 500,
                    error_message: 'Failed to update user login status'
                });
            }

            console.log('✅ DB: Successfully updated session token');
            // Return success with user info and session token
            return callback(null, {
                status: 200,
                user_id: user.user_id,
                session_token: sessionToken
            });
        });
    });
};

// In user.server.models.js
const logoutUserInDB = (user_id, session_token, callback) => {
    console.log('🔍 DB: Starting logout process for user:', user_id);

    // First verify that the session token matches
    const checkSessionSql = `
        SELECT 1 
        FROM users 
        WHERE user_id = ? 
        AND session_token = ?`;

    db.get(checkSessionSql, [user_id, session_token], (err, validSession) => {
        if (err) {
            console.error('❌ DB: Error checking session:', err);
            return callback({
                status: 500,
                error_message: 'Database error while checking session'
            });
        }

        if (!validSession) {
            console.log('❌ DB: Invalid session for user:', user_id);
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
            WHERE user_id = ? 
            AND session_token = ?`;

        db.run(logoutSql, [user_id, session_token], function(err) {
            if (err) {
                console.error('❌ DB: Error during logout:', err);
                return callback({
                    status: 500,
                    error_message: 'Failed to log out user'
                });
            }

            if (this.changes === 0) {
                console.log('❌ DB: No rows updated during logout');
                return callback({
                    status: 401,
                    error_message: 'Logout failed'
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
    // SQL query to get the session token
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
 
 // User Authentication Module
module.exports = {
    createUserInDB,    // Create new user account
    loginUserInDB,     // Log in existing user
    logoutUserInDB,     // Log out user and invalidate session
    getTokenFromDB,    // Get session token from user ID
    setTokenInDB,      // Set session token for user ID
    removeTokenFromDB, // Remove session token from user ID
    getIDFromTokenInDB // Get user ID from session token
};