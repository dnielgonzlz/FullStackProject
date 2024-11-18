// This file contains the middleware function that checks if the user is authenticated.

const users = require('../models/user.server.models');

const authenticate = (req, res, next) => {

    const token = req.headers['x-authorization'];
    if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    users.getIDFromTokenInDB(token, (err, result) => {
        if (err || !result) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        req.user_id = result.user_id;
        next();
    });
};

module.exports = authenticate;