const express = require('express')
const app = express();

app.use(function (req, res, next){
    console.log("HTTP request", req.method, req.url);
    next();
});

// curl localhost:3000/
app.get('/', function (req, res, next) {
    res.end("Hello Get!");
});

// curl -X POST localhost:3000/
app.post('/', function (req, res, next) {
    res.end("Hello Post!");
});

// curl -X DELETE localhost:3000/
app.delete('/', function (req, res, next) {
    res.end("Hello Delete!");
});

const http = require('http');
const PORT = 3000;

http.createServer(app).listen(PORT, function (err) {
    if (err) console.log(err);
    else console.log("HTTP server on http://localhost:%s", PORT);
});