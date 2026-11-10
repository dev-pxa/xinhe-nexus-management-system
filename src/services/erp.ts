import { getAuthenticatedUser } from '@/services/authState';
import { request } from '@umijs/max';

const base = '/api/erp';
const options = () => ({ headers: { 'X-Tenant-Id': String(getAuthenticatedUser()?.companyId || '') } });
export type ErpProductFilters = { productCode?: string; productName?: string; model?: string; specification?: string; categoryId?: number; status?: string };
export const listErpProducts = (filters: ErpProductFilters = {}) => {
  const query = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => { if (value !== undefined && value !== null && value !== '') query.set(key, String(value)); });
  return request<any>(`${base}/products${query.size ? `?${query.toString()}` : ''}`, options()).then(r => r.data || []);
};
export const getErpProduct = (id: number) => request<any>(`${base}/products/${id}`, options()).then(r => r.data);
export const saveErpProduct = (data: any, id?: number) => request<any>(`${base}/products${id ? `/${id}` : ''}`, { ...options(), method: id ? 'PUT' : 'POST', data });
export const setErpProductEnabled = (id: number, enabled: boolean) => request<any>(`${base}/products/${id}/${enabled ? 'enable' : 'disable'}`, { ...options(), method: 'POST' });
export const listErpProductCategories = (enabledOnly = false) => request<any>(`${base}/product-categories${enabledOnly ? '?enabledOnly=true' : ''}`, options()).then(r => r.data || []);
export const saveErpProductCategory = (data: any, id?: number) => request<any>(`${base}/product-categories${id ? `/${id}` : ''}`, { ...options(), method: id ? 'PUT' : 'POST', data });
export const setErpProductCategoryEnabled = (id: number, enabled: boolean) => request<any>(`${base}/product-categories/${id}/${enabled ? 'enable' : 'disable'}`, { ...options(), method: 'POST' });
export const listErpOrders = (filters: Record<string, any> = {}) => {
  const query = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => { if (value !== undefined && value !== null && value !== '') query.set(key, String(value)); });
  return request<any>(`${base}/fulfillment-orders${query.size ? `?${query}` : ''}`, options()).then(r => r.data || []);
};
export const getErpOrder = (id: number) => request<any>(`${base}/fulfillment-orders/${id}`, options()).then(r => r.data);
export const dispatchErpOrder = (id: number, groups: any[]) => request<any>(`${base}/fulfillment-orders/${id}/dispatch`, { ...options(), method: 'POST', data: { groups } });
export const signErpOrder = (id: number, data: any) => request<any>(`${base}/fulfillment-orders/${id}/sign`, { ...options(), method: 'POST', data });
export const completeErpOrder = (id: number) => request<any>(`${base}/fulfillment-orders/${id}/complete`, { ...options(), method: 'POST' });
export const listErpWarehouses = (enabledOnly = false) => request<any>(`${base}/warehouses${enabledOnly ? '?enabledOnly=true' : ''}`, options()).then(r => r.data || []);
export const saveErpWarehouse = (data: any, id?: number) => request<any>(`${base}/warehouses${id ? `/${id}` : ''}`, { ...options(), method: id ? 'PUT' : 'POST', data });
export const setErpWarehouseEnabled = (id: number, enabled: boolean) => request<any>(`${base}/warehouses/${id}/${enabled ? 'enable' : 'disable'}`, { ...options(), method: 'POST' });
export const deleteErpWarehouse = (id: number) => request<any>(`${base}/warehouses/${id}`, { ...options(), method: 'DELETE' });
export const listErpInventory = (filters: Record<string, any> = {}) => {
  const query = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => { if (value !== undefined && value !== null && value !== '') query.set(key, String(value)); });
  return request<any>(`${base}/inventory${query.size ? `?${query}` : ''}`, options()).then(r => r.data || []);
};
export const adjustErpInventory = (data: any) => request<any>(`${base}/inventory/adjust`, { ...options(), method: 'POST', data });
export const listErpSalesReturns = (filters: Record<string, any> = {}) => { const query = new URLSearchParams(); Object.entries(filters).forEach(([k,v]) => { if (v !== undefined && v !== null && v !== '') query.set(k,String(v)); }); return request<any>(`${base}/sales-returns${query.size ? `?${query}` : ''}`, options()).then(r => r.data || []); };
export const getErpSalesReturn = (id: number) => request<any>(`${base}/sales-returns/${id}`, options()).then(r => r.data);
export const createErpSalesReturn = (data: any) => request<any>(`${base}/sales-returns`, { ...options(), method: 'POST', data });
export const decideErpSalesReturn = (id: number, approve: boolean, opinion: string) => request<any>(`${base}/sales-returns/${id}/${approve ? 'approve' : 'reject'}`, { ...options(), method: 'POST', data: { opinion } });
export const receiveErpSalesReturn = (id: number) => request<any>(`${base}/sales-returns/${id}/receive`, { ...options(), method: 'POST' });
export const getErpSalesReport = (dimension: string) => request<any>(`${base}/sales-reports?dimension=${dimension}`, options()).then(r => r.data || []);
