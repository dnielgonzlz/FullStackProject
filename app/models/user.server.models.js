const crypto = require('crypto');
const Joi = require('joi');
const db = require('../../database');

// Hash function 
const getHash = function(password, salt) {
    return crypto.pbkdf2Sync(password, salt, 100000, 256, 'sha256').toString('hex');
};

const createUserInDB = (user, callback) => {
    console.log('🔍 DB: Starting user creation process');

    // First check if email exists
    const checkEmailSql = `SELECT COUNT(*) as count FROM users WHERE email = ?`;
    db.get(checkEmailSql, [user.email.trim().toLowerCase()], (err, row) => {
        if (err) {
            console.error('❌ DB: Error checking email:', err);
            return callback({
                status: 500,
                error_message: 'Server error'
            });
        }

        if (row && row.count > 0) {
            console.log('❌ DB: Email already exists');
            return callback({
                status: 400,
                error_message: 'Email already exists'
            });
        }

        // Create salt and hash password 
        const salt = crypto.randomBytes(64);
        const hash = getHash(user.password, salt);

        const sql = `INSERT INTO users (first_name, last_name, email, password, salt)
                     VALUES (?, ?, ?, ?, ?)`;
        const values = [
            user.first_name.trim(),
            user.last_name.trim(),
            user.email.trim().toLowerCase(),
            hash,
            salt.toString('hex')
        ];
        
        console.log('📝 DB: Executing insert query');
        db.run(sql, values, function(err) {
            if (err) {
                console.error('❌ DB: Error inserting user:', err);
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

            console.log('✅ DB: User created with ID:', this.lastID);
            return callback(null, this.lastID);
        });
    });
};

const loginUserInDB = (credentials, callback) => {
    console.log('🔍 DB: Starting user lookup for email:', credentials.email);
    
    // Normalize email for comparison
    const normalizedEmail = credentials.email.trim().toLowerCase();
    
    const sql = `SELECT user_id, email, password, salt, first_name, last_name, session_token
                 FROM users 
                 WHERE email = ?`;

    db.get(sql, [normalizedEmail], (err, user) => {
        if (err) {
            console.error('❌ DB: Error during user lookup:', err);
            return callback({
                status: 500,
                error_message: 'Server error'
            });
        }

        if (!user) {
            console.log('❌ DB: No user found with email:', normalizedEmail);
            return callback({
                status: 400,
                error_message: 'Invalid email or password'
            });
        }

        console.log('✅ DB: User found, verifying password');

        try {
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

            // If user already has a session token, return it
            if (user.session_token) {
                console.log('✅ DB: Returning existing session token');
                return callback(null, {
                    status: 200,
                    user_id: user.user_id,
                    session_token: user.session_token
                });
            }

            // Generate session token only if one doesn't exist
            const sessionToken = crypto.randomBytes(16).toString('hex');
            console.log('✅ DB: Generated new session token');

            // Update session token
            const updateSql = `
                UPDATE users 
                SET session_token = ? 
                WHERE user_id = ?`;

            db.run(updateSql, [sessionToken, user.user_id], function(err) {
                if (err) {
                    console.error('❌ DB: Error updating session token:', err);
                    return callback({
                        status: 500,
                        error_message: 'Server error'
                    });
                }

                console.log('✅ DB: Successfully updated session token');
                return callback(null, {
                    status: 200,
                    user_id: user.user_id,
                    session_token: sessionToken
                });
            });
        } catch (error) {
            console.error('❌ DB: Error during password verification:', error);
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