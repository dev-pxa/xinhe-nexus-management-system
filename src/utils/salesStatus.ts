export type SalesStatusMeta = { text: string; color: string };

export const approvalStatusMeta: Record<string, SalesStatusMeta> = {
  PENDING_APPROVAL: { text: '待审核', color: 'processing' },
  APPROVED: { text: '已通过', color: 'success' },
  REJECTED: { text: '已驳回', color: 'error' },
  WITHDRAWN: { text: '已撤回', color: 'default' },
};

export const fulfillmentStatusMeta: Record<string, SalesStatusMeta> = {
  WAITING_DISPATCH: { text: '待出库', color: 'processing' },
  DISPATCHED: { text: '已发货', color: 'blue' },
  SIGNED: { text: '已签收', color: 'cyan' },
  COMPLETED: { text: '已完成', color: 'success' },
  RETURNING: { text: '退货中', color: 'warning' },
  RETURNED: { text: '已退货', color: 'default' },
  CLOSED: { text: '已关闭', color: 'default' },
};

export const approvalStatus = (value?: string): SalesStatusMeta =>
  (value && approvalStatusMeta[value]) || {
    text: '未知状态',
    color: 'default',
  };

export const fulfillmentStatus = (value?: string): SalesStatusMeta =>
  (value && fulfillmentStatusMeta[value]) || {
    text: '未知状态',
    color: 'default',
  };
