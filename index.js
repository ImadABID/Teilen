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

const session = require('express-session');
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

function get_update_on_posts_related_me(user_id, trending_start, trending_end){
    function concatenate_all_object_to_list_with_unique_ele(obj1, obj2){
        return new Promise((resolve)=>{
            let suspicion_posts ={
                id : [],
                date : [] 
            };
            for(let i=0; i<obj1.length; i++){
                suspicion_posts.id.push(obj1[i].id)
                suspicion_posts.date.push(obj1[i].date)
            }
            for(let i=0; i<obj2.length; i++){
                if(!suspicion_posts.id.includes(obj2[i].id)){
                    suspicion_posts.id.push(obj2[i].id)
                    suspicion_posts.date.push(obj2[i].date)
                }
            }
            resolve(suspicion_posts)
        })
    }
    function validate_update_post(suspicion_posts_id, suspicion_posts_date, trending_end){
        return new Promise(async (resolve)=>{
            let updates = await db_select.all(`
                SELECT Count(*)
                FROM Comments
                WHERE Comments.post_id = ? AND (datetime(Comments.date) BETWEEN ? AND ? );
            `, [suspicion_posts_id, suspicion_posts_date, trending_end]);

            if(updates.length > 0){
                let update_post = await db_select.get(
                    `
                        SELECT Posts.id, Posts.content, Posts.image_link, Posts.tag, Posts.date, Users.pseudo, Posts.score
                        FROM Posts JOIN Users ON Posts.author_id =  Users.id
                        WHERE Posts.id = ?;
                    `, [suspicion_posts_id]);
                if(updates['Count(*)'] == 1){
                    update_post.update_post_reason = "You have 1 update on this post";
                }else{
                    update_post.update_post_reason = "You have "+toString(updates['Count(*)'])+" updates on this post";
                }
                resolve(update_post)
            }else{
                resolve(null)
            }
        })
    }
    return new Promise(async (resolve)=>{
        let db_select = await openDb();
        let user_related_posts_becauseof_his_posts = await db_select.all(`
            SELECT Posts.id, Posts.date
            FROM Posts
            WHERE Posts.author_id = ? AND (datetime(Posts.date) BETWEEN ? AND ?)
            GROUP BY Posts.id;
        `, [user_id, trending_start, trending_end])

        let user_related_posts_becauseof_his_comments = await db_select.all(`
            SELECT Posts.id, Comments.date
            FROM Posts
                JOIN Comments ON Comments.post_id = Posts.id
            WHERE Comments.author_id = ? AND (datetime(Comments.date) BETWEEN ? AND ?)
            GROUP BY Posts.id;
            ORDER BY Comments.dates DESC;
        `, [user_id, trending_start, trending_end])

        let suspicion_posts = await concatenate_all_object_to_list_with_unique_ele(user_related_posts_becauseof_his_posts, user_related_posts_becauseof_his_comments);

        let update_posts = null;
        for(i=0; i<suspicion_posts.length; i++){
            let update_post = await validate_update_post(suspicion_posts.id[i], suspicion_posts.date[i], trending_end);
            if(update_post != null){
                update_posts.push(update_post)
            }
        }
        resolve(update_posts)
    })
}

function get_posts(show_reaction_related_to_me, trending_start, trending_end, tag) {
    return new Promise((resolve) => {
        if(tag != 'all'){
            db.all(
                `
                    SELECT Posts.id, Posts.content, Posts.image_link, Posts.tag, Posts.date, Users.pseudo, Users.id as 'author_id', Posts.score 
                    FROM Posts JOIN Users ON Posts.author_id =  Users.id
                    WHERE (datetime(Posts.date) BETWEEN ? AND ?) AND Posts.tag = ?
                    ORDER BY Posts.score DESC;
                `, [trending_start, trending_end, tag], (err, rows)=>{
                    resolve(rows);
            });
        }else{
            db.all(
                `
                    SELECT Posts.id, Posts.content, Posts.image_link, Posts.tag, Posts.date, Users.pseudo, Users.id as 'author_id', Posts.score
                    FROM Posts JOIN Users ON Posts.author_id =  Users.id
                    WHERE datetime(Posts.date) BETWEEN ? AND ?
                    ORDER BY Posts.score DESC;
                `, [trending_start, trending_end], (err, rows)=>{
                    resolve(rows);
            });
        }
    });
}

