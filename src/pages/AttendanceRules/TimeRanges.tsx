import { saveAttendanceTimes } from '@/services/management';
import {
  Alert,
  Button,
  Card,
  DatePicker,
  Empty,
  InputNumber,
  Modal,
  Space,
  TimePicker,
  Typography,
  message,
} from 'antd';
import dayjs from 'dayjs';
import { useEffect, useMemo, useState } from 'react';
import styles from './timeRanges.less';

type Row = Partial<ManagementAPI.AttendanceTimeRange> & { key: number };
let rowSequence = 0;
const makeRow = (value: Partial<ManagementAPI.AttendanceTimeRange>): Row => ({
  ...value,
  flexibleMinutes: value.flexibleMinutes ?? 30,
  key: ++rowSequence,
});

function coverage(year: number, rows: Row[], exemptions: string[]) {
  const counts = new Map<string, number>();
  const excluded = new Set(exemptions);
  const errors: string[] = [];
  rows.forEach((row, index) => {
    if (!row.startDate || !row.endDate || !row.startTime || !row.endTime) {
      errors.push(`第 ${index + 1} 段的日期和上下班时间未填写完整`);
      return;
    }
    if (
      dayjs(row.startDate).year() !== year ||
      dayjs(row.endDate).year() !== year ||
      row.startDate > row.endDate
    ) {
      errors.push(`第 ${index + 1} 段的日期范围不正确`);
      return;
    }
    const flexible = row.flexibleMinutes ?? 30;
    if (!Number.isInteger(flexible) || flexible < 0 || flexible > 1439) {
      errors.push(`第 ${index + 1} 段的弹性分钟数应为0至1439之间的整数`);
    }
    if (row.startTime >= row.endTime)
      errors.push(`第 ${index + 1} 段的下班时间必须晚于上班时间`);
    for (
      let date = dayjs(row.startDate);
      date.format('YYYY-MM-DD') <= row.endDate;
      date = date.add(1, 'day')
    ) {
      const key = date.format('YYYY-MM-DD');
      counts.set(key, (counts.get(key) || 0) + 1);
    }
  });
  const missing: string[] = [];
  let required = 0;
  for (
    let date = dayjs(`${year}-01-01`);
    date.year() === year;
    date = date.add(1, 'day')
  ) {
    const key = date.format('YYYY-MM-DD');
    if (excluded.has(key)) continue;
    required++;
    if (!counts.has(key)) missing.push(key);
  }
  const overlap = [...counts]
    .filter(([, count]) => count > 1)
    .map(([date]) => date)
    .sort();
  if (overlap.length) errors.push(`日期重叠 ${overlap.slice(0, 8).join('、')}`);
  return { errors, missing, required };
}

