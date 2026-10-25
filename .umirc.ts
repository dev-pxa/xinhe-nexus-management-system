import { defineConfig } from '@umijs/max';

export default defineConfig({
  antd: {},
  access: {},
  model: {},
  initialState: {},
  request: {},
  hash: true,
  layout: {
    title: '芯河智枢',
    layout: 'mix',
    fixedHeader: true,
    fixSiderbar: true,
  },
  routes: [
    { path: '/login', component: './Login', layout: false },
    { path: '/', redirect: '/dashboard' },
    {
      name: '工作台',
      icon: 'DashboardOutlined',
      path: '/dashboard',
      component: './Dashboard',
    },
    {
      name: 'CRM 客户销售',
      icon: 'TeamOutlined',
      path: '/crm',
      routes: [
        { path: '/crm', redirect: '/crm/customers' },
        { name: '客户管理', path: '/crm/customers', component: './Module' },
        { name: '项目报备', path: '/crm/projects', component: './Module' },
        { name: '项目全景', path: '/crm/panorama', component: './Module' },
        { name: '报价与合同', path: '/crm/contracts', component: './Module' },
        { name: '售后服务', path: '/crm/service', component: './Module' },
      ],
    },
    {
      name: 'ERP 进销存',
      icon: 'ShoppingOutlined',
      path: '/erp',
      routes: [
        { path: '/erp', redirect: '/erp/products' },
        { name: '产品与 BOM', path: '/erp/products', component: './Module' },
        { name: '订单管理', path: '/erp/orders', component: './Module' },
        { name: '采购与供应商', path: '/erp/purchase', component: './Module' },
        { name: '仓库与库存', path: '/erp/inventory', component: './Module' },
        { name: '发货与物流', path: '/erp/logistics', component: './Module' },
      ],
    },
    {
      name: '财务管理',
      icon: 'DollarOutlined',
      path: '/finance',
      routes: [
        { path: '/finance', redirect: '/finance/receivable' },
        {
          name: '应收与收款',
          path: '/finance/receivable',
          component: './Module',
        },
        { name: '应付与付款', path: '/finance/payable', component: './Module' },
        { name: '对账与开票', path: '/finance/invoice', component: './Module' },
      ],
    },
    {
      name: 'OA 协同办公',
      icon: 'SolutionOutlined',
      path: '/oa',
      routes: [
        { path: '/oa', redirect: '/oa/attendance' },
        { name: '打卡记录', path: '/oa/attendance', exact: true, component: './Attendance' },
        { name: '全部打卡记录', path: '/oa/all-attendance', component: './AllAttendance', access: 'isAdmin' },
        { name: '差旅与报销', path: '/oa/expense', component: './Module' },
        { name: '审批中心', path: '/oa/approval', component: './Module' },
        { name: '固定资产', path: '/oa/assets', component: './Module' },
      ],
    },
    {
      name: 'AI 智能中心',
      icon: 'RobotOutlined',
      path: '/ai',
      routes: [
        { path: '/ai', redirect: '/ai/insights' },
        { name: '商机洞察', path: '/ai/insights', component: './Module' },
        { name: '库存预测', path: '/ai/forecast', component: './Module' },
        { name: '经营分析', path: '/ai/analysis', component: './Module' },
        { name: '风险预警', path: '/ai/risk', component: './Module' },
      ],
    },
    {
      name: '数据报表',
      icon: 'BarChartOutlined',
      path: '/reports',
      component: './Module',
    },
    {
      name: '系统管理',
      icon: 'SettingOutlined',
      path: '/system',
      access: 'isAdmin',
      routes: [
        { path: '/system', redirect: '/system/organization' },
        {
          name: '公司管理',
          path: '/system/companies',
          component: './Company',
          access: 'isPlatformAdmin',
        },
        {
          name: '组织与岗位',
          path: '/system/organization',
          component: './Organization',
        },
        { name: '用户管理', path: '/system/users', component: './User' },
        {
          name: '审批流配置',
          path: '/system/workflows',
          component: './Module',
        },
        { name: '审计日志', path: '/system/audit', component: './Module' },
      ],
    },
  ],
  proxy: {
    '/api': {
      target: 'http://127.0.0.1:18081',
      changeOrigin: true,
    },
  },
  npmClient: 'pnpm',
});
