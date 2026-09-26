import { PlusOutlined } from '@ant-design/icons';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { useLocation } from '@umijs/max';
import { Button, Tag } from 'antd';

const pageNames: Record<string, string> = {
  customers: '客户管理', projects: '项目报备', panorama: '项目全景', contracts: '报价与合同',
  service: '售后服务', products: '产品与 BOM', orders: '订单管理', purchase: '采购与供应商',
  inventory: '仓库与库存', logistics: '发货与物流', receivable: '应收与收款', payable: '应付与付款',
  invoice: '对账与开票', employees: '人员档案', attendance: '考勤假勤', expense: '差旅与报销',
  approval: '审批中心', assets: '固定资产', insights: '商机洞察', forecast: '库存预测',
  analysis: '经营分析', risk: '风险预警', reports: '数据报表', organization: '组织与账号',
  roles: '角色权限', workflows: '审批流配置', audit: '审计日志',
};

export default function ModulePage() {
  const location = useLocation();
  const key = location.pathname.split('/').filter(Boolean).pop() || '';
  const title = pageNames[key] || '业务模块';
  return (
    <PageContainer title={title} content="基础页面容器已初始化，业务接口将在对应迭代接入。">
      <ProTable
        rowKey="id"
        search={{ labelWidth: 'auto' }}
        columns={[
          { title: '业务编号', dataIndex: 'code' },
          { title: '名称', dataIndex: 'name' },
          { title: '状态', dataIndex: 'status', render: () => <Tag color="blue">进行中</Tag> },
          { title: '更新时间', dataIndex: 'updatedAt', valueType: 'dateTime' },
        ]}
        request={async () => ({ data: [], success: true, total: 0 })}
        toolBarRender={() => [<Button key="new" type="primary" icon={<PlusOutlined />}>新建{title}</Button>]}
      />
    </PageContainer>
  );
}

