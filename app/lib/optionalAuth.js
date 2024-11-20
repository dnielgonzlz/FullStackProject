const users = require('../models/user.server.models');

const optionalAuthenticate = (req, res, next) => {
    const token = req.headers['x-authorization'];
    
    if (!token) {
        next();
        return;
    }

    users.getIDFromTokenInDB(token, (err, result) => {
        if (err || !result) {
            // Don't return error, just continue without auth
            next();
        } else {
            req.user_id = result.user_id;
            next();
        }
    });
};

module.exports = optionalAuthenticate;