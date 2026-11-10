import {
  deleteDailyPlan,
  listCrmEligibleUsers,
  listDailyPlans,
} from '@/services/crm';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { history, useLocation, useModel } from '@umijs/max';
import { Button, DatePicker, message, Modal, Select, Space, Tag } from 'antd';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';

/** 每日计划列表使用年月筛选；新增、查看和编辑在独立页面完成。 */
export default function CrmPlansPage() {
  const { initialState } = useModel('@@initialState');
  const userId = initialState?.currentUser?.id;
  const location = useLocation();
  const query = new URLSearchParams(location.search);
  const queryYear = Number(query.get('year'));
  const queryMonth = Number(query.get('month'));
  const [month, setMonth] = useState(() =>
    queryYear > 0 && queryMonth >= 1 && queryMonth <= 12
      ? dayjs(`${queryYear}-${String(queryMonth).padStart(2, '0')}-01`)
      : dayjs(),
  );
  const [refresh, setRefresh] = useState(0);
  const [ownerUserId, setOwnerUserId] = useState<number | undefined>();
  const [owners, setOwners] = useState<any[]>([]);
  const monthQuery = `?year=${month.year()}&month=${month.month() + 1}`;

  useEffect(() => { void listCrmEligibleUsers().then((response) => setOwners(response.data || [])); }, []);

  const openTodayPlan = async () => {
    // 每位用户每天只有一张计划；若今天已创建，新增入口直接打开该计划编辑页。
    const today = dayjs();
    const currentMonth =
      (await listDailyPlans(today.year(), today.month() + 1, { page: 1, pageSize: 1, ownerUserId })).data?.data || [];
    const existing = currentMonth.find(
      (row: any) =>
        row.ownerUserId === userId &&
        String(row.planDate).slice(0, 10) === today.format('YYYY-MM-DD'),
    );
    if (existing) {
      Modal.confirm({
        title: '今天已经有每日计划',
        content: '是否继续编辑今天的计划？',
        okText: '继续编辑',
        cancelText: '暂不编辑',
        onOk: () =>
          history.push(`/crm/daily-plans/${existing.id}${monthQuery}`),
      });
      return;
    }
    history.push(`/crm/daily-plans/new${monthQuery}`);
  };

  return (
    <PageContainer
      title="每日计划"
      content="创建当天计划；新增时会自动带出最近一条未完成每日计划的内容，您可以继续新增、删除或修改。"
    >
      <ProTable<any>
        rowKey="id"
        key={`${refresh}-${month.format('YYYY-MM')}-${ownerUserId || ''}`}
        search={false}
        options={false}
        request={async ({ current = 1, pageSize = 20 }) => {
          const r = await listDailyPlans(month.year(), month.month() + 1, { page: current, pageSize, ownerUserId });
          const result = r.data || {};
          return {
            data: result.data || [],
            success: true,
            total: result.total || 0,
          };
        }}
        toolBarRender={() => [
          <DatePicker
            key="month"
            picker="month"
            value={month}
            onChange={(value) => value && setMonth(value)}
            allowClear={false}
          />,
          <Select key="owner" allowClear placeholder="按归属筛选" style={{ width: 180 }} value={ownerUserId} onChange={setOwnerUserId} options={owners.map((owner) => ({ value: owner.id, label: owner.name }))} />,
          <Button key="add" type="primary" onClick={() => void openTodayPlan()}>
            新增今日计划
          </Button>,
        ]}
        columns={[
          {
            title: '日期',
            dataIndex: 'planDate',
            render: (value) => String(value).slice(0, 10),
          },
          {
            title: '归属',
            dataIndex: 'ownerName',
            render: (_, record) => (
              <span>
                {record.ownerName || '未知用户'}
                {record.ownerStatus === 'DEPARTED' && (
                  <Tag color="error" bordered={false} style={{ marginLeft: 4 }}>
                    已离职
                  </Tag>
                )}
              </span>
            ),
          },
          { title: '计划数量', dataIndex: 'planCount' },
          { title: '延期数量', dataIndex: 'delayedCount' },
          {
            title: '完成率',
            dataIndex: 'completionRate',
            render: (value) => value === 0 || value === null || value === undefined ? '—' : `${value}%`,
          },
          { title: '关联客户数量', dataIndex: 'associatedCustomerCount' },
          {
            title: '操作',
            valueType: 'option',
            render: (_, record) => (
              <Space>
                <Button
                  type="link"
                  size="small"
                  style={{ padding: 0 }}
                  onClick={() =>
                    history.push(
                      `/crm/daily-plans/view/${record.id}${monthQuery}`,
                    )
                  }
                >
                  查看
                </Button>
                {record.ownerUserId === userId && !dayjs(String(record.planDate).slice(0, 10)).isBefore(dayjs(), 'day') && (
                  <>
                    <Button
                      type="link"
                      size="small"
                      style={{ padding: 0 }}
                      onClick={() =>
                        history.push(`/crm/daily-plans/${record.id}${monthQuery}`)
                      }
                    >
                      编辑
                    </Button>
                    <Button
                      type="link"
                      danger
                      size="small"
                      style={{ padding: 0 }}
                      onClick={() =>
                        Modal.confirm({
                          title: '确认删除这条每日计划？',
                          content: '删除后该计划及其计划项将被永久删除。',
                          okText: '删除计划',
                          okType: 'danger',
                          cancelText: '取消',
                          onOk: async () => {
                            await deleteDailyPlan(record.id);
                            message.success('每日计划已删除');
                            setRefresh((value) => value + 1);
                          },
                        })
                      }
                    >
                      删除
                    </Button>
                  </>
                )}
              </Space>
            ),
          },
        ]}
      />
    </PageContainer>
  );
}
