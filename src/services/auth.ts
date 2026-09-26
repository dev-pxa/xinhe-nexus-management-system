import { request } from '@umijs/max';

export type LoginParams = {
  username: string;
  password: string;
  remember?: boolean;
};

export async function login(params: LoginParams) {
  return request<API.ApiResponse<API.UserInfo>>('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    data: params,
  });
}

export async function getCurrentUser() {
  return request<API.ApiResponse<API.UserInfo>>('/api/auth/current', {
    method: 'GET',
  });
}

export async function logout() {
  return request<API.ApiResponse<null>>('/api/auth/logout', {
    method: 'POST',
  });
}
