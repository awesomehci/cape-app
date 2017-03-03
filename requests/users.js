//users.js
// Contains methods for user account management (with Stormpath)

var mongo = require('mongodb');

module.exports.postRegistrationHandler = function(db) {
    return function(account, req, res, next) {
        //console.log(account);
        console.log('Created new Stormpath account: ' + account.href);

        // Create user account in local database
        newUser = {
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
