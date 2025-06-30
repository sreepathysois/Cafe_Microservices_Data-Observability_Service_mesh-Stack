require('./tracing'); // Tracing must be first

const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const logger = require('./logger');
const { register, httpRequestDurationMicroseconds } = require('./metrics');

const app = express();
const PORT = 8000;

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

// Helper to log + proxy
const logProxy = (target) => ({
  target,
  changeOrigin: true,
  pathRewrite: (path, req) => {
    logger.info({ routedTo: target, method: req.method, path });
    return path.replace(/^\/(auth|products|cart|orders)/, '/$1');
  }
});

// Routes to microservices
app.use('/auth', createProxyMiddleware(logProxy('http://localhost:3000')));
app.use('/products', createProxyMiddleware(logProxy('http://localhost:3001')));
app.use('/cart', createProxyMiddleware(logProxy('http://localhost:3002')));
app.use('/orders', createProxyMiddleware(logProxy('http://localhost:3003')));

// Gateway health check
app.get('/health', (req, res) => res.send('API Gateway is running'));

// Prometheus metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// Start API Gateway
app.listen(PORT, () => {
  logger.info(`API Gateway running at http://localhost:${PORT}`);
});

