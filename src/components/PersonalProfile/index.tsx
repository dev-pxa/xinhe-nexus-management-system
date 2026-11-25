import { userPhoneRule } from '@/utils/userPhone';
import {
  changePassword,
  getPersonalProfile,
  logout,
  updatePersonalProfile,
} from '@/services/auth';
import { setAuthenticatedUser } from '@/services/authState';
import { PASSWORD_REQUIREMENT, validatePassword } from '@/utils/password';
import { KeyOutlined } from '@ant-design/icons';
import { history, useModel } from '@umijs/max';
import { Button, Form, Input, message, Modal, Space } from 'antd';
import type { ReactNode } from 'react';
import { useState } from 'react';

export default function PersonalProfile({ trigger }: { trigger: ReactNode }) {
  const { initialState, setInitialState } = useModel('@@initialState');
  const [profileOpen, setProfileOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profileForm] = Form.useForm<API.PersonalProfile>();
  const [passwordForm] = Form.useForm();
  const canViewPersonalProfile = Boolean(initialState?.currentUser?.companyId);

  const openProfile = async () => {
    setProfileOpen(true);
    setLoading(true);
    try {
      const response = await getPersonalProfile();
      if (response.data) profileForm.setFieldsValue(response.data);
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    const values = await profileForm.validateFields();
    setSaving(true);
    try {
      const response = await updatePersonalProfile(values);
      if (response.data) {
        setAuthenticatedUser(response.data);
        await setInitialState({ ...initialState, currentUser: response.data });
      }
      message.success('个人信息已更新');
      setProfileOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const savePassword = async () => {
    const values = await passwordForm.validateFields();
    setSaving(true);
    try {
      await changePassword(values);
      message.success('密码修改成功，请使用新密码重新登录');
      setPasswordOpen(false);
      setProfileOpen(false);
      await logout();
      setAuthenticatedUser(undefined);
      history.replace('/login');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <span onClick={openProfile} style={{ cursor: 'pointer' }}>
        {trigger}
      </span>
      <Modal
        className="personal-profile-modal"
        title="个人信息"
        open={profileOpen}
        confirmLoading={saving}
        onCancel={() => setProfileOpen(false)}
        onOk={saveProfile}
        okText="保存"
        cancelText="取消"
        loading={loading}
        footer={(_, { OkBtn, CancelBtn }) => (
          <div className="personal-profile-modal-footer">
            {canViewPersonalProfile && (
              <Button onClick={() => history.push('/oa/profile')}>
                查看个人档案
              </Button>
            )}
            <Button
              icon={<KeyOutlined />}
              onClick={() => {
                passwordForm.resetFields();
                setPasswordOpen(true);
              }}
            >
              更改密码
            </Button>
            <Space className="personal-profile-modal-confirm">
              <CancelBtn />
              <OkBtn />
            </Space>
          </div>
        )}
      >
        <Form form={profileForm} layout="vertical">
          <Form.Item name="username" label="用户名">
            <Input disabled />
          </Form.Item>
          <Form.Item
            name="displayName"
            label="姓名"
            rules={[{ required: true, message: '请输入姓名' }]}
          >
            <Input maxLength={64} />
          </Form.Item>
          <Form.Item name="phone" label="手机号" rules={[userPhoneRule]}>
            <Input maxLength={32} />
          </Form.Item>
          <Form.Item name="email" label="邮箱" rules={[{ type: 'email' }]}>
            <Input maxLength={128} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="更改密码"
        open={passwordOpen}
        confirmLoading={saving}
        onCancel={() => setPasswordOpen(false)}
        onOk={savePassword}
        okText="确认更改"
        cancelText="取消"
      >
        <Form form={passwordForm} layout="vertical" preserve={false}>
          <Form.Item
            name="currentPassword"
            label="现有密码"
            rules={[{ required: true, message: '请输入现有密码' }]}
          >
            <Input.Password autoComplete="current-password" />
          </Form.Item>
          <Form.Item
            name="newPassword"
            label="新密码"
            extra={PASSWORD_REQUIREMENT}
            rules={[{ validator: validatePassword }]}
          >
            <Input.Password autoComplete="new-password" maxLength={72} />
          </Form.Item>
          <Form.Item
            name="confirmPassword"
            label="再次输入新密码"
            dependencies={['newPassword']}
            rules={[
              { required: true, message: '请再次输入新密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || value === getFieldValue('newPassword')) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('两次输入的新密码不一致'));
                },
              }),
            ]}
          >
            <Input.Password autoComplete="new-password" maxLength={72} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
