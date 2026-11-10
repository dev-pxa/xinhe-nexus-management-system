import { createAttendanceCorrection, listMyAttendanceCorrections } from '@/services/management';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { Button, DatePicker, Empty, Form, Input, message, Modal, Space, Tag } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import { useEffect, useState } from 'react';

const statusMeta: Record<string, [string, string]> = {
  PENDING: ['待审批', 'processing'],
  APPROVED: ['已通过', 'success'],
  REJECTED: ['已驳回', 'error'],
};
const punchTypeLabel: Record<string, string> = { NORMAL: '正常打卡', IN: '上班打卡', OUT: '下班打卡' };

export default function MyApplicationsPage() {
  const [data, setData] = useState<ManagementAPI.AttendanceCorrection[]>([]);
  const [loading, setLoading] = useState(false);
  const [reapplyOpen, setReapplyOpen] = useState(false);
  const [reapplyRow, setReapplyRow] = useState<ManagementAPI.AttendanceCorrection>();
  const [form] = Form.useForm<{ requestedPunchTime: Dayjs; reason: string }>();
  useEffect(() => {
    setLoading(true);
    void listMyAttendanceCorrections().then((response) => {
      if (response.code === 0) setData(response.data || []);
    }).finally(() => setLoading(false));
  }, []);
  const openReapply = (row: ManagementAPI.AttendanceCorrection) => {
    setReapplyRow(row);
    form.setFieldsValue({ requestedPunchTime: dayjs(row.requestedPunchTime), reason: row.reason });
    setReapplyOpen(true);
  };
  const submitReapply = async (values: { requestedPunchTime: Dayjs; reason: string }) => {
    if (!reapplyRow?.latitude || !reapplyRow.longitude) { message.error('原申请没有定位信息，请返回打卡页面重新发起申请'); return; }
    const response = await createAttendanceCorrection({ requestedPunchTime: values.requestedPunchTime.format('YYYY-MM-DD HH:mm:ss'), punchType: reapplyRow.punchType, latitude: reapplyRow.latitude, longitude: reapplyRow.longitude, accuracy: reapplyRow.locationAccuracy, locationSource: reapplyRow.locationSource || 'REAPPLY', locationAddress: reapplyRow.locationAddress, reason: values.reason });
    if (response.code !== 0) { message.error(response.message); return; }
    message.success('补打卡已重新提交');
    setReapplyOpen(false);
    setReapplyRow(undefined);
    const refreshed = await listMyAttendanceCorrections();
    if (refreshed.code === 0) setData(refreshed.data || []);
  };
  return <PageContainer title="补打卡申请" content="查看本人提交的补打卡申请及审批结果">
    <ProTable<ManagementAPI.AttendanceCorrection> rowKey="id" search={false} options={false} loading={loading} dataSource={data} pagination={{ pageSize: 10 }} locale={{ emptyText: <Empty description="暂无补打卡申请" /> }} columns={[
      { title: '补打卡日期', dataIndex: 'attendanceDate' },
      { title: '补打卡时间', dataIndex: 'requestedPunchTime' },
      { title: '类型', dataIndex: 'punchType', render: (value) => punchTypeLabel[value] || value || '-' },
      { title: '申请原因', dataIndex: 'reason' },
      { title: '申请位置', dataIndex: 'locationAddress', render: (value) => value || '-' },
      { title: '状态', dataIndex: 'status', render: (value) => { const [label, color] = statusMeta[value] || [value || '-', 'default']; return <Tag color={color}>{label}</Tag>; } },
      { title: '审批意见', dataIndex: 'reviewComment', render: (value) => value || '-' },
      { title: '操作', render: (_value, row) => row.status === 'REJECTED' ? <Button type="link" onClick={() => openReapply(row)}>重新申请</Button> : '-' },
    ]} />
    <Modal title="重新申请补打卡" open={reapplyOpen} onCancel={() => setReapplyOpen(false)} onOk={() => form.submit()}>
      <Form form={form} layout="vertical" onFinish={submitReapply}>
        <Form.Item name="requestedPunchTime" label="补打卡时间" rules={[{ required: true, message: '请选择补打卡时间' }]}><DatePicker showTime style={{ width: '100%' }} /></Form.Item>
        <Form.Item label="申请位置"><Space direction="vertical"><span>{reapplyRow?.locationAddress || '原申请定位'}</span><span style={{ color: '#999' }}>{reapplyRow?.latitude}, {reapplyRow?.longitude}</span></Space></Form.Item>
        <Form.Item name="reason" label="申请原因" rules={[{ required: true, whitespace: true, message: '请填写申请原因' }]}><Input.TextArea rows={4} maxLength={1000} /></Form.Item>
      </Form>
    </Modal>
  </PageContainer>;
}
