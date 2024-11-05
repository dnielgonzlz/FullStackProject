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
        return done({
            status: 400,
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
            console.error('Error creating user:', err); // Add logging
            return res.status(500).json({ error: "Internal server error" });
        }
        return res.status(201).json({ user_id: id });
    });

    // Create salt and hash password 
    // const salt = crypto.randomBytes(64);
    // const hash = getHash(user.password, salt);

    // createUserInDB(user, hash, salt, (err, result) => {
    //     if (err) {
    //         return res.status(err.status).json({
    //             error_message: err.error_message
    //         });
    //     }
    //     return res.status(result.status).json({
    //         user_id: result.user_id
    //     });
    // });
};

const login = (credentials, done) => {
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
    const { error } = loginSchema.validate(credentials);
    if (error) {
        return done({
            status: 400,
            error_message: error.details[0].message
        });
    }

    loginUserInDB(credentials, done);
};

const logout = (user_id, session_token, done) => {
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

    logoutUserInDB(user_id, session_token, done);
};

const getToken = (user_id, done) => {
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
    const { error } = inputSchema.validate({ user_id });
    if (error) {
        return done({
            status: 400,
            error_message: error.details[0].message
        });
    }

    getTokenFromDB(user_id, done);
};

const setToken = (user_id, done) => {
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
    const { error } = inputSchema.validate({ user_id });
    if (error) {
        return done({
            status: 400,
            error_message: error.details[0].message
        });
    }

    // Create a random token
    const token = crypto.randomBytes(64).toString('hex');

    setTokenInDB(user_id, token, done);
};

const removeToken = (token, done) => {
    // Input validation schema
    const inputSchema = Joi.object({
        token: Joi.string()
            .required()
            .messages({
                'string.base': 'Token must be a string',
                'any.required': 'Token is required'
            })
    });

    // Validate input
    const { error } = inputSchema.validate({ token });
    if (error) {
        return done({
            status: 400,
            error_message: error.details[0].message
        });
    }

    removeTokenFromDB(token, done);
};

const getIDFromToken = (token, done) => {
    // Input validation schema
    const inputSchema = Joi.object({
        token: Joi.string()
            .required()
            .messages({
                'string.base': 'Token must be a string',
                'any.required': 'Token is required'
            })
    });

    // Validate input
    const { error } = inputSchema.validate({ token });
    if (error) {
        return done({
            status: 400,
            error_message: error.details[0].message
        });
    }

    getIDFromTokenInDB(token, done);
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