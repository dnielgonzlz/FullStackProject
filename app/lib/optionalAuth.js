const users = require('../models/user.server.models');

const optionalAuthenticate = (req, res, next) => {
    const token = req.headers['x-authorization'];
    
    if (!token) {
        req.user_id = null;
        next();
        return;
    }

    users.getIDFromTokenInDB(token, (err, result) => {
        if (err || !result) {
            req.user_id = null;
            next();
        } else {
            req.user_id = result.user_id;
            next();
        }
    });
};

module.exports = optionalAuthenticate;