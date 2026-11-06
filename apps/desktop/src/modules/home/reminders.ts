import { DEFAULT_REMINDER_SETTINGS, type ReminderSettings } from '../../shared/api/types';

/** A daily reminder at a local time (`HH:MM`). */
export interface Reminder {
  id: 'english' | 'tech';
  label: string;
  time: string;
}

const labels: Record<Reminder['id'], string> = { english: 'İngilizce', tech: 'Teknik' };

/** The enabled reminders of the settings. */
export function remindersFrom(settings: ReminderSettings): Reminder[] {
  return (['english', 'tech'] as const)
    .filter((id) => settings[id].enabled)
    .map((id) => ({ id, label: labels[id], time: settings[id].time }));
}

export const DEFAULT_REMINDERS: readonly Reminder[] = remindersFrom(DEFAULT_REMINDER_SETTINGS);

export type ReminderStatus = 'passed' | 'next' | 'later';

const minutesOf = (time: string) => {
  const [hours = 0, minutes = 0] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

/** Each reminder sorted by time: `passed` once its time has come today, the first one ahead is `next`. */
export function reminderStatus(
  reminders: readonly Reminder[],
  now: Date,
): { reminder: Reminder; status: ReminderStatus }[] {
  const current = now.getHours() * 60 + now.getMinutes();
  let nextFound = false;
  return [...reminders]
    .sort((a, b) => minutesOf(a.time) - minutesOf(b.time))
    .map((reminder) => {
      if (minutesOf(reminder.time) <= current) return { reminder, status: 'passed' };
      if (nextFound) return { reminder, status: 'later' };
      nextFound = true;
      return { reminder, status: 'next' };
    });
}
