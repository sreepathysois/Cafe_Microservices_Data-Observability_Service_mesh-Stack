require('./tracing'); // Always first
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs-extra');
const { register, httpRequestDurationMicroseconds } = require('./metrics');
const logger = require('./logger');

const app = express();
const PORT = 3001;
const PRODUCTS_FILE = './products.json';

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

// GET all products
app.get('/products', async (req, res) => {
  const products = await fs.readJSON(PRODUCTS_FILE);
  logger.info({ action: 'list-products', count: products.length });
  res.json(products);
});

// POST new product
app.post('/products', async (req, res) => {
  const { name, price } = req.body;
  if (!name || typeof price !== 'number') {
    logger.error('Invalid product input');
    return res.status(400).json({ message: 'Invalid product data' });
  }

  const products = await fs.readJSON(PRODUCTS_FILE);
  const id = products.length ? products[products.length - 1].id + 1 : 1;
  const newProduct = { id, name, price };
  products.push(newProduct);
  await fs.writeJSON(PRODUCTS_FILE, products);
  logger.info({ action: 'add-product', product: newProduct });

  res.status(201).json({ message: 'Product added', product: newProduct });
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
  logger.info(`Products service running on http://localhost:${PORT}`);
});

