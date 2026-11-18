import { getAuthenticatedUser } from '@/services/authState';
import { request } from '@umijs/max';

export type EducationInput = {
  startMonth: string;
  endMonth: string;
  educationLevel: string;
  schoolName: string;
};
export type OnboardingForm = {
  candidateName: string;
  companyName: string;
  departmentName: string;
  positionName: string;
  expiresAt: string;
  status?: string;
};

const tenantOptions = () => ({
  headers: { 'X-Tenant-Id': String(getAuthenticatedUser()?.companyId || '') },
});
export const createOnboardingInvitation = (data: Record<string, unknown>) =>
  request<API.ApiResponse<Record<string, unknown>>>(
    '/api/hr/onboarding/invitations',
    { method: 'POST', data, ...tenantOptions() },
  );
export const listOnboardingInvitations = (status?: string) =>
  request<API.ApiResponse<ManagementAPI.OnboardingInvitation[]>>(
    `/api/hr/onboarding/invitations${
      status ? `?status=${encodeURIComponent(status)}` : ''
    }`,
    tenantOptions(),
  );
export const getEmployeeProfile = (id: number) =>
  request<API.ApiResponse<ManagementAPI.EmployeeProfile>>(
    `/api/hr/onboarding/employees/${id}`,
    tenantOptions(),
  );
export const revokeOnboardingInvitation = (id: number) =>
  request<API.ApiResponse<null>>(
    `/api/hr/onboarding/invitations/${id}/revoke`,
    { method: 'POST', ...tenantOptions() },
  );
export const regenerateOnboardingInvitation = (
  id: number,
  expiresInDays?: number,
) =>
  request<API.ApiResponse<Record<string, unknown>>>(
    `/api/hr/onboarding/invitations/${id}/regenerate`,
    { method: 'POST', data: { expiresInDays }, ...tenantOptions() },
  );
export const getCurrentOnboardingLink = (id: number) =>
  request<API.ApiResponse<Record<string, unknown>>>(
    `/api/hr/onboarding/invitations/${id}/link`,
    tenantOptions(),
  );
export const getPublicOnboardingForm = (token: string) =>
  request<API.ApiResponse<OnboardingForm>>(
    `/api/public/onboarding/forms/${encodeURIComponent(token)}`,
  );
export const submitPublicOnboardingForm = (
  token: string,
  data: Record<string, unknown>,
) =>
  request<API.ApiResponse<Record<string, unknown>>>(
    `/api/public/onboarding/forms/${encodeURIComponent(token)}/submit`,
    { method: 'POST', data },
  );
