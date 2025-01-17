const crypto = require('crypto');
const Joi = require('joi');
const users = require('../models/user.server.models');

// Creates a new user account with validation
// Handles password requirements and duplicate email checks
const create_account = (req, res) => {
    // Validation schema for new user registration
    // Requires first name, last name, email, and strong password
    const userSchema = Joi.object({
        first_name: Joi.string()
            .required()
            .trim()
            .min(1)
            .pattern(/\S/)
            .messages({
                'string.empty': 'First name is required',
                'any.required': 'First name is required',
                'string.pattern.base': 'First name cannot be blank'
            }),

        last_name: Joi.string()
            .required()
            .trim()
            .min(1)
            .pattern(/\S/)
            .messages({
                'string.empty': 'Last name is required',
                'any.required': 'Last name is required',
                'string.pattern.base': 'Last name cannot be blank'
            }),

        email: Joi.string()
            .required()
            .trim()
            .email()
            .messages({
                'string.email': 'Invalid email address',
                'string.empty': 'Email is required',
                'any.required': 'Email is required'
            }),

        // Password must contain lowercase, uppercase, number, and special character
        password: Joi.string()
            .required()
            .min(8)
            .max(64)
            .pattern(/[a-z]/, 'lowercase')
            .pattern(/[A-Z]/, 'uppercase')
            .pattern(/[0-9]/, 'numbers')
            .pattern(/[^a-zA-Z0-9]/, 'special')
            .messages({
                'string.empty': 'Password is required',
                'any.required': 'Password is required',
                'string.min': 'Password must be at least 8 characters',
                'string.max': 'Password must not exceed 64 characters',
                'string.pattern.lowercase': 'Password must contain a lowercase letter',
                'string.pattern.uppercase': 'Password must contain an uppercase letter',
                'string.pattern.numbers': 'Password must contain a number',
                'string.pattern.special': 'Password must contain a special character'
            })
    })
    .required()
    .unknown(false)
    .messages({
        'object.unknown': 'Invalid property provided'
    });

    // Validate user input against schema
    const { error } = userSchema.validate(req.body, { abortEarly: true });
    if (error) {
        return res.status(400).json({
            error_message: error.details[0].message
        });
    }
        
    // Create user object and save to database
    const user = {
        first_name: req.body.first_name,
        last_name: req.body.last_name,
        email: req.body.email,
        password: req.body.password
    };

    users.createUserInDB(user, (err, result) => {
        if (err) {
            return res.status(err.status || 500).json({
                error_message: err.error_message || 'Server error'
            });
        }

        return res.status(201).json({
            user_id: result
        });
    });
};

// Authenticates user login and manages session tokens
// Creates new token if none exists, returns existing token if valid
const login = (req, res) => {
    // Validation schema for login credentials
    const loginSchema = Joi.object({
        email: Joi.string()
            .required()
            .trim()
            .email()
            .messages({
                'string.email': 'Please provide a valid email address',
                'string.empty': 'Email is required',
                'any.required': 'Email is required'
            }),
            
        password: Joi.string()
            .required()
            .messages({
                'string.empty': 'Password is required',
                'any.required': 'Password is required'
            })
    })
    .required()
    .unknown(false);

    // Validate login credentials
    const { error } = loginSchema.validate(req.body);
    if (error) {
        return res.status(400).json({
            error_message: error.details[0].message
        });
    }

    // Authenticate user and manage token
    users.loginUserInDB(req.body, (err, result) => {
        if (err) {
            return res.status(err.status).json({
                error_message: err.error_message
            });
        }

        // Check for existing valid token
        users.getTokenFromDB(result.user_id, (tokenErr, tokenResult) => {
            if (tokenErr && tokenErr.status !== 404) {
                return res.status(tokenErr.status).json({
                    error_message: tokenErr.error_message
                });
            }

            // Return existing token if valid
            if (tokenResult && tokenResult.session_token) {
                return res.status(200).json({
                    user_id: result.user_id,
                    session_token: tokenResult.session_token
                });
            }

            // Generate new token if none exists
            const newToken = crypto.randomBytes(16).toString('hex');

            users.setTokenInDB(result.user_id, newToken, (setTokenErr, setTokenResult) => {
                if (setTokenErr) {
                    return res.status(setTokenErr.status).json({
                        error_message: setTokenErr.error_message
                    });
                }

                return res.status(200).json({
                    user_id: result.user_id,
                    session_token: newToken
                });
            });
        });
    });
};

