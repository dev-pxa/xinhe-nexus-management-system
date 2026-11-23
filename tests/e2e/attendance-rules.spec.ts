import { expect, test } from '@playwright/test';

test.setTimeout(60_000);

const yearRule = (overrides: Record<string, unknown> = {}) => ({
  id: 91,
  year: 2027,
  status: 'DRAFT',
  companyConfigured: true,
  draftRevision: 2,
  publishedRevision: 1,
  version: 4,
  requiredPersonalHolidayCount: 52,
  companyHolidayDates: [],
  conflicts: [],
  ...overrides,
});
const gotoRulePage = async (page: import('@playwright/test').Page, url: string) => {
  await page.goto(url);
  if (!(await page.getByText('考勤规则', { exact: true }).first().isVisible({ timeout: 5_000 }).catch(() => false))) {
    await page.reload();
  }
};

test.beforeEach(async ({ page }) => {
  await page.goto('/login');
  await page.getByPlaceholder('用户名：admin').fill('admin');
  await page.getByPlaceholder('密码').fill('admin');
  await page.getByRole('button', { name: '登 录' }).click();
  await expect(page).toHaveURL(/\/dashboard/);
});

test('公司放假调整产生冲突后弹窗并跳转冲突员工', async ({ page }) => {
  let savedBody: Record<string, unknown> = {};
  let companySaved = false;
  await page.route('**/api/oa/attendance/rules/2027/users/7', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        code: 0,
        message: 'success',
        data: {
          year: 2027,
          userId: 7,
          companyConfigured: true,
          version: 5,
          companyHolidayDates: ['2027-01-04'],
          personalHolidayDates: ['2027-01-04'],
          conflictDates: ['2027-01-04'],
          requiredPersonalHolidayCount: 52,
        },
      }),
    }),
  );
  await page.route('**/api/oa/attendance/rules/2027/users', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        code: 0,
        message: 'success',
        data: [{ id: 7, name: '张三', username: 'zhangsan', holidayCount: 1, conflictCount: 1 }],
      }),
    }),
  );
  await page.route('**/api/oa/attendance/rules/2027/company-holidays', async (route) => {
    savedBody = route.request().postDataJSON();
    companySaved = true;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        code: 0,
        message: 'success',
        data: yearRule({
          version: 5,
          companyHolidayDates: ['2027-01-04'],
          conflicts: [{ userId: 7, userName: '张三', dates: ['2027-01-04'] }],
        }),
      }),
    });
  });
  await page.route('**/api/oa/attendance/rules/2027', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ code: 0, message: 'success', data: companySaved ? yearRule({ version: 5, companyHolidayDates: ['2027-01-04'], conflicts: [{ userId: 7, userName: '张三', dates: ['2027-01-04'] }] }) : yearRule() }),
    }),
  );

  await gotoRulePage(page, '/oa/attendance-rules?year=2027');
  await expect(page.getByText('已发布版本仍在生效，当前修改尚未发布')).toBeVisible();
  const monthPicker=page.locator('.ant-select').filter({has:page.getByRole('combobox',{name:'快速切换月份'})});
  await page.locator('[data-date="2027-01-04"]').first().click();
  await expect(page.locator('[data-date="2027-01-04"]').first()).toContainText('公司假');
  await expect(page.locator('[data-date="2027-01-04"]').first()).not.toContainText(/个人假|冲突/);
  await page.getByRole('button', { name: '下个月' }).click();
  await expect(monthPicker.locator('.ant-select-selection-item')).toHaveText('2月');
  await page.getByRole('button', { name: '上个月' }).click();
  await expect(monthPicker.locator('.ant-select-selection-item')).toHaveText('1月');
  await expect(page.locator('[data-date="2027-01-04"]').first()).toContainText(/公司假|冲突/);
  await monthPicker.locator('.ant-select-selector').click();
  await page.locator('.ant-select-item-option-content').getByText('6月', { exact: true }).click();
  await expect(monthPicker.locator('.ant-select-selection-item')).toHaveText('6月');
  for(let index=0;index<5;index+=1)await page.getByRole('button',{name:'上个月'}).click();
  await expect(monthPicker.locator('.ant-select-selection-item')).toHaveText('1月');
  await expect(page.locator('[data-date="2027-01-04"]').first()).toContainText(/公司假|冲突/);
  await page.getByRole('button', { name: '保存公司放假' }).click();
  await expect(page.getByRole('dialog').locator('.ant-modal-confirm-title')).toHaveText('公司放假与个人放假冲突');
  await expect(page.getByRole('dialog').getByText('张三')).toBeVisible();
  expect(savedBody).toEqual({ dates: ['2027-01-04'], version: 4 });
  await page.getByRole('dialog').getByRole('button', { name: '去调整第一位员工' }).click();
  await expect(page).toHaveURL(/tab=personal.*userId=7/);
  await expect(page.getByText('当前员工有 1 个冲突日期')).toBeVisible();
  await expect(page.locator('[data-date="2027-01-04"]').last()).toContainText('冲突');
});

