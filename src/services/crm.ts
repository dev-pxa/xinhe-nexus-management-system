import { getAuthenticatedUser } from '@/services/authState';
import { request } from '@umijs/max';

const base = '/api/crm';
// 现有公共租户过滤器要求 X-Tenant-Id；值从已认证用户态读取，后端仍以认证主体公司作为最终数据边界。
const tenantOptions = () => ({
  headers: { 'X-Tenant-Id': String(getAuthenticatedUser()?.companyId || '') },
});
export const listCrmCustomers = (filters: Record<string, any> = {}) => {
  const query = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '')
      query.set(key, String(value));
  });
  return request<any>(
    `${base}/customers${query.size ? `?${query.toString()}` : ''}`,
    tenantOptions(),
  );
};
export const listCrmCategories = () =>
  request<any>(`${base}/categories`, tenantOptions());
export const createCrmCategory = (data: any) =>
  request<any>(`${base}/categories`, {
    ...tenantOptions(),
    method: 'POST',
    data,
  });
export const setCrmCustomerFavorite = (id: number, favorite: boolean) =>
  request<any>(`${base}/customers/${id}/favorite`, {
    ...tenantOptions(),
    method: 'PUT',
    data: { favorite },
  });
export const getCrmCustomer = (id: number) =>
  request<any>(`${base}/customers/${id}`, tenantOptions());
export const listCrmEligibleUsers = () =>
  request<any>(`${base}/eligible-users`, tenantOptions());
export const listMyCrmCustomers = () =>
  request<any>(`${base}/customers/mine`, tenantOptions());
export const listCustomerSalesOrders = (customerId: number) =>
  request<any>(
    `${base}/customers/${customerId}/sales-orders`,
    tenantOptions(),
  ).then((r) => r.data || []);
export const listCrmSalesOrders = (filters: Record<string, any> = {}) => {
  const query = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '')
      query.set(key, String(value));
  });
  return request<any>(
    `${base}/sales-orders${query.size ? `?${query.toString()}` : ''}`,
    tenantOptions(),
  ).then((r) => r.data || []);
};
export const listCrmSalesOrderProducts = () =>
  request<any>(`${base}/sales-order-products`, tenantOptions()).then(
    (response) => response.data || [],
  );
export const listCrmSalesPendingApprovals = () =>
  request<any>(`${base}/sales-orders/pending-approvals`, tenantOptions()).then(
    (r) => r.data || [],
  );
export const getCrmSalesOrder = (id: number) =>
  request<any>(`${base}/sales-orders/${id}`, tenantOptions()).then(
    (r) => r.data,
  );
export const createCrmSalesOrder = (data: any) =>
  request<any>(`${base}/sales-orders`, {
    ...tenantOptions(),
    method: 'POST',
    data,
  });
export const resubmitCrmSalesOrder = (id: number, data: any) =>
  request<any>(`${base}/sales-orders/${id}/resubmit`, {
    ...tenantOptions(),
    method: 'PUT',
    data,
  });
export const withdrawCrmSalesOrder = (id: number) =>
  request<any>(`${base}/sales-orders/${id}/withdraw`, {
    ...tenantOptions(),
    method: 'POST',
  });
export const decideCrmSalesOrder = (
  id: number,
  approve: boolean,
  opinion: string,
) =>
  request<any>(`${base}/sales-orders/${id}/${approve ? 'approve' : 'reject'}`, {
    ...tenantOptions(),
    method: 'POST',
    data: { opinion },
  });
export const saveCrmCustomer = (data: any, id?: number) =>
  request<any>(`${base}/customers${id ? `/${id}` : ''}`, {
    ...tenantOptions(),
    method: id ? 'PUT' : 'POST',
    data,
  });
export const listCrmFollowups = (id: number) =>
  request<any>(`${base}/customers/${id}/followups`, tenantOptions());
export const addCrmFollowup = (id: number, data: any) =>
  request<any>(`${base}/customers/${id}/followups`, {
    ...tenantOptions(),
    method: 'POST',
    data,
  });
export const uploadCrmFollowupAttachment = (id: number, file: File) => {
  const data = new FormData();
  data.append('file', file);
  return request<any>(`${base}/followups/${id}/attachments`, {
    ...tenantOptions(),
    method: 'POST',
    data,
  });
};
export const downloadCrmAttachment = (id: number) =>
  request<Blob>(`${base}/attachments/${id}`, {
    ...tenantOptions(),
    responseType: 'blob',
  });
export const listDailyPlans = (year: number, month: number, params: Record<string, any> = {}) => {
  const query = new URLSearchParams({ year: String(year), month: String(month) });
  Object.entries(params).forEach(([key, value]) => { if (value !== undefined && value !== null && value !== '') query.set(key, String(value)); });
  return request<any>(`${base}/daily-plans?${query.toString()}`, tenantOptions());
};
export const getDailyPlan = (id: number) =>
  request<any>(`${base}/daily-plans/${id}`, tenantOptions());
export const getDailyPlanDraft = () =>
  request<any>(`${base}/daily-plans/draft`, tenantOptions());
export const createDailyPlan = (data: any) =>
  request<any>(`${base}/daily-plans`, {
    ...tenantOptions(),
    method: 'POST',
    data,
  });
export const updateDailyPlan = (id: number, data: any) =>
  request<any>(`${base}/daily-plans/${id}`, {
    ...tenantOptions(),
    method: 'PUT',
    data,
  });
export const deleteDailyPlan = (id: number) =>
  request<any>(`${base}/daily-plans/${id}`, {
    ...tenantOptions(),
    method: 'DELETE',
  });
export const completeDailyPlanItem = (id: number, completed: boolean) =>
  request<any>(`${base}/daily-plan-items/${id}/completion`, {
    ...tenantOptions(),
    method: 'PUT',
    data: { completed },
  });
export const listWeeklyPlans = (year: number, month: number, params: Record<string, any> = {}) => {
  const query = new URLSearchParams({ year: String(year), month: String(month) });
  Object.entries(params).forEach(([key, value]) => { if (value !== undefined && value !== null && value !== '') query.set(key, String(value)); });
  return request<any>(`${base}/weekly-plans?${query.toString()}`, tenantOptions());
};
export const getWeeklyPlan = (id: number) =>
  request<any>(`${base}/weekly-plans/${id}`, tenantOptions());
export const getWeeklyPlanDraft = () =>
  request<any>(`${base}/weekly-plans/draft`, tenantOptions());
export const createWeeklyPlan = (data: any) =>
  request<any>(`${base}/weekly-plans`, {
    ...tenantOptions(),
    method: 'POST',
    data,
  });
export const updateWeeklyPlan = (id: number, data: any) =>
  request<any>(`${base}/weekly-plans/${id}`, {
    ...tenantOptions(),
    method: 'PUT',
    data,
  });
export const deleteWeeklyPlan = (id: number) =>
  request<any>(`${base}/weekly-plans/${id}`, {
    ...tenantOptions(),
    method: 'DELETE',
  });
export const completeWeeklyPlanItem = (id: number, completed: boolean) =>
  request<any>(`${base}/weekly-plan-items/${id}/completion`, {
    ...tenantOptions(),
    method: 'PUT',
    data: { completed },
  });
