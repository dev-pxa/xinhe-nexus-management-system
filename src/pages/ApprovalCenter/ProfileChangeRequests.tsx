import { decideProfileChange, listPendingProfileChanges } from '@/services/profile';
import { ProfileChangeDiff } from '@/components/ProfileChangeDiff';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { Button, Form, Input, message, Modal, Space } from 'antd';
import { useCallback, useEffect, useState } from 'react';

const statusLabel: Record<string, string> = { PENDING: '待审批', APPROVED: '已通过', REJECTED: '已驳回' };
export default function ProfileChangeRequestsPage() {
  const [data, setData] = useState<ManagementAPI.ProfileChangeRequest[]>([]);
  const [rejecting, setRejecting] = useState<number>();
  const [reviewing, setReviewing] = useState<ManagementAPI.ProfileChangeRequest>();
  const [form] = Form.useForm<{ comment: string }>();
  const load = useCallback(async () => { const response = await listPendingProfileChanges(); if (response.code === 0) setData(response.data || []); }, []);
  useEffect(() => { void load(); }, [load]);
  const decide = async (id: number, approve: boolean, comment?: string) => { const response = await decideProfileChange(id, approve, comment); if (response.code !== 0) { message.error(response.message); return; } message.success(approve ? '档案变更已通过' : '档案变更已驳回'); setRejecting(undefined); setReviewing(undefined); await load(); };
  return <PageContainer title="人员档案审批" content="审批员工提交的人员档案变更，姓名、手机号和邮箱不进入审批。"><ProTable<ManagementAPI.ProfileChangeRequest> rowKey="id" search={false} options={false} dataSource={data} columns={[{ title: '申请人', dataIndex: 'applicantName' }, { title: '申请时间', dataIndex: 'createdAt' }, { title: '状态', dataIndex: 'status', render: (value) => statusLabel[value] || '未知状态' }, { title: '操作', render: (_, row) => <Button type="primary" onClick={() => setReviewing(row)}>去审核</Button> }]} /><Modal title={`审核档案变更${reviewing?.applicantName ? ` · ${reviewing.applicantName}` : ''}`} width={900} open={Boolean(reviewing)} onCancel={() => setReviewing(undefined)} footer={reviewing && <Space><Button onClick={() => setReviewing(undefined)}>取消</Button><Button danger onClick={() => { form.resetFields(); setRejecting(reviewing.id); }}>驳回</Button><Button data-testid="profile-change-approve" type="primary" onClick={() => void decide(reviewing.id, true, '同意档案变更')}>通过</Button></Space>}>{reviewing && <ProfileChangeDiff beforeData={reviewing.beforeData} afterData={reviewing.afterData} />}</Modal><Modal title="驳回档案变更" open={Boolean(rejecting)} onCancel={() => setRejecting(undefined)} onOk={() => form.submit()}><Form form={form} layout="vertical" onFinish={(values) => rejecting && void decide(rejecting, false, values.comment)}><Form.Item name="comment" label="驳回理由" rules={[{ required: true, whitespace: true, message: '请填写驳回理由' }]}><Input.TextArea rows={4} maxLength={1000} /></Form.Item></Form></Modal></PageContainer>;
}
