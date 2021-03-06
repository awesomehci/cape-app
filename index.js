/**
 * Requires
 */

var express = require('express');
var bodyParser = require('body-parser');
var expressValidator = require('express-validator');
var stormpath = require('express-stormpath');

/**
 * Check for production/development flag
 */

var production = process.env.NODE_ENV == "production";
console.log('Mode: ' + (production ? 'PROD' : 'DEV'));

// Load .env for development
if (!production) {
    console.log('DEV: Load .env file');
    require('dotenv').config()
}

/**
 * Configure express
 */

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

/**
 * mLab MongoDB initialization
 */

// Set up DB connection
console.log('Connecting to mLab database server...');
var mongo = require('mongodb');
var MongoClient = mongo.MongoClient;
MongoClient.connect(process.env.MONGODB_URI, function(err, db) {
    if(err) {
        // Handle error
        console.log('Error connecting to database: ' + err);
        return;
    }
    console.log('Connected to database server');

    /**
     * Stormpath user management initialization
     */

    // Initialize Stormpath (for user account authentication)
    console.log('Initializing Stormpath middleware...');
    var postRegistrationHandler = require('./requests/users').postRegistrationHandler(db);

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

    /**
     * AWS S3 initialization
     */

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
                res.end();
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

    /**
     * API requests
     */

    console.log('Loading API request routes...');
    var papers = require('./requests/papers')(express, db);
    var users = require('./requests/users').router(express, db, stormpath);

    app.use('/api', papers);
    app.use('/api', users);

    /**
     * Views
     */

    // views is directory for all template files
    console.log('Loading views...');
    app.set('views', __dirname + '/views');
    app.set('view engine', 'ejs');

    /**
     * Routes
     */

    // Index
    app.get('/',  stormpath.authenticationRequired, function(req, res) {
        res.render('pages/account');
    });

    // View paper
    app.get('/view/:paper_id', stormpath.authenticationRequired, function(req, res) {
        // Get paper url
        db.collection('papers').findOne({ _id: new mongo.ObjectID(req.params.paper_id) }, function(err, doc) {
            var url = '';

            if (doc) {
                // Pass paper_id to ejs file
                res.render('pages/view', { paper_id: req.params.paper_id, paper_url: doc.url });
            }
        });
    });

    // Create paper
    app.get('/create', stormpath.authenticationRequired, function(req, res) {
        res.render('pages/create');
    });

    // Update paper
    app.get('/update/:paper_id', stormpath.authenticationRequired, function(req, res) {
        // Pass paper_id to ejs file (enables create to function as edit)
        res.render('pages/create', { paper_id: req.params.paper_id });
    });

    /**
     * Start app
     */

    console.log('Starting express app...');
    console.log('Waiting for Stormpath...');
    app.on('stormpath.ready', function() {
        app.listen(app.get('port'), function() {
            console.log('Node app is running on port', app.get('port'));
        });
    });

    //db.close();
});
