require('./tracing'); // Enable OpenTelemetry first

const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');
const logger = require('./logger');
const { register, httpRequestDurationMicroseconds } = require('./metrics');

const app = express();
const PORT = 8000;

// Enable CORS for all routes
app.use(cors());

// Prometheus metrics collection
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

// Proxy setup helper
const logProxy = (target, base) => ({
  target,
  changeOrigin: true,
  pathRewrite: {
    [`^/${base}`]: `/${base}` // keep base path (like /products)
  },
  onProxyReq: (proxyReq, req) => {
    logger.info({
      route: base,
      method: req.method,
      originalUrl: req.originalUrl,
      forwardedTo: target
    });
  }
});

// Proxy routes to services
app.use('/auth', createProxyMiddleware(logProxy('http://auth-service:3000', 'auth')));
app.use('/products', createProxyMiddleware(logProxy('http://products-service:3001', 'products')));
app.use('/cart', createProxyMiddleware(logProxy('http://cart-service:3002', 'cart')));
app.use('/orders', createProxyMiddleware(logProxy('http://orders-service:3003', 'orders')));

// Gateway health
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

