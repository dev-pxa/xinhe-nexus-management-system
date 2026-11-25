import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/login');
  await page.getByPlaceholder('用户名或手机号').fill('admin');
  await page.getByPlaceholder('密码').fill('admin');
  await page.getByRole('button', { name: '登 录' }).click();
  await expect(page).toHaveURL(/\/dashboard/);
});

test('CRM独立销售订单入口和客户快捷新增符合需求', async ({ page }) => {
  const productRequests: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('products')) productRequests.push(request.url());
  });
  const customers = await page.request.get('/api/crm/customers?ownerUserId=2', {
    headers: { 'X-Tenant-Id': '1' },
  });
  expect(customers.ok()).toBeTruthy();
  const customerBody = await customers.json();
  const customer = customerBody.data[0];
  expect(customer).toBeTruthy();
  await page.goto('/crm/sales-orders');
  await expect(
    page.getByText('销售订单', { exact: true }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: '新增销售订单' }),
  ).toBeVisible();
  await expect(
    page.getByText('申请编号', { exact: true }).first(),
  ).toBeVisible();

  await page.goto('/crm/customers');
  const customerRow = page.getByRole('row').filter({
    has: page.getByText(customer.customerName, { exact: true }),
  });
  await expect(
    customerRow.getByText('新增订单', { exact: true }),
  ).toBeVisible();
  const crmProductsResponse = page.waitForResponse((response) =>
    response.url().includes('/api/crm/sales-order-products'),
  );
  await customerRow.getByText('新增订单', { exact: true }).click();
  expect((await crmProductsResponse).ok()).toBeTruthy();
  expect(
    productRequests.some((url) => url.includes('/api/erp/products')),
  ).toBeFalsy();
  await expect(page.getByRole('button', { name: '选择客户' })).toBeVisible();
  await expect(page.getByLabel('客户名称')).not.toHaveValue('');
  await expect(page.getByText('联系人', { exact: true })).toHaveCount(0);
  await expect(page.getByText('期望交付日期', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: '选择客户' }).click();
  await expect(page.getByText('选择本人负责的客户')).toBeVisible();

  await page.goto(`/crm/customers/${customer.id}`);
  await expect(page.getByRole('tab', { name: '销售' })).toHaveCount(0);
});

test('CRM销售订单详情展示中文状态并使用富文本审批意见', async ({ page }) => {
  let submittedOpinion = '';
  await page.route('**/api/crm/sales-orders/999999', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        code: 0,
        message: 'success',
        data: {
          id: 999999,
          applicationNo: 'CRM-SO-TEST',
          orderNo: null,
          approvalStatus: 'PENDING_APPROVAL',
          customerName: '状态展示测试客户',
          salespersonName: '测试销售',
          salespersonUserId: 999999,
          approverUserId: 2,
          canApprove: true,
          totalAmount: 0,
          lines: [],
        },
      }),
    });
  });
  await page.route(
    '**/api/crm/sales-orders/999999/approve',
    async (route) => {
      submittedOpinion = JSON.parse(route.request().postData() || '{}').opinion;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ code: 0, message: 'success', data: {} }),
      });
    },
  );
  await page.goto('/crm/sales-orders/999999');
  await expect(page.getByText('审批状态', { exact: true })).toBeVisible();
  await expect(page.getByText('待审核', { exact: true })).toBeVisible();
  await expect(page.getByText('PENDING_APPROVAL', { exact: true })).toHaveCount(
    0,
  );
  const opinion = page.getByRole('textbox', { name: '审批意见' });
  await expect(opinion).toBeVisible();
  await expect(page.getByRole('button', { name: '加粗' })).toBeVisible();
  await expect(page.getByRole('button', { name: '无序列表' })).toBeVisible();
  await opinion.evaluate((element) => {
    element.innerHTML = '<p>同意<strong>发货</strong></p>';
    element.dispatchEvent(new InputEvent('input', { bubbles: true }));
  });
  await page.getByRole('button', { name: '通过并同步ERP' }).click();
  await expect.poll(() => submittedOpinion).toBe(
    '<p>同意<strong>发货</strong></p>',
  );
});