// Handles user logout by invalidating their session token
const logout = (req, res) => {
    const token = req.headers['x-authorization'];
    if (!token) {
        return res.status(401).json({
            error_message: 'Unauthorized'
        });
    }

    const user_id = req.user_id;

    users.logoutUserInDB(user_id, token, (err, result) => {
        if (err) {
            return res.status(err.status).json({
                error_message: err.error_message
            });
        }
        return res.status(200).json({
            message: 'User logged out successfully'
        });
    });
};

// Retrieves existing session token for a user
const getToken = (req, res) => {
    // Validate user ID format
    const inputSchema = Joi.object({
        user_id: Joi.number()
            .integer()
            .required()
            .positive()
            .messages({
                'number.base': 'User ID must be a number',
                'number.integer': 'User ID must be an integer',
                'any.required': 'User ID is required'
            })
    });

    const { error } = inputSchema.validate({ user_id: req.params.user_id });
    if (error) {
        return res.status(400).json({
            error_message: error.details[0].message
        });
    }

    getTokenFromDB(parseInt(req.params.user_id), (err, result) => {
        if (err) {
            return res.status(err.status).json({
                error_message: err.error_message
            });
        }
        return res.status(200).json({
            session_token: result.session_token
        });
    });
};

// Creates new session token for a user
const setToken = (req, res) => {
    // Validate user ID format
    const inputSchema = Joi.object({
        user_id: Joi.number()
            .integer()
            .required()
            .positive()
            .messages({
                'number.base': 'User ID must be a number',
                'number.integer': 'User ID must be an integer',
                'any.required': 'User ID is required'
            })
    });

    const { error } = inputSchema.validate({ user_id: req.params.user_id });
    if (error) {
        return res.status(400).json({
            error_message: error.details[0].message
        });
    }

    // Generate new random token
    const token = crypto.randomBytes(64).toString('hex');
    
    users.setTokenInDB(parseInt(req.params.user_id), token, (err, result) => {
        if (err) {
            return res.status(err.status).json({
                error_message: err.error_message
            });
        }
        return res.status(200).json({
            session_token: result.session_token
        });
    });
};

// Invalidates a specific session token
const removeToken = (req, res) => {
    // Validate token format
    const inputSchema = Joi.object({
        token: Joi.string()
            .required()
            .messages({
                'string.base': 'Token must be a string',
                'any.required': 'Token is required'
            })
    });

    const token = req.headers['x-authorization'];

    const { error } = inputSchema.validate({ token });
    if (error) {
        return res.status(400).json({
            error_message: error.details[0].message
        });
    }

    removeTokenFromDB(token, (err, result) => {
        if (err) {
            return res.status(err.status).json({
                error_message: err.error_message
            });
        }
        return res.status(200).json({
            message: 'Token removed successfully'
        });
    });
};

// Retrieves user ID associated with a session token
const getIDFromToken = (req, res) => {
    // Validate token format
    const inputSchema = Joi.object({
        token: Joi.string()
            .required()
            .messages({
                'string.base': 'Token must be a string',
                'any.required': 'Token is required'
            })
    });

    const token = req.headers['x-authorization'];

    const { error } = inputSchema.validate({ token });
    if (error) {
        return res.status(400).json({
            error_message: error.details[0].message
        });
    }

    users.getIDFromTokenInDB(token, (err, result) => {
        if (err) {
            return res.status(err.status).json({
                error_message: err.error_message
            });
        }
        return res.status(200).json({
            user_id: result.user_id
        });
    });
};

module.exports = {
    create_account,
    login,
    logout,
    getToken,
    setToken,
    removeToken,
    getIDFromToken
};