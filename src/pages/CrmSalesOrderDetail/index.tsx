import { getAuthenticatedUser } from '@/services/authState';
import {
  RichTextContent,
  RichTextEditor,
} from '@/components/RichTextEditor';
import {
  decideCrmSalesOrder,
  getCrmSalesOrder,
  withdrawCrmSalesOrder,
} from '@/services/crm';
import { approvalStatus, fulfillmentStatus } from '@/utils/salesStatus';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { history, useParams } from '@umijs/max';
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Form,
  message,
  Space,
  Tag,
} from 'antd';
import { useEffect, useState } from 'react';

export default function CrmSalesOrderDetail() {
  const { id = '' } = useParams<{ id: string }>();
  const [order, setOrder] = useState<any>();
  const [form] = Form.useForm();
  const user = getAuthenticatedUser();
  const load = () =>
    getCrmSalesOrder(Number(id))
      .then(setOrder)
      .catch((error: any) => message.error(error?.message || '加载失败'));

  useEffect(() => {
    load();
  }, [id]);

  const canApprove =
    order?.approvalStatus === 'PENDING_APPROVAL' &&
    Boolean(order?.canApprove);
  const own = Number(order?.salespersonUserId) === Number(user?.id);

  const decide = async (approved: boolean) => {
    try {
      await decideCrmSalesOrder(
        Number(id),
        approved,
        form.getFieldValue('opinion') || '',
      );
      message.success(approved ? '审核通过并已同步ERP' : '订单已驳回');
      load();
    } catch (error: any) {
      message.error(error?.message || '操作失败');
    }
  };

  const withdraw = async () => {
    try {
      await withdrawCrmSalesOrder(Number(id));
      message.success('订单已撤回');
      load();
    } catch (error: any) {
      message.error(error?.message || '撤回失败');
    }
  };

  const approval = approvalStatus(order?.approvalStatus);
  const fulfillment = order?.fulfillmentStatus
    ? fulfillmentStatus(order.fulfillmentStatus)
    : undefined;

  return (
    <PageContainer title="CRM销售订单详情" onBack={() => history.back()}>
      {order && (
        <>
          <Card style={{ marginBottom: 16 }}>
            <Descriptions column={3}>
              <Descriptions.Item label="申请编号">
                {order.applicationNo}
              </Descriptions.Item>
              <Descriptions.Item label="正式订单号">
                {order.orderNo || '审核通过后生成'}
              </Descriptions.Item>
              <Descriptions.Item label="审批状态">
                <Tag color={approval.color}>{approval.text}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="客户名称">
                {order.customerName}
              </Descriptions.Item>
              <Descriptions.Item label="联系电话">
                {order.phone || '—'}
              </Descriptions.Item>
              <Descriptions.Item label="销售人员">
                {order.salespersonName}
              </Descriptions.Item>
              {fulfillment && (
                <Descriptions.Item label="ERP履约状态">
                  <Tag color={fulfillment.color}>{fulfillment.text}</Tag>
                </Descriptions.Item>
              )}
              <Descriptions.Item label="收货地址" span={3}>
                {order.shippingAddress || '—'}
              </Descriptions.Item>
              <Descriptions.Item label="备注" span={3}>
                {order.remark || '—'}
              </Descriptions.Item>
              {order.approvalComment && (
                <Descriptions.Item label="审批意见" span={3}>
                  <RichTextContent html={order.approvalComment} />
                </Descriptions.Item>
              )}
            </Descriptions>
          </Card>
          <ProTable
            rowKey="id"
            search={false}
            options={false}
            pagination={false}
            dataSource={order.lines}
            columns={[
              { title: '商品编号', dataIndex: 'productCode' },
              { title: '商品名称', dataIndex: 'productName' },
              { title: '型号', dataIndex: 'model' },
              { title: '规格', dataIndex: 'specification' },
              { title: '数量', dataIndex: 'quantity' },
              { title: '单价', dataIndex: 'unitPrice' },
              { title: '小计', dataIndex: 'amount' },
            ]}
          />
          {order.approvalStatus === 'REJECTED' && (
            <Alert
              type="error"
              message="订单已驳回"
              action={
                own ? (
                  <Button
                    onClick={() => history.push(`/crm/sales-orders/${id}/edit`)}
                  >
                    修改重提
                  </Button>
                ) : undefined
              }
            />
          )}
          <Card style={{ marginTop: 16 }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              {own && order.approvalStatus === 'PENDING_APPROVAL' && (
                <Button onClick={withdraw}>撤回订单</Button>
              )}
              {own && order.approvalStatus === 'WITHDRAWN' && (
                <Button
                  type="primary"
                  onClick={() => history.push(`/crm/sales-orders/${id}/edit`)}
                >
                  编辑重提
                </Button>
              )}
              {canApprove && (
                <>
                  <Form form={form} layout="vertical" style={{ width: '100%' }}>
                    <Form.Item name="opinion" label="审批意见">
                      <RichTextEditor
                        ariaLabel="审批意见"
                        placeholder="请输入审批意见，可设置加粗、列表等格式"
                      />
                    </Form.Item>
                  </Form>
                  <Space>
                    <Button danger onClick={() => decide(false)}>
                      驳回
                    </Button>
                    <Button type="primary" onClick={() => decide(true)}>
                      通过并同步ERP
                    </Button>
                  </Space>
                </>
              )}
            </Space>
          </Card>
        </>
      )}
    </PageContainer>
  );
}
