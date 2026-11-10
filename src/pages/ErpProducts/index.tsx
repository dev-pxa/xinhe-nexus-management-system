import { PageContainer, ProTable } from '@ant-design/pro-components';
import { history } from '@umijs/max';
import { Button, message, Space, Tag } from 'antd';
import { useEffect, useRef, useState } from 'react';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { listErpProductCategories, listErpProducts, setErpProductEnabled } from '@/services/erp';

type Category = { id: number; categoryName: string; parentId?: number; status: string };
type Product = { id: number; productCode: string; productName: string; categoryId: number; categoryName: string; model?: string; specification?: string; unitPrice: number; status: string; updatedAt?: string };

export default function ErpProductsPage() {
  const actionRef = useRef<ActionType>();
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    listErpProductCategories().then(setCategories).catch((error: any) => message.error(error?.message || '商品分类加载失败'));
  }, []);

  const categoryOptions = categories.map((item) => ({ value: item.id, label: item.status === 'ENABLED' ? item.categoryName : `${item.categoryName}（已停用）` }));
  const columns: ProColumns<Product>[] = [
    { title: '商品编码', dataIndex: 'productCode', fieldProps: { allowClear: true, placeholder: '请输入商品编码' } },
    { title: '商品名称', dataIndex: 'productName', fieldProps: { allowClear: true, placeholder: '请输入商品名称' } },
    { title: '商品分类', dataIndex: 'categoryId', valueType: 'select', fieldProps: { options: categoryOptions, allowClear: true }, render: (_, row) => row.categoryName },
    { title: '型号', dataIndex: 'model', fieldProps: { allowClear: true, placeholder: '请输入型号' }, render: (_, row) => row.model || '-' },
    { title: '规格', dataIndex: 'specification', fieldProps: { allowClear: true, placeholder: '请输入规格' }, render: (_, row) => row.specification || '-' },
    { title: '单价', dataIndex: 'unitPrice', search: false, align: 'right', render: (_, row) => `¥${Number(row.unitPrice).toFixed(2)}` },
    { title: '状态', dataIndex: 'status', valueType: 'select', valueEnum: { ENABLED: { text: '启用' }, DISABLED: { text: '停用' } }, render: (_, row) => <Tag color={row.status === 'ENABLED' ? 'green' : 'default'}>{row.status === 'ENABLED' ? '启用' : '停用'}</Tag> },
    { title: '更新时间', dataIndex: 'updatedAt', search: false, valueType: 'dateTime' },
    {
      title: '操作', valueType: 'option', width: 150,
      render: (_, row) => <Space>
        <a onClick={() => history.push(`/erp/basic-info/products/${row.id}/edit`)}>编辑</a>
        <a onClick={async () => {
          try {
            await setErpProductEnabled(row.id, row.status !== 'ENABLED');
            message.success(row.status === 'ENABLED' ? '商品已停用' : '商品已启用');
            actionRef.current?.reload();
          } catch (error: any) {
            message.error(error?.message || '商品状态更新失败');
          }
        }}>{row.status === 'ENABLED' ? '停用' : '启用'}</a>
      </Space>,
    },
  ];

  return <PageContainer title="商品资料" content="商品编号从 PRD-0001 起由系统生成；商品数量统一按正整数处理。">
    <ProTable<Product>
      rowKey="id"
      actionRef={actionRef}
      columns={columns}
      request={async ({ current: _current, pageSize: _pageSize, ...filters }) => ({ data: await listErpProducts(filters), success: true })}
      pagination={false}
      search={{ labelWidth: 80, defaultCollapsed: false }}
      toolBarRender={() => [
        <Button key="categories" onClick={() => history.push('/erp/basic-info/product-categories')}>商品分类</Button>,
        <Button key="add" type="primary" onClick={() => history.push('/erp/basic-info/products/new')}>新增商品</Button>,
      ]}
    />
  </PageContainer>;
}
