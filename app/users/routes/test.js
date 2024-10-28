// We don't implement the routes here, we pass them off to functions in the 
// controller (pulled in lon line one)

// This way, other developers can quickly see what routes exist and wherethey are implemented
// Import the routes into the index.js file

// Not sure if this is written ok, refer to powerpoint presentation
const events = require('./controllers/events');
require('.')

module.exports = function(app){
    app.route('events')
        .get(events.getEvents)
        .post(events.addEvent);

    app.route('/events/:events:id')
        .get(events.getEvent)
        .put(events.updateEvent)
        .delete(events.deleteEvent);
}