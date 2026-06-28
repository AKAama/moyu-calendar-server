import type { FastifyInstance } from 'fastify';
import type { AppConfig } from '../lib/env.js';
import { fetchWeatherKit, UpstreamError } from '../lib/weatherkit.js';

function parseCoordinate(value: unknown) {
  if (typeof value !== 'string') return null;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 分钟
const cache = new Map<string, { fetchedAt: number; data: unknown }>();

// 量化到小数点后 2 位（~1km），避免微差坐标击穿缓存。
function cacheKey(lat: number, lon: number): string {
  return `${lat.toFixed(2)},${lon.toFixed(2)}`;
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

    if (!config.weatherKitConfigured || !config.weatherKit) {
      return {
        status: 'not_configured',
        location: { lat, lon },
        message: 'WeatherKit credentials are not configured yet',
      };
    }

    const key = cacheKey(lat, lon);
    const cached = cache.get(key);
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
      return { ...((cached.data as object) ?? {}), cached: true };
    }

    try {
      const data = await fetchWeatherKit(config.weatherKit, lat, lon);
      cache.set(key, { fetchedAt: Date.now(), data });
      return data;
    } catch (error) {
      if (error instanceof UpstreamError) {
        request.log.error(
          { upstreamStatus: error.upstreamStatus, message: error.message },
          'WeatherKit upstream error',
        );
        return reply.status(502).send({
          error: 'WEATHERKIT_UPSTREAM_ERROR',
          upstreamStatus: error.upstreamStatus,
          message: 'WeatherKit returned an error response',
        });
      }
      request.log.error({ err: error }, 'WeatherKit request failed');
      return reply.status(502).send({
        error: 'WEATHERKIT_UPSTREAM_ERROR',
        message: 'Failed to reach WeatherKit',
      });
    }
  });
}
