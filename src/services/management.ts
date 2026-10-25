import { request } from '@umijs/max';

const companyQuery = (companyId?: number) =>
  companyId ? `?companyId=${companyId}` : '';

export const listCompanies = () =>
  request<API.ApiResponse<ManagementAPI.Company[]>>('/api/system/companies');

export const createCompany = (data: Record<string, unknown>) =>
  request<API.ApiResponse<Record<string, unknown>>>('/api/system/companies', {
    method: 'POST',
    data,
  });

export const updateCompany = (id: number, data: Record<string, unknown>) =>
  request<API.ApiResponse<null>>(`/api/system/companies/${id}`, {
    method: 'PUT',
    data,
  });

export const listOrganizations = (companyId?: number) =>
  request<API.ApiResponse<ManagementAPI.Organization[]>>(
    `/api/system/org-units/tree${companyQuery(companyId)}`,
  );

export const createOrganization = (
  companyId: number | undefined,
  data: Record<string, unknown>,
) =>
  request<API.ApiResponse<Record<string, unknown>>>(
    `/api/system/org-units${companyQuery(companyId)}`,
    { method: 'POST', data },
  );

export const updateOrganization = (id: number, data: Record<string, unknown>) =>
  request<API.ApiResponse<null>>(`/api/system/org-units/${id}`, {
    method: 'PUT',
    data,
  });

export const organizationDeleteImpact = (id: number) =>
  request<API.ApiResponse<Record<string, number | boolean>>>(
    `/api/system/org-units/${id}/delete-impact`,
  );

export const deleteOrganization = (id: number) =>
  request<API.ApiResponse<null>>(`/api/system/org-units/${id}`, {
    method: 'DELETE',
  });

export const listPositions = (companyId?: number, orgUnitId?: number) => {
  const params = new URLSearchParams();
  if (companyId) params.set('companyId', String(companyId));
  if (orgUnitId) params.set('orgUnitId', String(orgUnitId));
  const query = params.toString();
  return request<API.ApiResponse<ManagementAPI.Position[]>>(
    `/api/system/positions${query ? `?${query}` : ''}`,
  );
};

export const createPosition = (
  companyId: number | undefined,
  data: Record<string, unknown>,
) =>
  request<API.ApiResponse<Record<string, unknown>>>(
    `/api/system/positions${companyQuery(companyId)}`,
    { method: 'POST', data },
  );

export const updatePosition = (id: number, data: Record<string, unknown>) =>
  request<API.ApiResponse<null>>(`/api/system/positions/${id}`, {
    method: 'PUT',
    data,
  });

export const positionDeleteImpact = (id: number) =>
  request<API.ApiResponse<Record<string, number | boolean>>>(
    `/api/system/positions/${id}/delete-impact`,
  );

export const deletePosition = (id: number) =>
  request<API.ApiResponse<null>>(`/api/system/positions/${id}`, {
    method: 'DELETE',
  });

export const listPermissions = () =>
  request<API.ApiResponse<ManagementAPI.Permission[]>>(
    '/api/system/permissions/tree',
  );

export const getPositionPermissions = (id: number) =>
  request<API.ApiResponse<number[]>>(`/api/system/positions/${id}/permissions`);

export const setPositionPermissions = (id: number, permissionIds: number[]) =>
  request<API.ApiResponse<null>>(`/api/system/positions/${id}/permissions`, {
    method: 'PUT',
    data: { permissionIds },
  });

export const listUsers = (companyId?: number, keyword?: string) => {
  const params = new URLSearchParams();
  if (companyId) params.set('companyId', String(companyId));
  if (keyword) params.set('keyword', keyword);
  const query = params.toString();
  return request<API.ApiResponse<ManagementAPI.User[]>>(
    `/api/system/users${query ? `?${query}` : ''}`,
  );
};

export const createUser = (data: Record<string, unknown>) =>
  request<API.ApiResponse<Record<string, unknown>>>('/api/system/users', {
    method: 'POST',
    data,
  });

