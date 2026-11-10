import { RichTextContent } from '@/components/RichTextEditor';
import {
  completeErpOrder,
  getErpOrder,
  signErpOrder,
} from '@/services/erp';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { history, useParams } from '@umijs/max';
import {
  Button,
  Card,
  Descriptions,
  Form,
  Input,
  message,
  Modal,
  Space,
  Tag,
} from 'antd';
import { useEffect, useState } from 'react';

export default function ErpOrderDetail() {
  const { id = '' } = useParams<{ id: string }>();
  const [order, setOrder] = useState<any>();
  const [signOpen, setSignOpen] = useState(false);
  const [signForm] = Form.useForm();

  const load = () =>
    getErpOrder(Number(id))
      .then(setOrder)
      .catch((error: any) => message.error(error?.message || '加载失败'));

  useEffect(() => {
    load();
  }, [id]);

  const sign = async () => {
    try {
      await signErpOrder(order.id, await signForm.validateFields());
      message.success('已确认签收');
      setSignOpen(false);
      load();
    } catch (error: any) {
      message.error(error?.message || '签收失败');
    }
  };

  const complete = async () => {
    try {
      await completeErpOrder(order.id);
      message.success('订单已完成');
      load();
    } catch (error: any) {
      message.error(error?.message || '完成失败');
    }
  };

  return (
    <PageContainer
      title="ERP销售订单详情"
      onBack={() => history.push('/erp/orders')}
    >
      {order && (
        <>
          <Card style={{ marginBottom: 16 }}>
            <Descriptions column={3}>
              <Descriptions.Item label="正式订单号">
                {order.orderNo}
              </Descriptions.Item>
              <Descriptions.Item label="客户名称">
                {order.customerName}
              </Descriptions.Item>
              <Descriptions.Item label="销售人员">
                {order.salespersonName}
              </Descriptions.Item>
              <Descriptions.Item label="联系电话">
                {order.phone || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="履约状态">
                <Tag>{order.fulfillmentStatus}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="订单金额">
                ¥{Number(order.totalAmount).toFixed(2)}
              </Descriptions.Item>
              <Descriptions.Item label="收货地址" span={3}>
                {order.shippingAddress || '-'}
              </Descriptions.Item>
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
              {
                title: '出库仓库',
                dataIndex: 'warehouseName',
                render: (_, row: any) => row.warehouseName || '未分配',
              },
            ]}
          />
          {order.dispatches?.length > 0 && (
            <Card title="出库发货单" style={{ marginTop: 16 }}>
              {order.dispatches.map((dispatch: any) => (
                <Descriptions
                  key={dispatch.id}
                  bordered
                  size="small"
                  column={4}
                  style={{ marginBottom: 12 }}
                >
                  <Descriptions.Item label="出库单号">
                    {dispatch.dispatchNo}
                  </Descriptions.Item>
                  <Descriptions.Item label="仓库">
                    {dispatch.warehouseName}
                  </Descriptions.Item>
                  <Descriptions.Item label="承运商">
                    {dispatch.carrier || '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="物流单号">
                    {dispatch.trackingNo || '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="发货备注" span={4}>
                    <RichTextContent html={dispatch.remark} />
                  </Descriptions.Item>
                </Descriptions>
              ))}
            </Card>
          )}
          <Card style={{ marginTop: 16 }}>
            <Space>
              {order.fulfillmentStatus === 'WAITING_DISPATCH' && (
                <Button
                  type="primary"
                  onClick={() =>
                    history.push('/erp/orders/' + order.id + '/dispatch')
                  }
                >
                  分配仓库并出库发货
                </Button>
              )}
              {order.fulfillmentStatus === 'DISPATCHED' && (
                <Button type="primary" onClick={() => setSignOpen(true)}>
                  确认签收
                </Button>
              )}
              {order.fulfillmentStatus === 'SIGNED' && (
                <Button type="primary" onClick={complete}>
                  完成订单
                </Button>
              )}
              {['DISPATCHED', 'SIGNED', 'COMPLETED', 'RETURNED'].includes(
                order.fulfillmentStatus,
              ) && (
                <Button
                  onClick={() =>
                    history.push('/erp/orders/' + order.id + '/return')
                  }
                >
                  发起销售退货
                </Button>
              )}
            </Space>
          </Card>
        </>
      )}
      <Modal
        title="确认签收"
        open={signOpen}
        onCancel={() => setSignOpen(false)}
        onOk={sign}
      >
        <Form form={signForm} layout="vertical">
          <Form.Item
            name="signedByName"
            label="签收人"
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="remark" label="签收备注">
            <Input.TextArea />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
}
