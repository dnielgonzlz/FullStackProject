//TODO: I need to build here the queries for SQLite for each of the operations
//TODO: POST - Ask a question about an event
//TODO: DELETE - Delete a question
//TODO: POST - Upvote a question
//TODO: DELETE - Downvote a question


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