const sqlite3 = require('sqlite3').verbose();
const DBSOURCE = 'db.sqlite';

let db = new sqlite3.Database(DBSOURCE, (err) => {
    if(err){
        console.log(err.message);
        throw err;
    }else{
        console.log('Connected to the SQLite database.')

        db.run(`CREATE TABLE users (
                user_id INTEGER PRIMARY KEY AUTOINCREMENT,
                first_name text,
                last_name text,
                email text UNIQUE,
                password text,
                salt text,
                session_token text,
                CONSTRAINT email_unique UNIQUE (email)
            )`, (err) => {
                if(err){
                    console.log('Users table already created');
                }else{
                    console.log('Users table created');
                }
            }
        );

        
        db.run(`CREATE TABLE events (
                event_id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT,
                description TEXT,
                location TEXT,
                start INTEGER,
                close_registration INTEGER,
                max_attendees INTEGER,
                creator_id INTEGER,
                FOREIGN KEY(creator_id) REFERENCES users(user_id)
            )`, (err) => {
                if(err){
                    console.log('Events table already created');
                }else{
                    console.log('Events table created');
                }
            }
        );

        db.run(`CREATE TABLE attendees (
                event_id INTEGER,
                user_id INTEGER,
                PRIMARY KEY (event_id, user_id),
                FOREIGN KEY (event_id) REFERENCES events(event_id),
                FOREIGN KEY (user_id) REFERENCES users(user_id)
            )`, (err) => {
                if(err){
                    // console.log(err)
                    console.log('Attendees table already created');
                }else{
                    console.log('Attendees table created');
                }
            }
        );

        db.run(`CREATE TABLE questions (
                question_id INTEGER PRIMARY KEY AUTOINCREMENT,
                question TEXT,
                asked_by INTEGER,
                event_id INTEGER,
                votes INTEGER,
                FOREIGN KEY (asked_by) REFERENCES users(user_id)
                FOREIGN KEY (event_id) REFERENCES events(event_id)
            )`, (err) => {
                if(err){
                    console.log('Questions table already created');
                }else{
                    console.log('Questions table created');
                }
            }
        );

        db.run(`CREATE TABLE votes (
            question_id INTEGER,
            voter_id INTEGER,
            PRIMARY KEY (question_id, voter_id),
            FOREIGN KEY (question_id) REFERENCES questions(question_id),
            FOREIGN KEY (voter_id) REFERENCES users(user_id)
        )`, (err) => {
            if(err){
                console.log('Votes table already created');
            }else{
                console.log('Votes table created');
            }
        }
    );
        // Categories table - stores the category definitions
        db.run(`CREATE TABLE categories (
            category_id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL
        )`, (err) => {
            if(err){
                console.log('Categories table already created');
            }else{
                console.log('Categories table created');
                
                // Insert predefined categories
                const categories = [
                    'Conference',
                    'Workshop',
                    'Meetup',
                    'Social',
                    'Concert',
                    'Exhibition',
                    'Sports',
                    'Other'
                ];
                
                // Prepare the insert statement
                const stmt = db.prepare('INSERT INTO categories (name) VALUES (?)');
                
                // Insert each category
                categories.forEach(category => {
                    stmt.run(category, (err) => {
                        if(err) {
                            console.log(`Error inserting category ${category}:`, err);
                        }
                    });
                });
                
                // Finalize the prepared statement
                stmt.finalize();
            }
        });

        // Event_Categories junction table - links events with their categories
        db.run(`CREATE TABLE event_categories (
            event_id INTEGER,
            category_id INTEGER,
            PRIMARY KEY (event_id, category_id),
            FOREIGN KEY (event_id) REFERENCES events(event_id) 
                ON DELETE CASCADE,
            FOREIGN KEY (category_id) REFERENCES categories(category_id) 
                ON DELETE CASCADE
        )`, (err) => {
            if(err){
                console.log('Event_categories table already created');
            }else{
                console.log('Event_categories table created');
            }
        });
}
});

module.exports = db;