//TODO: I need to build here the queries for SQLite for each of the operations
//TODO: Create an account for a new user
//TODO: Log in into an account
//TODO: Log out out of an account


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