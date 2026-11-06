import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { installFakeGoalsApi } from '../goals/testing/fakeGoalsApi';
import { ReminderSettingsForm } from './ReminderSettingsForm';

afterEach(() => {
  vi.unstubAllGlobals();
});

function setup(options: Parameters<typeof installFakeGoalsApi>[1] = {}) {
  const api = installFakeGoalsApi([], options);
  const refresh = vi.fn(() => Promise.resolve());
  window.devpath.reminders = { refresh };
  render(<ReminderSettingsForm />);
  return { api, refresh };
}

describe('ReminderSettingsForm', () => {
  it('shows the saved reminders, saves changes and asks main to reschedule', async () => {
    const { api, refresh } = setup({
      reminders: {
        english: { time: '08:30', enabled: true },
        tech: { time: '20:00', enabled: true },
      },
    });

    const english = await screen.findByLabelText('İngilizce saati');
    expect(english).toHaveValue('08:30');
    expect(screen.getByLabelText('Teknik hatırlatma')).toBeChecked();

    fireEvent.click(screen.getByLabelText('Teknik hatırlatma'));
    fireEvent.change(english, { target: { value: '07:45' } });
    fireEvent.click(screen.getByRole('button', { name: 'Kaydet' }));

    expect(await screen.findByText('Kaydedildi.')).toBeInTheDocument();
    expect(api.reminders()).toEqual({
      english: { time: '07:45', enabled: true },
      tech: { time: '20:00', enabled: false },
    });
    expect(refresh).toHaveBeenCalledOnce();
  });

  it('shows a field error and does not reschedule', async () => {
    const { api, refresh } = setup();
    const tech = await screen.findByLabelText('Teknik saati');

    fireEvent.change(tech, { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Kaydet' }));

    expect(
      await screen.findByText('Saat SS:DD biçiminde olmalı (00:00–23:59).'),
    ).toBeInTheDocument();
    expect(tech).toHaveAttribute('aria-invalid', 'true');
    expect(api.reminders().tech.time).toBe('20:00');
    expect(refresh).not.toHaveBeenCalled();
  });
});
