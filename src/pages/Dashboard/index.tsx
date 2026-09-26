import { ClockCircleOutlined, DollarOutlined, ShoppingCartOutlined, WarningOutlined } from '@ant-design/icons';
import { PageContainer, StatisticCard } from '@ant-design/pro-components';
import { Card, Col, List, Row, Space, Tag } from 'antd';

const tasks = ['报价单 Q-2026-0098 待审核', '报销单 BX-2026-0124 待审批', '控制器 XH-C10 库存预警'];

export default function DashboardPage() {
  return (
    <PageContainer title="工作台" content="当前组织：芯河智能（演示租户）">
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <StatisticCard.Group>
          <StatisticCard statistic={{ title: '本月销售额', value: 286.4, suffix: '万元', icon: <DollarOutlined /> }} />
          <StatisticCard statistic={{ title: '待处理审批', value: 12, icon: <ClockCircleOutlined /> }} />
          <StatisticCard statistic={{ title: '在途订单', value: 23, icon: <ShoppingCartOutlined /> }} />
          <StatisticCard statistic={{ title: '库存预警', value: 5, icon: <WarningOutlined /> }} />
        </StatisticCard.Group>
        <Row gutter={16}>
          <Col span={16}>
            <Card title="我的待办">
              <List dataSource={tasks} renderItem={(item) => <List.Item><Tag color="processing">待处理</Tag>{item}</List.Item>} />
            </Card>
          </Col>
          <Col span={8}>
            <Card title="经营提示">业务数据接入后，此处展示 AI 经营洞察与风险提醒。</Card>
          </Col>
        </Row>
      </Space>
    </PageContainer>
  );
}

