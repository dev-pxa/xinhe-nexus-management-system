import { expect, test } from '@playwright/test';

test('共用账号输入框提交手机号与密码', async ({ page }) => {
  let loggedIn = false;
  const user = { id: 1, companyId: 1, companyName: '测试公司', username: 'phone_test', name: '测试员工', roles: ['COMPANY_USER'], permissions: [] };
  await page.route('**/api/auth/current', route => route.fulfill({ json: { code: loggedIn ? 0 : 401, data: loggedIn ? user : null } }));
  await page.route('**/api/auth/login', route => {
    expect(route.request().postDataJSON()).toMatchObject({ username: '13800138000', password: 'password123' });
    loggedIn = true;
    return route.fulfill({ json: { code: 0, data: user } });
  });
  await page.goto('/login');
  await expect(page.getByRole('tab')).toHaveCount(0);
  await page.getByPlaceholder('用户名或手机号').fill('13800138000');
  await page.getByPlaceholder('密码', { exact: true }).fill('password123');
  await page.getByRole('button', { name: '登 录' }).click();
  await expect(page).toHaveURL(/\/dashboard/);
});
