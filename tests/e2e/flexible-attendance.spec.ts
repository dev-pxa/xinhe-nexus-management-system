import { expect, test } from '@playwright/test';
import dayjs from 'dayjs';

const user = {
  id: 1,
  username: 'admin',
  name: '管理员',
  companyId: 1,
  companyName: '测试公司',
  roles: ['COMPANY_ADMIN'],
  permissions: [],
};
test.beforeEach(async ({ page }) => {
  await page.route('**/api/auth/current', (route) =>
    route.fulfill({ json: { code: 0, data: user } }),
  );
});

test('分别提交上班和下班，状态只显示迟到早退标签', async ({
  page,
  context,
  baseURL,
}) => {
  await context.grantPermissions(['geolocation'], {
    origin: new URL(baseURL!).origin,
  });
  await context.setGeolocation({
    latitude: 30.27,
    longitude: 120.15,
    accuracy: 12,
  });
  await page.addInitScript(() => {
    Object.defineProperty(navigator.geolocation, 'getCurrentPosition', {
      value: (success: PositionCallback) => success({
        coords: { latitude: 30.27, longitude: 120.15, accuracy: 12 },
        timestamp: Date.now(),
      } as GeolocationPosition),
    });
  });
  const date = dayjs().format('YYYY-MM-DD');
  let result = {
    punchDate: date,
    punchCount: 0,
    status: 'WAITING_IN',
    late: 0,
    early: 0,
  };
  const types: string[] = [];
  await page.route('**/api/oa/attendance/rules/my-schedule?**', (route) =>
    route.fulfill({
      json: {
        code: 0,
        data: {
          date,
          status: 'WORKDAY',
          startTime: '09:00',
          endTime: '18:00',
          flexibleMinutes: 30,
        },
      },
    }),
  );
  await page.route('**/api/oa/attendance/my?**', (route) =>
    route.fulfill({ json: { code: 0, data: [result] } }),
  );
  await page.route('**/api/oa/attendance/punch', (route) => {
    const body = route.request().postDataJSON();
    types.push(body.punchType);
    const number = types.length;
    result = {
      ...result,
      punchCount: number,
      status:
        number === 1 ? 'WAITING_OUT' : number === 2 ? 'LATE_EARLY' : 'LATE',
      late: 1,
      early: number === 2 ? 1 : 0,
    };
    return route.fulfill({ json: { code: 0, data: result } });
  });
  await page.goto('/oa/attendance');
  await expect(page.getByText('弹性 30 分钟')).toBeVisible();
  await page.getByRole('button', { name: '上班打卡', exact: true }).click();
  await expect(
    page.getByRole('table').getByText('待下班打卡、迟到', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: '下班打卡', exact: true }).click();
  await expect(
    page.getByRole('table').getByText('迟到、早退', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: '下班打卡', exact: true }).click();
  await expect(
    page.getByRole('table').getByText('迟到', { exact: true }),
  ).toBeVisible();
  expect(types).toEqual(['IN', 'OUT', 'OUT']);
});

test('时间范围中的弹性分钟可编辑，默认30且随范围一起保存', async ({ page }) => {
  let saved: any;
  let ranges: any[] = [];
  const rule = () => ({
    year: 2028,
    status: 'DRAFT',
    companyConfigured: true,
    draftRevision: 1,
    version: 1,
    companyHolidayDates: [],
    conflicts: [],
    requiredPersonalHolidayCount: 52,
    timeRanges: ranges,
    timeExemptDates: [],
  });
  await page.route('**/api/oa/attendance/rules/2028/users', (route) =>
    route.fulfill({ json: { code: 0, data: [] } }),
  );
  await page.route('**/api/oa/attendance/rules/2028', (route) =>
    route.fulfill({ json: { code: 0, data: rule() } }),
  );
  await page.route('**/api/oa/attendance/rules/2028/time-ranges', (route) => {
    saved = route.request().postDataJSON();
    ranges = saved.ranges;
    return route.fulfill({ json: { code: 0, data: rule() } });
  });
  await page.goto('/oa/attendance-rules?year=2028');
  await page.getByRole('button', { name: '全年使用同一时间' }).click();
  const row = page.getByRole('group', { name: '考勤时间段 1' });
  await expect(
    row.getByRole('spinbutton', { name: '弹性时间（分钟）' }),
  ).toHaveValue('30');
  for (const [name, value] of [
    ['上班时间', '09:00'],
    ['下班时间', '18:00'],
  ]) {
    await row.getByRole('textbox', { name }).fill(value);
    await row.getByRole('textbox', { name }).press('Enter');
  }
  await row.getByRole('spinbutton', { name: '弹性时间（分钟）' }).fill('15');
  await page.getByRole('button', { name: '保存考勤时间' }).click();
  await expect(page.getByText('考勤时间已保存为草稿')).toBeVisible();
  expect(saved.ranges[0].flexibleMinutes).toBe(15);
});
