import type { Page, Route } from '@playwright/test';
import { expect, test } from '@playwright/test';

const annualUrl = '**/api/oa/attendance/rules/2028';
const user = {
  id: 1,
  companyId: 1,
  companyName: '测试公司',
  username: 'admin',
  name: '管理员',
  roles: ['COMPANY_ADMIN'],
  permissions: [],
};
const respond = (route: Route, data: unknown) =>
  route.fulfill({ json: { code: 0, data } });
const baseRule = {
  id: 10,
  year: 2028,
  status: 'DRAFT',
  companyConfigured: true,
  draftRevision: 1,
  version: 1,
  requiredPersonalHolidayCount: 52,
  companyHolidayDates: [],
  conflicts: [],
  timeRanges: [],
  timeExemptDates: [],
};
async function mockUser(page: Page) {
  await page.route('**/api/auth/current', (route) => respond(route, user));
  await page.route('**/api/oa/attendance/rules/2028/users', (route) =>
    respond(route, []),
  );
}

test('考勤时间默认在首位，全年配置保存后仍需发布', async ({ page }) => {
  await mockUser(page);
  let current: Record<string, unknown> = { ...baseRule };
  let submitted: Record<string, unknown> | undefined;
  await page.route(annualUrl, (route) => respond(route, current));
  await page.route('**/api/oa/attendance/rules/2028/time-ranges', (route) => {
    submitted = route.request().postDataJSON();
    current = { ...current, timeRanges: submitted!.ranges };
    return respond(route, current);
  });
  await page.goto('/oa/attendance-rules?year=2028');
  await expect(page.getByRole('tab').first()).toHaveText('1. 考勤时间');
  await expect(page.getByRole('tab').first()).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await page.getByRole('button', { name: '全年使用同一时间' }).click();
  const row = page.getByRole('group', { name: '考勤时间段 1' });
  await row.getByRole('textbox', { name: '上班时间' }).fill('09:00');
  await row.getByRole('textbox', { name: '上班时间' }).press('Enter');
  await row.getByRole('textbox', { name: '下班时间' }).fill('18:00');
  await row.getByRole('textbox', { name: '下班时间' }).press('Enter');
  await expect(page.getByText('已覆盖 366 / 366 个应出勤日期')).toBeVisible();
  await page.getByRole('button', { name: '保存考勤时间' }).click();
  await expect(page.getByText('考勤时间已保存为草稿')).toBeVisible();
  expect(submitted).toEqual({
    ranges: [
      {
        startDate: '2028-01-01',
        endDate: '2028-12-31',
        startTime: '09:00',
        endTime: '18:00',
        flexibleMinutes: 30,
      },
    ],
  });
  await expect(page.getByText('草稿待发布', { exact: true })).toBeVisible();
});

test('缺少闰日会阻止保存，休假日期可以免配置', async ({ page }) => {
  await mockUser(page);
  let exemptions: string[] = [];
  let writes = 0;
  await page.route(annualUrl, (route) =>
    respond(route, {
      ...baseRule,
      timeExemptDates: exemptions,
      timeRanges: [
        {
          startDate: '2028-01-01',
          endDate: '2028-02-28',
          startTime: '09:00',
          endTime: '18:00',
        },
        {
          startDate: '2028-03-01',
          endDate: '2028-12-31',
          startTime: '08:30',
          endTime: '17:30',
        },
      ],
    }),
  );
  await page.route('**/api/oa/attendance/rules/2028/time-ranges', (route) => {
    writes++;
    return respond(route, baseRule);
  });
  await page.goto('/oa/attendance-rules?year=2028');
  await expect(page.getByText('还缺 1 天', { exact: true })).toBeVisible();
  await expect(page.getByText('2028-02-29', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '保存考勤时间' }).click();
  await expect(
    page.getByText('考勤时间未覆盖全年应出勤日期，还缺 1 天'),
  ).toBeVisible();
  expect(writes).toBe(0);
  exemptions = ['2028-02-29'];
  await page.reload();
  await expect(page.getByText('已覆盖 365 / 365 个应出勤日期')).toBeVisible();
  await page.getByRole('button', { name: '保存考勤时间' }).click();
  await expect.poll(() => writes).toBe(1);
});

test('日期重叠提示具体日期，删除前需要确认', async ({ page }) => {
  await mockUser(page);
  await page.route(annualUrl, (route) =>
    respond(route, {
      ...baseRule,
      timeRanges: [
        {
          startDate: '2028-01-01',
          endDate: '2028-07-01',
          startTime: '09:00',
          endTime: '18:00',
        },
        {
          startDate: '2028-07-01',
          endDate: '2028-12-31',
          startTime: '08:30',
          endTime: '17:30',
        },
      ],
    }),
  );
  await page.goto('/oa/attendance-rules?year=2028');
  await expect(
    page.getByText('日期重叠 2028-07-01', { exact: true }),
  ).toBeVisible();
  await page
    .getByRole('group', { name: '考勤时间段 2' })
    .getByRole('button', { name: '删除', exact: true })
    .click();
  await expect(page.getByRole('group', { name: /考勤时间段/ })).toHaveCount(2);
  await page
    .getByRole('dialog')
    .getByRole('button', { name: '删除时间段' })
    .click();
  await expect(page.getByRole('group', { name: /考勤时间段/ })).toHaveCount(1);
});

test('当天工作时间展示，休假日展示日期类型', async ({ page }) => {
  await mockUser(page);
  await page.route('**/api/oa/attendance/my?**', (route) => respond(route, []));
  let holiday = false;
  await page.route('**/api/oa/attendance/rules/my-schedule?**', (route) =>
    respond(
      route,
      holiday
        ? { status: 'PERSONAL_HOLIDAY' }
        : { status: 'WORKDAY', startTime: '09:00', endTime: '18:00' },
    ),
  );
  await page.goto('/oa/attendance');
  await expect(
    page.getByText('考勤时间 09:00—18:00', { exact: true }),
  ).toBeVisible();
  holiday = true;
  await page.reload();
  await expect(page.getByText('个人假', { exact: true }).first()).toBeVisible();
  await expect(
    page.getByText('考勤时间 09:00—18:00', { exact: true }),
  ).toHaveCount(0);
});

test('390像素移动端时间卡片可完整展示', async ({ page }) => {
  await mockUser(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route(annualUrl, (route) =>
    respond(route, {
      ...baseRule,
      timeRanges: [
        {
          startDate: '2028-01-01',
          endDate: '2028-06-30',
          startTime: '09:00',
          endTime: '18:00',
        },
        {
          startDate: '2028-07-01',
          endDate: '2028-12-31',
          startTime: '08:30',
          endTime: '17:30',
        },
      ],
    }),
  );
  await page.goto('/oa/attendance-rules?year=2028');
  await expect(page.getByText('已覆盖 366 / 366 个应出勤日期')).toBeVisible();
  await expect(
    page
      .getByRole('group', { name: '考勤时间段 1' })
      .getByRole('textbox', { name: '上班时间' }),
  ).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  const width = await page.evaluate(() => ({
    document: document.documentElement.scrollWidth,
    viewport: window.innerWidth,
  }));
  expect(width.document).toBeLessThanOrEqual(width.viewport);
  await page.screenshot({
    path: '/private/tmp/attendance-time-ranges-mobile-390.png',
    fullPage: true,
  });
});
