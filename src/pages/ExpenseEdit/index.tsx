import { createExpense, expenseAttachmentUrl, getExpense, reviewExpense, saveExpense, submitExpense, uploadExpenseAttachment } from '@/services/management';
import { ArrowLeftOutlined, DeleteOutlined, InfoCircleOutlined, InboxOutlined, PlusOutlined } from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { history, useModel, useParams } from '@umijs/max';
import { Button, Card, DatePicker, Divider, Form, Image, Input, InputNumber, List, message, Modal, Space, Tag, Timeline, Upload } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import { useEffect, useMemo, useState } from 'react';
import styles from './index.less';

const categories: { key: ManagementAPI.ExpenseItem['expenseCategory']; label: string }[] = [
  { key: 'ACCOMMODATION', label: '住宿费用' }, { key: 'MEAL', label: '餐饮费用' },
  { key: 'TRANSPORT', label: '交通费用' }, { key: 'OTHER', label: '其他费用' },
];
const statusMap: Record<ManagementAPI.ExpenseClaim['status'], [string, string]> = {
  DRAFT: ['草稿', 'default'], PENDING: ['待审核', 'processing'], REVIEWING: ['审核中', 'warning'], APPROVED: ['审核通过', 'success'], REJECTED: ['已驳回', 'error'],
};

