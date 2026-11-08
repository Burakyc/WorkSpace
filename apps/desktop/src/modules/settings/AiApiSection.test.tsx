import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { installFakeContentApi } from '../content/testing/fakeContentApi';
import { AiApiSection } from './AiApiSection';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('AiApiSection', () => {
  it('saves a key and then only shows that it exists', async () => {
    installFakeContentApi();
    render(<AiApiSection />);

    const field = await screen.findByLabelText('Claude API anahtarı');
    expect(field).toHaveAttribute('type', 'password');
    fireEvent.change(field, { target: { value: ' sk-ant-x ' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Anahtarı kaydet' })[0]!);

    expect(await screen.findByText('Claude API anahtarı: Anahtar kayıtlı.')).toBeInTheDocument();
    expect(window.devpath.secrets.set).toHaveBeenCalledWith('anthropicApiKey', 'sk-ant-x');
    expect(screen.queryByDisplayValue('sk-ant-x')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Gemini API anahtarı')).toBeInTheDocument();
  });

  it('deletes a saved key', async () => {
    installFakeContentApi({ secrets: ['geminiApiKey'] });
    render(<AiApiSection />);

    fireEvent.click(await screen.findByRole('button', { name: 'Anahtarı sil' }));

    expect(await screen.findByLabelText('Gemini API anahtarı')).toBeInTheDocument();
    expect(window.devpath.secrets.clear).toHaveBeenCalledWith('geminiApiKey');
  });

  it('shows a refused save', async () => {
    installFakeContentApi();
    vi.mocked(window.devpath.secrets.set).mockRejectedValueOnce(new Error('Token geçersiz.'));
    render(<AiApiSection />);

    fireEvent.change(await screen.findByLabelText('Gemini API anahtarı'), {
      target: { value: 'g' },
    });
    fireEvent.click(screen.getAllByRole('button', { name: 'Anahtarı kaydet' })[1]!);

    expect(await screen.findByRole('alert')).toHaveTextContent('Token geçersiz.');
  });

  it('saves the provider', async () => {
    const api = installFakeContentApi();
    render(<AiApiSection />);

    const select = await screen.findByLabelText('Sağlayıcı');
    await vi.waitFor(() => expect(select).toHaveValue('claude'));
    fireEvent.change(select, { target: { value: 'gemini' } });

    await vi.waitFor(() =>
      expect(api.requests).toContainEqual({
        method: 'PUT',
        path: '/api/settings/ai-provider',
        body: { provider: 'gemini' },
      }),
    );
  });
});
