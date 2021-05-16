const express = require('express')
const app = express();

var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('Data_Base.db');

const {openDb} = require("./db");

const bodyParser = require('body-parser');
app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies

app.set('views', './views');
app.set('view engine', 'jade');

const session = require('express-session')
//app.set('trust proxy', 1)
app.use(session(
    {
        secret: 'secret key',
        resave: true,
        rolling: true,
        saveUninitialized: true,
        cookie: { 
            maxAge: 1000 * 3600 //ms    
        },
        saveUninitialized: true
    }
))

app.get('/', async (req, res)=>{
    if(!req.session.pseudo){
        res.redirect('/authen')
    }else{
        let db_select = await openDb();
        const rows = await db_select.all(
            `
                SELECT Posts.id, Posts.content, Posts.image_link, Posts.date, Users.pseudo
                FROM Posts JOIN Users ON Posts.author_id =  Users.id
                ORDER BY Posts.date DESC;
            `
        );
        for(let i = 0; i < rows.length; i++){
            // Getting reacts
            const reacts = await db_select.all(`
                SELECT Reacts.react, COUNT(*)
                FROM Reacts
                    JOIN Posts ON Reacts.post_id = Posts.id
                WHERE Reacts.post_id = ?
                GROUP BY Reacts.react;
            `,[rows[i].id]);

            if(reacts.length == 2){
                rows[i].downs = reacts[0]['COUNT(*)'];
                rows[i].ups = reacts[1]['COUNT(*)'];
            }else{
                if(reacts.length == 1){
                    if(reacts[0].react == 0){
                        rows[i].downs = reacts[0]['COUNT(*)'];
                        rows[i].ups = 0;
                    }else{
                        rows[i].downs = 0;
                        rows[i].ups = reacts[0]['COUNT(*)'];
                    }
                }else{
                    rows[i].downs = 0;
                    rows[i].ups = 0;
                }
            }

            // Getting comments
            const comments_rows = await db_select.all(`
                SELECT Comments.id, Users.pseudo, Comments.date, Comments.content
                FROM Comments
                    JOIN Users ON Users.id = Comments.author_id
                    JOIN Posts ON Posts.id = Comments.post_id
                WHERE Posts.id = ?
                ORDER BY Comments.date;
            `, [rows[i].id]);
            rows[i].comments = comments_rows;
        }
        let user = {
            pseudo : req.session.pseudo,
        }
        let data = {
            user : user,
            posts : rows
        }
        res.render("main", data);
    }
});

app.get('/show_post', async (req, res)=>{
    if(!req.session.pseudo){
        res.redirect('/authen')
    }else{
        let db_select = await openDb();

        const pub = await db_select.get(`
            SELECT Posts.id, Posts.content, Posts.image_link, Posts.date, Users.pseudo
            FROM Posts JOIN Users ON Posts.author_id =  Users.id
            WHERE Posts.id = ?;
        `,[req.query.post_id]);
    
        const comments = await db_select.all(`
            SELECT Users.pseudo, Comments.date, Comments.content
            FROM Comments
                JOIN Users ON Users.id = Comments.author_id
                JOIN Posts ON Posts.id = Comments.post_id
            WHERE Posts.id = ?;
        `, [req.query.post_id]);
    
        pub.comments = comments;

        let user = {
            pseudo : req.session.pseudo,
        }

        let data = {
            user : user,
            post : pub
        }
    
        res.render("show_post_no_style", data);
    }
})

app.get('/inscription', (req, res)=>{

    res.render('inscription');

});

app.post('/inscription', (req, res)=>{
    // Checking info & saving data
    db.run(`
        INSERT INTO Users(pseudo, email, password)
        VALUES
            (?, ?, ?);
    `, req.body.pseudo, req.body.email, req.body.password);
    res.redirect('/');
});

app.get('/authen', (req, res)=>{

    data = {
        err_msg : ""
    }
    res.render('authen', data);

});

app.post('/authen', (req, res)=>{
    // Checking info & saving data
    err_msg = "2892";
    err = false;
    db.get("SELECT * FROM Users WHERE email = ?", [req.body.email],
    (err, row)=>{
        if(typeof row === 'undefined'){
            err_msg = "There is no user with this email";
            err = true;
        }else if(row.password != req.body.password){
            err_msg = "Wrong password";
            err = true;
        }

        if(err){
            data = {
                err_msg : err_msg
            }
            res.render('authen', data);
        }else{
            req.session.user_id = row.id
            req.session.pseudo = row.pseudo
            req.session.email = row.email
            res.redirect('/');
        }
    });
});

app.get('/deconnect', (req, res)=>{
    req.session.destroy()
    res.redirect('/')
})

app.post('/add_post',(req, res)=>{
    db.serialize(()=>{
        db.run(`
        INSERT INTO Posts(author_id, content, image_link, date)
        VALUES
            (?, ?, ?, datetime('now'));
        `, req.session.user_id, req.body.content, req.body.image_link);

        db.get(`
        SELECT Posts.id FROM Posts
        WHERE author_id = ? AND content = ?;
        `, [req.session.user_id, req.body.content], (err, raw)=>{
            res.redirect('/#post'+raw.id);
        })
    })
})

app.post('/add_comment',(req, res)=>{
    db.serialize(()=>{
        db.run(`
        INSERT INTO Comments(author_id, post_id, content, date)
        VALUES
            (?, ?, ?, datetime('now'));
        `, req.session.user_id, req.query.post_id, req.body.comment);
        
        db.get(`
        SELECT Comments.id
        FROM Comments
        WHERE author_id = ? AND post_id = ? AND content = ?;
        `, [req.session.user_id, req.query.post_id, req.body.comment], (err, raw)=>{
            //res.redirect('/#comment'+raw.id);
            res.redirect('/#post'+req.query.post_id);
        })
    })
})

app.post('/add_react',(req, res)=>{
    //Testing if the user has already a react on the post
    db.all(`
        SELECT id, react
        FROM Reacts
        WHERE reactor_id = ? AND post_id = ?;
    `,[req.session.user_id, req.query.post_id],(err, rows) =>{
        if(rows.length == 0){
            db.run(`
            INSERT INTO Reacts(reactor_id, post_id, react, date)
            VALUES
                (?, ?, ?, datetime('now'));
            `, req.session.user_id, req.query.post_id, req.query.react, ()=>{
                res.redirect('/#post'+req.query.post_id);
            });
        }else{
            if(rows[0].react == req.query.react){
                res.redirect('/#post'+req.query.post_id);
            }else{

                db.run(`
                DELETE FROM Reacts
                WHERE id = ?;
                `,rows[0].id);

                db.run(`
                INSERT INTO Reacts(reactor_id, post_id, react, date)
                VALUES
                    (?, ?, ?, datetime('now'));
                `, req.session.user_id, req.query.post_id, req.query.react, ()=>{
                    res.redirect('/#post'+req.query.post_id);
                });
            }
        }
    })
})

app.listen(3030);