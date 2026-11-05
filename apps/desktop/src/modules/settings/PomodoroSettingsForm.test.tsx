import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { installFakeGoalsApi } from '../goals/testing/fakeGoalsApi';
import { PomodoroSettingsForm } from './PomodoroSettingsForm';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('PomodoroSettingsForm', () => {
  it('loads the durations and saves changes', async () => {
    const api = installFakeGoalsApi();
    render(<PomodoroSettingsForm />);

    const focus = await screen.findByLabelText('Odak (dk)');
    expect(focus).toHaveValue(25);
    expect(screen.getByLabelText('Uzun mola aralığı (oturum)')).toHaveValue(4);

    fireEvent.change(focus, { target: { value: '50' } });
    fireEvent.change(screen.getByLabelText('Kısa mola (dk)'), { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: 'Kaydet' }));

    expect(await screen.findByText('Kaydedildi.')).toBeInTheDocument();
    expect(api.settings()).toEqual({
      focusMinutes: 50,
      shortBreakMinutes: 10,
      longBreakMinutes: 15,
      longBreakInterval: 4,
    });
  });

  it('shows a field error and keeps the saved values', async () => {
    const api = installFakeGoalsApi();
    render(<PomodoroSettingsForm />);
    const focus = await screen.findByLabelText('Odak (dk)');

    fireEvent.change(focus, { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: 'Kaydet' }));

    expect(
      await screen.findByText('Odak süresi 1 ile 120 dakika arasında olmalı.'),
    ).toBeInTheDocument();
    expect(focus).toHaveAttribute('aria-invalid', 'true');
    expect(api.settings().focusMinutes).toBe(25);
  });
});