test('个人星期批量操作覆盖全年、允许公司假冲突且移动端无溢出', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route('**/api/oa/attendance/rules/2027/users/7', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ code: 0, message: 'success', data: { year: 2027, userId: 7, companyConfigured: true, version: 4, requiredPersonalHolidayCount: 52, companyHolidayDates: ['2027-01-04'], personalHolidayDates: [], conflictDates: [] } }) }),
  );
  await page.route('**/api/oa/attendance/rules/2027/users', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ code: 0, message: 'success', data: [{ id: 7, name: '张三', username: 'zhangsan', holidayCount: 1, conflictCount: 0 }] }) }),
  );
  await page.route('**/api/oa/attendance/rules/2027', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ code: 0, message: 'success', data: yearRule({ companyHolidayDates: ['2027-01-04'] }) }) }),
  );
  await gotoRulePage(page, '/oa/attendance-rules?year=2027&tab=personal&userId=7');
  await expect(page.getByText('批量操作只修改未来日期；冻结日期保持不变')).toBeVisible();
  const titleBox=await page.getByText('设置员工个人放假',{exact:true}).boundingBox();
  const countBox=await page.getByText(/未来已选 0 \/ 剩余应选 52 天/).boundingBox();
  expect(titleBox!.y+titleBox!.height).toBeLessThanOrEqual(countBox!.y);
  const hintBox=await page.getByText(/过去时间按每满 7 天已休 1 天自动折算/).boundingBox();
  const employeeBox=await page.getByRole('combobox',{name:'选择员工'}).boundingBox();
  expect(employeeBox!.y-(hintBox!.y+hintBox!.height)).toBeGreaterThanOrEqual(12);
  await page.screenshot({ path: 'test-results/attendance-rules-personal-header-mobile-390.png' });
  await page.getByRole('button', { name: '批量添加' }).click();
  await expect(page.getByRole('dialog').locator('.ant-modal-title')).toHaveText('批量添加个人假');
  await page.getByRole('combobox',{name:'选择批量星期'}).click();
  await page.locator('.ant-select-item-option-content').getByText('星期一',{exact:true}).click();
  await page.keyboard.press('Escape');
  await page.getByRole('dialog').getByRole('button',{name:'确认添加'}).click();
  await expect(page.getByText('未来已选 52 / 剩余应选 52 天')).toBeVisible();
  await expect(page.locator('[data-date="2027-01-04"]').last()).toContainText('冲突');
  const monthPicker=page.locator('.ant-select').filter({has:page.getByRole('combobox',{name:'快速切换月份'})});
  await monthPicker.locator('.ant-select-selector').click();
  await page.locator('.ant-select-item-option-content').getByText('6月',{exact:true}).click();
  await expect(page.locator('[data-date="2027-06-28"]').last()).toContainText('个人假');
  await page.getByRole('button', { name: '批量取消' }).click();
  await expect(page.getByRole('dialog').locator('.ant-modal-title')).toHaveText('批量取消个人假');
  await page.getByRole('combobox',{name:'选择批量星期'}).click();
  await page.locator('.ant-select-item-option-content').getByText('星期一',{exact:true}).click();
  await page.keyboard.press('Escape');
  const width = await page.evaluate(() => ({ document: document.documentElement.scrollWidth, viewport: window.innerWidth }));
  expect(width.document).toBeLessThanOrEqual(width.viewport);
  await page.screenshot({ path: 'test-results/attendance-rules-mobile-390.png', fullPage: true });
  await page.getByRole('dialog').getByRole('button',{name:'确认取消'}).click();
  await expect(page.getByText('未来已选 0 / 剩余应选 52 天')).toBeVisible();
  await expect(page.locator('[data-date="2027-06-28"]').last()).not.toContainText('个人假');
});

