import { listAttendancePunches, listMyAttendancePunches } from '@/services/management';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { history, useParams } from '@umijs/max';
import { Button, Empty, Tag } from 'antd';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';

const typeLabel: Record<string, string> = { NORMAL: '正常打卡', IN: '上班打卡', OUT: '下班打卡' };
const sourceLabel: Record<string, string> = { WEB: '员工端', MOBILE: '移动端', ADMIN: '管理员补录', CORRECTION: '补打卡审批' };

export default function AttendanceDetailPage() {
  const { date = '', userId } = useParams<{ date: string; userId?: string }>();
  const query = new URLSearchParams(location.search);
  const companyId = Number(query.get('companyId')) || undefined;
  const displayName = query.get('name');
  const [data, setData] = useState<ManagementAPI.AttendancePunch[]>([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    setLoading(true);
    const request = userId ? listAttendancePunches({ date, userId: Number(userId), companyId }) : listMyAttendancePunches(date);
    void request.then((response) => {
      if (response.code === 0) setData(response.data || []);
    }).finally(() => setLoading(false));
  }, [companyId, date, userId]);
  return <PageContainer title={`${displayName ? `${displayName} ` : ''}${date} 打卡明细`} extra={<Button onClick={() => history.push(userId ? '/oa/all-attendance' : '/oa/attendance')}>返回打卡记录</Button>}>
    <ProTable<ManagementAPI.AttendancePunch> rowKey="id" search={false} options={false} loading={loading} dataSource={data} pagination={false} locale={{ emptyText: <Empty description="当天暂无打卡明细" /> }} columns={[
      { title: '打卡时间', dataIndex: 'punchTime', render: (value) => value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '-' },
      { title: '类型', dataIndex: 'punchType', render: (value) => typeLabel[value] || value || '-' },
      { title: '来源', dataIndex: 'source', render: (value) => <Tag>{sourceLabel[value] || value || '-'}</Tag> },
      { title: '定位', render: (_, row) => row.latitude != null && row.longitude != null ? `${Number(row.latitude).toFixed(6)}, ${Number(row.longitude).toFixed(6)}` : '-' },
      { title: '备注', dataIndex: 'remark', render: (value) => value || '-' },
    ]} />
  </PageContainer>;
}
