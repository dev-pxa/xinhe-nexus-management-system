import {
  createCrmSalesOrder,
  getCrmCustomer,
  getCrmSalesOrder,
  listCrmSalesOrderProducts,
  listMyCrmCustomers,
  resubmitCrmSalesOrder,
} from '@/services/crm';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { history, useParams } from '@umijs/max';
import {
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Typography,
} from 'antd';
import { useEffect, useMemo, useState } from 'react';

type Product = {
  id: number;
  productCode: string;
  productName: string;
  categoryName: string;
  model?: string;
  specification?: string;
  unitPrice: number;
  status: string;
};
type Customer = { id: number; customerNo: string; customerName: string };

export default function CrmSalesOrderEditPage() {
  const { id } = useParams<{ id?: string }>();
  const editId = id ? Number(id) : undefined;
  const [form] = Form.useForm();
  const lines: any[] = Form.useWatch('lines', form) || [];
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerOpen, setCustomerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    const initialCustomerId = Number(
      new URLSearchParams(window.location.search).get('customerId') || 0,
    );
    Promise.all([
      listCrmSalesOrderProducts(),
      listMyCrmCustomers(),
      editId ? getCrmSalesOrder(editId) : Promise.resolve(undefined),
    ])
      .then(async ([p, cResponse, order]) => {
        setProducts(p);
        setCustomers(cResponse.data || []);
        if (order) {
          form.setFieldsValue({
            customerId: order.customerId,
            customerName: order.customerName,
            phone: order.phone,
            shippingAddress: order.shippingAddress,
            remark: order.remark,
            version: order.version,
            lines: (order.lines || []).map((line: any) => ({
              productId: line.productId,
              quantity: Number(line.quantity),
            })),
          });
        } else if (initialCustomerId) {
          await chooseCustomer(initialCustomerId);
        }
      })
      .catch((e: any) => message.error(e?.message || '订单资料加载失败'));
  }, [editId]);
  const chooseCustomer = async (customerId: number) => {
    try {
      const response = await getCrmCustomer(customerId);
      const c = response.data;
      form.setFieldsValue({
        customerId: c.id,
        customerName: c.customerName,
        phone: c.phone,
        shippingAddress: c.address,
      });
      setCustomerOpen(false);
    } catch (e: any) {
      message.error(e?.message || '客户加载失败');
    }
  };
  const total = useMemo(
    () =>
      lines.reduce(
        (sum, line) =>
          sum +
          (products.find((p) => p.id === Number(line.productId))?.unitPrice ||
            0) *
            (Number(line.quantity) || 0),
        0,
      ),
    [lines, products],
  );
  const submit = async (values: any) => {
    setSaving(true);
    try {
      const payload = {
        customerId: values.customerId,
        phone: values.phone,
        shippingAddress: values.shippingAddress,
        remark: values.remark,
        version: values.version,
        lines: values.lines.map((line: any) => ({
          productId: line.productId,
          quantity: line.quantity,
        })),
      };
      if (editId) await resubmitCrmSalesOrder(editId, payload);
      else await createCrmSalesOrder(payload);
      message.success('销售订单已提交审核');
      history.push('/crm/sales-orders');
    } catch (e: any) {
      message.error(e?.message || '提交失败');
    } finally {
      setSaving(false);
    }
  };
  return (
    <PageContainer
      title={editId ? '修改销售订单' : '新增销售订单'}
      extra={
        <Space>
          <Button onClick={() => history.back()}>取消</Button>
          <Button type="primary" loading={saving} onClick={() => form.submit()}>
            提交审核
          </Button>
        </Space>
      }
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{ lines: [{ quantity: 1 }] }}
        onFinish={submit}
        style={{ maxWidth: 1100, margin: '0 auto' }}
      >
        <Form.Item name="customerId" hidden rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="version" hidden>
          <Input />
        </Form.Item>
        <Card
          title="客户信息"
          extra={
            <Button onClick={() => setCustomerOpen(true)}>选择客户</Button>
          }
          style={{ marginBottom: 16 }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="customerName"
                label="客户名称"
                rules={[{ required: true, message: '请选择客户' }]}
              >
                <Input disabled />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="phone" label="联系电话">
                <Input maxLength={40} />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="shippingAddress" label="收货地址">
                <Input maxLength={500} />
              </Form.Item>
            </Col>
          </Row>
        </Card>
        <Card
          title="商品明细"
          extra={
            <Button
              icon={<PlusOutlined />}
              onClick={() =>
                form.setFieldValue('lines', [...lines, { quantity: 1 }])
              }
            >
              添加商品
            </Button>
          }
          style={{ marginBottom: 16 }}
        >
          <Form.List name="lines">
            {(fields, { remove }) => (
              <Space direction="vertical" style={{ width: '100%' }}>
                {fields.map(({ key, name, ...rest }, index) => {
                  const product = products.find(
                    (p) => p.id === Number(lines[index]?.productId),
                  );
                  return (
                    <Card
                      key={key}
                      size="small"
                      title={`商品 ${index + 1}`}
                      extra={
                        <Button
                          danger
                          type="text"
                          icon={<DeleteOutlined />}
                          onClick={() =>
                            Modal.confirm({
                              title: `确认删除商品 ${index + 1}？`,
                              content: '删除后该商品明细将被移除。',
                              okText: '确认删除',
                              okType: 'danger',
                              cancelText: '取消',
                              onOk: () => remove(name),
                            })
                          }
                        >
                          删除
                        </Button>
                      }
                    >
                      <Row gutter={16}>
                        <Col span={14}>
                          <Form.Item
                            {...rest}
                            name={[name, 'productId']}
                            label="商品"
                            rules={[{ required: true, message: '请选择商品' }]}
                          >
                            <Select
                              showSearch
                              optionFilterProp="label"
                              options={products.map((p) => ({
                                value: p.id,
                                label: `${p.productCode}｜${p.productName}｜${
                                  p.model || '-'
                                }｜${p.specification || '-'}`,
                                disabled: p.status !== 'ENABLED',
                              }))}
                            />
                          </Form.Item>
                        </Col>
                        <Col span={5}>
                          <Form.Item
                            {...rest}
                            name={[name, 'quantity']}
                            label="数量"
                            rules={[
                              {
                                required: true,
                                type: 'integer',
                                min: 1,
                                message: '数量必须为正整数',
                              },
                            ]}
                          >
                            <InputNumber
                              min={1}
                              precision={0}
                              style={{ width: '100%' }}
                            />
                          </Form.Item>
                        </Col>
                        <Col span={5}>
                          <Typography.Text type="secondary">
                            单价
                          </Typography.Text>
                          <div style={{ marginTop: 8 }}>
                            ¥{Number(product?.unitPrice || 0).toFixed(2)}
                          </div>
                        </Col>
                      </Row>
                    </Card>
                  );
                })}
              </Space>
            )}
          </Form.List>
        </Card>
        <Card title="其他信息" style={{ marginBottom: 16 }}>
          <Form.Item name="remark" label="订单备注">
            <Input.TextArea rows={3} maxLength={1000} />
          </Form.Item>
        </Card>
        <Card>
          <Statistic title="订单总价" value={total} precision={2} prefix="¥" />
        </Card>
      </Form>
      <Modal
        title="选择本人负责的客户"
        open={customerOpen}
        footer={null}
        onCancel={() => setCustomerOpen(false)}
        width={720}
      >
        <Table
          rowKey="id"
          dataSource={customers}
          pagination={false}
          columns={[
            { title: '客户编号', dataIndex: 'customerNo' },
            { title: '客户名称', dataIndex: 'customerName' },
            {
              title: '操作',
              render: (_, r) => (
                <a onClick={() => chooseCustomer(r.id)}>选择</a>
              ),
            },
          ]}
        />
      </Modal>
    </PageContainer>
  );
}
