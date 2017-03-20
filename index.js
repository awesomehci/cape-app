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

// Set up app
console.log('Configuring express application...');

var app = express();

app.set('port', (process.env.PORT || 5000));
app.use(express.static(__dirname + '/public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(expressValidator());

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

    // Set up AWS S3 storage
    console.log('Connecting to AWS services...');
    var aws = require('aws-sdk');

    app.get('/sign-s3', function(req, res) {
        var fileName = req.query['file-name'];
        var fileType = req.query['file-type'];

        var s3Params = {
            Bucket: process.env.S3_BUCKET,
            Key: fileName,
            Expires: 60,
            ContentType: fileType,
            ACL: 'public-read'
        };

        var s3 = new aws.S3();
        s3.getSignedUrl('putObject', s3Params, (err, data) => {
            if (err) {
                console.log('Error getting signed URL');
                console.log(err);
                res.end()
                return;
            }

            var returnData = {
                signedRequest: data,
                url: `https://${process.env.S3_BUCKET}.s3.amazonaws.com/${fileName}`
            };

            console.log('Ready to upload: ' + returnData.url);
            res.send(JSON.stringify(returnData));
        });
    });

    // Requests
    console.log('Loading API request routes...');
    var papers = require('./requests/papers')(express, db);
    var users = require('./requests/users').router(express, db, stormpath);

    app.use('/api', papers);
    app.use('/api', users);

    // Views
    // views is directory for all template files
    console.log('Loading views...');
    app.set('views', __dirname + '/views');
    app.set('view engine', 'ejs');

    // Index
    app.get('/view/:paper_id', function(req, res) {
        //res.render('pages/index');
        res.render('pages/view', {paper_id: req.params.paper_id}); // TODO redirect to test view page
    });

    // Create paper
    app.get('/create', stormpath.authenticationRequired, function(req, res) {
        res.render('pages/create');
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
