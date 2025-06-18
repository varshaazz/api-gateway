#  API Gateway Firewall

A reusable Express middleware module for building robust API Gateways with:

-  Rate Limiting (Sliding Window)
-  IP Blocking (Temporary & Permanent)
-  Round-Robin Load Balancing
-  Circuit Breaker Pattern
-  Health Checks for Microservices
-  Admin-only Access Middleware

> Built with ❤️ by Varsha (NIT Kurukshetra)

---

## Installation

```bash
npm install api-gateway-firewall

```
## Usage
```js

const express = require('express');
const { firewall, createServiceProxy, adminAuth } = require('api-gateway-firewall');

const app = express();

app.use(firewall);

// Example user service proxy
const userTargets = ['http://localhost:7001', 'http://localhost:7003'];
app.use('/api/user', createServiceProxy(userTargets, 'user', 'user'));

// Example skill service proxy
const skillTargets = ['http://localhost:7002', 'http://localhost:7004'];
app.use('/api/skill', createServiceProxy(skillTargets, 'skill', 'skill'));

// Admin route example
app.get('/admin/blocked', adminAuth, (req, res) => {
  // logic to show blocked IPs
});
```
## Environment Variables
REDIS_HOST=localhost
REDIS_PORT=6379
ADMIN_SECRET=varsha123

## Folder Structure 
```pgsql
api-gateway-firewall/
│
├── middlewares/
│   ├── firewall.js
│   ├── proxy.js
│   └── adminAuth.js
│
├── utils/
│   └── checkHealth.js
│
├── index.js
├── package.json
└── README.md
```
## Author
Built with ❤️ by Varsha — IT student at NIT Kurukshetra

## License
MIT License



