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

export const deleteUser = (id: number, companyId?: number) => {
  const query = companyId ? `?companyId=${companyId}` : '';
  return request<API.ApiResponse<null>>(`/api/system/users/${id}${query}`, {
    method: 'DELETE',
  });
};

export const getUserPosition = (id: number) =>
  request<API.ApiResponse<ManagementAPI.UserPosition>>(
    `/api/system/users/${id}/position`,
  );

export const setUserPosition = (
  id: number,
  companyId: number,
  positionId?: number,
) =>
  request<API.ApiResponse<null>>(
    `/api/system/users/${id}/position?companyId=${companyId}`,
    { method: 'PUT', data: { positionId } },
  );

export const getUserPermissions = (id: number) =>
  request<API.ApiResponse<ManagementAPI.UserPermissionAssignment>>(
    `/api/system/users/${id}/permissions`,
  );

export const setUserPermissions = (id: number, directPermissionIds: number[]) =>
  request<API.ApiResponse<null>>(`/api/system/users/${id}/permissions`, {
    method: 'PUT',
    data: { directPermissionIds },
  });

export const resetUserPassword = (id: number, newPassword: string) =>
  request<API.ApiResponse<null>>(`/api/system/users/${id}/reset-password`, {
    method: 'POST',
    data: { newPassword },
  });

export const punchAttendance = (data?: {
  latitude: number;
  longitude: number;
  accuracy?: number;
  locationSource?: string;
  capturedAt?: string;
  remark?: string;
}) =>
  request<API.ApiResponse<ManagementAPI.AttendanceSummary>>(
    '/api/oa/attendance/punch',
    {
      method: 'POST',
      data: data || {},
    },
  );

export const listMyAttendance = (from: string, to: string) =>
  request<API.ApiResponse<ManagementAPI.AttendanceSummary[]>>(
    `/api/oa/attendance/my?from=${from}&to=${to}`,
  );

export const listMyAttendancePunches = (date: string) =>
  request<API.ApiResponse<ManagementAPI.AttendancePunch[]>>(
    `/api/oa/attendance/my/punches?date=${date}`,
  );

export const listAttendancePunches = (params: {
  date: string;
  userId: number;
  companyId?: number;
}) => {
  const query = new URLSearchParams({
    date: params.date,
    userId: String(params.userId),
  });
  if (params.companyId) query.set('companyId', String(params.companyId));
  return request<API.ApiResponse<ManagementAPI.AttendancePunch[]>>(
    `/api/oa/attendance/records/punches?${query.toString()}`,
  );
};

export const listAllAttendance = (params: {
  from: string;
  to: string;
  companyId?: number;
  userId?: number;
  orgUnitId?: number;
  keyword?: string;
  page?: number;
  pageSize?: number;
}) => {
  const query = new URLSearchParams({ from: params.from, to: params.to });
  if (params.companyId) query.set('companyId', String(params.companyId));
  if (params.userId) query.set('userId', String(params.userId));
  if (params.orgUnitId) query.set('orgUnitId', String(params.orgUnitId));
  if (params.keyword) query.set('keyword', params.keyword);
  if (params.page) query.set('page', String(params.page));
  if (params.pageSize) query.set('pageSize', String(params.pageSize));
  return request<
    API.ApiResponse<{
      data: ManagementAPI.AttendanceSummary[];
      total: number;
      page: number;
      pageSize: number;
    }>
  >(`/api/oa/attendance/records?${query.toString()}`);
};

export const getAttendanceRuleYear = (year: number) =>
  request<API.ApiResponse<ManagementAPI.AttendanceRuleYear>>(
    `/api/oa/attendance/rules/${year}`,
  );
export const saveCompanyAttendanceHolidays = (
  year: number,
  dates: string[],
  version: number,
) =>
  request<API.ApiResponse<ManagementAPI.AttendanceRuleYear>>(
    `/api/oa/attendance/rules/${year}/company-holidays`,
    { method: 'PUT', data: { dates, version } },
  );
export const listAttendanceRuleUsers = (year: number) =>
  request<API.ApiResponse<ManagementAPI.AttendanceRuleUser[]>>(
    `/api/oa/attendance/rules/${year}/users`,
  );
export const getAttendanceRuleUser = (year: number, userId: number) =>
  request<API.ApiResponse<ManagementAPI.AttendanceRuleUserDetail>>(
    `/api/oa/attendance/rules/${year}/users/${userId}`,
  );
