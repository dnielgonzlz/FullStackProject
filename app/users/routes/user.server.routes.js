const users = require('../controllers/user.server.controllers');

module.exports = function(app){
    app.route('/users')
        .post();
    
    app.route('/login')
        .post();

    app.route('/logout')
        .post();
}