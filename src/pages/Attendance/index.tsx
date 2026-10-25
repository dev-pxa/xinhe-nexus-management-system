import { listMyAttendance } from '@/services/management';
import { PageContainer } from '@ant-design/pro-components';
import { DatePicker, Empty, Table, Tag } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import { useCallback, useEffect, useMemo, useState } from 'react';

const dateFormat = 'YYYY-MM-DD';
const formatTime = (value?: string) => (value ? dayjs(value).format('MM-DD HH:mm:ss') : '-');
const statusMap: Record<ManagementAPI.AttendanceSummary['status'], [string, string]> = {
  NO_RECORD: ['无记录', 'default'], SINGLE: ['单次打卡', 'warning'], NORMAL: ['正常', 'success'],
};
const columns = [
  { title: '日期', dataIndex: 'punchDate', key: 'punchDate' },
  { title: '最早打卡', dataIndex: 'firstPunchTime', key: 'firstPunchTime', render: formatTime },
  { title: '最晚打卡', dataIndex: 'lastPunchTime', key: 'lastPunchTime', render: formatTime },
  { title: '打卡次数', dataIndex: 'punchCount', key: 'punchCount' },
  { title: '状态', dataIndex: 'status', key: 'status', render: (value: ManagementAPI.AttendanceSummary['status']) => {
    const [label, color] = statusMap[value] || ['未知', 'default'];
    return <Tag color={color}>{label}</Tag>;
  } },
];

export default function AttendancePage() {
  const [month, setMonth] = useState<Dayjs>(dayjs());
  const [records, setRecords] = useState<ManagementAPI.AttendanceSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const range = useMemo(() => ({
    from: month.startOf('month').format(dateFormat), to: month.endOf('month').format(dateFormat),
  }), [month]);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await listMyAttendance(range.from, range.to);
      if (response.code === 0) setRecords(response.data || []);
    } finally { setLoading(false); }
  }, [range]);
  useEffect(() => { void load(); }, [load]);
  return (
    <PageContainer title="我的打卡记录" content="记录每日最早和最晚打卡时间">
      <DatePicker picker="month" value={month} allowClear={false} onChange={(value) => value && setMonth(value)} />
      <Table style={{ marginTop: 16 }} rowKey={(row) => row.punchDate} loading={loading} columns={columns}
        dataSource={records} pagination={false} locale={{ emptyText: <Empty description="暂无打卡记录" /> }} />
    </PageContainer>
  );
}
