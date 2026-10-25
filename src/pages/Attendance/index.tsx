import { listAllAttendance, listMyAttendance, punchAttendance } from '@/services/management';
import { ClockCircleOutlined } from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { useModel } from '@umijs/max';
import { Button, Card, DatePicker, Empty, message, Space, Table, Tag } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import { useCallback, useEffect, useMemo, useState } from 'react';

const dateFormat = 'YYYY-MM-DD';

const formatTime = (value?: string) => (value ? dayjs(value).format('MM-DD HH:mm:ss') : '-');

const statusMap: Record<ManagementAPI.AttendanceSummary['status'], [string, string]> = {
  NO_RECORD: ['无记录', 'default'],
  SINGLE: ['单次打卡', 'warning'],
  NORMAL: ['正常', 'success'],
};

const columns = [
  { title: '日期', dataIndex: 'punchDate', key: 'punchDate' },
  { title: '最早打卡', dataIndex: 'firstPunchTime', key: 'firstPunchTime', render: formatTime },
  { title: '最晚打卡', dataIndex: 'lastPunchTime', key: 'lastPunchTime', render: formatTime },
  { title: '打卡次数', dataIndex: 'punchCount', key: 'punchCount' },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    render: (value: ManagementAPI.AttendanceSummary['status']) => {
      const [label, color] = statusMap[value] || ['未知', 'default'];
      return <Tag color={color}>{label}</Tag>;
    },
  },
];

const adminColumns = [
  { title: '用户', dataIndex: 'displayName', key: 'displayName', render: (value: string, row: ManagementAPI.AttendanceSummary) => `${value || '-'}（${row.username || '-'}）` },
  { title: '组织', dataIndex: 'orgName', key: 'orgName', render: (value: string) => value || '-' },
  ...columns,
];

export default function AttendancePage() {
  const { initialState } = useModel('@@initialState');
  const currentUser = initialState?.currentUser;
  const isAdmin = Boolean(currentUser?.roles?.some((role) => ['PLATFORM_ADMIN', 'COMPANY_ADMIN'].includes(role)));
  const [month, setMonth] = useState<Dayjs>(dayjs());
  const [mine, setMine] = useState<ManagementAPI.AttendanceSummary[]>([]);
  const [all, setAll] = useState<ManagementAPI.AttendanceSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [punching, setPunching] = useState(false);

  const range = useMemo(() => ({
    from: month.startOf('month').format(dateFormat),
    to: month.endOf('month').format(dateFormat),
  }), [month]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [mineResponse, allResponse] = await Promise.all([
        listMyAttendance(range.from, range.to),
        isAdmin ? listAllAttendance({ ...range, companyId: currentUser?.companyId }) : Promise.resolve(undefined),
      ]);
      if (mineResponse.code === 0) setMine(mineResponse.data || []);
      if (allResponse?.code === 0) setAll(allResponse.data || []);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.companyId, isAdmin, range]);

  useEffect(() => { void load(); }, [load]);

  const handlePunch = async () => {
    setPunching(true);
    try {
      const response = await punchAttendance();
      if (response.code !== 0) throw new Error(response.message);
      message.success(`打卡成功，时间 ${formatTime(response.data?.firstPunchTime)}`);
      await load();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '打卡失败');
    } finally {
      setPunching(false);
    }
  };

  return (
    <PageContainer title="打卡记录" content="记录每日最早和最晚打卡时间">
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Card>
          <Space wrap>
            <Button type="primary" icon={<ClockCircleOutlined />} loading={punching} onClick={handlePunch}>
              立即打卡
            </Button>
            <DatePicker picker="month" value={month} allowClear={false} onChange={(value) => value && setMonth(value)} />
            <span style={{ color: '#667085' }}>每次打卡都会保留原始记录，列表展示当天最早和最晚时间。</span>
          </Space>
        </Card>
        <Card title={`${month.format('YYYY年MM月')} 我的打卡`}>
          <Table rowKey={(row) => row.punchDate} loading={loading} columns={columns} dataSource={mine} pagination={false} locale={{ emptyText: <Empty description="暂无打卡记录" /> }} />
        </Card>
        {isAdmin && (
          <Card title="全部人员打卡记录">
            <Table rowKey={(row) => `${row.userId}-${row.punchDate}`} loading={loading} columns={adminColumns} dataSource={all} pagination={{ pageSize: 20 }} locale={{ emptyText: <Empty description="暂无打卡记录" /> }} />
          </Card>
        )}
      </Space>
    </PageContainer>
  );
}
