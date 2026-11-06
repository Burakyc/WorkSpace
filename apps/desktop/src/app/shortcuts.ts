export type ShortcutId = 'newNote' | 'pomodoro' | 'search' | 'help' | 'devPanel';

/** The shortcuts in the order the help window lists them. `Ctrl+Shift+D` (developer panel) is left out on purpose. */
export const shortcuts: readonly { id: ShortcutId; keys: string[]; description: string }[] = [
  { id: 'newNote', keys: ['Ctrl', 'N'], description: 'Yeni not (açık klasörün içine)' },
  { id: 'pomodoro', keys: ['Ctrl', 'Shift', 'P'], description: 'Pomodoro başlat / durdur' },
  { id: 'search', keys: ['Ctrl', 'K'], description: 'Notlarda ara' },
  { id: 'help', keys: ['?'], description: 'Bu yardımı göster' },
];

type KeyInfo = Pick<
  KeyboardEvent,
  'key' | 'ctrlKey' | 'shiftKey' | 'altKey' | 'metaKey' | 'repeat' | 'target'
>;

/** Inputs, selects and anything inside an editable element (the note editor). */
export function isTextField(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])') !==
      null
  );
}

/** The shortcut a key press means, or null. Keys without a modifier never fire in text fields. */
export function matchShortcut(event: KeyInfo): ShortcutId | null {
  if (event.repeat || event.altKey || event.metaKey) return null;
  const key = event.key.toLowerCase();
  if (event.ctrlKey) {
    if (key === 'p' && event.shiftKey) return 'pomodoro';
    if (key === 'd' && event.shiftKey) return 'devPanel';
    if (event.shiftKey) return null;
    if (key === 'n') return 'newNote';
    if (key === 'k') return 'search';
    return null;
  }
  if (event.key === '?' && !isTextField(event.target)) return 'help';
  return null;
}
