//TODO: I need to build here the queries for SQLite for each of the operations
//TODO: POST - Create a new event
//TODO: GET - Get a single event detail
//TODO: PATCH - Update a single event
//TODO: POST - Register to attend an event
//TODO: DELETE - Delete an event
//TODO: GET - Search for an event


const getAllEvents = (done) => {
    const sql = 'SELECT * FROM events'

    const errors = []
    const results = []

    db.each(
        sql,
        [],
        (err,row) => {
            if(err) errors.push(err)

                results.push({
                    event_id: row.event_id,
                    event_name: row.event_name,
                    // movie_year: row.movie_year,
                    // movie_director: row.movie_director
                })
        },
        (err, num_rows) => {
            return done(err, num_rows, results)
        }
    )
}