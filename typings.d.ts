declare namespace API {
  type UserInfo = {
    id: number;
    tenantId: number;
    username: string;
    name: string;
    roles: string[];
    permissions: string[];
  };

  type ApiResponse<T> = {
    code: number;
    message: string;
    data: T;
    traceId?: string;
  };
}

declare module '*.less' {
  const styles: Record<string, string>;
  export default styles;
}
