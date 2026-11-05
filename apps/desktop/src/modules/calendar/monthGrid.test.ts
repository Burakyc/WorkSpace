import { describe, expect, it } from 'vitest';
import { buildMonthGrid, monthOf, shiftMonth, todayLocal } from './monthGrid';

describe('buildMonthGrid', () => {
  it.each([
    ['2026-11', '2026-10-26', '2026-12-06', 6],
    ['2027-02', '2027-02-01', '2027-02-28', 4],
    ['2026-03', '2026-02-23', '2026-04-05', 6],
  ])('%s runs from %s to %s in Monday-first weeks', (month, first, last, weeks) => {
    const grid = buildMonthGrid(month);

    expect(grid).toHaveLength(weeks);
    expect(grid.every((week) => week.length === 7)).toBe(true);
    expect(grid[0]?.[0]?.date).toBe(first);
    expect(grid.at(-1)?.at(-1)?.date).toBe(last);
  });

  it('marks days of other months', () => {
    const days = buildMonthGrid('2026-11').flat();

    expect(days.filter((d) => d.inMonth)).toHaveLength(30);
    expect(days[0]).toEqual({ date: '2026-10-26', inMonth: false });
    expect(days[6]).toEqual({ date: '2026-11-01', inMonth: true });
    expect(days.at(-1)).toEqual({ date: '2026-12-06', inMonth: false });
  });
});

describe('shiftMonth', () => {
  it('crosses year boundaries', () => {
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftMonth('2026-11', 0)).toBe('2026-11');
  });
});

describe('monthOf and todayLocal', () => {
  it('uses the local date, not the UTC date', () => {
    // 23:30 local time: the UTC date differs in every zone west of UTC.
    const lateEvening = new Date(2026, 10, 5, 23, 30);

    expect(todayLocal(lateEvening)).toBe('2026-11-05');
    expect(monthOf(todayLocal(lateEvening))).toBe('2026-11');
  });
});
