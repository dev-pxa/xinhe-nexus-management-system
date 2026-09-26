import { login } from '@/services/auth';
import { setAuthenticatedUser } from '@/services/authState';
import { LockOutlined, UserOutlined } from '@ant-design/icons';
import {
  LoginForm,
  ProFormCheckbox,
  ProFormText,
} from '@ant-design/pro-components';
import { history, useModel } from '@umijs/max';
import { message } from 'antd';
import styles from './index.less';

export default function LoginPage() {
  const { setInitialState } = useModel('@@initialState');

  return (
    <div className={styles.loginPage}>
      <div className={styles.loginCard}>
        <LoginForm
          title="芯河智枢"
          subTitle="AI 一体化经营协同平台"
          containerStyle={{ width: '100%', padding: 0, overflow: 'visible' }}
          contentStyle={{ width: '100%', minWidth: 0, maxWidth: 'none' }}
          onFinish={async (values) => {
            try {
              const response = await login({
                username: values.username,
                password: values.password,
                remember: Boolean(values.remember),
              });
              if (response.code !== 0 || !response.data) {
                message.error(response.message || '用户名或密码错误');
                return false;
              }
              setAuthenticatedUser(response.data);
              setInitialState({ currentUser: response.data });
              message.success('登录成功');
              history.replace('/dashboard');
              return true;
            } catch {
              return false;
            }
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
        </LoginForm>
      </div>
    </div>
  );
}
