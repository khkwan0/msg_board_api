var express = require('express');
var session = require('express-session');
var monk = require('monk');
var MongoStore = require('connect-mongodb-session')(session);
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
//var bodyParser = require('body-parser');
var bodyParser = require('express-busboy');
var config = require('./config.js');
var db = monk(config.mongo.host+':'+config.mongo.port+'/'+config.mongo.db);

var index = require('./routes/index');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

bodyParser.extend(app, {
  upload: true,
  mimeTypeLimit: ['image/jpeg','image/png','image/gif'],
  json: true,
  urlencoded: true
});



// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(function(req, res, next) {
 res.setHeader('Access-Control-Allow-Origin', ['http://23.239.1.81:3000']);
// res.setHeader('Access-Control-Allow-Origin', 'http://23.239.1.81:5000');
 res.setHeader('Access-Control-Allow-Credentials', 'true');
 res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
 res.setHeader('Access-Control-Allow-Headers', 'Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers, Set-Cookie, Cookie');
//and remove cacheing so we get the most recent comments
 res.setHeader('Cache-Control', 'no-cache');
 next();
});
/*
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true}));
*/
app.use(cookieParser());
app.use(session({
    secret: config.session.secret,
    store: new MongoStore({
        uri: 'mongodb://'+config.session.store.host+':'+config.session.store.port+'/'+config.session.store.db ,
        collection: config.session.store.collection
    }),
    saveUninitialized: false,
    resave: false
}));
app.use(express.static(path.join(__dirname, 'public')));
app.use((req, res, next) => {
  req.db = db;
  next();
});

app.use('/', index);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  console.log(err.stack);
  res.status(err.status || 500).send();
//  res.render('error');
});

module.exports = app;
