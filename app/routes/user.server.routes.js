const users = require('../controllers/user.server.controllers');
const authenticate = require('../lib/authentication');
// NOTE: Account creationg has been successfully implemented
// NOTE: User Login has been successfully implemented
// TODO: Test POST User Logout POSTMAN

module.exports = function(app){
    app.route('/user')
        .post(users.create_account);
    
    app.route('/login')
        .post(users.login);

    app.route('/logout')
        .post();
}