import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EditSurveyButton } from '../EditSurveyButton';

// next/link renders a plain anchor in jsdom; pass children/href through.
vi.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

describe('EditSurveyButton', () => {
  it('renders an Edit survey link to /first-visit/edit (any logged-in user may edit)', () => {
    render(<EditSurveyButton />);
    const link = screen.getByRole('link', { name: /edit survey/i });
    expect(link).toHaveAttribute('href', '/first-visit/edit');
  });
});
