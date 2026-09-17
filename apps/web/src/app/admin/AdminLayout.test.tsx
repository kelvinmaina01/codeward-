import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminLayout } from './AdminLayout';

vi.mock('../lib/toast-bridge', () => ({
  GooeyToaster: () => null,
}));

vi.mock('../components/shared/FloatingStreamWidget', () => ({
  FloatingStreamWidget: () => null,
}));

const STATUS_URL = 'https://codeward.instatus.com/';

function renderAdminLayout(path = '/admin') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AdminLayout />
    </MemoryRouter>,
  );
}

describe('AdminLayout status link', () => {
  beforeEach(() => {
    // AdminLayout currently passes this pre-existing global callback to the
    // mocked stream widget; it is unrelated to the status-link behavior.
    vi.stubGlobal('navigate', vi.fn());
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('links the operational status indicator to the external status page safely', () => {
    renderAdminLayout();

    const link = screen.getByRole('link', { name: 'All systems operational' });

    expect(link.getAttribute('href')).toBe(STATUS_URL);
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('does not render the status link when the admin topbar is hidden', () => {
    renderAdminLayout('/admin/commits');

    expect(
      screen.queryByRole('link', { name: 'All systems operational' }),
    ).toBeNull();
  });
});
