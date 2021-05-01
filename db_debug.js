var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('Data_Base.db');

db.serialize(function() {

    db.all(`
        SELECT * FROM Comments;
    `, (err, rows)=>{
        console.log(rows);
    })

    db.all(`
        SELECT * FROM Users;
    `, (err, rows)=>{
        console.log(rows);
    })

    db.all(
        `
            SELECT Posts.content, Posts.image_link, Posts.date, Users.pseudo
            FROM Posts JOIN Users ON Posts.author_id =  Users.id;
        `, (err, rows)=>{
            console.log(rows)
    })

    db.all(`
        SELECT Users.pseudo, Comments.date, Comments.content
        FROM Comments
            JOIN Users ON Users.id = Comments.author_id
            JOIN Posts ON Posts.id = Comments.post_id
        WHERE Posts.id = ?;
    `, 1, (sub_err, sub_rows)=>{
        console.log(sub_rows);
    })

});

db.close();