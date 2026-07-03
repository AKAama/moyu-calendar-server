import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildApp } from './app.js';
import { getConfig } from './lib/env.js';

// 凭据未配置的 config，用于稳定测试 not_configured 分支（不受本地 .env 影响、不触网）。
const unconfiguredConfig = {
  ...getConfig(), databasePath: ':memory:', adminToken: 'test-token',
  weatherKitConfigured: false,
  weatherKit: null,
};

const testConfig = { ...getConfig(), databasePath: ':memory:', adminToken: 'test-token' };

test('GET /api/health returns service status', async () => {
  const app = buildApp(testConfig);
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
  const app = buildApp(testConfig);
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
  const app = buildApp(testConfig);
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
  const app = buildApp(testConfig);
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
  assert.equal(body.daysToFriday, 5);
  assert.equal(body.daysToRestDay, 6);
  assert.equal(body.nextRestDate, '2026-01-10');
});

test('GET /api/calendar returns the workday count for the requested month', async () => {
  const app = buildApp(testConfig);
  const response = await app.inject({
    method: 'GET',
    url: '/api/calendar?date=2026-07-03',
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.json().monthlyWorkdays, 23);
});

test('GET /api/calendar returns zero days when today is already a rest day', async () => {
  const app = buildApp(testConfig);
  const response = await app.inject({
    method: 'GET',
    url: '/api/calendar?date=2026-05-01',
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.json().daysToRestDay, 0);
  assert.equal(response.json().nextRestDate, '2026-05-01');
});

test('GET /api/calendar flags the first day of a public holiday', async () => {
  const app = buildApp(testConfig);
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
  const app = buildApp(testConfig);
  const response = await app.inject({
    method: 'GET',
    url: '/api/calendar?date=not-a-date',
  });

  assert.equal(response.statusCode, 400);
  assert.equal(response.json().error, 'INVALID_DATE');
});

test('POST /api/events accepts anonymous event payloads', async () => {
  const app = buildApp(testConfig);
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

test('bingo score is saved and returned by daily leaderboard', async () => {
  const app = buildApp(testConfig);
  const saved = await app.inject({ method: 'POST', url: '/api/bingo/complete', payload: {
    date: '2026-07-03', visitorId: 'visitor-1', displayName: '摸鱼小熊', score: 6, title: '办公室隐身术士',
  }});
  assert.equal(saved.statusCode, 201);
  const list = await app.inject({ method: 'GET', url: '/api/bingo/leaderboard?date=2026-07-03' });
  assert.deepEqual(list.json().entries[0], { displayName: '摸鱼小熊', score: 6, title: '办公室隐身术士' });
});

test('event summary requires admin token', async () => {
  const app = buildApp(testConfig);
  const denied = await app.inject({ method: 'GET', url: '/api/admin/events/summary' });
  assert.equal(denied.statusCode, 401);
  const allowed = await app.inject({ method: 'GET', url: '/api/admin/events/summary', headers: { authorization: 'Bearer test-token' } });
  assert.equal(allowed.statusCode, 200);
});
