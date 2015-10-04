'use strict';
 
var express = require('express');
var http = require('http');
var app = express();
 
// all environments
app.set('port', process.env.PORT || 5000);
 
// express/connect middleware
app.use(morgan('dev'));
 
// serve up static assets
app.use(express.static(path.join(__dirname, 'app')));
 
http.createServer(app).listen(app.get('port'), function () {
  console.log('myApp server listening on port ' + app.get('port'));
});

