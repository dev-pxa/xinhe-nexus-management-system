import {
  addCrmFollowup,
  createCrmCategory,
  downloadCrmAttachment,
  getCrmCustomer,
  listCrmCategories,
  listCrmCustomers,
  listCrmEligibleUsers,
  listCrmFollowups,
  saveCrmCustomer,
  setCrmCustomerFavorite,
  uploadCrmFollowupAttachment,
} from '@/services/crm';
import { StarFilled } from '@ant-design/icons';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { history, useModel } from '@umijs/max';
import {
  Button,
  Card,
  DatePicker,
  Descriptions,
  Drawer,
  Empty,
  Form,
  Input,
  List,
  message,
  Modal,
  Select,
  Space,
  Tag,
  TreeSelect,
  Typography,
  Upload,
} from 'antd';
import type { UploadFile } from 'antd/es/upload/interface';
import { useEffect, useState } from 'react';

/** 客户档案主视图：客户详情、编辑和跟踪记录均使用独立页面。 */
export default function CrmCustomersPage() {
  const [form] = Form.useForm();
  const [followForm] = Form.useForm();
  const [categoryForm] = Form.useForm();
  const { initialState } = useModel('@@initialState');
  const currentUserId = Number(initialState?.currentUser?.id);
  const canCreateSalesOrder =
    initialState?.currentUser?.permissions?.includes('*') ||
    initialState?.currentUser?.roles?.includes('COMPANY_ADMIN') ||
    initialState?.currentUser?.roles?.includes('PLATFORM_ADMIN') ||
    initialState?.currentUser?.permissions?.includes('crm:sales-order:create');
  const canChangeOwner =
    initialState?.currentUser?.permissions?.includes('*') ||
    initialState?.currentUser?.roles?.includes('COMPANY_ADMIN') ||
    initialState?.currentUser?.permissions?.includes('crm:customer:owner:edit');
  const canEditCollaborators =
    initialState?.currentUser?.permissions?.includes('*') ||
    initialState?.currentUser?.roles?.includes('COMPANY_ADMIN') ||
    initialState?.currentUser?.permissions?.includes(
      'crm:customer:collaborator:edit',
    );
  const canViewTeam = Boolean(
    initialState?.currentUser?.roles?.includes('COMPANY_ADMIN') ||
      initialState?.currentUser?.permissions?.includes('*') ||
      initialState?.currentUser?.permissions?.includes(
        'crm:customer:team-view',
      ),
  );
  const canManageCategories = Boolean(
    initialState?.currentUser?.roles?.includes('COMPANY_ADMIN') ||
      initialState?.currentUser?.permissions?.includes('*') ||
      initialState?.currentUser?.permissions?.includes('crm:customer:create'),
  );
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<any>();
  const [followups, setFollowups] = useState<any[]>([]);
  const [reload, setReload] = useState(0);
  const [categories, setCategories] = useState<any[]>([]);
  const [eligibleUsers, setEligibleUsers] = useState<any[]>([]);
  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false);
  const [viewOnly, setViewOnly] = useState(false);
  const [followFiles, setFollowFiles] = useState<UploadFile[]>([]);
  useEffect(() => {
    Promise.all([listCrmCategories(), listCrmEligibleUsers()])
      .then(([categoryResponse, userResponse]) => {
        setCategories(categoryResponse.data || []);
        setEligibleUsers(userResponse.data || []);
      })
      .catch((error: any) =>
        message.error(error?.message || '客户信息加载失败'),
      );
  }, []);

  const edit = async (record?: any, readonly = false) => {
    let selectedCustomer: any;
    setViewOnly(readonly);
    setSelected(undefined);
    form.resetFields();
    if (record) {
      const d = (await getCrmCustomer(record.id)).data;
      selectedCustomer = d;
      setSelected(d);
      form.setFieldsValue(d);
      setFollowups((await listCrmFollowups(record.id)).data || []);
    } else {
      setFollowups([]);
    }
    followForm.resetFields();
    const users = (await listCrmEligibleUsers()).data || [];
    setEligibleUsers(users);
    // 保留客户当前的离职负责人选项，便于编辑弹窗正确显示历史负责人并可主动改派。
    if (
      selectedCustomer?.ownerStatus === 'DEPARTED' &&
      !users.some((u: any) => u.id === selectedCustomer.ownerUserId)
    ) {
      users.push({
        id: selectedCustomer.ownerUserId,
        name: selectedCustomer.ownerName,
        departed: true,
      });
    }
    form.setFieldValue('_eligibleUsers', users);
    setOpen(true);
  };
  const toggleFavorite = async (record: any) => {
    try {
      await setCrmCustomerFavorite(record.id, !record.isFavorite);
      setReload((value) => value + 1);
    } catch (error: any) {
      message.error(error?.message || '收藏状态更新失败');
    }
  };
  const addCategory = async () => {
    const values = await categoryForm.validateFields();
    try {
      await createCrmCategory({ ...values, parentId: values.parentId || null });
      setCategories((await listCrmCategories()).data || []);
      categoryForm.resetFields();
      message.success('客户分类已添加');
    } catch (error: any) {
      message.error(error?.message || '客户分类添加失败');
    }
  };
  const refreshFollowups = async () => {
    if (selected?.id)
      setFollowups((await listCrmFollowups(selected.id)).data || []);
  };
  const submit = async () => {
    const values = await form.validateFields();
    try {
      await saveCrmCustomer(values, selected?.id);
      message.success('客户档案已保存');
      setOpen(false);
      setReload(reload + 1);
    } catch (e: any) {
      message.error(e?.message || '保存失败');
    }
  };
  const addFollow = async () => {
    const v = await followForm.validateFields();
    try {
      const created = await addCrmFollowup(selected.id, {
        ...v,
        occurredAt: v.occurredAt ? `${v.occurredAt}:00` : undefined,
        nextActionAt: v.nextActionAt
          ? v.nextActionAt.format('YYYY-MM-DDTHH:mm:ss')
          : undefined,
      });
      for (const file of followFiles)
        if (file.originFileObj)
          await uploadCrmFollowupAttachment(
            created.data.id,
            file.originFileObj,
          );
      followForm.resetFields();
      setFollowFiles([]);
      await refreshFollowups();
      message.success('跟进记录已添加');
    } catch (e: any) {
      message.error(e?.message || '添加失败；已保存的跟进记录不会丢失');
    }
  };
  const downloadAttachment = async (id: number, name: string) => {
    const response = await downloadCrmAttachment(id);
    const blob =
      response instanceof Blob ? response : new Blob([response as any]);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <PageContainer
      title="客户管理"
      content="按岗位权限查看和维护本公司客户；客户跟进按时间倒序记录在客户档案中。"
    >
      <ProTable<any>
        rowKey="id"
        key={reload}
        search={{ labelWidth: 'auto', defaultCollapsed: false }}
        request={async (params) => {
          const r = await listCrmCustomers({
            keyword: params.customerName,
            phone: params.phone,
            ownerUserId: canViewTeam ? params.ownerUserId : undefined,
            categoryId: params.categoryId,
            favorite: params.favorite,
          });
          return {
            data: r.data || [],
            success: true,
            total: (r.data || []).length,
          };
        }}
        toolBarRender={() => [
          ...(canManageCategories
            ? [
                <Button
                  key="categories"
                  onClick={() => setCategoryManagerOpen(true)}
                >
                  管理分类
                </Button>,
              ]
            : []),
          <Button
            key="add"
            type="primary"
            onClick={() => history.push('/crm/customers/new')}
          >
            新增客户
          </Button>,
        ]}
        columns={[
          { title: '客户编号', dataIndex: 'customerNo', search: false },
          {
            title: '客户名称',
            dataIndex: 'customerName',
            render: (_, r) => (
              <a onClick={() => history.push(`/crm/customers/${r.id}`)}>
                {Boolean(r.isFavorite) ? (
                  <StarFilled style={{ color: '#faad14', marginRight: 6 }} />
                ) : null}
                {r.customerName}
              </a>
            ),
          },
          { title: '联系电话', dataIndex: 'phone', search: true },
          {
            title: '负责人',
            dataIndex: 'ownerUserId',
            hideInSearch: !canViewTeam,
            valueType: canViewTeam ? 'select' : 'text',
            fieldProps: canViewTeam
              ? {
                  options: eligibleUsers.map((u: any) => ({
                    label: u.name,
                    value: u.id,
                  })),
                }
              : undefined,
            render: (_, r) => (
              <span>
                {r.ownerName || '未知用户'}
                {r.ownerStatus === 'DEPARTED' && (
                  <Tag color="error" bordered={false} style={{ marginLeft: 4 }}>
                    已离职
                  </Tag>
                )}
              </span>
            ),
          },
          {
            title: '分类',
            dataIndex: 'categoryId',
            valueType: 'select',
            fieldProps: { options: flattenCategoryOptions(categories) },
            render: (_, r) => r.categoryPath || '未分类',
          },
          {
            title: '是否收藏',
            dataIndex: 'favorite',
            hideInTable: true,
            valueType: 'select',
            fieldProps: {
              options: [
                { label: '已收藏', value: true },
                { label: '未收藏', value: false },
              ],
            },
          },
          {
            title: '合同数',
            dataIndex: 'contractCount',
            search: false,
            render: () => 0,
          },
          {
            title: '操作',
            valueType: 'option',
            search: false,
            render: (_, r) => (
              <Space size="middle">
                {canCreateSalesOrder &&
                  Number(r.ownerUserId) === currentUserId && (
                    <a
                      onClick={() =>
                        history.push(`/crm/sales-orders/new?customerId=${r.id}`)
                      }
                    >
                      新增订单
                    </a>
                  )}
                <a onClick={() => history.push(`/crm/customers/${r.id}`)}>
                  查看详情
                </a>
                <a onClick={() => history.push(`/crm/customers/${r.id}/edit`)}>
                  编辑
                </a>
                <a
                  onClick={() =>
                    history.push(`/crm/customers/${r.id}/followups`)
                  }
                >
                  跟踪记录
                </a>
                <a onClick={() => void toggleFavorite(r)}>
                  {r.isFavorite ? '取消收藏' : '收藏'}
                </a>
              </Space>
            ),
          },
        ]}
      />
      <Drawer
        title={
          selected
            ? viewOnly
              ? '客户详情与跟踪'
              : '编辑客户档案与跟踪'
            : '新增客户'
        }
        width={760}
        open={open}
        onClose={() => setOpen(false)}
        extra={
          <Space>
            <Button onClick={() => setOpen(false)}>取消</Button>
            {!viewOnly && (
              <Button type="primary" onClick={submit}>
                保存
              </Button>
            )}
          </Space>
        }
      >
        <Form form={form} layout="vertical">
          <Form.Item name="version" hidden>
            <Input />
          </Form.Item>
          <Form.Item
            name="customerName"
            label="客户名称"
            rules={[{ required: true, message: '请输入客户名称' }]}
          >
            <Input maxLength={160} disabled={viewOnly} />
          </Form.Item>
          <Form.Item name="phone" label="联系电话">
            <Input maxLength={40} disabled={viewOnly} />
          </Form.Item>
          <Form.Item name="address" label="详细地址">
            <Input.TextArea rows={2} maxLength={500} disabled={viewOnly} />
          </Form.Item>
          <Form.Item name="source" label="来源渠道">
            <Select
              disabled={viewOnly}
              allowClear
              options={[
                '抖音',
                '小红书',
                '老客户推荐',
                '设计师推荐',
                '材料商推荐',
                '扫楼',
                '其他',
              ].map((value) => ({ value, label: value }))}
              placeholder="请选择客户来源"
            />
          </Form.Item>
          <Form.Item name="categoryId" label="客户分类">
            <TreeSelect
              disabled={viewOnly}
              allowClear
              treeDefaultExpandAll
              treeData={buildCategoryTree(categories)}
              fieldNames={{
                label: 'title',
                value: 'value',
                children: 'children',
              }}
              placeholder="请选择分类"
            />
          </Form.Item>
          {selected && canChangeOwner && (
            <Form.Item name="ownerUserId" label="负责人">
              <Select
                disabled={viewOnly}
                options={(form.getFieldValue('_eligibleUsers') || []).map(
                  (u: any) => ({
                    value: u.id,
                    label: u.departed ? (
                      <span>
                        {u.name}
                        <Tag
                          color="error"
                          bordered={false}
                          style={{ marginLeft: 4 }}
                        >
                          已离职
                        </Tag>
                      </span>
                    ) : (
                      u.name
                    ),
                  }),
                )}
              />
            </Form.Item>
          )}
          {selected && !canChangeOwner && (
            <Form.Item label="负责人">
              <span>
                {selected.ownerName || '未知用户'}
                {selected.ownerStatus === 'DEPARTED' && (
                  <Tag color="error" bordered={false} style={{ marginLeft: 4 }}>
                    已离职
                  </Tag>
                )}
              </span>
            </Form.Item>
          )}
          {canEditCollaborators && (
            <Form.Item name="collaboratorUserIds" label="协作人">
              <Select
                disabled={viewOnly}
                mode="multiple"
                options={(form.getFieldValue('_eligibleUsers') || []).map(
                  (u: any) => ({ value: u.id, label: u.name }),
                )}
              />
            </Form.Item>
          )}
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={3} maxLength={1000} disabled={viewOnly} />
          </Form.Item>
        </Form>
        {selected && viewOnly && (
          <Button
            style={{ marginTop: 12 }}
            onClick={() => history.push(`/crm/customers/${selected.id}/edit`)}
          >
            编辑客户信息
          </Button>
        )}
        {selected && (
          <>
            <Typography.Title level={5} style={{ marginTop: 24 }}>
              客户跟踪记录
            </Typography.Title>
            <Descriptions size="small" column={1} bordered>
              <Descriptions.Item label="记录方式">
                按发生时间倒序排列；补充客户反馈、报价、承诺及下一步安排。
              </Descriptions.Item>
            </Descriptions>
            <List
              style={{ marginTop: 16 }}
              dataSource={followups}
              split={false}
              locale={{ emptyText: <Empty description="暂无客户跟踪记录" /> }}
              renderItem={(f) => (
                <List.Item style={{ padding: '0 0 12px' }}>
                  <Card
                    size="small"
                    style={{ width: '100%' }}
                    title={
                      <Space wrap size={[8, 4]}>
                        <Typography.Text strong>
                          {f.creatorName || '未知用户'}
                        </Typography.Text>
                        <Tag color="blue">
                          {{
                            VISIT: '拜访',
                            PHONE: '历史记录·电话',
                            WECHAT: '历史记录·微信',
                            ONLINE: '线上',
                            OTHER: '其他',
                          }[f.method] || f.method}
                        </Tag>
                      </Space>
                    }
                    extra={
                      <Typography.Text type="secondary">
                        {String(f.occurredAt || '')
                          .replace('T', ' ')
                          .slice(0, 16)}
                      </Typography.Text>
                    }
                  >
                    <Space
                      direction="vertical"
                      size={8}
                      style={{ width: '100%' }}
                    >
                      <FollowupField label="沟通内容" value={f.content} />
                      {f.customerFeedback && (
                        <FollowupField
                          label="客户反馈"
                          value={f.customerFeedback}
                        />
                      )}
                      {f.quoteSummary && (
                        <FollowupField
                          label="报价/预算"
                          value={`${f.quoteSummary}${
                            f.quoteAmount ? `（${f.quoteAmount}）` : ''
                          }`}
                        />
                      )}
                      {f.commitment && (
                        <FollowupField label="承诺事项" value={f.commitment} />
                      )}
                      {f.nextAction && (
                        <FollowupField
                          label="下一步安排"
                          value={`${f.nextAction}${
                            f.nextActionAt
                              ? ` · ${f.nextActionAt.replace('T', ' ')}`
                              : ''
                          }`}
                        />
                      )}
                      {f.attachments?.length > 0 && (
                        <div style={{ minWidth: 0 }}>
                          <Typography.Text type="secondary">
                            附件：
                          </Typography.Text>
                          <Space wrap size={[8, 4]}>
                            {f.attachments.map((a: any) => (
                              <Button
                                key={a.id}
                                type="link"
                                onClick={() =>
                                  downloadAttachment(a.id, a.fileName)
                                }
                                style={{
                                  height: 'auto',
                                  padding: 0,
                                  whiteSpace: 'normal',
                                  overflowWrap: 'anywhere',
                                  textAlign: 'left',
                                }}
                              >
                                {a.fileName}
                              </Button>
                            ))}
                          </Space>
                        </div>
                      )}
                    </Space>
                  </Card>
                </List.Item>
              )}
            />
            <Typography.Title level={5}>新增跟进</Typography.Title>
            <Form form={followForm} layout="vertical">
              <Form.Item name="method" label="跟进方式" initialValue="VISIT">
                <Select
                  options={[
                    ['VISIT', '拜访'],
                    ['ONLINE', '线上'],
                    ['OTHER', '其他'],
                  ].map(([value, label]) => ({ value, label }))}
                />
              </Form.Item>
              <Form.Item
                name="content"
                label="沟通内容"
                rules={[{ required: true, message: '请填写沟通内容' }]}
              >
                <Input.TextArea rows={3} />
              </Form.Item>
              <Form.Item name="customerFeedback" label="客户反馈">
                <Input.TextArea rows={2} />
              </Form.Item>
              <Form.Item name="quoteSummary" label="报价或预算">
                <Input />
              </Form.Item>
              <Form.Item name="commitment" label="双方承诺">
                <Input.TextArea rows={2} />
              </Form.Item>
              <Form.Item name="nextAction" label="下一步跟进动作">
                <Input />
              </Form.Item>
              <Form.Item name="nextActionAt" label="下一步跟进时间">
                <DatePicker showTime style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item label="附件（PDF/JPG/PNG，单个不超过20MB）">
                <Upload
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png"
                  fileList={followFiles}
                  beforeUpload={(file) => {
                    const acceptedTypes = [
                      'application/pdf',
                      'image/jpeg',
                      'image/png',
                    ];
                    if (!acceptedTypes.includes(file.type)) {
                      message.error('附件仅支持PDF、JPG和PNG');
                      return Upload.LIST_IGNORE;
                    }
                    if (file.size > 20 * 1024 * 1024) {
                      message.error('单个附件不能超过20MB');
                      return Upload.LIST_IGNORE;
                    }
                    return false;
                  }}
                  onChange={({ fileList }) => setFollowFiles(fileList)}
                >
                  <Button>选择附件</Button>
                </Upload>
              </Form.Item>
              <Button onClick={addFollow}>添加跟进记录</Button>
            </Form>
          </>
        )}
      </Drawer>
      <Modal
        title="客户分类管理"
        open={categoryManagerOpen}
        onCancel={() => setCategoryManagerOpen(false)}
        onOk={() => void addCategory()}
        okText="添加分类"
        cancelText="关闭"
      >
        <Form form={categoryForm} layout="vertical">
          <Form.Item
            name="categoryName"
            label="分类名称"
            rules={[
              { required: true, whitespace: true, message: '请输入分类名称' },
            ]}
          >
            <Input maxLength={100} placeholder="例如：重点客户" />
          </Form.Item>
          <Form.Item name="parentId" label="上级分类">
            <TreeSelect
              allowClear
              treeDefaultExpandAll
              treeData={buildCategoryTree(categories)}
              fieldNames={{
                label: 'title',
                value: 'value',
                children: 'children',
              }}
              placeholder="不选则创建一级分类"
            />
          </Form.Item>
        </Form>
        <Typography.Text type="secondary">
          选择已有分类作为上级，即可创建多级分类。
        </Typography.Text>
      </Modal>
    </PageContainer>
  );
}

