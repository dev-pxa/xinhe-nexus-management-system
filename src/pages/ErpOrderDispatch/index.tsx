import { RichTextEditor } from '@/components/RichTextEditor';
import {
  dispatchErpOrder,
  getErpOrder,
  listErpInventory,
  listErpWarehouses,
} from '@/services/erp';
import { PageContainer } from '@ant-design/pro-components';
import { history, useParams } from '@umijs/max';
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Empty,
  Form,
  Input,
  message,
  Select,
  Space,
  Spin,
  Tag,
  Typography,
} from 'antd';
import { useEffect, useMemo, useState } from 'react';

/** ERP销售订单按仓库分配商品并整单出库的独立页面。 */
export default function ErpOrderDispatch() {
  const { id = '' } = useParams<{ id: string }>();
  const orderId = Number(id);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [order, setOrder] = useState<any>();
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [inventoryByWarehouse, setInventoryByWarehouse] = useState<Record<number, any[]>>({});
  const [assignments, setAssignments] = useState<Record<number, number>>({});
  const [dispatchForms, setDispatchForms] = useState<Record<number, any>>({});

  useEffect(() => {
    let mounted = true;
    Promise.all([getErpOrder(orderId), listErpWarehouses(true)])
      .then(async ([orderData, warehouseData]) => {
        const inventories = await Promise.all(
          warehouseData.map(async (warehouse: any) => [
            warehouse.id,
            await listErpInventory({ warehouseId: warehouse.id }),
          ] as const),
        );
        if (!mounted) return;
        setOrder(orderData);
        setWarehouses(warehouseData);
        setInventoryByWarehouse(Object.fromEntries(inventories));
      })
      .catch((error: any) => {
        message.error(error?.message || '出库页面加载失败');
        history.replace('/erp/orders/' + orderId);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [orderId]);

  const assignedCount = Object.keys(assignments).length;
  const usedWarehouseIds = useMemo(
    () => Array.from(new Set(Object.values(assignments))),
    [assignments],
  );

  const selectedLines = (warehouseId: number) =>
    order?.lines
      ?.filter((line: any) => assignments[line.id] === warehouseId)
      .map((line: any) => line.id) || [];

  const stockOf = (warehouseId: number, productId: number) =>
    Number(
      (inventoryByWarehouse[warehouseId] || []).find(
        (item: any) => Number(item.productId) === Number(productId),
      )?.quantity || 0,
    );

  const productOption = (line: any, warehouseId: number, disabled = false) => {
    const stock = stockOf(warehouseId, line.productId);
    return {
      value: line.id,
      disabled,
      label: (
        <span style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
          <span>
            {line.productCode}｜{line.productName}｜需出库 {line.quantity}
          </span>
          <Typography.Text type={disabled ? 'danger' : 'success'}>
            当前库存 {stock}
          </Typography.Text>
        </span>
      ),
    };
  };

  const assignLines = (warehouseId: number, lineIds: number[]) => {
    setAssignments((current) => {
      const next = { ...current };
      Object.keys(next).forEach((lineId) => {
        if (next[Number(lineId)] === warehouseId) delete next[Number(lineId)];
      });
      lineIds.forEach((lineId) => {
        next[lineId] = warehouseId;
      });
      return next;
    });
  };

  const updateDispatchForm = (
    warehouseId: number,
    field: string,
    value: string,
  ) =>
    setDispatchForms((current) => ({
      ...current,
      [warehouseId]: {
        ...current[warehouseId],
        [field]: value,
      },
    }));

  const submit = async () => {
    if (!order || assignedCount !== order.lines.length) {
      message.error('必须为订单内全部商品分配出库仓库');
      return;
    }
    const missing = usedWarehouseIds.find((warehouseId) => {
      const form = dispatchForms[warehouseId] || {};
      return !String(form.carrier || '').trim() || !String(form.trackingNo || '').trim();
    });
    if (missing) {
      const warehouse = warehouses.find((item) => item.id === missing);
      message.error(`请填写仓库【${warehouse?.warehouseName || ''}】的配送方式和物流单号`);
      return;
    }
    const groups = usedWarehouseIds.map((warehouseId) => ({
      warehouseId,
      lineIds: selectedLines(warehouseId),
      ...(dispatchForms[warehouseId] || {}),
    }));
    setSubmitting(true);
    try {
      await dispatchErpOrder(orderId, groups);
      message.success('已生成 ' + groups.length + ' 张出库发货单');
      history.replace('/erp/orders/' + orderId);
    } catch (error: any) {
      // HTTP 业务错误已由全局 request errorHandler 展示后端返回的中文原因，避免重复弹出 Axios 通用文案。
      if (!error?.response) message.error(error?.message || '出库发货失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageContainer
      title="按仓库分配全部商品"
      content="同一商品只能分配到一个仓库；每个实际出库仓库生成一张独立出库发货单。"
      onBack={() => history.push('/erp/orders/' + orderId)}
      extra={
        <Space>
          <Button onClick={() => history.push('/erp/orders/' + orderId)}>
            取消
          </Button>
          <Button type="primary" loading={submitting} onClick={submit}>
            确认出库发货
          </Button>
        </Space>
      }
    >
      <Spin spinning={loading}>
        {!loading && order && (
          <>
            <Card style={{ marginBottom: 16 }}>
              <Descriptions column={4}>
                <Descriptions.Item label="正式订单号">
                  {order.orderNo}
                </Descriptions.Item>
                <Descriptions.Item label="客户名称">
                  {order.customerName}
                </Descriptions.Item>
                <Descriptions.Item label="商品数量">
                  {order.lines.length} 项
                </Descriptions.Item>
                <Descriptions.Item label="分配进度">
                  <Tag color={assignedCount === order.lines.length ? 'success' : 'processing'}>
                    {assignedCount}/{order.lines.length}
                  </Tag>
                </Descriptions.Item>
              </Descriptions>
            </Card>

            {order.fulfillmentStatus !== 'WAITING_DISPATCH' && (
              <Alert
                type="warning"
                showIcon
                message="当前订单已不在待出库状态，不能重复出库"
                style={{ marginBottom: 16 }}
              />
            )}

            {warehouses.length === 0 ? (
              <Card>
                <Empty description="暂无可用仓库，请先启用仓库" />
              </Card>
            ) : (
              warehouses.map((warehouse: any) => {
                const lineIds = selectedLines(warehouse.id);
                const enabled = lineIds.length > 0;
                const form = dispatchForms[warehouse.id] || {};
                return (
                  <Card
                    key={warehouse.id}
                    title={warehouse.warehouseName + ' 发货信息'}
                    extra={
                      <Typography.Text type="secondary">
                        {warehouse.warehouseCode}
                      </Typography.Text>
                    }
                    style={{ marginBottom: 20 }}
                  >
                    <Form layout="vertical">
                      <Form.Item label="出库商品" required>
                        <Select
                          mode="multiple"
                          aria-label={warehouse.warehouseName + ' 出库商品'}
                          style={{ width: '100%' }}
                          placeholder="选择该仓库要出库的商品"
                          value={lineIds}
                          options={[
                            {
                              label: '库存充足',
                              options: order.lines
                                .filter(
                                  (line: any) =>
                                    stockOf(warehouse.id, line.productId) >=
                                    Number(line.quantity),
                                )
                                .map((line: any) =>
                                  productOption(line, warehouse.id),
                                ),
                            },
                            {
                              label: '库存不足（不可选）',
                              options: order.lines
                                .filter(
                                  (line: any) =>
                                    stockOf(warehouse.id, line.productId) <
                                    Number(line.quantity),
                                )
                                .map((line: any) =>
                                  productOption(line, warehouse.id, true),
                                ),
                            },
                          ]}
                          onChange={(values) =>
                            assignLines(warehouse.id, values)
                          }
                        />
                      </Form.Item>

                      <Form.Item label="承运商 / 配送方式" required>
                        <Input
                          aria-label={warehouse.warehouseName + ' 承运商 / 配送方式'}
                          disabled={!enabled}
                          value={form.carrier || ''}
                          placeholder="例如：顺丰、专车配送"
                          onChange={(event) =>
                            updateDispatchForm(
                              warehouse.id,
                              'carrier',
                              event.target.value,
                            )
                          }
                        />
                      </Form.Item>

                      <Form.Item label="物流单号" required>
                        <Input
                          aria-label={warehouse.warehouseName + ' 物流单号'}
                          disabled={!enabled}
                          value={form.trackingNo || ''}
                          placeholder="填写该仓库对应的物流单号"
                          onChange={(event) =>
                            updateDispatchForm(
                              warehouse.id,
                              'trackingNo',
                              event.target.value,
                            )
                          }
                        />
                      </Form.Item>

                      <Form.Item label="发货备注">
                        <RichTextEditor
                          ariaLabel={warehouse.warehouseName + ' 发货备注'}
                          disabled={!enabled}
                          value={form.remark || ''}
                          placeholder="填写包装、装卸、配送等注意事项"
                          onChange={(value) =>
                            updateDispatchForm(warehouse.id, 'remark', value)
                          }
                        />
                      </Form.Item>
                    </Form>
                  </Card>
                );
              })
            )}
          </>
        )}
      </Spin>
    </PageContainer>
  );
}
