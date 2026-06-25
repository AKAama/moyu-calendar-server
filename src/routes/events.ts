import type { FastifyInstance } from 'fastify';

interface AnonymousEventBody {
  type?: string;
  payload?: Record<string, unknown>;
}

export async function registerEventRoutes(app: FastifyInstance) {
  app.post('/api/events', async (request, reply) => {
    const body = request.body as AnonymousEventBody | undefined;

    if (!body?.type || typeof body.type !== 'string') {
      return reply.status(400).send({
        error: 'INVALID_EVENT',
        message: 'event type is required',
      });
    }

    request.log.info(
      {
        eventType: body.type,
        payload: body.payload ?? {},
      },
      'anonymous event accepted',
    );

    return reply.status(202).send({
      accepted: true,
    });
  });
}
