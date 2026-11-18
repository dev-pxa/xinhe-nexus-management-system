import { expect, test } from '@playwright/test';

test('用户岗位为单选并以 positionId 保存', async ({ page }) => {
  await page.goto('/login');
  await page.getByPlaceholder('用户名：admin').fill('admin');
  await page.getByPlaceholder('密码').fill('admin');
  await page.getByRole('button', { name: '登 录' }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  let savedBody: Record<string, unknown> | undefined;
  await page.route('**/api/system/users/20/position**', async (route) => {
    if (route.request().method() === 'PUT') {
      savedBody = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ code: 0, message: 'success', data: null }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        code: 0,
        message: 'success',
        data: {
          positionId: 9,
          positionCode: 'SALES',
          positionName: '销售主管',
          orgUnitId: 1,
          orgName: '销售部',
        },
      }),
    });
  });
  await page.route(/\/api\/system\/users(?:\?.*)?$/, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        code: 0,
        message: 'success',
        data: [
          {
            id: 20,
            username: 'zhangsan',
            displayName: '张三',
            phone: '13800138000',
            companyId: 1,
            companyName: '测试公司',
            companyAdmin: false,
            positionName: '销售主管',
            status: 'ENABLED',
            version: 1,
          },
        ],
      }),
    }),
  );
  await page.route('**/api/system/positions**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        code: 0,
        message: 'success',
        data: [
          { id: 9, orgName: '销售部', positionName: '销售主管' },
          { id: 10, orgName: '销售部', positionName: '销售专员' },
        ],
      }),
    }),
  );

  await page.goto('/system/users');
  await expect(page.getByTitle('用户管理', { exact: true })).toBeVisible();
  await page
    .getByRole('row', { name: /张三/ })
    .getByText('岗位', { exact: true })
    .click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText('分配“张三”岗位')).toBeVisible();
  await expect(dialog.locator('.ant-select-multiple')).toHaveCount(0);
  await dialog.locator('.ant-select-selector').click();
  await page
    .locator('.ant-select-item-option-content')
    .getByText('销售部 / 销售专员', { exact: true })
    .click();
  await dialog.getByRole('button', { name: '确 定' }).click();

  await expect.poll(() => savedBody).toEqual({ positionId: 10 });
  expect(savedBody).not.toHaveProperty('positionIds');
});
