import { X } from 'lucide-react';
import { useId, useState, type KeyboardEvent } from 'react';
import form from '../../shared/ui/form.module.css';
import { isValidTag, MAX_TAGS, normalizeTag, TAG_RULE, TOO_MANY_TAGS } from './tags';
import styles from './TagInput.module.css';

interface TagInputProps {
  label: string;
  /** Normalized tags, shown with '#'. */
  tags: string[];
  onChange(tags: string[]): void;
  /** Earlier tags offered while typing (chosen ones are left out). */
  suggestions: string[];
  disabled?: boolean;
}

/** Enter, comma, space or leaving the field adds the typed tag; Backspace in an empty field removes the last one. */
export function TagInput({ label, tags, onChange, suggestions, disabled = false }: TagInputProps) {
  const id = useId();
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);

  function add() {
    const tag = normalizeTag(text);
    if (tag === '') {
      setText('');
      return;
    }
    if (!isValidTag(tag)) {
      setError(TAG_RULE);
      return;
    }
    if (!tags.includes(tag)) {
      if (tags.length >= MAX_TAGS) {
        setError(TOO_MANY_TAGS);
        return;
      }
      onChange([...tags, tag]);
    }
    setText('');
    setError(null);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter' || event.key === ',' || event.key === ' ') {
      event.preventDefault();
      add();
    } else if (event.key === 'Backspace' && text === '' && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  }

  const offered = suggestions.filter((tag) => !tags.includes(tag));

  return (
    <div className={form.field}>
      <label htmlFor={`${id}-input`}>{label}</label>
      <div className={styles.box}>
        {tags.length > 0 && (
          <ul className={styles.chips} aria-label="Seçili etiketler">
            {tags.map((tag) => (
              <li key={tag} className={styles.chip}>
                #{tag}
                {!disabled && (
                  <button
                    type="button"
                    className={styles.remove}
                    aria-label={`#${tag} etiketini kaldır`}
                    onClick={() => onChange(tags.filter((t) => t !== tag))}
                  >
                    <X aria-hidden="true" size={12} />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
        {!disabled && (
          <input
            id={`${id}-input`}
            className={styles.input}
            list={`${id}-suggestions`}
            placeholder="#etiket"
            value={text}
            onChange={(event) => {
              setText(event.target.value);
              setError(null);
            }}
            onKeyDown={onKeyDown}
            onBlur={add}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${id}-error` : undefined}
          />
        )}
      </div>
      <datalist id={`${id}-suggestions`}>
        {offered.map((tag) => (
          <option key={tag} value={`#${tag}`} />
        ))}
      </datalist>
      {error && (
        <p id={`${id}-error`} className={form.fieldError}>
          {error}
        </p>
      )}
    </div>
  );
}
