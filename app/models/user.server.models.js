//TODO: I need to build here the queries for SQLite for each of the operations
//TODO: Create an account for a new user
//TODO: Log in into an account
//TODO: Log out out of an account

const crypto = require('crypto');
const Joi = require('joi');

// Hash function 
const getHash = function(password, salt) {
    return crypto.pbkdf2Sync(password, salt, 100000, 256, 'sha256').toString('hex');
};

const createUser = (user, done) => {
    // Input validation schema
    const userSchema = Joi.object({
        first_name: Joi.string()
            .required()
            .trim()
            .messages({
                'string.empty': 'First name is required'
            }),

        last_name: Joi.string()
            .required()
            .trim()
            .messages({
                'string.empty': 'Last name is required'
            }),

        email: Joi.string()
            .required()
            .trim()
            .email()
            .pattern(/.*@.*\.ac\.uk$/)
            .messages({
                'string.email': 'Please provide a valid email address',
                'string.empty': 'Email is required'
            }),

        password: Joi.string()
            .required()
            .messages({
                'string.empty': 'Password is required'
            })
    });

    // Validate input
    const { error } = userSchema.validate(user);
    if (error) {
        return done({
            status: 400,
            error_message: error.details[0].message
        });
    }

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
            return done({
                status: 500,
                error_message: 'Failed to create user account'
            });
        }
        return done(null, { 
            status: 201,
            user_id: this.lastID 
        });
    });
};



const loginUser = (credentials, done) => {
    // Input validation schema
    const loginSchema = Joi.object({
        email: Joi.string()
            .required()
            .trim()
            .email()
            .pattern(/.*@.*\.ac\.uk$/)
            .messages({
                'string.email': 'Please provide a valid email address',
                'string.empty': 'Email is required'
            }),
            
        password: Joi.string()
            .required()
            .messages({
                'string.empty': 'Password is required'
            })
    });

    // Validate input
    const { error } = loginSchema.validate(credentials);
    if (error) {
        return done({
            status: 400,
            error_message: error.details[0].message
        });
    }

    const sql = `SELECT user_id, email, password, salt, first_name, last_name 
                 FROM users 
                 WHERE email = ?`;

    db.get(sql, [credentials.email], (err, user) => {
        if (err) {
            return done({
                status: 500,
                error_message: 'Database error during login'
            });
        }

        if (!user) {
            return done({
                status: 400,
                error_message: 'Invalid email or password'
            });
        }

        // Hash the provided password with stored salt
        const hashedPassword = getHash(
            credentials.password, 
            Buffer.from(user.salt, 'hex')
        );

        // Compare password hashes
        if (hashedPassword !== user.password) {
            return done({
                status: 400,
                error_message: 'Invalid email or password'
            });
        }

        // Generate session token
        const sessionToken = crypto.randomBytes(16).toString('hex');

        // Update last login time and session token
        const updateSql = `
            UPDATE users 
            SET last_login = ?, 
                session_token = ? 
            WHERE user_id = ?`;

        db.run(updateSql, [Date.now(), sessionToken, user.user_id], (err) => {
            if (err) {
                return done({
                    status: 500,
                    error_message: 'Failed to update login information'
                });
            }

            // Return success with user info and session token
            return done(null, {
                status: 200,
                user_id: user.user_id,
                session_token: sessionToken
            });
        });
    });
};

const logoutUser = (user_id, session_token, done) => {
    // Input validation schema
    const logoutSchema = Joi.object({
        user_id: Joi.number()
            .integer()
            .required()
            .positive()
            .messages({
                'number.base': 'User ID must be a number',
                'number.integer': 'User ID must be an integer',
                'any.required': 'User ID is required'
            }),
        session_token: Joi.string()
            .required()
            .hex()
            .length(32) // Since we're using randomBytes(16).toString('hex')
            .messages({
                'string.empty': 'Session token is required',
                'string.hex': 'Invalid session token format',
                'string.length': 'Invalid session token length'
            })
    });

    // Validate input
    const { error } = logoutSchema.validate({ user_id, session_token });
    if (error) {
        return done({
            status: 400,
            error_message: error.details[0].message
        });
    }

    // First verify that the session token matches
    const checkSessionSql = `
        SELECT 1 
        FROM users 
        WHERE user_id = ? 
        AND session_token = ?`;

    db.get(checkSessionSql, [user_id, session_token], (err, validSession) => {
        if (err) {
            return done({
                status: 500,
                error_message: 'Database error while checking session'
            });
        }

        if (!validSession) {
            return done({
                status: 401,
                error_message: 'Invalid session'
            });
        }

        // Clear the session token
        const logoutSql = `
            UPDATE users 
            SET session_token = NULL,
                last_logout = ?
            WHERE user_id = ? 
            AND session_token = ?`;

        db.run(logoutSql, [Date.now(), user_id, session_token], function(err) {
            if (err) {
                return done({
                    status: 500,
                    error_message: 'Failed to log out user'
                });
            }

            if (this.changes === 0) {
                return done({
                    status: 401,
                    error_message: 'Logout failed'
                });
            }

            return done(null, {
                status: 200,
                message: 'Successfully logged out'
            });
        });
    });
};

/**
* User Authentication Module
* @module authentication
*/

/**
* @typedef {Object} User
* @property {number} user_id - Unique identifier for the user
* @property {string} first_name - User's first name
* @property {string} last_name - User's last name
* @property {string} email - User's email address
* @property {string} password - User's password (will be hashed)
*/

/**
* @typedef {Object} LoginCredentials
* @property {string} email - User's email address
* @property {string} password - User's password
*/

/**
* Hash password with salt using PBKDF2
* @private
* @param {string} password - The password to hash
* @param {Buffer} salt - The salt for hashing
* @returns {string} - The hashed password as hex string
*/
 
 module.exports = {
    /** 
     * Create a new user account
     * @function createUser
     * @param {User} user - User data for account creation
     * @param {function} done - Callback function
     * @returns {Object} - Contains user_id if successful
     * @throws {Error} - If email already exists or validation fails
     */
    createUser,
 
    /** 
     * Log in an existing user
     * @function loginUser
     * @param {LoginCredentials} credentials - Login credentials
     * @param {function} done - Callback function
     * @returns {Object} - Contains user_id and session_token if successful
     * @throws {Error} - If credentials are invalid
     */
    loginUser,
 
    /** 
     * Log out a user
     * @function logoutUser
     * @param {number} user_id - ID of user to log out
     * @param {string} session_token - Current session token
     * @param {function} done - Callback function
     * @returns {Object} - Status message
     * @throws {Error} - If session is invalid or user is not found
     */
    logoutUser
 };
 
 // User Authentication Module
module.exports = {
    createUser,    // Create new user account
    loginUser,     // Log in existing user
    logoutUser     // Log out user and invalidate session
};