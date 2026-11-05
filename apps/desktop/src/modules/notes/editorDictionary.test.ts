import { describe, expect, it } from 'vitest';
import { en } from '@blocknote/core/locales';
import { editorDictionary, slashMenuKeys } from './editorDictionary';

describe('editorDictionary', () => {
  it('has Turkish placeholders and slash menu items', () => {
    expect(editorDictionary.placeholders.default).toBe("Yaz ya da komutlar için '/' tuşuna bas");
    expect(editorDictionary.slash_menu.heading.title).toBe('Başlık 1');
    expect(editorDictionary.slash_menu.code_block.title).toBe('Kod bloğu');
    expect(editorDictionary.slash_menu.toggle_list.aliases).toContain('acilir');
  });

  it('translates every offered item and keeps groups together', () => {
    const groups = slashMenuKeys.map((key) => editorDictionary.slash_menu[key].group);
    expect(new Set(groups).size).toBe(groups.filter((g, i) => g !== groups[i - 1]).length);
    expect(
      slashMenuKeys.filter(
        (key) => editorDictionary.slash_menu[key].title === en.slash_menu[key].title,
      ),
    ).toEqual([]);
  });
});
