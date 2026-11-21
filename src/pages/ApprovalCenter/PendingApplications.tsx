import {
  decideAttendanceCorrection,
  listPendingAttendanceCorrections,
} from '@/services/management';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import {
  Button,
  Card,
  Empty,
  Form,
  Input,
  List,
  message,
  Modal,
  Space,
} from 'antd';
import dayjs from 'dayjs';
import { useCallback, useEffect, useState } from 'react';
import styles from '../oaMobile.less';

const punchTypeLabel: Record<string, string> = {
  NORMAL: '正常打卡',
  IN: '上班打卡',
  OUT: '下班打卡',
};

export default function PendingApplicationsPage() {
  const [data, setData] = useState<ManagementAPI.AttendanceCorrection[]>([]);
  const [loading, setLoading] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectingId, setRejectingId] = useState<number>();
  const [form] = Form.useForm<{ comment: string }>();
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await listPendingAttendanceCorrections();
      if (response.code === 0) setData(response.data || []);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  const decide = async (id: number, approve: boolean, comment: string) => {
    const response = await decideAttendanceCorrection(id, approve, comment);
    if (response.code !== 0) {
      message.error(response.message);
      return;
    }
    message.success(approve ? '已通过申请' : '已驳回申请');
    await load();
  };
  const approve = (id: number) => void decide(id, true, '同意补打卡');
  const openReject = (id: number) => {
    setRejectingId(id);
    form.resetFields();
    setRejectOpen(true);
  };
  const reject = async ({ comment }: { comment: string }) => {
    if (!rejectingId) return;
    await decide(rejectingId, false, comment.trim());
    setRejectOpen(false);
    setRejectingId(undefined);
  };
  return (
    <PageContainer
      className={styles.page}
      title="补打卡审批"
      content="查看并处理直属员工提交的补打卡申请"
    >
      <div className={styles.desktopOnly}>
        <ProTable<ManagementAPI.AttendanceCorrection>
          rowKey="id"
          search={false}
          options={false}
          loading={loading}
          dataSource={data}
          pagination={{ pageSize: 10 }}
          locale={{ emptyText: <Empty description="暂无待审批申请" /> }}
          columns={[
            { title: '员工', dataIndex: 'userName' },
            { title: '补打卡日期', dataIndex: 'attendanceDate' },
            { title: '补打卡时间', dataIndex: 'requestedPunchTime' },
            {
              title: '类型',
              dataIndex: 'punchType',
              render: (value) =>
                punchTypeLabel[String(value)] || '未知打卡类型',
            },
            { title: '申请原因', dataIndex: 'reason' },
            {
              title: '申请位置',
              dataIndex: 'locationAddress',
              render: (value) => value || '-',
            },
            {
              title: '操作',
              render: (_value, row) => (
                <Space>
                  <Button type="link" onClick={() => approve(row.id)}>
                    通过
                  </Button>
                  <Button type="link" danger onClick={() => openReject(row.id)}>
                    驳回
                  </Button>
                </Space>
              ),
            },
          ]}
        />
      </div>
      <div className={styles.mobileOnly}>
        <List
          loading={loading}
          dataSource={data}
          locale={{
            emptyText: (
              <div className={styles.emptyCard}>
                <Empty description="暂无待审批申请" />
              </div>
            ),
          }}
          pagination={
            data.length > 10 ? { pageSize: 10, showSizeChanger: false } : false
          }
          renderItem={(row) => (
            <List.Item style={{ padding: 0, border: 0 }}>
              <Card
                className={styles.recordCard}
                style={{ width: '100%', marginBottom: 12 }}
              >
                <div className={styles.recordTitle}>
                  {row.userName || '未知员工'}
                </div>
                <div className={styles.recordMeta}>
                  {row.requestedPunchTime
                    ? dayjs(row.requestedPunchTime).format(
                        'YYYY年MM月DD日 HH:mm',
                      )
                    : '-'}
                </div>
                <div className={styles.detailGrid}>
                  <div>
                    <span className={styles.detailLabel}>类型</span>
                    <span className={styles.detailValue}>
                      {punchTypeLabel[row.punchType] || '未知打卡类型'}
                    </span>
                  </div>
                  <div>
                    <span className={styles.detailLabel}>补卡日期</span>
                    <span className={styles.detailValue}>
                      {row.attendanceDate
                        ? dayjs(row.attendanceDate).format('YYYY-MM-DD')
                        : '-'}
                    </span>
                  </div>
                  <div className={styles.detailItemWide}>
                    <span className={styles.detailLabel}>申请原因</span>
                    <span className={styles.detailValue}>
                      {row.reason || '-'}
                    </span>
                  </div>
                  <div className={styles.detailItemWide}>
                    <span className={styles.detailLabel}>申请位置</span>
                    <span className={styles.detailValue}>
                      {row.locationAddress || '-'}
                    </span>
                  </div>
                </div>
                <div className={styles.cardActions}>
                  <Button type="primary" onClick={() => approve(row.id)}>
                    通过
                  </Button>
                  <Button danger onClick={() => openReject(row.id)}>
                    驳回
                  </Button>
                </div>
              </Card>
            </List.Item>
          )}
        />
      </div>
      <Modal
        className={styles.responsiveModal}
        title="驳回补打卡申请"
        open={rejectOpen}
        onCancel={() => setRejectOpen(false)}
        onOk={() => form.submit()}
      >
        <Form form={form} layout="vertical" onFinish={reject}>
          <Form.Item
            name="comment"
            label="驳回理由"
            rules={[
              { required: true, whitespace: true, message: '请填写驳回理由' },
            ]}
          >
            <Input.TextArea
              rows={4}
              maxLength={1000}
              placeholder="请说明驳回原因"
            />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
}
