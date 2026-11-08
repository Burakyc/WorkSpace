import en from '../../../../../prompts/style-example-en.md?raw';
import tr from '../../../../../prompts/style-example-tr.md?raw';

/** The read-only examples of the style section, bundled at build time. */
export const STYLE_EXAMPLES: readonly { language: string; text: string }[] = [
  { language: 'İngilizce', text: en.trimEnd() },
  { language: 'Türkçe', text: tr.trimEnd() },
];
