import {
  getErpOrder,
  listErpProducts,
  resubmitErpOrder,
  submitErpOrder,
} from '@/services/erp';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { history, useParams } from '@umijs/max';
import {
  Alert,
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
type OrderLine = { productId?: number; quantity?: number; unitPrice?: number };

const money = (value: number) => `¥${value.toFixed(2)}`;

/** 销售订单申请独立页面：商品单价从商品资料读取，用户只填写数量。 */
export default function ErpOrderCreatePage() {
  const { id: routeId } = useParams<{ id?: string }>();
  const editId = routeId && routeId !== 'new' ? Number(routeId) : undefined;
  const [form] = Form.useForm();
  const lines: OrderLine[] = Form.useWatch('lines', form) || [];
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rejectionAdvice, setRejectionAdvice] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([
      listErpProducts(),
      editId ? getErpOrder(editId) : Promise.resolve(undefined),
    ])
      .then(([records, order]) => {
        if (!active) return;
        setProducts(records);
        if (editId && order) {
          if (order.status !== 'REJECTED') {
            message.error('只有被驳回的订单申请可以修改');
            history.push(`/erp/orders/${editId}`);
            return;
          }
          setRejectionAdvice(
            order.approvalComment ||
              '负责人未填写具体建议，请联系负责人确认修改内容。',
          );
          form.setFieldsValue({
            customerName: order.customerName,
            phone: order.phone,
            shippingAddress: order.shippingAddress,
            expectedDeliveryDate: order.expectedDeliveryDate,
            remark: order.remark,
            lines: (order.lines || []).map((line: any) => ({
              productId: line.productId,
              quantity: Number(line.quantity),
              unitPrice: Number(line.unitPrice),
            })),
          });
        }
      })
      .catch((error: any) =>
        message.error(error?.message || '商品列表加载失败'),
      )
      .finally(() => {
        if (active) setLoadingProducts(false);
      });
    return () => {
      active = false;
    };
  }, [editId, form]);

  const total = useMemo(
    () =>
      lines.reduce((sum, line) => {
        const product = products.find(
          (item) => item.id === Number(line.productId),
        );
        return sum + (product?.unitPrice || 0) * (Number(line.quantity) || 0);
      }, 0),
    [lines, products],
  );

  const onFinish = async (values: any) => {
    setSaving(true);
    try {
      // 单价由服务端按商品当前资料重新读取；客户端传来的单价只用于展示，不作为成交价依据。
      const payload = {
        ...values,
        lines: values.lines.map((line: OrderLine) => ({
          productId: line.productId,
          quantity: line.quantity,
        })),
      };
      if (editId) await resubmitErpOrder(editId, payload);
      else await submitErpOrder(payload);
      message.success(
        editId
          ? '修改已提交，等待负责人重新审核'
          : '订单申请已提交，待部门负责人审核',
      );
      history.push('/erp/orders');
    } catch (error: any) {
      message.error(error?.message || '订单申请提交失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageContainer
      title={editId ? '修改被驳回订单' : '新建销售订单申请'}
      content={
        editId
          ? '修改订单内容后重新提交，仍由原负责人审核。'
          : '商品单价取自商品资料，不能在订单中修改；提交后由部门负责人审核。'
      }
      extra={
        <Space>
          <Button
            onClick={() =>
              history.push(editId ? `/erp/orders/${editId}` : '/erp/orders')
            }
          >
            取消
          </Button>
          <Button type="primary" loading={saving} onClick={() => form.submit()}>
            {editId ? '重新提交审核' : '提交申请'}
          </Button>
        </Space>
      }
    >
      {editId && (
        <div style={{ maxWidth: 1100, margin: '0 auto 16px' }}>
          <Alert
            type="error"
            showIcon
            message="负责人驳回建议"
            description={
              <span style={{ whiteSpace: 'pre-wrap' }}>
                {rejectionAdvice || '正在读取驳回建议…'}
              </span>
            }
          />
        </div>
      )}
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <Form
          form={form}
          layout="vertical"
          initialValues={{ lines: [{ quantity: 1 }] }}
          onFinish={onFinish}
        >
          <Card title="客户信息" style={{ marginBottom: 20 }}>
            <Row gutter={20}>
              <Col xs={24} md={12}>
                <Form.Item
                  name="customerName"
                  label="客户名称"
                  rules={[
                    {
                      required: true,
                      whitespace: true,
                      message: '请输入客户名称',
                    },
                  ]}
                >
                  <Input maxLength={100} placeholder="请输入客户名称" />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  name="phone"
                  label="联系电话"
                  rules={[
                    {
                      required: true,
                      whitespace: true,
                      message: '请输入联系电话',
                    },
                  ]}
                >
                  <Input maxLength={40} placeholder="请输入联系电话" />
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item
                  name="shippingAddress"
                  label="收货地址"
                  rules={[
                    {
                      required: true,
                      whitespace: true,
                      message: '请输入收货地址',
                    },
                  ]}
                >
                  <Input maxLength={500} placeholder="请输入收货地址" />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          <Card
            title={
              <Space>
                商品明细
                <Typography.Text type="secondary">
                  共 {lines.length} 项
                </Typography.Text>
              </Space>
            }
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
            style={{ marginBottom: 20 }}
          >
            <Form.List name="lines">
              {(fields, { remove }) =>
                fields.length ? (
                  <Space
                    direction="vertical"
                    size={16}
                    style={{ width: '100%' }}
                  >
                    {fields.map(({ key, name, ...rest }, index) => {
                      const selectedId = Number(lines[index]?.productId);
                      const product = products.find(
                        (item) => item.id === selectedId,
                      );
                      const quantity = Number(lines[index]?.quantity) || 0;
                      const subtotal = (product?.unitPrice || 0) * quantity;
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
                              aria-label={`删除商品 ${index + 1}`}
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
                          <Row gutter={[20, 8]} align="middle">
                            <Col xs={24} md={12}>
                              <Form.Item
                                {...rest}
                                name={[name, 'productId']}
                                label="选择商品"
                                rules={[
                                  { required: true, message: '请选择商品' },
                                ]}
                              >
                                <Select
                                  showSearch
                                  loading={loadingProducts}
                                  optionFilterProp="label"
                                  placeholder="请选择启用中的商品"
                                  options={products.map((item) => ({
                                    value: item.id,
                                    label: `${item.productCode}｜${
                                      item.productName
                                    }${item.model ? `｜${item.model}` : ''}${
                                      item.specification
                                        ? `｜${item.specification}`
                                        : ''
                                    }${
                                      item.status === 'ENABLED'
                                        ? ''
                                        : '（已停用）'
                                    }`,
                                    disabled:
                                      item.status !== 'ENABLED' &&
                                      Number(item.id) !== selectedId,
                                  }))}
                                  onChange={(productId) => {
                                    const chosen = products.find(
                                      (item) => item.id === productId,
                                    );
                                    form.setFieldValue(
                                      ['lines', name, 'unitPrice'],
                                      chosen?.unitPrice,
                                    );
                                  }}
                                />
                              </Form.Item>
                            </Col>
                            <Col xs={24} md={6}>
                              <Form.Item
                                {...rest}
                                name={[name, 'quantity']}
                                label="订购数量"
                                rules={[
                                  { required: true, message: '请输入订购数量' },
                                  {
                                    type: 'integer',
                                    min: 1,
                                    message: '订购数量必须为正整数',
                                  },
                                ]}
                              >
                                <InputNumber
                                  min={1}
                                  max={999999999}
                                  step={1}
                                  precision={0}
                                  style={{ width: '100%' }}
                                  placeholder="请输入整数数量"
                                />
                              </Form.Item>
                            </Col>
                            <Col xs={24} md={6}>
                              <Typography.Text type="secondary">
                                商品单价
                              </Typography.Text>
                              <div
                                style={{
                                  marginTop: 8,
                                  fontSize: 16,
                                  fontWeight: 600,
                                }}
                              >
                                {product
                                  ? money(Number(product.unitPrice))
                                  : '选择商品后显示'}
                              </div>
                            </Col>
                            {product && (
                              <Col span={24}>
                                <Typography.Text type="secondary">
                                  分类：{product.categoryName}　型号：
                                  {product.model || '-'}　规格：
                                  {product.specification || '-'}
                                </Typography.Text>
                              </Col>
                            )}
                            <Col span={24}>
                              <div
                                style={{
                                  display: 'flex',
                                  justifyContent: 'flex-end',
                                  paddingTop: 8,
                                  borderTop: '1px solid #f0f0f0',
                                }}
                              >
                                <Space size={24}>
                                  <Typography.Text type="secondary">
                                    本项小计
                                  </Typography.Text>
                                  <Typography.Text
                                    strong
                                    style={{ fontSize: 18 }}
                                  >
                                    {money(subtotal)}
                                  </Typography.Text>
                                </Space>
                              </div>
                            </Col>
                          </Row>
                        </Card>
                      );
                    })}
                  </Space>
                ) : (
                  <Typography.Text type="secondary">
                    还没有商品，请点击“添加商品”。
                  </Typography.Text>
                )
              }
            </Form.List>
          </Card>

          <Card title="其他信息" style={{ marginBottom: 20 }}>
            <Form.Item
              name="remark"
              label="订单备注"
              style={{ marginBottom: 0 }}
            >
              <Input.TextArea
                rows={3}
                maxLength={1000}
                showCount
                placeholder="选填"
              />
            </Form.Item>
          </Card>

          <Card>
            <Row align="middle" justify="space-between" gutter={[16, 12]}>
              <Col>
                <Typography.Text type="secondary">
                  最终金额将在负责人审核通过后成为正式订单金额。
                </Typography.Text>
              </Col>
              <Col>
                <Statistic
                  title="订单总价"
                  value={total}
                  precision={2}
                  prefix="¥"
                  valueStyle={{ color: '#1677ff', fontWeight: 700 }}
                />
              </Col>
            </Row>
          </Card>
        </Form>
      </div>
    </PageContainer>
  );
}
