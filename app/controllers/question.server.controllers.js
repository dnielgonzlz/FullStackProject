// New question related to a particular event
const event_question = (req, res) => {
    return res.sendStatus(500);
}

// Deletes a question given an ID. Only creators and authors
// of questions can delete
const delete_question = (req, res) => {
    return res.sendStatus(500);
}

// Upvotes a question given an ID. You may upvote your own questions, 
// but you can not vote on the same question twice
const upvote_question = (req, res) => {
    return res.sendStatus(500);
}

// Downvotes a question given an ID. You may downvote your own questions, 
// but you can not vote on the same question twice
const downvote_question = (req, res) => {
    return res.sendStatus(500);
}

module.exports = {
    event_question: event_question,
    delete_question: delete_question,
    upvote_question: upvote_question,
    downvote_question: downvote_question
}