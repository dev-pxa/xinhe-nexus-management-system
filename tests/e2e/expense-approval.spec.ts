import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/login');
  await page.getByPlaceholder('用户名或手机号').fill('admin');
  await page.getByPlaceholder('密码').fill('admin');
  await page.getByRole('button', { name: '登 录' }).click();
  await expect(page).toHaveURL(/\/dashboard/);
});

const pendingClaim = {
  id: 88,
  claimNo: 'BX-202611180001',
  applicantName: '张三',
  applicantOrgName: '销售部',
  totalAmount: 128.5,
  status: 'REVIEWING',
  currentNodeName: '最终审批',
  submittedAt: '2026-11-18 09:00:00',
  approvalRound: 1,
  version: 4,
};

const detailClaim = {
  ...pendingClaim,
  canReview: true,
  canWithdraw: false,
  items: [
    {
      id: 501,
      expenseCategory: 'TRANSPORT',
      expenseDate: '2026-11-17',
      expenseLocation: '杭州',
      amount: 128.5,
    },
  ],
  attachments: [
    {
      id: 601,
      itemId: 501,
      attachmentKind: 'INVOICE',
      fileName: '交通发票.jpg',
      contentType: 'image/jpeg',
      fileSize: 1024,
    },
  ],
  approvalNodes: [
    {
      id: 701,
      approvalRound: 1,
      sequenceNo: 1,
      nodeType: 'DEPARTMENT_MANAGER',
      reviewerName: '销售主管',
      status: 'APPROVED',
      actedAt: '2026-11-18 09:30:00',
    },
    {
      id: 702,
      approvalRound: 1,
      sequenceNo: 2,
      nodeType: 'FINAL_APPROVER',
      reviewerName: '公司管理员、财务经理',
      status: 'PENDING',
    },
  ],
};

test('待审批列表只提供去审核，详情支持附件预览和必填驳回原因', async ({
  page,
}) => {
  let decisionBody: Record<string, unknown> = {};
  await page.route('**/api/oa/expenses/pending', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        code: 0,
        message: 'success',
        data: [pendingClaim],
      }),
    }),
  );
  await page.route('**/api/oa/expenses/88/review', async (route) => {
    decisionBody = route.request().postDataJSON();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ code: 0, message: 'success', data: null }),
    });
  });
  await page.route('**/api/oa/expenses/88', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ code: 0, message: 'success', data: detailClaim }),
    }),
  );

  await page.goto('/oa/approval/expense-review');
  await expect(page.getByText('张三', { exact: true }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: '去审核' })).toBeVisible();
  await expect(page.getByRole('button', { name: '通过' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '驳回' })).toHaveCount(0);

  await page.getByRole('button', { name: '去审核' }).click();
  await expect(page).toHaveURL(/\/oa\/expense\/88/);
  await expect(page.getByText('交通发票.jpg', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: /预览发票/ }).click();
  await expect(
    page.getByRole('dialog').getByText('交通发票.jpg'),
  ).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'Close' }).click();

  await page.getByRole('button', { name: /驳\s*回/, exact: true }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /确\s*认\s*驳\s*回/ })
    .click();
  await expect(page.getByText('请填写驳回原因')).toBeVisible();
  await page.getByLabel('驳回原因').fill('票据金额与明细不一致');
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /确\s*认\s*驳\s*回/ })
    .click();
  await expect
    .poll(() => decisionBody)
    .toEqual({
      action: 'REJECT',
      opinion: '票据金额与明细不一致',
      version: 4,
    });
});

