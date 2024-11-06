const events = require('../controllers/event.server.controllers');
const authenticate = require('../lib/authentication');

// NOTE: Create New Event has been successfully implemented
// TODO: Test GET Get a Single Event Details POSTMAN
// TODO: Test PATCH Update Event POSTMAN
// TODO: Test POST Register to Attend An Event POSTMAN
// TODO: Test DELETE Delete Event POSTMAN
// TODO: Test GET Search An Event POSTMAN

module.exports = function(app){
    app.route('/events')
        .post(authenticate, events.create_event);
    
    app.route('/event/{event_id}:')
        .get()
        .patch()
        .post()
        .delete();

    app.route('/search')
        .get();
}