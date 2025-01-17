// Creates a new question for a specific event
const askQuestion = async (eventId, question) => {
    const token = localStorage.getItem('session_token');
    const response = await fetch(`http://localhost:3333/event/${eventId}/question`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Authorization': token
        },
        body: JSON.stringify({ question })
    });

    if (response.status === 201) {
        return response.json();
    }
    
    const error = await response.json();
    throw new Error(error.error_message || 'Failed to ask question');
};

// Removes a question from an event (requires authorization)
const deleteQuestion = async (questionId) => {
    const token = localStorage.getItem('session_token');
    const response = await fetch(`http://localhost:3333/question/${questionId}`, {
        method: 'DELETE',
        headers: {
            'X-Authorization': token
        }
    });

    if (response.status === 200) {
        return true;
    }
    
    const error = await response.json();
    throw new Error(error.error_message || 'Failed to delete question');
};

// Retrieves the current vote status for a question
const getVoteStatus = async (questionId) => {
    const token = localStorage.getItem('session_token');
    const response = await fetch(`http://localhost:3333/question/${questionId}/vote`, {
        headers: {
            'X-Authorization': token
        }
    });

    if (response.status === 200) {
        return response.json();
    }
    
    const error = await response.json();
    throw new Error(error.error_message || 'Failed to get vote status');
};

// Adds an upvote to a question
const upvoteQuestion = async (questionId) => {
    const token = localStorage.getItem('session_token');
    const response = await fetch(`http://localhost:3333/question/${questionId}/vote`, {
        method: 'POST',
        headers: {
            'X-Authorization': token
        }
    });

    if (response.status === 200) {
        return true;
    }
    
    const error = await response.json();
    throw new Error(error.error_message || 'Failed to upvote question');
};

// Adds a downvote to a question
const downvoteQuestion = async (questionId) => {
    const token = localStorage.getItem('session_token');
    const response = await fetch(`http://localhost:3333/question/${questionId}/vote`, {
        method: 'PUT',
        headers: {
            'X-Authorization': token
        }
    });

    if (response.status === 200) {
        return true;
    }
    
    const error = await response.json();
    throw new Error(error.error_message || 'Failed to downvote question');
};

// Removes a user's vote from a question
const removeVote = async (questionId) => {
    const token = localStorage.getItem('session_token');
    const response = await fetch(`http://localhost:3333/question/${questionId}/vote`, {
        method: 'DELETE',
        headers: {
            'X-Authorization': token
        }
    });

    if (response.status === 200) {
        return true;
    }
    
    const error = await response.json();
    throw new Error(error.error_message || 'Failed to remove vote');
};


export const questionsService = {
    askQuestion,       
    deleteQuestion,  
    upvoteQuestion,     
    downvoteQuestion,
    removeVote,        
    getVoteStatus     
}; 