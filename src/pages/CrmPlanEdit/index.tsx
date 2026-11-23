import {
  completeDailyPlanItem,
  createDailyPlan,
  getDailyPlan,
  getDailyPlanDraft,
  listCrmEligiblePlanUsers,
  listMyCrmCustomers,
  updateDailyPlan,
} from '@/services/crm';
import { PageContainer } from '@ant-design/pro-components';
import { history, useLocation, useModel, useParams } from '@umijs/max';
import {
  Button,
  Card,
  Form,
  Input,
  message,
  Modal,
  Select,
  Space,
  Spin,
  Switch,
  Tag,
  Typography,
} from 'antd';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import styles from '../crmPlanMobile.less';

/** 每日计划新增、查看和编辑的独立页面。 */
export default function CrmPlanEditPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const { initialState } = useModel('@@initialState');
  const isNew = location.pathname.endsWith('/new');
  const viewOnly = location.pathname.includes('/view/');
  const listUrl = `/crm/daily-plans${location.search || ''}`;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [plan, setPlan] = useState<any>();
  const [items, setItems] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [eligibleUsers, setEligibleUsers] = useState<any[]>([]);
  const readOnly =
    viewOnly ||
    Boolean(
      plan?.planDate &&
        dayjs(String(plan.planDate).slice(0, 10)).isBefore(dayjs(), 'day'),
    );

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const [customersResponse, usersResponse] = await Promise.all([
          listMyCrmCustomers(),
          listCrmEligiblePlanUsers(),
        ]);
        if (!mounted) return;
        setCustomers(customersResponse.data || []);
        setEligibleUsers(usersResponse.data || []);
        if (isNew) {
          setPlan(undefined);
          const draftResponse = await getDailyPlanDraft();
          if (!mounted) return;
          const draftItems = draftResponse.data || [];
          setItems(
            draftItems.length
              ? draftItems
              : [{ contentHtml: '', customerId: null }],
          );
        } else {
          const response = await getDailyPlan(Number(id));
          if (!mounted) return;
          setPlan(response.data);
          setItems(response.data?.items || []);
        }
      } catch (error: any) {
        message.error(error?.message || '每日计划加载失败');
        history.replace(listUrl);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, [id, isNew]);

  const change = (index: number, field: string, value: any) =>
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    );

  const save = async () => {
    setSaving(true);
    try {
      const body = {
        items: items
          .filter((item) => item.editable !== false)
          .map((item) => ({
            id: item.id,
            contentHtml: item.contentHtml,
            customerId: item.customerId || null,
            collaboratorUserId: item.collaboratorUserId || null,
            remark: item.remark || null,
          })),
      };
      if (isNew) await createDailyPlan(body);
      else await updateDailyPlan(Number(id), body);
      message.success('每日计划已保存');
      history.push(listUrl);
    } catch (error: any) {
      message.error(error?.message || '每日计划保存失败');
    } finally {
      setSaving(false);
    }
  };

  const updateCompletion = async (
    item: any,
    index: number,
    completed: boolean,
  ) => {
    try {
      await completeDailyPlanItem(item.id, completed);
      change(index, 'isCompleted', completed);
    } catch (error: any) {
      message.error(error?.message || '完成状态更新失败');
    }
  };

  const removeItem = (index: number) =>
    Modal.confirm({
      title: `确认删除计划项 ${index + 1}？`,
      content: '删除后该计划项内容将被移除。',
      okText: '删除计划项',
      okType: 'danger',
      cancelText: '取消',
      onOk: () =>
        setItems((current) =>
          current.filter((_, itemIndex) => itemIndex !== index),
        ),
    });

  const title = readOnly
    ? '查看每日计划'
    : isNew
    ? '新增每日计划'
    : '编辑每日计划';
  const ownerName =
    plan?.ownerName || initialState?.currentUser?.name || '当前登录用户';
  const actions = (
    <Space className={styles.pageActions}>
      <Button onClick={() => history.push(listUrl)}>返回列表</Button>
      {!readOnly && (
        <Button type="primary" loading={saving} onClick={() => void save()}>
          保存计划
        </Button>
      )}
    </Space>
  );

  return (
    <PageContainer
      className={`${styles.page} ${styles.editorPage}`}
      title={title}
      content="计划日期和归属由系统自动确定；新增时会带出最近一条未完成每日计划的内容。"
      extra={actions}
    >
      <Spin spinning={loading}>
        {!loading && (
          <div style={{ maxWidth: 1000, margin: '0 auto' }}>
            <Card size="small" style={{ marginBottom: 20 }}>
              <Space className={styles.summaryRow} size={32} wrap>
                <Space>
                  <Typography.Text type="secondary">日期</Typography.Text>
                  <Typography.Text>
                    {plan?.planDate
                      ? String(plan.planDate).slice(0, 10)
                      : dayjs().format('YYYY-MM-DD')}
                  </Typography.Text>
                </Space>
                <Space>
                  <Typography.Text type="secondary">归属</Typography.Text>
                  <Typography.Text>{ownerName}</Typography.Text>
                  {plan?.ownerStatus === 'DEPARTED' && (
                    <Tag color="error" bordered={false}>
                      已离职
                    </Tag>
                  )}
                </Space>
              </Space>
            </Card>

            <Typography.Title level={5}>计划内容</Typography.Title>
            <Typography.Paragraph type="secondary">
              支持多行文本。每个计划项可关联一位客户；已保存的计划项可单独标记完成。
            </Typography.Paragraph>

            {items.map((item, index) => (
              <Card
                key={item.id || `new-${index}`}
                title={`计划项 ${index + 1}`}
                extra={
                  !readOnly &&
                  item.editable !== false && (
                    <Button
                      type="link"
                      danger
                      size="small"
                      style={{ padding: 0 }}
                      onClick={() => removeItem(index)}
                    >
                      删除计划项
                    </Button>
                  )
                }
                size="small"
                style={{ marginBottom: 16 }}
              >
                {item.editable === false && (
                  <Tag color="blue" style={{ marginBottom: 12 }}>
                    {item.sourceOwnerName
                      ? `由 ${item.sourceOwnerName} 添加·只读`
                      : '协作计划项·只读'}
                  </Tag>
                )}
                <Form layout="vertical">
                  <Form.Item label="计划内容" required>
                    <Input.TextArea
                      rows={5}
                      autoSize={{ minRows: 5, maxRows: 14 }}
                      disabled={readOnly || item.editable === false}
                      value={htmlToPlainText(item.contentHtml || '')}
                      onChange={(event) =>
                        change(
                          index,
                          'contentHtml',
                          plainTextToHtml(event.target.value),
                        )
                      }
                      placeholder="请填写具体计划内容"
                    />
                  </Form.Item>
                  <Form.Item label="关联客户">
                    <Select
                      disabled={readOnly || item.editable === false}
                      allowClear
                      showSearch
                      optionFilterProp="label"
                      value={item.customerId || undefined}
                      options={customers.map((customer) => ({
                        value: customer.id,
                        label: `${customer.customerNo} · ${customer.customerName}`,
                      }))}
                      onChange={(value) => change(index, 'customerId', value)}
                      placeholder="选择本人负责的客户"
                    />
                  </Form.Item>
                  <Form.Item label="协作人">
                    {item.editable === false ? (
                      <Input
                        disabled
                        value={item.collaboratorName || '未指定'}
                      />
                    ) : (
                      <Select
                        disabled={readOnly}
                        allowClear
                        showSearch
                        optionFilterProp="label"
                        value={item.collaboratorUserId || undefined}
                        options={eligibleUsers.map((user) => ({
                          value: user.id,
                          label: user.name,
                        }))}
                        onChange={(value) =>
                          change(index, 'collaboratorUserId', value)
                        }
                        placeholder="选择有计划管理权限的协作人（选填）"
                      />
                    )}
                  </Form.Item>
                  <Form.Item label="备注">
                    <Input.TextArea
                      rows={2}
                      maxLength={1000}
                      disabled={readOnly || item.editable === false}
                      value={item.remark || ''}
                      onChange={(event) =>
                        change(index, 'remark', event.target.value)
                      }
                      placeholder="填写该计划项的补充说明（选填）"
                    />
                  </Form.Item>
                </Form>

                {item.id && (
                  <Space>
                    <Typography.Text type="secondary">完成状态</Typography.Text>
                    {readOnly || item.editable === false ? (
                      <Tag color={item.isCompleted ? 'success' : 'default'}>
                        {item.isCompleted ? '已完成' : '未完成'}
                      </Tag>
                    ) : (
                      <Switch
                        checkedChildren="完成"
                        unCheckedChildren="未完成"
                        checked={Boolean(item.isCompleted)}
                        onChange={(completed) =>
                          void updateCompletion(item, index, completed)
                        }
                      />
                    )}
                  </Space>
                )}
              </Card>
            ))}

            {!readOnly && (
              <Space direction="vertical" style={{ width: '100%' }}>
                <Button
                  block
                  onClick={() =>
                    setItems((current) => [
                      ...current,
                      { contentHtml: '', customerId: null },
                    ])
                  }
                >
                  新增计划项
                </Button>
                <div className={styles.desktopBottomActions}>{actions}</div>
              </Space>
            )}
          </div>
        )}
      </Spin>
      {!readOnly && (
        <div className={styles.mobileSaveBar}>
          <Button onClick={() => history.push(listUrl)}>返回列表</Button>
          <Button type="primary" loading={saving} onClick={() => void save()}>
            保存计划
          </Button>
        </div>
      )}
    </PageContainer>
  );
}

/** 将历史富文本转成多行文本供 Ant Design TextArea 展示。 */
function htmlToPlainText(html: string) {
  return html
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<\/li\s*>/gi, '\n')
    .replace(/<\/(p|div)\s*>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&amp;/gi, '&')
    .replace(/\n$/, '');
}

/** 将多行文本编码为服务端允许保存的段落与换行标签。 */
function plainTextToHtml(value: string) {
  if (!value.trim()) return '';
  const escaped = value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
  return `<p>${escaped.replace(/\r?\n/g, '<br>')}</p>`;
}
