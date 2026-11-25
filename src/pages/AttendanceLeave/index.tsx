import type {
  LeaveDay,
  LeaveDetail,
  LeavePreview,
  LeaveRequest,
  LeaveType,
} from '@/services/leave';
import {
  createLeave,
  getLeave,
  leaveAttachmentUrl,
  leaveStatusLabels,
  leaveTypeLabels,
  listLeaveRequests,
  previewLeave,
  reviewLeave,
  withdrawLeave,
} from '@/services/leave';
import { PageContainer } from '@ant-design/pro-components';
import { history, useLocation } from '@umijs/max';
import type { UploadFile } from 'antd';
import {
  Alert,
  Button,
  Card,
  DatePicker,
  Drawer,
  Empty,
  Form,
  Image,
  Input,
  List,
  Modal,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Timeline,
  Upload,
  message,
} from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import { useCallback, useEffect, useRef, useState } from 'react';

import mobileStyles from '../oaMobile.less';
import styles from './index.less';

const applicationsPath = '/oa/approval/leave-requests';
const dateFormat = 'YYYY-MM-DD';
const typeOptions = Object.entries(leaveTypeLabels).map(([value, label]) => ({
  value,
  label,
}));
const statusOptions = Object.entries(leaveStatusLabels).map(
  ([value, label]) => ({ value, label }),
);
const dayLabels: Record<LeaveDay['dayType'], string> = {
  WORKDAY: '计入请假',
  COMPANY_HOLIDAY: '公司假',
  PERSONAL_HOLIDAY: '个人假',
};
const formatTime = (value?: string) =>
  value ? dayjs(value).format('YYYY-MM-DD HH:mm') : '';
type FormValues = {
  leaveType: LeaveType;
  startDate: Dayjs;
  endDate: Dayjs;
  reason: string;
};

