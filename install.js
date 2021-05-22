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
            tag TEXT,

            FOREIGN KEY (author_id) REFERENCES Users(id)
        );
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS Comments(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            author_id INTEGER,
            post_id INTEGER,
            date TEXT,
            content TEXT,

            FOREIGN KEY (author_id) REFERENCES Users(id),
            FOREIGN KEY (post_id) REFERENCES Posts(id)
        );
    `)

    db.run(`
        CREATE TABLE IF NOT EXISTS Reacts(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            reactor_id INTEGER,
            post_id INTEGER,
            date TEXT,
            react INTEGER,

            FOREIGN KEY (reactor_id) REFERENCES Users(id),
            FOREIGN KEY (post_id) REFERENCES Posts(id)
        );
    `)

    db.run(`
        INSERT INTO Users(pseudo, email, password)
        VALUES
            ("Abied",   "social@imad-abied.pro",    "eOxzkz2083!;z"),
            ("Ahalli",  "social@med-ahalli.pro",    "s#{la_brute!f"),
            ("Linus",  "linus.torvalds@linux-fondation.org", "a2khSDeu"),
            ("Ronaldo",  "cr7.ronaldo@fifa.com", "mp2Ammrw");
    `);

    db.run(`
        INSERT INTO Posts(author_id, content, image_link, tag, date)
        VALUES
            (1,   "Welcome to Teilen", "https://images.twinkl.co.uk/tw1n/image/private/t_630/u/ux/tiger-2535888-1920_ver_1.jpg", "dev", datetime('now', '-2 days')),
            (2,   "Second post for test", "https://images.bfmtv.com/hWqWgLneICAMGTvbfMPHL2-HXJo=/0x0:1280x720/images/Resume-Barcelone-1-4-Paris-SG-Ligue-des-champions-8e-de-finale-aller-970499.jpg", "dev", datetime('now', '-2 days', '+1 minute')),
            (3,   "I'm in love with this website", "https://www.zdnet.com/a/hub/i/2020/07/13/7c4051fb-df54-4d6e-8bb6-35b9b48ee872/linustorvaldstedyoutubed.jpg", "dev", datetime('now', '-1 days', '+21 minutes', '-5 hours')),
            (4,   "Juventus confirm Ronaldo is in Madeira but not a return date", "https://ronaldo.com/wp-content/uploads/2020/02/GettyImages-1203559908.jpg", "sport", datetime('now', '-1 days', '-43 minutes', '+3 hours'));
    `);

    db.run(`
        INSERT INTO Comments(author_id, post_id, content, date)
        VALUES
            (2, 1, "First comment ever !", "2021-04-27 22:37:31"),
            (1, 2, "Psg is the best !", "2021-05-02 22:44:21"),
            (2, 2, "It a master piece", "2021-05-02 22:45:16");
    `);

    db.run(`
        INSERT INTO Reacts(reactor_id, post_id, react, date)
        VALUES
            (1, 1, 1, "2021-05-16 21:37:22"),
            (2, 1, 0, "2021-05-16 21:38:17"),
            (3, 1, 1, "2021-05-16 21:38:17");
    `);

});

db.close();