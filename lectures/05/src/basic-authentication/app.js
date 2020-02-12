const bcrypt = require('bcrypt');
const express = require('express')
const app = express();

const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: false }));

const Datastore = require('nedb');
let users = new Datastore({ filename: 'db/users.db', autoload: true });

let isAuthenticated = function(req, res, next) {
    // extract data from HTTP request
    if (!(req.headers.authorization)) return res.status(401).end("access denied");
    let encodedString = req.headers.authorization.split(' ')[1];
    let decodedString = Buffer.from(encodedString, 'base64').toString("ascii").split(":");
    let username = decodedString[0];
    let password = decodedString[1];
    // retrieve user from the database
    users.findOne({_id: username}, function(err, user){
        if (err) return res.status(500).end(err);
        if (!(user)) return res.status(401).end("access denied"); // unknown user
        bcrypt.compare(password, user.hash, function(err, valid) {
           if (err) return res.status(500).end(err);
           if (!valid) return res.status(401).end("access denied"); //wrong password
           return next();
        });
    });
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
            if (err) return res.status(500).end(err);
            bcrypt.hash(password, salt, function(err, hash) {
                // insert new user into the database
                users.update({_id: username},{_id: username, hash: hash}, {upsert: true}, function(err){
                    if (err) return res.status(500).end(err);
                    return res.end("account created");
                });
            });
        });
    });
});

// curl -u admin:pass4admin http://localhost:3000/private/
// curl http://admin:pass4admin@localhost:3000/private/
app.get('/private/', isAuthenticated, function (req, res, next) {
    return res.end("This is private");
});

// curl http://localhost:3000/public/
app.get('/public/', function (req, res, next) {
    return res.end("This is public");
});

const http = require('http');
const PORT = 3000;

http.createServer(app).listen(PORT, function (err) {
    if (err) console.log(err);
    else console.log("HTTP server on http://localhost:%s", PORT);
});
