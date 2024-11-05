const users = require('../controllers/question.server.controllers');

// TODO: Test POST Ask a Question About An Event POSTMAN
// TODO: Test DELETE Delete a Question POSTMAN
// TODO: Test POST Upvote a Question POSTMAN
// TODO: Test DELETE Downvote a Question POSTMAN

module.exports = function(app){
    app.route('/event/{event_id}/question')
        .post();
    
    app.route('/question/{question_id}')
        .delete();
    
    app.route('/question/{question_id}/vote')
        .post()
        .delete();
}