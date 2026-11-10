import { PageContainer } from '@ant-design/pro-components';
import { history, useParams } from '@umijs/max';
import { Button, Card, Form, Input, InputNumber, message, Select, Space, Spin } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { getErpProduct, listErpProductCategories, saveErpProduct } from '@/services/erp';

type Category = { id: number; parentId?: number; categoryName: string; status: string };

export default function ErpProductEditPage() {
  const { id: routeId } = useParams<{ id?: string }>();
  const productId = routeId && routeId !== 'new' ? Number(routeId) : undefined;
  const [form] = Form.useForm();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([listErpProductCategories(), productId ? getErpProduct(productId) : Promise.resolve(undefined)])
      .then(([categoryRows, product]) => {
        if (!active) return;
        setCategories(categoryRows);
        if (product) form.setFieldsValue(product);
        else form.setFieldsValue({ unitPrice: 0 });
      })
      .catch((error: any) => message.error(error?.message || '商品资料加载失败'))
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [form, productId]);

  const categoryOptions = useMemo(() => {
    const roots = new Map(categories.filter((item) => !item.parentId).map((item) => [item.id, item.categoryName]));
    return categories.map((item) => ({
      value: item.id,
      label: item.parentId ? `${roots.get(item.parentId) || '上级分类'} / ${item.categoryName}` : item.categoryName,
      disabled: item.status !== 'ENABLED',
    }));
  }, [categories]);

  const submit = async (values: any) => {
    setSaving(true);
    try {
      await saveErpProduct(values, productId);
      message.success(productId ? '商品资料已更新' : '商品已创建');
      history.push('/erp/basic-info/products');
    } catch (error: any) {
      message.error(error?.message || '商品资料保存失败');
    } finally {
      setSaving(false);
    }
  };

  return <PageContainer
    title={productId ? '编辑商品' : '新增商品'}
    onBack={() => history.push('/erp/basic-info/products')}
    extra={<Space><Button onClick={() => history.push('/erp/basic-info/products')}>取消</Button><Button type="primary" loading={saving} onClick={() => form.submit()}>保存</Button></Space>}
  >
    <Spin spinning={loading}>
      <Card style={{ maxWidth: 920, margin: '0 auto' }}>
        <Form form={form} layout="vertical" onFinish={submit}>
          <Form.Item name="version" hidden><Input /></Form.Item>
          {productId && <Form.Item name="productCode" label="商品编码"><Input disabled /></Form.Item>}
          <Form.Item name="productName" label="商品名称" rules={[{ required: true, whitespace: true, message: '请输入商品名称' }]}>
            <Input maxLength={160} placeholder="请输入商品名称" />
          </Form.Item>
          <Form.Item name="categoryId" label="商品分类" rules={[{ required: true, message: '请选择商品分类' }]}>
            <Select showSearch optionFilterProp="label" options={categoryOptions} placeholder="请选择商品分类" />
          </Form.Item>
          <Form.Item name="model" label="商品型号"><Input maxLength={120} placeholder="选填" /></Form.Item>
          <Form.Item name="specification" label="商品规格"><Input maxLength={255} placeholder="选填" /></Form.Item>
          <Form.Item name="unitPrice" label="单价" rules={[{ required: true, message: '请输入单价' }]}>
            <InputNumber min={0} precision={2} prefix="¥" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="remark" label="备注"><Input.TextArea rows={4} maxLength={1000} showCount placeholder="选填" /></Form.Item>
        </Form>
      </Card>
    </Spin>
  </PageContainer>;
}
