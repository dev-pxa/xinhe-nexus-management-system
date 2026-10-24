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
    positionNames?: string;
    lastLoginAt?: string;
    version: number;
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
}

declare module '*.less' {
  const styles: Record<string, string>;
  export default styles;
}
