import { createAttendanceCorrection, listMyAttendance, punchAttendance } from '@/services/management';
import { PageContainer } from '@ant-design/pro-components';
import { history } from '@umijs/max';
import { Button, DatePicker, Empty, Form, Input, message, Modal, Space, Table, Tag } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import { useCallback, useEffect, useMemo, useState } from 'react';

type CorrectionLocation = { latitude: number; longitude: number; accuracy?: number; locationSource: string; locationAddress: string };
const mapUrl = (location: CorrectionLocation) => {
  const delta = 0.01;
  const { latitude, longitude } = location;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${longitude - delta},${latitude - delta},${longitude + delta},${latitude + delta}&layer=mapnik&marker=${latitude},${longitude}`;
};

const dateFormat = 'YYYY-MM-DD';
const formatTime = (value?: string) => (value ? dayjs(value).format('MM-DD HH:mm:ss') : '-');
const statusMap: Record<ManagementAPI.AttendanceSummary['status'], [string, string]> = {
  NO_RECORD: ['无记录', 'default'], SINGLE: ['单次打卡', 'warning'], NORMAL: ['正常', 'success'],
};
const columns = [
  { title: '日期', dataIndex: 'punchDate', key: 'punchDate' },
  { title: '最早打卡', dataIndex: 'firstPunchTime', key: 'firstPunchTime', render: formatTime },
  { title: '最晚打卡', dataIndex: 'lastPunchTime', key: 'lastPunchTime', render: formatTime },
  { title: '打卡次数', dataIndex: 'punchCount', key: 'punchCount' },
  { title: '状态', dataIndex: 'status', key: 'status', render: (value: ManagementAPI.AttendanceSummary['status']) => {
    const [label, color] = statusMap[value] || ['未知', 'default'];
    return <Tag color={color}>{label}</Tag>;
  } },
];

export default function AttendancePage() {
  const [month, setMonth] = useState<Dayjs>(dayjs());
  const [records, setRecords] = useState<ManagementAPI.AttendanceSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [punching, setPunching] = useState(false);
  const [correctionOpen, setCorrectionOpen] = useState(false);
  const [correctionLocation, setCorrectionLocation] = useState<CorrectionLocation>();
  const [locationLoading, setLocationLoading] = useState(false);
  const [addressQuery, setAddressQuery] = useState('');
  const [form] = Form.useForm();
  const range = useMemo(() => ({
    from: month.startOf('month').format(dateFormat), to: month.endOf('month').format(dateFormat),
  }), [month]);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await listMyAttendance(range.from, range.to);
      if (response.code === 0) setRecords(response.data || []);
    } finally { setLoading(false); }
  }, [range]);
  useEffect(() => { void load(); }, [load]);
  const getLocation = () => new Promise<GeolocationPosition>((resolve, reject) => {
    if (!navigator.geolocation) { reject(new Error('当前浏览器不支持定位')); return; }
    navigator.geolocation.getCurrentPosition(resolve, () => reject(new Error('请允许定位后再操作')), { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
  });
  const prepareCorrection = async () => {
    setCorrectionOpen(true);
    setLocationLoading(true);
    try {
      const position = await getLocation();
      setCorrectionLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy, locationSource: 'BROWSER_GPS', locationAddress: '当前位置' });
      setAddressQuery('');
    } catch (error: any) {
      message.warning(error?.message || '未获取到当前位置，请输入地址定位');
    } finally { setLocationLoading(false); }
  };
  const locateAddress = async () => {
    if (!addressQuery.trim()) { message.warning('请输入地址'); return; }
    setLocationLoading(true);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&accept-language=zh-CN&q=${encodeURIComponent(addressQuery.trim())}`);
      if (!response.ok) throw new Error('地址定位服务暂不可用');
      const results = await response.json() as Array<{ lat: string; lon: string; display_name: string }>;
      if (!results.length) throw new Error('没有找到匹配的地址');
      const result = results[0];
      setCorrectionLocation({ latitude: Number(result.lat), longitude: Number(result.lon), locationSource: 'ADDRESS_SEARCH', locationAddress: result.display_name });
    } catch (error: any) { message.error(error?.message || '地址定位失败'); }
    finally { setLocationLoading(false); }
  };
  const punch = async () => {
    setPunching(true);
    try { const position = await getLocation(); const response = await punchAttendance({ latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy, locationSource: 'BROWSER_GPS', capturedAt: new Date(position.timestamp).toISOString() }); if (response.code !== 0) throw new Error(response.message); message.success('打卡成功'); await load(); }
    catch (error: any) { message.error(error?.message || '打卡失败'); }
    finally { setPunching(false); }
  };
  const submitCorrection = async (values: { requestedPunchTime: Dayjs; reason: string }) => {
    try { if (!correctionLocation) throw new Error('请选择补打卡位置'); const response = await createAttendanceCorrection({ requestedPunchTime: values.requestedPunchTime.format('YYYY-MM-DD HH:mm:ss'), latitude: correctionLocation.latitude, longitude: correctionLocation.longitude, accuracy: correctionLocation.accuracy, locationSource: correctionLocation.locationSource, locationAddress: correctionLocation.locationAddress, reason: values.reason }); if (response.code !== 0) throw new Error(response.message); message.success('补打卡申请已提交，请在审批中心查看进度'); setCorrectionOpen(false); form.resetFields(); setCorrectionLocation(undefined); }
    catch (error: any) { message.error(error?.message || '补打卡申请提交失败'); }
  };
  return (
    <PageContainer title="我的打卡记录" content="记录每日最早和最晚打卡时间" extra={<Space size={16}>
      <Button type="primary" loading={punching} onClick={() => void punch()}>立即打卡</Button>
      <Button onClick={() => void prepareCorrection()}>申请补打卡</Button>
    </Space>}>
      <DatePicker picker="month" value={month} allowClear={false} onChange={(value) => value && setMonth(value)} />
      <Table style={{ marginTop: 16 }} rowKey={(row) => row.punchDate} loading={loading} columns={[...columns, { title: '操作', render: (_value: unknown, row: ManagementAPI.AttendanceSummary) => <Button type="link" onClick={() => history.push(`/oa/attendance/${row.punchDate}`)}>查看</Button> }]}
        dataSource={records} pagination={false} locale={{ emptyText: <Empty description="暂无打卡记录" /> }} />
      <Modal width={640} title="申请补打卡" open={correctionOpen} onCancel={() => setCorrectionOpen(false)} onOk={() => form.submit()} confirmLoading={locationLoading}>
        <Form form={form} layout="vertical" onFinish={submitCorrection}>
          <Form.Item name="requestedPunchTime" label="补打卡时间" rules={[{ required: true, message: '请选择补打卡时间' }]}><DatePicker showTime style={{ width: '100%' }} /></Form.Item>
          <Form.Item label="补打卡位置" required>
            <Space.Compact style={{ width: '100%' }}>
              <Input value={addressQuery} onChange={(event) => setAddressQuery(event.target.value)} onPressEnter={() => void locateAddress()} placeholder="输入地址，例如：杭州市西湖区" />
              <Button loading={locationLoading} onClick={() => void locateAddress()}>地址定位</Button>
              <Button loading={locationLoading} onClick={() => void prepareCorrection()}>当前位置</Button>
            </Space.Compact>
            {correctionLocation && <>
              <div style={{ marginTop: 8, color: '#666' }}>已选位置：{correctionLocation.locationAddress}（{correctionLocation.latitude.toFixed(6)}, {correctionLocation.longitude.toFixed(6)}）</div>
              <iframe title="补打卡位置地图" src={mapUrl(correctionLocation)} style={{ width: '100%', height: 220, border: 0, borderRadius: 6, marginTop: 8 }} loading="lazy" />
            </>}
          </Form.Item>
          <Form.Item name="reason" label="申请原因" rules={[{ required: true, message: '请填写申请原因' }]}><Input.TextArea rows={4} maxLength={1000} /></Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
}
