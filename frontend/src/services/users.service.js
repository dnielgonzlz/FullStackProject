// Authenticates user credentials and returns session token
const login = (credentials) => {
    return fetch(`http://localhost:3333/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials)
    })
    .then(response => {
        if (response.status === 200) {
            return response.json();
        }
        return response.json().then(err => Promise.reject(err));
    });
};

// Creates new user account with provided information
const signup = (userData) => {
    return fetch(`http://localhost:3333/users`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData)
    })
    .then(response => {
        if (response.status === 201) {
            return response.json();
        }
        return response.json().then(err => Promise.reject(err));
    });
};

// Terminates user session and removes authentication token
const logout = () => {
    const token = localStorage.getItem('session_token');

    // Handle case where no token exists
    if (!token) {
        return Promise.reject({ error: 'No active session found' });
    }

    return fetch(`http://localhost:3333/logout`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Authorization': token  
        }
    })
    .then(response => {
        if (response.status === 200) {
            return true;
        }
        // Handle expired or invalid token
        if (response.status === 401) {
            localStorage.removeItem('session_token');
            return true;
        }
        return response.json().then(err => Promise.reject(err));
    });
};

export const usersService = {
    login,     
    signup,   
    logout    
}; 