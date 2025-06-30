require('./tracing');
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs-extra');
const { register, httpRequestDurationMicroseconds } = require('./metrics');
const logger = require('./logger');

const app = express();
const PORT = 3002;
const CART_FILE = './cart.json';

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

// Get cart items for a user
app.get('/cart/:userId', async (req, res) => {
  const { userId } = req.params;
  const cart = await fs.readJSON(CART_FILE);
  const items = cart[userId] || [];
  logger.info({ action: 'get-cart', userId, count: items.length });
  res.json(items);
});

// Add item to cart
app.post('/cart/:userId', async (req, res) => {
  const { userId } = req.params;
  const { productId, quantity } = req.body;

  if (!productId || typeof quantity !== 'number') {
    logger.error('Invalid cart item input');
    return res.status(400).json({ message: 'Invalid product or quantity' });
  }

  const cart = await fs.readJSON(CART_FILE);
  if (!cart[userId]) cart[userId] = [];

  const existing = cart[userId].find(item => item.productId === productId);
  if (existing) {
    existing.quantity += quantity;
  } else {
    cart[userId].push({ productId, quantity });
  }

  await fs.writeJSON(CART_FILE, cart);
  logger.info({ action: 'add-to-cart', userId, productId, quantity });

  res.status(201).json({ message: 'Item added to cart' });
});

// Remove item from cart
app.delete('/cart/:userId/:productId', async (req, res) => {
  const { userId, productId } = req.params;
  const cart = await fs.readJSON(CART_FILE);

  if (!cart[userId]) {
    return res.status(404).json({ message: 'Cart not found' });
  }

  cart[userId] = cart[userId].filter(item => item.productId != productId);
  await fs.writeJSON(CART_FILE, cart);

  logger.info({ action: 'remove-from-cart', userId, productId });
  res.status(200).json({ message: 'Item removed' });
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
  logger.info(`Cart service running on http://localhost:${PORT}`);
});

