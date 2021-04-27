var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('Data_Base.db');

db.serialize(function() {
    db.run('DROP TABLE IF EXISTS Users')
    db.run('DROP TABLE IF EXISTS Posts')

    db.run(`
        CREATE TABLE IF NOT EXISTS Users(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            pseudo varchar(255),
            email varchar(255),
            password varchar(255)
        );
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS Posts(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            author_id INTEGER,
            date TEXT,
            content TEXT,
            image_link TEXT,

            FOREIGN KEY (author_id) REFERENCES Users(id)
        );
    `);

    db.run(`
        INSERT INTO Users(pseudo, email, password)
        VALUES
            ("Abied",   "social@imad-abied.pro",    "eOxzkz2083!;z"),
            ("Ahalli",  "social@med-ahalli.pro",    "s#{la_brute!f");
    `);

    db.run(`
        INSERT INTO Posts(author_id, content, image_link, date)
        VALUES
            (1,   "Welcome to Teilen", "https://images.twinkl.co.uk/tw1n/image/private/t_630/u/ux/tiger-2535888-1920_ver_1.jpg", "2021-04-27 21:47:28" );
    `);
});

db.close();