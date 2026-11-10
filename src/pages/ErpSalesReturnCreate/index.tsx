import { PageContainer } from '@ant-design/pro-components';
import { history, useParams } from '@umijs/max';
import { Button, Card, Form, Input, InputNumber, message, Space, Table } from 'antd';
import { useEffect, useState } from 'react';
import { createErpSalesReturn, getErpOrder } from '@/services/erp';

export default function ErpSalesReturnCreate() {
  const { id = '' } = useParams<{ id: string }>();
  const [order, setOrder] = useState<any>();
  const [form] = Form.useForm();
  useEffect(() => { getErpOrder(Number(id)).then(setOrder); }, [id]);
  const submit = async (values: any) => {
    const lines = Object.entries(values.quantities || {})
      .filter(([, quantity]) => Number(quantity) > 0)
      .map(([lineId, quantity]) => ({ orderLineId: Number(lineId), quantity: Number(quantity) }));
    try {
      const response = await createErpSalesReturn({ orderId: Number(id), reason: values.reason, lines });
      message.success('退货申请已创建');
      history.push(`/erp/sales-returns/${response.data.id}`);
    } catch (error: any) { message.error(error?.message || '创建失败'); }
  };
  return <PageContainer title="发起销售退货" onBack={() => history.back()}>{order && <Form form={form} layout="vertical" onFinish={submit}><Card title={`${order.orderNo}｜${order.customerName}`}><Table rowKey="id" pagination={false} dataSource={order.lines} columns={[
    { title: '商品编号', dataIndex: 'productCode' },
    { title: '商品名称', dataIndex: 'productName' },
    { title: '原出库仓库', dataIndex: 'warehouseName' },
    { title: '订单数量', dataIndex: 'quantity' },
    { title: '本次退货数量', render: (_, row: any) => <Form.Item name={['quantities', String(row.id)]} noStyle><InputNumber min={0} max={Number(row.quantity)} precision={0} /></Form.Item> },
  ]} /><Form.Item name="reason" label="退货原因" rules={[{ required: true }]} style={{ marginTop: 16 }}><Input.TextArea maxLength={1000} /></Form.Item><Space><Button onClick={() => history.back()}>取消</Button><Button type="primary" onClick={() => form.submit()}>提交退货申请</Button></Space></Card></Form>}</PageContainer>;
}
