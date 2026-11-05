import { describe, expect, it } from 'vitest';
import { DEFAULT_REMINDERS, reminderStatus } from './reminders';

const at = (hours: number, minutes: number) => new Date(2026, 10, 6, hours, minutes);
const statuses = (now: Date) =>
  reminderStatus(DEFAULT_REMINDERS, now).map(({ reminder, status }) => [reminder.id, status]);

describe('reminderStatus', () => {
  it('marks the first reminder ahead as next', () => {
    expect(statuses(at(8, 59))).toEqual([
      ['english', 'next'],
      ['tech', 'later'],
    ]);
  });

  it('counts a reminder as passed from its minute on', () => {
    expect(statuses(at(9, 0))).toEqual([
      ['english', 'passed'],
      ['tech', 'next'],
    ]);
  });

  it('has no next reminder after the last one', () => {
    expect(statuses(at(21, 0))).toEqual([
      ['english', 'passed'],
      ['tech', 'passed'],
    ]);
  });
});
