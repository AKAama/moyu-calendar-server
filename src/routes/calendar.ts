import type { FastifyInstance } from 'fastify';
import {
  getDaysToFriday,
  getNextHoliday,
  getNextRestDay,
  getMonthlyWorkdayCount,
  holidayName,
  isPublicHoliday,
  isRestDay,
  isTransferWorkday,
  isWorkday,
} from '../lib/holidays.js';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function todayStr(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export async function registerCalendarRoutes(app: FastifyInstance) {
  app.get('/api/calendar', async (request, reply) => {
    const query = request.query as { date?: string };
    const date = query.date ?? todayStr();

    if (!DATE_RE.test(date)) {
      return reply.status(400).send({
        error: 'INVALID_DATE',
        message: 'date query parameter must be YYYY-MM-DD',
      });
    }

    const nextRestDay = getNextRestDay(date);

    return {
      date,
      isWorkday: isWorkday(date),
      isRestDay: isRestDay(date),
      isHoliday: isPublicHoliday(date),
      isTransferWorkday: isTransferWorkday(date),
      holidayName: holidayName(date),
      monthlyWorkdays: getMonthlyWorkdayCount(date),
      daysToFriday: getDaysToFriday(date),
      daysToRestDay: nextRestDay.days,
      nextRestDate: nextRestDay.date,
      nextHoliday: getNextHoliday(date),
    };
  });
}
