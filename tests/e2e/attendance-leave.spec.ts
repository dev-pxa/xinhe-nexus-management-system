import type { Route } from '@playwright/test';
import { expect, test } from '@playwright/test';
import dayjs from 'dayjs';

const endpoint = '/api/oa/attendance/leave-requests';
const applications = '/oa/approval/leave-requests';
const review = '/oa/approval/leave-review';
const days = [
  { date: '2026-11-16', dayType: 'WORKDAY' },
  { date: '2026-11-17', dayType: 'PERSONAL_HOLIDAY' },
  { date: '2026-11-18', dayType: 'WORKDAY' },
  { date: '2026-11-19', dayType: 'COMPANY_HOLIDAY' },
  { date: '2026-11-20', dayType: 'WORKDAY' },
];
const request = {
  id: 10,
  applicantName: '陈一',
  departmentName: '研发部',
  leaveType: 'SICK',
  startDate: days[0].date,
  endDate: days[4].date,
  reason: '病假休息',
  leaveDays: 3,
  managerName: '林主管',
  finalReviewerName: '周管理员',
  status: 'PENDING_FINAL',
  submittedAt: '2026-11-14T10:00:00',
  managerActedAt: '2026-11-14T11:00:00',
  managerComment: '初审同意',
};

function data(route: Route, value: unknown) {
  return route.fulfill({ json: { code: 0, message: 'success', data: value } });
}

test.beforeEach(async ({ page }) => {
  await page.route('**/api/auth/current', (route) =>
    data(route, {
      id: 16,
      username: 'leave-test',
      name: '测试员工',
      companyId: 1,
      companyName: '测试公司',
      roles: ['COMPANY_ADMIN'],
      permissions: [],
    }),
  );
});

test('员工查看假日扣除、提交请假并查看两级进度', async ({ page }) => {
  let submitted = false;
  let payload = '';
  await page.route(`**${endpoint}?**`, (route) =>
    data(route, submitted ? [request] : []),
  );
  await page.route(`**${endpoint}/preview?**`, (route) => {
    const params = new URL(route.request().url()).searchParams;
    const selectedDays = days.filter(
      (day) =>
        day.date >= params.get('startDate')! &&
        day.date <= params.get('endDate')!,
    );
    return data(route, {
      days: selectedDays,
      conflictDates: [],
      managerName: '林主管',
      finalReviewerName: '周管理员',
    });
  });
  await page.route(`**${endpoint}`, (route) => {
    payload = route.request().postData() || '';
    submitted = true;
    return data(route, { id: request.id });
  });
  await page.route(`**${endpoint}/10`, (route) =>
    data(route, {
      ...request,
      days,
      canReview: false,
      canWithdraw: true,
    }),
  );

  await page.goto(`${applications}?date=${request.startDate}`);
  const modal = page.getByRole('dialog', { name: '新建请假申请' });
  await expect(modal.getByPlaceholder('开始日期')).toHaveValue(
    request.startDate,
  );
  const endDate = modal.getByPlaceholder('结束日期');
  await endDate.fill(request.endDate);
  await endDate.press('Enter');
  await expect(modal.getByText('申请范围 5 天，实际请假 3 天')).toBeVisible();
  await expect(modal.getByText(/2026-11-17.*个人假/)).toBeVisible();
  await expect(modal.getByText(/2026-11-19.*公司假/)).toBeVisible();

  await modal.getByLabel('假种').click();
  for (const type of ['病假', '调休假', '事假', '其他']) {
    await expect(
      page.locator('.ant-select-dropdown').getByText(type, { exact: true }),
    ).toBeVisible();
  }
  await page
    .locator('.ant-select-dropdown')
    .getByText('病假', { exact: true })
    .click();
  await modal.getByLabel('请假原因').fill(request.reason);
  await modal.getByRole('button', { name: '提交申请' }).click();
  expect(payload).toContain('"leaveType":"SICK"');
  expect(payload).toContain('"endDate":"2026-11-20"');
  const detail = page.getByRole('dialog', { name: '请假申请详情' });
  await expect(
    detail.getByText('直属上级初审 · 林主管 · 已通过'),
  ).toBeVisible();
  await expect(
    detail.getByText('公司顶层管理员终审 · 周管理员 · 待审批'),
  ).toBeVisible();
  await expect(detail.getByText('初审同意')).toBeVisible();
});

