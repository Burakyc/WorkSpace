import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CopyPromptButton } from './CopyPromptButton';

afterEach(() => {
  vi.unstubAllGlobals();
});

function stubClipboard(writeText: (text: string) => Promise<void>) {
  vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText: vi.fn(writeText) } });
  return navigator.clipboard.writeText as ReturnType<typeof vi.fn>;
}

describe('CopyPromptButton', () => {
  it('copies the template of its type', async () => {
    const writeText = stubClipboard(() => Promise.resolve());
    render(<CopyPromptButton type="interview" />);

    fireEvent.click(screen.getByRole('button', { name: 'Promptu kopyala' }));

    expect(await screen.findByText('Kopyalandı.')).toBeInTheDocument();
    const copied = String(writeText.mock.calls[0]?.[0]);
    expect(copied).toMatch(/^Topic:/);
    expect(copied).toContain('"type": "interview"');
  });

  it('says so when the clipboard refuses', async () => {
    stubClipboard(() => Promise.reject(new Error('denied')));
    render(<CopyPromptButton type="vocab" />);

    fireEvent.click(screen.getByRole('button', { name: 'Promptu kopyala' }));

    expect(await screen.findByText('Kopyalanamadı.')).toBeInTheDocument();
  });
});
