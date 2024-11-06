const events = require('../controllers/event.server.controllers');
const authenticate = require('../lib/authentication');

// NOTE: Create New Event has been successfully implemented
// NOTE: Get All Events has been successfully implemented
// TODO: Test PATCH Update Event POSTMAN
// TODO: Test POST Register to Attend An Event POSTMAN
// TODO: Test DELETE Delete Event POSTMAN
// TODO: Test GET Search An Event POSTMAN

module.exports = function(app){
    app.route('/events')
        .post(authenticate, events.create_event);
    
    app.route('/events/:event_id')
        .get(authenticate, events.get_event)
        .patch()
        .post()
        .delete();

    app.route('/search')
        .get();
}