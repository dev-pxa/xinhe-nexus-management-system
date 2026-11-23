import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/login');
  await page.getByPlaceholder('用户名：admin').fill('admin');
  await page.getByPlaceholder('密码').fill('admin');
  await page.getByRole('button', { name: '登 录' }).click();
  await expect(page).toHaveURL(/\/dashboard/);
});

test('员工端定位打卡不展示服务器时间', async ({ page, context, baseURL }) => {
  const punchDate = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Shanghai' }).format(new Date());
  let punched = false;
  await context.grantPermissions(['geolocation'], { origin: new URL(baseURL!).origin });
  await context.setGeolocation({ latitude: 30.2741, longitude: 120.1551, accuracy: 12 });
  await page.route('**/api/oa/attendance/my**', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      code: 0,
      data: punched ? [{ punchDate, punchCount: 1, status: 'SINGLE' }] : [],
      message: 'success',
    }),
  }));
  await page.route('**/api/oa/attendance/correction-requests/mine', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ code: 0, data: [], message: 'success' }) }));
  await page.route('**/api/oa/attendance/correction-requests/pending', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ code: 0, data: [], message: 'success' }) }));
  let requestBody: Record<string, unknown> = {};
  await page.route('**/api/oa/attendance/punch', async (route) => {
    requestBody = JSON.parse(route.request().postData() || '{}');
    punched = true;
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ code: 0, data: { punchDate, punchCount: 1, status: 'SINGLE' }, message: 'success' }) });
  });
  await page.goto('/oa/attendance');
  await expect(page.getByRole('button', { name: '立即打卡' })).toBeVisible();
  await expect(page.getByText(/服务器时间/)).toHaveCount(0);
  await page.getByRole('button', { name: '立即打卡' }).click();
  await expect.poll(() => requestBody.latitude).toBe(30.2741);
  expect(requestBody.locationSource).toBe('BROWSER_GPS');
  await expect(page.getByText('单次打卡').first()).toBeVisible();
  await page.reload();
  await expect(page.getByText('单次打卡').first()).toBeVisible();
});

test('全部打卡使用服务端分页返回 total', async ({ page }) => {
  await page.route('**/api/oa/attendance/records**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ code: 0, data: { data: [{ userId: 2, displayName: '管理员', username: 'admin', punchDate: '2026-11-09', punchCount: 2, status: 'NORMAL' }], total: 41, page: 1, pageSize: 20 }, message: 'success' }) }));
  await page.goto('/oa/all-attendance');
  await expect(page.getByText('全部考勤').first()).toBeVisible();
  await expect(page.getByText('管理员（admin）')).toBeVisible();
  await expect(page.locator('.ant-pagination').first()).toBeVisible();
});

test('零打卡日展示缺勤、公司休假和个人休假状态', async ({ page }) => {
  await page.route('**/api/oa/attendance/my**', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      code: 0,
      message: 'success',
      data: [
        { punchDate: '2026-11-18', punchCount: 0, status: 'ABSENT' },
        { punchDate: '2026-11-19', punchCount: 0, status: 'COMPANY_HOLIDAY' },
        { punchDate: '2026-11-20', punchCount: 0, status: 'PERSONAL_HOLIDAY' },
      ],
    }),
  }));
  await page.goto('/oa/attendance');
  await expect(page.getByText('打卡后立即更新今日记录；每日凌晨 1 点自动补齐前一天未打卡或休假记录')).toBeVisible();
  await expect(page.getByText('缺勤').first()).toBeVisible();
  await expect(page.getByText('公司休假').first()).toBeVisible();
  await expect(page.locator('.ant-tag-green', { hasText: '个人休假' }).first()).toBeVisible();
});

test('休假日无打卡明细时展示休假原因', async ({ page }) => {
  await page.route('**/api/oa/attendance/my/punches?date=2026-11-19', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ code: 0, data: [], message: 'success' }),
    }),
  );
  await page.route('**/api/oa/attendance/my?from=2026-11-19&to=2026-11-19', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        code: 0,
        data: [{ punchDate: '2026-11-19', punchCount: 0, status: 'COMPANY_HOLIDAY' }],
        message: 'success',
      }),
    }),
  );

  await page.goto('/oa/attendance/2026-11-19');

  await expect(page.getByText('当天为公司休假，无需打卡').first()).toBeVisible();
});
