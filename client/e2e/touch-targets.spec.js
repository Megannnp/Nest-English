import { expect, test } from '@playwright/test';

// 回归门禁：移动端所有可交互控件的有效点击高度必须 ≥ 44px（WCAG 2.5.5）。
// 这些页面此前实测有 16.5–36px 的控件；修复方式包括直接 min-height、
// 以及正文内行内链接用 ::after 伪元素扩大命中区，所以判定时要把伪元素的
// 外扩量算进去 —— 与手动核验时用的算法保持一致。
const MOBILE = { width: 375, height: 812 };
const MIN_TOUCH = 44;

// 公开可访问、无需登录的页面。登录后页面（如作文编辑器里的图标按钮）由
// main-chain 用例覆盖不到的部分留待带鉴权的扩展；此处覆盖清单里点名的全部公开页。
const PAGES = [
  '/',
  '/grammar/courses',
  '/grammar/progress',
  '/reading/practice',
  '/reading/progress',
  '/vocab/courses',
  '/vocab/progress',
  '/listening/practice',
  '/listening/progress',
  '/phonetics',
  '/writing/grade',
];

const VOCAB_LAYOUT_CONTENT = {
  readingCategories: [],
  writingCategories: [],
  readingSynonyms: [],
  writingSynonyms: [],
  courseTree: [
    {
      id: 'layout-vocab-root',
      title: '词汇布局测试',
      children: [
        {
          id: 'layout-vocab-leaf',
          title: '词根与语境',
          content: '用一个最小课程节点保持页面处于正常内容态。',
        },
      ],
    },
  ],
};

async function installLayoutApiFallback(page) {
  await page.route(/^https?:\/\/[^/]+\/api\//, async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace(/^\/api/, '');
    let data = [];
    if (path === '/announcements/ticker') {
      data = { announcements: [], myMessages: [] };
    } else if (path === '/vocabulary/content') {
      data = VOCAB_LAYOUT_CONTENT;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ code: 200, msg: 'ok', data }),
    });
  });
}

/** SPA 用 history 切页，这里驱动它并等待渲染稳定。 */
async function gotoSpaPage(page, path) {
  await page.goto('/');
  await page.evaluate((p) => {
    window.history.pushState({}, '', p);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, path);
  // 等待骨架屏消失：以「出现至少一个可见按钮/链接」为就绪信号
  await page.waitForTimeout(900);
}

/**
 * 返回有效点击高度 < MIN_TOUCH 的控件。伪元素外扩（inset 负值）计入有效高度，
 * 与生产里用 ::after 扩大命中区的做法对应。
 */
async function findUndersizedControls(page, min = MIN_TOUCH) {
  return page.evaluate((minPx) => {
    const list = [...document.querySelectorAll('a,button,[role=button],input,select,textarea')];
    const bad = [];
    for (const el of list) {
      const r = el.getBoundingClientRect();
      if (!r.height || !r.width) continue; // 不可见控件跳过
      const after = getComputedStyle(el, '::after');
      const expands = after.content && after.content !== 'none' && after.position === 'absolute';
      const top = expands ? Math.abs(parseFloat(after.top) || 0) : 0;
      const effective = r.height + top * 2;
      if (effective < minPx) {
        bad.push({
          label: (el.innerText || el.getAttribute('aria-label') || el.getAttribute('title') || '').trim().slice(0, 20),
          height: Math.round(effective * 10) / 10,
          cls: (el.className || '').toString().slice(0, 40),
        });
      }
    }
    return bad;
  }, min);
}


test.describe('移动端触控目标 ≥ 44px', () => {
  test.use({ viewport: MOBILE });

  for (const path of PAGES) {
    test(`${path} 所有可交互控件达标`, async ({ page }) => {
      await installLayoutApiFallback(page);
      await gotoSpaPage(page, path);
      const undersized = await findUndersizedControls(page);
      expect(
        undersized,
        `以下控件低于 ${MIN_TOUCH}px：\n${JSON.stringify(undersized, null, 2)}`,
      ).toEqual([]);
    });
  }
});
