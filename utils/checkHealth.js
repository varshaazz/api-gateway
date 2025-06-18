const axios = require('axios');

async function checkHealth(target) {
  try {
    const res = await axios.get(`${target}/health`, { timeout: 1000 });
    return res.status === 200;
  } catch (err) {
    return false;
  }
}

module.exports = { checkHealth };