function buildCategoryTree(categories: any[]): any[] {
  const nodes = new Map<number, any>();
  categories.forEach((category) =>
    nodes.set(Number(category.id), {
      title: category.categoryName,
      value: Number(category.id),
      key: Number(category.id),
      children: [],
    }),
  );
  const roots: any[] = [];
  categories.forEach((category) => {
    const node = nodes.get(Number(category.id));
    const parent =
      category.parentId == null
        ? undefined
        : nodes.get(Number(category.parentId));
    if (parent) parent.children.push(node);
    else roots.push(node);
  });
  const prune = (list: any[]) =>
    list.map((node) => ({
      ...node,
      children: node.children.length ? prune(node.children) : undefined,
    }));
  return prune(roots);
}

function flattenCategoryOptions(
  categories: any[],
): { label: string; value: number }[] {
  const children = new Map<number | null, any[]>();
  categories.forEach((item) => {
    const parentId = item.parentId == null ? null : Number(item.parentId);
    children.set(parentId, [...(children.get(parentId) || []), item]);
  });
  const options: { label: string; value: number }[] = [];
  const walk = (parentId: number | null, prefix: string) =>
    (children.get(parentId) || []).forEach((item) => {
      const label = prefix
        ? `${prefix} / ${item.categoryName}`
        : item.categoryName;
      options.push({ label, value: Number(item.id) });
      walk(Number(item.id), label);
    });
  walk(null, '');
  return options;
}

function FollowupField({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ minWidth: 0, width: '100%' }}>
      <Typography.Text type="secondary">{label}</Typography.Text>
      <Typography.Paragraph
        style={{
          marginBottom: 0,
          whiteSpace: 'pre-wrap',
          overflowWrap: 'anywhere',
          wordBreak: 'break-word',
        }}
      >
        {value}
      </Typography.Paragraph>
    </div>
  );
}
