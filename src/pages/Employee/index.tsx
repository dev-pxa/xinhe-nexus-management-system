import { listOrganizations, listPositions } from '@/services/management';
import {
  createOnboardingInvitation,
  getCurrentOnboardingLink,
  getEmployeeProfile,
  listOnboardingInvitations,
  regenerateOnboardingInvitation,
  revokeOnboardingInvitation,
} from '@/services/onboarding';
import { updateEmployeeProfile } from '@/services/profile';
import {
  CopyOutlined,
  EyeOutlined,
  PlusOutlined,
  ReloadOutlined,
  StopOutlined,
} from '@ant-design/icons';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { useModel } from '@umijs/max';
import {
  Alert,
  Button,
  Descriptions,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Select,
  Space,
  Tag,
  Typography,
} from 'antd';
import { useEffect, useState } from 'react';

const statusOptions = [
  { label: '待填写', value: 'PENDING' },
  { label: '已提交', value: 'SUBMITTED' },
  { label: '已过期', value: 'EXPIRED' },
  { label: '已撤销', value: 'REVOKED' },
];
const statusLabel: Record<string, string> = {
  PENDING: '待填写',
  SUBMITTED: '已提交',
  EXPIRED: '已过期',
  REVOKED: '已撤销',
};
const genderLabel: Record<string, string> = {
  MALE: '男',
  FEMALE: '女',
  OTHER: '其他',
};
const idTypeLabel: Record<string, string> = {
  ID_CARD: '身份证',
  OTHER: '其他证件',
};
const educationLevelLabel: Record<string, string> = {
  HIGH_SCHOOL: '高中',
  SECONDARY: '中专',
  COLLEGE: '大专',
  BACHELOR: '本科',
  MASTER: '硕士',
  DOCTOR: '博士',
  OTHER: '其他',
};
const profileStatusLabel: Record<string, string> = {
  LOCKED: '已锁定',
  ACTIVE: '已启用',
  DISABLED: '已停用',
};

const CopyValue = ({ value, label }: { value?: string; label: string }) => {
  if (!value) return <span>-</span>;
  const copyValue = async () => {
    try {
      await navigator.clipboard.writeText(value);
      message.success(`${label}已复制`);
    } catch {
      message.error(`${label}复制失败，请手动复制`);
    }
  };
  return (
    <Space size={4}>
      <Typography.Text>{value}</Typography.Text>
      <Button
        type="link"
        size="small"
        icon={<CopyOutlined />}
        onClick={() => void copyValue()}
        aria-label={`复制${label}`}
      />
    </Space>
  );
};

