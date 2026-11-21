import {
  completeWeeklyPlanItem,
  createWeeklyPlan,
  getWeeklyPlan,
  getWeeklyPlanDraft,
  listMyCrmCustomers,
  updateWeeklyPlan,
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

/** 每周计划新增、查看和编辑页面，交互与每日计划保持一致。 */
export default function CrmWeeklyPlanEditPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const { initialState } = useModel('@@initialState');
  const isNew = location.pathname.endsWith('/new');
  const viewOnly = location.pathname.includes('/view/');
  const listUrl = `/crm/weekly-plans${location.search || ''}`;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [plan, setPlan] = useState<any>();
  const [items, setItems] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const readOnly =
    viewOnly ||
    Boolean(
      plan?.weekEnd &&
        dayjs(String(plan.weekEnd).slice(0, 10)).isBefore(dayjs(), 'day'),
    );

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const customerResponse = await listMyCrmCustomers();
        if (!mounted) return;
        setCustomers(customerResponse.data || []);
        if (isNew) {
          setPlan(undefined);
          const draftResponse = await getWeeklyPlanDraft();
          if (!mounted) return;
          const draftItems = draftResponse.data || [];
          setItems(
            draftItems.length
              ? draftItems
              : [{ contentHtml: '', customerId: null }],
          );
        } else {
          const response = await getWeeklyPlan(Number(id));
          if (!mounted) return;
          setPlan(response.data);
          setItems(response.data?.items || []);
        }
      } catch (error: any) {
        message.error(error?.message || '每周计划加载失败');
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
        items: items.map((item) => ({
          id: item.id,
          contentHtml: item.contentHtml,
          customerId: item.customerId || null,
          remark: item.remark || null,
        })),
      };
      if (isNew) await createWeeklyPlan(body);
      else await updateWeeklyPlan(Number(id), body);
      message.success('每周计划已保存');
      history.push(listUrl);
    } catch (error: any) {
      message.error(error?.message || '每周计划保存失败');
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
      await completeWeeklyPlanItem(item.id, completed);
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
    ? '查看每周计划'
    : isNew
    ? '新增每周计划'
    : '编辑每周计划';
  const ownerName =
    plan?.ownerName || initialState?.currentUser?.name || '当前登录用户';

  return (
    <PageContainer
      className={`${styles.page} ${styles.editorPage}`}
      title={title}
      content="计划周期为周一至周日，归属由系统自动确定。"
      extra={
        <Space className={styles.pageActions}>
          <Button onClick={() => history.push(listUrl)}>返回列表</Button>
          {!readOnly && (
            <Button type="primary" loading={saving} onClick={() => void save()}>
              保存计划
            </Button>
          )}
        </Space>
      }
    >
      <Spin spinning={loading}>
        {!loading && (
          <div style={{ maxWidth: 1000, margin: '0 auto' }}>
            <Card size="small" style={{ marginBottom: 20 }}>
              <Space className={styles.summaryRow} size={32} wrap>
                <Space>
                  <Typography.Text type="secondary">计划周期</Typography.Text>
                  <Typography.Text>
                    {plan?.weekStart && plan?.weekEnd
                      ? `${String(plan.weekStart).slice(0, 10)} 至 ${String(
                          plan.weekEnd,
                        ).slice(0, 10)}`
                      : `${currentMonday().format(
                          'YYYY-MM-DD',
                        )} 至 ${currentMonday()
                          .add(6, 'day')
                          .format('YYYY-MM-DD')}`}
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
                  !readOnly && (
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
                <Form layout="vertical">
                  <Form.Item label="计划内容" required>
                    <Input.TextArea
                      rows={5}
                      autoSize={{ minRows: 5, maxRows: 14 }}
                      disabled={readOnly}
                      value={htmlToPlainText(item.contentHtml || '')}
                      onChange={(event) =>
                        change(
                          index,
                          'contentHtml',
                          plainTextToHtml(event.target.value),
                        )
                      }
                      placeholder="请填写本周计划内容"
                    />
                  </Form.Item>
                  <Form.Item label="关联客户">
                    <Select
                      disabled={readOnly}
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
                  <Form.Item label="备注">
                    <Input.TextArea
                      rows={2}
                      maxLength={1000}
                      disabled={readOnly}
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
                    {readOnly ? (
                      <Tag color={item.isCompleted ? 'success' : 'default'}>
                        {item.isCompleted ? '已完成' : '未完成'}
                      </Tag>
                    ) : (
                      <Switch
                        checked={Boolean(item.isCompleted)}
                        checkedChildren="已完成"
                        unCheckedChildren="未完成"
                        onChange={(checked) =>
                          void updateCompletion(item, index, checked)
                        }
                      />
                    )}
                  </Space>
                )}
              </Card>
            ))}
            {!readOnly && (
              <Button
                type="dashed"
                block
                onClick={() =>
                  setItems((current) => [
                    ...current,
                    { contentHtml: '', customerId: null },
                  ])
                }
              >
                ＋ 新增计划项
              </Button>
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

function htmlToPlainText(html: string) {
  return html
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<\/(p|div|li)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ');
}
function plainTextToHtml(text: string) {
  return text
    .split('\n')
    .map((line) => `<p>${line || '<br>'}</p>`)
    .join('');
}
function currentMonday() {
  const today = dayjs();
  return today.subtract((today.day() + 6) % 7, 'day');
}
