import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { STYLE_EXAMPLES } from './exampleTexts';
import { StylePromptSection } from './StylePromptSection';
import { installFakePostsApi } from './testing/fakePostsApi';

const saved = {
  text: 'Current style',
  updatedAt: '2026-11-08T12:00:00Z',
  history: [{ text: 'Old style', savedAt: '2026-11-07T12:00:00Z' }],
};

const box = () => screen.findByLabelText('Stil promptun');
const saveButton = () => screen.getByRole('button', { name: 'Kaydet' });

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('StylePromptSection', () => {
  it('shows the saved text and its history', async () => {
    installFakePostsApi({ style: saved });
    render(<StylePromptSection />);

    expect(await box()).toHaveValue('Current style');
    expect(screen.getByText('Old style')).toBeInTheDocument();
    expect(saveButton()).toBeDisabled();
    expect(screen.queryByText(/Henüz stil promptun yok/)).not.toBeInTheDocument();
  });

  it('starts empty with the hint and both examples', async () => {
    installFakePostsApi();
    render(<StylePromptSection />);

    expect(await box()).toHaveValue('');
    expect(screen.getByText(/Henüz stil promptun yok/)).toBeInTheDocument();
    expect(screen.getByText('Henüz eski sürüm yok.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'İngilizce örnek' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Türkçe örnek' })).toBeInTheDocument();
  });

  it('says so when the prompt cannot be loaded', async () => {
    installFakePostsApi({ failStyle: true });
    render(<StylePromptSection />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Stil promptu yüklenemedi.');
  });

  it.each(['İngilizce', 'Türkçe'])(
    'takes the %s example into the box unsaved',
    async (language) => {
      const api = installFakePostsApi();
      render(<StylePromptSection />);
      const input = await box();

      fireEvent.click(screen.getByRole('button', { name: `${language} örneği kutuya al` }));

      const example = STYLE_EXAMPLES.find((item) => item.language === language)!;
      expect(input).toHaveValue(example.text);
      expect(input).toHaveFocus();
      expect(screen.getByText('Kaydedilmemiş değişiklik var.')).toBeInTheDocument();
      expect(api.requests.filter((request) => request.method === 'PUT')).toEqual([]);

      fireEvent.click(saveButton());

      expect(await screen.findByText('Kaydedildi.')).toBeInTheDocument();
      expect(api.requests.at(-1)).toMatchObject({ method: 'PUT', body: { text: example.text } });
    },
  );

  it('saves a change and lists the old text', async () => {
    installFakePostsApi({ style: saved });
    render(<StylePromptSection />);

    fireEvent.change(await box(), { target: { value: 'New style' } });
    fireEvent.click(saveButton());

    expect(await screen.findByText('Kaydedildi.')).toBeInTheDocument();
    expect(screen.getByText('Current style')).toBeInTheDocument();
    expect(saveButton()).toBeDisabled();
  });

  it('shows the field error and keeps the text', async () => {
    installFakePostsApi({ styleError: 'Stil promptu en fazla 5.000 karakter olabilir.' });
    render(<StylePromptSection />);

    fireEvent.change(await box(), { target: { value: 'x' } });
    fireEvent.click(saveButton());

    expect(
      await screen.findByText('Stil promptu en fazla 5.000 karakter olabilir.'),
    ).toBeInTheDocument();
    expect(await box()).toHaveValue('x');
    expect(await box()).toHaveAttribute('aria-invalid', 'true');
  });

  it('keeps the text when saving fails', async () => {
    installFakePostsApi({ failStyleSave: true });
    render(<StylePromptSection />);

    fireEvent.change(await box(), { target: { value: 'x' } });
    fireEvent.click(saveButton());

    expect(await screen.findByRole('alert')).toHaveTextContent('Stil promptu kaydedilemedi.');
    expect(await box()).toHaveValue('x');
    await waitFor(() => expect(saveButton()).toBeEnabled());
  });

  it('takes an old version into the box unsaved', async () => {
    const api = installFakePostsApi({ style: saved });
    render(<StylePromptSection />);
    const input = await box();

    fireEvent.click(screen.getByRole('button', { name: /sürümünü kutuya al$/ }));

    expect(input).toHaveValue('Old style');
    expect(input).toHaveFocus();
    expect(api.requests.filter((request) => request.method === 'PUT')).toEqual([]);
  });
});
