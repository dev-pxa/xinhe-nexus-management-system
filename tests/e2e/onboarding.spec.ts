import { expect, test } from '@playwright/test';

test('公开入职表单允许教育背景为空并提交锁定', async ({ page }) => {
  let submitted: Record<string, unknown> = {};
  await page.route(
    '**/api/public/onboarding/forms/test-token**',
    async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            code: 0,
            message: 'success',
            data: {
              candidateName: '张三',
              companyName: '芯河智枢总公司',
              departmentName: '研发部',
              positionName: '工程师',
              status: 'PENDING',
            },
          }),
        });
      } else {
        submitted = JSON.parse(route.request().postData() || '{}');
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            code: 0,
            message: 'success',
            data: { status: 'SUBMITTED' },
          }),
        });
      }
    },
  );
  await page.goto('/onboarding/test-token');
  await expect(page.getByText('张三')).toBeVisible();
  await expect(page.getByText('公司：芯河智枢总公司')).toBeVisible();
  await page.getByLabel('性别').click();
  await page.getByText('男', { exact: true }).click();
  await page.getByLabel('出生日期').click();
  await page.locator('.ant-picker-cell-in-view').first().click();
  await page.getByLabel('证件类型').click();
  await page.getByText('身份证', { exact: true }).click();
  await page.getByLabel('证件号码').fill('110101199001010015');
  await page.getByLabel('手机号').fill('13800138000');
  await page.getByLabel('邮箱').fill('zhangsan@example.com');
  await page.getByLabel('居住地址').fill('广东省深圳市南山区');
  await page.locator('#emergencyContactName').fill('李四');
  await page.locator('#emergencyContactRelation').fill('父亲');
  await page.locator('#emergencyContactPhone').fill('13900139000');
  await page.getByLabel('登录用户名').fill('zhangsan');
  await page.getByLabel('登录密码').fill('Abc123!');
  await page.getByLabel('确认密码').fill('Abc123!');
  await page.getByRole('button', { name: '确认提交并锁定' }).click();
  await expect(page.getByText('资料已提交')).toBeVisible();
  expect(submitted.educations).toEqual([]);
});

test('教育背景填写后按开始月份自动排序且不出现拖拽控件', async ({ page }) => {
  let submitted: Record<string, unknown> = {};
  await page.route(
    '**/api/public/onboarding/forms/test-education**',
    async (route) => {
      if (route.request().method() === 'GET')
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            code: 0,
            data: {
              candidateName: '李四',
              companyName: '芯河智枢总公司',
              departmentName: '研发部',
              positionName: '工程师',
              status: 'PENDING',
            },
            message: 'success',
          }),
        });
      submitted = JSON.parse(route.request().postData() || '{}');
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 0,
          data: { status: 'SUBMITTED' },
          message: 'success',
        }),
      });
    },
  );
  await page.goto('/onboarding/test-education');
  await page.getByRole('button', { name: '新增教育背景' }).click();
  await page.locator('.ant-picker').nth(0).click();
  await page.keyboard.press('Escape');
  await page.getByLabel('登录用户名').fill('lisi');
  await page.getByLabel('登录密码').fill('Abc123!');
  await page.getByLabel('确认密码').fill('Abc123!');
  await expect(page.getByText('系统会按开始时间自动排序')).toBeVisible();
  await expect(page.getByRole('button', { name: /拖拽|移动/ })).toHaveCount(0);
  expect(submitted).toEqual({});
});

test('密码为空时显示校验提示且不提交接口', async ({ page }) => {
  let submitCalled = false;
  await page.route(
    '**/api/public/onboarding/forms/empty-password**',
    async (route) => {
      if (route.request().method() === 'GET')
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            code: 0,
            data: {
              candidateName: '王五',
              companyName: '芯河智枢总公司',
              departmentName: '研发部',
              positionName: '工程师',
              status: 'PENDING',
            },
            message: 'success',
          }),
        });
      submitCalled = true;
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 0,
          data: { status: 'SUBMITTED' },
          message: 'success',
        }),
      });
    },
  );
  await page.goto('/onboarding/empty-password');
  await page.getByLabel('性别').click();
  await page.getByText('男', { exact: true }).click();
  await page.getByLabel('出生日期').click();
  await page.locator('.ant-picker-cell-in-view').first().click();
  await page.getByLabel('证件类型').click();
  await page.getByText('身份证', { exact: true }).click();
  await page.getByLabel('证件号码').fill('110101199001010015');
  await page.getByLabel('手机号').fill('13800138000');
  await page.getByLabel('邮箱').fill('wangwu@example.com');
  await page.getByLabel('居住地址').fill('广东省深圳市南山区');
  await page.locator('#emergencyContactName').fill('李四');
  await page.locator('#emergencyContactRelation').fill('父亲');
  await page.locator('#emergencyContactPhone').fill('13900139000');
  await page.getByLabel('登录用户名').fill('wangwu');
  await page.getByRole('button', { name: '确认提交并锁定' }).click();
  await expect(page.getByText('请输入登录密码')).toBeVisible();
  expect(submitCalled).toBeFalsy();
});

