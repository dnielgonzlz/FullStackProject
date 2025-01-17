const Joi = require('joi');
const questions = require('../models/question.server.models');
const {cleanText} = require('../lib/profanity');

// Handles creation of new questions for events
// Validates input, filters profanity, and saves to database
const event_question = (req, res) => {
    // Validation schema for question content
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

    // Validation schema for event ID parameter
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

    // Validate event ID from URL parameters
    const { error: eventIdError } = eventIdSchema.validate({ 
        event_id: parseInt(req.params.event_id) 
    });
    
    if (eventIdError) {
        return res.status(400).json({
            error_message: eventIdError.details[0].message
        });
    }

    // Validate question content
    const { error: questionError } = inputSchema.validate(req.body);
    if (questionError) {
        return res.status(400).json({
            error_message: questionError.details[0].message
        });
    }

    // Process and save the question
    const user_id = req.user_id;
    const event_id = parseInt(req.params.event_id);
    questions.askQuestionInDB(event_id, user_id, cleanText(req.body.question), (err, result) => {
        if (err) {
            return res.status(err.status).json({
                error_message: err.error_message
            });
        }
        return res.status(201).json({
            question_id: result.question_id
        });
    });
};

// Handles question deletion
// Verifies user permissions before deletion
const delete_question = (req, res) => {
    // Validation schema for question ID
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

    // Validate question ID from parameters
    const { error } = inputSchema.validate({ 
        question_id: parseInt(req.params.question_id) 
    });

    if (error) {
        return res.status(400).json({
            error_message: error.details[0].message
        });
    }

    // Process deletion request
    const user_id = req.user_id;
    const question_id = parseInt(req.params.question_id);

    questions.deleteQuestionFromDB(question_id, user_id, (err, result) => {
        if (err) {
            return res.status(err.status).json({
                error_message: err.error_message
            });
        }
        return res.status(200).json(); 
    });
};

// Handles upvoting questions
// Prevents duplicate votes from the same user
const upvote_question = (req, res) => {
    // Validation schema for question ID
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

    // Validate question ID from parameters
    const { error } = inputSchema.validate({ 
        question_id: parseInt(req.params.question_id) 
    });

    if (error) {
        return res.status(400).json({
            error_message: error.details[0].message
        });
    }

    // Process upvote request
    const user_id = req.user_id;
    const question_id = parseInt(req.params.question_id);

    questions.upvoteQuestionInDB(question_id, user_id, (err, result) => {
        if (err) {
            return res.status(err.status).json({
                error_message: err.error_message
            });
        }
        return res.status(200).json(); 
    });
};

// Handles downvoting questions
// Prevents duplicate votes from the same user
const downvote_question = (req, res) => {
    // Validation schema for question ID
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

    // Validate question ID from parameters
    const { error } = inputSchema.validate({ 
        question_id: parseInt(req.params.question_id) 
    });

    if (error) {
        return res.status(400).json({
            error_message: error.details[0].message
        });
    }

    // Process downvote request
    const user_id = req.user_id;
    const question_id = parseInt(req.params.question_id);

    questions.downvoteQuestionInDB(question_id, user_id, (err, result) => {
        if (err) {
            return res.status(err.status).json({
                error_message: err.error_message
            });
        }
        return res.status(200).json(); 
    });
};

module.exports = {
    event_question,
    delete_question,
    upvote_question,
    downvote_question
}