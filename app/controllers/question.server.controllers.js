const Joi = require('joi');
const questions = require('../models/question.server.models');

// New question related to a particular event
const event_question = (req, res) => {
    console.log('🚀 QUESTION: Starting question creation process');

    // Input validation schemas
    const inputSchema = Joi.object({
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

    const eventIdSchema = Joi.object({
        event_id: Joi.number()
            .integer()
            .required()
            .positive()
            .messages({
                'number.base': 'Event ID must be a number',
                'number.integer': 'Event ID must be an integer',
                'any.required': 'Event ID is required'
            })
    });

    // Validate event_id from params
    const { error: eventIdError } = eventIdSchema.validate({ 
        event_id: parseInt(req.params.event_id) 
    });
    
    if (eventIdError) {
        console.log('❌ QUESTION: Invalid event ID:', eventIdError.message);
        return res.status(400).json({
            error_message: eventIdError.details[0].message
        });
    }

    // Validate question data
    const { error: questionError } = inputSchema.validate(req.body);
    if (questionError) {
        console.log('❌ QUESTION: Invalid question data:', questionError.message);
        return res.status(400).json({
            error_message: questionError.details[0].message
        });
    }

    // Get user_id from authenticate middleware
    const user_id = req.user_id;
    const event_id = parseInt(req.params.event_id);

    console.log('✅ QUESTION: Validation passed, creating question');
    questions.askQuestionInDB(event_id, user_id, req.body.question, (err, result) => {
        if (err) {
            console.log('❌ QUESTION: Error:', err.error_message);
            return res.status(err.status).json({
                error_message: err.error_message
            });
        }

        console.log('✅ QUESTION: Question created successfully');
        return res.status(201).json({
            question_id: result.question_id
        });
    });
};


// Deletes a question given an ID. Only creators and authors
// of questions can delete
// BUG: Is there an actual validation to check if the user is the creator?
const delete_question = (req, res) => {
    console.log('🚀 DELETE QUESTION: Starting deletion process');

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
    const { error } = inputSchema.validate({ 
        question_id: parseInt(req.params.question_id) 
    });

    if (error) {
        console.log('❌ DELETE QUESTION: Validation failed:', error.message);
        return res.status(400).json({
            error_message: error.details[0].message
        });
    }

    // Get user_id from authenticate middleware
    const user_id = req.user_id;
    const question_id = parseInt(req.params.question_id);

    console.log('✅ DELETE QUESTION: Validation passed, proceeding with deletion');

    questions.deleteQuestionFromDB(question_id, user_id, (err, result) => {
        if (err) {
            console.log('❌ DELETE QUESTION: Error:', err.error_message);
            return res.status(err.status).json({
                error_message: err.error_message
            });
        }

        console.log('✅ DELETE QUESTION: Question deleted successfully');
        return res.status(200).json(); // Return empty response with 200 OK as per API docs
    });
};



// Upvotes a question given an ID. You may upvote your own questions, 
// but you can not vote on the same question twice

const upvote_question = (req, res) => {
    console.log('🚀 UPVOTE: Starting upvote process');

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
    const { error } = inputSchema.validate({ 
        question_id: parseInt(req.params.question_id) 
    });

    if (error) {
        console.log('❌ UPVOTE: Validation failed:', error.message);
        return res.status(400).json({
            error_message: error.details[0].message
        });
    }

    // Get user_id from authenticate middleware
    const user_id = req.user_id;
    const question_id = parseInt(req.params.question_id);

    console.log('✅ UPVOTE: Validation passed');

    questions.upvoteQuestionInDB(question_id, user_id, (err, result) => {
        if (err) {
            console.log('❌ UPVOTE: Error:', err.error_message);
            return res.status(err.status).json({
                error_message: err.error_message
            });
        }

        console.log('✅ UPVOTE: Vote recorded successfully');
        return res.status(200).json(); // Empty response with 200 OK as per API docs
    });
};



// Downvotes a question given an ID. You may downvote your own questions, 
// but you can not vote on the same question twice
const downvote_question = (req, res) => {
    console.log('🚀 DOWNVOTE: Starting downvote process');

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
    const { error } = inputSchema.validate({ 
        question_id: parseInt(req.params.question_id) 
    });

    if (error) {
        console.log('❌ DOWNVOTE: Validation failed:', error.message);
        return res.status(400).json({
            error_message: error.details[0].message
        });
    }

    // Get user_id from authenticate middleware
    const user_id = req.user_id;
    const question_id = parseInt(req.params.question_id);

    console.log('✅ DOWNVOTE: Validation passed');

    questions.downvoteQuestionInDB(question_id, user_id, (err, result) => {
        if (err) {
            console.log('❌ DOWNVOTE: Error:', err.error_message);
            return res.status(err.status).json({
                error_message: err.error_message
            });
        }

        console.log('✅ DOWNVOTE: Vote removed successfully');
        return res.status(200).json(); // Empty response with 200 OK as per API docs
    });
};


module.exports = {
    event_question,
    delete_question,
    upvote_question,
    downvote_question
}