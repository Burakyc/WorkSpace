/** A daily reminder at a local time (`HH:MM`). */
export interface Reminder {
  id: 'english' | 'tech';
  label: string;
  time: string;
}

// ponytail: fixed until phase 7.2 moves the times to settings.json.
export const DEFAULT_REMINDERS: readonly Reminder[] = [
  { id: 'english', label: 'İngilizce', time: '09:00' },
  { id: 'tech', label: 'Teknik', time: '20:00' },
];

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
