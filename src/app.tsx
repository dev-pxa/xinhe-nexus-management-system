import { getCurrentUser, logout } from '@/services/auth';
import {
  getAuthenticatedUser,
  setAuthenticatedUser,
} from '@/services/authState';
import { LogoutOutlined, UserOutlined } from '@ant-design/icons';
import type { RequestConfig } from '@umijs/max';
import { history } from '@umijs/max';
import { Avatar, message, Space, Watermark } from 'antd';
import type { ReactNode } from 'react';

let appReady = false;
let redirectingToLogin = false;

export async function getInitialState(): Promise<{
  currentUser?: API.UserInfo;
}> {
  try {
    const response = await getCurrentUser();
    if (response.code === 0 && response.data) {
      setAuthenticatedUser(response.data);
      appReady = true;
      return { currentUser: response.data };
    }
  } catch {
    // 未登录、会话过期或后端暂不可用时统一进入登录页。
  }
  setAuthenticatedUser(undefined);
  appReady = true;
  return {};
}

export function onRouteChange({
  location,
}: {
  location: { pathname: string };
}) {
  if (location.pathname === '/login') {
    redirectingToLogin = false;
    return;
  }
  if (appReady && !getAuthenticatedUser()) {
    history.replace('/login');
  }
}

function handleUnauthorized() {
  setAuthenticatedUser(undefined);
  if (redirectingToLogin || history.location.pathname === '/login') {
    return;
  }
  redirectingToLogin = true;
  message.warning('登录已过期，请重新登录');
  history.replace('/login');
}

export const request: RequestConfig = {
  timeout: 30000,
  requestInterceptors: [
    (config: any) => {
      const currentUser = getAuthenticatedUser();
      if (currentUser) {
        config.headers = {
          ...config.headers,
          'X-Tenant-Id': String(currentUser.tenantId),
        };
      }
      return config;
    },
  ],
  responseInterceptors: [
    (response) => {
      const data = response.data as API.ApiResponse<unknown> | undefined;
      if (data?.code === 401 && history.location.pathname !== '/login') {
        handleUnauthorized();
      }
      return response;
    },
  ],
  errorConfig: {
    errorHandler: (error: any) => {
      if (error?.response?.status === 401) {
        handleUnauthorized();
        return;
      }
      message.error(error?.response?.data?.message || '请求失败，请稍后重试');
    },
  },
};

export const layout = ({
  initialState,
}: {
  initialState?: { currentUser?: API.UserInfo };
}) => ({
  logo: false,
  title: '芯河智枢',
  menu: { locale: false },
  navTheme: 'light',
  colorPrimary: '#1766aa',
  token: {
    header: {
      colorBgHeader: '#ffffff',
      colorHeaderTitle: '#172033',
      colorTextMenu: '#445064',
      colorTextMenuSelected: '#1766aa',
    },
    sider: {
      colorMenuBackground: '#ffffff',
      colorTextMenu: '#445064',
      colorTextMenuSelected: '#1766aa',
      colorBgMenuItemSelected: '#eaf3fb',
    },
    pageContainer: {
      colorBgPageContainer: '#ffffff',
    },
  },
  avatarProps: {
    src: <Avatar>管</Avatar>,
    title: initialState?.currentUser?.name || '用户',
  },
  actionsRender: () => [
    <Space
      key="logout"
      onClick={async () => {
        try {
          await logout();
        } finally {
          setAuthenticatedUser(undefined);
          history.replace('/login');
        }
      }}
      style={{ cursor: 'pointer' }}
    >
      <UserOutlined />
      <LogoutOutlined />
    </Space>,
  ],
  childrenRender: (children: ReactNode) => (
    <Watermark
      content={`${initialState?.currentUser?.name || '用户'} · 芯河智枢`}
      font={{ color: 'rgba(0,0,0,.06)' }}
    >
      {children}
    </Watermark>
  ),
});
