const express = require('express')
const app = express();

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
    res.redirect('/');
});


app.listen(3000);