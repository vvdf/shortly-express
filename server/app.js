const express = require('express');
const path = require('path');
const utils = require('./lib/hashUtils');
const partials = require('express-partials');
const bodyParser = require('body-parser');
const Auth = require('./middleware/auth');
const models = require('./models');
const cookieParser = require('./middleware/cookieParser');

const app = express();
app.use(cookieParser);
app.use(Auth.createSession);

app.set('views', `${__dirname}/views`);
app.set('view engine', 'ejs');
app.use(partials());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

app.get('/',
  (req, res) => {
    const isLoggedIn = !!req.session.userId;
    if (isLoggedIn) {
      res.render('index');
    } else {
      res.redirect('/login');
    }
  });

app.get('/create',
  (req, res) => {
    const isLoggedIn = !!req.session.userId;
    if (isLoggedIn) {
      res.render('index');
    } else {
      res.redirect('/login');
    }
  });

app.get('/links',
  (req, res, next) => {

    const isLoggedIn = !!req.session.userId;
    if (isLoggedIn) {
      models.Links.getAll()
        .then(links => {
          res.status(200).send(links);
        })
        .error(error => {
          res.status(500).send(error);
        });
    } else {
      res.redirect('/login');
    }
  });

app.post('/links',
  (req, res, next) => {
    var url = req.body.url;
    if (!models.Links.isValidUrl(url)) {
      // send back a 404 if link is not valid
      return res.sendStatus(404);
    }

    return models.Links.get({ url })
      .then(link => {
        if (link) {
          throw link;
        }
        return models.Links.getUrlTitle(url);
      })
      .then(title => {
        return models.Links.create({
          url: url,
          title: title,
          baseUrl: req.headers.origin
        });
      })
      .then(results => {
        return models.Links.get({ id: results.insertId });
      })
      .then(link => {
        throw link;
      })
      .error(error => {
        res.status(500).send(error);
      })
      .catch(link => {
        res.status(200).send(link);
      });
  });

/************************************************************/
// Write your authentication routes here
/************************************************************/

app.get('/login',
  (req, res) => {
    res.render('login');
  });

app.get('/signup',
  (req, res) => {
    res.render('signup');
  });

app.post('/signup', (req, res) => {
  const { username, password } = req.body;
  models.Users.create({ username, password })
    .then(() => res.redirect('/'))
    .catch(err => {
      console.log(err.sqlMessage);
      if (err.sqlMessage.indexOf('Duplicate') > -1) {
        res.redirect('/signup');
      } else {
        res.status(500).send();
      }
    });
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  models.Users.get({ username })
    .then(userData => {
      // register/create a session
      // get user ID of _username_
      // generate a hash
      return models.Users.compare(password, userData.password, userData.salt);
    })
    .then(loginSuccess => {
      if (loginSuccess) {
        console.log('Successful login');
        res.status(200).send('Successful Login Beep Boop');
      } else {
        throw 'Invalid Username and Password combination';
      }
    })
    .catch(err => {
      if (err === 'Invalid Username and Password combination') {
        res.status(500).send(err);
      } else {
        res.status(500).send();
      }
    });
});

/************************************************************/
// Handle the code parameter route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/:code', (req, res, next) => {

  return models.Links.get({ code: req.params.code })
    .tap(link => {
      if (!link) {
        throw new Error('Link does not exist');
      }
      return models.Clicks.create({ linkId: link.id });
    })
    .tap(link => {
      return models.Links.update(link, { visits: link.visits + 1 });
    })
    .then(({ url }) => {
      res.redirect(url);
    })
    .error(error => {
      res.status(500).send(error);
    })
    .catch(() => {
      res.redirect('/');
    });
});

module.exports = app;