test('ERP正式订单列表、详情和多仓分配界面完整', async ({ page }) => {
  await page.goto('/erp/orders');
  await expect(page.getByText('ERP销售订单')).toBeVisible();
  await expect(
    page.getByText('正式订单号', { exact: true }).first(),
  ).toBeVisible();
  await expect(page.getByText('CRM申请编号', { exact: true })).toHaveCount(0);
  await expect(page.getByText('商品编号', { exact: true })).toHaveCount(0);
  await expect(page.getByText('商品名称', { exact: true })).toHaveCount(0);
  await expect(page.getByText('详情', { exact: true }).first()).toBeVisible();

  const waitingResponse = await page.request.get(
    '/api/erp/fulfillment-orders?status=WAITING_DISPATCH',
    { headers: { 'X-Tenant-Id': '1' } },
  );
  const waitingBody = await waitingResponse.json();
  expect(waitingBody.data.length).toBeGreaterThan(0);
  await page.goto(`/erp/orders/${waitingBody.data[0].id}`);
  await expect(page.getByText('ERP销售订单详情')).toBeVisible();
  await expect(
    page.getByRole('button', { name: '分配仓库并出库发货' }),
  ).toBeVisible();
  await page.getByRole('button', { name: '分配仓库并出库发货' }).click();
  await expect(page).toHaveURL(/\/erp\/orders\/\d+\/dispatch$/);
  await expect(page.getByText('按仓库分配全部商品')).toBeVisible();
  await expect(page.locator('.ant-modal')).toHaveCount(0);
  const warehouses = await page.request
    .get('/api/erp/warehouses?enabledOnly=true', {
      headers: { 'X-Tenant-Id': '1' },
    })
    .then((r) => r.json());
  await expect(page.locator('.ant-select-multiple')).toHaveCount(
    warehouses.data.length,
  );
  await expect(
    page.getByText('承运商 / 配送方式', { exact: true }),
  ).toHaveCount(warehouses.data.length);
  await expect(page.getByText('物流单号', { exact: true })).toHaveCount(
    warehouses.data.length,
  );
  await expect(page.getByText('发货备注', { exact: true })).toHaveCount(
    warehouses.data.length,
  );
  await expect(
    page.getByRole('textbox', {
      name: warehouses.data[0].warehouseName + ' 发货备注',
    }),
  ).toBeVisible();
  await expect(page.getByText(/0\/\d+/).first()).toBeVisible();
});

test('仓库CRUD入口和库存管理页面可操作', async ({ page }) => {
  await page.goto('/erp/warehouses');
  await expect(page.getByText('仓库管理').first()).toBeVisible();
  await expect(page.getByRole('button', { name: '新增仓库' })).toBeVisible();
  await page.getByRole('button', { name: '新增仓库' }).click();
  await expect(page.getByLabel('仓库名称')).toBeVisible();
  await page.getByRole('button', { name: '取 消' }).click();

  await page.goto('/erp/inventory');
  await expect(page.getByText('库存管理').first()).toBeVisible();
  await expect(page.getByRole('button', { name: '调整库存' })).toBeVisible();
  await page.getByRole('button', { name: '调整库存' }).click();
  await expect(page.getByLabel('仓库')).toBeVisible();
  await expect(page.getByRole('combobox', { name: /商品$/ })).toBeVisible();
  await expect(page.getByLabel('调整后库存')).toBeVisible();
  await expect(page.getByLabel('调整原因')).toBeVisible();
});

test('销售退货和三维销售统计页面完整', async ({ page }) => {
  await page.goto('/erp/sales-returns');
  await expect(page.getByText('销售退货').first()).toBeVisible();
  await expect(
    page.getByText('退货单号', { exact: true }).first(),
  ).toBeVisible();
  const response = await page.request.get(
    '/api/erp/sales-returns?status=RECEIVED',
    { headers: { 'X-Tenant-Id': '1' } },
  );
  const body = await response.json();
  expect(body.data.length).toBeGreaterThan(0);
  await page.goto(`/erp/sales-returns/${body.data[0].id}`);
  await expect(page.getByText('销售退货详情')).toBeVisible();
  await expect(page.getByText('退回仓库', { exact: true })).toBeVisible();

  await page.goto('/erp/sales-reports');
  await expect(page.getByRole('tab', { name: '按客户' })).toBeVisible();
  await expect(page.getByRole('tab', { name: '按销售人员' })).toBeVisible();
  await expect(page.getByRole('tab', { name: '按商品' })).toBeVisible();
  await page.getByRole('tab', { name: '按商品' }).click();
  await expect(
    page.getByRole('columnheader', { name: '净销售额' }).last(),
  ).toBeVisible();
});
