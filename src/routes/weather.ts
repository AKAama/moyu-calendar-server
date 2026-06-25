import type { FastifyInstance } from 'fastify';
import type { AppConfig } from '../lib/env.js';

function parseCoordinate(value: unknown) {
  if (typeof value !== 'string') return null;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

export async function registerWeatherRoutes(app: FastifyInstance, config: AppConfig) {
  app.get('/api/weather', async (request, reply) => {
    const query = request.query as { lat?: string; lon?: string };
    const lat = parseCoordinate(query.lat);
    const lon = parseCoordinate(query.lon);

    if (lat === null || lon === null) {
      return reply.status(400).send({
        error: 'INVALID_COORDINATES',
        message: 'lat and lon query parameters are required numbers',
      });
    }

    if (!config.weatherKitConfigured) {
      return {
        status: 'not_configured',
        location: { lat, lon },
        message: 'WeatherKit credentials are not configured yet',
      };
    }

    return reply.status(501).send({
      error: 'WEATHERKIT_NOT_IMPLEMENTED',
      message: 'WeatherKit credentials are configured, but the provider call has not been wired yet',
    });
  });
}
