import { describe, expect, it } from 'vitest';
import {
  advance,
  focusedMs,
  formatClock,
  IDLE,
  parseStoredTimer,
  pauseTimer,
  remainingMs,
  resumeTimer,
  startTimer,
  type TimerState,
} from './timer';

const MIN = 60_000;
const T0 = 1_800_000_000_000;
const goal = { id: 'g', title: 'Learn ASP.NET Core' };
const start = () => startTimer(goal, 'p', 25 * MIN, T0);

describe('timer', () => {
  it('starts running with the end time', () => {
    const state = start();

    expect(state).toEqual({
      status: 'running',
      goalId: 'g',
      goalTitle: 'Learn ASP.NET Core',
      projectId: 'p',
      tags: [],
      startedAt: T0,
      durationMs: 25 * MIN,
      endsAt: T0 + 25 * MIN,
    });
    expect(remainingMs(state, T0)).toBe(25 * MIN);
  });

  it('derives the remaining time from the clock and never goes below zero', () => {
    const state = start();

    expect(remainingMs(state, T0 + 10 * MIN)).toBe(15 * MIN);
    expect(remainingMs(state, T0 + 30 * MIN)).toBe(0);
  });

  it('keeps the remainder while paused and sets a new end on resume', () => {
    const paused = pauseTimer(start(), T0 + 10 * MIN);

    expect(remainingMs(paused, T0 + 90 * MIN)).toBe(15 * MIN);
    const resumed = resumeTimer(paused, T0 + 90 * MIN);
    expect(resumed.endsAt).toBe(T0 + 105 * MIN);
    expect(resumed.startedAt).toBe(T0);
  });

  it('finishes a running timer at its end time and leaves other states alone', () => {
    const state = start();

    expect(advance(state, T0 + 24 * MIN)).toBe(state);
    expect(advance(state, T0 + 40 * MIN)).toMatchObject({
      status: 'finished',
      endedAt: T0 + 25 * MIN,
    });
    const paused = pauseTimer(state, T0);
    expect(advance(paused, T0 + 99 * MIN)).toBe(paused);
    expect(advance(IDLE, T0)).toBe(IDLE);
  });

  it('counts focused time without pauses', () => {
    const paused = pauseTimer(start(), T0 + 10 * MIN);
    const resumed = resumeTimer(paused, T0 + 40 * MIN);

    expect(focusedMs(resumed, T0 + 45 * MIN)).toBe(15 * MIN);
    expect(focusedMs(IDLE, T0)).toBe(0);
    expect(focusedMs(advance(start(), T0 + 99 * MIN), T0 + 99 * MIN)).toBe(25 * MIN);
  });

  it.each([
    [25 * MIN, '25:00'],
    [1, '00:01'],
    [0, '00:00'],
    [61_000, '01:01'],
    [-5, '00:00'],
  ])('formats %i ms as %s', (ms, text) => {
    expect(formatClock(ms)).toBe(text);
  });

  it.each<[string, unknown]>([
    ['null', null],
    ['a string', 'running'],
    ['an unknown status', { ...start(), status: 'exploded' }],
    ['a missing goal', { ...start(), goalId: undefined }],
    ['a wrong type', { ...start(), endsAt: '1800' }],
    ['a zero duration', { ...start(), durationMs: 0 }],
    ['tags that are not strings', { ...start(), tags: [1] }],
    ['a negative remainder', { ...pauseTimer(start(), T0), remainingMs: -1 }],
  ])('reads %s from storage as idle', (_name, value) => {
    expect(parseStoredTimer(value)).toEqual(IDLE);
  });

  it.each<TimerState>([
    start(),
    pauseTimer(start(), T0 + MIN),
    advance(start(), T0 + 99 * MIN),
    { ...start(), projectId: null },
  ])('round-trips %o through JSON', (state) => {
    expect(parseStoredTimer(JSON.parse(JSON.stringify(state)))).toEqual(state);
  });

  it('loads a timer stored before tags existed with no tags', () => {
    const stored: Record<string, unknown> = { ...start() };
    delete stored['tags'];

    expect(parseStoredTimer(stored)).toEqual(start());
  });
});
