import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const appUrl = process.env.MANUAL_APP_URL || 'http://127.0.0.1:18080';
const outputDir = path.join(process.cwd(), 'docs/images/mobile-v1');
const viewport = { width: 390, height: 844 };

async function login(context) {
  const response = await context.request.post(`${appUrl}/api/auth/login`, {
    data: {
      username: process.env.MANUAL_ADMIN_USER || 'admin',
      password: process.env.MANUAL_ADMIN_PASSWORD || 'admin',
      autoLogin: false,
    },
  });
  if (!response.ok()) throw new Error(`Login failed: ${response.status()}`);
}

async function mark(locator, index, color = '#1677ff') {
  await locator.waitFor({ state: 'visible' });
  await locator.evaluate((element, data) => {
    element.style.outline = `3px solid ${data.color}`;
    element.style.outlineOffset = '2px';
    const rect = element.getBoundingClientRect();
    const badge = document.createElement('div');
    badge.textContent = String(data.index);
    Object.assign(badge.style, {
      position: 'fixed', zIndex: '2147483647',
      left: `${Math.min(window.innerWidth - 30, Math.max(2, rect.left + 3))}px`,
      top: `${Math.min(window.innerHeight - 30, Math.max(2, rect.top + 3))}px`,
      width: '26px', height: '26px', borderRadius: '50%',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', background: data.color, border: '2px solid #fff',
      font: '700 14px/1 Arial, sans-serif', pointerEvents: 'none',
    });
    document.body.appendChild(badge);
  }, { index, color });
}

async function assertMobile(page, file) {
  const width = await page.locator('html').evaluate((element) => element.scrollWidth);
  if (width > viewport.width) throw new Error(`${file} has horizontal overflow: ${width}px`);
  if (await page.getByText('登录', { exact: true }).isVisible().catch(() => false)) {
    throw new Error(`${file} unexpectedly shows the login page`);
  }
}

async function captureProfile(browser) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  await login(context);
  const page = await context.newPage();
  await page.goto(`${appUrl}/dashboard`, { waitUntil: 'networkidle' });
  await page.getByText('总公司管理员', { exact: true }).click();
  await page.getByText('个人信息', { exact: true }).waitFor();
  await page.waitForTimeout(500);
  await mark(page.getByLabel('用户名', { exact: true }), 1, '#f97316');
  await mark(page.locator('.ant-modal-footer'), 2);
  await assertMobile(page, 'mobile-personal-profile.png');
  await page.screenshot({ path: path.join(outputDir, 'mobile-personal-profile.png'), fullPage: true, animations: 'disabled' });
  await context.close();
}

async function captureAttendanceRules(browser) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  await login(context);
  const page = await context.newPage();
  const companyDates = ['2026-12-05', '2026-12-06'];
  await page.route('**/api/oa/attendance/rules/2026/users/2', (route) => route.fulfill({ json: { code: 0, data: {
    year: 2026, userId: 2, companyConfigured: true, version: 3, companyHolidayDates: companyDates,
    personalHolidayDates: ['2026-12-05', '2026-12-12'], conflictDates: ['2026-12-05'], requiredPersonalHolidayCount: 5,
  } } }));
  await page.route('**/api/oa/attendance/rules/2026', (route) => route.fulfill({ json: { code: 0, data: {
    year: 2026, status: 'DRAFT', companyConfigured: true, draftRevision: 2, version: 3,
    companyHolidayDates: companyDates, conflicts: [{ userId: 2, userName: '演示员工', dates: ['2026-12-05'] }], requiredPersonalHolidayCount: 5,
  } } }));
  await page.route('**/api/oa/attendance/rules/2026/users', (route) => route.fulfill({ json: { code: 0, data: [
    { id: 2, name: '演示员工', username: 'demo_user', holidayCount: 2, conflictCount: 1, requiredPersonalHolidayCount: 5 },
  ] } }));
  await page.goto(`${appUrl}/oa/attendance-rules?year=2026&tab=personal&userId=2`, { waitUntil: 'networkidle' });
  await page.getByText('设置员工个人放假', { exact: true }).waitFor();
  await page.getByLabel('快速切换月份', { exact: true }).first().click();
  const holder = page.locator('.rc-virtual-list-holder');
  await holder.evaluate((element) => { element.scrollTop = element.scrollHeight; });
  await page.locator('.ant-select-item-option[title="12月"]').click();
  await page.waitForTimeout(500);
  await mark(page.getByText('设置员工个人放假', { exact: true }), 1);
  await mark(page.locator('.ant-tag').filter({ hasText: '未来已选' }).first(), 2, '#f97316');
  await mark(page.getByRole('button', { name: '批量添加', exact: true }), 3);
  await assertMobile(page, 'mobile-attendance-rules-personal.png');
  await page.screenshot({ path: path.join(outputDir, 'mobile-attendance-rules-personal.png'), fullPage: true, animations: 'disabled' });
  await context.close();
}

await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  await captureProfile(browser);
  await captureAttendanceRules(browser);
} finally {
  await browser.close();
}
console.log('captured 2 mobile manual screenshots at 390px');
