var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('Data_Base.db');

db.serialize(function() {

    /*
    db.all(`
            SELECT Posts.id, Posts.content, Users.pseudo, Users.email
            From Posts JOIN Users ON Posts.author_id = Users.id;
    `, (err, rows)=>{
        console.log(rows)
    })
    */

    db.all(`
            SELECT * FROM Users;
    `, (err, rows)=>{
        console.log(rows)
    })

});

db.close();