export default function TimeRanges({
  year,
  rule,
  onSaved,
}: {
  year: number;
  rule?: ManagementAPI.AttendanceRuleYear;
  onSaved: (rule: ManagementAPI.AttendanceRuleYear) => void;
}) {
  const [rows, setRows] = useState<Row[]>([]);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    setRows((rule?.timeRanges || []).map(makeRow));
  }, [year, rule]);
  const result = useMemo(
    () => coverage(year, rows, rule?.timeExemptDates || []),
    [year, rows, rule?.timeExemptDates],
  );
  const update = (key: number, values: Partial<Row>) =>
    setRows((current) =>
      current.map((row) => (row.key === key ? { ...row, ...values } : row)),
    );
  const remove = (key: number) =>
    Modal.confirm({
      title: '删除这段考勤时间？',
      content: '删除后请补齐全年应出勤日期，保存后生效。',
      okText: '删除时间段',
      okType: 'danger',
      cancelText: '取消',
      onOk: () =>
        setRows((current) => current.filter((row) => row.key !== key)),
    });
  const save = async () => {
    if (result.errors.length || result.missing.length) {
      message.error(
        result.errors[0] ||
          `考勤时间未覆盖全年应出勤日期，还缺 ${result.missing.length} 天`,
      );
      return;
    }
    setSaving(true);
    try {
      const response = await saveAttendanceTimes(
        year,
        rows.map(
          ({ key, ...value }) => value as ManagementAPI.AttendanceTimeRange,
        ),
      );
      if (response.code === 0 && response.data) {
        onSaved(response.data);
        message.success('考勤时间已保存为草稿');
      }
    } catch {
      // The shared request handler displays server validation errors.
    } finally {
      setSaving(false);
    }
  };
  const add = () => {
    const last = [...rows]
      .filter((row) => row.endDate)
      .sort((a, b) => a.endDate!.localeCompare(b.endDate!))
      .at(-1);
    const next = last
      ? dayjs(last.endDate).add(1, 'day')
      : dayjs(`${year}-01-01`);
    setRows((current) => [
      ...current,
      makeRow({
        startDate: next.year() === year ? next.format('YYYY-MM-DD') : undefined,
        endDate: `${year}-12-31`,
      }),
    ]);
  };

  return (
    <Card
      title="设置考勤时间"
      extra={
        <Button
          type="primary"
          loading={saving}
          disabled={!rule}
          onClick={() => void save()}
        >
          保存考勤时间
        </Button>
      }
    >
      <Alert
        type="info"
        showIcon
        message="按日期范围设置上下班时间，保存后需发布。弹性默认30分钟，上班向后、下班向前放宽，边界时刻算正常。公司假和个人假仅按日期休息，当天不显示考勤时间。"
        description="请覆盖全年仍有员工出勤的日期。已发布的今天及过去时间已冻结，首次补充全年时间时可录入历史日期。"
      />
      <Space wrap className={styles.toolbar}>
        <Button onClick={add}>新增日期范围</Button>
        {!rows.length && (
          <Button
            onClick={() =>
              setRows([
                makeRow({
                  startDate: `${year}-01-01`,
                  endDate: `${year}-12-31`,
                }),
              ])
            }
          >
            全年使用同一时间
          </Button>
        )}
        <Typography.Text>
          已覆盖 {result.required - result.missing.length} / {result.required}{' '}
          个应出勤日期
        </Typography.Text>
      </Space>
      {result.errors.map((error) => (
        <Alert
          className={styles.issue}
          type="error"
          showIcon
          key={error}
          message={error}
        />
      ))}
      {result.missing.length > 0 && (
        <Alert
          className={styles.issue}
          type="warning"
          showIcon
          message={`还缺 ${result.missing.length} 天`}
          description={
            result.missing.slice(0, 10).join('、') +
            (result.missing.length > 10 ? ' 等日期' : '')
          }
        />
      )}
      {!rows.length && <Empty description="尚未配置考勤时间" />}
      <div className={styles.rows}>
        {rows.map((row, index) => (
          <div
            className={styles.row}
            key={row.key}
            role="group"
            aria-label={`考勤时间段 ${index + 1}`}
          >
            <label>
              开始日期
              <DatePicker
                aria-label="开始日期"
                value={row.startDate ? dayjs(row.startDate) : null}
                disabledDate={(date) => date.year() !== year}
                onChange={(date) =>
                  update(row.key, { startDate: date?.format('YYYY-MM-DD') })
                }
              />
            </label>
            <label>
              结束日期
              <DatePicker
                aria-label="结束日期"
                value={row.endDate ? dayjs(row.endDate) : null}
                disabledDate={(date) => date.year() !== year}
                onChange={(date) =>
                  update(row.key, { endDate: date?.format('YYYY-MM-DD') })
                }
              />
            </label>
            <label>
              上班时间
              <TimePicker
                aria-label="上班时间"
                format="HH:mm"
                needConfirm={false}
                value={
                  row.startTime ? dayjs(`2000-01-01 ${row.startTime}`) : null
                }
                onChange={(time) =>
                  update(row.key, { startTime: time?.format('HH:mm') })
                }
              />
            </label>
            <label>
              下班时间
              <TimePicker
                aria-label="下班时间"
                format="HH:mm"
                needConfirm={false}
                value={row.endTime ? dayjs(`2000-01-01 ${row.endTime}`) : null}
                onChange={(time) =>
                  update(row.key, { endTime: time?.format('HH:mm') })
                }
              />
            </label>
            <label>
              弹性时间（分钟）
              <InputNumber
                aria-label="弹性时间（分钟）"
                min={0}
                max={1439}
                precision={0}
                value={row.flexibleMinutes ?? 30}
                onChange={(value) =>
                  update(row.key, { flexibleMinutes: value ?? 30 })
                }
              />
            </label>
            <Button danger type="link" onClick={() => remove(row.key)}>
              删除
            </Button>
          </div>
        ))}
      </div>
    </Card>
  );
}
