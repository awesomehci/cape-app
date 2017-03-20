//users.js
// Contains methods for user account management (with Stormpath)

var mongo = require('mongodb');

module.exports.postRegistrationHandler = function(db) {
    return function(account, req, res, next) {
        //console.log(account);
        console.log('Created new Stormpath account: ' + account.href);

        // Create user account in local database
        var newUser = {
            account: account.href, // href ties user instance to Stormpath account
            fullName: account.fullName,
            firstName: account.givenName,
            lastName: account.surname,
            email: account.email
        };

        // Insert to collection
        db.collection('users').insertOne(newUser, function(err, result) {
            if (err || !result.insertedCount) {
                // If this fails, then Stormpath is not giving us a unique href
                console.log('Database Error\n' + err.message);
                return;
            }

            console.log(result.ops[0]);
            console.log('Created local database user: ' + result.insertedId);
        });

        next();
    };
};

module.exports.router = function(express, db, stormpath) {
    var router = express.Router();

    /**
     * GET /users
     * Retrieve a list of users
     */
    router.get('/users', function(req, res) {
        // Retrieve list of users from collection (exclude personal info)
        db.collection('users').find({}, {fields: {account: 0, email: 0}}).toArray(function(err, docs) {
            if (err) {
                res.status(500).send('Database Error\n' + err.message);
                return;
            }

            res.status(200).json({ users: docs });
            console.log('List users (Count: ' + docs.length + ')');
        });
    });

    /**
     * GET /users/:userId
     * Retrieve info for a specific user
     */
    router.get('/users/:userId', function(req, res) {
        // Validate data
        req.checkParams('userId', 'userId is required').notEmpty();

        req.getValidationResult().then(function(result) {
            if (!result.isEmpty()) {
                res.status(400).send('Bad Request');
                return;
            }

            // Check for valid paperId
            if (!mongo.ObjectID.isValid(req.params.userId)) {
                res.status(400).send('Invalid userId');
                return;
            }

            var oId = new mongo.ObjectID(req.params.userId); // Create object id

            // Find in database
            db.collection('users').findOne({ _id: oId }, {fields: {account: 0, email: 0}}, function(err, doc) {
                if (err) {
                    res.status(500).send('Database Error\n' + err.message);
                    return;
                }

                // No matching user was found
                if (!doc) {
                    res.status(404).send('User not found!');
                    return;
                }

                res.status(200).json(doc);
                console.log(doc);
                console.log('Retrieved user: ' + doc._id);
            });
        });
    });

    /**
     * GET /user
     * Retrieve the currently authenticated user
     */
    router.get('/user', stormpath.authenticationRequired, function(req, res) {
        console.log(req.user.href);

        // Find account in database
        db.collection('users').findOne({ account: req.user.href }, function(err, doc) {
            if (err) {
                res.status(500).send('Database Error\n' + err.message);
                return;
            }

            // No matching user was found
            if (!doc) {
                res.status(404).send('User not found!');
                return;
            }

            res.status(200).json(doc);
            console.log(doc);
            console.log('Retrieved user: ' + doc._id);
        });
    });

    /**
     * GET /users/:userId/papers
     * Retrieve a list of papers for the user
     */
    router.get('/users/:userId/papers', function(req, res) {
        // Validate data
        req.checkParams('userId', 'userId is required').notEmpty();

        req.getValidationResult().then(function(result) {
            if (!result.isEmpty()) {
                res.status(400).send('Bad Request');
                return;
            }

            // Check for valid paperId
            if (!mongo.ObjectID.isValid(req.params.userId)) {
                res.status(400).send('Invalid userId');
                return;
            }

            // Find in database
            var oId = new mongo.ObjectID(req.params.userId);
            db.collection('papers').find({ "owner._id": oId }).toArray(function(err, docs) {
                if (err) {
                    res.status(500).send('Database Error\n' + err.message);
                    return;
                }

                res.status(200).json({ papers: docs });
                console.log('List papers (Count: ' + docs.length + ')');
            });
        });
    });

    /**
     * GET /users/:userId/proofreads
     * Retrieve a list of proofreads for the user
     */
    router.get('/users/:userId/proofreads', function(req, res) {
        // Validate data
        req.checkParams('userId', 'userId is required').notEmpty();

        req.getValidationResult().then(function(result) {
            if (!result.isEmpty()) {
                res.status(400).send('Bad Request');
                return;
            }

            // Check for valid paperId
            if (!mongo.ObjectID.isValid(req.params.userId)) {
                res.status(400).send('Invalid userId');
                return;
            }

            // Find in database
            var oId = new mongo.ObjectID(req.params.userId);
            db.collection('papers').find({ "proofreaders.user._id": oId }).toArray(function(err, docs) {
                if (err) {
                    res.status(500).send('Database Error\n' + err.message);
                    return;
                }

                res.status(200).json({ proofreads: docs });
                console.log('List proofreads (Count: ' + docs.length + ')');
            });
        });
    });

    return router;
};
