const parseCookies = (req, res, next) => {
  const cookieString = req.headers.cookie;
  req.cookie = cookieString
    .split('; ')
    .map(cookie => cookie
      .split('=')[1]);
  next();
};

module.exports = parseCookies;

split().map(cook => op1 => op2 => op3 => ())