const express = require('express');
const morgan  = require('morgan');
const bodyParser = require('body-parser');
const cors = require('cors');


const app = express();
app.use(cors());
app.use(morgan('tiny'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Server port
const HTTP_PORT = 3333;

// Start server
app.listen(HTTP_PORT, () => {
    console.log('Server running on port: ' + HTTP_PORT);
});


// Root endpoint
app.get('/', (req, res, next) => {
    res.json({'status': 'Alive'});
});

require('./app/routes/user.server.routes')(app);
require('./app/routes/event.server.routes')(app);
require('./app/routes/question.server.routes')(app);


// Default response for any other request
app.use((req, res) => {
    res.sendStatus(404);
});
