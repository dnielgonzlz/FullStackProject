const Joi = require('joi');


// New question related to a particular event
const event_question = (event_id, user_id, questionData, done) => {
    // Input validation schemas
    const inputSchema = Joi.object({
        event_id: Joi.number()
            .integer()
            .required()
            .positive()
            .messages({
                'number.base': 'Event ID must be a number',
                'number.integer': 'Event ID must be an integer',
                'any.required': 'Event ID is required'
            }),
        question: Joi.string()
            .required()
            .min(5)
            .max(500)
            .trim()
            .messages({
                'string.empty': 'Question cannot be empty',
                'string.min': 'Question must be at least 5 characters long',
                'string.max': 'Question cannot exceed 500 characters'
            })
    });

    // Validate input
    const { error, value } = inputSchema.validate({
        event_id: event_id,
        question: questionData.question
    });

    if (error) {
        return done({
            status: 400,
            error_message: error.details[0].message
        });
    }

    askQuestionInDB(event_id, user_id, value.question, done);
};

// Deletes a question given an ID. Only creators and authors
// of questions can delete
const delete_question = (question_id, user_id, done) => {
    // Input validation schema
    const inputSchema = Joi.object({
        question_id: Joi.number()
            .integer()
            .required()
            .positive()
            .messages({
                'number.base': 'Question ID must be a number',
                'number.integer': 'Question ID must be an integer',
                'any.required': 'Question ID is required'
            })
    });

    // Validate input
    const { error } = inputSchema.validate({ question_id });
    if (error) {
        return done({
            status: 400,
            error_message: error.details[0].message
        });
    }

    deleteQuestionFromDB(question_id, user_id, done);
};


// Upvotes a question given an ID. You may upvote your own questions, 
// but you can not vote on the same question twice

const upvote_question = (question_id, user_id, done) => {
    // Input validation schema
    const inputSchema = Joi.object({
        question_id: Joi.number()
            .integer()
            .required()
            .positive()
            .messages({
                'number.base': 'Question ID must be a number',
                'number.integer': 'Question ID must be an integer',
                'any.required': 'Question ID is required'
            })
    });

    // Validate input
    const { error } = inputSchema.validate({ question_id });
    if (error) {
        return done({
            status: 400,
            error_message: error.details[0].message
        });
    }

    upvoteQuestionInDB(question_id, user_id, done);
};

// Downvotes a question given an ID. You may downvote your own questions, 
// but you can not vote on the same question twice
const downvote_question = (question_id, user_id, done) => {
    // Input validation schema
    const inputSchema = Joi.object({
        question_id: Joi.number()
            .integer()
            .required()
            .positive()
            .messages({
                'number.base': 'Question ID must be a number',
                'number.integer': 'Question ID must be an integer',
                'any.required': 'Question ID is required'
            })
    });

    // Validate input
    const { error } = inputSchema.validate({ question_id });
    if (error) {
        return done({
            status: 400,
            error_message: error.details[0].message
        });
    }

    downvoteQuestionInDB(question_id, user_id, done);
};

module.exports = {
    event_question: event_question,
    delete_question: delete_question,
    upvote_question: upvote_question,
    downvote_question: downvote_question
}