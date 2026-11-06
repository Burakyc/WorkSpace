import { describe, expect, it } from 'vitest';
import { isTextField, matchShortcut } from './shortcuts';

type Init = Partial<{
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  repeat: boolean;
  target: EventTarget | null;
}>;

const press = (key: string, init: Init = {}) =>
  matchShortcut({
    key,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    metaKey: false,
    repeat: false,
    target: document.body,
    ...init,
  });

describe('matchShortcut', () => {
  it('matches the modifier shortcuts', () => {
    expect(press('n', { ctrlKey: true })).toBe('newNote');
    expect(press('N', { ctrlKey: true })).toBe('newNote');
    expect(press('P', { ctrlKey: true, shiftKey: true })).toBe('pomodoro');
    expect(press('k', { ctrlKey: true })).toBe('search');
  });

  it('ignores other combinations', () => {
    expect(press('N', { ctrlKey: true, shiftKey: true })).toBeNull();
    expect(press('k', { ctrlKey: true, altKey: true })).toBeNull();
    expect(press('n')).toBeNull();
    expect(press('p', { ctrlKey: true })).toBeNull();
  });

  it('matches ? with or without Shift, never with Ctrl', () => {
    expect(press('?')).toBe('help');
    expect(press('?', { shiftKey: true })).toBe('help');
    expect(press('?', { ctrlKey: true })).toBeNull();
  });

  it('keeps ? for text fields but not modifier shortcuts', () => {
    const editable = document.createElement('div');
    editable.setAttribute('contenteditable', 'true');
    const inside = document.createElement('p');
    editable.append(inside);
    for (const target of [
      document.createElement('input'),
      document.createElement('textarea'),
      document.createElement('select'),
      inside,
    ]) {
      expect(press('?', { shiftKey: true, target })).toBeNull();
      expect(press('k', { ctrlKey: true, target })).toBe('search');
    }
    const locked = document.createElement('div');
    locked.setAttribute('contenteditable', 'false');
    expect(isTextField(locked)).toBe(false);
  });

  it('ignores auto-repeat', () => {
    expect(press('n', { ctrlKey: true, repeat: true })).toBeNull();
  });
});
