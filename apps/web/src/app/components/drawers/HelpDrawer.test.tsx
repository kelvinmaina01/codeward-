import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HelpDrawer } from './HelpDrawer';

vi.mock('../../lib/toast-bridge', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

const STATUS_URL = 'https://codeward.instatus.com/';

describe('HelpDrawer status link', () => {
  afterEach(cleanup);

  it('links the operational status indicator to the external status page safely', () => {
    render(<HelpDrawer isOpen onClose={vi.fn()} />);

    const link = screen.getByRole('link', { name: 'All systems operational' });

    expect(link.getAttribute('href')).toBe(STATUS_URL);
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('does not expose the status link while the drawer is closed', () => {
    render(<HelpDrawer isOpen={false} onClose={vi.fn()} />);

    expect(
      screen.queryByRole('link', { name: 'All systems operational' }),
    ).toBeNull();
  });
});
