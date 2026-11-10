import { createOnboardingInvitation, getCurrentOnboardingLink, getEmployeeProfile, listOnboardingInvitations, regenerateOnboardingInvitation, revokeOnboardingInvitation } from '@/services/onboarding';
import { listOrganizations, listPositions } from '@/services/management';
import { CopyOutlined, EyeOutlined, PlusOutlined, ReloadOutlined, StopOutlined } from '@ant-design/icons';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { useModel } from '@umijs/max';
import { Button, Descriptions, Form, Input, message, Modal, Select, Space, Tag } from 'antd';
import { useEffect, useState } from 'react';

const statusOptions = [{ label: '待填写', value: 'PENDING' }, { label: '已提交', value: 'SUBMITTED' }, { label: '已过期', value: 'EXPIRED' }, { label: '已撤销', value: 'REVOKED' }];
const statusLabel: Record<string, string> = { PENDING: '待填写', SUBMITTED: '已提交', EXPIRED: '已过期', REVOKED: '已撤销' };

export default function EmployeePage() {
  useModel('@@initialState');
  const [rows, setRows] = useState<ManagementAPI.OnboardingInvitation[]>([]);
  const [orgs, setOrgs] = useState<ManagementAPI.Organization[]>([]);
  const [positions, setPositions] = useState<ManagementAPI.Position[]>([]);
  const [status, setStatus] = useState<string>();
  const [open, setOpen] = useState(false);
  const [link, setLink] = useState('');
  const [profile, setProfile] = useState<ManagementAPI.EmployeeProfile>();
  const [form] = Form.useForm();
  const reload = async () => { const r = await listOnboardingInvitations(status); setRows(r.data || []); };
  useEffect(() => { void reload(); listOrganizations().then((r) => setOrgs(r.data || [])); }, [status]);
  const showLink = (token: string) => setLink(`${window.location.origin}/onboarding/${token}`);
  const copy = (value: string) => navigator.clipboard.writeText(value).then(() => message.success('链接已复制'));
  const save = async () => { const values = await form.validateFields(); const r = await createOnboardingInvitation(values); setOpen(false); form.resetFields(); showLink(r.data?.token as string); await reload(); message.success('入职表单已生成'); };
  const regenerate = async (row: ManagementAPI.OnboardingInvitation) => { const r = await regenerateOnboardingInvitation(row.id); showLink(r.data?.token as string); await reload(); message.success('新链接已生成，旧链接已失效'); };
  const copyCurrent = async (row: ManagementAPI.OnboardingInvitation) => { const r = await getCurrentOnboardingLink(row.id); const value = `${window.location.origin}/onboarding/${r.data?.token as string}`; await copy(value); };
  const revoke = (row: ManagementAPI.OnboardingInvitation) => Modal.confirm({ title: `撤销“${row.candidateName}”的入职表单？`, content: '撤销后原链接立即失效，提交后不可撤销。', okType: 'danger', okText: '撤销', cancelText: '取消', onOk: async () => { await revokeOnboardingInvitation(row.id); await reload(); message.success('已撤销'); } });
  return <PageContainer title="入职信息采集" content="管理员录入姓名、部门和岗位，发送一次性表单；提交后自动生成档案并开通账号。"><ProTable rowKey="id" search={false} dataSource={rows} pagination={{ pageSize: 10 }} columns={[
    { title: '姓名', dataIndex: 'candidateName' }, { title: '部门', dataIndex: 'departmentName' }, { title: '岗位', dataIndex: 'positionName' },
    { title: '采集状态', dataIndex: 'status', render: (_, row) => <Tag color={row.status === 'SUBMITTED' ? 'success' : row.status === 'PENDING' ? 'processing' : 'default'}>{statusLabel[row.status] || row.status}</Tag> },
    { title: '账号状态', dataIndex: 'profileStatus', render: (_, row) => row.status === 'SUBMITTED' ? <Tag color="success">已开通</Tag> : <Tag>未开通</Tag> },
    { title: '提交时间', dataIndex: 'submittedAt', valueType: 'dateTime' }, { title: '有效期', dataIndex: 'expiresAt', valueType: 'dateTime' },
    { title: '操作', valueType: 'option', render: (_, row) => <Space size="small">{row.status === 'PENDING' && <Button type="link" icon={<CopyOutlined />} onClick={() => void copyCurrent(row)}>复制链接</Button>}{row.status !== 'SUBMITTED' && <Button type="link" icon={<ReloadOutlined />} onClick={() => void regenerate(row)}>重新生成</Button>}{row.status === 'PENDING' && <Button type="link" danger icon={<StopOutlined />} onClick={() => revoke(row)}>撤销</Button>}{row.status === 'SUBMITTED' && row.profileStatus === 'CREATED' && row.profileId && <Button type="link" icon={<EyeOutlined />} onClick={async () => setProfile((await getEmployeeProfile(row.profileId!)).data)}>查看档案</Button>}</Space> },
  ]} toolBarRender={() => [<Select key="status" allowClear placeholder="全部状态" style={{ width: 130 }} options={statusOptions} value={status} onChange={setStatus} />, <Button key="create" type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>新建入职人员</Button>]} />
  <Modal open={open} title="新建入职人员" onCancel={() => setOpen(false)} onOk={() => void save()} okText="生成表单" cancelText="取消"><Form form={form} layout="vertical"><Form.Item name="candidateName" label="姓名" rules={[{ required: true, message: '请输入姓名' }]}><Input /></Form.Item><Form.Item name="departmentId" label="部门" rules={[{ required: true, message: '请选择部门' }]}><Select options={orgs.map((o) => ({ label: o.orgName, value: o.id }))} onChange={() => { form.setFieldValue('positionId', undefined); setPositions([]); }} /></Form.Item><Form.Item noStyle shouldUpdate={(prev, next) => prev.departmentId !== next.departmentId}>{({ getFieldValue }) => <Form.Item name="positionId" label="岗位" rules={[{ required: true, message: '请选择岗位' }]}><Select disabled={!getFieldValue('departmentId')} onOpenChange={(visible) => { if (visible && getFieldValue('departmentId')) listPositions(undefined, getFieldValue('departmentId')).then((r) => setPositions(r.data || [])); }} options={positions.map((p) => ({ label: p.positionName, value: p.id }))} /></Form.Item>}</Form.Item></Form></Modal>
  <Modal open={Boolean(link)} title="入职表单链接" onCancel={() => setLink('')} footer={<Button onClick={() => setLink('')}>关闭</Button>}><Input value={link} readOnly addonAfter={<CopyOutlined onClick={() => void copy(link)} />} /><Button type="link" onClick={() => void copy(link)}>复制链接</Button></Modal>
  <Modal open={Boolean(profile)} title="人员档案" width={760} onCancel={() => setProfile(undefined)} footer={<Button onClick={() => setProfile(undefined)}>关闭</Button>}>{profile && <Descriptions bordered column={2}><Descriptions.Item label="姓名">{profile.candidateName}</Descriptions.Item><Descriptions.Item label="用户名">{profile.username}</Descriptions.Item><Descriptions.Item label="部门">{profile.departmentName}</Descriptions.Item><Descriptions.Item label="岗位">{profile.positionName}</Descriptions.Item><Descriptions.Item label="手机">{profile.phone || '-'}</Descriptions.Item><Descriptions.Item label="邮箱">{profile.email || '-'}</Descriptions.Item><Descriptions.Item label="教育背景" span={2}>{profile.educations?.length ? profile.educations.map((item) => `${item.startMonth} 至 ${item.endMonth} / ${item.educationLevel} / ${item.schoolName}`).join('；') : '未填写'}</Descriptions.Item></Descriptions>}</Modal></PageContainer>;
}
