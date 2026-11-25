import { leaveTypeLabels } from '@/services/leave';

const labels: Record<string, [string, string]> = {
  NO_RECORD: ['无记录', 'default'],
  PENDING_SETTLEMENT: ['待结算', 'processing'],
  ABSENT: ['缺勤', 'error'],
  SINGLE: ['单次打卡', 'warning'],
  NORMAL: ['正常', 'success'],
  LATE: ['迟到', 'warning'],
  EARLY: ['早退', 'warning'],
  LATE_EARLY: ['迟到、早退', 'warning'],
  WAITING_IN: ['待上班打卡', 'processing'],
  WAITING_OUT: ['待下班打卡', 'processing'],
  MISSING_IN: ['上班缺卡', 'error'],
  MISSING_OUT: ['下班缺卡', 'error'],
  RULE_MISSING: ['规则未配置', 'error'],
  COMPANY_HOLIDAY: ['公司假', 'blue'],
  PERSONAL_HOLIDAY: ['个人假', 'green'],
};

export function attendanceStatus(
  row?: ManagementAPI.AttendanceSummary,
): [string, string] {
  if (row?.status === 'ON_LEAVE') {
    const leaveType = row.leaveType as keyof typeof leaveTypeLabels;
    return [`已请假—${leaveTypeLabels[leaveType] || '未知假种'}`, 'cyan'];
  }
  const result = labels[row?.status || 'NO_RECORD'] || ['未知状态', 'default'];
  if (
    row &&
    ['WAITING_IN', 'WAITING_OUT', 'MISSING_IN', 'MISSING_OUT'].includes(
      row.status,
    )
  ) {
    const extra = [row.late ? '迟到' : '', row.early ? '早退' : ''].filter(
      Boolean,
    );
    return [
      [result[0], ...extra].join('、'),
      extra.length ? 'warning' : result[1],
    ];
  }
  return result;
}
