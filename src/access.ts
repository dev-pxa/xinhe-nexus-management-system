export default function access(
  initialState: { currentUser?: API.UserInfo } | undefined,
) {
  const roles = initialState?.currentUser?.roles || [];
  const permissions = initialState?.currentUser?.permissions || [];
  const companyAdmin =
    roles.includes('COMPANY_ADMIN') || roles.includes('PLATFORM_ADMIN');
  return {
    isAdmin: companyAdmin,
    isPlatformAdmin: roles.includes('PLATFORM_ADMIN'),
    canCrm:
      companyAdmin ||
      permissions.some((permission) => permission.startsWith('crm:')),
    canCrmCustomers:
      companyAdmin ||
      permissions.some(
        (permission) =>
          permission.startsWith('crm:customer:') ||
          permission.startsWith('crm:followup:'),
      ),
    canCrmPlans:
      companyAdmin ||
      permissions.some((permission) => permission.startsWith('crm:plan:')),
    canCrmSalesOrders:
      companyAdmin ||
      permissions.some((permission) =>
        permission.startsWith('crm:sales-order:'),
      ),
    canUseErp:
      Boolean(initialState?.currentUser?.companyId) &&
      (companyAdmin ||
        permissions.some((permission) => permission.startsWith('erp:'))),
    canAllAttendance:
      companyAdmin || permissions.includes('oa:attendance:all:view'),
    canAttendanceCorrectionReview:
      companyAdmin ||
      permissions.includes('*') ||
      permissions.includes('oa:attendance:correction:review'),
  };
}