export const saveUserAttendanceHolidays = (
  year: number,
  userId: number,
  dates: string[],
  version: number,
) =>
  request<API.ApiResponse<ManagementAPI.AttendanceRuleUserDetail>>(
    `/api/oa/attendance/rules/${year}/users/${userId}/holidays`,
    { method: 'PUT', data: { dates, version } },
  );
export const publishAttendanceRule = (year: number, version: number) =>
  request<API.ApiResponse<ManagementAPI.AttendanceRuleYear>>(
    `/api/oa/attendance/rules/${year}/publish`,
    { method: 'POST', data: { version } },
  );

export const adminPunchAttendance = (data: {
  companyId?: number;
  userId: number;
  punchTime: string;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  locationSource?: string;
  capturedAt?: string;
  remark?: string;
}) =>
  request<API.ApiResponse<ManagementAPI.AttendanceSummary>>(
    '/api/oa/attendance/records/punch',
    {
      method: 'POST',
      data,
    },
  );

export const createAttendanceCorrection = (data: {
  requestedPunchTime: string;
  punchType?: string;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  locationSource?: string;
  locationAddress?: string;
  reason: string;
}) =>
  request<API.ApiResponse<ManagementAPI.AttendanceCorrection[]>>(
    '/api/oa/attendance/correction-requests',
    { method: 'POST', data },
  );
export const listMyAttendanceCorrections = () =>
  request<API.ApiResponse<ManagementAPI.AttendanceCorrection[]>>(
    '/api/oa/attendance/correction-requests/mine',
  );
export const listPendingAttendanceCorrections = () =>
  request<API.ApiResponse<ManagementAPI.AttendanceCorrection[]>>(
    '/api/oa/attendance/correction-requests/pending',
  );
export const decideAttendanceCorrection = (
  id: number,
  approve: boolean,
  comment?: string,
) =>
  request<API.ApiResponse<Record<string, unknown>>>(
    `/api/oa/attendance/correction-requests/${id}/decision`,
    { method: 'POST', data: { approve, comment } },
  );

export const listMyExpenses = () =>
  request<API.ApiResponse<ManagementAPI.ExpenseClaim[]>>(
    '/api/oa/expenses/mine',
  );

export const listPendingExpenses = () =>
  request<API.ApiResponse<ManagementAPI.ExpenseClaim[]>>(
    '/api/oa/expenses/pending',
  );

export const createExpense = () =>
  request<API.ApiResponse<ManagementAPI.ExpenseClaim>>('/api/oa/expenses', {
    method: 'POST',
  });

export const getExpense = (id: number) =>
  request<API.ApiResponse<ManagementAPI.ExpenseClaim>>(
    `/api/oa/expenses/${id}`,
  );

export const saveExpense = (
  id: number,
  items: ManagementAPI.ExpenseItem[],
) =>
  request<API.ApiResponse<ManagementAPI.ExpenseClaim>>(
    `/api/oa/expenses/${id}`,
    {
      method: 'PUT',
      data: { items },
    },
  );

export const submitExpense = (id: number, version: number) =>
  request<API.ApiResponse<null>>(`/api/oa/expenses/${id}/submit`, {
    method: 'POST',
    data: { version },
  });

export const withdrawExpense = (id: number, version: number) =>
  request<API.ApiResponse<null>>(`/api/oa/expenses/${id}/withdraw`, {
    method: 'POST',
    data: { version },
  });

export const deleteExpense = (id: number) =>
  request<API.ApiResponse<null>>(`/api/oa/expenses/${id}`, {
    method: 'DELETE',
  });

export const reviewExpense = (
  id: number,
  action: 'APPROVE' | 'REJECT',
  opinion: string,
  version: number,
) =>
  request<API.ApiResponse<null>>(`/api/oa/expenses/${id}/review`, {
    method: 'POST',
    data: { action, opinion, version },
  });

export const uploadExpenseAttachment = (
  claimId: number,
  itemId: number,
  kind: 'INVOICE' | 'OTHER',
  file: File,
) => {
  const data = new FormData();
  data.append('itemId', String(itemId));
  data.append('kind', kind);
  data.append('file', file);
  return request<API.ApiResponse<{ id: number }>>(
    `/api/oa/expenses/${claimId}/attachments`,
    { method: 'POST', data },
  );
};

export const expenseAttachmentUrl = (id: number) =>
  `/api/oa/expenses/attachments/${id}/content`;
