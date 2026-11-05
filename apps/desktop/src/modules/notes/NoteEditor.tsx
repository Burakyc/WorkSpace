import '@blocknote/mantine/style.css';
import {
  BlockNoteSchema,
  createCodeBlockSpec,
  defaultBlockSpecs,
  filterSuggestionItems,
  type PartialBlock,
} from '@blocknote/core';
import { syntaxHighlighter } from '@blocknote/code-block';
import { BlockNoteView } from '@blocknote/mantine';
import {
  getDefaultReactSlashMenuItems,
  SuggestionMenuController,
  useCreateBlockNote,
} from '@blocknote/react';
import { useSyncExternalStore } from 'react';
import { editorDictionary, slashMenuKeys } from './editorDictionary';

const languages = {
  csharp: { name: 'C#', aliases: ['cs', 'c#'] },
  typescript: { name: 'TypeScript', aliases: ['ts'] },
  javascript: { name: 'JavaScript', aliases: ['js'] },
  json: { name: 'JSON' },
  sql: { name: 'SQL' },
  bash: { name: 'Bash', aliases: ['sh', 'shell'] },
  html: { name: 'HTML' },
  css: { name: 'CSS' },
  markdown: { name: 'Markdown', aliases: ['md'] },
  text: { name: 'Düz metin', aliases: ['txt'] },
};

const schema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    codeBlock: createCodeBlockSpec({ defaultLanguage: 'csharp', supportedLanguages: languages }),
  },
});

// Default items carry no key in their type, so they are matched by their (translated) title.
const offered = new Set(slashMenuKeys.map((key) => editorDictionary.slash_menu[key].title));

const darkQuery = () => window.matchMedia('(prefers-color-scheme: dark)');
const subscribe = (onChange: () => void) => {
  const dark = darkQuery();
  dark.addEventListener('change', onChange);
  return () => dark.removeEventListener('change', onChange);
};

interface NoteEditorProps {
  /** The stored BlockNote blocks; empty for a new page. */
  initialBlocks: unknown[];
  /** Called with the whole document after every change. */
  onChange(blocks: unknown[]): void;
}

/** BlockNote with the Turkish slash menu, highlighted code blocks and the OS theme. */
export function NoteEditor({ initialBlocks, onChange }: NoteEditorProps) {
  const editor = useCreateBlockNote({
    schema,
    dictionary: editorDictionary,
    extensions: [syntaxHighlighter],
    // The API stores what this editor produced, so the blocks match the schema.
    initialContent: initialBlocks.length > 0 ? (initialBlocks as PartialBlock[]) : undefined,
  });
  const theme = useSyncExternalStore(subscribe, () => (darkQuery().matches ? 'dark' : 'light'));

  return (
    <BlockNoteView
      editor={editor}
      theme={theme}
      slashMenu={false}
      onChange={() => onChange(editor.document)}
    >
      <SuggestionMenuController
        triggerCharacter="/"
        getItems={(query) =>
          Promise.resolve(
            filterSuggestionItems(
              getDefaultReactSlashMenuItems(editor).filter((item) => offered.has(item.title)),
              query,
            ),
          )
        }
      />
    </BlockNoteView>
  );
}
