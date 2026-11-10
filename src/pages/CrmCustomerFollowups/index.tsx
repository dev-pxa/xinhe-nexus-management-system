import { addCrmFollowup, downloadCrmAttachment, getCrmCustomer, listCrmFollowups, uploadCrmFollowupAttachment } from '@/services/crm';
import { PageContainer } from '@ant-design/pro-components';
import { history, useParams } from '@umijs/max';
import { Button, Card, DatePicker, Empty, Form, Input, List, message, Select, Space, Spin, Tag, Typography, Upload } from 'antd';
import type { UploadFile } from 'antd/es/upload/interface';
import { useCallback, useEffect, useState } from 'react';

/** 客户跟踪记录独立页面，避免记录内容挤占客户档案详情。 */
export default function CrmCustomerFollowupsPage() {
  const { id } = useParams<{ id: string }>();
  const [form] = Form.useForm();
  const [customer, setCustomer] = useState<any>();
  const [followups, setFollowups] = useState<any[]>([]);
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    const [customerResponse, followupResponse] = await Promise.all([getCrmCustomer(Number(id)), listCrmFollowups(Number(id))]);
    setCustomer(customerResponse.data);
    setFollowups(followupResponse.data || []);
  }, [id]);

  useEffect(() => {
    refresh().catch((error: any) => {
      message.error(error?.message || '客户跟踪记录加载失败');
      history.replace('/crm/customers');
    }).finally(() => setLoading(false));
  }, [refresh]);

  const submit = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      const created = await addCrmFollowup(Number(id), {
        ...values,
        occurredAt: values.occurredAt ? `${values.occurredAt}:00` : undefined,
        nextActionAt: values.nextActionAt?.format('YYYY-MM-DDTHH:mm:ss'),
      });
      for (const file of files) if (file.originFileObj) await uploadCrmFollowupAttachment(created.data.id, file.originFileObj);
      form.resetFields();
      setFiles([]);
      await refresh();
      message.success('跟进记录已添加');
    } catch (error: any) {
      message.error(error?.message || '跟进记录添加失败；已保存的记录不会丢失');
    } finally { setSaving(false); }
  };

  const download = async (attachmentId: number, name: string) => {
    const response = await downloadCrmAttachment(attachmentId);
    const url = URL.createObjectURL(response instanceof Blob ? response : new Blob([response as any]));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = name;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return <PageContainer
    title="客户跟踪记录"
    content={customer ? `${customer.customerName} · 按发生时间倒序排列` : undefined}
    onBack={() => history.push(`/crm/customers/${id}`)}
    extra={<Button onClick={() => history.push(`/crm/customers/${id}`)}>返回客户详情</Button>}
  >
    <Spin spinning={loading}>
      <Card title="新增跟踪记录" style={{ marginBottom: 24 }}>
        <Form form={form} layout="vertical" initialValues={{ method: 'VISIT' }}>
          <Form.Item name="method" label="跟进方式" rules={[{ required: true, message: '请选择跟进方式' }]}>
            <Select options={[['VISIT', '拜访'], ['ONLINE', '线上'], ['OTHER', '其他']].map(([value, label]) => ({ value, label }))} />
          </Form.Item>
          <Form.Item name="content" label="沟通内容" rules={[{ required: true, whitespace: true, message: '请填写沟通内容' }]}><Input.TextArea rows={4} /></Form.Item>
          <Form.Item name="customerFeedback" label="客户反馈"><Input.TextArea rows={3} /></Form.Item>
          <Form.Item name="quoteSummary" label="报价或预算"><Input /></Form.Item>
          <Form.Item name="commitment" label="双方承诺"><Input.TextArea rows={3} /></Form.Item>
          <Form.Item name="nextAction" label="下一步跟进动作"><Input /></Form.Item>
          <Form.Item name="nextActionAt" label="下一步跟进时间"><DatePicker showTime style={{ width: '100%' }} /></Form.Item>
          <Form.Item label="附件（PDF/JPG/PNG，单个不超过20MB）">
            <Upload multiple accept=".pdf,.jpg,.jpeg,.png" fileList={files} beforeUpload={(file) => {
              if (!['application/pdf', 'image/jpeg', 'image/png'].includes(file.type)) { message.error('附件仅支持PDF、JPG和PNG'); return Upload.LIST_IGNORE; }
              if (file.size > 20 * 1024 * 1024) { message.error('单个附件不能超过20MB'); return Upload.LIST_IGNORE; }
              return false;
            }} onChange={({ fileList }) => setFiles(fileList)}><Button>选择附件</Button></Upload>
          </Form.Item>
          <Button type="primary" loading={saving} onClick={() => void submit()}>保存跟踪记录</Button>
        </Form>
      </Card>

      <Card title={`跟踪记录（${followups.length}）`}>
        <List
          dataSource={followups}
          split={false}
          locale={{ emptyText: <Empty description="暂无客户跟踪记录" /> }}
          renderItem={(item) => <List.Item style={{ padding: '0 0 16px' }}>
            <Card size="small" style={{ width: '100%' }} title={<Space wrap><Typography.Text strong>{item.creatorName || '未知用户'}</Typography.Text><Tag color="blue">{{ VISIT: '拜访', PHONE: '历史记录·电话', WECHAT: '历史记录·微信', ONLINE: '线上', OTHER: '其他' }[item.method] || item.method}</Tag></Space>} extra={<Typography.Text type="secondary">{String(item.occurredAt || '').replace('T', ' ').slice(0, 16)}</Typography.Text>}>
              <Space direction="vertical" size={8} style={{ width: '100%' }}>
                <FollowupField label="沟通内容" value={item.content} />
                {item.customerFeedback && <FollowupField label="客户反馈" value={item.customerFeedback} />}
                {item.quoteSummary && <FollowupField label="报价/预算" value={`${item.quoteSummary}${item.quoteAmount ? `（${item.quoteAmount}）` : ''}`} />}
                {item.commitment && <FollowupField label="承诺事项" value={item.commitment} />}
                {item.nextAction && <FollowupField label="下一步安排" value={`${item.nextAction}${item.nextActionAt ? ` · ${item.nextActionAt.replace('T', ' ')}` : ''}`} />}
                {item.attachments?.length > 0 && <div><Typography.Text type="secondary">附件：</Typography.Text><Space wrap>{item.attachments.map((attachment: any) => <Button key={attachment.id} type="link" onClick={() => void download(attachment.id, attachment.fileName)} style={{ height: 'auto', padding: 0, whiteSpace: 'normal', overflowWrap: 'anywhere' }}>{attachment.fileName}</Button>)}</Space></div>}
              </Space>
            </Card>
          </List.Item>}
        />
      </Card>
    </Spin>
  </PageContainer>;
}

function FollowupField({ label, value }: { label: string; value: string }) {
  return <div style={{ minWidth: 0, width: '100%' }}><Typography.Text type="secondary">{label}</Typography.Text><Typography.Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{value}</Typography.Paragraph></div>;
}
