var express = require('express');
var logger = require('morgan');
var bodyParser = require('body-parser')

var indexRouter = require('./routes/index');

var app = express();
app.disable('x-powered-by');

app.use(express.static('public'))
app.use(logger('dev'));
app.use(express.json());
app.use(bodyParser.text({type: '*/*'}));
app.use(express.urlencoded({ extended: false }));

app.use('/', indexRouter);

module.exports = app;