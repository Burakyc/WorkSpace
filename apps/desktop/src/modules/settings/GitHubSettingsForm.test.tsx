import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { installFakeGoalsApi } from '../goals/testing/fakeGoalsApi';
import { GitHubSettingsForm } from './GitHubSettingsForm';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('GitHubSettingsForm', () => {
  it('saves the username and shows an API error under the field', async () => {
    const api = installFakeGoalsApi([], { gitHubUsername: 'old' });
    render(<GitHubSettingsForm />);
    const field = await screen.findByLabelText('Kullanıcı adı');
    expect(field).toHaveValue('old');

    fireEvent.change(field, { target: { value: 'octo' } });
    fireEvent.click(screen.getByRole('button', { name: 'Kaydet' }));
    expect(await screen.findByText('Kaydedildi.')).toBeInTheDocument();
    expect(api.gitHubUsername()).toBe('octo');

    fireEvent.change(field, { target: { value: '-bad' } });
    fireEvent.click(screen.getByRole('button', { name: 'Kaydet' }));
    expect(await screen.findByText('Geçerli bir GitHub kullanıcı adı gir.')).toBeInTheDocument();
    expect(field).toHaveAttribute('aria-invalid', 'true');
  });

  it('saves a token through the bridge and then only says it is saved', async () => {
    const api = installFakeGoalsApi([]);
    render(<GitHubSettingsForm />);
    const tokenField = await screen.findByLabelText('Token (isteğe bağlı)');
    expect(tokenField).toHaveAttribute('type', 'password');

    fireEvent.change(tokenField, { target: { value: ' ghp_secret ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Tokeni kaydet' }));

    expect(await screen.findByText('Token kayıtlı.')).toBeInTheDocument();
    expect(api.secrets.set).toHaveBeenCalledWith('githubToken', 'ghp_secret');
    expect(screen.queryByLabelText('Token (isteğe bağlı)')).not.toBeInTheDocument();
    expect(document.body.textContent).not.toContain('ghp_secret');
  });

  it('deletes a saved token', async () => {
    const api = installFakeGoalsApi([], { hasToken: true });
    render(<GitHubSettingsForm />);

    fireEvent.click(await screen.findByRole('button', { name: 'Tokeni sil' }));

    expect(await screen.findByLabelText('Token (isteğe bağlı)')).toBeInTheDocument();
    expect(api.secrets.clear).toHaveBeenCalledWith('githubToken');
  });

  it("shows main's error when the token cannot be saved", async () => {
    installFakeGoalsApi([], { secretError: 'Bu bilgisayarda güvenli depolama kullanılamıyor.' });
    render(<GitHubSettingsForm />);

    fireEvent.change(await screen.findByLabelText('Token (isteğe bağlı)'), {
      target: { value: 'ghp_x' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Tokeni kaydet' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Bu bilgisayarda güvenli depolama kullanılamıyor.',
    );
  });
});
