import { listErpSalesReturns } from '@/services/erp';
import { returnStatus, returnStatusMeta } from '@/utils/salesStatus';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { history } from '@umijs/max';
import { Tag } from 'antd';

export default function ErpSalesReturns() {
  return (
    <PageContainer title="销售退货">
      <ProTable
        rowKey="id"
        request={async (params) => ({ data: await listErpSalesReturns(params), success: true })}
        columns={[
          { title: '退货单号', dataIndex: 'returnNo' },
          { title: '正式订单号', dataIndex: 'orderNo' },
          { title: '客户名称', dataIndex: 'customerName', search: false },
          {
            title: '状态',
            dataIndex: 'status',
            valueType: 'select',
            fieldProps: { options: Object.entries(returnStatusMeta).map(([value, meta]) => ({ value, label: meta.text })) },
            render: (_, row: any) => {
              const meta = returnStatus(row.status);
              return <Tag color={meta.color}>{meta.text}</Tag>;
            },
          },
          { title: '退货金额', dataIndex: 'returnAmount', search: false },
          { title: '退货原因', dataIndex: 'reason', search: false },
          { title: '操作', valueType: 'option', render: (_, row: any) => <a onClick={() => history.push(`/erp/sales-returns/${row.id}`)}>详情</a> },
        ]}
      />
    </PageContainer>
  );
}
