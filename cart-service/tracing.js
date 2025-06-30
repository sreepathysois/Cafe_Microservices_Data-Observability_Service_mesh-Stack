'use strict';

const opentelemetry = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { Resource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');

const collectorUrl = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://otel-collector:4318/v1/traces';
const serviceName = process.env.OTEL_SERVICE_NAME || 'unnamed-service';

const traceExporter = new OTLPTraceExporter({
  url: collectorUrl,
});

const sdk = new opentelemetry.NodeSDK({
  traceExporter,
  instrumentations: [getNodeAutoInstrumentations()],
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
  }),
});

try {
  sdk.start();
  console.log(`OpenTelemetry tracing initialized for ${serviceName}`);
} catch (err) {
  console.error('Error initializing tracing', err);
}

process.on('SIGTERM', () => {
  sdk.shutdown()
    .then(() => console.log(`Tracing terminated for ${serviceName}`))
    .catch((err) => console.error('Error shutting down tracing', err))
    .finally(() => process.exit(0));
});

