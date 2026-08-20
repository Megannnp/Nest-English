import { expect, test } from '@playwright/test';

// 主链路 E2E：注册 → 进入写作 → 填写作文 → 点提交。
//
// 整条链路在真实浏览器里跑真实前端，但后端边界用一个 catch-all route 打桩：
//   - 不落库（每次 CI 跑不会造真实用户）
//   - 不打火山引擎付费 AI 接口（断言停在「提交请求已发出」，不等 AI 批改返回）
//   - 不依赖后端可用性，CI 可无限制运行
//
// 覆盖的是「表单 → API 契约 → 登录态切换 → 写作提交」这条最高风险路径；
// 真实 AI 批改质量不在此覆盖范围（那需要连真实后端，另行手动/契约测试）。

const STUDENT = {
  id: 'e2e-student',
  role: 'student',
  realName: 'E2E 学生',
  name: 'E2E 学生',
  email: 'e2e-student@example.com',
  is_admin: 0,
};

/**
 * 安装一个打桩后端：单个 catch-all route 按 URL+方法分发。
 * 未显式命中的接口一律回空默认值，让鉴权后的页面骨架能正常渲染，
 * 避免因为漏 mock 某个加载接口而 flaky。
 * 返回一个 `calls` 收集器，供断言某接口是否被调用及其载荷。
 */
async function installMockBackend(page) {
  const calls = [];

  // 只拦 host 后紧跟 /api/ 的后端请求；用锚定正则而非 **/api/** glob，
  // 否则会误伤 vite 的模块脚本 /src/api/index.js，返回 JSON 破坏整个应用加载。
  await page.route(/^https?:\/\/[^/]+\/api\//, async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const path = url.pathname.replace(/^\/api/, '');
    const method = req.method();
    let body = null;
    try { body = req.postDataJSON(); } catch { /* 非 JSON 请求忽略 */ }
    calls.push({ method, path, body });

    const json = (data, status = 200, msg = 'ok') =>
      route.fulfill({ status, contentType: 'application/json', body: JSON.stringify({ code: status, msg, data }) });

    // ── 鉴权 ──
    if (method === 'POST' && path === '/auth/register') {
      return json({ token: 'e2e-token', user: STUDENT }, 201, '注册成功');
    }
    if (path === '/auth/me') return json(STUDENT);

    // ── 作文提交（断言目标）：只保存，不触发反馈，AI 永不被调用 ──
    if (method === 'POST' && path === '/writings') {
      return json({ id: 'e2e-writing-1', ...(body || {}) }, 201, '已保存');
    }

    // ── 兜底：GET 回空列表/对象，其余回通用成功 ──
    if (method === 'GET') {
      // 首练引导依赖这个：未练过 → 显示引导
      if (path === '/users/me/learning-summary') return json({ hasAnyPractice: false });
      return json([]);
    }
    return json({});
  });

  return calls;
}

async function fillRegister(page) {
  await page.getByRole('button', { name: '免费注册' }).first().click();
  // 注册表单是懒加载模态，先等它渲染出来再填，否则会在字段出现前就超时。
  await expect(page.getByLabel('姓名')).toBeVisible({ timeout: 10_000 });
  await page.getByLabel('姓名').fill(STUDENT.realName);
  await page.getByLabel('邮箱').first().fill(STUDENT.email);
  await page.getByLabel('密码', { exact: true }).fill('E2epass123');
  await page.getByLabel('确认密码').fill('E2epass123');
  await page.getByRole('button', { name: /创建账号/ }).click();
}

/** 新注册用户会先落到「完善资料 / 加入班级」引导页，点「跳过」进入主应用。 */
async function skipOnboarding(page) {
  await page.getByRole('button', { name: '跳过' }).click({ timeout: 10_000 });
}

test('注册后进入鉴权态，不再停留在登录/注册界面', async ({ page }) => {
  const calls = await installMockBackend(page);
  await page.goto('/');

  await fillRegister(page);

  // 断言注册接口以正确契约被调用
  const register = calls.find((c) => c.method === 'POST' && c.path === '/auth/register');
  expect(register, '应调用 POST /auth/register').toBeTruthy();
  expect(register.body).toMatchObject({
    realName: STUDENT.realName,
    email: STUDENT.email,
    password: 'E2epass123',
    confirmPassword: 'E2epass123',
    role: 'student',
  });

  // 登录态切换：注册表单消失（不再有「创建账号」按钮）
  await expect(page.getByRole('button', { name: /创建账号/ })).toHaveCount(0);
});

test('主链路：注册 → 写作页填写作文 → 提交请求发出（不触发 AI）', async ({ page }) => {
  const calls = await installMockBackend(page);
  await page.goto('/');
  await fillRegister(page);
  await skipOnboarding(page);

  // 进入写作批改页
  await page.evaluate(() => {
    window.history.pushState({}, '', '/writing/grade');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });

  const essay = page.getByLabel('作文正文');
  await expect(essay).toBeVisible({ timeout: 10_000 });
  const text = 'The scientists who discovered the new element were awarded the Nobel Prize. '
    + 'This achievement shows how curiosity and persistence drive human progress.';
  await essay.fill(text);

  // 点提交
  await page.getByRole('button', { name: /提交批改|Get Writing Feedback|Submit Assignment/ }).click();

  // 断言：POST /writings 已发出且带上了作文正文；此后 AI 反馈接口被 mock 拦截，真实 AI 未被调用
  await expect
    .poll(() => calls.some((c) => c.method === 'POST' && c.path === '/writings'), { timeout: 10_000 })
    .toBe(true);
  const create = calls.find((c) => c.method === 'POST' && c.path === '/writings');
  expect(create.body?.fullText).toContain('Nobel Prize');
});

test('访客提交作文触发登录时，登录框说明为何登录', async ({ page }) => {
  await installMockBackend(page);
  await page.goto('/');

  // 以访客身份进入写作页、填正文、点提交 —— 这会要求登录
  await page.evaluate(() => {
    window.history.pushState({}, '', '/writing/grade');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
  const essay = page.getByLabel('作文正文');
  await expect(essay).toBeVisible({ timeout: 10_000 });
  await essay.fill('A short guest essay that should trigger the login prompt.');
  await page.getByRole('button', { name: /提交批改/ }).click();

  // 登录模态出现，且顶部有解释「为什么登录」的上下文条
  await expect(page.getByRole('note')).toContainText('提交作文', { timeout: 10_000 });
});
