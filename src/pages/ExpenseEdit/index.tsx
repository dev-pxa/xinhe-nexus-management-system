import {
  createExpense,
  expenseAttachmentUrl,
  getExpense,
  reviewExpense,
  saveExpense,
  submitExpense,
  uploadExpenseAttachment,
  withdrawExpense,
} from '@/services/management';
import {
  ArrowLeftOutlined,
  DeleteOutlined,
  InboxOutlined,
  InfoCircleOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { history, useParams } from '@umijs/max';
import {
  Button,
  Card,
  DatePicker,
  Divider,
  Image,
  Input,
  InputNumber,
  message,
  Modal,
  Select,
  Space,
  Tag,
  Timeline,
  Upload,
} from 'antd';
import dayjs from 'dayjs';
import { useEffect, useMemo, useState } from 'react';
import styles from './index.less';

const categories: {
  key: ManagementAPI.ExpenseItem['expenseCategory'];
  label: string;
}[] = [
  { key: 'ACCOMMODATION', label: '住宿费用' },
  { key: 'MEAL', label: '餐饮费用' },
  { key: 'TRANSPORT', label: '交通费用' },
  { key: 'OTHER', label: '其他费用' },
];

const statusMap: Record<
  ManagementAPI.ExpenseClaim['status'],
  [string, string]
> = {
  DRAFT: ['草稿', 'default'],
  PENDING: ['待直属负责人审批', 'processing'],
  REVIEWING: ['待最终审批', 'warning'],
  APPROVED: ['审核通过', 'success'],
  REJECTED: ['已驳回', 'error'],
};

const nodeStatusMap: Record<string, string> = {
  PENDING: '待审核',
  APPROVED: '已通过',
  REJECTED: '已驳回',
  CANCELLED: '已结束',
};

export default function ExpenseEditPage() {
  const { id } = useParams<{ id: string }>();
  const [claim, setClaim] = useState<ManagementAPI.ExpenseClaim>();
  const [items, setItems] = useState<ManagementAPI.ExpenseItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [previewAttachment, setPreviewAttachment] =
    useState<ManagementAPI.ExpenseAttachment>();
  const editable = claim?.status === 'DRAFT' || claim?.status === 'REJECTED';

  const load = async () => {
    if (!id || id === 'new') return;
    const response = await getExpense(Number(id));
    if (response.code === 0 && response.data) {
      setClaim(response.data);
      setItems(response.data.items || []);
    } else message.error(response.message);
  };

  useEffect(() => {
    if (id === 'new') {
      void createExpense().then((response) => {
        if (response.code === 0 && response.data) {
          setClaim(response.data);
          setItems(response.data.items || []);
          history.replace(`/oa/expense/${response.data.id}`);
        } else message.error(response.message);
      });
    } else void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const total = items.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const categoryTotals = useMemo(
    () =>
      categories.map((category) => ({
        ...category,
        amount: items
          .filter((item) => item.expenseCategory === category.key)
          .reduce((sum, item) => sum + Number(item.amount || 0), 0),
      })),
    [items],
  );

  const updateItem = (
    index: number,
    patch: Partial<ManagementAPI.ExpenseItem>,
  ) =>
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    );
  const addItem = () =>
    setItems((current) => [
      ...current,
      { expenseCategory: 'OTHER', amount: 0 },
    ]);

  const save = async (
    showSuccess = true,
  ): Promise<ManagementAPI.ExpenseClaim | undefined> => {
    if (!claim) return undefined;
    setLoading(true);
    try {
      const response = await saveExpense(claim.id, items);
      if (response.code !== 0 || !response.data) {
        message.error(response.message || '费用明细保存失败');
        return undefined;
      }
      setClaim(response.data);
      setItems(response.data.items || []);
      if (showSuccess) message.success('已暂存');
      return response.data;
    } catch {
      return undefined;
    } finally {
      setLoading(false);
    }
  };

  const ensureItemId = async (index: number) => {
    const existingId = items[index]?.id;
    if (existingId) return existingId;
    const saved = await save(false);
    const savedId = saved?.items?.[index]?.id;
    if (!savedId) throw new Error('费用条目暂存失败，无法上传附件');
    return savedId;
  };

  const uploadAttachment = async (
    index: number,
    kind: 'INVOICE' | 'OTHER',
    file: File,
  ) => {
    if (!claim) throw new Error('报销单尚未创建');
    const itemId = await ensureItemId(index);
    const response = await uploadExpenseAttachment(
      claim.id,
      itemId,
      kind,
      file,
    );
    if (response.code !== 0)
      throw new Error(response.message || '附件上传失败');
    await load();
  };

  const submit = async () => {
    const saved = await save(false);
    if (!saved) return;
    setLoading(true);
    try {
      const response = await submitExpense(saved.id, saved.version);
      if (response.code === 0) {
        message.success('提交成功');
        await load();
      } else message.error(response.message);
    } finally {
      setLoading(false);
    }
  };

  const withdraw = () => {
    if (!claim) return;
    Modal.confirm({
      title: '确认撤回报销单？',
      content: '撤回后报销单将恢复为草稿，可以继续修改并重新提交。',
      okText: '确认撤回',
      cancelText: '取消',
      onOk: async () => {
        const response = await withdrawExpense(claim.id, claim.version);
        if (response.code === 0) {
          message.success('报销单已撤回并恢复为草稿');
          await load();
        } else message.error(response.message);
      },
    });
  };

  const review = (action: 'APPROVE' | 'REJECT') => {
    if (!claim) return;
    let opinion = '';
    Modal.confirm({
      title: action === 'APPROVE' ? '确认通过该报销单？' : '驳回报销单',
      content:
        action === 'APPROVE' ? (
          <p>确认已核对费用明细及附件，并通过当前审批节点。</p>
        ) : (
          <Input.TextArea
            aria-label="驳回原因"
            rows={4}
            maxLength={1000}
            placeholder="请填写驳回原因"
            onChange={(event) => {
              opinion = event.target.value;
            }}
          />
        ),
      okText: action === 'APPROVE' ? '确认通过' : '确认驳回',
      okType: action === 'APPROVE' ? 'primary' : 'danger',
      cancelText: '取消',
      onOk: async () => {
        if (action === 'REJECT' && !opinion.trim()) {
          message.error('请填写驳回原因');
          return Promise.reject();
        }
        setReviewing(true);
        try {
          const response = await reviewExpense(
            claim.id,
            action,
            opinion.trim(),
            claim.version,
          );
          if (response.code !== 0) {
            message.error(response.message);
            return Promise.reject();
          }
          message.success(action === 'APPROVE' ? '审核通过' : '已驳回');
          await load();
        } finally {
          setReviewing(false);
        }
      },
    });
  };

  const showInstructions = () =>
    Modal.info({
      title: '报销使用说明',
      width: 680,
      content: (
        <div>
          <p>
            报销由本部门负责人审批；申请人是负责人时向上级部门查找。匹配到的负责人具备最终审批资格时，一次审批完成，否则继续流转终审。
          </p>
          <p>
            审批人尚未处理时可以撤回，发生审批后请查看审核流转进度。
          </p>
          <p>发票和其他附件支持 PDF、JPG、JPEG、PNG，可在详情页预览。</p>
        </div>
      ),
    });

  const previewUrl = previewAttachment
    ? expenseAttachmentUrl(previewAttachment.id)
    : '';
  const isImage = Boolean(previewAttachment?.contentType.startsWith('image/'));

  return (
    <PageContainer
      className={styles.page}
      title={claim ? `报销单 ${claim.claimNo}` : '新增报销'}
      extra={
        <Space className={styles.pageActions}>
          <Button icon={<InfoCircleOutlined />} onClick={showInstructions}>
            使用说明
          </Button>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => history.push('/oa/expense')}
          >
            返回列表
          </Button>
        </Space>
      }
    >
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        {claim && (
          <Card>
            <Space wrap>
              <span>状态：</span>
              <Tag color={statusMap[claim.status][1]}>
                {statusMap[claim.status][0]}
              </Tag>
              {claim.applicantName && (
                <span>申请人：{claim.applicantName}</span>
              )}
              {claim.applicantOrgName && (
                <span>部门：{claim.applicantOrgName}</span>
              )}
              <Tag color="blue">总金额：¥{total.toFixed(2)}</Tag>
              {categoryTotals.map((category) => (
                <Tag key={category.key}>
                  {category.label}：¥{category.amount.toFixed(2)}
                </Tag>
              ))}
            </Space>
          </Card>
        )}
        <Card
          className={styles.expenseSection}
          title={<span className={styles.sectionTitle}>费用明细</span>}
          extra={
            editable && (
              <Button
                type="primary"
                ghost
                size="small"
                icon={<PlusOutlined />}
                onClick={addItem}
              >
                新增条目
              </Button>
            )
          }
        >
          {items.length === 0 && (
            <div className={styles.emptySection}>
              暂无费用明细，点击右上角新增条目
            </div>
          )}
          {items.map((item, index) => (
            <Card.Grid
              key={item.id || `new-${index}`}
              className={styles.expenseItem}
            >
              {editable && (
                <div className={styles.itemToolbar}>
                  <Button
                    type="link"
                    danger
                    size="small"
                    icon={<DeleteOutlined />}
                    onClick={() =>
                      Modal.confirm({
                        title: `确认删除费用条目 ${index + 1}？`,
                        content: '删除后需要点击暂存或提交才会保存。',
                        okText: '删除条目',
                        okType: 'danger',
                        cancelText: '取消',
                        onOk: () =>
                          setItems((current) =>
                            current.filter(
                              (_, itemIndex) => itemIndex !== index,
                            ),
                          ),
                      })
                    }
                  >
                    删除条目
                  </Button>
                </div>
              )}
              <div className={styles.fieldRow}>
                <span className={styles.fieldLabel}>报销类型</span>
                <Select
                  disabled={!editable}
                  value={item.expenseCategory}
                  options={categories.map((category) => ({
                    value: category.key,
                    label: category.label,
                  }))}
                  onChange={(value) =>
                    updateItem(index, { expenseCategory: value })
                  }
                  style={{ width: 220 }}
                />
              </div>
              <div className={styles.fieldRow}>
                <span className={styles.fieldLabel}>费用日期</span>
                <DatePicker
                  disabled={!editable}
                  value={item.expenseDate ? dayjs(item.expenseDate) : undefined}
                  onChange={(value) =>
                    updateItem(index, {
                      expenseDate: value?.format('YYYY-MM-DD'),
                    })
                  }
                />
              </div>
              <div className={styles.fieldRow}>
                <span className={styles.fieldLabel}>费用地点</span>
                <Input
                  disabled={!editable}
                  placeholder="请输入费用发生地点"
                  value={item.expenseLocation}
                  onChange={(event) =>
                    updateItem(index, { expenseLocation: event.target.value })
                  }
                />
              </div>
              <div className={styles.fieldRow}>
                <span className={styles.fieldLabel}>费用金额</span>
                <InputNumber
                  className={styles.amountInput}
                  disabled={!editable}
                  min={0}
                  precision={2}
                  placeholder="请输入金额"
                  value={item.amount}
                  onChange={(value) =>
                    updateItem(index, { amount: Number(value || 0) })
                  }
                />
                <span className={styles.currencyLabel}>元</span>
              </div>
              {claim && (
                <Space style={{ marginTop: 12 }} wrap>
                  {editable && (
                    <div className={styles.uploadRow}>
                      {(['INVOICE', 'OTHER'] as const).map((kind) => (
                        <Upload.Dragger
                          key={kind}
                          className={styles.uploadBox}
                          showUploadList={false}
                          accept=".pdf,.jpg,.jpeg,.png"
                          customRequest={async ({
                            file,
                            onSuccess,
                            onError,
                          }) => {
                            try {
                              await uploadAttachment(index, kind, file as File);
                              message.success(
                                kind === 'INVOICE'
                                  ? '发票上传成功'
                                  : '附件上传成功',
                              );
                              onSuccess?.({});
                            } catch (error) {
                              onError?.(error as Error);
                              message.error((error as Error).message);
                            }
                          }}
                        >
                          <p className="ant-upload-drag-icon">
                            <InboxOutlined />
                          </p>
                          <Button type="primary" ghost>
                            {kind === 'INVOICE' ? '上传发票' : '上传其他附件'}
                          </Button>
                          <p className="ant-upload-hint">限 PDF/JPG/PNG</p>
                        </Upload.Dragger>
                      ))}
                    </div>
                  )}
                  {(claim.attachments || [])
                    .filter((attachment) => attachment.itemId === item.id)
                    .map((attachment) => (
                      <Button
                        key={attachment.id}
                        type="link"
                        onClick={() => setPreviewAttachment(attachment)}
                      >
                        {attachment.attachmentKind === 'INVOICE'
                          ? '预览发票'
                          : '预览附件'}
                        ：{attachment.fileName}
                      </Button>
                    ))}
                </Space>
              )}
            </Card.Grid>
          ))}
        </Card>
        {claim?.approvalNodes?.length ? (
          <Card
            title={
              claim.approvalNodes.some((node) => node.preview)
                ? '审核流转（预计）'
                : '审核流转'
            }
          >
            <Timeline
              items={claim.approvalNodes.map((node) => ({
                color:
                  node.status === 'APPROVED'
                    ? 'green'
                    : node.status === 'REJECTED'
                    ? 'red'
                    : node.status === 'CANCELLED'
                    ? 'gray'
                    : 'blue',
                children: (
                  <div>
                    <div>
                      第 {node.approvalRound || claim.approvalRound || 1} 轮 ·{' '}
                      {node.nodeType === 'FINAL_APPROVER'
                        ? '最终审批'
                        : '直属部门负责人审批'}
                      ：{node.reviewerName || '待确定审批人'}
                    </div>
                    <div style={{ color: '#999' }}>
                      {node.preview
                        ? '提交后按此流程审核'
                        : nodeStatusMap[node.status] || '未知状态'}
                      {node.opinion ? `：${node.opinion}` : ''}
                      {node.actedAt ? `（${node.actedAt}）` : ''}
                    </div>
                  </div>
                ),
              }))}
            />
          </Card>
        ) : null}
        <Divider />
        {editable && (
          <Space className={styles.bottomActions}>
            <Button loading={loading} onClick={() => void save()}>
              暂存
            </Button>
            <Button
              type="primary"
              loading={loading}
              onClick={() => void submit()}
            >
              提交
            </Button>
          </Space>
        )}
        {claim?.canWithdraw && (
          <Button loading={loading} onClick={withdraw}>
            撤回报销
          </Button>
        )}
        {claim?.canReview && (
          <Space className={styles.bottomActions}>
            <Button
              type="primary"
              loading={reviewing}
              onClick={() => review('APPROVE')}
            >
              通过
            </Button>
            <Button danger loading={reviewing} onClick={() => review('REJECT')}>
              驳回
            </Button>
          </Space>
        )}
      </Space>
      <Modal
        className={styles.previewModal}
        title={previewAttachment?.fileName || '附件预览'}
        open={Boolean(previewAttachment)}
        footer={null}
        width={isImage ? 880 : 1000}
        onCancel={() => setPreviewAttachment(undefined)}
        destroyOnClose
      >
        {isImage ? (
          <div className={styles.imagePreview}>
            <Image
              src={previewUrl}
              alt={previewAttachment?.fileName}
              style={{ maxHeight: '70vh', objectFit: 'contain' }}
            />
          </div>
        ) : (
          <iframe
            className={styles.previewFrame}
            title={previewAttachment?.fileName || 'PDF附件'}
            src={previewUrl}
            style={{ width: '100%', height: '70vh', border: 0 }}
          />
        )}
      </Modal>
    </PageContainer>
  );
}
