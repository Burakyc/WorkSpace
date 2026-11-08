import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ContentTopic, LessonItem } from '../../shared/api/types';
import { goal } from '../goals/testing/fakeGoalsApi';
import { PomodoroProvider, STORAGE_KEY } from '../pomodoro/PomodoroContext';
import { startTimer } from '../pomodoro/timer';
import { StudyPartForm } from './StudyPartForm';
import { installStudyApi } from './testing/studyApi';
import { diLesson } from './testing/lesson';

const lesson = diLesson as unknown as ContentTopic<LessonItem>;
const part = lesson.items[1]!;
const a = goal({ id: 'a', title: 'ASP.NET' });
const b = goal({ id: 'b', title: 'English' });
const MIN = 60_000;

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function renderForm(testLesson = lesson) {
  render(
    <MemoryRouter initialEntries={['/learning/di/di-2']}>
      <PomodoroProvider>
        <Routes>
          <Route
            path="/learning/:slug/:partId"
            element={<StudyPartForm lesson={testLesson} part={part} />}
          />
          <Route path="/pomodoro" element={<p>timer page</p>} />
        </Routes>
      </PomodoroProvider>
    </MemoryRouter>,
  );
}

const startButton = () => screen.findByRole('button', { name: 'Bu parçayı çalış' });
const stored = () => JSON.parse(localStorage.getItem(STORAGE_KEY)!) as Record<string, unknown>;

describe('StudyPartForm', () => {
  it('needs a choice among several goals', async () => {
    installStudyApi([a, b]);
    renderForm();

    expect(await startButton()).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Hedef'), { target: { value: 'b' } });
    expect(await startButton()).toBeEnabled();
  });

  it('preselects the only goal', async () => {
    installStudyApi([a]);
    renderForm();

    expect(await startButton()).toBeEnabled();
    expect(screen.getByLabelText('Hedef')).toHaveValue('a');
  });

  it('preselects the goal remembered for this lesson, unless it is no longer active', async () => {
    localStorage.setItem('devpath.learning.goal.di', 'b');
    installStudyApi([a, b]);
    renderForm();
    expect(await startButton()).toBeEnabled();
    expect(screen.getByLabelText('Hedef')).toHaveValue('b');
  });

  it('ignores a remembered goal that is archived', async () => {
    localStorage.setItem('devpath.learning.goal.di', 'gone');
    installStudyApi([a, b]);
    renderForm();

    expect(await startButton()).toBeDisabled();
    expect(screen.getByLabelText('Hedef')).toHaveValue('');
  });

  it('starts on the part with the goal, focus length and lesson tags, then opens the timer', async () => {
    installStudyApi([a], {
      goals: {
        settings: {
          focusMinutes: 40,
          shortBreakMinutes: 5,
          longBreakMinutes: 15,
          longBreakInterval: 4,
        },
      },
    });
    const tags = Array.from({ length: 12 }, (_, i) => `t${i}`);
    renderForm({ ...lesson, tags });

    await waitFor(async () => expect(await startButton()).toBeEnabled());
    // The settings arrive with the goals.
    fireEvent.click(await startButton());

    expect(await screen.findByText('timer page')).toBeInTheDocument();
    expect(stored()).toMatchObject({
      goalId: 'a',
      projectId: null,
      durationMs: 40 * MIN,
      tags: tags.slice(0, 10),
      lessonPart: { slug: 'di', partId: 'di-2', topic: 'Dependency injection', title: 'Lifetimes' },
    });
    expect(localStorage.getItem('devpath.learning.goal.di')).toBe('a');
  });

  it('uses the default focus length when the settings fail', async () => {
    installStudyApi([a], { goals: { failSettings: true } });
    renderForm();

    fireEvent.click(await startButton());

    expect(await screen.findByText('timer page')).toBeInTheDocument();
    expect(stored()).toMatchObject({ durationMs: 25 * MIN });
  });

  it('points to the running session instead of starting another', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(startTimer(a, null, 25 * MIN, Date.now())));
    installStudyApi([a]);
    renderForm();

    expect(await screen.findByText('Çalışan bir oturum var.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: "Pomodoro'ya git" })).toHaveAttribute(
      'href',
      '/pomodoro',
    );
    expect(screen.queryByRole('button', { name: 'Bu parçayı çalış' })).not.toBeInTheDocument();
  });

  it('asks for a goal when there is none', async () => {
    installStudyApi([]);
    renderForm();

    expect(await screen.findByRole('link', { name: 'Hedeflere git' })).toHaveAttribute(
      'href',
      '/goals',
    );
  });

  it('says so when the goals cannot be loaded', async () => {
    installStudyApi([a]);
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>(() => Promise.resolve(new Response('{}', { status: 500 }))),
    );
    renderForm();

    expect(await screen.findByRole('alert')).toHaveTextContent('Hedefler yüklenemedi.');
  });
});