function LeaveDays({ days }: { days: LeaveDay[] }) {
  return (
    <ul className={styles.days}>
      {days.map((day) => {
        const excluded =
          day.dayType === 'COMPANY_HOLIDAY' ||
          day.dayType === 'PERSONAL_HOLIDAY';
        return (
          <li key={day.date} className={excluded ? styles.excluded : undefined}>
            <time dateTime={day.date}>{day.date}</time>
            <span>
              {dayLabels[day.dayType] || '未知日期类型'}
              {excluded && ' · 不计入请假'}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function requestStatus(row: LeaveRequest) {
  if (row.status === 'PENDING_MANAGER') {
    return row.finalReviewerName ? '待直属上级初审' : '待公司顶层管理员审批';
  }
  return leaveStatusLabels[row.status] || '未知状态';
}

function ApprovalProgress({ detail }: { detail: LeaveDetail }) {
  const managerStatus = detail.managerActedAt
    ? detail.status === 'REJECTED' && !detail.finalActedAt
      ? '已驳回'
      : '已通过'
    : detail.status === 'WITHDRAWN'
    ? '已撤回'
    : '待审批';
  const finalStatus = detail.finalActedAt
    ? detail.status === 'APPROVED'
      ? '已通过'
      : '已驳回'
    : detail.status === 'PENDING_FINAL'
    ? '待审批'
    : detail.status === 'PENDING_MANAGER'
    ? '未开始'
    : '已结束';
  return (
    <Timeline
      items={[
        {
          color: 'green',
          children: `提交申请 · ${detail.applicantName} · ${formatTime(
            detail.submittedAt,
          )}`,
        },
        {
          color:
            managerStatus === '已通过'
              ? 'green'
              : managerStatus === '已驳回'
              ? 'red'
              : 'blue',
          children: (
            <>
              <div>
                {detail.finalReviewerName
                  ? '直属上级初审'
                  : '公司顶层管理员审批'}{' '}
                · {detail.managerName} · {managerStatus}
              </div>
              {detail.managerActedAt && (
                <div>{formatTime(detail.managerActedAt)}</div>
              )}
              {detail.managerComment && <div>{detail.managerComment}</div>}
            </>
          ),
        },
        ...(detail.finalReviewerName
          ? [
              {
                color:
                  finalStatus === '已通过'
                    ? 'green'
                    : finalStatus === '已驳回'
                    ? 'red'
                    : finalStatus === '待审批'
                    ? 'blue'
                    : 'gray',
                children: (
                  <>
                    <div>
                      公司顶层管理员终审 · {detail.finalReviewerName} ·{' '}
                      {finalStatus}
                    </div>
                    {detail.finalActedAt && (
                      <div>{formatTime(detail.finalActedAt)}</div>
                    )}
                    {detail.finalComment && <div>{detail.finalComment}</div>}
                  </>
                ),
              },
            ]
          : []),
        ...(detail.status === 'WITHDRAWN'
          ? [{ color: 'gray', children: '申请已撤回' }]
          : []),
      ]}
    />
  );
}

function LeavePage({
  review,
  initialDate,
}: {
  review: boolean;
  initialDate: string | null;
}) {
  const [rows, setRows] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [month, setMonth] = useState('');
  const [status, setStatus] = useState<string>();
  const [detail, setDetail] = useState<LeaveDetail>();
  const [attachmentOpen, setAttachmentOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const selectedDetail = useRef<number>();
  const [form] = Form.useForm<FormValues>();
  const [formOpen, setFormOpen] = useState(Boolean(initialDate));
  const [file, setFile] = useState<UploadFile>();
  const [preview, setPreview] = useState<LeavePreview>();
  const [previewError, setPreviewError] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [decision, setDecision] = useState<boolean>();
  const [decisionComment, setDecisionComment] = useState('');
  const [acting, setActing] = useState(false);
  const [formDates, setFormDates] = useState<{
    startDate?: Dayjs;
    endDate?: Dayjs;
  }>(() => {
    const date = initialDate ? dayjs(initialDate) : undefined;
    return date?.isValid() ? { startDate: date, endDate: date } : {};
  });
  const start = formDates.startDate?.format(dateFormat);
  const end = formDates.endDate?.format(dateFormat);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const response = await listLeaveRequests(review);
      setRows(response.data || []);
    } catch {
      // App request handling displays the error.
    } finally {
      setLoading(false);
    }
  }, [review]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    setPreview(undefined);
    setPreviewError('');
    if (!formOpen || !start || !end) {
      setPreviewLoading(false);
      return;
    }
    if (start > end) {
      setPreviewError('结束日期不能早于开始日期');
      setPreviewLoading(false);
      return;
    }
    let active = true;
    setPreviewLoading(true);
    void previewLeave(start, end)
      .then((response) => {
        if (active) setPreview(response.data);
      })
      .catch((error) => {
        if (active)
          setPreviewError(
            error?.response?.data?.message || '无法核算请假日期，请重试',
          );
      })
      .finally(() => {
        if (active) setPreviewLoading(false);
      });
    return () => {
      active = false;
    };
  }, [formOpen, start, end]);

  const showDetail = async (id: number) => {
    selectedDetail.current = id;
    setDetailLoading(true);
    try {
      const response = await getLeave(id);
      if (selectedDetail.current === id) setDetail(response.data);
    } catch {
      if (selectedDetail.current === id) selectedDetail.current = undefined;
    } finally {
      if (selectedDetail.current === id || selectedDetail.current === undefined)
        setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setAttachmentOpen(false);
    selectedDetail.current = undefined;
    setDetail(undefined);
    setDetailLoading(false);
  };

  const openForm = (copied?: LeaveDetail) => {
    closeDetail();
    form.resetFields();
    const dates = copied
      ? {
          startDate: dayjs(copied.startDate),
          endDate: dayjs(copied.endDate),
        }
      : {};
    setFormDates(dates);
    form.setFieldsValue({
      ...dates,
      leaveType: copied?.leaveType,
      reason: copied?.reason,
    });
    setFile(undefined);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    if (initialDate) history.replace(applicationsPath);
  };

  const leaveDays =
    preview?.days.filter((day) => day.dayType === 'WORKDAY').length || 0;
  const conflicts = preview?.conflictDates || [];
  const canSubmit = Boolean(
    preview && leaveDays && conflicts.length === 0 && !previewLoading,
  );

  const submit = async (values: FormValues) => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const result = await createLeave(
        {
          leaveType: values.leaveType,
          startDate: values.startDate.format(dateFormat),
          endDate: values.endDate.format(dateFormat),
          reason: values.reason.trim(),
        },
        file?.originFileObj,
      );
      if (!result.data) return;
      message.success('请假申请已提交');
      closeForm();
      void loadList();
      void showDetail(result.data.id);
    } catch {
      // Preserve the form so the employee can correct it.
    } finally {
      setSubmitting(false);
    }
  };

  const withdraw = (id: number) => {
    Modal.confirm({
      title: '撤回这条请假申请？',
      content: '撤回后将结束本次审批。',
      okText: '撤回申请',
      cancelText: '取消',
      onOk: async () => {
        try {
          await withdrawLeave(id);
          message.success('请假申请已撤回');
          await loadList();
        } catch {
          return Promise.reject();
        }
      },
    });
  };

  const confirmDecision = async () => {
    if (!detail || decision === undefined) return;
    if (!decision && !decisionComment.trim()) return;
    setActing(true);
    try {
      await reviewLeave(detail.id, decision, decisionComment.trim());
      message.success(decision ? '审批已通过' : '申请已驳回');
      setDecision(undefined);
      await Promise.all([showDetail(detail.id), loadList()]);
    } catch {
      // Keep the decision dialog open when the server declines the update.
    } finally {
      setActing(false);
    }
  };

  const visibleRows = rows.filter(
    (row) =>
      (!status || row.status === status) &&
      (!month ||
        (row.startDate.slice(0, 7) <= month &&
          row.endDate.slice(0, 7) >= month)),
  );

  const renderActions = (row: LeaveRequest) => (
    <Space wrap size={4}>
      <Button type="link" onClick={() => void showDetail(row.id)}>
        查看详情
      </Button>
      {!review && ['PENDING_MANAGER', 'PENDING_FINAL'].includes(row.status) && (
        <Button type="link" onClick={() => withdraw(row.id)}>
          撤回申请
        </Button>
      )}
    </Space>
  );

  return (
    <PageContainer
      title={review ? '请假审批' : '请假申请'}
      extra={
        !review && (
          <Button type="primary" onClick={() => openForm()}>
            发起请假申请
          </Button>
        )
      }
    >
      <Space wrap style={{ marginBottom: 16 }}>
        <DatePicker
          picker="month"
          placeholder="请假月份"
          onChange={(value) => setMonth(value?.format('YYYY-MM') || '')}
        />
        <Select
          aria-label="申请状态"
          placeholder="申请状态"
          allowClear
          options={statusOptions}
          onChange={setStatus}
          style={{ width: 220 }}
        />
      </Space>
      <div className={review ? undefined : mobileStyles.desktopOnly}>
        <Table<LeaveRequest>
          rowKey="id"
          loading={loading}
          dataSource={visibleRows}
          scroll={{ x: 'max-content' }}
          locale={{
            emptyText: (
              <Empty description={review ? '暂无请假审批' : '暂无请假申请'} />
            ),
          }}
          columns={[
            ...(review
              ? [
                  { title: '申请人', dataIndex: 'applicantName' },
                  { title: '部门', dataIndex: 'departmentName' },
                ]
              : []),
            {
              title: '假种',
              dataIndex: 'leaveType',
              render: (value: LeaveType) =>
                leaveTypeLabels[value] || '未知假种',
            },
            {
              title: '日期范围',
              render: (_, row) => `${row.startDate} 至 ${row.endDate}`,
            },
            {
              title: '实际请假天数',
              dataIndex: 'leaveDays',
              render: (days) => `${days} 天`,
            },
            {
              title: '审批进度',
              dataIndex: 'status',
              render: (_, row) => <Tag>{requestStatus(row)}</Tag>,
            },
            { title: '提交时间', dataIndex: 'submittedAt', render: formatTime },
            {
              title: '操作',
              render: (_, row) => renderActions(row),
            },
          ]}
        />
      </div>
      {!review && (
        <div className={mobileStyles.mobileOnly}>
          <List<LeaveRequest>
            rowKey="id"
            loading={loading}
            dataSource={visibleRows}
            pagination={
              visibleRows.length > 10
                ? { pageSize: 10, showSizeChanger: false }
                : false
            }
            locale={{ emptyText: <Empty description="暂无请假申请" /> }}
            renderItem={(row) => (
              <List.Item className={styles.cardItem}>
                <Card className={styles.requestCard} size="small">
                  <div className={styles.heading}>
                    <h3>{leaveTypeLabels[row.leaveType] || '未知假种'}</h3>
                    <Tag>{requestStatus(row)}</Tag>
                  </div>
                  <div className={styles.cardDates}>
                    <span>
                      {row.startDate} 至 {row.endDate}
                    </span>
                    <span>
                      实际请假 <strong>{row.leaveDays}</strong> 天
                    </span>
                  </div>
                  <div className={styles.cardFooter}>
                    <span>提交于 {formatTime(row.submittedAt)}</span>
                    {renderActions(row)}
                  </div>
                </Card>
              </List.Item>
            )}
          />
        </div>
      )}

      <Modal
        title="新建请假申请"
        open={formOpen}
        onCancel={closeForm}
        okText="提交申请"
        okButtonProps={{ disabled: !canSubmit }}
        confirmLoading={submitting}
        cancelButtonProps={{ disabled: submitting }}
        closable={!submitting}
        maskClosable={!submitting}
        onOk={() => form.submit()}
        forceRender
      >
        <Form<FormValues>
          form={form}
          layout="vertical"
          initialValues={formDates}
          onFinish={submit}
          onValuesChange={(changed, values) => {
            if ('startDate' in changed || 'endDate' in changed) {
              setPreview(undefined);
              setFormDates({
                startDate: values.startDate,
                endDate: values.endDate,
              });
            }
          }}
        >
          <Form.Item
            label="假种"
            name="leaveType"
            rules={[{ required: true, message: '请选择假种' }]}
          >
            <Select options={typeOptions} />
          </Form.Item>
          <Space wrap align="start">
            <Form.Item
              label="开始日期"
              name="startDate"
              rules={[{ required: true, message: '请选择开始日期' }]}
            >
              <DatePicker placeholder="开始日期" format={dateFormat} />
            </Form.Item>
            <Form.Item
              label="结束日期"
              name="endDate"
              rules={[{ required: true, message: '请选择结束日期' }]}
            >
              <DatePicker placeholder="结束日期" format={dateFormat} />
            </Form.Item>
          </Space>
          {previewLoading && <Spin size="small" />}
          {previewError && (
            <Alert type="error" showIcon message={previewError} />
          )}
          {preview && (
            <Space
              direction="vertical"
              style={{ marginBottom: 16, width: '100%' }}
            >
              <strong>
                申请范围 {preview.days.length} 天，实际请假 {leaveDays} 天
              </strong>
              <LeaveDays days={preview.days} />
              {!leaveDays && (
                <Alert
                  type="warning"
                  message="所选日期均为休息日，请选择应出勤日"
                />
              )}
              {conflicts.length > 0 && (
                <Alert
                  type="error"
                  message={`已有请假申请覆盖 ${conflicts.join('、')}`}
                />
              )}
              <div>
                {preview.finalReviewerName
                  ? '直属上级初审'
                  : '公司顶层管理员审批'}{' '}
                · {preview.managerName}
              </div>
              {preview.finalReviewerName && (
                <div>公司顶层管理员终审 · {preview.finalReviewerName}</div>
              )}
            </Space>
          )}
          <Form.Item
            label="请假原因"
            name="reason"
            rules={[
              { required: true, whitespace: true, message: '请输入请假原因' },
            ]}
          >
            <Input.TextArea maxLength={1000} rows={3} />
          </Form.Item>
          <Form.Item
            label="证明附件"
            extra="可选，支持 PDF、JPG、PNG，最大 5 MB"
          >
            <Upload
              accept=".pdf,.jpeg,.jpg,.png"
              maxCount={1}
              fileList={file ? [file] : []}
              beforeUpload={(next) => {
                if (next.size > 5 * 1024 * 1024) {
                  message.error('证明附件不能超过 5 MB');
                  return Upload.LIST_IGNORE;
                }
                return false;
              }}
              onChange={({ fileList }) => setFile(fileList[0])}
            >
              <Button>选择附件</Button>
            </Upload>
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        title="请假申请详情"
        open={Boolean(detail || detailLoading)}
        onClose={closeDetail}
        width={Math.min(600, window.innerWidth)}
        extra={
          detail && (
            <Space wrap>
              {!review && detail.status === 'REJECTED' && (
                <Button onClick={() => openForm(detail)}>修改后重新提交</Button>
              )}
              {review && detail.canReview && (
                <>
                  <Button
                    danger
                    onClick={() => {
                      setDecisionComment('');
                      setDecision(false);
                    }}
                  >
                    驳回申请
                  </Button>
                  <Button
                    type="primary"
                    onClick={() => {
                      setDecisionComment('');
                      setDecision(true);
                    }}
                  >
                    通过审批
                  </Button>
                </>
              )}
            </Space>
          )
        }
      >
        <Spin spinning={detailLoading}>
          {detail && (
            <>
              <header className={styles.summary}>
                <div className={styles.heading}>
                  <h2>{leaveTypeLabels[detail.leaveType] || '未知假种'}</h2>
                  <Tag>{requestStatus(detail)}</Tag>
                </div>
                <p>
                  {detail.applicantName} · {detail.departmentName}
                </p>
                <div className={styles.period}>
                  {detail.startDate} 至 {detail.endDate}
                </div>
                <div>
                  实际请假 <strong>{detail.leaveDays}</strong> 天
                </div>
              </header>
              <section className={styles.section}>
                <h3>请假原因</h3>
                <p className={styles.reason}>{detail.reason}</p>
                {detail.attachmentName && (
                  <p>
                    证明附件　
                    <Button type="link" onClick={() => setAttachmentOpen(true)}>
                      {detail.attachmentName}
                    </Button>
                  </p>
                )}
              </section>
              <section className={styles.section}>
                <div className={styles.heading}>
                  <h3>日期明细</h3>
                  <span>
                    共 {detail.days.length} 天 ·{' '}
                    {detail.days.length - detail.leaveDays} 天不计入
                  </span>
                </div>
                <LeaveDays days={detail.days} />
              </section>
              <section className={styles.section}>
                <h3>审核流转</h3>
                <ApprovalProgress detail={detail} />
              </section>
            </>
          )}
        </Spin>
      </Drawer>

      <Modal
        title={detail?.attachmentName || '附件预览'}
        open={attachmentOpen && Boolean(detail?.attachmentName)}
        onCancel={() => setAttachmentOpen(false)}
        footer={null}
        width={detail?.attachmentContentType === 'application/pdf' ? 1000 : 880}
        destroyOnClose
      >
        {detail &&
          attachmentOpen &&
          (detail.attachmentContentType === 'application/pdf' ? (
            <iframe
              className={styles.pdfPreview}
              title={detail.attachmentName || 'PDF附件'}
              src={leaveAttachmentUrl(detail.id)}
            />
          ) : (
            <div className={styles.imagePreview}>
              <Image
                src={leaveAttachmentUrl(detail.id)}
                alt={detail.attachmentName}
              />
            </div>
          ))}
      </Modal>

      <Modal
        title={decision ? '通过请假申请' : '驳回请假申请'}
        open={decision !== undefined}
        onCancel={() => setDecision(undefined)}
        onOk={() => void confirmDecision()}
        confirmLoading={acting}
        okText={decision ? '确认通过' : '确认驳回'}
        okButtonProps={{
          disabled: decision === false && !decisionComment.trim(),
        }}
      >
        {decision &&
          detail &&
          (detail.status === 'PENDING_FINAL' || !detail.finalReviewerName) && (
            <Alert
              type="info"
              showIcon
              style={{ marginBottom: 12 }}
              message={`将更新考勤的日期 ${detail.days
                .filter((day) => day.dayType === 'WORKDAY')
                .map((day) => day.date)
                .join('、')}`}
            />
          )}
        <Input.TextArea
          aria-label={decision ? '审批意见' : '驳回原因'}
          placeholder={decision ? '审批意见（可选）' : '请填写驳回原因'}
          maxLength={1000}
          value={decisionComment}
          onChange={(event) => setDecisionComment(event.target.value)}
          rows={3}
        />
      </Modal>
    </PageContainer>
  );
}

export default function AttendanceLeavePage() {
  const { pathname, search } = useLocation();
  const review = pathname.endsWith('/leave-review');
  return (
    <LeavePage
      key={pathname}
      review={review}
      initialDate={review ? null : new URLSearchParams(search).get('date')}
    />
  );
}
