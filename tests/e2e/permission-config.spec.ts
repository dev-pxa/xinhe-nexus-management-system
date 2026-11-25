import { expect, test } from '@playwright/test';

const permissions = [
  {
    id: 1,
    permissionCode: 'system:company:view',
    permissionName: '查看公司',
    permissionKind: 'ACTION',
    moduleCode: 'SYSTEM',
    status: 'ENABLED',
  },
  {
    id: 2,
    permissionCode: 'oa:attendance:all:view',
    permissionName: '查看全部打卡记录',
    permissionKind: 'ACTION',
    moduleCode: 'OA',
    status: 'ENABLED',
  },
  {
    id: 3,
    permissionCode: 'oa:expense:view',
    permissionName: '查看我的报销',
    permissionKind: 'ACTION',
    moduleCode: 'OA',
    status: 'ENABLED',
  },
  {
    id: 4,
    permissionCode: 'oa:expense:approve',
    permissionName: '审核报销',
    permissionKind: 'ACTION',
    moduleCode: 'OA',
    status: 'ENABLED',
  },
  {
    id: 9,
    permissionCode: 'hr:profile:approve',
    permissionName: '人员档案审批',
    permissionKind: 'ACTION',
    moduleCode: 'OA',
    status: 'ENABLED',
  },
  {
    id: 5,
    permissionCode: 'crm:customer:view',
    permissionName: '查看客户',
    permissionKind: 'ACTION',
    moduleCode: 'CRM',
    status: 'ENABLED',
  },
  {
    id: 6,
    permissionCode: 'crm:customer:create',
    permissionName: '创建客户',
    permissionKind: 'ACTION',
    moduleCode: 'CRM',
    status: 'ENABLED',
  },
  {
    id: 7,
    permissionCode: 'crm:plan:view',
    permissionName: '查看每日计划',
    permissionKind: 'ACTION',
    moduleCode: 'CRM',
    status: 'ENABLED',
  },
  {
    id: 8,
    permissionCode: 'erp:product:view',
    permissionName: '查看商品资料',
    permissionKind: 'ACTION',
    moduleCode: 'ERP',
    status: 'ENABLED',
  },
];

test('岗位权限配置页只展示可配置业务权限并支持筛选与移除', async ({ page }) => {
  await page.goto('/login');
  await page.getByPlaceholder('用户名或手机号').fill('admin');
  await page.getByPlaceholder('密码').fill('admin');
  await page.getByRole('button', { name: '登 录' }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  await page.route('**/api/system/permissions/tree**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ code: 0, message: 'success', data: permissions }),
    }),
  );
  await page.route('**/api/system/positions/9/permissions**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ code: 0, message: 'success', data: [5] }),
    }),
  );
  let savedDirectPermissionIds: number[] = [];
  await page.route('**/api/system/users/20/permissions', async (route) => {
    if (route.request().method() === 'PUT') {
      savedDirectPermissionIds = route
        .request()
        .postDataJSON().directPermissionIds;
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
          positionPermissionIds: [5],
          directPermissionIds: [4],
          effectivePermissionIds: [4, 5],
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
            username: 'sales-user',
            displayName: '销售员',
            companyId: 1,
            companyName: '测试公司',
            companyAdmin: false,
            positionName: '销售主管',
            status: 'ENABLED',
            version: 1,
          },
          {
            id: 21,
            username: 'company-admin',
            displayName: '公司管理员',
            companyId: 1,
            companyName: '测试公司',
            companyAdmin: true,
            status: 'ENABLED',
            version: 1,
          },
        ],
      }),
    }),
  );
  await page.route('**/api/system/positions', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        code: 0,
        message: 'success',
        data: [
          {
            id: 9,
            companyId: 1,
            orgUnitId: 1,
            orgName: '销售部',
            positionCode: 'SALES',
            positionName: '销售主管',
            status: 'ENABLED',
            version: 1,
            userCount: 2,
            permissionCount: 2,
          },
        ],
      }),
    }),
  );
  await page.goto('/system/permissions?positionId=9');
  await expect(page.getByTitle('权限配置', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: '销售主管' })).toBeVisible();
  await expect(page.getByText('客户管理', { exact: true })).toBeVisible();
  await expect(page.getByText('报销最终审批', { exact: true })).toBeVisible();
  await expect(page.getByText('人员档案审批', { exact: true })).toBeVisible();
  const selectedPermissionTitle = page
    .locator('.ant-col-xl-9 .ant-list-item-meta-title')
    .filter({ hasText: '查看客户' });
  await expect(selectedPermissionTitle).toBeVisible();
  expect(
    await selectedPermissionTitle.evaluate(
      (element) => element.getBoundingClientRect().width,
    ),
  ).toBeGreaterThan(40);
  await expect(page.getByText('查看公司', { exact: true })).toHaveCount(0);
  await expect(page.getByText('查看全部打卡记录', { exact: true })).toHaveCount(
    0,
  );
  await expect(page.getByText('MODULE', { exact: true })).toHaveCount(0);

  await page.getByPlaceholder('搜索权限名称').fill('报销');
  await expect(page.getByText('报销最终审批', { exact: true })).toBeVisible();
  await page.getByPlaceholder('搜索权限名称').fill('人员档案审批');
  await expect(page.getByText('人员档案审批', { exact: true })).toBeVisible();
  await expect(
    page.locator('.ant-col-xl-15').getByText('查看客户', { exact: true }),
  ).toHaveCount(0);
  await page.getByPlaceholder('搜索权限名称').clear();
  await page.getByLabel('仅看已选').check();
  await expect(
    page.locator('.ant-col-xl-15').getByText('查看客户', { exact: true }),
  ).toBeVisible();
  await expect(page.getByText('报销最终审批', { exact: true })).toHaveCount(0);
  await page.getByRole('checkbox', { name: '选择删除查看客户' }).check();
  await page.getByRole('button', { name: '删除已选 (1)' }).click();
  await expect(page.getByText('确认删除 1 项已选权限？').last()).toBeVisible();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: '确认删除' })
    .click();
  await expect(page.getByText('暂未选择权限')).toBeVisible();

  await page.getByText('用户权限配置', { exact: true }).click();
  await expect(page.getByText('销售员', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('公司管理员', { exact: true })).toHaveCount(0);
  const inheritedCheckbox = page
    .getByRole('checkbox', { name: /查看客户/ })
    .first();
  await expect(inheritedCheckbox).toBeChecked();
  await expect(inheritedCheckbox).toBeDisabled();
  await expect(
    page.getByText('岗位权限', { exact: true }).first(),
  ).toBeVisible();
  await expect(page.getByText(/用户额外权限/).first()).toBeVisible();
  await page.getByRole('button', { name: '保存权限' }).click();
  await expect.poll(() => savedDirectPermissionIds).toEqual([4]);
});
