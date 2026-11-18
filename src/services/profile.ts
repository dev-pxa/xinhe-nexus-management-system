import { getAuthenticatedUser } from '@/services/authState';
import { request } from '@umijs/max';

export type ProfileEducation = { startMonth: string; endMonth: string; educationLevel: string; schoolName: string };
export type ProfileChange = { gender?: string; birthDate?: string; idType?: string; idNumber?: string; address?: string; emergencyContactName?: string; emergencyContactRelation?: string; emergencyContactPhone?: string; educations?: ProfileEducation[] };

const tenantOptions = () => ({
  headers: { 'X-Tenant-Id': String(getAuthenticatedUser()?.companyId || '') },
});

export const getMyProfile = () => request<API.ApiResponse<ManagementAPI.EmployeeProfile>>('/api/hr/profiles/me', tenantOptions());
export const updateMyBasicProfile = (data: { displayName: string; phone?: string; email?: string }) => request<API.ApiResponse<ManagementAPI.EmployeeProfile>>('/api/hr/profiles/me/basic', { method: 'PUT', data, ...tenantOptions() });
export const submitProfileChange = (data: ProfileChange) => request<API.ApiResponse<{ id: number; status: string }>>('/api/hr/profiles/me/change-requests', { method: 'POST', data, ...tenantOptions() });
export const listMyProfileChanges = () => request<API.ApiResponse<ManagementAPI.ProfileChangeRequest[]>>('/api/hr/profiles/me/change-requests', tenantOptions());
export const updateEmployeeProfile = (id: number, data: Record<string, unknown>) => request<API.ApiResponse<ManagementAPI.EmployeeProfile>>(`/api/hr/profiles/${id}`, { method: 'PUT', data, ...tenantOptions() });
export const listPendingProfileChanges = () => request<API.ApiResponse<ManagementAPI.ProfileChangeRequest[]>>('/api/hr/profiles/change-requests/pending', tenantOptions());
export const decideProfileChange = (id: number, approve: boolean, comment?: string) => request<API.ApiResponse<{ id: number; status: string }>>(`/api/hr/profiles/change-requests/${id}/decide`, { method: 'POST', data: { approve, comment }, ...tenantOptions() });
