var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

/**
 * Routes
 */
var routes = require('./routes/index');
var login = require('./routes/login');
var logout = require('./routes/logout');
var users = require('./routes/users');

var flash = require('connect-flash');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var models = require('./models');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

app.use(flash());

/**
 * Sessions
 */
var session = require('express-session');
var env = process.env.NODE_ENV || 'development';
var config = require(__dirname + '/config/config.json')[env];

var sessionConfig = {
  secret: 'supersecretkey',
  resave: false,
  saveUninitialized: false
};

if (env == 'production') {
  var pgSession = require('connect-pg-simple')(session);
  sessionConfig.store = new pgSession({
    pg: require('pg'),
    conString:
      'postgres://' + 
      config.username + ':' +
      config.password + '@' +
      config.host + ':5432/' +
      config.database 
  });
}

app.use(session(sessionConfig));

/**
 * Passport
 */
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy({
    usernameField: 'email'
  },
  function(email, password, done) {
    models.Agent.findOne({ where: { email: email } }).then(function (agent) {
      if (!agent) { return done(null, false); }
      models.Agent.validPassword(password, agent.password, function(err, res) {
        if (err) console.log(err);
        return done(err, res);
      }, agent);
    }).catch(function(err) {
      return done(err);
    });
  }
));
passport.serializeUser(function(agent, done) {
  done(null, agent);
});
passport.deserializeUser(function(obj, done) {
  done(null, obj);
});

/**
 * Routes
 */
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', routes);
app.use('/users', users);
app.use('/login', login);
app.use('/logout', logout);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});


module.exports = app;
