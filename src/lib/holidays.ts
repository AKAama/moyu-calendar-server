import { CN_HOLIDAYS_2026, type HolidayDate } from '../data/cnHolidays.js';

const DAY_MS = 24 * 60 * 60 * 1000;

export interface HolidayRange {
  name: string;
  start: string; // YYYY-MM-DD
  end: string; // YYYY-MM-DD
}

export interface NextHoliday extends HolidayRange {
  days: number; // 距离开始的天数；active 时为 0
  active: boolean;
}

// 当日是否在节假日数据中（法定假或补班）。
export function getDayInfo(dateStr: string): HolidayDate | null {
  return CN_HOLIDAYS_2026.find((item) => item.date === dateStr) ?? null;
}

export function isTransferWorkday(dateStr: string): boolean {
  return getDayInfo(dateStr)?.type === 'transfer_workday';
}

export function isPublicHoliday(dateStr: string): boolean {
  return getDayInfo(dateStr)?.type === 'public_holiday';
}

export function holidayName(dateStr: string): string | null {
  const info = getDayInfo(dateStr);
  if (info?.type === 'public_holiday') return info.name;
  return null;
}

// 是否工作日：补班→是；法定假→否；其余按周一~五是、周末否。
export function isWorkday(dateStr: string): boolean {
  if (isTransferWorkday(dateStr)) return true;
  if (isPublicHoliday(dateStr)) return false;
  const day = new Date(`${dateStr}T00:00:00`).getDay(); // 0=周日 6=周六
  return day > 0 && day < 6;
}

// 是否休息日：补班周末不算休息，天然排除。
export function isRestDay(dateStr: string): boolean {
  return !isWorkday(dateStr);
}

function parseDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

// 把连续同名 public_holiday 聚合成假期区间。
function aggregateHolidayRanges(): HolidayRange[] {
  const ranges: HolidayRange[] = [];
  let current: HolidayRange | null = null;

  for (const item of CN_HOLIDAYS_2026) {
    if (item.type !== 'public_holiday') continue;
    if (current && current.name === item.name) {
      current.end = item.date;
    } else {
      if (current) ranges.push(current);
      current = { name: item.name, start: item.date, end: item.date };
    }
  }
  if (current) ranges.push(current);
  return ranges;
}

export function getNextHoliday(dateStr: string): NextHoliday | null {
  const today = parseDate(dateStr);
  const ranges = aggregateHolidayRanges();
  const found = ranges.find((range) => parseDate(range.end) >= today);

  if (!found) {
    // 数据集仅到 2026；跨年回退到下一年元旦。
    const year = today.getFullYear() + 1;
    const newYear = `${year}-01-01`;
    return {
      name: '元旦',
      start: newYear,
      end: newYear,
      days: daysBetween(today, newYear),
      active: false,
    };
  }

  const active = parseDate(found.start) <= today && parseDate(found.end) >= today;
  return {
    ...found,
    days: active ? 0 : daysBetween(today, found.start),
    active,
  };
}

function daysBetween(from: Date, targetStr: string): number {
  const diff = parseDate(targetStr).getTime() - from.getTime();
  return Math.max(0, Math.round(diff / DAY_MS));
}
