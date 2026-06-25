import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildApp } from './app.js';

test('GET /api/health returns service status', async () => {
  const app = buildApp();
  const response = await app.inject({
    method: 'GET',
    url: '/api/health',
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), {
    ok: true,
    service: 'moyu-calendar-api',
  });
});

test('GET /api/weather validates coordinates', async () => {
  const app = buildApp();
  const response = await app.inject({
    method: 'GET',
    url: '/api/weather',
  });

  assert.equal(response.statusCode, 400);
  assert.deepEqual(response.json(), {
    error: 'INVALID_COORDINATES',
    message: 'lat and lon query parameters are required numbers',
  });
});

test('GET /api/weather returns a safe placeholder before WeatherKit is configured', async () => {
  const app = buildApp();
  const response = await app.inject({
    method: 'GET',
    url: '/api/weather?lat=31.2304&lon=121.4737',
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), {
    status: 'not_configured',
    location: {
      lat: 31.2304,
      lon: 121.4737,
    },
    message: 'WeatherKit credentials are not configured yet',
  });
});

test('POST /api/events accepts anonymous event payloads', async () => {
  const app = buildApp();
  const response = await app.inject({
    method: 'POST',
    url: '/api/events',
    payload: {
      type: 'bingo_completed',
      payload: {
        title: '摸鱼全勤王',
      },
    },
  });

  assert.equal(response.statusCode, 202);
  assert.deepEqual(response.json(), {
    accepted: true,
  });
});
