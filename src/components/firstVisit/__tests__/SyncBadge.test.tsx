import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SyncBadge } from '../SyncBadge';

// The badge is a quiet, technical background signal — it must NOT shout an
// alarming "1,158 pending" outbox backlog at the inspector. It should only
// appear while something is actively syncing.
vi.mock('@/lib/firstVisit/useSyncEngine', () => ({
  useOnlineStatus: () => true,
}));

describe('SyncBadge', () => {
  it('renders nothing when nothing is syncing (pending=0)', () => {
    const { container } = render(<SyncBadge pending={0} syncing={false} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when not syncing even if pending > 0', () => {
    const { container } = render(<SyncBadge pending={5} syncing={false} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows a quiet "Syncing N changes…" message while syncing', () => {
    render(<SyncBadge pending={5} syncing={true} />);
    expect(screen.getByText(/Syncing 5 changes/i)).toBeInTheDocument();
  });

  it('uses the singular "change" for a single pending item', () => {
    render(<SyncBadge pending={1} syncing={true} />);
    expect(screen.getByText(/Syncing 1 change…/i)).toBeInTheDocument();
  });

  it('handles syncing with an unknown count (pending=0) without an alarming number', () => {
    render(<SyncBadge pending={0} syncing={true} />);
    // Still communicates background activity, but never a scary backlog number.
    expect(screen.getByText(/Syncing/i)).toBeInTheDocument();
    expect(screen.queryByText(/pending/i)).not.toBeInTheDocument();
  });
});
