import { listPendingExpenses } from '@/services/management';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { history } from '@umijs/max';
import { Button, Card, Empty, List, Tag } from 'antd';
import dayjs from 'dayjs';
import { useCallback, useEffect, useState } from 'react';
import styles from '../oaMobile.less';

const statusMap: Record<string, [string, string]> = {
  PENDING: ['待直属负责人审批', 'processing'],
  REVIEWING: ['待最终审批', 'warning'],
};

export default function ExpenseApprovalsPage() {
  const [data, setData] = useState<ManagementAPI.ExpenseClaim[]>([]);
  const [loading, setLoading] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await listPendingExpenses();
      if (response.code === 0) setData(response.data || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      className={styles.page}
      title="报销审批"
      content="查看报销详情和附件后进行审批"
    >
      <div className={styles.desktopOnly}>
        <ProTable<ManagementAPI.ExpenseClaim>
          rowKey="id"
          search={false}
          options={{ reload: () => void load() }}
          loading={loading}
          dataSource={data}
          pagination={{ pageSize: 10 }}
          locale={{ emptyText: <Empty description="暂无待审核报销" /> }}
          columns={[
            { title: '报销单号', dataIndex: 'claimNo' },
            { title: '申请人', dataIndex: 'applicantName' },
            {
              title: '部门',
              dataIndex: 'applicantOrgName',
              render: (value) => value || '-',
            },
            {
              title: '总金额',
              dataIndex: 'totalAmount',
              render: (value) => `¥${Number(value || 0).toFixed(2)}`,
            },
            { title: '提交时间', dataIndex: 'submittedAt' },
            { title: '当前节点', dataIndex: 'currentNodeName' },
            {
              title: '状态',
              dataIndex: 'status',
              render: (value) => {
                const [label, color] = statusMap[String(value)] || [
                  '未知状态',
                  'default',
                ];
                return <Tag color={color}>{label}</Tag>;
              },
            },
            {
              title: '操作',
              valueType: 'option',
              render: (_value, row) => (
                <Button
                  type="link"
                  onClick={() => history.push(`/oa/expense/${row.id}`)}
                >
                  去审核
                </Button>
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
                <Empty description="暂无待审核报销" />
              </div>
            ),
          }}
          pagination={
            data.length > 10 ? { pageSize: 10, showSizeChanger: false } : false
          }
          renderItem={(row) => {
            const [label, color] = statusMap[String(row.status)] || [
              '未知状态',
              'default',
            ];
            return (
              <List.Item style={{ padding: 0, border: 0 }}>
                <Card
                  className={styles.recordCard}
                  style={{ width: '100%', marginBottom: 12 }}
                >
                  <div className={styles.recordHeader}>
                    <div className={styles.recordTitle}>{row.claimNo}</div>
                    <Tag color={color}>{label}</Tag>
                  </div>
                  <div className={styles.amount}>
                    ¥{Number(row.totalAmount || 0).toFixed(2)}
                  </div>
                  <div className={styles.detailGrid}>
                    <div>
                      <span className={styles.detailLabel}>申请人</span>
                      <span className={styles.detailValue}>
                        {row.applicantName || '-'}
                      </span>
                    </div>
                    <div>
                      <span className={styles.detailLabel}>部门</span>
                      <span className={styles.detailValue}>
                        {row.applicantOrgName || '-'}
                      </span>
                    </div>
                    <div>
                      <span className={styles.detailLabel}>当前节点</span>
                      <span className={styles.detailValue}>
                        {row.currentNodeName || '-'}
                      </span>
                    </div>
                    <div>
                      <span className={styles.detailLabel}>提交时间</span>
                      <span className={styles.detailValue}>
                        {row.submittedAt
                          ? dayjs(row.submittedAt).format('YYYY-MM-DD HH:mm')
                          : '-'}
                      </span>
                    </div>
                  </div>
                  <div className={styles.cardActions}>
                    <Button
                      type="primary"
                      block
                      onClick={() => history.push(`/oa/expense/${row.id}`)}
                    >
                      去审核
                    </Button>
                  </div>
                </Card>
              </List.Item>
            );
          }}
        />
      </div>
    </PageContainer>
  );
}
