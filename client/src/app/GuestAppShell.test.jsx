import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import GuestAppShell from './GuestAppShell.jsx';

function renderGuestAppShell(props = {}) {
  const onNavigate = vi.fn();
  const setAuthMode = vi.fn();
  const setGuestAuthState = vi.fn();

  render(
    <GuestAppShell
      page="tasks"
      isMobile={false}
      serviceError=""
      authMode="login"
      setAuthMode={setAuthMode}
      questions={[]}
      guestWritingDraft={null}
      setGuestWritingDraft={vi.fn()}
      guestAuthState={null}
      setGuestAuthState={setGuestAuthState}
      guestDraftFlags={[]}
      onLogin={vi.fn()}
      onNavigate={onNavigate}
      {...props}
    />
  );

  return { onNavigate, setAuthMode, setGuestAuthState };
}

describe('GuestAppShell', () => {
  it('redirects protected pages to auth for guests', async () => {
    const { onNavigate, setAuthMode, setGuestAuthState } = renderGuestAppShell();

    await waitFor(() => {
      expect(onNavigate).toHaveBeenCalledWith('auth', { replace: true });
    });
    expect(setAuthMode).toHaveBeenCalledWith('login');
    expect(setGuestAuthState).toHaveBeenCalledWith({
      open: false,
      mode: 'login',
      target: 'tasks',
      returnPage: 'portal',
    });
  });

  it('redirects admin page to auth for guests', async () => {
    const { onNavigate, setGuestAuthState } = renderGuestAppShell({ page: 'admin' });

    await waitFor(() => {
      expect(onNavigate).toHaveBeenCalledWith('auth', { replace: true });
    });
    expect(setGuestAuthState).toHaveBeenCalledWith({
      open: false,
      mode: 'login',
      target: 'admin',
      returnPage: 'portal',
    });
  });

  it.each([
    'listening-workbench',
    'vocab-workbench',
    'phonetics-workbench',
  ])('redirects protected teacher module page %s to auth for guests', async (page) => {
    const { onNavigate, setAuthMode, setGuestAuthState } = renderGuestAppShell({ page });

    await waitFor(() => {
      expect(onNavigate).toHaveBeenCalledWith('auth', { replace: true });
    });
    expect(setAuthMode).toHaveBeenCalledWith('login');
    expect(setGuestAuthState).toHaveBeenCalledWith({
      open: false,
      mode: 'login',
      target: page,
      returnPage: 'portal',
    });
  });

  it('renders the writing refine parent route instead of a blank page', async () => {
    renderGuestAppShell({ page: 'writing-refine' });

    expect(await screen.findByRole('heading', { name: '句句打磨，表达自如。' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '想练习哪种句子？' })).toBeInTheDocument();
  });

  it('renders both writing refine child pages for guests', async () => {
    const { rerender } = render(
      <GuestAppShell
        page="writing-refine-sentence"
        isMobile={false}
        serviceError=""
        authMode="login"
        setAuthMode={vi.fn()}
        questions={[]}
        guestWritingDraft={null}
        setGuestWritingDraft={vi.fn()}
        guestAuthState={null}
        setGuestAuthState={vi.fn()}
        guestDraftFlags={[]}
        onLogin={vi.fn()}
        onNavigate={vi.fn()}
      />
    );

    expect(await screen.findByRole('heading', { name: '句句打磨，表达自如。' })).toBeInTheDocument();

    rerender(
      <GuestAppShell
        page="writing-refine-structure"
        isMobile={false}
        serviceError=""
        authMode="login"
        setAuthMode={vi.fn()}
        questions={[]}
        guestWritingDraft={null}
        setGuestWritingDraft={vi.fn()}
        guestAuthState={null}
        setGuestAuthState={vi.fn()}
        guestDraftFlags={[]}
        onLogin={vi.fn()}
        onNavigate={vi.fn()}
      />
    );

    expect(await screen.findByRole('heading', { name: '胸有成竹，下笔有神。' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /议论文/ })).toBeInTheDocument();
  });

  it('marks only writing practice active in the guest writing bank page', async () => {
    renderGuestAppShell({ page: 'writing-bank' });

    expect(await screen.findByRole('heading', { name: '题库练兵，考场不慌。' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '写作批改' })).not.toHaveClass('gtb__tab--active');
    expect(screen.getByRole('button', { name: '真题练习' })).toHaveClass('gtb__tab--active');
  });

  it('renders the guest manual writing page instead of a blank route', async () => {
    renderGuestAppShell({ page: 'writing' });

    expect(await screen.findByRole('heading', { name: '写作批改，看见进步。' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '写作批改' })).toHaveClass('gtb__tab--active');
    expect(screen.getByRole('button', { name: '真题练习' })).not.toHaveClass('gtb__tab--active');
  });

  it.each([
    ['vocab-analyzer', /吃透一个词/],
    ['vocab-courses', /不止背单词/],
    ['vocab-progress', /词汇积累有路径/],
    ['vocab-quiz', /选择检测方式/],
    ['speaking-progress', /开口有记录/],
    ['megan', /联系 Megan/],
    ['skill-training', /备考/],
    ['language-foundation', /语言基础/],
    ['plan', /别急着报课/],
    ['refund', /退款与续费规则/],
  ])('renders public guest route %s', async (page, heading) => {
    renderGuestAppShell({ page });

    expect(await screen.findByRole('heading', { name: heading })).toBeInTheDocument();
  });

});