export const updateUser = (id: number, data: Record<string, unknown>) =>
  request<API.ApiResponse<null>>(`/api/system/users/${id}`, {
    method: 'PUT',
    data,
  });

export const getUserPositions = (id: number) =>
  request<API.ApiResponse<Record<string, unknown>[]>>(
    `/api/system/users/${id}/positions`,
  );

export const setUserPositions = (
  id: number,
  companyId: number,
  positionIds: number[],
) =>
  request<API.ApiResponse<null>>(
    `/api/system/users/${id}/positions?companyId=${companyId}`,
    { method: 'PUT', data: { positionIds } },
  );

export const resetUserPassword = (id: number, newPassword: string) =>
  request<API.ApiResponse<null>>(`/api/system/users/${id}/reset-password`, {
    method: 'POST',
    data: { newPassword },
  });

export const punchAttendance = (remark?: string) =>
  request<API.ApiResponse<ManagementAPI.AttendanceSummary>>('/api/oa/attendance/punch', {
    method: 'POST',
    data: remark ? { remark } : {},
  });

export const listMyAttendance = (from: string, to: string) =>
  request<API.ApiResponse<ManagementAPI.AttendanceSummary[]>>(
    `/api/oa/attendance/my?from=${from}&to=${to}`,
  );

export const listAllAttendance = (params: {
  from: string;
  to: string;
  companyId?: number;
  userId?: number;
  orgUnitId?: number;
  keyword?: string;
}) => {
  const query = new URLSearchParams({ from: params.from, to: params.to });
  if (params.companyId) query.set('companyId', String(params.companyId));
  if (params.userId) query.set('userId', String(params.userId));
  if (params.orgUnitId) query.set('orgUnitId', String(params.orgUnitId));
  if (params.keyword) query.set('keyword', params.keyword);
  return request<API.ApiResponse<ManagementAPI.AttendanceSummary[]>>(
    `/api/oa/attendance/records?${query.toString()}`,
  );
};

export const adminPunchAttendance = (data: {
  companyId?: number;
  userId: number;
  punchTime: string;
  remark?: string;
}) =>
  request<API.ApiResponse<ManagementAPI.AttendanceSummary>>('/api/oa/attendance/records/punch', {
    method: 'POST',
    data,
  });

export const listMyExpenses = () =>
  request<API.ApiResponse<ManagementAPI.ExpenseClaim[]>>('/api/oa/expenses/mine');

export const createExpense = () =>
  request<API.ApiResponse<ManagementAPI.ExpenseClaim>>('/api/oa/expenses', { method: 'POST' });

export const getExpense = (id: number) =>
  request<API.ApiResponse<ManagementAPI.ExpenseClaim>>(`/api/oa/expenses/${id}`);

export const saveExpense = (id: number, items: ManagementAPI.ExpenseItem[]) =>
  request<API.ApiResponse<ManagementAPI.ExpenseClaim>>(`/api/oa/expenses/${id}`, {
    method: 'PUT', data: { items },
  });

export const submitExpense = (id: number) =>
  request<API.ApiResponse<null>>(`/api/oa/expenses/${id}/submit`, { method: 'POST' });

export const deleteExpense = (id: number) =>
  request<API.ApiResponse<null>>(`/api/oa/expenses/${id}`, { method: 'DELETE' });

export const reviewExpense = (id: number, action: 'APPROVE' | 'REJECT', opinion?: string) =>
  request<API.ApiResponse<null>>(`/api/oa/expenses/${id}/review`, {
    method: 'POST', data: { action, opinion },
  });

export const uploadExpenseAttachment = (claimId: number, itemId: number, kind: 'INVOICE' | 'OTHER', file: File) => {
  const data = new FormData();
  data.append('itemId', String(itemId)); data.append('kind', kind); data.append('file', file);
  return request<API.ApiResponse<{ id: number }>>(`/api/oa/expenses/${claimId}/attachments`, { method: 'POST', data });
};

export const expenseAttachmentUrl = (id: number) => `/api/oa/expenses/attachments/${id}/content`;