test('审批人从单列表打开终审，确认日期后提交决定', async ({ page }) => {
  let approved = false;
  await page.route(`**${endpoint}?**`, (route) =>
    data(route, [
      {
        ...request,
        status: approved ? 'APPROVED' : 'PENDING_FINAL',
      },
    ]),
  );
  await page.route(`**${endpoint}/10`, (route) =>
    data(route, {
      ...request,
      days,
      canReview: !approved,
      canWithdraw: false,
      status: approved ? 'APPROVED' : 'PENDING_FINAL',
      finalActedAt: approved ? '2026-11-14T12:00:00' : undefined,
    }),
  );
  await page.route(`**${endpoint}/10/decision`, (route) => {
    expect(route.request().postDataJSON()).toEqual({
      approve: true,
      comment: '',
    });
    approved = true;
    return data(route, null);
  });

  await page.goto(review);
  await expect(page.getByRole('table')).toHaveCount(1);
  await page.getByRole('button', { name: '查看详情' }).click();
  const detail = page.getByRole('dialog', { name: '请假申请详情' });
  await detail.getByRole('button', { name: '驳回申请' }).click();
  const rejection = page.getByRole('dialog', { name: '驳回请假申请' });
  await expect(
    rejection.getByRole('button', { name: '确认驳回' }),
  ).toBeDisabled();
  await rejection.getByRole('button', { name: /取\s*消/ }).click();
  await detail.getByRole('button', { name: '通过审批' }).click();
  const confirmation = page.getByRole('dialog', { name: '通过请假申请' });
  await expect(
    confirmation.getByText(
      '将更新考勤的日期 2026-11-16、2026-11-18、2026-11-20',
    ),
  ).toBeVisible();
  await confirmation.getByRole('button', { name: '确认通过' }).click();
  await expect(
    detail.getByText('公司顶层管理员终审 · 周管理员 · 已通过'),
  ).toBeVisible();
  await expect(detail.getByRole('button', { name: '通过审批' })).toHaveCount(0);
});

test('个人考勤及详情显示具体假种并保留个人假和公司假标签', async ({ page }) => {
  const date = dayjs().format('YYYY-MM-DD');
  await page.route('**/api/oa/attendance/my?**', (route) => {
    const from = new URL(route.request().url()).searchParams.get('from');
    const to = new URL(route.request().url()).searchParams.get('to');
    const entries = [
      {
        punchDate: date,
        punchCount: 0,
        status: 'ON_LEAVE',
        leaveType: 'COMPENSATORY',
      },
      {
        punchDate: dayjs().startOf('month').add(1, 'day').format('YYYY-MM-DD'),
        punchCount: 0,
        status: 'PERSONAL_HOLIDAY',
      },
      {
        punchDate: dayjs().startOf('month').add(2, 'day').format('YYYY-MM-DD'),
        punchCount: 0,
        status: 'COMPANY_HOLIDAY',
      },
    ];
    return data(route, from === to ? entries.slice(0, 1) : entries);
  });
  await page.route('**/api/oa/attendance/my/punches?**', (route) =>
    data(route, []),
  );
  await page.goto('/oa/attendance');
  const table = page.getByRole('table');
  await expect(table.getByText('已请假—调休假')).toBeVisible();
  await expect(table.getByText('个人假', { exact: true })).toBeVisible();
  await expect(table.getByText('公司假', { exact: true })).toBeVisible();
  await table
    .getByRole('row')
    .filter({ hasText: '已请假—调休假' })
    .getByRole('button', { name: '查看' })
    .click();
  await expect(page).toHaveURL(new RegExp(`/oa/attendance/${date}`));
  await expect(
    page.getByText('已请假—调休假', { exact: true }).first(),
  ).toBeVisible();
});

