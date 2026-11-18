import PersonalProfile from '@/components/PersonalProfile';
import { getCurrentUser, logout } from '@/services/auth';
import {
  getAuthenticatedUser,
  setAuthenticatedUser,
} from '@/services/authState';
import { BookOutlined, LogoutOutlined, UserOutlined } from '@ant-design/icons';
import type { RequestConfig } from '@umijs/max';
import { history, useModel } from '@umijs/max';
import { Avatar, message, Space, Watermark } from 'antd';
import type { ReactNode } from 'react';

let appReady = false;
let redirectingToLogin = false;

function isPublicOnboardingPath(pathname: string) {
  return pathname === '/onboarding' || pathname.startsWith('/onboarding/');
}

function isPublicOnboardingUrl() {
  if (typeof window === 'undefined') return false;
  const hashPath = window.location.hash.replace(/^#/, '').split('?')[0];
  return (
    isPublicOnboardingPath(window.location.pathname) ||
    isPublicOnboardingPath(hashPath) ||
    /#\/onboarding(?:\/|$)/.test(window.location.href)
  );
}

export async function getInitialState(): Promise<{
  currentUser?: API.UserInfo;
}> {
  if (isPublicOnboardingUrl()) {
    appReady = true;
    return {};
  }
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
  if (
    location.pathname === '/login' ||
    location.pathname.startsWith('/onboarding/')
  ) {
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

function CurrentUserWatermark({ children }: { children: ReactNode }) {
  const { initialState } = useModel('@@initialState');
  return (
    <Watermark
      content={`${initialState?.currentUser?.companyName || '平台管理'}-${
        initialState?.currentUser?.name || '用户'
      }`}
      font={{ color: 'rgba(0,0,0,.06)' }}
    >
      {children}
    </Watermark>
  );
}

export const request: RequestConfig = {
  timeout: 30000,
  responseInterceptors: [
    (response) => {
      const data = response.data as API.ApiResponse<unknown> | undefined;
      const publicOnboarding =
        isPublicOnboardingUrl() ||
        isPublicOnboardingPath(history.location.pathname);
      if (
        data?.code === 401 &&
        history.location.pathname !== '/login' &&
        !publicOnboarding
      ) {
        handleUnauthorized();
      }
      return response;
    },
  ],
  errorConfig: {
    errorHandler: (error: any) => {
      if (
        error?.response?.status === 401 &&
        !isPublicOnboardingUrl() &&
        !isPublicOnboardingPath(history.location.pathname)
      ) {
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
  links: [
    <a
      className="manual-sider-link"
      href="https://ncnpzim27ujc.feishu.cn/wiki/CGWswkJInix5nOkYUaXcX3oonHe?from=from_copylink"
      target="_blank"
      rel="noreferrer"
      aria-label="打开操作手册"
      title="打开操作手册"
    >
      <BookOutlined />
      <span>操作手册</span>
    </a>,
  ],
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
    render: (_: unknown, avatar: ReactNode) => (
      <PersonalProfile trigger={avatar} />
    ),
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
    <CurrentUserWatermark>{children}</CurrentUserWatermark>
  ),
});
