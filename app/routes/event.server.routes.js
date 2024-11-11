const events = require('../controllers/event.server.controllers');
const authenticate = require('../lib/authentication');

// NOTE: Create New Event has been successfully implemented
// NOTE: Get All Events has been successfully implemented
// NOTE: Update an Eventhas been successfully implemented
// NOTE: Register to Attend been successfully implemented
// NOTE: Delete Event has been successfully implemented
// NOTE: Search Event has been successfully implemented

module.exports = function(app){
    app.route('/events')
        .post(authenticate, events.create_event);
    
    app.route('/events/:event_id')
        .get(authenticate, events.get_event)
        .patch(authenticate, events.update_single_event)
        .post(authenticate, events.register_attendance_to_event)
        .delete(authenticate, events.delete_event);

    app.route('/search')
        .get(authenticate, events.search_event);
}