import { LogoutOutlined, UserOutlined } from '@ant-design/icons';
import type { RequestConfig } from '@umijs/max';
import { history } from '@umijs/max';
import { Avatar, message, Space, Watermark } from 'antd';

const demoUser: API.UserInfo = {
  id: 1,
  tenantId: 1,
  username: 'admin',
  name: '平台管理员',
  roles: ['PLATFORM_ADMIN'],
};

export async function getInitialState(): Promise<{ currentUser?: API.UserInfo }> {
  return { currentUser: demoUser };
}

export const request: RequestConfig = {
  timeout: 30000,
  requestInterceptors: [
    (config) => {
      config.headers = { ...config.headers, 'X-Tenant-Id': String(demoUser.tenantId) };
      return config;
    },
  ],
  errorConfig: {
    errorHandler: (error: any) => {
      message.error(error?.response?.data?.message || '请求失败，请稍后重试');
    },
  },
};

export const layout = ({ initialState }: { initialState?: { currentUser?: API.UserInfo } }) => ({
  logo: false,
  title: '芯河智能',
  menu: { locale: false },
  navTheme: 'realDark',
  colorPrimary: '#1766aa',
  avatarProps: {
    src: <Avatar>管</Avatar>,
    title: initialState?.currentUser?.name || '用户',
  },
  actionsRender: () => [
    <Space key="logout" onClick={() => history.push('/login')} style={{ cursor: 'pointer' }}>
      <UserOutlined />
      <LogoutOutlined />
    </Space>,
  ],
  childrenRender: (children) => (
    <Watermark content={`${demoUser.name} · 芯河智能`} font={{ color: 'rgba(0,0,0,.08)' }}>
      {children}
    </Watermark>
  ),
});