test('证件号和手机号格式不正确时阻止提交', async ({ page }) => {
  let submitCalled = false;
  await page.route(
    '**/api/public/onboarding/forms/invalid-contact**',
    async (route) => {
      if (route.request().method() === 'GET')
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            code: 0,
            data: {
              candidateName: '赵六',
              companyName: '芯河智枢总公司',
              departmentName: '研发部',
              positionName: '工程师',
              status: 'PENDING',
            },
            message: 'success',
          }),
        });
      submitCalled = true;
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 0,
          data: { status: 'SUBMITTED' },
          message: 'success',
        }),
      });
    },
  );
  await page.goto('/onboarding/invalid-contact');
  await page.getByLabel('性别').click();
  await page.getByText('男', { exact: true }).click();
  await page.getByLabel('出生日期').click();
  await page.locator('.ant-picker-cell-in-view').first().click();
  await page.getByLabel('证件类型').click();
  await page.getByText('身份证', { exact: true }).click();
  await page.getByLabel('证件号码').fill('110101199001010011');
  await page.getByLabel('手机号').fill('123');
  await page.getByLabel('邮箱').fill('zhaoliu@example.com');
  await page.getByLabel('居住地址').fill('广东省深圳市南山区');
  await page.locator('#emergencyContactName').fill('李四');
  await page.locator('#emergencyContactRelation').fill('父亲');
  await page.locator('#emergencyContactPhone').fill('13900139000');
  await page.getByLabel('登录用户名').fill('zhaoliu');
  await page.getByLabel('登录密码').fill('Abc123!');
  await page.getByLabel('确认密码').fill('Abc123!');
  await page.getByRole('button', { name: '确认提交并锁定' }).click();
  await expect(page.getByText('身份证号码校验位不正确')).toBeVisible();
  await expect(page.getByText('请填写11位大陆手机号')).toBeVisible();
  expect(submitCalled).toBeFalsy();
});

test('已过期链接不会展示可填写表单', async ({ page }) => {
  await page.route(
    '**/api/public/onboarding/forms/expired-token',
    async (route) => {
      await route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 409,
          message: '表单已过期，请联系管理员重新生成链接',
        }),
      });
    },
  );
  await page.goto('/onboarding/expired-token');
  await expect(page.locator('.ant-result-subtitle')).toHaveText(
    '表单已过期，请联系管理员重新生成链接',
  );
  await expect(
    page.getByRole('button', { name: '确认提交并锁定' }),
  ).toHaveCount(0);
});

test('已撤销链接会提示联系管理员重新生成', async ({ page }) => {
  await page.route(
    '**/api/public/onboarding/forms/revoked-token',
    async (route) => {
      await route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 409,
          message: '表单已撤销，请联系管理员重新生成链接',
        }),
      });
    },
  );
  await page.goto('/onboarding/revoked-token');
  await expect(page.locator('.ant-result-subtitle')).toHaveText(
    '表单已撤销，请联系管理员重新生成链接',
  );
  await expect(
    page.getByRole('button', { name: '确认提交并锁定' }),
  ).toHaveCount(0);
});

test('接口返回已撤销状态时也不会展示填写表单', async ({ page }) => {
  await page.route(
    '**/api/public/onboarding/forms/revoked-state-token',
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 0,
          message: 'success',
          data: {
            candidateName: '已撤销员工',
            companyName: '芯河智枢总公司',
            departmentName: '研发部',
            positionName: '工程师',
            status: 'REVOKED',
          },
        }),
      });
    },
  );
  await page.goto('/onboarding/revoked-state-token');
  await expect(page.locator('.ant-result-subtitle')).toHaveText(
    '表单已撤销，请联系管理员重新生成链接',
  );
  await expect(
    page.getByRole('button', { name: '确认提交并锁定' }),
  ).toHaveCount(0);
});

test('有效链接展示截止时间和剩余时间', async ({ page }) => {
  await page.route(
    '**/api/public/onboarding/forms/active-token',
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 0,
          message: 'success',
          data: {
            candidateName: '测试员工',
            companyName: '芯河智枢总公司',
            departmentName: '研发部',
            positionName: '工程师',
            expiresAt: '2099-12-31T23:59:59',
            status: 'PENDING',
          },
        }),
      });
    },
  );
  await page.goto('/onboarding/active-token');
  await expect(
    page.getByText('请在 2099-12-31 23:59 前完成提交'),
  ).toBeVisible();
  await expect(page.getByText(/还剩/)).toBeVisible();
});

test('未登录访问生成的入职链接不会跳转登录页', async ({ page }) => {
  let authCalled = false;
  await page.route('**/api/auth/current', async (route) => {
    authCalled = true;
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ code: 401, message: '未登录或登录已过期' }),
    });
  });
  await page.route(
    '**/api/public/onboarding/forms/hash-token',
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 0,
          message: 'success',
          data: {
            candidateName: 'Hash 链接员工',
            companyName: '芯河智枢总公司',
            departmentName: '研发部',
            positionName: '工程师',
            expiresAt: '2099-12-31T23:59:59',
            status: 'PENDING',
          },
        }),
      });
    },
  );
  await page.goto('/onboarding/hash-token');
  await expect(page.getByText('Hash 链接员工')).toBeVisible();
  await expect(page).not.toHaveURL(/\/login/);
  expect(authCalled).toBeFalsy();
});
