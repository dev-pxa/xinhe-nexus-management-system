export default function access(initialState: { currentUser?: API.UserInfo } | undefined) {
  const roles = initialState?.currentUser?.roles || [];
  return {
    isAdmin: roles.includes('PLATFORM_ADMIN') || roles.includes('TENANT_ADMIN'),
  };
}

