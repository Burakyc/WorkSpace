import { en } from '@blocknote/core/locales';

type SlashKey = keyof typeof en.slash_menu;

/** The slash menu items the editor offers, in menu order. Media, tables and minor headings are left out. */
export const slashMenuKeys: readonly SlashKey[] = [
  'heading',
  'heading_2',
  'heading_3',
  'toggle_heading',
  'toggle_heading_2',
  'toggle_heading_3',
  'paragraph',
  'bullet_list',
  'numbered_list',
  'check_list',
  'toggle_list',
  'quote',
  'code_block',
  'divider',
];

const turkish: Partial<
  Record<SlashKey, [title: string, subtext: string, group: string, aliases: string[]]>
> = {
  heading: ['Başlık 1', 'En üst düzey başlık', 'Başlıklar', ['baslik', 'b1']],
  heading_2: ['Başlık 2', 'Bölüm başlığı', 'Başlıklar', ['baslik2', 'b2']],
  heading_3: ['Başlık 3', 'Alt bölüm başlığı', 'Başlıklar', ['baslik3', 'b3']],
  toggle_heading: ['Açılır başlık 1', 'Gizlenebilir başlık', 'Açılır başlıklar', ['acilir']],
  toggle_heading_2: [
    'Açılır başlık 2',
    'Gizlenebilir bölüm başlığı',
    'Açılır başlıklar',
    ['acilir'],
  ],
  toggle_heading_3: ['Açılır başlık 3', 'Gizlenebilir alt başlık', 'Açılır başlıklar', ['acilir']],
  paragraph: ['Paragraf', 'Düz metin', 'Temel bloklar', ['metin', 'paragraf']],
  bullet_list: ['Madde listesi', 'Sırasız liste', 'Temel bloklar', ['liste', 'madde']],
  numbered_list: ['Numaralı liste', 'Sıralı liste', 'Temel bloklar', ['liste', 'numara']],
  check_list: ['Yapılacaklar listesi', 'Onay kutulu liste', 'Temel bloklar', ['yapilacak', 'onay']],
  toggle_list: [
    'Açılır liste',
    'Alt öğeleri gizlenebilen liste',
    'Temel bloklar',
    ['acilir', 'toggle'],
  ],
  quote: ['Alıntı', 'Alıntı ya da vurgu', 'Temel bloklar', ['alinti']],
  code_block: ['Kod bloğu', 'Sözdizimi renklendirmeli kod', 'Temel bloklar', ['kod']],
  divider: ['Ayırıcı', 'Blokları görsel olarak ayırır', 'Temel bloklar', ['ayirici', 'cizgi']],
};

const slash_menu = { ...en.slash_menu };
for (const [key, [title, subtext, group, aliases]] of Object.entries(turkish) as [
  SlashKey,
  [string, string, string, string[]],
][]) {
  const item = en.slash_menu[key];
  slash_menu[key] = { ...item, title, subtext, group, aliases: [...item.aliases, ...aliases] };
}

/**
 * BlockNote 0.56.0 has no Turkish dictionary: the English one with Turkish placeholders and slash menu items.
 * Untranslated tooltips stay English.
 */
export const editorDictionary = {
  ...en,
  slash_menu,
  placeholders: {
    ...en.placeholders,
    default: "Yaz ya da komutlar için '/' tuşuna bas",
    heading: 'Başlık',
    toggleListItem: 'Açılır öğe',
    bulletListItem: 'Liste',
    numberedListItem: 'Liste',
    checkListItem: 'Liste',
  },
};
