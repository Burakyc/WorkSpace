import en from '../../../../../prompts/style-example-en.md?raw';
import tr from '../../../../../prompts/style-example-tr.md?raw';

// A Windows checkout gives these files CRLF; the style box and the saved text use LF.
const clean = (text: string) => text.replace(/\r\n/g, '\n').trimEnd();

/** The read-only examples of the style section, bundled at build time. */
export const STYLE_EXAMPLES: readonly { language: string; text: string }[] = [
  { language: 'İngilizce', text: clean(en) },
  { language: 'Türkçe', text: clean(tr) },
];
