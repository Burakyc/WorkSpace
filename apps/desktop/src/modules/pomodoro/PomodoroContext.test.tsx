import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PomodoroProvider, STORAGE_KEY, usePomodoro } from './PomodoroContext';
import { formatClock, remainingMs, startTimer } from './timer';

const MIN = 60_000;
const goal = { id: 'g', title: 'Learn ASP.NET Core' };

function Probe() {
  const { state, now, start, startBreak, pause, resume, stop } = usePomodoro();
  return (
    <>
      <p data-testid="status">{state.status}</p>
      <p data-testid="clock">{formatClock(remainingMs(state, now))}</p>
      <button onClick={() => start(goal, null, [], 25 * MIN)}>start</button>
      <button onClick={() => startBreak('shortBreak', goal, null, 5 * MIN)}>break</button>
      <button onClick={pause}>pause</button>
      <button onClick={resume}>resume</button>
      <button onClick={stop}>stop</button>
    </>
  );
}

function setup() {
  const scheduleEnd = vi.fn(() => Promise.resolve());
  const cancelEnd = vi.fn(() => Promise.resolve());
  vi.stubGlobal('devpath', { pomodoro: { scheduleEnd, cancelEnd } });
  render(
    <PomodoroProvider>
      <Probe />
    </PomodoroProvider>,
  );
  return { scheduleEnd, cancelEnd };
}

const text = (id: string) => screen.getByTestId(id).textContent;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2027-01-01T09:00:00Z'));
  localStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('PomodoroProvider', () => {
  it('schedules the end notification and stores the timer on start', () => {
    const { scheduleEnd } = setup();

    fireEvent.click(screen.getByText('start'));

    expect(scheduleEnd).toHaveBeenCalledWith(
      Date.now() + 25 * MIN,
      'Odak süresi bitti',
      'Learn ASP.NET Core',
    );
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toMatchObject({
      status: 'running',
      goalId: 'g',
    });
  });

  it('cancels on pause and stop and schedules again on resume', () => {
    const { scheduleEnd, cancelEnd } = setup();

    fireEvent.click(screen.getByText('start'));
    act(() => vi.advanceTimersByTime(5 * MIN));
    fireEvent.click(screen.getByText('pause'));
    expect(cancelEnd).toHaveBeenCalledTimes(1);
    expect(text('clock')).toBe('20:00');

    act(() => vi.advanceTimersByTime(10 * MIN));
    expect(text('clock')).toBe('20:00');
    fireEvent.click(screen.getByText('resume'));
    expect(scheduleEnd).toHaveBeenLastCalledWith(
      Date.now() + 20 * MIN,
      'Odak süresi bitti',
      'Learn ASP.NET Core',
    );

    fireEvent.click(screen.getByText('stop'));
    expect(cancelEnd).toHaveBeenCalledTimes(2);
    expect(text('status')).toBe('idle');
  });

  it('finishes on time', () => {
    setup();

    fireEvent.click(screen.getByText('start'));
    act(() => vi.advanceTimersByTime(24 * MIN + 59_000));
    expect(text('clock')).toBe('00:01');
    act(() => vi.advanceTimersByTime(1_000));

    expect(text('status')).toBe('finished');
    expect(text('clock')).toBe('00:00');
  });

  it('continues a stored running timer and schedules it again', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(startTimer(goal, null, 25 * MIN, Date.now() - 10 * MIN)),
    );

    const { scheduleEnd } = setup();

    expect(text('status')).toBe('running');
    expect(text('clock')).toBe('15:00');
    expect(scheduleEnd).toHaveBeenCalledWith(
      Date.now() + 15 * MIN,
      'Odak süresi bitti',
      'Learn ASP.NET Core',
    );
  });

  it('loads a stored timer that ended meanwhile as finished, and garbage as idle', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(startTimer(goal, null, 25 * MIN, Date.now() - 60 * MIN)),
    );
    const first = setup();
    expect(text('status')).toBe('finished');
    expect(first.scheduleEnd).not.toHaveBeenCalled();
  });

  it('loads garbage as idle', () => {
    localStorage.setItem(STORAGE_KEY, '{ not json');

    setup();

    expect(text('status')).toBe('idle');
  });

  it('notifies the end of a break with its own title', () => {
    const { scheduleEnd } = setup();

    fireEvent.click(screen.getByText('break'));

    expect(scheduleEnd).toHaveBeenCalledWith(
      Date.now() + 5 * MIN,
      'Mola bitti',
      'Yeni odak oturumuna hazırsın.',
    );
  });
});
