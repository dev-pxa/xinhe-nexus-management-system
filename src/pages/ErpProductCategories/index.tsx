import { PageContainer, ProTable } from '@ant-design/pro-components';
import { history } from '@umijs/max';
import { Button, Form, Input, message, Modal, Select, Space, Tag } from 'antd';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { listErpProductCategories, saveErpProductCategory, setErpProductCategoryEnabled } from '@/services/erp';

type Category = { id: number; parentId?: number; categoryCode: string; categoryName: string; status: string; productCount: number };

export default function ErpProductCategoriesPage() {
  const actionRef = useRef<ActionType>();
  const [form] = Form.useForm();
  const [rows, setRows] = useState<Category[]>([]);
  const [editing, setEditing] = useState<Category>();
  const [open, setOpen] = useState(false);

  const load = async () => {
    const data = await listErpProductCategories();
    setRows(data);
    return data;
  };
  useEffect(() => { load().catch((error: any) => message.error(error?.message || '商品分类加载失败')); }, []);

  const rootNames = useMemo(() => new Map(rows.filter((item) => !item.parentId).map((item) => [item.id, item.categoryName])), [rows]);
  const rootOptions = rows.filter((item) => !item.parentId && item.status === 'ENABLED' && item.id !== editing?.id).map((item) => ({ value: item.id, label: item.categoryName }));
  const columns: ProColumns<Category>[] = [
    { title: '分类编码', dataIndex: 'categoryCode', search: false },
    { title: '分类名称', dataIndex: 'categoryName', search: false, render: (_, row) => row.parentId ? `${rootNames.get(row.parentId) || '-'} / ${row.categoryName}` : row.categoryName },
    { title: '上级分类', dataIndex: 'parentId', search: false, render: (_, row) => row.parentId ? rootNames.get(row.parentId) || '-' : '-' },
    { title: '商品数', dataIndex: 'productCount', search: false },
    { title: '状态', dataIndex: 'status', search: false, render: (_, row) => <Tag color={row.status === 'ENABLED' ? 'green' : 'default'}>{row.status === 'ENABLED' ? '启用' : '停用'}</Tag> },
    { title: '操作', valueType: 'option', render: (_, row) => <Space>
      <a onClick={() => { setEditing(row); form.setFieldsValue(row); setOpen(true); }}>编辑</a>
      {row.categoryCode !== 'CAT-0000' && <a onClick={async () => {
        try {
          await setErpProductCategoryEnabled(row.id, row.status !== 'ENABLED');
          message.success(row.status === 'ENABLED' ? '分类已停用' : '分类已启用');
          await load(); actionRef.current?.reload();
        } catch (error: any) { message.error(error?.message || '分类状态更新失败'); }
      }}>{row.status === 'ENABLED' ? '停用' : '启用'}</a>}
    </Space> },
  ];

  return <PageContainer title="商品分类" onBack={() => history.push('/erp/basic-info/products')}>
    <ProTable<Category>
      rowKey="id" actionRef={actionRef} columns={columns} search={false} pagination={false}
      request={async () => ({ data: await load(), success: true })}
      toolBarRender={() => [<Button key="add" type="primary" onClick={() => { setEditing(undefined); form.resetFields(); setOpen(true); }}>新增分类</Button>]}
    />
    <Modal title={editing ? '编辑分类' : '新增分类'} open={open} destroyOnClose onCancel={() => setOpen(false)} onOk={() => form.submit()}>
      <Form form={form} layout="vertical" onFinish={async (values) => {
        try {
          await saveErpProductCategory(values, editing?.id);
          message.success('商品分类已保存'); setOpen(false); await load(); actionRef.current?.reload();
        } catch (error: any) { message.error(error?.message || '商品分类保存失败'); }
      }}>
        {editing && <Form.Item label="分类编码"><Input value={editing.categoryCode} disabled /></Form.Item>}
        <Form.Item name="categoryName" label="分类名称" rules={[{ required: true, whitespace: true, message: '请输入分类名称' }]}><Input maxLength={80} /></Form.Item>
        <Form.Item name="parentId" label="上级分类"><Select allowClear options={rootOptions} placeholder="不选择表示一级分类" /></Form.Item>
      </Form>
    </Modal>
  </PageContainer>;
}
