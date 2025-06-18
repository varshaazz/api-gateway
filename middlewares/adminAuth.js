const dotenv = require('dotenv');
dotenv.config();

const adminAuth = (req, res, next) => {
  const key = req.headers['x-admin-key'];
  if (key !== process.env.ADMIN_SECRET) {
    return res.status(403).json({ error: 'Access denied' });
  }
  next();
};

module.exports = adminAuth;
