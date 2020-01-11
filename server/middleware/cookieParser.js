const parseCookies = (req, res, next) => {
  const cookiesString = req.headers.cookie;
  let cookiesObject = {};

  if (cookiesString !== undefined) {
    cookiesString
      .replace(/ /g, '')
      .split(';')
      .forEach(cookie => {
        const cookieTuple = cookie.split('=');
        cookiesObject[cookieTuple[0]] = cookieTuple[1];
      });
  }

  req.cookies = cookiesObject;
  next();
};

module.exports = parseCookies;
