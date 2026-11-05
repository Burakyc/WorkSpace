import { fireEvent, render, screen } from '@testing-library/react';
import { GraduationCap, Languages } from 'lucide-react';
import { Link, MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ContentEmptyPage } from './ContentEmptyPage';
import { installFakeContentApi } from './testing/fakeContentApi';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ContentEmptyPage', () => {
  it('keeps the pasted text of one module out of another', () => {
    installFakeContentApi();
    render(
      <MemoryRouter initialEntries={['/english']}>
        <Link to="/learning">Öğrenme</Link>
        <Routes>
          <Route
            path="/english"
            element={
              <ContentEmptyPage type="vocab" icon={Languages} title="İngilizce" description="d" />
            }
          />
          <Route
            path="/learning"
            element={
              <ContentEmptyPage
                type="lesson"
                icon={GraduationCap}
                title="Öğrenme"
                description="d"
              />
            }
          />
        </Routes>
      </MemoryRouter>,
    );
    fireEvent.change(screen.getByLabelText('İçe aktarılacak JSON'), { target: { value: '{}' } });

    fireEvent.click(screen.getByRole('link', { name: 'Öğrenme' }));

    expect(screen.getByRole('heading', { name: 'Öğrenme' })).toBeInTheDocument();
    expect(screen.getByLabelText('İçe aktarılacak JSON')).toHaveValue('');
  });
});
