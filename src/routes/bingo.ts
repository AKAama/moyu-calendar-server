import type { FastifyInstance } from 'fastify';
import type { DataStore } from '../lib/store.js';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function registerBingoRoutes(app: FastifyInstance, store: DataStore) {
  app.get('/api/bingo/leaderboard', async (request, reply) => {
    const { date } = request.query as { date?: string };
    if (!date || !DATE_RE.test(date)) return reply.status(400).send({ error: 'INVALID_DATE' });
    return { date, entries: store.leaderboard(date) };
  });

  app.post('/api/bingo/complete', async (request, reply) => {
    const body = request.body as Record<string, unknown>;
    const valid = typeof body?.date === 'string' && DATE_RE.test(body.date)
      && typeof body.visitorId === 'string' && body.visitorId.length <= 80
      && typeof body.displayName === 'string' && body.displayName.length <= 20
      && typeof body.title === 'string' && body.title.length <= 30
      && Number.isInteger(body.score) && Number(body.score) >= 1 && Number(body.score) <= 9;
    if (!valid) return reply.status(400).send({ error: 'INVALID_BINGO_SCORE' });
    store.saveBingo(body.date as string, body.visitorId as string, body.displayName as string, body.score as number, body.title as string);
    return reply.status(201).send({ saved: true });
  });
}
