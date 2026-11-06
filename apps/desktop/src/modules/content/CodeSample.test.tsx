import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CodeSample } from './CodeSample';
import { highlightCSharp } from './highlight';

vi.mock('./highlight', () => ({ highlightCSharp: vi.fn() }));

afterEach(() => {
  vi.mocked(highlightCSharp).mockReset();
});

describe('CodeSample', () => {
  it('shows plain code at once, then coloured tokens', async () => {
    type Lines = Awaited<ReturnType<typeof highlightCSharp>>;
    const resolvers: ((lines: Lines) => void)[] = [];
    vi.mocked(highlightCSharp).mockReturnValue(new Promise<Lines>((r) => resolvers.push(r)));
    const { container } = render(<CodeSample code="var x;" />);

    expect(screen.getByText('var x;')).toBeInTheDocument();
    resolvers[0]?.([[{ content: 'var', light: '#d73a49', dark: '#f97583' }, { content: ' x;' }]]);

    await waitFor(() => expect(container.querySelector('code span span')).not.toBeNull());
    const keyword = container.querySelector('code span span') as HTMLElement;
    expect(keyword).toHaveTextContent('var');
    expect(keyword.style.getPropertyValue('--shiki-dark')).toBe('#f97583');
    expect(container.querySelector('code')).toHaveTextContent('var x;');
  });

  it('keeps the plain code when highlighting fails', async () => {
    vi.mocked(highlightCSharp).mockRejectedValue(new Error('no engine'));
    const { container } = render(<CodeSample code="int y;" />);

    await waitFor(() => expect(highlightCSharp).toHaveBeenCalled());
    expect(container.querySelector('code')?.textContent).toBe('int y;');
  });
});
