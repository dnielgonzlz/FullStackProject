const events = require('../controllers/event.server.controllers');
const authenticate = require('../lib/authentication');
const optionalAuthenticate = require('../lib/optionalAuth');

module.exports = function(app){
    app.route('/events')
        .post(authenticate, events.create_event);
    
    app.route('/event/:event_id')
        .get(optionalAuthenticate,events.get_event)
        .patch(authenticate, events.update_single_event)
        .post(authenticate, events.register_attendance_to_event)
        .delete(authenticate, events.delete_event);

    app.route('/search')
        .get(optionalAuthenticate, events.search_event);
}
