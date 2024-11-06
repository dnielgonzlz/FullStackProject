const crypto = require('crypto');
const Joi = require('joi');
const users = require('../models/user.server.models');

const create_account = (req, res) => {
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
    const { error } = userSchema.validate(req.body);
    if (error) {
        return res.status(400).json({
            error_message: error.details[0].message
        });
    }

    const user = {
        first_name: req.body.first_name,
        last_name: req.body.last_name,
        email: req.body.email,
        password: req.body.password
    };

    users.createUserInDB(user, (err, id) => {
        if (err) {
            console.error('Error creating user:', err);
            return res.status(500).json({ error: "Internal server error" });
        }
        return res.status(201).json({ user_id: id });
    });

};

const login = (req, res) => {
    console.log('🚀 LOGIN: Starting login process');
    console.log('📝 LOGIN: Received credentials:', { email: req.body.email, passwordLength: req.body?.password?.length });

    // Input validation schema
    const loginSchema = Joi.object({
        email: Joi.string()
            .required()
            .trim()
            .email()
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
    const { error } = loginSchema.validate(req.body);
    if (error) {
        console.log('❌ LOGIN: Validation failed:', error.details[0].message);
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

        // 3. If authentication successful, check for existing token
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

            // 4. If no token exists, create new one
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

    setTokenInDB(parseInt(req.params.user_id), token, (err, result) => {
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

    getIDFromTokenInDB(token, (err, result) => {
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
    create_account: create_account,
    login: login,
    logout: logout,
    getToken: getToken,
    setToken: setToken,
    removeToken: removeToken,
    getIDFromToken: getIDFromToken
};