import { adminPunchAttendance, listAllAttendance, listCompanies, listUsers } from '@/services/management';
import { PageContainer } from '@ant-design/pro-components';
import { useModel } from '@umijs/max';
import { Button, Card, DatePicker, Empty, Form, Input, message, Modal, Select, Space, Table, Tag } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import { useCallback, useEffect, useMemo, useState } from 'react';

const dateFormat = 'YYYY-MM-DD';
const formatTime = (value?: string) => (value ? dayjs(value).format('MM-DD HH:mm:ss') : '-');
const statusMap: Record<ManagementAPI.AttendanceSummary['status'], [string, string]> = {
  NO_RECORD: ['无记录', 'default'], SINGLE: ['单次打卡', 'warning'], NORMAL: ['正常', 'success'],
};
const baseColumns = [
  { title: '日期', dataIndex: 'punchDate', key: 'punchDate' },
  { title: '最早打卡', dataIndex: 'firstPunchTime', key: 'firstPunchTime', render: formatTime },
  { title: '最晚打卡', dataIndex: 'lastPunchTime', key: 'lastPunchTime', render: formatTime },
  { title: '打卡次数', dataIndex: 'punchCount', key: 'punchCount' },
  { title: '状态', dataIndex: 'status', key: 'status', render: (value: ManagementAPI.AttendanceSummary['status']) => {
    const [label, color] = statusMap[value] || ['未知', 'default']; return <Tag color={color}>{label}</Tag>;
  } },
];

export default function AllAttendancePage() {
  const { initialState } = useModel('@@initialState');
  const currentUser = initialState?.currentUser;
  const isPlatform = currentUser?.roles?.includes('PLATFORM_ADMIN');
  const [month, setMonth] = useState<Dayjs>(dayjs());
  const [companyId, setCompanyId] = useState<number | undefined>(currentUser?.companyId);
  const [companies, setCompanies] = useState<ManagementAPI.Company[]>([]);
  const [users, setUsers] = useState<ManagementAPI.User[]>([]);
  const [records, setRecords] = useState<ManagementAPI.AttendanceSummary[]>([]);
  const [keyword, setKeyword] = useState('');
  const [selectedUser, setSelectedUser] = useState<number>();
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();
  const range = useMemo(() => ({ from: month.startOf('month').format(dateFormat), to: month.endOf('month').format(dateFormat) }), [month]);

  useEffect(() => {
    if (isPlatform) void listCompanies().then((response) => response.code === 0 && setCompanies(response.data || []));
  }, [isPlatform]);
  useEffect(() => {
    if (companyId) void listUsers(companyId).then((response) => response.code === 0 && setUsers(response.data || []));
    else setUsers([]);
    setSelectedUser(undefined);
  }, [companyId]);
  const load = useCallback(async () => {
    if (isPlatform && !companyId) { setRecords([]); return; }
    setLoading(true);
    try {
      const response = await listAllAttendance({ ...range, companyId, userId: selectedUser, keyword: keyword || undefined });
      if (response.code === 0) setRecords(response.data || []);
    } finally { setLoading(false); }
  }, [companyId, isPlatform, keyword, range, selectedUser]);
  useEffect(() => { void load(); }, [load]);

  const columns = [
    { title: '用户', dataIndex: 'displayName', key: 'displayName', render: (value: string, row: ManagementAPI.AttendanceSummary) => `${value || '-'}（${row.username || '-'}）` },
    { title: '组织', dataIndex: 'orgName', key: 'orgName', render: (value: string) => value || '-' },
    ...baseColumns,
  ];
  const submitManualPunch = async (values: { companyId?: number; userId: number; punchTime: Dayjs; remark?: string }) => {
    const response = await adminPunchAttendance({ companyId: values.companyId || companyId, userId: values.userId, punchTime: values.punchTime.format('YYYY-MM-DD HH:mm:ss'), remark: values.remark });
    if (response.code !== 0) throw new Error(response.message);
    message.success('已录入打卡记录'); setModalOpen(false); form.resetFields(); await load();
  };

  return (
    <PageContainer title="全部打卡记录" content="管理员可查看本公司人员记录，并为指定人员补录打卡">
      <Card>
        <Space wrap>
          {isPlatform && <Select allowClear style={{ width: 220 }} placeholder="选择公司" value={companyId} onChange={setCompanyId} options={companies.map((item) => ({ label: `${item.companyName}（${item.companyCode}）`, value: item.id }))} />}
          <DatePicker picker="month" value={month} allowClear={false} onChange={(value) => value && setMonth(value)} />
          <Select allowClear showSearch style={{ width: 220 }} placeholder="筛选用户" value={selectedUser} onChange={setSelectedUser} options={users.map((item) => ({ label: `${item.displayName}（${item.username}）`, value: item.id }))} />
          <Input.Search allowClear placeholder="姓名或用户名" style={{ width: 220 }} value={keyword} onChange={(event) => setKeyword(event.target.value)} onSearch={() => void load()} />
          <Button type="primary" onClick={() => setModalOpen(true)} disabled={!companyId}>录入打卡</Button>
        </Space>
      </Card>
      <Table style={{ marginTop: 16 }} rowKey={(row) => `${row.userId}-${row.punchDate}`} loading={loading} columns={columns} dataSource={records} pagination={{ pageSize: 20 }} locale={{ emptyText: <Empty description="暂无打卡记录" /> }} />
      <Modal title="录入指定人员打卡" open={modalOpen} onCancel={() => setModalOpen(false)} onOk={() => form.submit()}>
        <Form form={form} layout="vertical" onFinish={submitManualPunch} initialValues={{ companyId, punchTime: dayjs() }}>
          {isPlatform && <Form.Item name="companyId" label="公司" rules={[{ required: true, message: '请选择公司' }]}><Select options={companies.map((item) => ({ label: item.companyName, value: item.id }))} onChange={(value) => { setCompanyId(value); form.setFieldValue('userId', undefined); }} /></Form.Item>}
          <Form.Item name="userId" label="人员" rules={[{ required: true, message: '请选择人员' }]}><Select showSearch optionFilterProp="label" options={users.map((item) => ({ label: `${item.displayName}（${item.username}）`, value: item.id }))} /></Form.Item>
          <Form.Item name="punchTime" label="打卡时间" rules={[{ required: true, message: '请选择打卡时间' }]}><DatePicker showTime style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="remark" label="备注"><Input.TextArea rows={3} maxLength={255} /></Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
}
