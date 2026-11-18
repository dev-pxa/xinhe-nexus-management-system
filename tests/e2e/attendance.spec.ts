import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/login');
  await page.getByPlaceholder('用户名：admin').fill('admin');
  await page.getByPlaceholder('密码').fill('admin');
  await page.getByRole('button', { name: '登 录' }).click();
  await expect(page).toHaveURL(/\/dashboard/);
});

test('员工端定位打卡不展示服务器时间', async ({ page, context }) => {
  await context.grantPermissions(['geolocation'], { origin: 'http://127.0.0.1:18082' });
  await context.setGeolocation({ latitude: 30.2741, longitude: 120.1551, accuracy: 12 });
  await page.route('**/api/oa/attendance/my**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ code: 0, data: [], message: 'success' }) }));
  await page.route('**/api/oa/attendance/correction-requests/mine', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ code: 0, data: [], message: 'success' }) }));
  await page.route('**/api/oa/attendance/correction-requests/pending', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ code: 0, data: [], message: 'success' }) }));
  let requestBody: Record<string, unknown> = {};
  await page.route('**/api/oa/attendance/punch', async (route) => {
    requestBody = JSON.parse(route.request().postData() || '{}');
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ code: 0, data: { punchDate: '2026-11-09', punchCount: 1, status: 'SINGLE' }, message: 'success' }) });
  });
  await page.goto('/oa/attendance');
  await expect(page.getByRole('button', { name: '立即打卡' })).toBeVisible();
  await expect(page.getByText(/服务器时间/)).toHaveCount(0);
  await page.getByRole('button', { name: '立即打卡' }).click();
  await expect.poll(() => requestBody.latitude).toBe(30.2741);
  expect(requestBody.locationSource).toBe('BROWSER_GPS');
});

test('全部打卡使用服务端分页返回 total', async ({ page }) => {
  await page.route('**/api/oa/attendance/records**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ code: 0, data: { data: [{ userId: 2, displayName: '管理员', username: 'admin', punchDate: '2026-11-09', punchCount: 2, status: 'NORMAL' }], total: 41, page: 1, pageSize: 20 }, message: 'success' }) }));
  await page.goto('/oa/all-attendance');
  await expect(page.getByText('全部打卡记录').first()).toBeVisible();
  await expect(page.getByText('管理员（admin）')).toBeVisible();
  await expect(page.locator('.ant-pagination')).toBeVisible();
});
