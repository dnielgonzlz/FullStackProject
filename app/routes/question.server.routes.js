const questions = require('../controllers/question.server.controllers');
const authenticate = require('../lib/authentication');

// NOTE: Implented Ask a Question Successfully
// NOTE: Implented Delete a Question Successfully
// NOTE: Implented Upvote a Question Successfully
// NOTE: Implented Downvote a Question Successfully

module.exports = function(app){
    app.route('/events/:event_id/question')
        .post(authenticate, questions.event_question);
    
    app.route('/question/:question_id')
        .delete(authenticate, questions.delete_question);
    
    app.route('/question/:question_id/vote')
        .post(authenticate, questions.upvote_question)
        .delete(authenticate, questions.downvote_question);
}