function rest_main_post_filter(req_session){
    req_session.show_reaction_related_to_me = 1;
    req_session.trending_start = 'yesterday';
    req_session.trending_end = 'now';
    req_session.tag = 'all';
}

async function update_post_score(post_id, d_score){
    let db_select = await openDb();

    let prev_score = await db_select.get(`
        SELECT Posts.score
        FROM Posts
        WHERE Posts.id = ?;
    `, [post_id])
    await db_select.run(`
        UPDATE Posts
        SET score = ?
        WHERE id = ?;
    `, prev_score.score+d_score, post_id)
}

app.get('/', async (req, res)=>{
    if(!req.session.pseudo){
        res.redirect('/authen')
    }else{
        let db_select = await openDb();
        // Filtring Parametres
        let trending_start = null;
        if(req.session.trending_start == 'yesterday'){
            sql_date_selection_name = "datetime('now', 'localtime', '-1 day')"
            trending_start = await db_select.get("SELECT "+sql_date_selection_name+";");
            trending_start = trending_start[sql_date_selection_name];
        }else{
            trending_start = req.session.trending_start;
        }

        let trending_end = null;
        if(req.session.trending_end == 'now'){
            sql_date_selection_name = "datetime('now', 'localtime')"
            trending_end = await db_select.get("SELECT "+sql_date_selection_name+";");
            trending_end = trending_end[sql_date_selection_name];
        }else{
            trending_end = req.session.trending_end;
        }

        // Selecting updates posts
        //const updates_posts = await get_update_on_posts_related_me(req.session.user_id, trending_start, trending_end);
        //console.log(updates_posts)

        // Selecting trending posts
        const rows = await get_posts(req.session.show_reaction_related_to_me, trending_start, trending_end, req.session.tag);
        

        for(let i = 0; i < rows.length; i++){
            // Getting reacts
            const reacts = await db_select.all(`
                SELECT Reacts.react, COUNT(*)
                FROM Reacts
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

            // Getting user reaction
            const user_reaction = await db_select.all(`
                SELECT Reacts.react
                FROM Reacts
                WHERE Reacts.post_id = ? AND Reacts.reactor_id = ?;
            `,[rows[i].id, req.session.user_id]);

            if(user_reaction.length==0){
                rows[i].user_reaction = -1;
            }else{
                rows[i].user_reaction = user_reaction[0].react;
            }

            // Getting comments
            const comments_rows = await db_select.all(`
                SELECT Comments.id, Users.pseudo, Users.id as 'author_id', Comments.date, Comments.content
                FROM Comments
                    JOIN Users ON Users.id = Comments.author_id
                    JOIN Posts ON Posts.id = Comments.post_id
                WHERE Posts.id = ?
                ORDER BY Comments.date;
            `, [rows[i].id]);
            rows[i].comments = comments_rows;
        }

        // Getting tags
        const post_tags = await db_select.all(`
            SELECT tag
            FROM Posts
            GROUP BY tag;
        `)

        let user = {
            id : req.session.user_id,
            pseudo : req.session.pseudo
        }
        let data = {
            user : user,
            posts : rows,
            post_tags : post_tags, // All available tags
            show_reaction_related_to_me : req.session.show_reaction_related_to_me,
            trending_start_date : trending_start.slice(0,10),
            trending_start_time : trending_start.slice(11, trending_start.length),
            trending_end_date : trending_end.slice(0,10),
            trending_end_time : trending_end.slice(11, trending_end.length),
            tag : req.session.tag
        }
        res.render("main", data);
    }
});

app.get('/profil', async (req, res)=>{
    if(!req.session.pseudo){
        res.redirect('/authen')
    }else{
        let db_select = await openDb();
        let posts = await db_select.all(
            `
                SELECT Posts.id, Posts.content, Posts.image_link, Posts.tag, Posts.date, Users.pseudo, Users.id as 'author_id', Posts.score
                FROM Posts JOIN Users ON Posts.author_id =  Users.id
                WHERE Posts.author_id = ?
                ORDER BY Posts.score DESC;
            `, [req.session.user_id]);

        for(let i = 0; i < posts.length; i++){
            // Getting reacts
            const reacts = await db_select.all(`
                SELECT Reacts.react, COUNT(*)
                FROM Reacts
                WHERE Reacts.post_id = ?
                GROUP BY Reacts.react;
            `,[posts[i].id]);

            if(reacts.length == 2){
                posts[i].downs = reacts[0]['COUNT(*)'];
                posts[i].ups = reacts[1]['COUNT(*)'];
            }else{
                if(reacts.length == 1){
                    if(reacts[0].react == 0){
                        posts[i].downs = reacts[0]['COUNT(*)'];
                        posts[i].ups = 0;
                    }else{
                        posts[i].downs = 0;
                        posts[i].ups = reacts[0]['COUNT(*)'];
                    }
                }else{
                    posts[i].downs = 0;
                    posts[i].ups = 0;
                }
            }

            // Getting user reaction
            const user_reaction = await db_select.all(`
                SELECT Reacts.react
                FROM Reacts
                WHERE Reacts.post_id = ? AND Reacts.reactor_id = ?;
            `,[posts[i].id, req.session.user_id]);

            if(user_reaction.length==0){
                posts[i].user_reaction = -1;
            }else{
                posts[i].user_reaction = user_reaction[0].react;
            }

            // Getting comments
            const comments_rows = await db_select.all(`
                SELECT Comments.id, Users.pseudo, Users.id as 'author_id', Comments.date, Comments.content
                FROM Comments
                    JOIN Users ON Users.id = Comments.author_id
                    JOIN Posts ON Posts.id = Comments.post_id
                WHERE Posts.id = ?
                ORDER BY Comments.date;
            `, [posts[i].id]);
            posts[i].comments = comments_rows;
        }

        // Getting tags
        const post_tags = await db_select.all(`
            SELECT tag
            FROM Posts
            GROUP BY tag;
        `)

        let user = {
            id : req.session.user_id,
            pseudo : req.session.pseudo
        }
        let data = {
            user : user,
            posts : posts,
            post_tags : post_tags // All available tags
        }
        res.render("profil", data);
    }
})

app.get('/main_filter_posts', (req, res)=>{

    req.session.show_reaction_related_to_me = req.query.show_reaction_related_to_me;

    req.session.trending_start = req.query.trending_start_date+" "+req.query.trending_start_time;
    req.session.trending_end = req.query.trending_end_date+" "+req.query.trending_end_time;

    req.session.tag = req.query.tag;

    res.redirect('/');
})

app.get('/main_filter_posts_rest', (req, res)=>{
    rest_main_post_filter(req.session)
    res.redirect('/');
})

app.get('/show_post', async (req, res)=>{
    if(!req.session.pseudo){
        res.redirect('/authen')
    }else{
        let db_select = await openDb();

        // Get Post
        const post = await db_select.get(`
            SELECT Posts.id, Posts.content, Posts.image_link, Posts.date, Users.pseudo, Users.id as 'author_id', Posts.tag
            FROM Posts JOIN Users ON Posts.author_id =  Users.id
            WHERE Posts.id = ?;
        `,[req.query.post_id]);

        // Getting reacts
        const reacts = await db_select.all(`
            SELECT Reacts.react, COUNT(*)
            FROM Reacts
            WHERE Reacts.post_id = ?
            GROUP BY Reacts.react;
        `,[req.query.post_id]);

        if(reacts.length == 2){
            post.downs = reacts[0]['COUNT(*)'];
            post.ups = reacts[1]['COUNT(*)'];
        }else{
            if(reacts.length == 1){
                if(reacts[0].react == 0){
                    post.downs = reacts[0]['COUNT(*)'];
                    post.ups = 0;
                }else{
                    post.downs = 0;
                    post.ups = reacts[0]['COUNT(*)'];
                }
            }else{
                post.downs = 0;
                post.ups = 0;
            }
        }

        // Getting user reaction
        const user_reaction = await db_select.all(`
            SELECT Reacts.react
            FROM Reacts
            WHERE Reacts.post_id = ? AND Reacts.reactor_id = ?;
        `,[req.query.post_id, req.session.user_id]);

        if(user_reaction.length==0){
            post.user_reaction = -1;
        }else{
            post.user_reaction = user_reaction[0].react;
        }

        // Get Comments
        const comments = await db_select.all(`
            SELECT Comments.id, Users.pseudo, Users.id as 'author_id', Comments.date, Comments.content
            FROM Comments
                JOIN Users ON Users.id = Comments.author_id
                JOIN Posts ON Posts.id = Comments.post_id
            WHERE Posts.id = ?;
        `, [req.query.post_id]);
        post.comments = comments;

        let user = {
            id : req.session.user_id,
            pseudo : req.session.pseudo
        }

        let data = {
            user : user,
            post : post
        }
        res.render("show_post", data);
    }
})

app.get('/delete_post', (req, res)=>{
    if(!req.session.pseudo){
        res.redirect('/authen')
    }else{
        db.run(`
            DELETE FROM Posts
            WHERE Posts.id = ?;
        `, req.query.post_id, ()=>{
            if(req.query.redirect_root == "show_post"){
                res.redirect('/');
            }else{
                res.redirect('/'+req.query.redirect_root);
            }
        })
    }
})

app.get('/edit_post', async (req, res)=>{
    if(!req.session.pseudo){
        res.redirect('/authen')
    }else{
        let db_select = await openDb();

        // Get Post
        const post = await db_select.get(`
            SELECT Posts.id, Posts.content, Posts.image_link, Posts.tag
            FROM Posts
            WHERE Posts.id = ?;
        `,[req.query.post_id]);

        // Getting tags
        const post_tags = await db_select.all(`
            SELECT tag
            FROM Posts
            GROUP BY tag;
        `)

        let user = {
            id : req.session.user_id,
            pseudo : req.session.pseudo
        }
        let data = {
            user : user,
            post : post,
            post_tags : post_tags, // All available tags
            redirect_root : req.query.redirect_root
        }
        res.render("edit_post", data);
    }
})

app.post('/edit_post', async (req, res)=>{
    db.run(`
        UPDATE Posts
        SET content = ?,
            image_link = ?,
            tag = ?
        WHERE id = ?;
    `, req.body.content, req.body.image_link, req.body.tag, req.query.post_id, ()=>{
        if(req.query.redirect_root ==  "show_post"){
            res.redirect("/show_post?post_id="+req.query.post_id)
        }else{
            res.redirect("/"+req.query.redirect_root+"#post"+req.query.post_id)
        }
    })
})

app.get('/delete_comment', (req, res)=>{
    if(!req.session.pseudo){
        res.redirect('/authen')
    }else{
        db.run(`
            DELETE FROM Comments
            WHERE id = ?;
        `, req.query.comment_id, ()=>{
            if(req.query.redirect_root == "show_post"){
                res.redirect('/show_post?post_id='+req.query.post_id);
            }else{
                res.redirect('/'+req.query.redirect_root+"#post"+req.query.post_id);
            }
        })
    }
})

app.get('/edit_comment',(req, res)=>{
    res.send('Not implemented due to seek of time.')
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
            rest_main_post_filter(req.session)
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
        if(req.body.tag_new){
            db.run(`
            INSERT INTO Posts(atureauthor_id, content, image_link, tag, date, score)
            VALUES
                (?, ?, ?, ?, datetime('now', 'localtime'), 0);
            `, req.session.user_id, req.body.content, req.body.image_link, req.body.tag_new);
        }else{
            db.run(`
            INSERT INTO Posts(author_id, content, image_link, tag, date, score)
            VALUES
                (?, ?, ?, ?, datetime('now', 'localtime'), 0);
            `, req.session.user_id, req.body.content, req.body.image_link, req.body.tag_from_list);
        }

        // Getting post id for redirection and jumping into it
        db.get(`
        SELECT Posts.id FROM Posts
        WHERE author_id = ? AND content = ?;
        `, [req.session.user_id, req.body.content], (err, raw)=>{
            res.redirect("/"+req.query.redirect_root+"#post"+raw.id);
        })
    })
})

app.post('/add_comment',(req, res)=>{
    db.serialize(()=>{
        db.run(`
        INSERT INTO Comments(author_id, post_id, content, date)
        VALUES
            (?, ?, ?, datetime('now', 'localtime'));
        `, req.session.user_id, req.query.post_id, req.body.comment);
        
        update_post_score(req.query.post_id, 1)

        db.get(`
        SELECT Comments.id
        FROM Comments
        WHERE author_id = ? AND post_id = ? AND content = ?;
        `, [req.session.user_id, req.query.post_id, req.body.comment], (err, raw)=>{
            //res.redirect('/#comment'+raw.id);
            if(req.query.redirect_root == "show_post"){
                res.redirect("/show_post?post_id="+req.query.post_id);
            }else{
                res.redirect("/"+req.query.redirect_root+"#post"+req.query.post_id);
            }
        })
    })
})

app.post('/add_react',(req, res)=>{
    //Testing if the user has already a react on the post
    db.all(`
        SELECT id, react
        FROM Reacts
        WHERE reactor_id = ? AND post_id = ?;
    `,[req.session.user_id, req.query.post_id], async (err, rows) =>{
        if(rows.length == 0){
            db.run(`
            INSERT INTO Reacts(reactor_id, post_id, react, date)
            VALUES
                (?, ?, ?, datetime('now', 'localtime'));
            `, req.session.user_id, req.query.post_id, req.query.react, ()=>{
                update_post_score(req.query.post_id, 1)
                if(req.query.redirect_root == "show_post"){
                    res.redirect("/show_post?post_id="+req.query.post_id);
                }else{
                    res.redirect("/"+req.query.redirect_root+"#post"+req.query.post_id);
                }
            });
        }else{
            if(rows[0].react == req.query.react){
                db.run(`
                DELETE FROM Reacts
                WHERE id = ?;
                `,rows[0].id, () => {
                    update_post_score(req.query.post_id, -1)
                    if(req.query.redirect_root == "show_post"){
                        res.redirect("/show_post?post_id="+req.query.post_id);
                    }else{
                        res.redirect("/"+req.query.redirect_root+"#post"+req.query.post_id);
                    }
                });
            }else{

                db.run(`
                DELETE FROM Reacts
                WHERE id = ?;
                `,rows[0].id);

                db.run(`
                INSERT INTO Reacts(reactor_id, post_id, react, date)
                VALUES
                    (?, ?, ?, datetime('now', 'localtime'));
                `, req.session.user_id, req.query.post_id, req.query.react, ()=>{

                    if(req.query.redirect_root == "show_post"){
                        res.redirect("/show_post?post_id="+req.query.post_id);
                    }else{
                        res.redirect("/"+req.query.redirect_root+"#post"+req.query.post_id);
                    }

                });
            }
        }
    })
})

app.listen(3030);