export default function ExpenseEditPage() {
  const { id } = useParams<{ id: string }>();
  const { initialState } = useModel('@@initialState');
  const [claim, setClaim] = useState<ManagementAPI.ExpenseClaim>();
  const [items, setItems] = useState<ManagementAPI.ExpenseItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const editable = claim?.status === 'DRAFT' || claim?.status === 'REJECTED';
  const canReview = Boolean(claim?.currentReviewerId && claim.currentReviewerId === initialState?.currentUser?.id);
  const load = async () => { if (!id || id === 'new') return; const response = await getExpense(Number(id)); if (response.code === 0 && response.data) { setClaim(response.data); setItems(response.data.items || []); } else message.error(response.message); };
  useEffect(() => {
    if (id === 'new') {
      void createExpense().then((response) => {
        if (response.code === 0 && response.data) { setClaim(response.data); setItems(response.data.items || []); history.replace(`/oa/expense/${response.data.id}`); }
        else message.error(response.message);
      });
    } else void load();
  }, [id]);
  const grouped = useMemo(() => categories.map((category) => ({ ...category, rows: items.map((item, index) => ({ item, index })).filter(({ item }) => item.expenseCategory === category.key) })), [items]);
  const total = items.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const updateItem = (index: number, patch: Partial<ManagementAPI.ExpenseItem>) => setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  const addItem = (category: ManagementAPI.ExpenseItem['expenseCategory']) => setItems((current) => [...current, { expenseCategory: category, amount: 0 }]);
  const save = async () => { if (!claim) return; setLoading(true); try { const response = await saveExpense(claim.id, items); if (response.code === 0 && response.data) { setClaim(response.data); setItems(response.data.items || []); message.success('已暂存'); } else message.error(response.message); } finally { setLoading(false); } };
  const ensureItemId = async (index: number) => {
    if (!claim) throw new Error('报销单尚未创建');
    const existingId = items[index]?.id;
    if (existingId) return existingId;
    const response = await saveExpense(claim.id, items);
    if (response.code !== 0 || !response.data) throw new Error(response.message || '费用条目暂存失败');
    const savedItems = response.data.items || [];
    setClaim(response.data);
    setItems(savedItems);
    const savedId = savedItems[index]?.id;
    if (!savedId) throw new Error('费用条目暂存成功，但未返回条目编号');
    return savedId;
  };
  const uploadAttachment = async (index: number, kind: 'INVOICE' | 'OTHER', file: File) => {
    if (!claim) throw new Error('报销单尚未创建');
    const itemId = await ensureItemId(index);
    const response = await uploadExpenseAttachment(claim.id, itemId, kind, file);
    if (response.code !== 0) throw new Error(response.message || '附件上传失败');
    await load();
  };
  const submit = async () => { await save(); if (!claim) return; const response = await submitExpense(claim.id); if (response.code === 0) { message.success('提交成功'); await load(); } else message.error(response.message); };
  const review = async (action: 'APPROVE' | 'REJECT') => { let opinion = ''; if (action === 'REJECT') { opinion = await new Promise<string>((resolve) => { let value = ''; Modal.confirm({ title: '填写驳回原因', content: <Input.TextArea onChange={(event) => { value = event.target.value; }} />, onOk: () => resolve(value), onCancel: () => resolve('') }); }); if (!opinion) return; } const response = await reviewExpense(Number(id), action, opinion); if (response.code === 0) { message.success(action === 'APPROVE' ? '审核通过' : '已驳回'); await load(); } else message.error(response.message); };
  const preview = (attachment: ManagementAPI.ExpenseAttachment) => window.open(expenseAttachmentUrl(attachment.id), '_blank', 'noopener,noreferrer');
  const showInstructions = () => Modal.info({
    title: '报销使用说明',
    width: 680,
    content: <div>
      <p><strong>填写说明</strong></p>
      <p>请按费用类型新增条目，填写费用日期、费用地点和费用金额。每条费用明细都可以上传对应发票及其他附件。</p>
      <p>发票仅支持 PDF；其他附件支持 PDF、JPG、JPEG、PNG。附件支持点击选择或拖拽上传。</p>
      <p>“暂存”只保存当前编辑内容，不会进入审核；确认无误后点击“提交”发起审核。</p>
      <p><strong>审核流程</strong></p>
      <p>提交后，报销单从提交人所在部门负责人开始，依次流转至上级部门负责人，直到总经理审核。页面中的审核流程会显示后续审核人以及当前停留的审核节点。</p>
      <p>所有审核人通过后，报销单变为“审核通过”；任一审核人驳回后变为“已驳回”，修改后可以重新提交。</p>
    </div>,
  });

  return (
    <PageContainer title={claim ? `报销单 ${claim.claimNo}` : '新增报销'} extra={<Space><Button icon={<InfoCircleOutlined />} onClick={showInstructions}>使用说明</Button><Button icon={<ArrowLeftOutlined />} onClick={() => history.push('/oa/expense')}>返回列表</Button></Space>}>
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        {claim && <Card><Space><span>状态：</span><Tag color={statusMap[claim.status][1]}>{statusMap[claim.status][0]}</Tag><span>总金额：¥{total.toFixed(2)}</span></Space></Card>}
        {grouped.map((group) => <Card key={group.key} className={styles.expenseSection} title={<span className={styles.sectionTitle}>{group.label}</span>} extra={editable && <Button type="primary" ghost size="small" icon={<PlusOutlined />} onClick={() => addItem(group.key)}>新增条目</Button>}>
          {group.rows.length === 0 && <div className={styles.emptySection}>暂无条目，点击右上角新增费用</div>}
          {group.rows.map(({ item, index }) => <Card.Grid key={index} className={styles.expenseItem}>
            {editable && <div className={styles.itemToolbar}><Button danger size="small" icon={<DeleteOutlined />} onClick={() => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))}>删除条目</Button></div>}
            <div className={styles.fieldRow}><span className={styles.fieldLabel}>费用日期</span><DatePicker disabled={!editable} value={item.expenseDate ? dayjs(item.expenseDate) : undefined} onChange={(value) => updateItem(index, { expenseDate: value?.format('YYYY-MM-DD') })} /></div>
            <div className={styles.fieldRow}><span className={styles.fieldLabel}>费用地点</span><Input disabled={!editable} placeholder="请输入费用发生地点" value={item.expenseLocation} onChange={(event) => updateItem(index, { expenseLocation: event.target.value })} /></div>
            <div className={styles.fieldRow}><span className={styles.fieldLabel}>费用金额</span><InputNumber className={styles.amountInput} disabled={!editable} min={0} precision={2} placeholder="请输入金额" value={item.amount} onChange={(value) => updateItem(index, { amount: Number(value || 0) })} /><span className={styles.currencyLabel}>元</span></div>
            {claim && <Space style={{ marginTop: 12 }} wrap>
              <div className={styles.uploadRow}>
                <Upload.Dragger className={styles.uploadBox} showUploadList={false} accept=".pdf" disabled={!editable} customRequest={async ({ file, onSuccess, onError }) => { try { await uploadAttachment(index, 'INVOICE', file as File); message.success('发票上传成功'); onSuccess?.({}); } catch (error) { onError?.(error as Error); message.error((error as Error).message); } }} beforeUpload={(file) => file.type === 'application/pdf' || (message.error('发票只允许PDF'), false)}>
                  <p className="ant-upload-drag-icon"><InboxOutlined /></p><Button type="primary" ghost disabled={!editable}>上传发票PDF</Button><p className="ant-upload-hint">支持拖拽或点击，限 PDF</p>
                </Upload.Dragger>
                <Upload.Dragger className={styles.uploadBox} showUploadList={false} accept=".pdf,.jpg,.jpeg,.png" disabled={!editable} customRequest={async ({ file, onSuccess, onError }) => { try { await uploadAttachment(index, 'OTHER', file as File); message.success('附件上传成功'); onSuccess?.({}); } catch (error) { onError?.(error as Error); message.error((error as Error).message); } }}>
                  <p className="ant-upload-drag-icon"><InboxOutlined /></p><Button type="primary" ghost disabled={!editable}>上传其他附件</Button><p className="ant-upload-hint">支持拖拽或点击，限 PDF/图片</p>
                </Upload.Dragger>
              </div>
              {!item.id && editable && <span style={{ color: '#8c8c8c' }}>上传时会自动暂存该费用条目</span>}
              {(claim.attachments || []).filter((attachment) => attachment.itemId === item.id).map((attachment) => <Button key={attachment.id} type="link" onClick={() => preview(attachment)}>{attachment.attachmentKind === 'INVOICE' ? '查看发票' : '查看附件'}：{attachment.fileName}</Button>)}
            </Space>}
          </Card.Grid>)}
        </Card>)}
        {claim && claim.approvalNodes && claim.approvalNodes.length > 0 && <Card title={claim.approvalNodes.some((node) => node.preview) ? '审核流转（预计）' : '审核流转'}><Timeline items={claim.approvalNodes.map((node) => ({ color: node.preview ? 'gray' : node.status === 'APPROVED' ? 'green' : node.status === 'REJECTED' ? 'red' : node.reviewerUserId === claim.currentReviewerId ? 'blue' : 'gray', children: <div><div>{node.sequenceNo}. {node.orgName || '上级组织'} - {node.reviewerName || '待配置负责人'}</div><div style={{ color: '#999' }}>{node.preview ? '提交后按此顺序审核' : node.status === 'PENDING' && node.reviewerUserId === claim.currentReviewerId ? '当前审核人' : node.status === 'PENDING' ? '待审核' : node.status === 'APPROVED' ? '已通过' : '已驳回'}{node.opinion ? `：${node.opinion}` : ''}</div></div> }))} /></Card>}
        <Divider />
        {editable && <Space><Button loading={loading} onClick={() => void save()}>暂存</Button><Button type="primary" loading={loading} onClick={() => void submit()}>提交</Button></Space>}
        {canReview && <Space><Button type="primary" onClick={() => void review('APPROVE')}>审核通过</Button><Button danger onClick={() => void review('REJECT')}>驳回</Button></Space>}
      </Space>
    </PageContainer>
  );
}
