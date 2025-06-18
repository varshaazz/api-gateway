const firewall = require('./middlewares/firewall');
const proxy = require('./middlewares/proxy');
const adminAuth = require('./middlewares/adminAuth');

module.exports = {
  firewall,
  proxy,
  adminAuth
};
