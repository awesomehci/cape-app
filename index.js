var express = require('express');
var app = express();

app.set('port', (process.env.PORT || 5000));

app.use(express.static(__dirname + '/public'));

// views is directory for all template files
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

//Renders original "index" page
//app.get('/', function(request, response) {
//  response.render('pages/index');
//});

//Renders new "view" page
app.get('/', function(request, response) {
  response.render('pages/view');
});


app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});


