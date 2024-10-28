const users = require('../controllers/event.server.controllers');


module.exports = function(app){
    app.route('/events')
        .post();
    
    app.route('/event/{event_id}:')
        .get()
        .patch()
        .post()
        .delete();

    app.route('/search')
        .get();
}