const models = require('../models');
const Promise = require('bluebird');

const createAnonymousSession = () => new Promise((resolve, reject) => {

  models.Sessions.create()
    .then(message => message.insertId)
    .then(sessionId => models.Sessions.get({ id: sessionId }))
    .then(session => resolve(session))
    .catch(err => reject(err));
});

module.exports.createSession = (req, res, next) => {
  const { cookies } = req;
  const { shortlyid } = cookies;

  // Check if user has session hash in cookie
  if (shortlyid !== undefined) {
    // User has hash in cookies
    // Query sessions table with the provided hash
    models.Sessions.get({ hash: shortlyid })
      .then(session => {
        const isSessionValid = session !== undefined;

        if (isSessionValid && models.Sessions.isLoggedIn(session)) {
          // Cookie hash matches an existing sessions hash
          // Decorate request with the session data
          console.log('Cookie hash is valid and has user, you are logged in');

          req.session = {
            hash: shortlyid,
            userId: session.userId,
            username: session.user.username
          };
          next();
        } else {
          // User has cookie hash, but it doesn't match anything in the sessions table
          console.log('User has cookie session hash, but it\'s not valid for login');
          createAnonymousSession().then(session => {
            const { hash, userId } = session;
            req.session = { hash, userId };
            // Set-Cookie with session hash
            next();
          });
        }
      });
  } else {
    // No cookie, create session and set hash in cookie
    console.log('User has no session hash in cookie at all');
    createAnonymousSession().then(session => {
      const { hash, userId } = session;
      req.session = { hash, userId };
      next();
    });
  }
};

module.exports.setCookie = (req, res, next) => {
  res.cookie('shortlyid', req.session.hash);
  next();
};

/************************************************************/
// Add additional authentication middleware functions below
/************************************************************/
