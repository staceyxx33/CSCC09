const bcrypt = require('bcrypt');
const path = require('path');
const express = require('express');
const app = express();

const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const Datastore = require('nedb');
let users = new Datastore({ filename: 'db/users.db', autoload: true });
let items = new Datastore({ filename: path.join(__dirname,'db', 'items.db'), autoload: true, timestampData : true});

let Item = function(content, username){
    this.content = content;
    this.owner = username;
};

const cookie = require('cookie');

const session = require('express-session');
app.use(session({
    secret: 'please change this secret',
    resave: false,
    saveUninitialized: true,
}));

app.use(function(req, res, next){
    req.user = ('user' in req.session)? req.session.user : null;
    let username = (req.user)? req.user._id : '';
    res.setHeader('Set-Cookie', cookie.serialize('username', username, {
          path : '/', 
          maxAge: 60 * 60 * 24 * 7 // 1 week in number of seconds
    }));
    next();
});

app.use(function (req, res, next){
    console.log("HTTP request", req.method, req.url, req.body);
    next();
});

let isAuthenticated = function(req, res, next) {
    if (!req.user) return res.status(401).end("access denied");
    next();
};

// curl -X POST -d "username=admin&password=pass4admin" http://localhost:3000/signup/
app.post('/signup/', function (req, res, next) {
    // extract data from HTTP request
    if (!('username' in req.body)) return res.status(400).end('username is missing');
    if (!('password' in req.body)) return res.status(400).end('password is missing');
    let username = req.body.username;
    let password = req.body.password;
    // check if user already exists in the database
    users.findOne({_id: username}, function(err, user){
        if (err) return res.status(500).end(err);
        if (user) return res.status(409).end("username " + username + " already exists");
        // generate a new salt and hash
        bcrypt.genSalt(10, function(err, salt) {
            bcrypt.hash(password, salt, function(err, hash) {
                // insert new user into the database
                users.update({_id: username},{_id: username, hash: hash}, {upsert: true}, function(err){
                    if (err) return res.status(500).end(err);
                    return res.redirect("/");
                });
            });
        });
    });
});

// curl -X POST -d "username=admin&password=pass4admin" -c cookie.txt http://localhost:3000/signin/
app.post('/signin/', function (req, res, next) {
    // extract data from HTTP request
    if (!('username' in req.body)) return res.status(400).end('username is missing');
    if (!('password' in req.body)) return res.status(400).end('password is missing');
    let username = req.body.username;
    let password = req.body.password;
    // retrieve user from the database
    users.findOne({_id: username}, function(err, user){
        if (err) return res.status(500).end(err);
        if (!user) return res.status(401).end("access denied");
        bcrypt.compare(password, user.hash, function(err, valid) {
           if (err) return res.status(500).end(err);
           if (!valid) return res.status(401).end("access denied");
           // start a session
           req.session.user = user;
           res.setHeader('Set-Cookie', cookie.serialize('username', user._id, {
                 path : '/', 
                 maxAge: 60 * 60 * 24 * 7 // 1 week in number of seconds
           }));
           return res.redirect("/");
        });
    });
});

// curl -b cookie.txt -c cookie.txt http://localhost:3000/signout/
app.get('/signout/', function(req, res, next){
    req.session.destroy();
    res.setHeader('Set-Cookie', cookie.serialize('username', '', {
          path : '/', 
          maxAge: 60 * 60 * 24 * 7 // 1 week in number of seconds
    }));
    return res.redirect("/");
});

app.get('/api/items/', function (req, res, next) {
    items.find({}).sort({createdAt:-1}).limit(5).exec(function(err, items) { 
        if (err) return res.status(500).end(err);
        return res.json(items.reverse());
    });
});

app.post('/api/items/', isAuthenticated, function (req, res, next) {
    items.insert({content: req.body.content, owner: req.user._id}, function (err, item) {
        if (err) return res.status(500).end(err);
        return res.json(item);
    });
});

app.get('/api/items/:id/', function (req, res, next) {
    items.findOne({_id: req.params.id}, function(err, item){
        if (err) return res.status(500).end(err);
        if (!item) return res.status(404).end("Item id #" + req.params.id + " does not exists");
        return res.json(item);
    });    
});

app.delete('/api/items/:id/', isAuthenticated, function (req, res, next) {
    items.findOne({_id: req.params.id}, function(err, item){
        if (err) return res.status(500).end(err);
        if (item.owner !== req.user._id) return res.status(403).end("forbidden");
        if (!item) return res.status(404).end("Item id #" + req.params.id + " does not exists");
        items.remove({ _id: item._id }, { multi: false }, function(err, num) {  
            res.json(item);
         });
    });    
});

app.use(express.static('static'));

const http = require('http');
const PORT = 3000;

http.createServer(app).listen(PORT, function (err) {
    if (err) console.log(err);
    else console.log("HTTP server on http://localhost:%s", PORT);
});