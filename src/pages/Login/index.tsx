import { login } from '@/services/auth';
import { setAuthenticatedUser } from '@/services/authState';
import {
  LockOutlined,
  QuestionCircleOutlined,
  UserOutlined,
} from '@ant-design/icons';
import {
  LoginForm,
  ProFormCheckbox,
  ProFormText,
} from '@ant-design/pro-components';
import { history, useModel } from '@umijs/max';
import { Button, message, Popover, Space } from 'antd';
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
            } catch (error: any) {
              message.error(error?.response?.data?.message || '登录失败，请稍后重试');
              return false;
            }
          }}
        >
          <ProFormText
            name="username"
            fieldProps={{ prefix: <UserOutlined /> }}
            placeholder="用户名或手机号"
            rules={[{ required: true, message: '请输入用户名或手机号' }]}
          />
          <ProFormText.Password
            name="password"
            fieldProps={{ prefix: <LockOutlined /> }}
            placeholder="密码"
            rules={[{ required: true, message: '请输入密码' }]}
          />
          <ProFormCheckbox name="remember">
            <Space size={4}>
              <span>自动登录</span>
              <Popover
                trigger="click"
                title="自动登录说明"
                content={
                  <div style={{ maxWidth: 280 }}>
                    勾选后，下次打开系统通常不用重新登录，最长保持30天；公用电脑建议不要勾选。未勾选时，关闭浏览器后通常需要重新登录；如果浏览器一直开着，最长保持12小时。
                  </div>
                }
              >
                <Button
                  type="text"
                  size="small"
                  aria-label="查看自动登录说明"
                  icon={<QuestionCircleOutlined />}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                />
              </Popover>
            </Space>
          </ProFormCheckbox>
        </LoginForm>
      </div>
    </div>
  );
}
