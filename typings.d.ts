declare namespace API {
  type UserInfo = {
    id: number;
    companyId?: number;
    companyName?: string;
    username: string;
    name: string;
    roles: string[];
    permissions: string[];
    mustChangePassword: boolean;
    authVersion: number;
    headquarters: boolean;
  };

  type PersonalProfile = {
    username: string;
    displayName: string;
    phone?: string;
    email?: string;
  };

  type ApiResponse<T> = {
    code: number;
    message: string;
    data: T;
    traceId?: string;
  };
}

declare namespace ManagementAPI {
  type Company = {
    id: number;
    companyCode: string;
    companyName: string;
    channelLevel: number;
    upstreamCompanyId?: number;
    upstreamCompanyName?: string;
    contactName?: string;
    contactPhone?: string;
    status: string;
    version: number;
  };

  type Organization = {
    id: number;
    companyId: number;
    parentId?: number;
    orgCode: string;
    orgName: string;
    orgPath: string;
    orgLevel: number;
    managerUserId?: number;
    managerName?: string;
    managerPositionId?: number;
    managerPositionCode?: string;
    managerPositionName?: string;
    contactPhone?: string;
    description?: string;
    status: string;
    version: number;
    effectiveEnabled: boolean | number;
  };

  type Position = {
    id: number;
    companyId: number;
    orgUnitId: number;
    orgName: string;
    positionCode: string;
    positionName: string;
    responsibilities?: string;
    status: string;
    version: number;
    userCount: number;
    permissionCount: number;
  };

  type User = {
    id: number;
    username: string;
    displayName: string;
    phone?: string;
    email?: string;
    status: string;
    mustChangePassword: boolean;
    companyId: number;
    companyName: string;
    companyAdmin: boolean;
    positionName?: string;
    lastLoginAt?: string;
    version: number;
  };

  type OnboardingInvitation = {
    id: number;
    candidateName: string;
    departmentId: number;
    departmentName: string;
    positionId: number;
    positionName: string;
    status: string;
    profileStatus: string;
    profileId?: number;
    expiresAt: string;
    submittedAt?: string;
    createdAt: string;
  };

  type EmployeeProfile = {
    id: number;
    candidateName: string;
    username: string;
    departmentName: string;
    positionName: string;
    phone?: string;
    email?: string;
    gender?: string;
    birthDate?: string;
    idType?: string;
    idNumber?: string;
    address?: string;
    emergencyContactName?: string;
    emergencyContactRelation?: string;
    emergencyContactPhone?: string;
    status?: string;
    submittedAt?: string;
    educations: Array<{
      startMonth: string;
      endMonth: string;
      educationLevel: string;
      schoolName: string;
    }>;
  };

  type ProfileChangeRequest = {
    id: number;
    status: string;
    beforeData?: string;
    afterData?: string;
    reviewComment?: string;
    createdAt: string;
    reviewedAt?: string;
    approverName?: string;
    applicantName?: string;
  };

  type Permission = {
    id: number;
    parentId?: number;
    permissionCode: string;
    permissionName: string;
    permissionKind: 'MODULE' | 'MENU' | 'ACTION';
    moduleCode: string;
    status: string;
  };

  type UserPosition = {
    positionId?: number;
    positionCode?: string;
    positionName?: string;
    orgUnitId?: number;
    orgName?: string;
  };

  type UserPermissionAssignment = {
    positionId?: number;
    positionPermissionIds: number[];
    directPermissionIds: number[];
    effectivePermissionIds: number[];
  };

  type AttendanceSummary = {
    id?: number;
    companyId?: number;
    userId?: number;
    username?: string;
    displayName?: string;
    orgName?: string;
    punchDate: string;
    firstPunchTime?: string;
    lastPunchTime?: string;
    punchCount: number;
    dayType?: 'WORKDAY' | 'COMPANY_HOLIDAY' | 'PERSONAL_HOLIDAY';
    status:
      | 'NO_RECORD'
      | 'PENDING_SETTLEMENT'
      | 'ABSENT'
      | 'SINGLE'
      | 'NORMAL'
      | 'RULE_MISSING'
      | 'COMPANY_HOLIDAY'
      | 'PERSONAL_HOLIDAY';
  };
  type AttendanceRuleConflict = {
    userId: number;
    userName: string;
    dates: string[];
  };
  type AttendanceRuleYear = {
    id?: number;
    year: number;
    status: 'UNCONFIGURED' | 'DRAFT' | 'PUBLISHED';
    companyConfigured: boolean | number;
    draftRevision: number;
    publishedRevision?: number;
    version: number;
    publishedAt?: string;
    companyHolidayDates: string[];
    conflicts: AttendanceRuleConflict[];
    requiredPersonalHolidayCount: number;
  };
  type AttendanceRuleUser = {
    id: number;
    name: string;
    username: string;
    holidayCount: number;
    conflictCount: number;
    requiredPersonalHolidayCount: number;
  };
  type AttendanceRuleUserDetail = {
    year: number;
    userId: number;
    companyConfigured: boolean | number;
    version: number;
    companyHolidayDates: string[];
    personalHolidayDates: string[];
    conflictDates: string[];
    requiredPersonalHolidayCount: number;
  };

  type AttendanceCorrection = {
    id: number;
    userId?: number;
    userName?: string;
    attendanceDate: string;
    punchType: string;
    requestedPunchTime: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
    reason: string;
    locationAddress?: string;
    latitude?: number;
    longitude?: number;
    locationAccuracy?: number;
    locationSource?: string;
    reviewComment?: string;
  };

  type AttendancePunch = {
    id: number;
    punchTime: string;
    punchType: string;
    source: string;
    latitude?: number;
    longitude?: number;
    locationAccuracy?: number;
    locationSource?: string;
    remark?: string;
    createdAt?: string;
  };

  type ExpenseAttachment = {
    id: number;
    itemId: number;
    attachmentKind: 'INVOICE' | 'OTHER';
    fileName: string;
    contentType: string;
    fileSize: number;
  };

  type ExpenseItem = {
    id?: number;
    expenseCategory: 'ACCOMMODATION' | 'MEAL' | 'TRANSPORT' | 'OTHER';
    expenseDate?: string;
    expenseLocation?: string;
    amount?: number;
    remark?: string;
  };

  type ExpenseApprovalNode = {
    id: number;
    approvalRound?: number;
    sequenceNo: number;
    nodeType?: 'DEPARTMENT_MANAGER' | 'FINAL_APPROVER';
    orgName?: string;
    reviewerUserId?: number;
    reviewerName?: string;
    preview?: boolean;
    reviewerPositionName?: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
    opinion?: string;
    actedAt?: string;
  };

  type ExpenseClaim = {
    id: number;
    claimNo: string;
    totalAmount: number;
    status: 'DRAFT' | 'PENDING' | 'REVIEWING' | 'APPROVED' | 'REJECTED';
    currentReviewerId?: number;
    currentNodeName?: string;
    applicantName?: string;
    applicantOrgName?: string;
    approvalRound?: number;
    version: number;
    canReview?: boolean;
    canWithdraw?: boolean;
    submittedAt?: string;
    createdAt?: string;
    updatedAt?: string;
    items?: ExpenseItem[];
    attachments?: ExpenseAttachment[];
    approvalNodes?: ExpenseApprovalNode[];
  };
}

declare module '*.less' {
  const styles: Record<string, string>;
  export default styles;
}
