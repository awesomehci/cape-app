var express = require('express');
var bodyParser = require('body-parser');
var expressValidator = require('express-validator');
var stormpath = require('express-stormpath');

var production = process.env.NODE_ENV == "production";
console.log('Mode: ' + (production ? 'PROD' : 'DEV'));

// Load .env for development
if (!production) {
    console.log('DEV: Load .env file');
    require('dotenv').config()
}

// Redirect to HTTPS (secure)
if (production) {
    console.log('PROD: Enable redirect to HTTPS');
    app.all('*', function (req, res, next) {
        if (req.headers['x-forwarded-proto'] != 'https') {
            res.redirect('https://' + req.headers.host + req.url)
        } else {
            next();
        }
    });
}

// Set up DB connection
console.log('Connecting to mLab database server...');
var MongoClient = require('mongodb').MongoClient;
MongoClient.connect(process.env.MONGODB_URI, function(err, db) {
    if(err) {
        // Handle error
        console.log('Error connecting to database: ' + err);
        return;
    }
    console.log('Connected to database server');

    // Set up app
    console.log('Configuring express application...');
    var app = express();
    app.set('port', (process.env.PORT || 5000));
    app.use(express.static(__dirname + '/public'));
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({extended: true}));
    app.use(expressValidator());

    // Initialize Stormpath (for user account authentication)
    console.log('Initializing Stormpath middleware...');
    var postRegistrationHandler = require('./requests/users').postRegistrationHandler(db)

    app.use(stormpath.init(app, {
        website: true,
        web: {
            login: {
                form: {
                    fields: {
                        login: {
                            label: 'Email',
                            placeholder: 'Email'
                        }
                    }
                }
            }
        },
        postRegistrationHandler: postRegistrationHandler
    }));

    // Requests
    console.log('Loading API request routes...');
    var papers = require('./requests/papers')(express, db);
    app.use('/api', papers);

    // Views
    // views is directory for all template files
    console.log('Loading views...');
    app.set('views', __dirname + '/views');
    app.set('view engine', 'ejs');

    // Index
    app.get('/', function(req, res) {
        //res.render('pages/index');
        res.render('pages/view'); // TODO redirect to test view page
    });

    // Start app
    console.log('Starting express app...');
    console.log('Waiting for Stormpath...');
    app.on('stormpath.ready', function() {
        app.listen(app.get('port'), function() {
            console.log('Node app is running on port', app.get('port'));
        });
    });
    
    //db.close();
});
