import cors from '@fastify/cors';
import Fastify from 'fastify';
import { getConfig } from './lib/env.js';
import { registerEventRoutes } from './routes/events.js';
import { registerHealthRoutes } from './routes/health.js';
import { registerWeatherRoutes } from './routes/weather.js';

export function buildApp() {
  const config = getConfig();
  const app = Fastify({
    logger: true,
  });

  void app.register(cors, {
    origin: config.corsOrigin,
  });
  void app.register(registerHealthRoutes);
  void app.register(registerWeatherRoutes, config);
  void app.register(registerEventRoutes);

  return app;
}
