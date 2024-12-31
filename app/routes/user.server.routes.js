const users = require('../controllers/user.server.controllers');
const authenticate = require('../lib/authentication');

module.exports = function(app){
    app.route('/users')
        .post(users.create_account);
    
    app.route('/login')
        .post(users.login);

    app.route('/logout')
        .post(authenticate, users.logout);
}