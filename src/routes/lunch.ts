import type { FastifyInstance } from 'fastify';
import type { DataStore } from '../lib/store.js';

const MAX_ITEM_LENGTH = 30;
const MAX_NAME_LENGTH = 20;

function normalizeText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function isValidText(value: string, maxLength: number) {
  return value.length >= 1 && value.length <= maxLength;
}

export async function registerLunchRoutes(app: FastifyInstance, store: DataStore) {
  app.get('/api/lunch/items', async () => ({
    items: store.listLunchItems(),
  }));

  app.post('/api/lunch/items', async (request, reply) => {
    const body = request.body as Record<string, unknown>;
    const item = normalizeText(body?.item);
    const name = normalizeText(body?.name);

    if (!isValidText(item, MAX_ITEM_LENGTH) || !isValidText(name, MAX_NAME_LENGTH)) {
      return reply.status(400).send({
        error: 'INVALID_LUNCH_ITEM',
        message: `item must be 1-${MAX_ITEM_LENGTH} chars and name must be 1-${MAX_NAME_LENGTH} chars`,
      });
    }

    return reply.status(201).send({
      item: store.addLunchItem(item, name),
    });
  });

  app.post('/api/lunch/pick', async (_request, reply) => {
    const item = store.pickLunchItem();
    if (!item) return reply.status(404).send({ error: 'LUNCH_POOL_EMPTY' });
    return { item };
  });
}
