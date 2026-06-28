// 2026 年中国大陆法定节假日与调休补班数据。
// 数据来源：https://github.com/cg-zhou/holiday-calendar （MIT），data/CN/2026.json
// 每年更新：替换/新增对应年份的数据即可，逻辑无需改动。
//
// type:
//   public_holiday  — 法定假日（休息）
//   transfer_workday — 调休补班（周末但需上班）

export type HolidayDateType = 'public_holiday' | 'transfer_workday';

export interface HolidayDate {
  date: string; // YYYY-MM-DD
  name: string;
  type: HolidayDateType;
}

export const CN_HOLIDAYS_2026: HolidayDate[] = [
  { date: '2026-01-01', name: '元旦', type: 'public_holiday' },
  { date: '2026-01-02', name: '元旦', type: 'public_holiday' },
  { date: '2026-01-03', name: '元旦', type: 'public_holiday' },
  { date: '2026-01-04', name: '元旦补班', type: 'transfer_workday' },

  { date: '2026-02-14', name: '春节补班', type: 'transfer_workday' },
  { date: '2026-02-15', name: '春节', type: 'public_holiday' },
  { date: '2026-02-16', name: '春节', type: 'public_holiday' },
  { date: '2026-02-17', name: '春节', type: 'public_holiday' },
  { date: '2026-02-18', name: '春节', type: 'public_holiday' },
  { date: '2026-02-19', name: '春节', type: 'public_holiday' },
  { date: '2026-02-20', name: '春节', type: 'public_holiday' },
  { date: '2026-02-21', name: '春节', type: 'public_holiday' },
  { date: '2026-02-22', name: '春节', type: 'public_holiday' },
  { date: '2026-02-23', name: '春节', type: 'public_holiday' },
  { date: '2026-02-28', name: '春节补班', type: 'transfer_workday' },

  { date: '2026-04-04', name: '清明节', type: 'public_holiday' },
  { date: '2026-04-05', name: '清明节', type: 'public_holiday' },
  { date: '2026-04-06', name: '清明节', type: 'public_holiday' },

  { date: '2026-05-01', name: '劳动节', type: 'public_holiday' },
  { date: '2026-05-02', name: '劳动节', type: 'public_holiday' },
  { date: '2026-05-03', name: '劳动节', type: 'public_holiday' },
  { date: '2026-05-04', name: '劳动节', type: 'public_holiday' },
  { date: '2026-05-05', name: '劳动节', type: 'public_holiday' },
  { date: '2026-05-09', name: '劳动节补班', type: 'transfer_workday' },

  { date: '2026-06-19', name: '端午节', type: 'public_holiday' },
  { date: '2026-06-20', name: '端午节', type: 'public_holiday' },
  { date: '2026-06-21', name: '端午节', type: 'public_holiday' },

  { date: '2026-09-20', name: '国庆节补班', type: 'transfer_workday' },
  { date: '2026-09-25', name: '中秋节', type: 'public_holiday' },
  { date: '2026-09-26', name: '中秋节', type: 'public_holiday' },
  { date: '2026-09-27', name: '中秋节', type: 'public_holiday' },

  { date: '2026-10-01', name: '国庆节', type: 'public_holiday' },
  { date: '2026-10-02', name: '国庆节', type: 'public_holiday' },
  { date: '2026-10-03', name: '国庆节', type: 'public_holiday' },
  { date: '2026-10-04', name: '国庆节', type: 'public_holiday' },
  { date: '2026-10-05', name: '国庆节', type: 'public_holiday' },
  { date: '2026-10-06', name: '国庆节', type: 'public_holiday' },
  { date: '2026-10-07', name: '国庆节', type: 'public_holiday' },
  { date: '2026-10-10', name: '国庆节补班', type: 'transfer_workday' },
];
