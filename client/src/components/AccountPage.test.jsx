import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import AccountPage from './AccountPage.jsx';

describe('AccountPage', () => {
  it('respects initialTab and stays in sync when the prop changes', () => {
    const { rerender } = render(
      <AccountPage
        user={{ id: 'user-1' }}
        onUpdate={vi.fn()}
        onBack={vi.fn()}
        initialTab="profile"
      />
    );

    expect(screen.getAllByText('基本资料').length).toBeGreaterThan(0);
    expect(screen.getByText('身份：')).toBeInTheDocument();

    rerender(
      <AccountPage
        user={{ id: 'user-1' }}
        onUpdate={vi.fn()}
        onBack={vi.fn()}
        initialTab="subscription"
      />
    );

    expect(screen.getByText('订阅与权益')).toBeInTheDocument();
  });

  it('renders the security section when initialTab is security', () => {
    render(
      <AccountPage
        user={{ id: 'user-1' }}
        onUpdate={vi.fn()}
        onBack={vi.fn()}
        initialTab="security"
      />
    );

    expect(screen.getByText('账号安全')).toBeInTheDocument();
    expect(screen.getByText('密码')).toBeInTheDocument();
    expect(screen.queryByText('安全')).not.toBeInTheDocument();
  });

  it('falls back to profile for invalid initial tabs and still allows switching', () => {
    const { rerender } = render(
      <AccountPage
        user={{ id: 'user-1' }}
        onUpdate={vi.fn()}
        onBack={vi.fn()}
        initialTab="invalid"
      />
    );

    expect(screen.getAllByText('基本资料').length).toBeGreaterThan(0);
    expect(screen.getByText('身份：')).toBeInTheDocument();

    rerender(
      <AccountPage
        user={{ id: 'user-1' }}
        onUpdate={vi.fn()}
        onBack={vi.fn()}
        initialTab="subscription"
      />
    );
    expect(screen.getByText('订阅与权益')).toBeInTheDocument();
  });
});
