import { expect, test } from '@playwright/test';

const profile = {
  id: 12,
  userId: 7,
  candidateName: '张三',
  username: 'zhangsan',
  departmentName: '研发部',
  positionName: '工程师',
  phone: '13800138000',
  email: 'zhangsan@example.com',
  gender: 'MALE',
  birthDate: '1990-01-01',
  idType: 'ID_CARD',
  idNumber: '110101199001010015',
  address: '深圳市南山区',
  emergencyContactName: '李四',
  emergencyContactRelation: '父亲',
  emergencyContactPhone: '13900139000',
  status: 'LOCKED',
  educations: [],
};

test.beforeEach(async ({ page }) => {
  await page.goto('/login');
  await page.getByPlaceholder('用户名或手机号').fill('admin');
  await page.getByPlaceholder('密码').fill('admin');
  await page.getByRole('button', { name: '登 录' }).click();
  await expect(page).toHaveURL(/\/dashboard/);
});

test('OA个人档案允许姓名、手机号和邮箱直接同步更新', async ({ page }) => {
  let basicBody: Record<string, unknown> = {};
  let tenantHeader = '';
  await page.route('**/api/hr/profiles/me', (route) => { tenantHeader = route.request().headers()['x-tenant-id'] || ''; return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ code: 0, message: 'success', data: profile }) }); });
  await page.route('**/api/hr/profiles/me/change-requests', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ code: 0, message: 'success', data: [] }) }));
  await page.route('**/api/hr/profiles/me/basic', async (route) => { basicBody = JSON.parse(route.request().postData() || '{}'); await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ code: 0, message: 'success', data: { ...profile, candidateName: basicBody.displayName, phone: basicBody.phone, email: basicBody.email } }) }); });
  await page.goto('/oa/profile');
  await expect(page.getByText('个人档案', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('110101199001010015', { exact: true })).toBeVisible();
  await expect(page.getByText('部门和岗位由组织架构统一维护，个人档案不可修改。')).toBeVisible();
  await page.getByLabel('姓名').first().fill('张三丰');
  await page.getByLabel('手机号').first().fill('13900139000');
  await page.getByLabel('邮箱').first().fill('new@example.com');
  await page.getByRole('button', { name: '保存基础信息' }).click();
  await expect(page.getByText('姓名、手机号和邮箱已同步更新')).toBeVisible();
  expect(basicBody).toEqual({ displayName: '张三丰', phone: '13900139000', email: 'new@example.com' });
  expect(tenantHeader).toBe('1');
});

test('其他档案字段提交审批且审批页面支持驳回', async ({ page }) => {
  let changeBody: Record<string, unknown> = {};
  await page.route('**/api/hr/profiles/me', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ code: 0, message: 'success', data: profile }) }));
  await page.route('**/api/hr/profiles/me/change-requests', async (route) => { if (route.request().method() === 'POST') { changeBody = JSON.parse(route.request().postData() || '{}'); return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ code: 0, message: 'success', data: { id: 19, status: 'PENDING' } }) }); } return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ code: 0, message: 'success', data: [] }) }); });
  await page.goto('/oa/profile');
  await page.getByLabel('居住地址').fill('广州市天河区');
  await page.getByRole('button', { name: '提交审批' }).click();
  await expect(page.getByText('档案变更已提交审批')).toBeVisible();
  expect(changeBody.address).toBe('广州市天河区');
  expect(changeBody).not.toHaveProperty('displayName');
});

test('只修改性别时不提交其他空档案字段', async ({ page }) => {
  let changeBody: Record<string, unknown> = {};
  await page.route('**/api/hr/profiles/me', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ code: 0, message: 'success', data: profile }) }));
  await page.route('**/api/hr/profiles/me/change-requests', async (route) => { if (route.request().method() === 'POST') { changeBody = JSON.parse(route.request().postData() || '{}'); return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ code: 0, message: 'success', data: { id: 20, status: 'PENDING' } }) }); } return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ code: 0, message: 'success', data: [] }) }); });
  await page.goto('/oa/profile');
  await page.getByLabel('性别').click();
  await page.getByText('女', { exact: true }).click();
  await page.getByRole('button', { name: '提交审批' }).click();
  await expect(page.getByText('档案变更已提交审批')).toBeVisible();
  expect(changeBody).toEqual({ gender: 'FEMALE' });
});

test('个人档案支持选择出生日期并提交证件号变更', async ({ page }) => {
  let changeBody: Record<string, unknown> = {};
  await page.route('**/api/hr/profiles/me', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ code: 0, message: 'success', data: profile }) }));
  await page.route('**/api/hr/profiles/me/change-requests', async (route) => { if (route.request().method() === 'POST') { changeBody = JSON.parse(route.request().postData() || '{}'); return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ code: 0, message: 'success', data: { id: 22, status: 'PENDING' } }) }); } return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ code: 0, message: 'success', data: [] }) }); });
  await page.goto('/oa/profile');
  await page.getByPlaceholder('请选择出生日期').click();
  await expect(page.locator('.ant-picker-dropdown')).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByLabel('证件号码').fill('A1234567');
  await page.getByRole('button', { name: '提交审批' }).click();
  await expect(page.getByText('档案变更已提交审批')).toBeVisible();
  expect(changeBody).toEqual({ idNumber: 'A1234567' });
});

test('人员档案审批页可展示申请并通过审批', async ({ page }) => {
  let decisionBody: Record<string, unknown> = {};
  await page.route('**/api/hr/profiles/change-requests/pending', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ code: 0, message: 'success', data: [{ id: 21, applicantName: '张三', status: 'PENDING', beforeData: JSON.stringify({ gender: 'MALE', address: '深圳市南山区', educations: [{ schoolName: '原学校', educationLevel: 'BACHELOR' }] }), afterData: JSON.stringify({ gender: 'MALE', address: '广州市天河区', educations: [] }), createdAt: '2026-11-17 10:00:00' }] }) }));
  await page.route('**/api/hr/profiles/change-requests/21/decide', async (route) => { decisionBody = JSON.parse(route.request().postData() || '{}'); await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ code: 0, message: 'success', data: { id: 21, status: 'APPROVED' } }) }); });
  await page.goto('/oa/approval/profile-change-requests');
  await expect(page.getByText('人员档案审批', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('张三', { exact: true }).first()).toBeVisible();
  await page.getByRole('button', { name: '去审核' }).click();
  await expect(page.getByText('修改前', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('居住地址', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('性别', { exact: true })).not.toBeVisible();
  await expect(page.getByText('教育经历', { exact: true })).not.toBeVisible();
  await page.getByTestId('profile-change-approve').click();
  await expect(page.getByText('档案变更已通过')).toBeVisible();
  expect(decisionBody).toEqual({ approve: true, comment: '同意档案变更' });
});
