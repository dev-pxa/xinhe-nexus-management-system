import { getMyAttendanceSchedule } from '@/services/management';
import { Space, Tag } from 'antd';
import { useEffect, useState } from 'react';

export default function AttendanceSchedule({ date }: { date: string }) {
  const [schedule, setSchedule] = useState<ManagementAPI.AttendanceSchedule>();
  useEffect(() => {
    let active = true;
    setSchedule(undefined);
    void getMyAttendanceSchedule(date)
      .then((response) => {
        if (active) setSchedule(response.data);
      })
      .catch(() => {
        /* A failed read can be retried on the next page visit. */
      });
    return () => {
      active = false;
    };
  }, [date]);
  if (!schedule) return null;
  if (schedule.status === 'COMPANY_HOLIDAY')
    return <Tag color="blue">公司假</Tag>;
  if (schedule.status === 'PERSONAL_HOLIDAY')
    return <Tag color="green">个人假</Tag>;
  if (schedule.status === 'UNCONFIGURED') return <Tag>考勤时间待配置</Tag>;
  return (
    <Space wrap size={4}>
      <Tag color="blue">
        考勤时间 {schedule.startTime}—{schedule.endTime}
      </Tag>
      <Tag>弹性 {schedule.flexibleMinutes ?? 30} 分钟</Tag>
    </Space>
  );
}
