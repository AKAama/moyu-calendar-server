import { buildApp } from './app.js';
import { getConfig } from './lib/env.js';

const config = getConfig();
const app = buildApp();

try {
  await app.listen({
    host: config.host,
    port: config.port,
  });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
