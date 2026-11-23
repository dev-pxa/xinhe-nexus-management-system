import { chromium } from '@playwright/test';
import { existsSync } from 'node:fs';
import { cp, mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const imageDir = path.join(root, 'docs/images');
const sourceDir = path.join(imageDir, 'source');
const annotatedDir = path.join(imageDir, 'annotated-v2');
const appUrl = process.env.MANUAL_APP_URL || 'http://127.0.0.1:18080';

// Coordinates are deliberately sparse: readers should be guided to the next action,
// rather than having every control on a dense business page highlighted.
const marks = {
  'system-login.png': [
    {
      n: '1',
      label: '输入账号和密码',
      box: [465, 305, 355, 98],
      from: [885, 260],
      to: [815, 322],
    },
    {
      n: '2',
      label: '个人设备再勾选自动登录',
      box: [465, 426, 108, 28],
      from: [900, 412],
      to: [572, 440],
      tone: 'orange',
    },
    {
      n: '3',
      label: '确认后点击登录',
      box: [465, 475, 355, 50],
      from: [900, 505],
      to: [820, 500],
    },
  ],
  'system-navigation-expanded.png': [
    {
      n: '1',
      label: '点击模块展开子菜单',
      box: [20, 130, 215, 43],
      from: [280, 120],
      to: [225, 150],
    },
    {
      n: '2',
      label: '从子菜单进入具体功能',
      box: [30, 175, 190, 155],
      from: [275, 305],
      to: [215, 250],
    },
    {
      n: '3',
      label: '当前所在菜单会高亮',
      box: [25, 235, 200, 35],
      from: [285, 235],
      to: [220, 253],
      tone: 'orange',
    },
  ],
  'system-navigation.png': [
    {
      n: '1',
      label: '业务模块导航',
      box: [16, 55, 220, 520],
      from: [290, 82],
      to: [225, 90],
    },
    {
      n: '2',
      label: '头像或姓名打开个人信息',
      box: [15, 820, 165, 60],
      from: [300, 820],
      to: [175, 850],
    },
    {
      n: '3',
      label: '完成工作后从这里退出',
      box: [182, 820, 50, 60],
      from: [310, 870],
      to: [225, 850],
      tone: 'orange',
    },
  ],
  'system-page-header.png': [
    {
      n: '1',
      label: '先确认当前页面标题',
      box: [0, 0, 240, 90],
      from: [330, 40],
      to: [230, 42],
    },
  ],
  'system-personal-profile.png': [
    {
      n: '1',
      label: '用户名只读，不在此修改',
      box: [470, 285, 340, 44],
      from: [875, 275],
      to: [810, 306],
      tone: 'orange',
    },
    {
      n: '2',
      label: '姓名、手机号和邮箱可维护',
      box: [470, 337, 340, 145],
      from: [890, 415],
      to: [810, 410],
    },
    {
      n: '3',
      label: '保存前核对填写内容',
      box: [705, 595, 105, 45],
      from: [900, 590],
      to: [810, 617],
    },
  ],
  'system-user-actions.png': [
    {
      n: '1',
      label: '个人信息',
      box: [0, 0, 190, 80],
      from: [245, 20],
      to: [185, 40],
    },
    {
      n: '2',
      label: '退出登录',
      box: [190, 0, 70, 80],
      from: [250, 72],
      to: [230, 43],
      tone: 'orange',
    },
  ],
  'system-password-dialog.png': [
    {
      n: '1',
      label: '依次填写现有密码与新密码',
      box: [105, 122, 310, 150],
      from: [470, 120],
      to: [415, 170],
    },
    {
      n: '2',
      label: '确认后需用新密码重新登录',
      box: [305, 335, 108, 45],
      from: [480, 340],
      to: [413, 358],
      tone: 'orange',
    },
  ],
  'system-password-dialog-full.png': [
    {
      n: '1',
      label: '依次填写三项密码',
      box: [475, 265, 330, 158],
      from: [875, 255],
      to: [805, 320],
    },
    {
      n: '2',
      label: '确认更改后会返回登录页',
      box: [694, 486, 110, 45],
      from: [885, 492],
      to: [804, 508],
      tone: 'orange',
    },
  ],
  'system-company-platform-only.png': [
    {
      n: '1',
      label: '公司管理仅平台管理员可使用',
      box: [245, 120, 730, 65],
      from: [1075, 120],
      to: [970, 150],
      tone: 'orange',
    },
    {
      n: '2',
      label: '无权限时显示 403 页面',
      box: [250, 260, 700, 310],
      from: [1050, 280],
      to: [640, 455],
    },
  ],
  'system-organization.png': [
    {
      n: '1',
      label: '先在左侧选择组织',
      box: [296, 154, 310, 161],
      from: [625, 190],
      to: [606, 245],
    },
    {
      n: '2',
      label: '再在右侧维护该组织的岗位',
      box: [623, 154, 777, 383],
      from: [1315, 210],
      to: [1255, 280],
    },
    {
      n: '3',
      label: '新增前确认所属层级',
      box: [411, 168, 65, 26],
      from: [990, 125],
      to: [476, 181],
      tone: 'orange',
    },
  ],
  'system-organization-new-modal.png': [
    {
      n: '1',
      label: '核对上级组织和名称',
      box: [70, 108, 380, 170],
      from: [500, 120],
      to: [450, 160],
    },
    {
      n: '2',
      label: '填写完成后保存',
      box: [326, 535, 120, 42],
      from: [490, 540],
      to: [445, 556],
    },
  ],
  'manual-position-permissions.png': [
    {
      n: '1',
      label: '先选择要配置的岗位',
      box: [296, 315, 260, 948],
      from: [530, 310],
      to: [410, 403],
    },
    {
      n: '2',
      label: '勾选岗位默认权限',
      box: [577, 315, 502, 1450],
      from: [1030, 310],
      to: [622, 425],
    },
    {
      n: '3',
      label: '保存后再验证菜单和按钮',
      box: [1265, 328, 110, 32],
      from: [1300, 270],
      to: [1375, 344],
      tone: 'orange',
    },
  ],
  'system-permissions.png': [
    {
      n: '1',
      label: '先在左侧选择岗位',
      box: [200, 350, 850, 1260],
      from: [1110, 350],
      to: [405, 380],
    },
    {
      n: '2',
      label: '在中间勾选需要的权限',
      box: [1040, 350, 220, 1260],
      from: [1240, 320],
      to: [582, 828],
    },
    {
      n: '3',
      label: '右侧核对已选权限',
      to: [1015, 530],
      tone: 'orange',
    },
  ],
  'manual-user-permissions.png': [
    {
      n: '1',
      label: '选择用户后查看其额外权限',
      box: [296, 315, 260, 655],
      from: [530, 300],
      to: [556, 620],
    },
    {
      n: '2',
      label: '仅为例外情况追加权限',
      box: [577, 315, 502, 1450],
      from: [1030, 310],
      to: [1079, 700],
      tone: 'orange',
    },
    {
      n: '3',
      label: '保存后重新登录验证',
      box: [1265, 328, 110, 32],
      from: [1300, 270],
      to: [1375, 344],
    },
  ],
  'system-users.png': [
    {
      n: '1',
      label: '核对账号、岗位和账号状态',
      box: [320, 218, 900, 486],
      from: [1160, 140],
      to: [980, 300],
    },
    {
      n: '2',
      label: '新建用户',
      box: [1009, 170, 110, 32],
      from: [1225, 320],
      to: [1119, 186],
    },
  ],
  'manual-system-users.png': [
    {
      n: '1',
      label: '核对用户、岗位和账号状态',
      box: [320, 217, 1055, 660],
      from: [1190, 145],
      to: [1000, 300],
    },
    {
      n: '2',
      label: '新增、编辑、停用等都在操作区',
      box: [1248, 265, 142, 600],
      from: [1225, 320],
      to: [1390, 300],
    },
  ],
  'system-user-new-modal.png': [
    {
      n: '1',
      label: '填写账号基础信息',
      box: [65, 100, 390, 340],
      from: [510, 110],
      to: [455, 150],
    },
    {
      n: '2',
      label: '确认公司和岗位归属',
      box: [65, 435, 390, 105],
      from: [510, 460],
      to: [455, 485],
      tone: 'orange',
    },
    {
      n: '3',
      label: '保存后分配权限并验证',
      box: [335, 635, 110, 42],
      from: [505, 640],
      to: [445, 657],
    },
  ],
  'system-employees.png': [
    {
      n: '1',
      label: '查看入职表单处理状态',
      box: [256, 218, 1183, 209],
      from: [1170, 300],
      to: [590, 298],
    },
    {
      n: '2',
      label: '从这里新建入职人员',
      box: [1144, 171, 136, 32],
      from: [1265, 205],
      to: [1280, 187],
    },
  ],
  'system-employee-new-modal.png': [
    {
      n: '1',
      label: '填写姓名、部门和岗位',
      box: [66, 100, 388, 170],
      from: [505, 105],
      to: [454, 155],
    },
    {
      n: '2',
      label: '设置链接有效期',
      box: [66, 275, 388, 60],
      from: [505, 285],
      to: [454, 305],
      tone: 'orange',
    },
    {
      n: '3',
      label: '生成后复制专属链接',
      box: [320, 340, 130, 42],
      from: [505, 345],
      to: [450, 360],
    },
  ],
  'system-oa-attendance.png': [
    {
      n: '1',
      label: '先确认当前月份和打卡记录',
      box: [270, 135, 850, 400],
      from: [1190, 145],
      to: [1120, 185],
    },
    {
      n: '2',
      label: '异常时从这里申请补打卡',
      box: [955, 80, 190, 50],
      from: [1210, 82],
      to: [1145, 105],
      tone: 'orange',
    },
  ],
  'oa-employee-attendance.png': [
    {
      n: '1',
      label: '确认定位后点击立即打卡',
      box: [965, 93, 180, 48],
      from: [1215, 90],
      to: [1145, 117],
    },
    {
      n: '2',
      label: '按日期查看当天明细',
      box: [270, 210, 860, 345],
      from: [1195, 220],
      to: [1130, 250],
    },
    {
      n: '3',
      label: '漏打时申请补打卡',
      box: [965, 150, 180, 48],
      from: [1215, 155],
      to: [1145, 175],
      tone: 'orange',
    },
  ],
  'oa-employee-correction-modal.png': [
    {
      n: '1',
      label: '时间、位置和原因都必填',
      box: [420, 175, 450, 310],
      from: [950, 180],
      to: [870, 230],
    },
    {
      n: '2',
      label: '先完成定位再提交',
      box: [500, 405, 280, 45],
      from: [955, 420],
      to: [780, 428],
      tone: 'orange',
    },
    {
      n: '3',
      label: '确认后进入审批流程',
      box: [750, 535, 100, 40],
      from: [930, 545],
      to: [850, 555],
    },
  ],
  'oa-leader-correction-review.png': [
    {
      n: '1',
      label: '待审批申请显示在此列表',
      box: [270, 240, 850, 300],
      from: [1190, 250],
      to: [1120, 285],
    },
    {
      n: '2',
      label: '当前截图为空状态，无可审批记录',
      box: [940, 345, 170, 120],
      from: [1200, 355],
      to: [1110, 390],
      tone: 'orange',
    },
  ],
  'oa-leader-all-attendance.png': [
    {
      n: '1',
      label: '先按月份和人员筛选',
      box: [270, 140, 840, 95],
      from: [1180, 145],
      to: [1110, 180],
    },
    {
      n: '2',
      label: '负责人仅能查看授权范围',
      box: [270, 285, 840, 300],
      from: [1190, 300],
      to: [1110, 330],
      tone: 'orange',
    },
    {
      n: '3',
      label: '需要时录入管理员补卡',
      box: [975, 85, 165, 50],
      from: [1210, 87],
      to: [1140, 108],
    },
  ],
  'oa-expense-my-list-new.png': [
    {
      n: '1',
      label: '状态决定可编辑、撤回或查看',
      box: [260, 270, 670, 285],
      from: [970, 280],
      to: [930, 315],
    },
    {
      n: '2',
      label: '从这里新建报销单',
      box: [795, 190, 145, 45],
      from: [985, 190],
      to: [940, 212],
    },
  ],
  'oa-employee-expense-edit.png': [
    {
      n: '1',
      label: '先新增费用条目',
      box: [1040, 210, 100, 40],
      from: [1210, 215],
      to: [1140, 230],
    },
    {
      n: '2',
      label: '核对顶部金额汇总',
      box: [280, 115, 870, 70],
      from: [1210, 120],
      to: [1150, 145],
    },
    {
      n: '3',
      label: '提交前查看预计审核流转',
      box: [280, 375, 870, 235],
      from: [1210, 390],
      to: [1150, 420],
      tone: 'orange',
    },
  ],
  'oa-employee-expense-item.png': [
    {
      n: '1',
      label: '逐条填写类型、日期、地点和金额',
      box: [295, 270, 820, 225],
      from: [1200, 280],
      to: [1115, 320],
    },
    {
      n: '2',
      label: '凭证必须上传到对应条目',
      box: [295, 505, 820, 95],
      from: [1200, 510],
      to: [1115, 540],
      tone: 'orange',
    },
  ],
  'oa-expense-pdf-preview.png': [
    {
      n: '1',
      label: '审核前预览附件内容',
      box: [300, 105, 650, 570],
      from: [1010, 115],
      to: [950, 150],
    },
    {
      n: '2',
      label: '关闭后继续核对报销明细',
      box: [890, 75, 50, 45],
      from: [995, 75],
      to: [940, 95],
    },
  ],
  'oa-expense-employee-detail-new.png': [
    {
      n: '1',
      label: '查看费用明细和附件',
      box: [120, 260, 760, 260],
      from: [950, 270],
      to: [880, 310],
    },
    {
      n: '2',
      label: '按节点确认审批进度',
      box: [120, 535, 760, 290],
      from: [950, 545],
      to: [880, 580],
      tone: 'orange',
    },
  ],
  'oa-expense-final-approval-permission.png': [
    {
      n: '1',
      label: '先选择要授权的岗位',
      box: [70, 220, 225, 430],
      from: [350, 225],
      to: [300, 415],
    },
    {
      n: '2',
      label: '先阅读报销审批权限说明',
      box: [330, 250, 560, 255],
      from: [950, 255],
      to: [540, 250],
      tone: 'orange',
    },
  ],
  'oa-expense-final-approval-search.png': [
    {
      n: '1',
      label: '用关键词定位目标权限',
      box: [330, 210, 560, 75],
      from: [950, 210],
      to: [250, 293],
    },
    {
      n: '2',
      label: '勾选报销最终审批',
      box: [330, 300, 560, 190],
      from: [950, 310],
      to: [150, 385],
    },
    {
      n: '3',
      label: '最后保存权限配置',
      to: [920, 226],
      tone: 'orange',
    },
  ],
  'system-crm-customers.png': [
    {
      n: '1',
      label: '先按客户、电话或负责人筛选',
      box: [270, 160, 865, 105],
      from: [1200, 165],
      to: [1135, 200],
    },
    {
      n: '2',
      label: '从这里新增客户',
      box: [965, 302, 90, 40],
      from: [1115, 300],
      to: [1055, 323],
    },
    {
      n: '3',
      label: '查看、编辑、跟进或新增订单',
      box: [935, 425, 200, 220],
      from: [1210, 430],
      to: [1135, 465],
      tone: 'orange',
    },
  ],
};

const captureTargets = [
  {
    file: 'manual-erp-products.png',
    route: '/erp/basic-info/products',
    labels: [
      {
        n: '1',
        label: '按编码、名称或状态筛选商品',
        box: [270, 150, 850, 105],
        from: [1200, 155],
        to: [1120, 185],
      },
      {
        n: '2',
        label: '从这里新建商品资料',
        box: [990, 300, 145, 45],
        from: [1205, 300],
        to: [1135, 322],
      },
      {
        n: '3',
        label: '在操作列维护或停用商品',
        box: [970, 410, 165, 185],
        from: [1205, 420],
        to: [1135, 455],
        tone: 'orange',
      },
    ],
  },
];

function escapeXml(value) {
  return String(value).replace(
    /[<>&"']/g,
    (character) =>
      ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[
        character
      ]),
  );
}

function overlaySvg(width, height, labels) {
  const color = (tone) => (tone === 'orange' ? '#F97316' : '#1677FF');
  const railWidth = 330;
  const canvasWidth = width + railWidth;
  const labelHeight = 44;
  const gap = 14;
  const orderedLabels = labels
    .map((item) => ({ ...item, desiredY: item.to[1] - labelHeight / 2 }))
    .sort((a, b) => a.desiredY - b.desiredY);
  let cursor = 14;
  for (const item of orderedLabels) {
    item.labelY = Math.max(
      cursor,
      Math.min(Math.max(14, item.desiredY), height - labelHeight - 14),
    );
    cursor = item.labelY + labelHeight + gap;
  }
  const lastLabel = orderedLabels.at(-1);
  const overflow = lastLabel
    ? Math.max(0, lastLabel.labelY - (height - labelHeight - 14))
    : 0;
  for (const item of orderedLabels)
    item.labelY = Math.max(14, item.labelY - overflow);
  for (let index = orderedLabels.length - 1; index >= 0; index -= 1) {
    const item = orderedLabels[index];
    const next = orderedLabels[index + 1];
    if (!next) continue;
    item.labelY = Math.min(item.labelY, next.labelY - labelHeight - gap);
  }
  const entries = orderedLabels
    .map(({ n, label, to, tone, labelY }) => {
      const c = color(tone);
      const labelX = width + 16;
      const labelWidth = railWidth - 32;
      const labelCenterY = labelY + labelHeight / 2;
      return `
      <path d="M ${labelX} ${labelCenterY} H ${width + 7} V ${
        to[1]
      } H ${to[0]}" fill="none" stroke="${c}" stroke-width="4" marker-end="url(#arrow-${
        tone || 'blue'
      })"/>
      <circle cx="${to[0]}" cy="${to[1]}" r="9" fill="#FFFFFF" stroke="${c}" stroke-width="3"/>
      <rect x="${labelX}" y="${labelY}" width="${labelWidth}" height="${labelHeight}" rx="10" fill="#FFFFFF" stroke="${c}" stroke-width="2"/>
      <circle cx="${labelX + 21}" cy="${labelY + 21}" r="15" fill="${c}"/>
      <text x="${labelX + 21}" y="${
        labelY + 27
      }" text-anchor="middle" font-family="PingFang SC, Microsoft YaHei, sans-serif" font-size="18" font-weight="700" fill="#FFFFFF">${escapeXml(
        n,
      )}</text>
      <text x="${labelX + 43}" y="${labelY + 27}" font-family="PingFang SC, Microsoft YaHei, sans-serif" font-size="16" font-weight="600" fill="#1F2937">${escapeXml(label)}</text>`;
    })
    .join('\n');
  return `<svg viewBox="0 0 ${canvasWidth} ${height}" width="${canvasWidth}" height="${height}" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <marker id="arrow-blue" markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto"><path d="M0,0 L12,6 L0,12 Z" fill="#1677FF"/></marker>
      <marker id="arrow-orange" markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto"><path d="M0,0 L12,6 L0,12 Z" fill="#F97316"/></marker>
    </defs><rect x="${width}" y="0" width="${railWidth}" height="${height}" fill="#F8FAFC"/><path d="M ${width} 0 V ${height}" stroke="#E2E8F0" stroke-width="2"/>${entries}</svg>`;
}

async function imageSize(file) {
  const png = await readFile(file);
  // PNG width and height are big-endian uint32 values in the IHDR chunk.
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
}

async function annotate(browser, input, output, labels) {
  const data = (await readFile(input)).toString('base64');
  const { width, height } = await imageSize(input);
  const railWidth = 330;
  const canvasWidth = width + railWidth;
  const page = await browser.newPage({
    viewport: { width: canvasWidth, height },
    deviceScaleFactor: 1,
  });
  await page.setContent(
    `<!doctype html><style>*{box-sizing:border-box}html,body{margin:0;width:${canvasWidth}px;height:${height}px;overflow:hidden}.stage{position:relative;width:${canvasWidth}px;height:${height}px;background:#F8FAFC}.stage img{position:absolute;inset:0 auto auto 0;width:${width}px;height:${height}px}.stage svg{position:absolute;inset:0;width:${canvasWidth}px;height:${height}px}</style><div class="stage"><img src="data:image/png;base64,${data}">${overlaySvg(
      width,
      height,
      labels,
    )}</div>`,
  );
  await page.screenshot({ path: output });
  await page.close();
}

async function login(page) {
  const response = await fetch(`${appUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'admin',
      password: 'admin',
      autoLogin: false,
    }),
  });
  const setCookie = response.headers.get('set-cookie') || '';
  const value = /xinhe_management_session=([^;]+)/.exec(setCookie)?.[1];
  if (!value)
    throw new Error('Unable to obtain a manual-screen-shot session cookie.');
  const origin = new URL(appUrl);
  await page
    .context()
    .addCookies([
      {
        name: 'xinhe_management_session',
        value,
        domain: origin.hostname,
        path: '/',
      },
    ]);
}

async function main() {
  await mkdir(sourceDir, { recursive: true });
  await mkdir(annotatedDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });

  if (process.env.MANUAL_SCREENSHOT_MODE !== 'capture') {
    for (const [file, labels] of Object.entries(marks)) {
      if (
        process.env.MANUAL_SCREENSHOT_FILE &&
        process.env.MANUAL_SCREENSHOT_FILE !== file
      )
        continue;
      const output = path.join(annotatedDir, file);
      const source = path.join(sourceDir, file);
      if (!existsSync(source)) await cp(output, source);
      await annotate(browser, source, output, labels);
      console.log(`annotated ${file}`);
    }
  }

  if (process.env.MANUAL_SCREENSHOT_MODE !== 'annotate') {
    const capturePage = await browser.newPage({
      viewport: { width: 1280, height: 720 },
      deviceScaleFactor: 1,
    });
    await login(capturePage);
    for (const target of captureTargets) {
      const raw = path.join(sourceDir, target.file);
      const output = path.join(annotatedDir, target.file);
      await capturePage.goto(`${appUrl}${target.route}`, {
        waitUntil: 'domcontentloaded',
      });
      await capturePage.waitForTimeout(800);
      await capturePage.screenshot({ path: raw });
      await annotate(browser, raw, output, target.labels);
      console.log(`captured ${target.file}`);
    }
    await capturePage.close();
  }
  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
