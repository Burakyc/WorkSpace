import { describe, expect, it } from 'vitest';
import { progressText } from './progressText';

describe('progressText', () => {
  it('shows count, target and percent with a target', () => {
    expect(
      progressText({ goalId: 'g', completedSessions: 7, totalMinutes: 175, percent: 35 }, 20),
    ).toBe('7 / 20 pomodoro · %35');
  });

  it('shows count and time without a target', () => {
    expect(
      progressText({ goalId: 'g', completedSessions: 3, totalMinutes: 60, percent: null }, null),
    ).toBe('3 pomodoro · 1 sa');
  });

  it('counts a missing progress as zero', () => {
    expect(progressText(undefined, 20)).toBe('0 / 20 pomodoro · %0');
    expect(progressText(undefined, null)).toBe('0 pomodoro · 0 dk');
  });
});
