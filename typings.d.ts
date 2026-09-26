declare namespace API {
  type UserInfo = {
    id: number;
    tenantId: number;
    username: string;
    name: string;
    roles: string[];
  };

  type ApiResponse<T> = {
    code: number;
    message: string;
    data: T;
    traceId?: string;
  };
}

