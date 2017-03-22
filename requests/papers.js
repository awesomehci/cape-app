//papers.js
// Contains REST methods to create, retrieve, and modify papers.

var util = require('util');
var mongo = require('mongodb');

module.exports = function(express, db) {
    var router = express.Router();

    /**
     * GET /papers
     * Retrieve a list of papers
     */
    router.get('/papers', function(req, res) {
        // Retrieve list of papers from collection
        db.collection('papers').find({}).toArray(function(err, docs) {
            if (err) {
                res.status(500).send('Database Error\n' + err.message);
                return;
            }

            res.status(200).json({ papers: docs });
            console.log('List papers (Count: ' + docs.length + ')');
        });
    });

    /**
     * GET /papers/:paperId
     * Retrieve info for a specific paper
     */
    router.get('/papers/:paperId', function(req, res) {
        // Validate data
        req.checkParams('paperId', 'paperId is required').notEmpty();

        req.getValidationResult().then(function(result) {
            if (!result.isEmpty()) {
                res.status(400).send('Bad Request');
                return;
            }

            // Check for valid paperId
            if (!mongo.ObjectID.isValid(req.params.paperId)) {
                res.status(400).send('Invalid paperId');
                return;
            }

            var oId = new mongo.ObjectID(req.params.paperId); // Create object id

            // Find in database
            db.collection('papers').findOne({ _id: oId }, function(err, doc) {
                if (err) {
                    res.status(500).send('Database Error\n' + err.message);
                    return;
                }

                // No matching paper was found
                if (!doc) {
                    res.status(404).send('Paper not found!');
                    return;
                }

                res.status(200).json(doc);
                console.log(doc);
                console.log('Retrieved paper: ' + doc._id);
            });
        });
    });

    /**
     * POST /papers
     * Create a new paper with the given info
     */
    router.post('/papers', function(req, res) {
        // Validate data
        req.checkBody('title', 'title is required').notEmpty();
        req.checkBody('owner', 'owner is required').notEmpty();

        req.getValidationResult().then(function(result) {
            if (!result.isEmpty()) {
                res.status(400).send('Bad Request\n' + util.inspect(result.array()));
                return;
            }

            // Check for valid owner Id
            if (!mongo.ObjectID.isValid(req.body.owner)) {
                res.status(400).send('Invalid owner');
                return;
            }

            // Get owner data (insert into paper)
            var oId = new mongo.ObjectID(req.body.owner); // Create object id
            db.collection('users').findOne({ _id: oId }, {fields: {account: 0, email: 0}}, function(err, doc) {
                if (err) {
                    res.status(500).send('Database Error\n' + err.message);
                    return;
                }

                // No matching paper was found
                if (!doc) {
                    res.status(404).send('Owner not found!');
                    return;
                }

                // Make new paper object from POST body
                var currentTime = new Date();

                var newPaper = {
                    valid: true,
                    created: currentTime,
                    title: req.body.title,
                    owner: doc,
                    url: req.body.url,
                    preferences: req.body.preferences,
                    needs: req.body.needs,
                    proofreaders: [] // List of user ids
                };

                // Get proofreaders from database
                var oIds = req.body.proofreaders.map(function(x) { return new mongo.ObjectId(x); });
                db.collection('users').find({_id: {$in: oIds}}, {fields: {account: 0, email: 0}}).toArray(function(err, docs) {
                    // Make list of proofreaders (user, responded, url)
                    for (var i in docs) {
                        newPaper.proofreaders.push({ user: docs[i], responded: false, url: null });
                    }

                    // Insert in collection
                    db.collection('papers').insertOne(newPaper, function(err, result) {
                        if (err || !result.insertedCount) {
                            res.status(500).send('Database Error\n' + err.message);
                            return;
                        }

                        res.status(201).json(result.ops[0]);
                        console.log(result.ops[0]);
                        console.log('Created paper: ' + result.insertedId);
                    });
                });
            });
        });
    });

    /**
     * POST /papers/:paperId/uploadProofread
     * Updates the paper with a proofreader's uploaded copy
     */
    router.post('/papers/:paperId/uploadProofread', function(req, res) {
        // Validate data
        req.checkBody('proofreader', 'proofreader is required').notEmpty();
        req.checkBody('url', 'url is required').notEmpty();

        req.getValidationResult().then(function(result) {
            if (!result.isEmpty()) {
                res.status(400).send('Bad Request\n' + util.inspect(result.array()));
                return;
            }

            // Check for valid paperId
            if (!mongo.ObjectID.isValid(req.params.paperId)) {
                res.status(400).send('Invalid paperId');
                return;
            }

            // Check for valid proofreaderId
            if (!mongo.ObjectID.isValid(req.body.proofreader)) {
                res.status(400).send('Invalid proofreaderId');
                return;
            }

            var oId = new mongo.ObjectID(req.params.paperId); // Create object id
            var pId = new mongo.ObjectID(req.body.proofreader);

            // Update in database (must match id PLUS proofreader must exist)
            db.collection('papers').updateOne({ _id: oId, "proofreaders.user._id": pId }, { $set: { "proofreaders.$.responded": true, "proofreaders.$.url": req.body.url }}, function(err, result) {
                if (err) {
                    res.status(500).send('Database Error\n' + err.message);
                    return;
                }

                res.status(200).send('Proofreader updated');
                console.log('Updated: ' + result.upsertedId);
            });
        });
    });

    /**
     * PATCH /papers/:paperId
     * Update the info for a paper
     */
    router.patch('/papers/:paperId', function(req, res) {
        // Validate data
        req.checkParams('paperId', 'paperId is required').notEmpty();

        req.getValidationResult().then(function(result) {
            if (!result.isEmpty()) {
                res.status(400).send('Bad Request\n' + util.inspect(result.array()));
                return;
            }

            // Check for valid paperId
            if (!mongo.ObjectID.isValid(req.params.paperId)) {
                res.status(400).send('Invalid paperId');
                return;
            }

            var oId = new mongo.ObjectID(req.params.paperId); // Create object id

            // TODO CONTINUE
            res.status(501).send('Not Implemented');
        });
    });

    /**
     * DELETE /papers/:paperId
     * Deletes a specific paper from the collection
     */
    router.delete('/papers/:paperId', function(req, res) {
        // Validate data
        req.checkParams('paperId', 'paperId is required').notEmpty();

        req.getValidationResult().then(function(result) {
            if (!result.isEmpty()) {
                res.status(400).send('Bad Request\n' + util.inspect(result.array()));
                return;
            }

            // Check for valid paperId
            if (!mongo.ObjectID.isValid(req.params.paperId)) {
                res.status(400).send('Invalid paperId');
                return;
            }

            var oId = new mongo.ObjectID(req.params.paperId); // Create object id

            // Delete paper from collection
            db.collection('papers').deleteOne({ _id: oId }, function(err, result) {
                if (err) {
                    res.status(500).send('Database Error\n' + err.message);
                    return;
                }

                if (!result.deletedCount) {
                    res.status(404).send('Paper not found!');
                    return;
                }

                res.status(200).send('Paper Deleted');
                console.log('Deleted paper: ' + req.params.paperId);
            });
        });
    });

    return router;
};
