import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import useAppSession from './useAppSession.jsx';

const {
  authApiMock,
  clearTokenMock,
  hasSessionFlagMock,
  questionsApiMock,
  writingsApiMock,
} = vi.hoisted(() => ({
  authApiMock: {
    me: vi.fn(),
    logout: vi.fn(),
  },
  clearTokenMock: vi.fn(),
  hasSessionFlagMock: vi.fn(),
  questionsApiMock: {
    list: vi.fn(),
  },
  writingsApiMock: {
    list: vi.fn(),
  },
}));

vi.mock('../api/index.js', () => ({
  authAPI: authApiMock,
  clearToken: clearTokenMock,
  hasSessionFlag: hasSessionFlagMock,
  questionsAPI: questionsApiMock,
  writingsAPI: writingsApiMock,
  setUnauthorizedHandler: vi.fn(),
}));

describe('useAppSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    hasSessionFlagMock.mockReturnValue(false);
    questionsApiMock.list.mockResolvedValue([]);
    writingsApiMock.list.mockResolvedValue([]);
  });

  it('marks auth as checked without a saved session', async () => {
    const onNavigate = vi.fn();
    const { result } = renderHook(() => useAppSession({ initialPage: 'home', onNavigate }));

    await waitFor(() => {
      expect(result.current.state.authChecked).toBe(true);
    });

    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('navigates to default page after login and loads user data', async () => {
    const onNavigate = vi.fn();
    const { result } = renderHook(() => useAppSession({ initialPage: 'home', onNavigate }));

    await act(async () => {
      await result.current.actions.handleLogin(
        { id: 'teacher-1', role: 'teacher', name: 'Teacher Zhang' },
        false,
      );
    });

    expect(questionsApiMock.list).toHaveBeenCalledWith({ systemId: 'system-senior' });
    expect(writingsApiMock.list).toHaveBeenCalled();
    expect(onNavigate).toHaveBeenCalledWith('workbench', expect.objectContaining({
      replace: true,
      user: expect.objectContaining({ role: 'teacher' }),
    }));
    expect(result.current.state.user).toEqual(expect.objectContaining({ role: 'teacher' }));
  });

  it('loads question bank from the logged-in user prep exam preference', async () => {
    const onNavigate = vi.fn();
    const { result } = renderHook(() => useAppSession({ initialPage: 'home', onNavigate }));

    await act(async () => {
      await result.current.actions.handleLogin(
        { id: 'student-1', role: 'student', name: 'Amy', preferences: { prepExamId: 'ielts' } },
        false,
      );
    });

    expect(window.localStorage.getItem('nest_prep_exam_id')).toBe('ielts');
    expect(questionsApiMock.list).toHaveBeenCalledWith({ systemId: 'system-ielts' });
  });

  it('preserves route overrides when login targets a specific authenticated tab', async () => {
    const onNavigate = vi.fn();
    const { result } = renderHook(() => useAppSession({ initialPage: 'portal', onNavigate }));

    await act(async () => {
      await result.current.actions.handleLogin(
        { id: 'student-1', role: 'student', name: 'Amy' },
        false,
        { page: 'account', routeOverrides: { accountTab: 'subscription' } },
      );
    });

    expect(onNavigate).toHaveBeenCalledWith('account', expect.objectContaining({
      replace: true,
      user: expect.objectContaining({ role: 'student' }),
      routeOverrides: { accountTab: 'subscription' },
    }));
  });

  it('routes a brand-new student without a target to the first writing practice', async () => {
    const onNavigate = vi.fn();
    const { result } = renderHook(() => useAppSession({ initialPage: 'home', onNavigate }));

    // 新注册学生：needsProfile=true 且未显式传入 nextPage
    await act(async () => {
      await result.current.actions.handleLogin(
        { id: 'student-new', role: 'student', name: 'New Student' },
        true,
      );
    });

    // 应先完成资料引导，引导完成后再落到写作首次练习
    expect(result.current.state.needProfile).toBe(true);
    expect(onNavigate).toHaveBeenLastCalledWith('account', expect.objectContaining({
      replace: true,
      user: expect.objectContaining({ role: 'student' }),
    }));

    // 完成资料引导后，导航应落到写作首次练习而不是通用备考台
    await act(async () => {
      result.current.actions.handleProfileComplete({ id: 'student-new', role: 'student', name: 'New Student' });
    });

    expect(onNavigate).toHaveBeenLastCalledWith('writing', expect.objectContaining({
      replace: true,
      user: expect.objectContaining({ role: 'student' }),
    }));

    // 学生若显式指定了 nextPage（如从某个模块登录），则不覆盖目标
    const onNavigate2 = vi.fn();
    const { result: result2 } = renderHook(() => useAppSession({ initialPage: 'home', onNavigate: onNavigate2 }));
    await act(async () => {
      await result2.current.actions.handleLogin(
        { id: 'student-new-2', role: 'student', name: 'New Student 2' },
        true,
        { page: 'grammar-analyzer' },
      );
    });
    expect(onNavigate2).toHaveBeenLastCalledWith('account', expect.anything());
  });

  it('preserves subscription target through required profile onboarding', async () => {
    const onNavigate = vi.fn();
    const { result } = renderHook(() => useAppSession({ initialPage: 'portal', onNavigate }));

    await act(async () => {
      await result.current.actions.handleLogin(
        { id: 'student-1', role: 'student', name: 'Amy' },
        true,
        { page: 'account', routeOverrides: { accountTab: 'subscription' } },
      );
    });

    expect(result.current.state.needProfile).toBe(true);
    expect(onNavigate).toHaveBeenLastCalledWith('account', expect.objectContaining({
      replace: true,
      routeOverrides: {},
    }));

    await act(async () => {
      result.current.actions.handleProfileComplete({ id: 'student-1', role: 'student', name: 'Amy' });
    });

    expect(onNavigate).toHaveBeenLastCalledWith('account', expect.objectContaining({
      replace: true,
      routeOverrides: { accountTab: 'subscription' },
    }));
  });

  it('clears session state and routes to module home on logout confirmation', async () => {
    const onNavigate = vi.fn();
    authApiMock.logout.mockResolvedValueOnce({});

    const { result } = renderHook(() => useAppSession({ initialPage: 'home', onNavigate, getCurrentPage: () => 'writing' }));

    await act(async () => {
      await result.current.actions.handleLogin(
        { id: 'student-1', role: 'student', name: 'Amy' },
        true,
      );
    });

    // Kick off logout (non-blocking — it waits for the confirm dialog to be answered)
    act(() => { void result.current.actions.handleLogout(); });

    // Confirm dialog should now be open
    await waitFor(() => {
      expect(result.current.state.logoutConfirmState).not.toBeNull();
    });
    expect(result.current.state.logoutConfirmState?.message).toBe('确认退出登录？');

    // Simulate user clicking "Confirm"
    await act(async () => {
      result.current.state.respondLogoutConfirm(true);
    });

    await waitFor(() => {
      expect(authApiMock.logout).toHaveBeenCalled();
    });
    expect(clearTokenMock).toHaveBeenCalled();
    expect(onNavigate).toHaveBeenLastCalledWith('portal', { replace: true });
    expect(result.current.state.user).toBeNull();
    expect(result.current.state.needProfile).toBe(false);
  });
});
