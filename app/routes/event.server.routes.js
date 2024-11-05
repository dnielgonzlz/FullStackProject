const users = require('../controllers/event.server.controllers');

// TODO: Test POST Create New Event POSTMAN
// TODO: Test GET Get a Single Event Details POSTMAN
// TODO: Test PATCH Update Event POSTMAN
// TODO: Test POST Register to Attend An Event POSTMAN
// TODO: Test DELETE Delete Event POSTMAN
// TODO: Test GET Search An Event POSTMAN

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