import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import GlobalTopBar from './GlobalTopBar.jsx';

describe('GlobalTopBar', () => {
  afterEach(() => {
    window.history.replaceState(null, '', '/');
  });

  it('keeps admin tabs usable on mobile', () => {
    render(
      <GlobalTopBar
        user={{ id: 'admin-1', role: 'student', is_admin: 1, realName: '管理员' }}
        activePage="admin"
        onNavigate={vi.fn()}
        onAccountClick={vi.fn()}
        isMobile
      />
    );

    expect(screen.getByRole('button', { name: '数据总览' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '用户管理' }));

    expect(window.location.hash).toBe('#tab=users');
    expect(screen.getByRole('button', { name: '用户管理' })).toHaveClass('gtb__tab--active');
  });
});