test('顶层管理员作为第一审批人时只显示一级并直接批准', async ({ page }) => {
  let approved = false;
  const singleStep = {
    ...request,
    managerName: '杭州分部管理员',
    managerActedAt: undefined,
    managerComment: undefined,
    finalReviewerName: null,
    status: 'PENDING_MANAGER',
  };
  await page.route(`**${endpoint}?**`, (route) =>
    data(route, [
      { ...singleStep, status: approved ? 'APPROVED' : 'PENDING_MANAGER' },
    ]),
  );
  await page.route(`**${endpoint}/10`, (route) =>
    data(route, {
      ...singleStep,
      days,
      canReview: !approved,
      canWithdraw: false,
      status: approved ? 'APPROVED' : 'PENDING_MANAGER',
      managerActedAt: approved ? '2026-11-14T12:00:00' : undefined,
    }),
  );
  await page.route(`**${endpoint}/10/decision`, (route) => {
    expect(route.request().postDataJSON()).toEqual({
      approve: true,
      comment: '',
    });
    approved = true;
    return data(route, null);
  });

  await page.route(`**${endpoint}/preview?**`, (route) =>
    data(route, {
      days: days.slice(0, 1),
      conflictDates: [],
      managerName: singleStep.managerName,
      finalReviewerName: null,
    }),
  );
  await page.goto(`${applications}?date=${request.startDate}`);
  const application = page.getByRole('dialog', { name: '新建请假申请' });
  await expect(
    application.getByText('公司顶层管理员审批 · 杭州分部管理员'),
  ).toBeVisible();
  await expect(
    application.getByText('公司顶层管理员终审', { exact: false }),
  ).toHaveCount(0);

  await page.goto(review);
  await expect(
    page.getByText('待公司顶层管理员审批', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: '查看详情' }).click();
  const detail = page.getByRole('dialog', { name: '请假申请详情' });
  await expect(
    detail.getByText('公司顶层管理员审批 · 杭州分部管理员 · 待审批'),
  ).toBeVisible();
  await expect(
    detail.getByText('公司顶层管理员终审', { exact: false }),
  ).toHaveCount(0);
  await detail.getByRole('button', { name: '通过审批' }).click();
  const confirmation = page.getByRole('dialog', { name: '通过请假申请' });
  await expect(
    confirmation.getByText('将更新考勤的日期', { exact: false }),
  ).toBeVisible();
  await confirmation.getByRole('button', { name: '确认通过' }).click();
  await expect(
    detail.getByText('公司顶层管理员审批 · 杭州分部管理员 · 已通过'),
  ).toBeVisible();
});

test('详情突出休息日，员工在列表确认撤回', async ({ page }) => {
  let withdrawn = false;
  await page.route(`**${endpoint}?**`, (route) =>
    data(route, [
      { ...request, status: withdrawn ? 'WITHDRAWN' : 'PENDING_FINAL' },
    ]),
  );
  await page.route(`**${endpoint}/10`, (route) =>
    data(route, { ...request, days, canWithdraw: true }),
  );
  await page.route(`**${endpoint}/10/withdraw`, (route) => {
    withdrawn = true;
    return data(route, null);
  });
  await page.goto(applications);
  await expect(page.getByRole('table')).toBeVisible();
  await expect(
    page.getByRole('table').getByRole('button', { name: '撤回申请' }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('table')).toHaveCount(0);
  const card = page.getByRole('listitem').filter({ hasText: '实际请假' });
  await expect(card.getByRole('heading', { name: '病假' })).toBeVisible();
  await expect(card.getByText('2026-11-16 至 2026-11-20')).toBeVisible();
  await page.getByRole('button', { name: '查看详情' }).click();
  const detail = page.getByRole('dialog', { name: '请假申请详情' });
  const holiday = detail
    .getByRole('listitem')
    .filter({ hasText: '公司假 · 不计入请假' });
  await expect(holiday).toHaveCSS('background-color', 'rgb(234, 247, 238)');
  await expect(detail.getByText('个人假 · 不计入请假')).toBeVisible();
  await expect(detail.getByRole('button', { name: '撤回申请' })).toHaveCount(0);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: '撤回申请' }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: '撤回申请' })
    .click();
  await expect(
    page.getByRole('listitem').getByText('已撤回', { exact: true }),
  ).toBeVisible();
  await expect(detail).toHaveCount(0);
});

for (const attachment of [
  { name: '凭证.pdf', type: 'application/pdf' },
  { name: '凭证.png', type: 'image/png' },
]) {
  test(`请假详情内预览 ${attachment.type}`, async ({ page }) => {
    await page.route(`**${endpoint}?**`, (route) => data(route, [request]));
    await page.route(`**${endpoint}/10`, (route) =>
      data(route, {
        ...request,
        days,
        attachmentName: attachment.name,
        attachmentContentType: attachment.type,
      }),
    );
    await page.route(`**${endpoint}/10/attachment`, (route) =>
      route.fulfill({
        contentType: attachment.type,
        headers: { 'Content-Disposition': 'inline' },
        body:
          attachment.type === 'image/png'
            ? Buffer.from(
                'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jV2kAAAAASUVORK5CYII=',
                'base64',
              )
            : '',
      }),
    );
    await page.goto(applications);
    await page.getByRole('button', { name: '查看详情' }).click();
    await page.getByRole('button', { name: attachment.name }).click();
    const preview = page.getByRole('dialog', { name: attachment.name });
    const media =
      attachment.type === 'application/pdf'
        ? preview.locator('iframe')
        : preview.getByRole('img', { name: attachment.name });
    await expect(media).toBeVisible();
    await expect(media).toHaveAttribute('src', `${endpoint}/10/attachment`);
  });
}
