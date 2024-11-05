const users = require('../controllers/user.server.controllers');

//NOTE: Account creationg has been successfully implemented
// TODO: Test POST User Login POSTMAN
// TODO: Test POST User Logout POSTMAN

module.exports = function(app){
    app.route('/user')
        .post(users.create_account);
    
    app.route('/login')
        .post();

    app.route('/logout')
        .post();
}