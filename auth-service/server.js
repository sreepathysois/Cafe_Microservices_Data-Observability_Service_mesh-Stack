require('./tracing'); // Always first
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs-extra');
const { register, httpRequestDurationMicroseconds } = require('./metrics');
const logger = require('./logger');

const app = express();
const PORT = 3000;
const USERS_FILE = './users.json';

app.use(bodyParser.json());

// Middleware to collect metrics
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const responseTime = Date.now() - start;
    httpRequestDurationMicroseconds
      .labels(req.method, req.path, res.statusCode)
      .observe(responseTime);
  });
  next();
});

// Register new user
app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  logger.info({ action: 'register', username });

  if (!username || !password) {
    logger.error('Missing username or password');
    return res.status(400).json({ message: 'Invalid input' });
  }

  const users = await fs.readJSON(USERS_FILE);
  if (users.find(u => u.username === username)) {
    return res.status(409).json({ message: 'User already exists' });
  }

  users.push({ username, password });
  await fs.writeJSON(USERS_FILE, users);
  res.status(201).json({ message: 'User registered' });
});

// Login user
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  logger.info({ action: 'login', username });

  const users = await fs.readJSON(USERS_FILE);
  const user = users.find(u => u.username === username && u.password === password);
  if (user) {
    res.status(200).json({ message: 'Login successful' });
  } else {
    res.status(401).json({ message: 'Invalid credentials' });
  }
});

// Health check
app.get('/health', (req, res) => res.send('OK'));

// Prometheus metrics
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// Start server
app.listen(PORT, () => {
  logger.info(`Auth service running on http://localhost:${PORT}`);
});

