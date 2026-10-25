import { createExpense, deleteExpense, listMyExpenses } from '@/services/management';
import { PlusOutlined } from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { history } from '@umijs/max';
import { Button, Empty, message, Modal, Space, Table, Tag } from 'antd';
import { useEffect, useState } from 'react';

const statusMap: Record<ManagementAPI.ExpenseClaim['status'], [string, string]> = {
  DRAFT: ['草稿', 'default'], PENDING: ['待审核', 'processing'], REVIEWING: ['审核中', 'warning'],
  APPROVED: ['审核通过', 'success'], REJECTED: ['已驳回', 'error'],
};

export default function ExpenseListPage() {
  const [records, setRecords] = useState<ManagementAPI.ExpenseClaim[]>([]);
  const [loading, setLoading] = useState(false);
  const load = async () => { setLoading(true); try { const response = await listMyExpenses(); if (response.code === 0) setRecords(response.data || []); } finally { setLoading(false); } };
  useEffect(() => { void load(); }, []);
  const create = async () => { const response = await createExpense(); if (response.code === 0 && response.data) history.push(`/oa/expense/${response.data.id}`); else message.error(response.message); };
  const remove = (row: ManagementAPI.ExpenseClaim) => Modal.confirm({ title: '删除报销单', content: `确定删除报销单 ${row.claimNo} 吗？删除后不可恢复。`, okText: '删除', okButtonProps: { danger: true }, cancelText: '取消', onOk: async () => { const response = await deleteExpense(row.id); if (response.code === 0) { message.success('报销单已删除'); await load(); } else message.error(response.message); } });
  return (
    <PageContainer title="我的报销" content="管理本人发起的报销申请">
      <Space style={{ marginBottom: 16 }}><Button type="primary" icon={<PlusOutlined />} onClick={() => void create()}>新增报销</Button></Space>
      <Table rowKey="id" loading={loading} dataSource={records} locale={{ emptyText: <Empty description="暂无报销记录" /> }}
        columns={[
          { title: '报销单号', dataIndex: 'claimNo' },
          { title: '总金额', dataIndex: 'totalAmount', render: (value: number) => `¥${Number(value || 0).toFixed(2)}` },
          { title: '状态', dataIndex: 'status', render: (value: ManagementAPI.ExpenseClaim['status']) => { const [label, color] = statusMap[value]; return <Tag color={color}>{label}</Tag>; } },
          { title: '更新时间', dataIndex: 'updatedAt' },
          { title: '操作', key: 'action', render: (_: unknown, row: ManagementAPI.ExpenseClaim) => <Space><Button type="link" onClick={() => history.push(`/oa/expense/${row.id}`)}>{row.status === 'DRAFT' || row.status === 'REJECTED' ? '编辑' : '查看'}</Button>{(row.status === 'DRAFT' || row.status === 'REJECTED') && <Button type="link" danger onClick={() => remove(row)}>删除</Button>}</Space> },
        ]}
      />
    </PageContainer>
  );
}