export default function EmployeePage() {
  useModel('@@initialState');
  const [rows, setRows] = useState<ManagementAPI.OnboardingInvitation[]>([]);
  const [orgs, setOrgs] = useState<ManagementAPI.Organization[]>([]);
  const [positions, setPositions] = useState<ManagementAPI.Position[]>([]);
  const [status, setStatus] = useState<string>();
  const [open, setOpen] = useState(false);
  const [link, setLink] = useState('');
  const [linkExpiryDays, setLinkExpiryDays] = useState<number>();
  const [regenerateRow, setRegenerateRow] =
    useState<ManagementAPI.OnboardingInvitation>();
  const [regenerateDays, setRegenerateDays] = useState(7);
  const [profile, setProfile] = useState<ManagementAPI.EmployeeProfile>();
  const [editingProfile, setEditingProfile] =
    useState<ManagementAPI.EmployeeProfile>();
  const [profileForm] = Form.useForm();
  const [form] = Form.useForm();
  const reload = async () => {
    const r = await listOnboardingInvitations(status);
    setRows(r.data || []);
  };
  useEffect(() => {
    void reload();
    listOrganizations().then((r) => setOrgs(r.data || []));
  }, [status]);
  const onboardingLink = (token: string) =>
    `${window.location.origin}/onboarding/${token}`;
  const showLink = (token: string, expiresInDays?: number) => {
    setLink(onboardingLink(token));
    setLinkExpiryDays(expiresInDays);
  };
  const copy = (value: string) =>
    navigator.clipboard
      .writeText(value)
      .then(() => message.success('链接已复制'));
  const save = async () => {
    const values = await form.validateFields();
    const r = await createOnboardingInvitation(values);
    setOpen(false);
    form.resetFields();
    showLink(r.data?.token as string, r.data?.expiresInDays as number);
    await reload();
    message.success('入职表单已生成');
  };
  const regenerate = async () => {
    if (!regenerateRow) return;
    const r = await regenerateOnboardingInvitation(
      regenerateRow.id,
      regenerateDays,
    );
    setRegenerateRow(undefined);
    showLink(r.data?.token as string, r.data?.expiresInDays as number);
    await reload();
    message.success('新链接已生成，旧链接已失效');
  };
  const copyCurrent = async (row: ManagementAPI.OnboardingInvitation) => {
    const r = await getCurrentOnboardingLink(row.id);
    await copy(onboardingLink(r.data?.token as string));
  };
  const revoke = (row: ManagementAPI.OnboardingInvitation) =>
    Modal.confirm({
      title: `撤销“${row.candidateName}”的入职表单？`,
      content: '撤销后原链接立即失效，提交后不可撤销。',
      okType: 'danger',
      okText: '撤销',
      cancelText: '取消',
      onOk: async () => {
        await revokeOnboardingInvitation(row.id);
        await reload();
        message.success('已撤销');
      },
    });
  return (
    <PageContainer
      title="入职信息采集"
      content="管理员录入姓名、部门和岗位，发送一次性表单；提交后自动生成档案并开通账号。"
    >
      <ProTable
        rowKey="id"
        search={false}
        dataSource={rows}
        pagination={{ pageSize: 10 }}
        columns={[
          { title: '姓名', dataIndex: 'candidateName' },
          { title: '部门', dataIndex: 'departmentName' },
          { title: '岗位', dataIndex: 'positionName' },
          {
            title: '采集状态',
            dataIndex: 'status',
            render: (_, row) => (
              <Tag
                color={
                  row.status === 'SUBMITTED'
                    ? 'success'
                    : row.status === 'PENDING'
                    ? 'processing'
                    : 'default'
                }
              >
                {statusLabel[row.status] || '未知状态'}
              </Tag>
            ),
          },
          {
            title: '账号状态',
            dataIndex: 'profileStatus',
            render: (_, row) =>
              row.status === 'SUBMITTED' ? (
                <Tag color="success">已开通</Tag>
              ) : (
                <Tag>未开通</Tag>
              ),
          },
          {
            title: '提交时间',
            dataIndex: 'submittedAt',
            valueType: 'dateTime',
          },
          {
            title: '截止时间',
            dataIndex: 'expiresAt',
            valueType: 'dateTime',
            render: (_, row) => (
              <Space direction="vertical" size={0}>
                <span>{row.expiresAt}</span>
                {row.status === 'PENDING' && (
                  <Typography.Text type="secondary">
                    请在截止时间前提交
                  </Typography.Text>
                )}
              </Space>
            ),
          },
          {
            title: '操作',
            valueType: 'option',
            render: (_, row) => (
              <Space size="small">
                {row.status === 'PENDING' && (
                  <Button
                    type="link"
                    icon={<CopyOutlined />}
                    onClick={() => void copyCurrent(row)}
                  >
                    复制链接
                  </Button>
                )}
                {row.status !== 'SUBMITTED' && (
                  <Button
                    type="link"
                    icon={<ReloadOutlined />}
                    onClick={() => {
                      setRegenerateDays(7);
                      setRegenerateRow(row);
                    }}
                  >
                    重新生成
                  </Button>
                )}
                {row.status === 'PENDING' && (
                  <Button
                    type="link"
                    danger
                    icon={<StopOutlined />}
                    onClick={() => revoke(row)}
                  >
                    撤销
                  </Button>
                )}
                {row.status === 'SUBMITTED' &&
                  row.profileStatus === 'CREATED' &&
                  row.profileId && (
                    <Button
                      type="link"
                      icon={<EyeOutlined />}
                      onClick={async () =>
                        setProfile(
                          (await getEmployeeProfile(row.profileId!)).data,
                        )
                      }
                    >
                      查看档案
                    </Button>
                  )}
              </Space>
            ),
          },
        ]}
        toolBarRender={() => [
          <Select
            key="status"
            allowClear
            placeholder="全部状态"
            style={{ width: 130 }}
            options={statusOptions}
            value={status}
            onChange={setStatus}
          />,
          <Button
            key="create"
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setOpen(true)}
          >
            新建入职人员
          </Button>,
        ]}
      />
      <Modal
        open={open}
        title="新建入职人员"
        onCancel={() => setOpen(false)}
        onOk={() => void save()}
        okText="生成表单"
        cancelText="取消"
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ expiresInDays: 7 }}
        >
          <Form.Item
            name="candidateName"
            label="姓名"
            rules={[{ required: true, message: '请输入姓名' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="departmentId"
            label="部门"
            rules={[{ required: true, message: '请选择部门' }]}
          >
            <Select
              options={orgs.map((o) => ({ label: o.orgName, value: o.id }))}
              onChange={() => {
                form.setFieldValue('positionId', undefined);
                setPositions([]);
              }}
            />
          </Form.Item>
          <Form.Item
            noStyle
            shouldUpdate={(prev, next) =>
              prev.departmentId !== next.departmentId
            }
          >
            {({ getFieldValue }) => (
              <Form.Item
                name="positionId"
                label="岗位"
                rules={[{ required: true, message: '请选择岗位' }]}
              >
                <Select
                  disabled={!getFieldValue('departmentId')}
                  onOpenChange={(visible) => {
                    if (visible && getFieldValue('departmentId'))
                      listPositions(
                        undefined,
                        getFieldValue('departmentId'),
                      ).then((r) => setPositions(r.data || []));
                  }}
                  options={positions.map((p) => ({
                    label: p.positionName,
                    value: p.id,
                  }))}
                />
              </Form.Item>
            )}
          </Form.Item>
          <Form.Item
            name="expiresInDays"
            label="链接有效期（天）"
            rules={[{ required: true, message: '请输入有效期' }]}
            extra="支持 1–30 天，截止时间按北京时间计算"
          >
            <InputNumber
              min={1}
              max={30}
              precision={0}
              style={{ width: '100%' }}
            />
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        open={Boolean(link)}
        title="入职表单链接"
        onCancel={() => {
          setLink('');
          setLinkExpiryDays(undefined);
        }}
        footer={<Button onClick={() => setLink('')}>关闭</Button>}
      >
        <Alert
          type="info"
          showIcon
          message={`链接有效期：${
            linkExpiryDays || 7
          } 天，请通过安全方式发送给候选人`}
          style={{ marginBottom: 12 }}
        />
        <Input
          value={link}
          readOnly
          addonAfter={<CopyOutlined onClick={() => void copy(link)} />}
        />
        <Button type="link" onClick={() => void copy(link)}>
          复制链接
        </Button>
      </Modal>
      <Modal
        open={Boolean(regenerateRow)}
        title="重新生成入职链接"
        onCancel={() => setRegenerateRow(undefined)}
        onOk={() => void regenerate()}
        okText="确认生成"
        cancelText="取消"
      >
        <Alert
          type="warning"
          showIcon
          message="生成后原链接会立即失效，请确认候选人尚未使用旧链接。"
          style={{ marginBottom: 16 }}
        />
        <Form layout="vertical">
          <Form.Item
            label="新链接有效期（天）"
            extra="支持 1–30 天，截止时间按北京时间计算"
          >
            <InputNumber
              min={1}
              max={30}
              precision={0}
              value={regenerateDays}
              onChange={(value) => setRegenerateDays(value || 7)}
              style={{ width: '100%' }}
            />
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        open={Boolean(profile)}
        title="人员档案"
        width={900}
        onCancel={() => setProfile(undefined)}
        footer={
          <Space>
            <Button
              onClick={() => {
                if (profile) {
                  profileForm.setFieldsValue({
                    ...profile,
                    displayName: profile.candidateName,
                  });
                  setEditingProfile(profile);
                }
              }}
            >
              编辑档案
            </Button>
            <Button onClick={() => setProfile(undefined)}>关闭</Button>
          </Space>
        }
      >
        {profile && (
          <Descriptions bordered column={2}>
            <Descriptions.Item label="姓名">
              <CopyValue value={profile.candidateName} label="姓名" />
            </Descriptions.Item>
            <Descriptions.Item label="用户名">
              <CopyValue value={profile.username} label="用户名" />
            </Descriptions.Item>
            <Descriptions.Item label="部门">
              <CopyValue value={profile.departmentName} label="部门" />
            </Descriptions.Item>
            <Descriptions.Item label="岗位">
              <CopyValue value={profile.positionName} label="岗位" />
            </Descriptions.Item>
            <Descriptions.Item label="性别">
              {genderLabel[profile.gender || ''] || '未知性别'}
            </Descriptions.Item>
            <Descriptions.Item label="出生日期">
              <CopyValue value={profile.birthDate} label="出生日期" />
            </Descriptions.Item>
            <Descriptions.Item label="证件类型">
              {idTypeLabel[profile.idType || ''] || '未知证件类型'}
            </Descriptions.Item>
            <Descriptions.Item label="证件号码">
              已登记（原件不在接口中返回）
            </Descriptions.Item>
            <Descriptions.Item label="手机号">
              <CopyValue value={profile.phone} label="手机号" />
            </Descriptions.Item>
            <Descriptions.Item label="邮箱">
              <CopyValue value={profile.email} label="邮箱" />
            </Descriptions.Item>
            <Descriptions.Item label="居住地址" span={2}>
              <CopyValue value={profile.address} label="居住地址" />
            </Descriptions.Item>
            <Descriptions.Item label="紧急联系人">
              <CopyValue
                value={profile.emergencyContactName}
                label="紧急联系人"
              />
            </Descriptions.Item>
            <Descriptions.Item label="联系人关系">
              <CopyValue
                value={profile.emergencyContactRelation}
                label="联系人关系"
              />
            </Descriptions.Item>
            <Descriptions.Item label="联系人电话">
              <CopyValue
                value={profile.emergencyContactPhone}
                label="联系人电话"
              />
            </Descriptions.Item>
            <Descriptions.Item label="档案状态">
              {profileStatusLabel[profile.status || ''] || '未知状态'}
            </Descriptions.Item>
            <Descriptions.Item label="提交时间">
              {profile.submittedAt || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="教育背景" span={2}>
              {profile.educations?.length ? (
                <Space direction="vertical" size={4}>
                  {profile.educations.map((item, index) => {
                    const educationLabel =
                      educationLevelLabel[item.educationLevel] || '未知学历';
                    return (
                      <div
                        key={`${item.schoolName}-${item.startMonth}-${index}`}
                      >
                        <Tag color="blue">{educationLabel}</Tag>
                        <CopyValue
                          value={`${item.startMonth} 至 ${item.endMonth} / ${educationLabel} / ${item.schoolName}`}
                          label="教育背景"
                        />
                      </div>
                    );
                  })}
                </Space>
              ) : (
                '未填写'
              )}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
      <Modal
        open={Boolean(editingProfile)}
        title="编辑人员档案"
        width={800}
        onCancel={() => setEditingProfile(undefined)}
        onOk={() => profileForm.submit()}
        okText="保存"
        cancelText="取消"
      >
        <Form
          form={profileForm}
          layout="vertical"
          onFinish={async (values) => {
            if (!editingProfile) return;
            const response = await updateEmployeeProfile(
              editingProfile.id,
              values,
            );
            if (response.code !== 0) {
              message.error(response.message);
              return;
            }
            message.success('人员档案已更新');
            setEditingProfile(undefined);
            setProfile(response.data);
            await reload();
          }}
        >
          <Form.Item
            name="displayName"
            label="姓名"
            rules={[{ required: true, message: '请输入姓名' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="phone" label="手机号">
            <Input />
          </Form.Item>
          <Form.Item
            name="email"
            label="邮箱"
            rules={[{ type: 'email', message: '邮箱格式不正确' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="gender" label="性别">
            <Select
              allowClear
              options={[
                { label: '男', value: 'MALE' },
                { label: '女', value: 'FEMALE' },
                { label: '其他', value: 'OTHER' },
              ]}
            />
          </Form.Item>
          <Form.Item name="birthDate" label="出生日期">
            <Input type="date" />
          </Form.Item>
          <Form.Item name="idType" label="证件类型">
            <Select
              allowClear
              options={[
                { label: '身份证', value: 'ID_CARD' },
                { label: '其他证件', value: 'OTHER' },
              ]}
            />
          </Form.Item>
          <Form.Item name="address" label="居住地址">
            <Input.TextArea />
          </Form.Item>
          <Form.Item name="emergencyContactName" label="紧急联系人">
            <Input />
          </Form.Item>
          <Form.Item name="emergencyContactRelation" label="联系人关系">
            <Input />
          </Form.Item>
          <Form.Item name="emergencyContactPhone" label="联系人电话">
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
}
