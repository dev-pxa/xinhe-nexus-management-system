import { chromium } from '@playwright/test';
import { mkdir, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const root = process.cwd();
const appUrl = process.env.MANUAL_APP_URL || 'http://127.0.0.1:18080';
const outputDir = path.join(root, 'docs/images/dom-v1');
// Unannotated captures are intermediate files. Keep them outside the repository
// so a full manual screenshot run does not recreate unused historical assets.
const rawDir = path.join(tmpdir(), 'xinhe-nexus-manual-dom-source-v1');
const viewport = { width: 1280, height: 800 };

const accounts = {
  admin: [process.env.MANUAL_ADMIN_USER || 'admin', process.env.MANUAL_ADMIN_PASSWORD || 'admin'],
  employee: [process.env.MANUAL_EMPLOYEE_USER || 'crm_xiaoshou', process.env.MANUAL_EMPLOYEE_PASSWORD || 'xinhe123.'],
  leader: [process.env.MANUAL_LEADER_USER || 'crm_owner', process.env.MANUAL_LEADER_PASSWORD || 'xinhe123.'],
};

const exactText = (page, text) => page.getByText(text, { exact: true }).first();
// ProComponents frequently renders page/card/modal titles as div/span rather than headings.
// Exact visible text is therefore a more stable anchor than ARIA heading roles here.
const heading = (page, text) => exactText(page, text);
const button = (page, text) => {
  if (text instanceof RegExp) return page.locator('button').filter({ hasText: text }).first();
  const spaced = new RegExp(`${[...text].map((char) => char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\s*')}`);
  return page.locator('button').filter({ hasText: spaced }).first();
};
const label = (page, text) => page.getByLabel(text, { exact: true }).first();
const placeholder = (page, text) => page.getByPlaceholder(text, { exact: true }).first();
const tableHeader = (page, text) => page.getByRole('columnheader', { name: text, exact: true }).first();

function a(text, locate, tone = 'blue') {
  return { text, locate, tone };
}

const tasks = [
  {
    file: 'system-login.png',
    route: '/login',
    annotations: [
      a('输入用户名', (p) => placeholder(p, '用户名：admin')),
      a('输入密码', (p) => placeholder(p, '密码')),
      a('仅在个人设备启用自动登录', (p) => exactText(p, '自动登录'), 'orange'),
      a('核对后点击登录', (p) => p.locator('button.ant-btn-primary').filter({ hasText: /登\s*录/ }).first()),
    ],
  },
  {
    file: 'system-page-header.png', role: 'admin', route: '/dashboard',
    annotations: [a('页面标题用于确认当前位置', (p) => heading(p, '工作台'))],
  },
  {
    file: 'system-navigation.png', role: 'admin', route: '/dashboard',
    annotations: [
      a('左侧为业务模块导航', (p) => p.locator('.ant-pro-sider').first()),
      a('点击头像或姓名打开个人信息', (p) => p.locator('.ant-pro-sider-actions-avatar').first()),
      a('侧栏底部图标用于退出登录', (p) => p.locator('.ant-pro-sider-actions-list-item').first(), 'orange'),
    ],
  },
  {
    file: 'system-navigation-expanded.png', role: 'admin', route: '/dashboard',
    prepare: async (p) => { const item = exactText(p, 'OA 协同办公'); if (await item.isVisible()) await item.click(); },
    annotations: [
      a('点击一级模块展开功能菜单', (p) => exactText(p, 'OA 协同办公')),
      a('从二级菜单进入具体功能', (p) => exactText(p, '全部考勤')),
      a('当前菜单会以高亮状态显示', (p) => p.locator('.ant-menu-item-selected').first(), 'orange'),
    ],
  },
  {
    file: 'system-personal-profile.png', role: 'admin', route: '/dashboard',
    prepare: async (p) => { await p.locator('.ant-pro-sider-actions-avatar').click(); await heading(p, '个人信息').waitFor(); },
    annotations: [
      a('用户名仅用于识别账号', (p) => label(p, '用户名'), 'orange'),
      a('姓名、手机号和邮箱可维护', (p) => label(p, '姓名')),
      a('保存前检查修改内容', (p) => button(p, '保存')),
    ],
  },
  {
    file: 'system-password-dialog.png', role: 'admin', route: '/dashboard',
    prepare: async (p) => { await p.locator('.ant-pro-sider-actions-avatar').click(); await button(p, '更改密码').click(); },
    annotations: [
      a('输入当前使用的密码', (p) => label(p, '现有密码')),
      a('输入符合要求的新密码', (p) => label(p, '新密码')),
      a('再次输入新密码', (p) => label(p, '再次输入新密码')),
      a('确认后需要重新登录', (p) => button(p, '确认更改'), 'orange'),
    ],
  },
  {
    file: 'system-password-dialog-full.png', role: 'admin', route: '/dashboard',
    prepare: async (p) => { await p.locator('.ant-pro-sider-actions-avatar').click(); await button(p, '更改密码').click(); },
    annotations: [
      a('依次填写三项密码', (p) => p.locator('.ant-modal-content').filter({ hasText: '更改密码' }).first()),
      a('确认更改后返回登录页', (p) => button(p, '确认更改'), 'orange'),
    ],
  },
  {
    file: 'system-company-platform-only.png', role: 'leader', route: '/system/companies',
    annotations: [
      a('公司管理仅平台管理员可访问', (p) => p.getByText(/无权访问|403/).first(), 'orange'),
      a('无权限时返回有权访问的页面', (p) => button(p, /返回|回到首页/).first()),
    ],
  },
  {
    file: 'system-organization.png', role: 'admin', route: '/system/organization',
    annotations: [
      a('先从组织树选择组织', (p) => p.locator('.ant-tree').first()),
      a('从这里新建组织', (p) => button(p, '新建')),
      a('右侧维护所选组织的岗位', (p) => exactText(p, '岗位列表')),
      a('从这里新建岗位', (p) => button(p, '新建岗位')),
    ],
  },
  {
    file: 'system-organization-new-modal.png', role: 'admin', route: '/system/organization',
    prepare: async (p) => { await button(p, '新建').click(); },
    annotations: [
      a('填写组织名称', (p) => label(p, '组织名称')),
      a('确认上级组织', (p) => label(p, '上级组织')),
      a('设置启用状态', (p) => label(p, '状态')),
      a('核对后保存', (p) => button(p, '确定')),
    ],
  },
  {
    file: 'system-position-new-modal.png', role: 'admin', route: '/system/organization',
    prepare: async (p) => { await button(p, '新建岗位').click(); },
    annotations: [
      a('填写岗位名称', (p) => label(p, '岗位名称')),
      a('确认所属组织', (p) => label(p, '所属组织')),
      a('填写岗位职责', (p) => label(p, '岗位职责')),
      a('核对后保存', (p) => button(p, '确定')),
    ],
  },
  {
    file: 'manual-position-permissions.png', role: 'admin', route: '/system/permissions',
    annotations: [
      a('选择需要配置的岗位', (p) => p.locator('.ant-list-item').first()),
      a('按名称搜索权限', (p) => placeholder(p, '搜索权限名称')),
      a('在权限分组中勾选功能', (p) => p.locator('.ant-checkbox-wrapper').first()),
      a('保存后再验证菜单和按钮', (p) => button(p, '保存权限'), 'orange'),
    ],
  },
  {
    file: 'system-permissions.png', role: 'admin', route: '/system/permissions',
    annotations: [
      a('切换岗位或用户权限配置', (p) => exactText(p, '岗位权限配置')),
      a('左侧选择配置对象', (p) => exactText(p, '岗位列表')),
      a('右侧配置并保存权限', (p) => button(p, '保存权限')),
    ],
  },
  {
    file: 'oa-expense-final-approval-permission.png', role: 'admin', route: '/system/permissions',
    annotations: [
      a('系统说明初审和终审规则', (p) => p.locator('.ant-alert').first()),
      a('选择需要授权的岗位', (p) => p.locator('.ant-list-item').first()),
      a('保存授权结果', (p) => button(p, '保存权限')),
    ],
  },
  {
    file: 'oa-expense-final-approval-search.png', role: 'admin', route: '/system/permissions',
    prepare: async (p) => { await placeholder(p, '搜索权限名称').fill('报销'); },
    annotations: [
      a('输入“报销”筛选权限', (p) => placeholder(p, '搜索权限名称')),
      a('勾选“报销最终审批”', (p) => exactText(p, '报销最终审批')),
      a('保存岗位权限', (p) => button(p, '保存权限')),
    ],
  },
  {
    file: 'manual-user-permissions.png', role: 'admin', route: '/system/permissions',
    prepare: async (p) => { await exactText(p, '用户权限配置').click(); await p.waitForTimeout(500); },
    annotations: [
      a('切换到用户权限配置', (p) => exactText(p, '用户权限配置')),
      a('选择需要配置的用户', (p) => p.locator('.ant-list-item').first()),
      a('岗位权限默认继承且不可删除', (p) => p.locator('.ant-alert').first(), 'orange'),
      a('保存用户额外权限', (p) => button(p, '保存权限')),
    ],
  },
  {
    file: 'manual-system-users.png', role: 'admin', route: '/system/users',
    annotations: [
      a('先确认进入用户管理页面', (p) => heading(p, '用户管理')),
      a('从这里新建用户', (p) => button(p, '新建用户')),
      a('操作列维护账号和岗位', (p) => tableHeader(p, '操作')),
    ],
  },
  {
    file: 'system-user-new-modal.png', role: 'admin', route: '/system/users',
    prepare: async (p) => { await button(p, '新建用户').click(); },
    annotations: [
      a('填写用户名', (p) => label(p, '用户名')),
      a('填写用户姓名', (p) => label(p, '用户姓名')),
      a('为用户分配岗位', (p) => label(p, '岗位')),
      a('核对状态后创建', (p) => button(p, '确定')),
    ],
  },
  {
    file: 'system-employees.png', role: 'admin', route: '/system/employees',
    annotations: [
      a('按状态筛选入职记录', (p) => p.locator('.ant-pro-table-list-toolbar .ant-select').first()),
      a('从这里新建入职人员', (p) => button(p, '新建入职人员')),
      a('在操作列复制链接或查看档案', (p) => tableHeader(p, '操作')),
    ],
  },
  {
    file: 'system-employee-new-modal.png', role: 'admin', route: '/system/employees',
    prepare: async (p) => { await button(p, '新建入职人员').click(); },
    annotations: [
      a('填写人员姓名', (p) => label(p, '姓名')),
      a('选择部门和岗位', (p) => label(p, '部门')),
      a('设置链接有效期', (p) => label(p, '链接有效期（天）')),
      a('生成一次性入职表单', (p) => button(p, '生成表单')),
    ],
  },
  {
    file: 'system-oa-attendance.png', role: 'employee', route: '/oa/attendance',
    annotations: [
      a('立即打卡', (p) => button(p, '立即打卡')),
      a('异常时申请补打卡', (p) => button(p, '申请补打卡')),
      a('列表展示每日打卡记录', (p) => tableHeader(p, '日期')),
    ],
  },
  {
    file: 'oa-employee-attendance.png', role: 'employee', route: '/oa/attendance',
    annotations: [
      a('点击立即打卡记录当前位置', (p) => button(p, '立即打卡')),
      a('漏打卡时发起补打卡', (p) => button(p, '申请补打卡')),
      a('点击查看进入当日详情', (p) => tableHeader(p, '操作')),
    ],
  },
  {
    file: 'oa-employee-correction-modal.png', role: 'employee', route: '/oa/attendance',
    prepare: async (p) => { await button(p, '申请补打卡').click(); },
    annotations: [
      a('选择需要补录的时间', (p) => label(p, '补打卡时间')),
      a('输入地址并完成定位', (p) => placeholder(p, '输入地址，例如：杭州市西湖区')),
      a('填写申请原因', (p) => label(p, '申请原因')),
      a('确认信息后提交', (p) => button(p, '确定')),
    ],
  },
  {
    file: 'oa-correction-progress.png', role: 'employee', route: '/oa/approval/correction-requests',
    annotations: [
      a('查看补打卡日期和时间', (p) => tableHeader(p, '补打卡日期')),
      a('状态显示当前审批进度', (p) => tableHeader(p, '状态')),
      a('驳回后可重新申请', (p) => tableHeader(p, '操作'), 'orange'),
    ],
  },
  {
    file: 'oa-leader-correction-review.png', role: 'leader', route: '/oa/approval/correction-review',
    annotations: [
      a('核对员工与申请时间', (p) => tableHeader(p, '员工')),
      a('查看申请原因和位置', (p) => tableHeader(p, '申请原因')),
      a('在操作列通过或驳回', (p) => tableHeader(p, '操作')),
    ],
  },
  {
    file: 'oa-leader-all-attendance.png', role: 'leader', route: '/oa/all-attendance',
    annotations: [
      a('按人员筛选记录', (p) => p.locator('.ant-select-selector').first()),
      a('按姓名或用户名搜索', (p) => placeholder(p, '姓名或用户名')),
      a('点击查看进入当日详情', (p) => tableHeader(p, '操作')),
    ],
  },
  {
    file: 'oa-attendance-rules-company.png', role: 'admin', route: '/oa/attendance-rules?year=2026&tab=company',
    setup: async (p) => {
      await p.route('**/api/oa/attendance/rules/2026', (route) => route.fulfill({ json: { code: 0, data: {
        year: 2026, status: 'DRAFT', companyConfigured: true, draftRevision: 2, version: 3,
        companyHolidayDates: ['2026-11-15', '2026-12-05', '2026-12-06'], conflicts: [], requiredPersonalHolidayCount: 5,
      } } }));
      await p.route('**/api/oa/attendance/rules/2026/users', (route) => route.fulfill({ json: { code: 0, data: [
        { id: 2, name: '演示员工', username: 'demo_user', holidayCount: 2, conflictCount: 1, requiredPersonalHolidayCount: 5 },
      ] } }));
    },
    annotations: [
      a('选择需要配置的年度', (p) => p.locator('.ant-picker').first()),
      a('先配置全公司放假', (p) => exactText(p, '1. 公司放假')),
      a('使用下拉框快速切换月份', (p) => label(p, '快速切换月份')),
      a('核对后保存公司放假', (p) => button(p, '保存公司放假')),
    ],
  },
  {
    file: 'oa-attendance-rules-personal.png', role: 'admin', route: '/oa/attendance-rules?year=2026&tab=personal&userId=2',
    setup: async (p) => {
      const companyDates = ['2026-11-15', '2026-12-05', '2026-12-06'];
      await p.route('**/api/oa/attendance/rules/2026/users/2', (route) => route.fulfill({ json: { code: 0, data: {
        year: 2026, userId: 2, companyConfigured: true, version: 3, companyHolidayDates: companyDates,
        personalHolidayDates: ['2026-12-05', '2026-12-12'], conflictDates: ['2026-12-05'], requiredPersonalHolidayCount: 5,
      } } }));
      await p.route('**/api/oa/attendance/rules/2026', (route) => route.fulfill({ json: { code: 0, data: {
        year: 2026, status: 'DRAFT', companyConfigured: true, draftRevision: 2, version: 3,
        companyHolidayDates: companyDates, conflicts: [{ userId: 2, userName: '演示员工', dates: ['2026-12-05'] }], requiredPersonalHolidayCount: 5,
      } } }));
      await p.route('**/api/oa/attendance/rules/2026/users', (route) => route.fulfill({ json: { code: 0, data: [
        { id: 2, name: '演示员工', username: 'demo_user', holidayCount: 2, conflictCount: 1, requiredPersonalHolidayCount: 5 },
      ] } }));
    },
    prepare: async (p) => {
      await p.waitForTimeout(500);
      await label(p, '快速切换月份').click();
      const holder = p.locator('.rc-virtual-list-holder');
      await holder.evaluate((element) => { element.scrollTop = element.scrollHeight; });
      await p.locator('.ant-select-item-option[title="12月"]').click();
      await p.waitForTimeout(300);
    },
    annotations: [
      a('选择需要配置的员工', (p) => label(p, '选择员工')),
      a('核对未来已选和剩余应选', (p) => p.locator('.ant-tag').filter({ hasText: '未来已选' }).first(), 'orange'),
      a('按星期批量添加或取消', (p) => button(p, '批量添加')),
      a('红色日期为公司假与个人假冲突', (p) => p.locator('[data-date="2026-12-05"]'), 'orange'),
    ],
  },
  {
    file: 'oa-admin-attendance-entry.png', role: 'admin', route: '/oa/all-attendance',
    prepare: async (p) => { const company = placeholder(p, '选择公司'); if (await company.isVisible()) { await company.click(); await p.locator('.ant-select-item-option').first().click(); } await button(p, '录入打卡').click(); },
    annotations: [
      a('选择需要补录的人员', (p) => label(p, '人员')),
      a('选择实际打卡时间', (p) => label(p, '打卡时间')),
      a('输入地址并定位', (p) => placeholder(p, '输入地址，例如：杭州市西湖区')),
      a('核对后确认录入', (p) => button(p, '确定')),
    ],
  },
  {
    file: 'oa-expense-my-list-new.png', role: 'employee', route: '/oa/expense',
    annotations: [
      a('从这里新增报销', (p) => button(p, '新增报销')),
      a('列表显示报销单号和金额', (p) => tableHeader(p, '报销单号')),
      a('状态用于判断当前环节', (p) => tableHeader(p, '状态')),
      a('操作列查看、编辑或撤回', (p) => tableHeader(p, '操作')),
    ],
  },
  {
    file: 'oa-employee-expense-edit.png', role: 'employee', route: '/oa/expense',
    prepare: async (p) => { await button(p, '编辑').click(); await p.waitForTimeout(1800); },
    annotations: [
      a('先阅读报销使用说明', (p) => button(p, '使用说明')),
      a('添加一条费用明细', (p) => button(p, '新增条目')),
      a('暂存后可继续编辑', (p) => button(p, '暂存')),
      a('核对无误后提交', (p) => button(p, '提交')),
    ],
  },
  {
    file: 'oa-employee-expense-item.png', role: 'employee', route: '/oa/expense',
    prepare: async (p) => { await button(p, '编辑').click(); await p.waitForTimeout(1800); await button(p, '新增条目').click(); },
    annotations: [
      a('选择报销类型', (p) => exactText(p, '报销类型').last()),
      a('填写费用发生地点', (p) => placeholder(p, '请输入费用发生地点')),
      a('填写报销金额', (p) => placeholder(p, '请输入金额')),
      a('上传对应发票或附件', (p) => button(p, '上传发票')),
    ],
  },
  {
    file: 'oa-expense-pdf-preview.png', role: 'employee', route: '/oa/expense',
    prepare: async (p) => { await button(p, '编辑').click(); await p.waitForTimeout(1800); await button(p, '新增条目').click(); },
    annotations: [
      a('PDF/JPG/PNG 发票从这里上传', (p) => button(p, '上传发票')),
      a('其他证明材料从这里上传', (p) => button(p, '上传其他附件')),
      a('上传后可点击附件名称预览', (p) => exactText(p, '限 PDF/JPG/PNG').first()),
      a('附件应与本条费用明细对应', (p) => heading(p, '费用明细'), 'orange'),
    ],
  },
  {
    file: 'oa-expense-employee-detail-new.png', role: 'employee', route: '/oa/expense',
    prepare: async (p) => { await button(p, '查看').click(); await p.waitForTimeout(1800); },
    annotations: [
      a('从页面标题识别报销单号', (p) => p.getByText(/^报销单 BX-/).first()),
      a('同时核对状态和总金额', (p) => p.locator('.ant-card').filter({ hasText: '总金额' }).first()),
      a('查看费用明细和附件', (p) => heading(p, '费用明细')),
      a('审批节点展示实际流转结果', (p) => p.getByText(/^审核流转/).first()),
    ],
  },
  {
    file: 'oa-expense-review-list.png', role: 'leader', route: '/oa/approval/expense-review',
    annotations: [
      a('核对申请人与报销单号', (p) => tableHeader(p, '报销单号')),
      a('检查金额和提交时间', (p) => tableHeader(p, '提交时间')),
      a('点击审核进入详情', (p) => tableHeader(p, '操作')),
    ],
  },
  {
    file: 'oa-personal-profile.png', role: 'employee', route: '/oa/profile',
    annotations: [
      a('姓名、手机号和邮箱可直接修改', (p) => heading(p, '基础信息')),
      a('点击此处保存基础信息', (p) => button(p, '保存基础信息')),
      a('其他字段通过变更申请修改', (p) => heading(p, '申请修改档案')),
    ],
  },
  {
    file: 'oa-profile-change-form.png', role: 'employee', route: '/oa/profile', scrollTo: '新增教育经历',
    annotations: [
      a('教育经历可按需新增', (p) => button(p, '新增教育经历')),
      a('核对后提交审批', (p) => button(p, '提交审批')),
      a('下方可查看本人申请记录', (p) => heading(p, '我的变更申请')),
    ],
  },
  {
    file: 'system-crm-customers.png', role: 'employee', route: '/crm/customers',
    annotations: [
      a('按条件筛选客户', (p) => p.locator('.ant-pro-table-search').first()),
      a('从这里新建客户', (p) => button(p, /新建客户|新增客户/).first()),
      a('在操作列查看和跟进', (p) => tableHeader(p, '操作')),
    ],
  },
  {
    file: 'crm-customers-list.png', role: 'employee', route: '/crm/customers',
    annotations: [
      a('按名称、电话或分类筛选客户', (p) => p.locator('.ant-pro-table-search').first()),
      a('点击新增客户建立档案', (p) => button(p, '新增客户')),
      a('点击客户名称查看完整档案', (p) => p.locator('tbody a').first()),
      a('从操作列编辑、跟进或收藏', (p) => tableHeader(p, '操作')),
    ],
  },
  {
    file: 'crm-customer-new.png', role: 'employee', route: '/crm/customers/new',
    annotations: [
      a('填写客户名称和联系电话', (p) => label(p, '客户名称')),
      a('详细地址为必填项', (p) => label(p, '详细地址')),
      a('选择客户来源渠道', (p) => label(p, '来源渠道')),
      a('选择对应的客户分类', (p) => label(p, '客户分类')),
      a('核对后保存客户档案', (p) => button(p, '保存')),
    ],
  },
  {
    file: 'crm-customer-detail.png', role: 'employee', route: '/crm/customers',
    prepare: async (p) => { await exactText(p, '查看详情').click(); await heading(p, '客户详情').waitFor(); },
    annotations: [
      a('核对客户编号、名称和联系方式', (p) => p.locator('.ant-descriptions').first()),
      a('进入跟踪记录补充沟通过程', (p) => button(p, '跟踪记录')),
      a('点击编辑客户维护基本资料', (p) => button(p, '编辑客户')),
    ],
  },
  {
    file: 'crm-customer-followups.png', role: 'employee', route: '/crm/customers',
    prepare: async (p) => { await exactText(p, '跟踪记录').click(); await heading(p, '客户跟踪记录').waitFor(); },
    annotations: [
      a('选择本次跟进方式', (p) => label(p, '跟进方式')),
      a('记录沟通内容和客户反馈', (p) => label(p, '沟通内容')),
      a('补充客户的真实反馈', (p) => label(p, '客户反馈')),
      a('需要时记录报价或预算', (p) => label(p, '报价或预算')),
    ],
  },
  {
    file: 'crm-customer-followup-next.png', role: 'employee', route: '/crm/customers',
    prepare: async (p) => {
      await exactText(p, '跟踪记录').click();
      await heading(p, '客户跟踪记录').waitFor();
      await button(p, '保存跟踪记录').scrollIntoViewIfNeeded();
      await p.evaluate(() => window.scrollBy(0, 80));
    },
    annotations: [
      a('填写下一步跟进动作', (p) => label(p, '下一步跟进动作')),
      a('设置下一次跟进时间', (p) => label(p, '下一步跟进时间')),
      a('按格式和大小要求选择附件', (p) => p.locator('.ant-form-item').filter({ hasText: '附件（PDF/JPG/PNG' }).first()),
      a('保存后记录按时间倒序展示', (p) => button(p, '保存跟踪记录')),
    ],
  },
  {
    file: 'crm-daily-plans.png', role: 'employee', route: '/crm/daily-plans',
    annotations: [
      a('按月份查看每日计划', (p) => p.locator('.ant-picker').first()),
      a('按归属筛选可查看的计划', (p) => p.locator('.ant-select-selector').first()),
      a('点击新增今日计划', (p) => button(p, '新增今日计划')),
      a('在操作列查看、编辑或删除', (p) => tableHeader(p, '操作')),
    ],
  },
  {
    file: 'crm-daily-plan-new.png', role: 'employee', route: '/crm/daily-plans/new',
    annotations: [
      a('日期和归属由系统自动确定', (p) => p.locator('.ant-card').first(), 'orange'),
      a('填写具体计划内容', (p) => placeholder(p, '请填写具体计划内容')),
      a('只可选择有计划权限的协作人', (p) => exactText(p, '选择有计划管理权限的协作人（选填）')),
      a('保存计划后返回列表', (p) => button(p, '保存计划')),
    ],
  },
  {
    file: 'crm-weekly-plans.png', role: 'employee', route: '/crm/weekly-plans',
    annotations: [
      a('按月份查看每周计划', (p) => p.locator('.ant-picker').first()),
      a('计划周期固定为周一至周日', (p) => exactText(p, '按周制定和回顾工作计划；每周周期为周一至周日。'), 'orange'),
      a('点击新增本周计划', (p) => button(p, '新增本周计划')),
      a('在操作列查看、编辑或删除', (p) => tableHeader(p, '操作')),
    ],
  },
  {
    file: 'crm-weekly-plan-new.png', role: 'employee', route: '/crm/weekly-plans/new',
    annotations: [
      a('系统自动显示本周周期和归属', (p) => p.locator('.ant-card').first(), 'orange'),
      a('填写本周具体计划内容', (p) => placeholder(p, '请填写本周计划内容')),
      a('只可选择有计划权限的协作人', (p) => exactText(p, '选择有计划管理权限的协作人（选填）')),
      a('核对后保存本周计划', (p) => button(p, '保存计划')),
    ],
  },
  {
    file: 'manual-erp-products.png', role: 'admin', route: '/erp/basic-info/products',
    annotations: [
      a('按编码、名称或状态筛选商品', (p) => p.locator('.ant-pro-table-search').first()),
      a('从这里新建商品资料', (p) => button(p, /新增商品|新建商品/).first()),
      a('在操作列维护商品', (p) => tableHeader(p, '操作')),
    ],
  },
];

async function login(context, role) {
  if (!role) return;
  const [username, password] = accounts[role];
  const response = await context.request.post(`${appUrl}/api/auth/login`, {
    data: { username, password, autoLogin: false },
  });
  if (!response.ok()) throw new Error(`Login failed for ${role}: ${response.status()}`);
}

async function markElement(locator, annotation, index) {
  if (await locator.count() === 0) throw new Error(`找不到标注元素：${annotation.text}`);
  await locator.waitFor({ state: 'visible', timeout: 8000 });
  const box = await locator.boundingBox();
  if (!box || box.width < 2 || box.height < 2) throw new Error(`标注元素没有可见区域：${annotation.text}`);
  if (box.x < 0 || box.y < 0 || box.x + box.width > viewport.width || box.y + box.height > viewport.height) {
    throw new Error(`标注元素不在当前截图可见范围：${annotation.text}`);
  }
  await locator.evaluate((element, data) => {
    const color = data.tone === 'orange' ? '#F97316' : '#1677FF';
    element.style.outline = `3px solid ${color}`;
    element.style.outlineOffset = '3px';
    element.style.borderRadius = element.style.borderRadius || '4px';
    const rect = element.getBoundingClientRect();
    const badge = document.createElement('div');
    badge.className = 'manual-dom-badge';
    badge.textContent = String(data.index);
    Object.assign(badge.style, {
      position: 'fixed', zIndex: '2147483647',
      left: `${Math.min(window.innerWidth - 32, Math.max(4, rect.left + 4))}px`,
      top: `${Math.min(window.innerHeight - 32, Math.max(4, rect.top + 4))}px`,
      width: '28px', height: '28px', borderRadius: '50%',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', background: color, border: '2px solid #fff',
      boxShadow: '0 1px 6px rgba(0,0,0,.35)',
      font: '700 16px/1 Arial, sans-serif', pointerEvents: 'none',
    });
    document.body.appendChild(badge);
  }, { index, tone: annotation.tone });
}

async function compose(browser, rawPath, outputPath, annotations) {
  const data = (await readFile(rawPath)).toString('base64');
  const rail = 360;
  const page = await browser.newPage({ viewport: { width: viewport.width + rail, height: viewport.height } });
  const items = annotations.map((item, i) => `<li class="${item.tone === 'orange' ? 'warn' : ''}"><span>${i + 1}</span><p>${item.text}</p></li>`).join('');
  await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>
    *{box-sizing:border-box}html,body{margin:0;width:${viewport.width + rail}px;height:${viewport.height}px;overflow:hidden;font-family:"PingFang SC","Microsoft YaHei",sans-serif;background:#f8fafc}
    .canvas{display:flex;width:100%;height:100%}.shot{width:${viewport.width}px;height:${viewport.height}px;object-fit:cover;object-position:left top;flex:none}.rail{width:${rail}px;padding:22px 20px;background:#f8fafc;border-left:2px solid #dbe4ef}
    h2{font-size:18px;margin:0 0 18px;color:#172033}ol{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:14px}li{display:flex;gap:12px;align-items:flex-start;padding:12px;border:2px solid #1677ff;border-radius:10px;background:#fff}li.warn{border-color:#f97316}li span{flex:none;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:#1677ff;color:#fff;font-weight:700}li.warn span{background:#f97316}li p{margin:2px 0 0;font-size:16px;line-height:1.45;color:#1f2937;overflow-wrap:anywhere}
  </style></head><body><div class="canvas"><img class="shot" src="data:image/png;base64,${data}"><aside class="rail"><h2>图中操作说明</h2><ol>${items}</ol></aside></div></body></html>`);
  await page.screenshot({ path: outputPath });
  await page.close();
}

async function captureTask(browser, task) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  await login(context, task.role);
  const page = await context.newPage();
  if (task.setup) await task.setup(page);
  await page.goto(`${appUrl}${task.route}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  if (task.prepare) await task.prepare(page);
  await page.waitForTimeout(350);
  if (task.scrollTo) {
    await heading(page, task.scrollTo).scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollBy(0, -70));
  }
  for (let i = 0; i < task.annotations.length; i += 1) {
    const annotation = task.annotations[i];
    await markElement(annotation.locate(page), annotation, i + 1);
  }
  const rawPath = path.join(rawDir, task.file);
  await page.screenshot({ path: rawPath, animations: 'disabled' });
  await compose(browser, rawPath, path.join(outputDir, task.file), task.annotations);
  await context.close();
  console.log(`captured ${task.file}`);
}

async function main() {
  await mkdir(outputDir, { recursive: true });
  await mkdir(rawDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const selected = process.env.MANUAL_SCREENSHOT_FILE
    ? tasks.filter((task) => task.file === process.env.MANUAL_SCREENSHOT_FILE)
    : tasks;
  if (!selected.length) throw new Error('MANUAL_SCREENSHOT_FILE 未匹配任何任务');
  const failures = [];
  for (const task of selected) {
    try { await captureTask(browser, task); }
    catch (error) { failures.push(`${task.file}: ${error.message}`); console.error(`FAILED ${task.file}:`, error.message); }
  }
  await browser.close();
  if (failures.length) throw new Error(`截图生成失败 ${failures.length} 项：\n${failures.join('\n')}`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
