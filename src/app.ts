import cors from '@fastify/cors';
import Fastify from 'fastify';
import { getConfig } from './lib/env.js';
import { DataStore } from './lib/store.js';
import { registerBingoRoutes } from './routes/bingo.js';
import { registerCalendarRoutes } from './routes/calendar.js';
import { registerEventRoutes } from './routes/events.js';
import { registerHealthRoutes } from './routes/health.js';
import { registerLunchRoutes } from './routes/lunch.js';
import { registerWeatherRoutes } from './routes/weather.js';

export function buildApp(config = getConfig()) {
  const app = Fastify({
    logger: true,
  });
  const store = new DataStore(config.databasePath);
  app.addHook('onClose', async () => store.close());

  void app.register(cors, {
    origin: config.corsOrigin,
  });
  void app.register(registerHealthRoutes);
  void app.register(registerCalendarRoutes);
  void app.register(registerWeatherRoutes, config);
  void app.register(registerEventRoutes, { store, adminToken: config.adminToken });
  void app.register(registerBingoRoutes, store);
  void app.register(registerLunchRoutes, { store, config });

  return app;
}
