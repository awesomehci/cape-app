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

            oId = new mongo.ObjectID(req.params.paperId); // Create object id

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

            // Make new paper object from POST body
            newPaper = {
                title: req.body.title,
                owner: req.body.owner,
                url: req.body.url,
                preferences: req.body.preferences,
                proofreaders: []
            }

            // Add proofreaders (include responded/status flag)
            for (var i in req.body.proofreaders) {
                newPaper.proofreaders.push({ name: req.body.proofreaders[i], responded: false, url: null });
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

            oId = new mongo.ObjectID(req.params.paperId); // Create object id

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

            oId = new mongo.ObjectID(req.params.paperId); // Create object id

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
