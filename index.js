// Place your server entry point code here
const minimist = require('minimist')
const express = require('express')
const fs = require('fs')
const morgan = require('morgan')
const logdb = require('./src/services/database.js')

const app = express()

app.use(express.urlencoded({extended: true}));
app.use(express.json());



const args = require('minimist')(process.argv.slice(2))
const port = args.port || process.env.PORT || 3000
const debug = args.debug || false
const log = args.log || true;

// If --help or -h, echo help text to STDOUT and exit
if (args.help || args.h) {
    const help = (`
server.js [options]
--port	Set the port number for the server to listen on. Must be an integer
            between 1 and 65535.
--debug	If set to true, creates endlpoints /app/log/access/ which returns
            a JSON access log from the database and /app/error which throws 
            an error with the message "Error test successful." Defaults to 
            false.
--log		If set to false, no log files are written. Defaults to true.
            Logs are always written to database.
--help	Return this message and exit.
`)
    console.log(help)
    process.exit(0)
}

const server = app.listen(port, () => {
    console.log(`<!DOCTYPE html>`)
})

if (debug) {
    app.get('/app/log/access/', (res, req, next) => {
        const stmt = logdb.prepare('SELECT * FROM accesslog').all()
        req.status(200).json({stmt})
        next()
    });

    app.get('/app/error/', (res, req, next) => {
        throw new Error('Error test successful')
    })
}

if (log != 'false') {
    app.use( (req, res, next) => {
        let logdata = {
            remoteaddr: req.ip,
            remoteuser: req.user,
            time: Date.now(),
            method: req.method,
            url: req.url,
            protocol: req.protocol,
            httpversion: req.httpVersion,
            status: res.statusCode,
            referer: req.headers['referer'],
            useragent: req.headers['user-agent']
        }
    
        const stmt = logdb.prepare('INSERT INTO accesslog (remoteaddr, remoteuser, time, method, url, protocol, httpversion, status, referrer, useragent) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    
        const info = stmt.run(logdata.remoteaddr, logdata.remoteuser, logdata.time,
            logdata.method, logdata.url, logdata.protocol, logdata.httpversion,
            logdata.status, logdata.referer, logdata.useragent)
        next()
    })
    const accesslog = fs.createWriteStream('./access.log', { flags: 'a' })
    // Set up the access logging middleware
    app.use(morgan('combined', { stream: accesslog }))
}






app.get('/app', (req, res) => {
    res.status(200).send("OK")
    res.type("text/plain")
})

app.get('/app/flip', (req, res) => {
    res.status(200).json({ "flip" : coinFlip()})
})

app.get('/app/flips/:number', (req, res) => {
    var flips = coinFlips(req.params.number);
    res.status(200).json({ "raw" : flips,
                           "summary" : countFlips(flips)})
})

app.get('/app/flip/call/:call', (req, res) => {
    var flip = flipACoin(req.params.call)
    res.status(200).json(flip)
})

app.use(function(req, res) {
    res.status(404).send("Endpoint does not exist")
    res.type("text/plain")
})






//Supporting functions

function coinFlip() {
    var flip = Math.random();
    if (flip < 0.5) {
      return "tails"
    }
    return "heads"
}

function coinFlips(numFlips) {
    var flips = new Array();
    for (let i=0;i<numFlips;i++) {
      flips.push(coinFlip());
    }
    return flips;
}

function countFlips(array) {
    var heads = 0;
    var tails = 0;
    for (const flip of array) {
      (flip === "heads") ? heads ++ : tails ++;
    }
    return { "tails": tails, "heads": heads }
}

function flipACoin(call) {
    const flip = coinFlip();
    const result = (call === flip) ? "win" : "lose";
    return { "call": call, "flip":flip, "result":result }
}