// TODO: create a middleware function

// a. Get the X-Authorization token
// b. Use the model functions to convert it to an ID
// c. If there is no ID returned, then the middleware function should return a 401
// Unauthorised response to the client
// d. Else, execute next() to keep processing

// Import your middleware function into your routes files and add it to the route of every
// endpoint which requires authentication
// 5. Test your endpoints