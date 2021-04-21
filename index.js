const express = require('express')
const app = express();

var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('Data_Base.db');

const bodyParser = require('body-parser');
app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies

app.set('views', './views');
app.set('view engine', 'jade');

app.get('/',(req, res)=>{
    res.send("Teilen");
});

app.get('/inscription', (req, res)=>{

    res.render('inscription');

});

app.post('/inscription',(req, res)=>{
    // Checking info & saving data
    db.serialize(function() {

        db.run(`
            INSERT INTO Users(pseudo, email, password)
            VALUES
                (?, ?, ?);
        `, req.body.pseudo, req.body.email, req.body.password);
    
    });
    res.redirect('/');
});

db.close();
app.listen(3000);