import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useGuestShellController } from './useGuestShellController.jsx';

describe('useGuestShellController — login target resolution', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/');
  });

  function setup({ page = 'portal', authMode = 'login', guestAuthState, onNavigate, onLogin } = {}) {
    const setAuthMode = vi.fn();
    const setGuestAuthState = vi.fn();
    const setGuestWritingDraft = vi.fn();
    const { result } = renderHook(() => useGuestShellController({
      page,
      authMode,
      setAuthMode,
      setGuestWritingDraft,
      guestAuthState: guestAuthState || {
        open: false,
        mode: 'login',
        target: 'portal',
        returnPage: 'portal',
      },
      setGuestAuthState,
      onNavigate: onNavigate || vi.fn(),
      onLogin: onLogin || vi.fn(),
    }));
    return {
      result,
      setAuthMode,
      setGuestAuthState,
      setGuestWritingDraft,
    };
  }

  it('keeps an existing-user login target to the module page', async () => {
    const onLogin = vi.fn();
    const { result } = setup({
      guestAuthState: {
        open: true,
        mode: 'login',
        target: 'reading-analyzer',
        returnPage: 'portal',
      },
      onLogin,
    });

    await act(async () => {
      await result.current.handleGuestLogin(
        { id: 'teacher-1', role: 'teacher', name: 'Teacher' },
        false, // needsProfile=false → 老用户
      );
    });

    expect(onLogin).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'teacher-1' }),
      false,
      'reading-analyzer',
    );
  });

  it('routes a brand-new student from a module page back to that module', async () => {
    const onLogin = vi.fn();
    const { result } = setup({
      guestAuthState: {
        open: true,
        mode: 'register',
        target: 'grammar-analyzer',
        returnPage: 'portal',
      },
      onLogin,
    });

    await act(async () => {
      await result.current.handleGuestLogin(
        { id: 'student-new', role: 'student', name: 'New' },
        true, // needsProfile=true → 新注册
      );
    });

    expect(onLogin).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'student-new' }),
      true,
      'grammar-analyzer',
    );
  });

  it('routes a brand-new student from the home page to the first-writing practice (target null)', async () => {
    const onLogin = vi.fn();
    const { result } = setup({
      guestAuthState: {
        open: true,
        mode: 'register',
        target: 'portal',
        returnPage: 'portal',
      },
      onLogin,
    });

    await act(async () => {
      await result.current.handleGuestLogin(
        { id: 'student-new', role: 'student', name: 'New' },
        true,
      );
    });

    // portal 属于站点级页面，不传 nextPage → useAppSession 引导到首次写作练习
    expect(onLogin).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'student-new' }),
      true,
      null,
    );
  });

  it('routes a new student from phonetics-progress back to that module', async () => {
    const onLogin = vi.fn();
    const { result } = setup({
      guestAuthState: {
        open: true,
        mode: 'register',
        target: 'phonetics-progress',
        returnPage: 'portal',
      },
      onLogin,
    });

    await act(async () => {
      await result.current.handleGuestLogin(
        { id: 'student-new', role: 'student', name: 'New' },
        true,
      );
    });

    expect(onLogin).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'student-new' }),
      true,
      'phonetics-progress',
    );
  });
});