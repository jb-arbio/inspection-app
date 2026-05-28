import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CopyFromUnitPicker } from '../CopyFromUnitPicker';
import { localDb, type LocalTarget, type LocalAnswer } from '@/lib/firstVisit/db';

function unit(id: string, label: string, inspection_id = 'i1'): LocalTarget {
  return {
    id,
    inspection_id,
    kind: 'unit',
    parent_id: 'prop-1',
    unit_category_id: `uc-${id}`,
    label,
    created_on_site: false,
    order: 0,
  };
}

function answer(target_id: string, slug: string, value: unknown): LocalAnswer {
  return {
    id: `${target_id}-${slug}`,
    inspection_id: 'i1',
    target_id,
    scope: 'unit_category',
    question_key: slug,
    area_key: 'default',
    value,
    was_prefilled: false,
    was_accepted_as_is: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

describe('CopyFromUnitPicker', () => {
  beforeEach(async () => {
    await localDb.targets.clear();
    await localDb.answers.clear();
  });

  afterEach(async () => {
    await localDb.targets.clear();
    await localDb.answers.clear();
  });

  it('renders the closed trigger by default', () => {
    render(
      <CopyFromUnitPicker
        inspectionId="i1"
        currentUnitId="u1"
        onCopy={async () => {}}
      />,
    );
    expect(
      screen.getByRole('button', { name: /Copy from another unit/i }),
    ).toBeInTheDocument();
  });

  it('opens on click and shows the empty-state when no other units exist', async () => {
    render(
      <CopyFromUnitPicker
        inspectionId="i1"
        currentUnitId="u1"
        onCopy={async () => {}}
      />,
    );
    await userEvent.click(
      screen.getByRole('button', { name: /Copy from another unit/i }),
    );
    expect(await screen.findByText(/Copy answers from/i)).toBeInTheDocument();
    expect(
      await screen.findByText(/No other units in this visit yet/i),
    ).toBeInTheDocument();
  });

  it('lists other units ordered by answer count descending; excludes current unit', async () => {
    await localDb.targets.bulkPut([
      unit('u1', 'Current Unit'),
      unit('u2', 'Studio A'),
      unit('u3', 'Studio B'),
      unit('u4', 'Studio C'),
      // A unit in a different inspection — must be excluded
      unit('u5', 'Other Visit', 'i2'),
    ]);
    // u2 has 1 meaningful answer, u3 has 3, u4 has 0
    await localDb.answers.bulkPut([
      answer('u2', 'q1', 'val'),
      answer('u3', 'q1', 'val'),
      answer('u3', 'q2', 42),
      answer('u3', 'q3', false),
      // Non-meaningful values do not count
      answer('u4', 'q1', null),
      answer('u4', 'q2', ''),
    ]);

    render(
      <CopyFromUnitPicker
        inspectionId="i1"
        currentUnitId="u1"
        onCopy={async () => {}}
      />,
    );
    await userEvent.click(
      screen.getByRole('button', { name: /Copy from another unit/i }),
    );

    await waitFor(() => {
      expect(screen.getByText('Studio A')).toBeInTheDocument();
      expect(screen.getByText('Studio B')).toBeInTheDocument();
      expect(screen.getByText('Studio C')).toBeInTheDocument();
    });

    expect(screen.queryByText('Current Unit')).toBeNull();
    expect(screen.queryByText('Other Visit')).toBeNull();

    // Order by answerCount desc — find list items in DOM order
    const items = screen.getAllByRole('button').filter((b) =>
      ['Studio A', 'Studio B', 'Studio C'].some((label) =>
        b.textContent?.includes(label),
      ),
    );
    expect(items[0].textContent).toContain('Studio B'); // 3 answers
    expect(items[1].textContent).toContain('Studio A'); // 1 answer
    expect(items[2].textContent).toContain('Studio C'); // 0 answers
  });

  it('marks empty units as disabled with an "empty" label and does not fire onCopy', async () => {
    await localDb.targets.bulkPut([unit('u1', 'Current'), unit('u2', 'Empty Unit')]);

    const onCopy = vi.fn();
    render(
      <CopyFromUnitPicker
        inspectionId="i1"
        currentUnitId="u1"
        onCopy={onCopy}
      />,
    );
    await userEvent.click(
      screen.getByRole('button', { name: /Copy from another unit/i }),
    );
    const target = await screen.findByRole('button', { name: /Empty Unit/i });
    expect(target).toBeDisabled();
    expect(target.textContent).toMatch(/empty/i);

    // userEvent respects disabled — click is a no-op
    await userEvent.click(target);
    expect(onCopy).not.toHaveBeenCalled();
  });

  it('clicking a non-empty unit fires onCopy with that unit id', async () => {
    await localDb.targets.bulkPut([unit('u1', 'Current'), unit('u2', 'Studio A')]);
    await localDb.answers.bulkPut([answer('u2', 'q1', 'something')]);

    const onCopy = vi.fn().mockResolvedValue(undefined);
    render(
      <CopyFromUnitPicker
        inspectionId="i1"
        currentUnitId="u1"
        onCopy={onCopy}
      />,
    );
    await userEvent.click(
      screen.getByRole('button', { name: /Copy from another unit/i }),
    );
    const target = await screen.findByRole('button', { name: /Studio A/i });
    await userEvent.click(target);
    expect(onCopy).toHaveBeenCalledWith('u2');
  });
});
