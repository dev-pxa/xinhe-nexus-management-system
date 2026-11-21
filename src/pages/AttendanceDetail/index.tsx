import {
  listAttendancePunches,
  listMyAttendancePunches,
} from '@/services/management';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { history, useParams } from '@umijs/max';
import { Button, Card, Empty, Spin, Tag } from 'antd';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import styles from '../oaMobile.less';

const typeLabel: Record<string, string> = {
  NORMAL: '正常打卡',
  IN: '上班打卡',
  OUT: '下班打卡',
};
const sourceLabel: Record<string, string> = {
  WEB: '员工端',
  MOBILE: '移动端',
  ADMIN: '管理员补录',
  CORRECTION: '补打卡审批',
};

export default function AttendanceDetailPage() {
  const { date = '', userId } = useParams<{ date: string; userId?: string }>();
  const query = new URLSearchParams(location.search);
  const companyId = Number(query.get('companyId')) || undefined;
  const displayName = query.get('name');
  const [data, setData] = useState<ManagementAPI.AttendancePunch[]>([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    setLoading(true);
    const request = userId
      ? listAttendancePunches({ date, userId: Number(userId), companyId })
      : listMyAttendancePunches(date);
    void request
      .then((response) => {
        if (response.code === 0) setData(response.data || []);
      })
      .finally(() => setLoading(false));
  }, [companyId, date, userId]);
  return (
    <PageContainer
      className={styles.page}
      title={`${displayName ? `${displayName} ` : ''}${date} 打卡明细`}
      extra={
        <Button
          onClick={() =>
            history.push(userId ? '/oa/all-attendance' : '/oa/attendance')
          }
        >
          返回打卡记录
        </Button>
      }
    >
      <div className={styles.desktopOnly}>
        <ProTable<ManagementAPI.AttendancePunch>
          rowKey="id"
          search={false}
          options={false}
          loading={loading}
          dataSource={data}
          pagination={false}
          locale={{ emptyText: <Empty description="当天暂无打卡明细" /> }}
          columns={[
            {
              title: '打卡时间',
              dataIndex: 'punchTime',
              render: (value) =>
                value
                  ? dayjs(String(value)).format('YYYY-MM-DD HH:mm:ss')
                  : '-',
            },
            {
              title: '类型',
              dataIndex: 'punchType',
              render: (value) => typeLabel[String(value)] || '未知打卡类型',
            },
            {
              title: '来源',
              dataIndex: 'source',
              render: (value) => (
                <Tag>{sourceLabel[String(value)] || '未知来源'}</Tag>
              ),
            },
            {
              title: '定位',
              render: (_, row) =>
                row.latitude != null && row.longitude != null
                  ? `${Number(row.latitude).toFixed(6)}, ${Number(
                      row.longitude,
                    ).toFixed(6)}`
                  : '-',
            },
            {
              title: '备注',
              dataIndex: 'remark',
              render: (value) => value || '-',
            },
          ]}
        />
      </div>
      <div className={styles.mobileOnly}>
        <Spin spinning={loading}>
          {data.length ? (
            <div className={styles.recordList}>
              {data.map((row) => (
                <Card className={styles.recordCard} key={row.id}>
                  <div className={styles.recordHeader}>
                    <div className={styles.recordTitle}>
                      {row.punchTime
                        ? dayjs(row.punchTime).format('HH:mm:ss')
                        : '-'}
                    </div>
                    <Tag>{sourceLabel[row.source] || '未知来源'}</Tag>
                  </div>
                  <div className={styles.recordMeta}>
                    {row.punchTime
                      ? dayjs(row.punchTime).format('YYYY年MM月DD日')
                      : date}
                  </div>
                  <div className={styles.detailGrid}>
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>打卡类型</span>
                      <span className={styles.detailValue}>
                        {typeLabel[row.punchType] || '未知打卡类型'}
                      </span>
                    </div>
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>备注</span>
                      <span className={styles.detailValue}>
                        {row.remark || '-'}
                      </span>
                    </div>
                    <div
                      className={`${styles.detailItem} ${styles.detailItemWide}`}
                    >
                      <span className={styles.detailLabel}>定位坐标</span>
                      <span className={styles.detailValue}>
                        {row.latitude != null && row.longitude != null
                          ? `${Number(row.latitude).toFixed(6)}, ${Number(
                              row.longitude,
                            ).toFixed(6)}`
                          : '-'}
                      </span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className={styles.emptyCard}>
              <Empty description="当天暂无打卡明细" />
            </div>
          )}
        </Spin>
      </div>
    </PageContainer>
  );
}
