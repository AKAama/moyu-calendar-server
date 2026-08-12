import type { FastifyInstance } from 'fastify';
import type { AppConfig } from '../lib/env.js';
import type { DataStore } from '../lib/store.js';
import { validateLunchContent } from '../lib/content-safety.js';
import { reviewLunchContentWithLlm } from '../lib/content-review.js';

const MAX_ITEM_LENGTH = 30;
const MAX_NAME_LENGTH = 20;

function normalizeText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function isValidText(value: string, maxLength: number) {
  return value.length >= 1 && value.length <= maxLength;
}

export async function registerLunchRoutes(app: FastifyInstance, options: { store: DataStore; config: AppConfig }) {
  const { store, config } = options;

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

    const fields = [
      { label: 'item', value: item },
      { label: 'name', value: name },
    ];

    const safety = validateLunchContent(fields, store.listEnabledContentBlocklistRules());

    if (!safety.ok) {
      return reply.status(400).send({
        error: 'UNSAFE_LUNCH_CONTENT',
        message: '午饭盒只收正常饭名，不收广告、色情、暴力或恶意内容',
      });
    }

    const review = await reviewLunchContentWithLlm(config, fields);
    if (!review.safe) {
      request.log.warn({ category: review.category, reason: review.reason }, 'Lunch content rejected by LLM review');
      const unsafeFields = review.unsafeFields as readonly string[];
      for (const field of fields) {
        if (unsafeFields.includes(field.label)) {
          store.addContentBlocklistRule(field.value, review.category, 'llm');
        }
      }
      return reply.status(400).send({
        error: 'UNSAFE_LUNCH_CONTENT',
        message: '午饭盒只收正常饭名，不收广告、色情、暴力或恶意内容',
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
