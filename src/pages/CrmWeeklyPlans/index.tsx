import { deleteWeeklyPlan, listCrmEligibleUsers, listWeeklyPlans } from '@/services/crm';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { history, useLocation, useModel } from '@umijs/max';
import { Button, DatePicker, message, Modal, Select, Space, Tag } from 'antd';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';

/** 每周计划列表：筛选、摘要和操作与每日计划保持一致。 */
export default function CrmWeeklyPlansPage() {
  const userId = useModel('@@initialState').initialState?.currentUser?.id;
  const location = useLocation();
  const query = new URLSearchParams(location.search);
  const [month, setMonth] = useState(() => query.get('year') && query.get('month') ? dayjs(`${query.get('year')}-${String(query.get('month')).padStart(2, '0')}-01`) : dayjs());
  const [refresh, setRefresh] = useState(0);
  const [ownerUserId, setOwnerUserId] = useState<number | undefined>();
  const [owners, setOwners] = useState<any[]>([]);
  const monthQuery = `?year=${month.year()}&month=${month.month() + 1}`;
  useEffect(() => { void listCrmEligibleUsers().then((response) => setOwners(response.data || [])); }, []);

  const create = async () => {
    const monday = currentMonday();
    const response = await listWeeklyPlans(monday.year(), monday.month() + 1, { page: 1, pageSize: 1, ownerUserId: userId });
    const existing = (response.data?.data || []).find((row: any) => String(row.weekStart).slice(0, 10) === monday.format('YYYY-MM-DD'));
    if (existing) {
      Modal.confirm({ title: '本周已经有每周计划', content: '是否继续编辑本周的计划？', okText: '继续编辑', cancelText: '暂不编辑', onOk: () => history.push(`/crm/weekly-plans/${existing.id}${monthQuery}`) });
      return;
    }
    history.push(`/crm/weekly-plans/new${monthQuery}`);
  };

  return <PageContainer title="每周计划" content="按周制定和回顾工作计划；每周周期为周一至周日。">
    <ProTable<any>
      rowKey="id" key={`${refresh}-${month.format('YYYY-MM')}-${ownerUserId || ''}`} search={false} options={false}
      request={async ({ current = 1, pageSize = 20 }) => { const r = await listWeeklyPlans(month.year(), month.month() + 1, { page: current, pageSize, ownerUserId }); const result = r.data || {}; return { data: result.data || [], success: true, total: result.total || 0 }; }}
      toolBarRender={() => [<DatePicker key="month" picker="month" value={month} onChange={(value) => value && setMonth(value)} allowClear={false} />, <Select key="owner" allowClear placeholder="按归属筛选" style={{ width: 180 }} value={ownerUserId} onChange={setOwnerUserId} options={owners.map((owner) => ({ value: owner.id, label: owner.name }))} />, <Button key="add" type="primary" onClick={() => void create()}>新增本周计划</Button>]}
      columns={[
        { title: '计划周期', dataIndex: 'weekStart', render: (_, row) => `${String(row.weekStart).slice(0, 10)} 至 ${String(row.weekEnd).slice(0, 10)}` },
        { title: '归属', dataIndex: 'ownerName', render: (_, row) => <span>{row.ownerName || '未知用户'}{row.ownerStatus === 'DEPARTED' && <Tag color="error" bordered={false} style={{ marginLeft: 4 }}>已离职</Tag>}</span> },
        { title: '计划数量', dataIndex: 'planCount' },
        { title: '延期数量', dataIndex: 'delayedCount' },
        { title: '完成率', dataIndex: 'completionRate', render: (value) => value === 0 || value === null || value === undefined ? '—' : `${value}%` },
        { title: '关联客户数量', dataIndex: 'associatedCustomerCount' },
        { title: '操作', valueType: 'option', render: (_, row) => <Space>
          <Button type="link" size="small" style={{ padding: 0 }} onClick={() => history.push(`/crm/weekly-plans/view/${row.id}${monthQuery}`)}>查看</Button>
          {row.ownerUserId === userId && !dayjs(String(row.weekEnd).slice(0, 10)).isBefore(dayjs(), 'day') && <>
            <Button type="link" size="small" style={{ padding: 0 }} onClick={() => history.push(`/crm/weekly-plans/${row.id}${monthQuery}`)}>编辑</Button>
            <Button type="link" danger size="small" style={{ padding: 0 }} onClick={() => Modal.confirm({ title: '确认删除这条每周计划？', content: '删除后该计划及其计划项将被永久删除。', okText: '删除计划', okType: 'danger', cancelText: '取消', onOk: async () => { await deleteWeeklyPlan(row.id); message.success('每周计划已删除'); setRefresh((value) => value + 1); } })}>删除</Button>
          </>}
        </Space> },
      ]}
    />
  </PageContainer>;
}

function currentMonday() { const today = dayjs(); return today.subtract((today.day() + 6) % 7, 'day'); }
