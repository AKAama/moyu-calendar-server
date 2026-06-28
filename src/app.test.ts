import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildApp } from './app.js';
import { getConfig } from './lib/env.js';

// 凭据未配置的 config，用于稳定测试 not_configured 分支（不受本地 .env 影响、不触网）。
const unconfiguredConfig = {
  ...getConfig(),
  weatherKitConfigured: false,
  weatherKit: null,
};

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
  const app = buildApp(unconfiguredConfig);
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

test('GET /api/calendar marks a regular Sunday as a rest day', async () => {
  const app = buildApp();
  const response = await app.inject({
    method: 'GET',
    url: '/api/calendar?date=2026-06-28',
  });

  assert.equal(response.statusCode, 200);
  const body = response.json();
  assert.equal(body.isWorkday, false);
  assert.equal(body.isRestDay, true);
  assert.equal(body.isHoliday, false);
  assert.equal(body.isTransferWorkday, false);
  assert.equal(body.holidayName, null);
  assert.deepEqual(body.nextHoliday, {
    name: '中秋节',
    start: '2026-09-25',
    end: '2026-09-27',
    days: 89,
    active: false,
  });
});

test('GET /api/calendar treats a transfer workday (补班 Sunday) as a workday', async () => {
  const app = buildApp();
  const response = await app.inject({
    method: 'GET',
    url: '/api/calendar?date=2026-01-04',
  });

  assert.equal(response.statusCode, 200);
  const body = response.json();
  // 2026-01-04 是周日但属元旦补班，不应进入假期模式。
  assert.equal(body.isWorkday, true);
  assert.equal(body.isRestDay, false);
  assert.equal(body.isTransferWorkday, true);
});

test('GET /api/calendar flags the first day of a public holiday', async () => {
  const app = buildApp();
  const response = await app.inject({
    method: 'GET',
    url: '/api/calendar?date=2026-02-15',
  });

  assert.equal(response.statusCode, 200);
  const body = response.json();
  assert.equal(body.isHoliday, true);
  assert.equal(body.holidayName, '春节');
  assert.equal(body.isWorkday, false);
  assert.equal(body.nextHoliday.active, true);
  assert.equal(body.nextHoliday.days, 0);
});

test('GET /api/calendar rejects malformed dates', async () => {
  const app = buildApp();
  const response = await app.inject({
    method: 'GET',
    url: '/api/calendar?date=not-a-date',
  });

  assert.equal(response.statusCode, 400);
  assert.equal(response.json().error, 'INVALID_DATE');
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
