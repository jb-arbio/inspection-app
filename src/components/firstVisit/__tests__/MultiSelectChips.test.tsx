import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { MultiSelectChips } from '../MultiSelectChips';
import { makeQuestion } from './_fixtures';

function Harness({
  options,
  allowCustom = false,
}: {
  options: string[];
  allowCustom?: boolean;
}) {
  const [value, setValue] = useState<string[]>([]);
  const q = makeQuestion({
    slug: 'q',
    label: 'Pick some',
    type: 'select',
    options,
    multi_select: true,
    allow_custom_options: allowCustom,
  });
  return (
    <>
      <div data-testid="value">{JSON.stringify(value)}</div>
      <MultiSelectChips id="q" question={q} value={value} onChange={setValue} />
    </>
  );
}

describe('MultiSelectChips', () => {
  it('toggles a chip on and off', async () => {
    const user = userEvent.setup();
    render(<Harness options={['Wifi', 'Parking']} />);
    await user.click(screen.getByRole('button', { name: 'Wifi' }));
    expect(screen.getByTestId('value').textContent).toBe('["Wifi"]');
    await user.click(screen.getByRole('button', { name: 'Wifi' }));
    expect(screen.getByTestId('value').textContent).toBe('[]');
  });

  it('None is exclusive — selecting None drops other selections', async () => {
    const user = userEvent.setup();
    render(<Harness options={['Wifi', 'Parking', 'None']} />);
    await user.click(screen.getByRole('button', { name: 'Wifi' }));
    await user.click(screen.getByRole('button', { name: 'Parking' }));
    expect(JSON.parse(screen.getByTestId('value').textContent || '[]')).toEqual([
      'Wifi',
      'Parking',
    ]);
    await user.click(screen.getByRole('button', { name: 'None' }));
    expect(JSON.parse(screen.getByTestId('value').textContent || '[]')).toEqual(['None']);
  });

  it('selecting a regular option while None is active drops None', async () => {
    const user = userEvent.setup();
    render(<Harness options={['Wifi', 'None']} />);
    await user.click(screen.getByRole('button', { name: 'None' }));
    expect(JSON.parse(screen.getByTestId('value').textContent || '[]')).toEqual(['None']);
    await user.click(screen.getByRole('button', { name: 'Wifi' }));
    expect(JSON.parse(screen.getByTestId('value').textContent || '[]')).toEqual(['Wifi']);
  });

  it('allow_custom_options appends a custom chip on Enter', async () => {
    const user = userEvent.setup();
    render(<Harness options={['Wifi']} allowCustom />);
    const input = screen.getByPlaceholderText('+ Add custom');
    await user.type(input, 'Sauna{Enter}');
    expect(screen.getByRole('button', { name: 'Sauna' })).toBeInTheDocument();
    expect(JSON.parse(screen.getByTestId('value').textContent || '[]')).toEqual(['Sauna']);
  });
});
