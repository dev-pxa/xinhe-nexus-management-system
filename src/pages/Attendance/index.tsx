import AttendanceSchedule from '@/components/AttendanceSchedule';
import { attendanceStatus } from '@/utils/attendanceStatus';
import {
  createAttendanceCorrection,
  listMyAttendance,
  punchAttendance,
} from '@/services/management';
import { PageContainer } from '@ant-design/pro-components';
import { history } from '@umijs/max';
import {
  Button,
  Card,
  DatePicker,
  Empty,
  Form,
  Input,
  message,
  Modal,
  Select,
  Space,
  Spin,
  Table,
  Tag,
} from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import { useCallback, useEffect, useMemo, useState } from 'react';
import styles from '../oaMobile.less';

type CorrectionLocation = {
  latitude: number;
  longitude: number;
  accuracy?: number;
  locationSource: string;
  locationAddress: string;
};
const mapUrl = (location: CorrectionLocation) => {
  const delta = 0.01;
  const { latitude, longitude } = location;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${
    longitude - delta
  },${latitude - delta},${longitude + delta},${
    latitude + delta
  }&layer=mapnik&marker=${latitude},${longitude}`;
};

const dateFormat = 'YYYY-MM-DD';
const formatTime = (value?: string) =>
  value ? dayjs(value).format('MM-DD HH:mm:ss') : '-';
const formatClock = (value?: string) =>
  value ? dayjs(value).format('HH:mm:ss') : '-';
const columns = [
  { title: '日期', dataIndex: 'punchDate', key: 'punchDate' },
  {
    title: '最早打卡',
    dataIndex: 'firstPunchTime',
    key: 'firstPunchTime',
    render: formatTime,
  },
  {
    title: '最晚打卡',
    dataIndex: 'lastPunchTime',
    key: 'lastPunchTime',
    render: formatTime,
  },
  { title: '打卡次数', dataIndex: 'punchCount', key: 'punchCount' },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    render: (_value: unknown, row: ManagementAPI.AttendanceSummary) => {
      const [label, color] = attendanceStatus(row);
      return <Tag color={color}>{label}</Tag>;
    },
  },
];

export default function AttendancePage() {
  const [month, setMonth] = useState<Dayjs>(dayjs());
  const [records, setRecords] = useState<ManagementAPI.AttendanceSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [punching, setPunching] = useState(false);
  const [correctionOpen, setCorrectionOpen] = useState(false);
  const [correctionLocation, setCorrectionLocation] =
    useState<CorrectionLocation>();
  const [locationLoading, setLocationLoading] = useState(false);
  const [addressQuery, setAddressQuery] = useState('');
  const [form] = Form.useForm();
  const range = useMemo(
    () => ({
      from: month.startOf('month').format(dateFormat),
      to: month.endOf('month').format(dateFormat),
    }),
    [month],
  );
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await listMyAttendance(range.from, range.to);
      if (response.code === 0) setRecords(response.data || []);
    } finally {
      setLoading(false);
    }
  }, [range]);
  useEffect(() => {
    void load();
  }, [load]);
  const getLocation = () =>
    new Promise<GeolocationPosition>((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('当前浏览器不支持定位'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        resolve,
        () => reject(new Error('请允许定位后再操作')),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
      );
    });
  const prepareCorrection = async () => {
    setCorrectionOpen(true);
    setLocationLoading(true);
    try {
      const position = await getLocation();
      setCorrectionLocation({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        locationSource: 'BROWSER_GPS',
        locationAddress: '当前位置',
      });
      setAddressQuery('');
    } catch (error: any) {
      message.warning(error?.message || '未获取到当前位置，请输入地址定位');
    } finally {
      setLocationLoading(false);
    }
  };
  const locateAddress = async () => {
    if (!addressQuery.trim()) {
      message.warning('请输入地址');
      return;
    }
    setLocationLoading(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&accept-language=zh-CN&q=${encodeURIComponent(
          addressQuery.trim(),
        )}`,
      );
      if (!response.ok) throw new Error('地址定位服务暂不可用');
      const results = (await response.json()) as Array<{
        lat: string;
        lon: string;
        display_name: string;
      }>;
      if (!results.length) throw new Error('没有找到匹配的地址');
      const result = results[0];
      setCorrectionLocation({
        latitude: Number(result.lat),
        longitude: Number(result.lon),
        locationSource: 'ADDRESS_SEARCH',
        locationAddress: result.display_name,
      });
    } catch (error: any) {
      message.error(error?.message || '地址定位失败');
    } finally {
      setLocationLoading(false);
    }
  };
  const punch = async (punchType: 'IN' | 'OUT') => {
    setPunching(true);
    try {
      const position = await getLocation();
      const response = await punchAttendance({
        punchType,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        locationSource: 'BROWSER_GPS',
        capturedAt: new Date(position.timestamp).toISOString(),
      });
      if (response.code !== 0) throw new Error(response.message);
      const settled = response.data;
      if (
        settled?.punchDate &&
        settled.punchDate >= range.from &&
        settled.punchDate <= range.to
      ) {
        setRecords((current) =>
          [settled, ...current.filter((item) => item.punchDate !== settled.punchDate)].sort(
            (left, right) => right.punchDate.localeCompare(left.punchDate),
          ),
        );
      }
      message.success('打卡成功');
    } catch (error: any) {
      message.error(error?.message || '打卡失败');
    } finally {
      setPunching(false);
    }
  };
  const submitCorrection = async (values: {
    requestedPunchTime: Dayjs;
    reason: string;
    punchType: 'IN' | 'OUT';
  }) => {
    try {
      if (!correctionLocation) throw new Error('请选择补打卡位置');
      const response = await createAttendanceCorrection({
        punchType: values.punchType,
        requestedPunchTime: values.requestedPunchTime.format(
          'YYYY-MM-DD HH:mm:ss',
        ),
        latitude: correctionLocation.latitude,
        longitude: correctionLocation.longitude,
        accuracy: correctionLocation.accuracy,
        locationSource: correctionLocation.locationSource,
        locationAddress: correctionLocation.locationAddress,
        reason: values.reason,
      });
      if (response.code !== 0) throw new Error(response.message);
      message.success('补打卡申请已提交，请在审批中心查看进度');
      setCorrectionOpen(false);
      form.resetFields();
      setCorrectionLocation(undefined);
    } catch (error: any) {
      message.error(error?.message || '补打卡申请提交失败');
    }
  };
  return (
    <PageContainer
      className={styles.page}
      title="我的考勤"
      content="打卡后立即更新今日记录；每日凌晨 1 点自动补齐前一天未打卡或休假记录"
      extra={
        <Space className={styles.pageActions} size={16}>
          <Button
            type="primary"
            aria-label="上班打卡"
            disabled={punching}
            loading={punching}
            onClick={() => void punch('IN')}
          >
            上班打卡
          </Button>
          <Button aria-label="下班打卡" disabled={punching} loading={punching} onClick={() => void punch('OUT')}>下班打卡</Button>
          <Button onClick={() => void prepareCorrection()}>申请补打卡</Button>
          <Button
            onClick={() => history.push(
              `/oa/approval/leave-requests?date=${dayjs().format(dateFormat)}`,
            )}
          >
            申请请假
          </Button>
        </Space>
      }
    >
      <AttendanceSchedule date={dayjs().format(dateFormat)} />
      <div className={styles.filterBar}>
        <DatePicker
          picker="month"
          value={month}
          allowClear={false}
          onChange={(value) => value && setMonth(value)}
        />
      </div>
      <div className={styles.desktopOnly}>
        <Table
          style={{ marginTop: 16 }}
          rowKey={(row) => row.punchDate}
          loading={loading}
          columns={[
            ...columns,
            {
              title: '操作',
              render: (
                _value: unknown,
                row: ManagementAPI.AttendanceSummary,
              ) => (
                <Button
                  type="link"
                  onClick={() =>
                    history.push(`/oa/attendance/${row.punchDate}`)
                  }
                >
                  查看
                </Button>
              ),
            },
          ]}
          dataSource={records}
          pagination={false}
          locale={{ emptyText: <Empty description="暂无打卡记录" /> }}
        />
      </div>
      <div className={styles.mobileOnly}>
        <Spin spinning={loading}>
          {records.length ? (
            <div className={styles.recordList}>
              {records.map((row) => {
                const [label, color] = attendanceStatus(row);
                return (
                  <Card className={styles.recordCard} key={row.punchDate}>
                    <div className={styles.recordHeader}>
                      <div className={styles.recordTitle}>
                        {dayjs(row.punchDate).format('YYYY年MM月DD日')}
                      </div>
                      <Tag color={color}>{label}</Tag>
                    </div>
                    <div className={styles.metricGrid}>
                      <div>
                        <span className={styles.metricLabel}>最早打卡</span>
                        <span className={styles.metricValue}>
                          {formatClock(row.firstPunchTime)}
                        </span>
                      </div>
                      <div>
                        <span className={styles.metricLabel}>最晚打卡</span>
                        <span className={styles.metricValue}>
                          {formatClock(row.lastPunchTime)}
                        </span>
                      </div>
                      <div>
                        <span className={styles.metricLabel}>打卡次数</span>
                        <span className={styles.metricValue}>
                          {row.punchCount ?? 0} 次
                        </span>
                      </div>
                    </div>
                    <div className={styles.cardActions}>
                      <Button
                        type="primary"
                        ghost
                        block
                        onClick={() =>
                          history.push(`/oa/attendance/${row.punchDate}`)
                        }
                      >
                        查看打卡明细
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className={styles.emptyCard}>
              <Empty description="暂无打卡记录" />
            </div>
          )}
        </Spin>
      </div>
      <Modal
        className={styles.responsiveModal}
        width={640}
        title="申请补打卡"
        open={correctionOpen}
        onCancel={() => setCorrectionOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={locationLoading}
      >
        <Form form={form} layout="vertical" onFinish={submitCorrection} initialValues={{punchType: 'IN'}}>
          <Form.Item name="punchType" label="打卡类型" rules={[{required: true, message: '请选择打卡类型'}]}>
            <Select options={[{value: 'IN', label: '上班打卡'}, {value: 'OUT', label: '下班打卡'}]} />
          </Form.Item>
          <Form.Item
            name="requestedPunchTime"
            label="补打卡时间"
            rules={[{ required: true, message: '请选择补打卡时间' }]}
          >
            <DatePicker showTime style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="补打卡位置" required>
            <Space.Compact
              className={styles.locationControls}
              style={{ width: '100%' }}
            >
              <Input
                value={addressQuery}
                onChange={(event) => setAddressQuery(event.target.value)}
                onPressEnter={() => void locateAddress()}
                placeholder="输入地址，例如：杭州市西湖区"
              />
              <Button
                loading={locationLoading}
                onClick={() => void locateAddress()}
              >
                地址定位
              </Button>
              <Button
                loading={locationLoading}
                onClick={() => void prepareCorrection()}
              >
                当前位置
              </Button>
            </Space.Compact>
            {correctionLocation && (
              <>
                <div style={{ marginTop: 8, color: '#666' }}>
                  已选位置：{correctionLocation.locationAddress}（
                  {correctionLocation.latitude.toFixed(6)},{' '}
                  {correctionLocation.longitude.toFixed(6)}）
                </div>
                <iframe
                  className={styles.locationMap}
                  title="补打卡位置地图"
                  src={mapUrl(correctionLocation)}
                  style={{
                    width: '100%',
                    height: 220,
                    border: 0,
                    borderRadius: 6,
                    marginTop: 8,
                  }}
                  loading="lazy"
                />
              </>
            )}
          </Form.Item>
          <Form.Item
            name="reason"
            label="申请原因"
            rules={[{ required: true, message: '请填写申请原因' }]}
          >
            <Input.TextArea rows={4} maxLength={1000} />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
}