test('费用明细保存失败时不会继续提交审批', async ({ page }) => {
  let submitCount = 0;
  let saveBody: Record<string, unknown> | undefined;
  const draftClaim = {
    ...detailClaim,
    status: 'DRAFT',
    version: 2,
    canReview: false,
    canWithdraw: false,
    attachments: [],
    approvalNodes: [],
  };
  await page.route('**/api/oa/expenses/88/submit', async (route) => {
    submitCount += 1;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ code: 0, message: 'success', data: null }),
    });
  });
  await page.route('**/api/oa/expenses/88', async (route) => {
    if (route.request().method() === 'PUT') {
      saveBody = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ code: 400, message: '保存失败', data: null }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ code: 0, message: 'success', data: draftClaim }),
    });
  });

  await page.goto('/oa/expense/88');
  await page.getByRole('button', { name: /提\s*交/, exact: true }).click();
  await expect(page.getByText('保存失败')).toBeVisible();
  await expect.poll(() => submitCount).toBe(0);
  expect(saveBody).toBeDefined();
  expect(saveBody).not.toHaveProperty('version');
});

test('只有直属负责人未处理的报销单显示撤回入口', async ({ page }) => {
  await page.route('**/api/oa/expenses/mine', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        code: 0,
        message: 'success',
        data: [
          {
            ...pendingClaim,
            id: 1,
            claimNo: '待初审',
            status: 'PENDING',
            version: 1,
          },
          {
            ...pendingClaim,
            id: 2,
            claimNo: '待终审',
            status: 'REVIEWING',
            version: 2,
          },
        ],
      }),
    }),
  );
  await page.goto('/oa/expense');
  await expect(page.getByRole('button', { name: '撤回' })).toHaveCount(1);
  await expect(
    page.getByText('待直属负责人审批', { exact: true }).first(),
  ).toBeVisible();
  await expect(
    page.getByText('待最终审批', { exact: true }).first(),
  ).toBeVisible();
});

test('上级负责人就是最终审批人时详情仅展示一个审批节点', async ({ page }) => {
  let approved = false;
  await page.route('**/api/oa/expenses/88', (route) =>
    route.fulfill({
      json: {
        code: 0,
        data: {
          ...detailClaim,
          attachments: [],
          status: approved ? 'APPROVED' : 'REVIEWING',
          canReview: !approved,
          approvalNodes: [
            {
              id: 701,
              approvalRound: 1,
              sequenceNo: 1,
              nodeType: 'FINAL_APPROVER',
              reviewerName: '公司管理员',
              status: approved ? 'APPROVED' : 'PENDING',
            },
          ],
        },
      },
    }),
  );
  await page.route('**/api/oa/expenses/88/review', (route) => {
    expect(route.request().postDataJSON()).toMatchObject({ action: 'APPROVE' });
    approved = true;
    return route.fulfill({ json: { code: 0, data: null } });
  });
  await page.goto('/oa/expense/88');
  await expect(page.getByText(/最终审批.*公司管理员/)).toBeVisible();
  await expect(
    page.getByText('直属部门负责人审批：', { exact: false }),
  ).toHaveCount(0);
  await page.getByRole('button', { name: /^通\s*过$/ }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: '确认通过' })
    .click();
  await expect(
    page.getByText('审核通过', { exact: true }).first(),
  ).toBeVisible();
});

test('单节点终审尚未处理时员工可从列表撤回', async ({ page }) => {
  let withdrawn = false;
  await page.route('**/api/oa/expenses/mine', (route) =>
    route.fulfill({
      json: {
        code: 0,
        data: [
          {
            ...pendingClaim,
            status: withdrawn ? 'DRAFT' : 'REVIEWING',
            directFinalApproval: !withdrawn,
          },
        ],
      },
    }),
  );
  await page.route('**/api/oa/expenses/88/withdraw', (route) => {
    withdrawn = true;
    return route.fulfill({ json: { code: 0, data: null } });
  });
  await page.goto('/oa/expense');
  await page.getByRole('button', { name: '撤回', exact: true }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: '确认撤回' })
    .click();
  await expect(page.getByText('报销单已撤回', { exact: true })).toBeVisible();
  await expect(
    page.getByRole('table').getByText('草稿', { exact: true }),
  ).toBeVisible();
});
