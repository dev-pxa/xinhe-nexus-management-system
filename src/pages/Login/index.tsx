import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { LoginFormPage, ProFormCheckbox, ProFormText } from '@ant-design/pro-components';
import { history } from '@umijs/max';
import { message } from 'antd';

export default function LoginPage() {
  return (
    <LoginFormPage
      title="芯河智能"
      subTitle="AI 一体化 ERP · CRM · OA 管理平台"
      backgroundImageUrl="https://gw.alipayobjects.com/zos/rmsportal/FfdJeJRQWjEeGTpqgBKj.png"
      onFinish={async () => {
        message.success('基础框架演示登录成功');
        history.push('/dashboard');
        return true;
      }}
    >
      <ProFormText
        name="username"
        fieldProps={{ prefix: <UserOutlined /> }}
        placeholder="用户名：admin"
        rules={[{ required: true, message: '请输入用户名' }]}
      />
      <ProFormText.Password
        name="password"
        fieldProps={{ prefix: <LockOutlined /> }}
        placeholder="密码"
        rules={[{ required: true, message: '请输入密码' }]}
      />
      <ProFormCheckbox name="remember">自动登录</ProFormCheckbox>
    </LoginFormPage>
  );
}

