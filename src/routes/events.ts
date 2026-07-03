import type { FastifyInstance } from 'fastify';
import type { DataStore } from '../lib/store.js';

interface AnonymousEventBody {
  type?: string;
  payload?: Record<string, unknown>;
  visitorId?: string;
}

export async function registerEventRoutes(app: FastifyInstance, options: { store: DataStore; adminToken: string }) {
  app.post('/api/events', async (request, reply) => {
    const body = request.body as AnonymousEventBody | undefined;

    if (!body?.type || typeof body.type !== 'string') {
      return reply.status(400).send({
        error: 'INVALID_EVENT',
        message: 'event type is required',
      });
    }

    options.store.addEvent(body.type.slice(0, 50), body.visitorId?.slice(0, 80) ?? null,
      body.payload ?? {}, request.headers['user-agent'] ?? null);

    return reply.status(202).send({
      accepted: true,
    });
  });

  app.get('/api/admin/events/summary', async (request, reply) => {
    const token = request.headers.authorization?.replace(/^Bearer\s+/i, '');
    if (!options.adminToken || token !== options.adminToken) return reply.status(401).send({ error: 'UNAUTHORIZED' });
    return { events: options.store.eventSummary() };
  });
}
