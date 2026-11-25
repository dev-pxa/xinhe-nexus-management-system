import { request } from '@umijs/max';

export const leaveTypeLabels = {
  SICK: '病假',
  COMPENSATORY: '调休假',
  PERSONAL: '事假',
  OTHER: '其他',
};

export type LeaveType = keyof typeof leaveTypeLabels;

export const leaveStatusLabels = {
  PENDING_MANAGER: '待首轮审批',
  PENDING_FINAL: '待公司顶层管理员终审',
  APPROVED: '已通过',
  REJECTED: '已驳回',
  WITHDRAWN: '已撤回',
};

type LeaveStatus = keyof typeof leaveStatusLabels;
export type LeaveDay = {
  date: string;
  dayType: 'WORKDAY' | 'COMPANY_HOLIDAY' | 'PERSONAL_HOLIDAY';
};
export type LeavePreview = {
  days: LeaveDay[];
  conflictDates: string[];
  managerName: string;
  finalReviewerName?: string | null;
};
export type LeaveRequest = {
  id: number;
  applicantName: string;
  departmentName: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  leaveDays: number;
  reason: string;
  status: LeaveStatus;
  managerName: string;
  managerActedAt?: string;
  managerComment?: string;
  finalReviewerName?: string | null;
  finalActedAt?: string;
  finalComment?: string;
  submittedAt: string;
};
export type LeaveDetail = LeaveRequest & {
  days: LeaveDay[];
  attachmentName?: string;
  attachmentContentType?: string;
  canReview: boolean;
  canWithdraw: boolean;
};
type LeaveInput = Pick<
  LeaveRequest,
  'leaveType' | 'startDate' | 'endDate' | 'reason'
>;

const endpoint = '/api/oa/attendance/leave-requests';

export const listLeaveRequests = (review: boolean) =>
  request<API.ApiResponse<LeaveRequest[]>>(endpoint, { params: { review } });

export const previewLeave = (startDate: string, endDate: string) =>
  request<API.ApiResponse<LeavePreview>>(`${endpoint}/preview`, {
    params: { startDate, endDate },
    skipErrorHandler: true,
  });

export const createLeave = (input: LeaveInput, attachment?: File) => {
  const data = new FormData();
  data.append(
    'input',
    new Blob([JSON.stringify(input)], { type: 'application/json' }),
  );
  if (attachment) data.append('attachment', attachment);
  return request<API.ApiResponse<{ id: number }>>(endpoint, {
    method: 'POST',
    data,
  });
};

export const getLeave = (id: number) =>
  request<API.ApiResponse<LeaveDetail>>(`${endpoint}/${id}`);

export const withdrawLeave = (id: number) =>
  request<API.ApiResponse<null>>(`${endpoint}/${id}/withdraw`, {
    method: 'POST',
  });

export const reviewLeave = (id: number, approve: boolean, comment?: string) =>
  request<API.ApiResponse<null>>(`${endpoint}/${id}/decision`, {
    method: 'POST',
    data: { approve, comment },
  });

export const leaveAttachmentUrl = (id: number) =>
  `${endpoint}/${id}/attachment`;
