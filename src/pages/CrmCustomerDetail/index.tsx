import { getCrmCustomer, listCrmEligibleUsers } from '@/services/crm';
import { PageContainer } from '@ant-design/pro-components';
import { history, useParams } from '@umijs/max';
import { Button, Card, Descriptions, message, Space, Spin, Tag } from 'antd';
import { useEffect, useState } from 'react';

/** 客户只读详情页；信息维护和跟踪分别进入独立页面。 */
export default function CrmCustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [customer, setCustomer] = useState<any>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([getCrmCustomer(Number(id)), listCrmEligibleUsers()])
      .then(([response, userResponse]) => {
        if (active) {
          const names = new Map(
            (userResponse.data || []).map((user: any) => [
              Number(user.id),
              user.name,
            ]),
          );
          setCustomer({
            ...response.data,
            collaboratorNames: (response.data.collaboratorUserIds || [])
              .map((userId: number) => names.get(Number(userId)))
              .filter(Boolean),
          });
        }
      })
      .catch((error: any) => {
        message.error(error?.message || '客户信息加载失败');
        if (active) history.replace('/crm/customers');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  return (
    <PageContainer
      title="客户详情"
      onBack={() => history.push('/crm/customers')}
      extra={
        <Space>
          <Button
            onClick={() => history.push(`/crm/customers/${id}/followups`)}
          >
            跟踪记录
          </Button>
          <Button
            type="primary"
            onClick={() => history.push(`/crm/customers/${id}/edit`)}
          >
            编辑客户
          </Button>
        </Space>
      }
    >
      <Spin spinning={loading}>
        {customer && (
          <Card title="客户信息">
            <Descriptions column={2} bordered>
              <Descriptions.Item label="客户编号">
                {customer.customerNo || '—'}
              </Descriptions.Item>
              <Descriptions.Item label="客户名称">
                {customer.customerName || '—'}
              </Descriptions.Item>
              <Descriptions.Item label="联系电话">
                {customer.phone || '—'}
              </Descriptions.Item>
              <Descriptions.Item label="负责人">
                {customer.ownerName || '未知用户'}
                {customer.ownerStatus === 'DEPARTED' && (
                  <Tag color="error" bordered={false} style={{ marginLeft: 6 }}>
                    已离职
                  </Tag>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="详细地址" span={2}>
                {customer.address || '—'}
              </Descriptions.Item>
              <Descriptions.Item label="来源渠道">
                {customer.source || '—'}
              </Descriptions.Item>
              <Descriptions.Item label="客户分类">
                {customer.categoryPath || '未分类'}
              </Descriptions.Item>
              <Descriptions.Item label="协作人" span={2}>
                {(customer.collaboratorNames || []).join('、') || '—'}
              </Descriptions.Item>
              <Descriptions.Item label="备注" span={2}>
                {customer.remark || '—'}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        )}
      </Spin>
    </PageContainer>
  );
}
