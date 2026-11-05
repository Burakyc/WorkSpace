import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { TagInput } from './TagInput';

function Harness({ initial = [] as string[], suggestions = [] as string[] }) {
  const [tags, setTags] = useState(initial);
  return (
    <>
      <TagInput label="Etiketler" tags={tags} onChange={setTags} suggestions={suggestions} />
      <p data-testid="value">{tags.join(',')}</p>
    </>
  );
}

const input = () => screen.getByLabelText('Etiketler');
const value = () => screen.getByTestId('value').textContent;
const type = (text: string, key: string) => {
  fireEvent.change(input(), { target: { value: text } });
  fireEvent.keyDown(input(), { key });
};

describe('TagInput', () => {
  it('adds normalized tags with Enter, comma and space, without duplicates', () => {
    render(<Harness />);

    type('#DI', 'Enter');
    type('EF', ',');
    type('api', ' ');
    type('#di', 'Enter');

    expect(value()).toBe('di,ef,api');
    expect(screen.getByText('#di')).toBeInTheDocument();
    expect(input()).toHaveValue('');
  });

  it('removes a tag with its button and the last one with Backspace', () => {
    render(<Harness initial={['di', 'ef', 'api']} />);

    fireEvent.click(screen.getByRole('button', { name: '#ef etiketini kaldır' }));
    expect(value()).toBe('di,api');
    fireEvent.keyDown(input(), { key: 'Backspace' });

    expect(value()).toBe('di');
  });

  it('explains invalid tags and keeps the text', () => {
    render(<Harness />);

    type('a/b', 'Enter');

    expect(
      screen.getByText(
        'Etiketler en fazla 30 karakter olabilir ve yalnızca harf, rakam, - ve _ içerebilir.',
      ),
    ).toBeInTheDocument();
    expect(input()).toHaveValue('a/b');
    expect(value()).toBe('');
  });

  it('suggests earlier tags that are not chosen yet', () => {
    const { container } = render(<Harness initial={['di']} suggestions={['di', 'efcore']} />);

    const options = [...container.querySelectorAll('datalist option')].map((o) =>
      o.getAttribute('value'),
    );
    expect(options).toEqual(['#efcore']);
  });
});
