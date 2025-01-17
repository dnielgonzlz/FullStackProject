// Fetches all open events from the server
const getEvents = () => {
    return fetch('http://localhost:3333/search?status=OPEN')
    .then((response) => {
        if(response.status === 200) {
            return response.json();
        } else {
            throw "Something went wrong fetching the events";
        }
    })
    .then((resJson) => {
        return resJson;
    })
    .catch((error) => {
        return Promise.reject(error);
    });
};

// Creates a new event with provided data and user authentication
const createEvent = (eventData) => {
    const token = localStorage.getItem('session_token');
    
    // Validate and parse maximum attendees
    const max_attendees = parseInt(eventData.max_attendees);
    if (isNaN(max_attendees)) {
        return Promise.reject({ error_message: 'Maximum attendees must be a valid number' });
    }
    
    // Format request data to match API requirements
    const requestBody = {
        name: eventData.name || eventData.title,
        description: eventData.description,
        location: eventData.location,
        start: eventData.start,
        close_registration: eventData.close_registration,
        max_attendees: max_attendees,
        categories: eventData.categories
    };

    return fetch('http://localhost:3333/events', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Authorization': token
        },
        body: JSON.stringify(requestBody)
    })
    .then(async response => {
        const data = await response.json();
        if (response.status === 201) {
            return data;
        }
        return Promise.reject(data);
    })
    .catch(error => {
        return Promise.reject(error);
    });
};

// Retrieves specific event details by ID
const getEventById = (eventId) => {
    const token = localStorage.getItem('session_token');
    return fetch(`http://localhost:3333/event/${eventId}`, {
        headers: {
            'X-Authorization': token || ''
        }
    })
    .then(response => {
        if (response.status === 200) {
            return response.json();
        }
        return response.json().then(err => Promise.reject(err));
    });
};

// Updates existing event details with provided data
const updateEvent = (eventId, updateData) => {
    const token = localStorage.getItem('session_token');
    
    if (!token) {
        return Promise.reject({ error_message: 'Authentication required' });
    }

    return fetch(`http://localhost:3333/event/${eventId}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'X-Authorization': token
        },
        body: JSON.stringify(updateData)
    })
    .then(response => {
        if (response.status === 200) {
            return response.json();
        }
        return response.json().then(err => Promise.reject(err));
    });
};

// Registers authenticated user for an event
const registerForEvent = (eventId) => {
    const token = localStorage.getItem('session_token');
    
    return fetch(`http://localhost:3333/event/${eventId}`, {
        method: 'POST',
        headers: {
            'X-Authorization': token
        }
    })
    .then(response => {
        if (response.status === 200) {
            return response.json();
        }
        return response.json().then(err => Promise.reject(err));
    });
};

// Archives (soft deletes) an event
const archiveEvent = (eventId) => {
    const token = localStorage.getItem('session_token');
    return fetch(`http://localhost:3333/event/${eventId}`, {
        method: 'DELETE',
        headers: {
            'X-Authorization': token
        }
    })
    .then(response => {
        if (response.status === 200) {
            return response.json();
        }
        return response.json().then(err => Promise.reject(err));
    });
};

// Searches events based on provided parameters
const searchEvents = (params = {}) => {
    const token = localStorage.getItem('session_token');
    
    // Construct search query parameters
    const queryParams = new URLSearchParams({
        status: params.status || 'OPEN',
        q: params.q || '',
        limit: params.limit || 20,
        offset: params.offset || 0
    });

    // Add category filters if provided
    if (params.categories && params.categories.length > 0) {
        queryParams.append('categories', params.categories.join(','));
    }

    return fetch(`http://localhost:3333/search?${queryParams.toString()}`, {
        headers: {
            'X-Authorization': token || '' 
        }
    })
    .then(async response => {
        const data = await response.json();
        if (response.status === 200) {
            return data;
        }
        return Promise.reject(data);
    })
    .catch(error => {
        return Promise.reject(error);
    });
};

// Fetches all available event categories
const getCategories = () => {
    return fetch('http://localhost:3333/categories')
        .then((response) => {
            if(response.status === 200) {
                return response.json();
            } else {
                throw "Something went wrong fetching the categories";
            }
        })
        .catch((error) => {
            return Promise.reject(error);
        });
};

// Export service methods
export const eventsService = {
    getEvents,
    createEvent,
    getEventById,
    updateEvent,
    registerForEvent,
    archiveEvent,
    searchEvents,
    getCategories
};

