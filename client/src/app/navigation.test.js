import { describe, expect, it } from 'vitest';

import { getDefaultPage, getMobileNavLabels, getNavItems, isLoginRequiredPage, isNavActive, normalizePage } from './navigation.js';

describe('navigation helpers', () => {
  it('keeps protected pages stable for guests so gate screens can render', () => {
    expect(normalizePage('tasks')).toBe('tasks');
    expect(normalizePage('workbench')).toBe('workbench');
    expect(normalizePage('classes')).toBe('classes');
    expect(normalizePage('batch-grading')).toBe('batch-grading');
    expect(normalizePage('admin')).toBe('admin');
  });

  it('keeps public page naming separate from protected guest placeholders', () => {
    expect(normalizePage('speaking')).toBe('speaking');
    expect(normalizePage('explore')).toBe('explore');
    expect(normalizePage('megan')).toBe('megan');
    expect(normalizePage('refund')).toBe('refund');
    expect(isLoginRequiredPage('refund')).toBe(false);
    expect(isLoginRequiredPage('tasks')).toBe(true);
  });

  it('still falls unknown guest pages back to default public page', () => {
    expect(normalizePage('not-a-page')).toBe(getDefaultPage(null));
    expect(normalizePage('pricing')).toBe(getDefaultPage(null));
  });

  it('maps invalid role-specific pages back to the role default', () => {
    expect(normalizePage('workbench', 'student')).toBe('skill-training');
    expect(normalizePage('tasks', 'teacher')).toBe('workbench');
    expect(normalizePage('tasks', 'parent')).toBe('parent-home');
  });

  it('allows admin page after login only for admin users', () => {
    expect(normalizePage('admin', 'student')).toBe('skill-training');
    expect(normalizePage('admin', 'teacher')).toBe('workbench');
    expect(normalizePage('admin', 'student', { isAdmin: true })).toBe('admin');
    expect(normalizePage('', 'student', { isAdmin: true })).toBe('admin');
  });

  it('keeps public grammar pages available after login', () => {
    expect(normalizePage('grammar', 'student')).toBe('grammar-analyzer');
    expect(normalizePage('grammar-analyzer', 'student')).toBe('grammar-analyzer');
    expect(normalizePage('grammar-courses', 'teacher')).toBe('grammar-courses');
    expect(normalizePage('grammar-practice', 'student')).toBe('grammar-practice');
    expect(normalizePage('grammar-progress', 'teacher')).toBe('grammar-progress');
  });

  it('falls removed public writing guide pages back to the role default', () => {
    expect(normalizePage('guide-feedback', 'student')).toBe('skill-training');
    expect(normalizePage('guide-practice', 'teacher')).toBe('workbench');
    expect(normalizePage('guide-tracking', 'student')).toBe('skill-training');
  });

  it('maps legacy writing aliases to implemented pages', () => {
    expect(normalizePage('writing-manual')).toBe('writing');
    expect(normalizePage('writing-manual', 'student')).toBe('writing');
    expect(normalizePage('writing-refine')).toBe('writing-refine-sentence');
  });

  it('maps removed vocab sub-pages to vocabulary resources', () => {
    expect(normalizePage('vocab-synonym')).toBe('vocab-resources');
    expect(normalizePage('vocab-import')).toBe('vocab-resources');
  });

  it('keeps the vocabulary growth page accessible across roles', () => {
    expect(normalizePage('vocab-progress')).toBe('vocab-progress');
    expect(normalizePage('vocab-progress', 'student')).toBe('vocab-progress');
    expect(normalizePage('vocab-progress', 'teacher')).toBe('vocab-progress');
  });

  it('keeps the speaking demo route accessible', () => {
    expect(normalizePage('speaking')).toBe('speaking');
  });

  it('keeps Nest Camp public and protected course pages routed correctly', () => {
    expect(normalizePage('camp')).toBe('camp');
    expect(normalizePage('camp-course-detail')).toBe('camp-course-detail');
    expect(normalizePage('camp-redeem')).toBe('camp-redeem');
    expect(normalizePage('camp-my-course-detail')).toBe('camp-my-course-detail');
    expect(normalizePage('camp', 'student')).toBe('camp');
    expect(normalizePage('camp-my-course-detail', 'teacher')).toBe('camp-my-course-detail');
    expect(normalizePage('camp-management', 'teacher')).toBe('workbench');
    expect(normalizePage('camp-management', 'student', { isAdmin: true })).toBe('camp-management');
    expect(normalizePage('camp-management', 'student')).toBe('skill-training');
    expect(normalizePage('camp-management', 'parent')).toBe('parent-home');
  });

  it('marks protected app pages as login-required', () => {
    expect(isLoginRequiredPage('tasks')).toBe(true);
    expect(isLoginRequiredPage('workbench')).toBe(true);
    expect(isLoginRequiredPage('classes')).toBe(true);
    expect(isLoginRequiredPage('admin')).toBe(true);
    expect(isLoginRequiredPage('camp-redeem')).toBe(true);
    expect(isLoginRequiredPage('camp-my-course-detail')).toBe(true);
    expect(isLoginRequiredPage('camp-management')).toBe(true);
    expect(isLoginRequiredPage('camp')).toBe(false);
    expect(isLoginRequiredPage('writing')).toBe(false);
    expect(isLoginRequiredPage('portal')).toBe(false);
    expect(isLoginRequiredPage('explore')).toBe(false);
  });

  it('groups student pages under prep, base, and growth nav items', () => {
    expect(isNavActive('skill-training', 'records', 'student')).toBe(true);
    expect(isNavActive('skill-training', 'grammar-progress', 'student')).toBe(true);
    expect(isNavActive('skill-training', 'reading-progress', 'student')).toBe(true);
    expect(isNavActive('skill-training', 'listening-progress', 'student')).toBe(true);
    expect(isNavActive('skill-training', 'vocab-progress', 'student')).toBe(true);
    expect(isNavActive('skill-training', 'phonetics-progress', 'student')).toBe(true);
    expect(isNavActive('skill-training', 'speaking-progress', 'student')).toBe(true);
    expect(isNavActive('growth', 'records', 'student')).toBe(false);
    expect(isNavActive('growth', 'reading-progress', 'student')).toBe(false);
    expect(isNavActive('growth', 'vocab-progress', 'student')).toBe(false);
    expect(isNavActive('growth', 'grammar-progress', 'student')).toBe(false);
    expect(isNavActive('growth', 'phonetics-progress', 'student')).toBe(false);
    expect(isNavActive('language-foundation', 'grammar-progress', 'student')).toBe(false);
    expect(isNavActive('language-foundation', 'phonetics-progress', 'student')).toBe(false);
    expect(isNavActive('skill-training', 'vocab-flashcard', 'student')).toBe(true);
    expect(isNavActive('language-foundation', 'phonetics-sentence', 'student')).toBe(true);
    expect(isNavActive('language-foundation', 'grammar-analyzer', 'student')).toBe(true);
    expect(isNavActive('skill-training', 'writing', 'student')).toBe(true);
    expect(isNavActive('skill-training', 'writing-bank', 'student')).toBe(true);
    expect(isNavActive('skill-training', 'tasks', 'student')).toBe(true);
    expect(isNavActive('tasks', 'tasks', 'student')).toBe(true);
    expect(isNavActive('growth', 'vocab-flashcard', 'student')).toBe(false);
  });

  it('uses the prep hub as the student primary prep nav item', () => {
    expect(getDefaultPage('student')).toBe('skill-training');
    expect(getNavItems('student')[0]).toMatchObject({ id: 'skill-training', label: '备考' });
    expect(getMobileNavLabels('student')).toMatchObject({ 'skill-training': '备考' });
  });

  it('groups teacher prep and workbench pages under their shell nav items', () => {
    expect(isNavActive('workbench', 'grammar-workbench', 'teacher')).toBe(true);
    expect(isNavActive('workbench', 'teacher-todo', 'teacher')).toBe(true);
    expect(isNavActive('teacher-prep', 'reading-paper', 'teacher')).toBe(true);
    expect(isNavActive('teacher-prep', 'grammar-progress', 'teacher')).toBe(true);
    expect(isNavActive('teacher-prep', 'reading-progress', 'teacher')).toBe(true);
    expect(isNavActive('teacher-prep', 'listening-progress', 'teacher')).toBe(true);
    expect(isNavActive('teacher-prep', 'phonetics-progress', 'teacher')).toBe(true);
    expect(isNavActive('teacher-prep', 'batch-grading', 'teacher')).toBe(false);
    expect(isNavActive('camp-management', 'camp-management', 'admin')).toBe(true);
    expect(isNavActive('parent-home', 'parent-home', 'parent')).toBe(true);
  });
});