test('过去无假日期置灰且过去公司假保留高亮', async ({ page }) => {
  await page.route('**/api/oa/attendance/rules/2026/users', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ code: 0, message: 'success', data: [] }) }),
  );
  await page.route('**/api/oa/attendance/rules/2026', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ code: 0, message: 'success', data: yearRule({ year: 2026, requiredPersonalHolidayCount: 6, companyHolidayDates: ['2026-11-02'] }) }) }),
  );
  await gotoRulePage(page, '/oa/attendance-rules?year=2026');
  for(let index=0;index<10;index+=1)await page.getByRole('button',{name:'下个月'}).click();
  const frozen = page.locator('[data-date="2026-11-01"]').last();
  const holiday = page.locator('[data-date="2026-11-02"]').last();
  await expect(frozen).toContainText('已冻结');
  await expect(frozen).toHaveAttribute('aria-disabled', 'true');
  await expect(holiday).toContainText('公司假');
  await expect(holiday).not.toContainText('已冻结');
});

test('快速切换员工时不会被旧请求覆盖个人假期', async ({ page }) => {
  let delayedRoute: import('@playwright/test').Route | undefined;
  await page.route('**/api/oa/attendance/rules/2027/users/7', (route) => {
    delayedRoute = route;
  });
  await page.route('**/api/oa/attendance/rules/2027/users/8', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ code: 0, message: 'success', data: { year: 2027, userId: 8, companyConfigured: true, version: 4, requiredPersonalHolidayCount: 52, companyHolidayDates: [], personalHolidayDates: ['2027-01-05'], conflictDates: [] } }) }),
  );
  await page.route('**/api/oa/attendance/rules/2027/users', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ code: 0, message: 'success', data: [{ id: 7, name: '张三', username: 'zhangsan', holidayCount: 1, conflictCount: 0 }, { id: 8, name: '李四', username: 'lisi', holidayCount: 1, conflictCount: 0 }] }) }),
  );
  await page.route('**/api/oa/attendance/rules/2027', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ code: 0, message: 'success', data: yearRule() }) }),
  );

  await gotoRulePage(page, '/oa/attendance-rules?year=2027&tab=personal&userId=8');
  await expect(page.locator('[data-date="2027-01-05"]').last()).toContainText('个人假');
  const employeeSelect = page.locator('.ant-select').filter({ has: page.getByRole('combobox', { name: '选择员工' }) });
  await employeeSelect.locator('.ant-select-selector').click();
  await page.locator('.ant-select-item-option-content').getByText(/张三/).click();
  await expect.poll(() => Boolean(delayedRoute)).toBe(true);
  await employeeSelect.locator('.ant-select-selector').click();
  await page.locator('.ant-select-item-option-content').getByText(/李四/).click();
  await expect(page.locator('[data-date="2027-01-05"]').last()).toContainText('个人假');
  await delayedRoute!.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ code: 0, message: 'success', data: { year: 2027, userId: 7, companyConfigured: true, version: 4, requiredPersonalHolidayCount: 52, companyHolidayDates: [], personalHolidayDates: ['2027-01-04'], conflictDates: [] } }) });
  await page.waitForTimeout(100);
  await expect(page.locator('[data-date="2027-01-05"]').last()).toContainText('个人假');
  await expect(page.locator('[data-date="2027-01-04"]').last()).not.toContainText('个人假');
});
