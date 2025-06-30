const client = require('prom-client');
client.collectDefaultMetrics();

const register = client.register;
const httpRequestDurationMicroseconds = new client.Histogram({
  name: 'api_gateway_http_request_duration_ms',
  help: 'Duration of HTTP requests in ms',
  labelNames: ['method', 'route', 'code'],
  buckets: [50, 100, 300, 500, 1000, 3000]
});

module.exports = {
  register,
  httpRequestDurationMicroseconds
};

