const users = require('../controllers/question.server.controllers');

module.exports = function(app){
    app.route('/event/{event_id}/question')
        .post();
    
    app.route('/question/{question_id}')
        .delete();
    
    app.route('/question/{question_id}/vote')
        .post()
        .delete();
}