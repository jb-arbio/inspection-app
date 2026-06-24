import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { EditSurveyButton } from '../EditSurveyButton';
import { isAdminEmailClient } from '@/lib/firstVisit/adminAccess';

// next/link renders a plain anchor in jsdom; pass children/href through.
vi.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

// Resolve a fixed email; admin gating is driven by the mocked adminAccess.
vi.mock('@/lib/firstVisit/hubSupabase', () => ({
  getHubSupabase: () => ({
    auth: {
      getUser: async () => ({ data: { user: { email: 'someone@arbio-group.com' } } }),
    },
  }),
}));

vi.mock('@/lib/firstVisit/adminAccess', () => ({
  isAdminEmailClient: vi.fn(),
}));

const mockedIsAdmin = vi.mocked(isAdminEmailClient);

describe('EditSurveyButton', () => {
  beforeEach(() => {
    mockedIsAdmin.mockReset();
  });

  it('renders an Edit survey link to /first-visit/edit for an admin user', async () => {
    mockedIsAdmin.mockReturnValue(true);
    render(<EditSurveyButton />);
    const link = await screen.findByRole('link', { name: /edit survey/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/first-visit/edit');
  });

  it('renders nothing for a non-admin user', async () => {
    mockedIsAdmin.mockReturnValue(false);
    render(<EditSurveyButton />);
    // Give the effect time to resolve, then assert no link appeared.
    await waitFor(() => expect(mockedIsAdmin).toHaveBeenCalled());
    expect(screen.queryByRole('link', { name: /edit survey/i })).toBeNull();
  });
});
