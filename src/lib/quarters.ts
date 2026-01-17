export type Quarter = 1 | 2 | 3 | 4;

export function getQuarterForDate(d: Date): { year: number; quarter: Quarter } {
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth(); // 0-11
  const quarter = (Math.floor(month / 3) + 1) as Quarter;
  return { year, quarter };
}

export function getQuarterDateRangeUTC(year: number, quarter: Quarter): { start: Date; end: Date } {
  const startMonth = (quarter - 1) * 3; // 0,3,6,9
  const start = new Date(Date.UTC(year, startMonth, 1, 0, 0, 0));
  const end = new Date(Date.UTC(year, startMonth + 3, 0, 23, 59, 59)); // day 0 of next q = last day of q
  return { start, end };
}

export function formatQuarter(year: number, quarter: Quarter) {
  return `Q${quarter} ${year}`;
}

