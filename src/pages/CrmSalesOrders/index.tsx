import { listCrmSalesOrders } from '@/services/crm';
import {
  approvalStatus,
  approvalStatusMeta,
  fulfillmentStatus,
} from '@/utils/salesStatus';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { history, useModel } from '@umijs/max';
import { Button, Space, Tag } from 'antd';

/** 本人及所负责组织树内下级人员的CRM销售订单。 */
export default function CrmSalesOrdersPage() {
  const { initialState } = useModel('@@initialState');
  const currentUserId = Number(initialState?.currentUser?.id);
  const roles = initialState?.currentUser?.roles || [];
  const permissions = initialState?.currentUser?.permissions || [];
  const canCreate =
    roles.includes('COMPANY_ADMIN') ||
    roles.includes('PLATFORM_ADMIN') ||
    permissions.includes('*') ||
    permissions.includes('crm:sales-order:create');

  return (
    <PageContainer
      title="销售订单"
      content="查看本人及负责组织树内下级人员的销售订单。"
    >
      <ProTable<any>
        rowKey="id"
        search={{ labelWidth: 'auto', defaultCollapsed: false }}
        request={async (params) => {
          const data = await listCrmSalesOrders({
            applicationNo: params.applicationNo,
            orderNo: params.orderNo,
            customerName: params.customerName,
            salespersonName: params.salespersonName,
            approvalStatus: params.approvalStatus,
          });
          return { data, success: true, total: data.length };
        }}
        toolBarRender={() =>
          canCreate
            ? [
                <Button
                  key="new"
                  type="primary"
                  onClick={() => history.push('/crm/sales-orders/new')}
                >
                  新增销售订单
                </Button>,
              ]
            : []
        }
        columns={[
          { title: '申请编号', dataIndex: 'applicationNo' },
          {
            title: '正式订单号',
            dataIndex: 'orderNo',
            render: (_, record) => record.orderNo || '—',
          },
          { title: '客户名称', dataIndex: 'customerName' },
          {
            title: '销售人员',
            dataIndex: 'salespersonName',
          },
          {
            title: '订单金额',
            dataIndex: 'totalAmount',
            search: false,
            render: (_, record) =>
              `¥${Number(record.totalAmount || 0).toFixed(2)}`,
          },
          {
            title: '审批状态',
            dataIndex: 'approvalStatus',
            valueType: 'select',
            fieldProps: {
              options: Object.entries(approvalStatusMeta).map(
                ([value, item]) => ({ value, label: item.text }),
              ),
            },
            render: (_, record) => {
              const status = approvalStatus(record.approvalStatus);
              return <Tag color={status.color}>{status.text}</Tag>;
            },
          },
          {
            title: 'ERP履约状态',
            dataIndex: 'fulfillmentStatus',
            search: false,
            render: (_, record) =>
              record.fulfillmentStatus
                ? fulfillmentStatus(record.fulfillmentStatus).text
                : '—',
          },
          {
            title: '申请时间',
            dataIndex: 'createdAt',
            search: false,
          },
          {
            title: '操作',
            valueType: 'option',
            render: (_, record) => (
              <Space>
                <a
                  onClick={() => history.push(`/crm/sales-orders/${record.id}`)}
                >
                  详情
                </a>
                {Number(record.salespersonUserId) === currentUserId &&
                  ['REJECTED', 'WITHDRAWN'].includes(record.approvalStatus) && (
                    <a
                      onClick={() =>
                        history.push(`/crm/sales-orders/${record.id}/edit`)
                      }
                    >
                      编辑重提
                    </a>
                  )}
              </Space>
            ),
          },
        ]}
      />
    </PageContainer>
  );
}
