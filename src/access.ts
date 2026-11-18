export default function access(
  initialState: { currentUser?: API.UserInfo } | undefined,
) {
  const roles = initialState?.currentUser?.roles || [];
  const permissions = initialState?.currentUser?.permissions || [];
  const companyAdmin =
    roles.includes('COMPANY_ADMIN') || roles.includes('PLATFORM_ADMIN');
  const companyUser = Boolean(initialState?.currentUser?.companyId);
  return {
    isAdmin: companyAdmin,
    isPlatformAdmin: roles.includes('PLATFORM_ADMIN'),
    canEmployeeProfiles:
      Boolean(initialState?.currentUser?.companyId) && roles.includes('COMPANY_ADMIN'),
    canPersonalProfile: Boolean(initialState?.currentUser?.companyId),
    canCrm:
      companyUser &&
      (companyAdmin ||
        permissions.some((permission) => permission.startsWith('crm:'))),
    canCrmCustomers:
      companyUser &&
      (companyAdmin ||
        permissions.some(
        (permission) =>
          permission.startsWith('crm:customer:') ||
          permission.startsWith('crm:followup:'),
        )),
    canCrmPlans:
      companyUser &&
      (companyAdmin ||
        permissions.some((permission) => permission.startsWith('crm:plan:'))),
    canCrmSalesOrders:
      companyUser &&
      (companyAdmin ||
        permissions.some((permission) =>
          permission.startsWith('crm:sales-order:'),
        )),
    canUseErp:
      Boolean(initialState?.currentUser?.companyId) &&
      (companyAdmin ||
        permissions.some((permission) => permission.startsWith('erp:'))),
    canAllAttendance:
      companyUser &&
      (companyAdmin || permissions.includes('oa:attendance:all:view')),
    canAttendanceCorrectionReview:
      companyUser &&
      (companyAdmin ||
        permissions.includes('*') ||
        permissions.includes('oa:attendance:correction:review')),
    canUseOa: companyUser,
    canProfileApproval:
      Boolean(initialState?.currentUser?.companyId) &&
      (companyAdmin || permissions.includes('hr:profile:approve')),
  };
}
