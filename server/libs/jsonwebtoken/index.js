//
// modified for use in audiobookshelf
// Source: https://github.com/auth0/node-jsonwebtoken
//

module.exports = {
  verify: require('./verify'),
  sign: require('./sign'),
  JsonWebTokenError: require('./lib/JsonWebTokenError'),
  NotBeforeError: require('./lib/NotBeforeError'),
  TokenExpiredError: require('./lib/TokenExpiredError'),
};

Object.defineProperty(module.exports, 'decode', {
  enumerable: false,
  value: require('./decode'),
});
