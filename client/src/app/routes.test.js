import { describe, expect, it } from 'vitest';

import { buildRouteUrl, readRouteState } from './routes.js';

describe('app route helpers', () => {
  it('reads teacher writing detail route params', () => {
    const route = readRouteState({
      pathname: '/app/writings/abc-123',
      search: '?classId=class-1&tab=feedback&scene=reviews',
    });

    expect(route.page).toBe('teacher-writing-detail');
    expect(route.selectedTeacherWritingContext).toEqual({
      writingId: 'abc-123',
      classId: 'class-1',
      tab: 'feedback',
    });
    expect(route.selectedTeacherTodoScene).toBe('reviews');
  });

  it('builds assignment, growth, and writing record urls', () => {
    expect(buildRouteUrl({
      page: 'assignment-create',
      selectedTeacherAssignmentId: 'assignment-9',
    })).toBe('/app/assignments?assignmentId=assignment-9');

    expect(readRouteState({ pathname: '/growth', search: '' }).page).toBe('growth');
    expect(readRouteState({ pathname: '/app/records', search: '' }).page).toBe('growth');
    expect(buildRouteUrl({ page: 'growth' })).toBe('/growth');

    expect(readRouteState({ pathname: '/writing/records', search: '?writingId=writing-7' })).toMatchObject({
      page: 'records',
      selectedStudentViewingWritingId: 'writing-7',
    });
    expect(buildRouteUrl({
      page: 'records',
      selectedStudentViewingWritingId: 'writing-7',
    })).toBe('/writing/records?writingId=writing-7');
  });

  it('keeps account tab in route state', () => {
    expect(readRouteState({ pathname: '/app/account', search: '?tab=subscription' }).accountTab).toBe('subscription');
    expect(readRouteState({ pathname: '/app/account', search: '?tab=security' }).accountTab).toBe('security');
    expect(buildRouteUrl({
      page: 'account',
      accountTab: 'subscription',
    })).toBe('/app/account?tab=subscription');
    expect(buildRouteUrl({
      page: 'account',
      accountTab: 'security',
    })).toBe('/app/account?tab=security');
    expect(buildRouteUrl({
      page: 'account',
      accountTab: 'profile',
    })).toBe('/app/account');
  });

  it('maps admin route to the admin page', () => {
    expect(readRouteState({ pathname: '/app/admin', search: '' }).page).toBe('admin');
    expect(buildRouteUrl({ page: 'admin' })).toBe('/app/admin');
    expect(readRouteState({ pathname: '/app/parent', search: '' }).page).toBe('parent-home');
    expect(buildRouteUrl({ page: 'parent-home' })).toBe('/app/parent');
  });

  it('encodes teacher writing detail ids safely', () => {
    expect(buildRouteUrl({
      page: 'teacher-writing-detail',
      selectedTeacherWritingContext: {
        writingId: 'essay 1/2',
        classId: 'class 1',
        tab: 'quick',
      },
    })).toBe('/app/writings/essay%201%2F2?classId=class+1&tab=quick');
  });

  it('falls unknown paths back to portal', () => {
    const route = readRouteState({ pathname: '/not-found', search: '' });

    expect(route.page).toBe('portal');
    expect(buildRouteUrl(route)).toBe('/');
    expect(readRouteState({ pathname: '/pricing', search: '' }).page).toBe('portal');
    expect(buildRouteUrl({ page: 'pricing' })).toBe('/');
  });

  it('maps product category routes to stable page ids', () => {
    expect(readRouteState({ pathname: '/explore', search: '' }).page).toBe('explore');
    expect(buildRouteUrl({ page: 'explore' })).toBe('/explore');
    expect(readRouteState({ pathname: '/resume', search: '' }).page).toBe('resume');
    expect(buildRouteUrl({ page: 'resume' })).toBe('/resume');
    expect(readRouteState({ pathname: '/megan', search: '' }).page).toBe('megan');
    expect(buildRouteUrl({ page: 'megan' })).toBe('/megan');
    expect(readRouteState({ pathname: '/prep', search: '' }).page).toBe('skill-training');
    expect(readRouteState({ pathname: '/skills', search: '' }).page).toBe('skill-training');
    expect(readRouteState({ pathname: '/foundation', search: '' }).page).toBe('language-foundation');
    expect(buildRouteUrl({ page: 'skill-training' })).toBe('/prep');
    expect(buildRouteUrl({ page: 'language-foundation' })).toBe('/foundation');
  });

  it('maps legal policy routes to stable page ids', () => {
    expect(readRouteState({ pathname: '/privacy', search: '' }).page).toBe('privacy');
    expect(readRouteState({ pathname: '/agreement', search: '' }).page).toBe('agreement');
    expect(readRouteState({ pathname: '/refund', search: '' }).page).toBe('refund');

    expect(buildRouteUrl({ page: 'privacy' })).toBe('/privacy');
    expect(buildRouteUrl({ page: 'agreement' })).toBe('/agreement');
    expect(buildRouteUrl({ page: 'refund' })).toBe('/refund');
  });

  it('maps public grammar routes to stable page ids', () => {
    expect(readRouteState({ pathname: '/grammar', search: '' }).page).toBe('grammar-analyzer');
    expect(readRouteState({ pathname: '/grammar/analyzer', search: '' }).page).toBe('grammar-analyzer');
    expect(readRouteState({ pathname: '/grammar/courses', search: '' }).page).toBe('grammar-courses');
    expect(readRouteState({ pathname: '/grammar/practice', search: '' }).page).toBe('grammar-practice');
    expect(readRouteState({ pathname: '/grammar/progress', search: '' }).page).toBe('grammar-progress');

    expect(buildRouteUrl({ page: 'grammar' })).toBe('/grammar/analyzer');
    expect(buildRouteUrl({ page: 'grammar-analyzer' })).toBe('/grammar/analyzer');
    expect(buildRouteUrl({ page: 'grammar-courses' })).toBe('/grammar/courses');
    expect(buildRouteUrl({ page: 'grammar-practice' })).toBe('/grammar/practice');
    expect(buildRouteUrl({ page: 'grammar-progress' })).toBe('/grammar/progress');
  });

  it('maps writing refine parent and child routes to concrete pages', () => {
    expect(readRouteState({ pathname: '/writing/refine', search: '' }).page).toBe('writing-refine-sentence');
    expect(readRouteState({ pathname: '/writing/refine/sentence', search: '' }).page).toBe('writing-refine-sentence');
    expect(readRouteState({ pathname: '/writing/refine/structure', search: '' }).page).toBe('writing-refine-structure');

    expect(buildRouteUrl({ page: 'writing-refine' })).toBe('/writing/refine/sentence');
    expect(buildRouteUrl({ page: 'writing-refine-sentence' })).toBe('/writing/refine/sentence');
    expect(buildRouteUrl({ page: 'writing-refine-structure' })).toBe('/writing/refine/structure');
  });

  it('maps legacy vocab flashcard route to vocab quiz', () => {
    expect(readRouteState({ pathname: '/vocab/flashcard', search: '' }).page).toBe('vocab-quiz');
    expect(buildRouteUrl({ page: 'vocab-flashcard' })).toBe('/vocab/quiz');
    expect(readRouteState({ pathname: '/vocab/import', search: '' }).page).toBe('vocab-resources');
    expect(buildRouteUrl({ page: 'vocab-import' })).toBe('/vocab/resources');
    expect(readRouteState({ pathname: '/vocab/progress', search: '' }).page).toBe('vocab-progress');
    expect(buildRouteUrl({ page: 'vocab-progress' })).toBe('/vocab/progress');
  });

  it('maps phonetics public routes to stable page ids', () => {
    [
      ['/phonetics/camp', 'phonetics-camp'],
      ['/phonetics', 'phonetics-overview'],
      ['/phonetics/sound', 'phonetics-sound'],
      ['/phonetics/combos', 'phonetics-overview'],
      ['/phonetics/syllable', 'phonetics-syllable'],
      ['/phonetics/words', 'phonetics-overview'],
      ['/phonetics/sentence', 'phonetics-sentence'],
      ['/phonetics/discourse', 'phonetics-discourse'],
      ['/phonetics/progress', 'phonetics-progress'],
    ].forEach(([pathname, page]) => {
      expect(readRouteState({ pathname, search: '' }).page).toBe(page);
    });
    expect(buildRouteUrl({ page: 'phonetics' })).toBe('/phonetics');
    expect(buildRouteUrl({ page: 'phonetics-camp' })).toBe('/phonetics/camp');
    expect(buildRouteUrl({ page: 'phonetics-overview' })).toBe('/phonetics');
    expect(buildRouteUrl({ page: 'phonetics-sound' })).toBe('/phonetics/sound');
    expect(buildRouteUrl({ page: 'phonetics-syllable' })).toBe('/phonetics/syllable');
    expect(buildRouteUrl({ page: 'phonetics-sentence' })).toBe('/phonetics/sentence');
    expect(buildRouteUrl({ page: 'phonetics-discourse' })).toBe('/phonetics/discourse');
    expect(buildRouteUrl({ page: 'phonetics-progress' })).toBe('/phonetics/progress');
  });

  it('maps listening growth and teacher workbench routes', () => {
    [
      ['/listening/progress', 'listening-progress'],
      ['/app/listening-workbench', 'listening-workbench'],
      ['/app/vocab-workbench', 'vocab-workbench'],
      ['/app/phonetics-workbench', 'phonetics-workbench'],
      ['/app/camp-management', 'camp-management'],
    ].forEach(([pathname, page]) => {
      expect(readRouteState({ pathname, search: '' }).page).toBe(page);
      expect(buildRouteUrl({ page })).toBe(pathname);
    });
  });

  it('maps Nest Camp routes with course ids', () => {
    expect(readRouteState({ pathname: '/camp', search: '' }).page).toBe('camp');
    expect(buildRouteUrl({ page: 'camp' })).toBe('/camp');
    expect(readRouteState({ pathname: '/camp/redeem', search: '' }).page).toBe('camp-redeem');
    expect(buildRouteUrl({ page: 'camp-redeem' })).toBe('/camp/redeem');

    expect(readRouteState({ pathname: '/camp/courses/camp-writing-foundation', search: '' })).toMatchObject({
      page: 'camp-course-detail',
      selectedCampCourseId: 'camp-writing-foundation',
    });
    expect(buildRouteUrl({
      page: 'camp-course-detail',
      selectedCampCourseId: 'course 1/2',
    })).toBe('/camp/courses/course%201%2F2');

    expect(readRouteState({ pathname: '/camp/my-courses/camp-writing-foundation', search: '' })).toMatchObject({
      page: 'camp-my-course-detail',
      selectedCampMyCourseId: 'camp-writing-foundation',
    });
    expect(buildRouteUrl({
      page: 'camp-my-course-detail',
      selectedCampMyCourseId: 'course 1/2',
    })).toBe('/camp/my-courses/course%201%2F2');
  });
});
