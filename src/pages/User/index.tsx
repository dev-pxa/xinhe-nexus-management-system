import {
  createUser,
  deleteUser,
  getUserPositions,
  listCompanies,
  listPositions,
  listUsers,
  resetUserPassword,
  setUserPositions,
  updateUser,
} from '@/services/management';
import { PASSWORD_REQUIREMENT, validatePassword } from '@/utils/password';
import { KeyOutlined, PlusOutlined, TeamOutlined } from '@ant-design/icons';
import type { ProColumns } from '@ant-design/pro-components';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { useModel } from '@umijs/max';
import {
  Alert,
  Button,
  Form,
  Input,
  message,
  Modal,
  Select,
  Space,
  Switch,
  Tag,
} from 'antd';
import { useEffect, useState } from 'react';

export default function UserPage() {
  const { initialState } = useModel('@@initialState');
  const currentUser = initialState?.currentUser;
  const platform = currentUser?.roles.includes('PLATFORM_ADMIN');
  const canDeleteUsers = Boolean(
    platform ||
      currentUser?.roles.includes('COMPANY_ADMIN') ||
      currentUser?.permissions.includes('*') ||
      currentUser?.permissions.includes('system:user:delete'),
  );
  const [companies, setCompanies] = useState<ManagementAPI.Company[]>([]);
  const [companyId, setCompanyId] = useState<number | undefined>(
    initialState?.currentUser?.companyId,
  );
  const [users, setUsers] = useState<ManagementAPI.User[]>([]);
  const [positions, setPositions] = useState<ManagementAPI.Position[]>([]);
  const [editing, setEditing] = useState<ManagementAPI.User>();
  const [open, setOpen] = useState(false);
  const [positionUser, setPositionUser] = useState<ManagementAPI.User>();
  const [positionOpen, setPositionOpen] = useState(false);
  const [resetUser, setResetUser] = useState<ManagementAPI.User>();
  const [resetOpen, setResetOpen] = useState(false);
  const [form] = Form.useForm();
  const [positionForm] = Form.useForm();
  const [resetForm] = Form.useForm();

  const reload = async (targetCompanyId = companyId) => {
    if (!targetCompanyId && platform) return;
    const [userResponse, positionResponse] = await Promise.all([
      listUsers(platform ? targetCompanyId : undefined),
      listPositions(platform ? targetCompanyId : undefined),
    ]);
    setUsers(userResponse.data || []);
    setPositions(positionResponse.data || []);
  };

  useEffect(() => {
    if (platform) {
      listCompanies().then((response) => {
        const values = response.data || [];
        setCompanies(values);
        const first = values[0]?.id;
        setCompanyId(first);
        if (first) reload(first);
      });
    } else reload();
  }, []);

  const save = async () => {
    const values = await form.validateFields();
    if (editing) {
      await updateUser(editing.id, { ...values, version: editing.version });
      message.success('用户已更新');
    } else {
      await createUser({
        ...values,
        companyId: platform ? companyId : undefined,
      });
      message.success('用户已创建');
    }
    setOpen(false);
    await reload();
  };

  const columns: ProColumns<ManagementAPI.User>[] = [
    { title: '用户名', dataIndex: 'username', copyable: true },
    { title: '用户姓名', dataIndex: 'displayName' },
    ...(platform
      ? [
          {
            title: '公司',
            dataIndex: 'companyName',
          } as ProColumns<ManagementAPI.User>,
        ]
      : []),
    { title: '岗位', dataIndex: 'positionNames', ellipsis: true },
    { title: '手机号', dataIndex: 'phone' },
    {
      title: '身份',
      render: (_, row) =>
        row.companyAdmin ? (
          <Tag color="blue">公司管理员</Tag>
        ) : (
          <Tag>普通用户</Tag>
        ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      render: (_, row) => (
        <Tag color={row.status === 'ENABLED' ? 'success' : 'default'}>
          {row.status === 'ENABLED' ? '启用' : '停用'}
        </Tag>
      ),
    },
    { title: '最后登录', dataIndex: 'lastLoginAt', valueType: 'dateTime' },
    {
      title: '操作',
      valueType: 'option',
      render: (_, row) => [
        <Button
          key="edit"
          type="link"
          size="small"
          style={{ padding: 0 }}
          onClick={() => {
            setEditing(row);
            form.setFieldsValue(row);
            setOpen(true);
          }}
        >
          编辑
        </Button>,
        <a
          key="positions"
          onClick={async () => {
            const response = await getUserPositions(row.id);
            const current = response.data || [];
            positionForm.setFieldsValue({
              positionIds: current.map((item) => item.positionId),
            });
            setPositionUser(row);
            setPositionOpen(true);
          }}
        >
          岗位
        </a>,
        ...(canDeleteUsers && row.id !== currentUser?.id
          ? [
              <Button
                key="delete"
                type="link"
                danger
                size="small"
                style={{ padding: 0 }}
                onClick={() =>
                  Modal.confirm({
                    title: `确认删除用户“${row.displayName}”？`,
                    content:
                      '将解除该用户在当前公司的成员和岗位关系；如果该用户不属于其他公司，其账号将被软删除。历史业务记录会保留。',
                    okText: '删除用户',
                    okType: 'danger',
                    cancelText: '取消',
                    onOk: async () => {
                      await deleteUser(row.id, platform ? companyId : undefined);
                      message.success('用户已删除');
                      await reload();
                    },
                  })
                }
              >
                删除
              </Button>,
            ]
          : []),
      ],
    },
  ];

  return (
    <PageContainer
      title="用户管理"
      content="管理各公司用户、管理员身份和岗位。密码仅保存 BCrypt 哈希，重置后旧会话立即失效。"
      extra={
        platform ? (
          <Select
            value={companyId}
            style={{ width: 260 }}
            options={companies.map((item) => ({
              label: item.companyName,
              value: item.id,
            }))}
            onChange={(value) => {
              setCompanyId(value);
              reload(value);
            }}
          />
        ) : null
      }
    >
      <ProTable
        rowKey="id"
        search={false}
        dataSource={users}
        columns={columns}
        pagination={false}
        toolBarRender={() => [
          <Button
            key="create"
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditing(undefined);
              form.resetFields();
              form.setFieldsValue({ status: 'ENABLED', companyAdmin: false });
              setOpen(true);
            }}
          >
            新建用户
          </Button>,
        ]}
      />

      <Modal
        title={editing ? '编辑用户' : '新建用户'}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={save}
        destroyOnClose
      >
        <Form form={form} layout="vertical" preserve={false}>
          {!editing && (
            <Alert
              type="info"
              showIcon
              message="初始密码：xinhe123."
              description="系统将自动设置初始密码，无需手工填写。请提醒用户首次登录后及时修改密码。"
              style={{ marginBottom: 16 }}
            />
          )}
          <Form.Item
            name="username"
            label="用户名"
            rules={[{ required: true }]}
          >
            <Input disabled={Boolean(editing)} maxLength={64} />
          </Form.Item>
          <Form.Item
            name="displayName"
            label="用户姓名"
            rules={[{ required: true }]}
          >
            <Input maxLength={64} />
          </Form.Item>
          <Space size={16} style={{ display: 'flex' }}>
            <Form.Item
              name="phone"
              label="手机号"
              rules={
                editing ? [] : [{ required: true, message: '请输入手机号' }]
              }
            >
              <Input maxLength={32} />
            </Form.Item>
            <Form.Item name="email" label="邮箱" rules={[{ type: 'email' }]}>
              <Input maxLength={128} />
            </Form.Item>
          </Space>
          {!editing && (
            <Form.Item name="positionIds" label="岗位">
              <Select
                mode="multiple"
                options={positions.map((item) => ({
                  label: `${item.orgName} / ${item.positionName}`,
                  value: item.id,
                }))}
              />
            </Form.Item>
          )}
          <Form.Item
            name="companyAdmin"
            label="公司管理员"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
          {editing && (
            <Form.Item name="status" label="状态" rules={[{ required: true }]}>
              <Select
                options={[
                  { label: '启用', value: 'ENABLED' },
                  { label: '停用', value: 'DISABLED' },
                ]}
              />
            </Form.Item>
          )}
          {editing && (
            <Form.Item label="账号安全">
              <Button
                icon={<KeyOutlined />}
                onClick={() => {
                  resetForm.resetFields();
                  setResetUser(editing);
                  setResetOpen(true);
                }}
              >
                重置密码
              </Button>
              <span style={{ marginLeft: 12, color: '#8c8c8c' }}>
                重置后该用户的现有会话将失效
              </span>
            </Form.Item>
          )}
        </Form>
      </Modal>

      <Modal
        title={
          <Space>
            <TeamOutlined />
            分配“{positionUser?.displayName}”岗位
          </Space>
        }
        open={positionOpen}
        onCancel={() => setPositionOpen(false)}
        onOk={async () => {
          const values = await positionForm.validateFields();
          if (!positionUser || !companyId) return;
          await setUserPositions(
            positionUser.id,
            companyId,
            values.positionIds || [],
          );
          message.success('用户岗位已更新');
          setPositionOpen(false);
          await reload();
        }}
      >
        <Form form={positionForm} layout="vertical">
          <Form.Item name="positionIds" label="岗位">
            <Select
              mode="multiple"
              options={positions.map((item) => ({
                label: `${item.orgName} / ${item.positionName}`,
                value: item.id,
              }))}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={
          <Space>
            <KeyOutlined />
            重置“{resetUser?.displayName}”密码
          </Space>
        }
        open={resetOpen}
        onCancel={() => setResetOpen(false)}
        onOk={async () => {
          const values = await resetForm.validateFields();
          if (!resetUser) return;
          await resetUserPassword(resetUser.id, values.newPassword);
          message.success('密码已重置，用户原有会话已失效');
          setResetOpen(false);
        }}
      >
        <Form form={resetForm} layout="vertical">
          <Form.Item
            name="newPassword"
            label="新密码"
            extra={PASSWORD_REQUIREMENT}
            rules={[{ validator: validatePassword }]}
          >
            <Input.Password />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
}
