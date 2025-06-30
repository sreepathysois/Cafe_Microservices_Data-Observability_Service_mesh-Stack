require('./tracing');
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs-extra');
const { register, httpRequestDurationMicroseconds } = require('./metrics');
const logger = require('./logger');

const app = express();
const PORT = 3003;
const ORDERS_FILE = './orders.json';

app.use(bodyParser.json());

// Metrics middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    httpRequestDurationMicroseconds
      .labels(req.method, req.path, res.statusCode)
      .observe(duration);
  });
  next();
});

// Get orders for a user
app.get('/orders/:userId', async (req, res) => {
  const { userId } = req.params;
  const orders = await fs.readJSON(ORDERS_FILE);
  const userOrders = orders[userId] || [];
  logger.info({ action: 'get-orders', userId, count: userOrders.length });
  res.json(userOrders);
});

// Place a new order
app.post('/orders/:userId', async (req, res) => {
  const { userId } = req.params;
  const { items, total } = req.body;

  if (!Array.isArray(items) || typeof total !== 'number') {
    logger.error('Invalid order input');
    return res.status(400).json({ message: 'Invalid order data' });
  }

  const orders = await fs.readJSON(ORDERS_FILE);
  if (!orders[userId]) orders[userId] = [];

  const newOrder = {
    orderId: Math.floor(Math.random() * 10000),
    items,
    total,
    timestamp: new Date().toISOString()
  };

  orders[userId].push(newOrder);
  await fs.writeJSON(ORDERS_FILE, orders);

  logger.info({ action: 'place-order', userId, order: newOrder });
  res.status(201).json({ message: 'Order placed', order: newOrder });
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
  logger.info(`Orders service running on http://localhost:${PORT}`);
});

