import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useBatchGradingDerivedState } from './useBatchGradingDerivedState.js';

const usableRecognizedText = [
  'The starting gun was fired, and the race began.',
  'I tried to keep calm and follow my own pace even though my ankle hurt.',
  'The crowd was cheering loudly, which gave me courage to continue.',
  'Although I was still behind, I could feel the gap getting smaller.',
  'In the final meters, I used all my strength and crossed the line.',
  'At that moment, I realized determination can help us overcome difficulties.',
].join(' ').repeat(2);

describe('useBatchGradingDerivedState', () => {
  it('enables confirm-all when a recognized name can be auto-matched', () => {
    const { result } = renderHook(() => useBatchGradingDerivedState({
      items: [
        {
          status: 'confirm',
          studentTargetKey: '',
          studentName: '张三',
          detectedName: '张三',
          recognizedText: usableRecognizedText,
          file: { name: '张三-作文.png' },
        },
      ],
      selectedAssignmentId: 'assignment-1',
      studentOptions: [
        { key: 'user:1', name: '张三', label: '张三 · 已注册' },
      ],
    }));

    expect(result.current.canConfirmAll).toBe(true);
  });

  it('keeps confirm-all disabled until every pending item can resolve to a student target', () => {
    const { result } = renderHook(() => useBatchGradingDerivedState({
      items: [
        {
          status: 'confirm',
          studentTargetKey: '',
          studentName: '张三',
          detectedName: '张三',
          recognizedText: usableRecognizedText,
          file: { name: '张三-作文.png' },
        },
        {
          status: 'confirm',
          studentTargetKey: '',
          studentName: '未知同学',
          detectedName: '未知同学',
          recognizedText: usableRecognizedText,
          file: { name: '微信图片_2.png' },
        },
      ],
      selectedAssignmentId: 'assignment-1',
      studentOptions: [
        { key: 'user:1', name: '张三', label: '张三 · 已注册' },
      ],
    }));

    expect(result.current.canConfirmAll).toBe(false);
  });

  it('keeps confirm-all disabled when recognized text is missing or looks like a snippet', () => {
    const { result } = renderHook(() => useBatchGradingDerivedState({
      items: [
        {
          status: 'confirm',
          studentTargetKey: '',
          studentName: '张三',
          detectedName: '张三',
          recognizedText: 'A'.repeat(500),
          file: { name: '张三-作文.png' },
        },
      ],
      selectedAssignmentId: 'assignment-1',
      studentOptions: [
        { key: 'user:1', name: '张三', label: '张三 · 已注册' },
      ],
    }));

    expect(result.current.canConfirmAll).toBe(false);
  });
});
