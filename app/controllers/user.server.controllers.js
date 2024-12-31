const crypto = require('crypto');
const Joi = require('joi');
const users = require('../models/user.server.models');

const create_account = (req, res) => {
    console.log('🚀 CREATE: Starting user account creation');

    // Input validation schema with exact test requirements
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

    // Validate input
    const { error } = userSchema.validate(req.body, { abortEarly: true });
    if (error) {
        console.log('❌ CREATE: Validation failed:', error.message);
        return res.status(400).json({
            error_message: error.details[0].message
        });
    }

    console.log('✅ CREATE: Validation passed');
        
    // Proceed with user creation
    const user = {
        first_name: req.body.first_name,
        last_name: req.body.last_name,
        email: req.body.email,
        password: req.body.password
    };

    users.createUserInDB(user, (err, result) => {
        if (err) {
            console.error('❌ CREATE: Database error:', err);
            return res.status(err.status || 500).json({
                error_message: err.error_message || 'Server error'
            });
        }

        console.log('✅ CREATE: User created successfully');
        return res.status(201).json({
            user_id: result
        });
    });
};



const login = (req, res) => {
    console.log('🚀 LOGIN: Starting login process');

    // Input validation schema
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
    .unknown(false); // Disallow extra fields

    // Validate input
    const { error } = loginSchema.validate(req.body);
    if (error) {
        console.log('❌ LOGIN: Validation failed:', error.message);
        return res.status(400).json({
            error_message: error.details[0].message
        });
    }
    console.log('✅ LOGIN: Input validation passed');

    // Pass the credentials from request body to the model function
    users.loginUserInDB(req.body, (err, result) => {
        if (err) {
            console.log('❌ LOGIN: Authentication failed:', err);
            return res.status(err.status).json({
                error_message: err.error_message
            });
        }
        console.log('✅ LOGIN: User authenticated successfully, user_id:', result.user_id);

        // If authentication successful, check for existing token
        console.log('🔍 LOGIN: Checking for existing token');
        users.getTokenFromDB(result.user_id, (tokenErr, tokenResult) => {
            if (tokenErr && tokenErr.status !== 404) {
                console.log('❌ LOGIN: Error checking existing token:', tokenErr);
                return res.status(tokenErr.status).json({
                    error_message: tokenErr.error_message
                });
            }

            // If token exists, return it
            if (tokenResult && tokenResult.session_token) {
                console.log('✅ LOGIN: Existing token found and returned');
                return res.status(200).json({
                    user_id: result.user_id,
                    session_token: tokenResult.session_token
                });
            }
            console.log('ℹ️ LOGIN: No existing token found, creating new token');

            // If no token exists, create new one
            const newToken = crypto.randomBytes(16).toString('hex');
            console.log('🔑 LOGIN: Generated new token');

            users.setTokenInDB(result.user_id, newToken, (setTokenErr, setTokenResult) => {
                if (setTokenErr) {
                    console.log('❌ LOGIN: Error setting new token:', setTokenErr);
                    return res.status(setTokenErr.status).json({
                        error_message: setTokenErr.error_message
                    });
                }

                console.log('✅ LOGIN: New token set successfully');
                return res.status(200).json({
                    user_id: result.user_id,
                    session_token: newToken
                });
            });
        });
    });
};

const logout = (req, res) => {
    console.log('🚀 LOGOUT: Starting logout process');
    
    // Get token from authorization header
    const token = req.headers['x-authorization'];
    if (!token) {
        console.log('❌ LOGOUT: No token provided');
        return res.status(401).json({
            error_message: 'Unauthorized'
        });
    }

    // Get user_id from authenticate middleware
    const user_id = req.user_id;

    users.logoutUserInDB(user_id, token, (err, result) => {
        if (err) {
            console.log('❌ LOGOUT: Error during logout:', err);
            return res.status(err.status).json({
                error_message: err.error_message
            });
        }
        console.log('✅ LOGOUT: Successfully logged out user:', user_id);
        return res.status(200).json({
            message: 'User logged out successfully'
        });
    });
};



const getToken = (req, res) => {
    // Input validation schema
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

    // Validate input
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

const setToken = (req, res) => {
    // Input validation schema
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

    // Validate input
    const { error } = inputSchema.validate({ user_id: req.params.user_id });
    if (error) {
        return res.status(400).json({
            error_message: error.details[0].message
        });
    }

    // Create a random token
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


const removeToken = (req, res) => {
    // Input validation schema
    const inputSchema = Joi.object({
        token: Joi.string()
            .required()
            .messages({
                'string.base': 'Token must be a string',
                'any.required': 'Token is required'
            })
    });

    // Get token from authorization header
    const token = req.headers['x-authorization'];

    // Validate input
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


const getIDFromToken = (req, res) => {
    // Input validation schema
    const inputSchema = Joi.object({
        token: Joi.string()
            .required()
            .messages({
                'string.base': 'Token must be a string',
                'any.required': 'Token is required'
            })
    });

    // Get token from authorization header
    const token = req.headers['x-authorization'];

    // Validate input
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