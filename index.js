var glob = require('glob');
var express = require('express');
var stylus = require('stylus');
var nib = require('nib');
var bodyParser = require('body-parser');
var tools = require('./server/tools');
var constants = require('./constants');

var app = express();
var server = require('http').createServer(app);
require('./socket')(server);

function compile(str, path) {
  return stylus(str)
    .set('filename', path)
    .use(nib());
}

app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');

app.use(stylus.middleware({ src: __dirname + '/public', compile: compile}));
app.use(express.static(__dirname + '/public'));

app.get('/partials/*.html', function (req, res) {
  return res.render(__dirname + '/partials/' + req.params[0]);
});

app.get('/images/sources/:sourceId/:image', function (req, res) {
  res.sendFile(
    constants.SOURCES_PATH + '/' + req.params.sourceId + '/' + req.params.image,
    function (err) {
      if (err) {
        return res.status(err.status).end();
      }
    }
  );
});

app.use(bodyParser.json({limit: '10mb'}));
app.use(bodyParser.urlencoded({ extended: true }));

// Load API and create route automatically
glob.sync('api/**/*.js').forEach(function (api) {
  var path = api.split('/');
  var method = path.pop().replace('.js', '');
  var args = require('./' + api);
  if (!Array.isArray(args)) {
    args = [args];
  }
  args.unshift('/' + path.join('/'));
  app[method].apply(app, args);
});

app.get('*', function (req, res) {
  res.render('index', {systems: JSON.stringify(require('./systems.json'))});
});

Promise
  .resolve()
  .then(function () {
    return tools.source.list();
  })
  .then(function () {
    server.listen(app.get('port'), function () {
      console.log('Express server listening on port ' + app.get('port'));
    });
  })
  .catch(function (err) {
    console.log(err);
  });