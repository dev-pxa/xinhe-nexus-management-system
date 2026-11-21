import {
  getCrmCustomer,
  listCrmCategories,
  listCrmEligibleUsers,
  saveCrmCustomer,
} from '@/services/crm';
import { PageContainer } from '@ant-design/pro-components';
import { history, useLocation, useModel, useParams } from '@umijs/max';
import {
  Button,
  Card,
  Form,
  Input,
  message,
  Select,
  Space,
  Spin,
  TreeSelect,
} from 'antd';
import { useEffect, useState } from 'react';
import styles from '../crmPlanMobile.less';

const sources = [
  '抖音',
  '小红书',
  '老客户推荐',
  '设计师推荐',
  '材料商推荐',
  '扫楼',
  '其他',
];

export default function CrmCustomerEditPage() {
  const { id } = useParams<{ id?: string }>();
  const location = useLocation();
  const { initialState } = useModel('@@initialState');
  const isNew = location.pathname.endsWith('/new');
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const canChangeOwner = Boolean(
    initialState?.currentUser?.roles?.includes('COMPANY_ADMIN') ||
      initialState?.currentUser?.permissions?.includes('*') ||
      initialState?.currentUser?.permissions?.includes(
        'crm:customer:owner:edit',
      ),
  );
  const canEditCollaborators = Boolean(
    initialState?.currentUser?.roles?.includes('COMPANY_ADMIN') ||
      initialState?.currentUser?.permissions?.includes('*') ||
      initialState?.currentUser?.permissions?.includes(
        'crm:customer:collaborator:edit',
      ),
  );

  useEffect(() => {
    let active = true;
    Promise.all([
      listCrmCategories(),
      listCrmEligibleUsers(),
      isNew ? Promise.resolve(undefined) : getCrmCustomer(Number(id)),
    ])
      .then(([categoryResponse, userResponse, customerResponse]) => {
        if (!active) return;
        const categoryRows = categoryResponse.data || [];
        const userRows = userResponse.data || [];
        setCategories(categoryRows);
        if (customerResponse?.data) {
          const customer = customerResponse.data;
          if (
            customer.ownerStatus === 'DEPARTED' &&
            !userRows.some((user: any) => user.id === customer.ownerUserId)
          ) {
            userRows.push({
              id: customer.ownerUserId,
              name: customer.ownerName,
              departed: true,
            });
          }
          setUsers(userRows);
          form.setFieldsValue(customer);
        } else {
          setUsers(userRows);
        }
      })
      .catch((error: any) => {
        message.error(error?.message || '客户信息加载失败');
        if (!isNew) history.replace('/crm/customers');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id, isNew, form]);

  const submit = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      await saveCrmCustomer(values, isNew ? undefined : Number(id));
      message.success(isNew ? '客户已新增' : '客户信息已保存');
      history.push('/crm/customers');
    } catch (error: any) {
      message.error(error?.message || '客户信息保存失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageContainer
      className={`${styles.page} ${styles.editorPage}`}
      title={isNew ? '新增客户' : '编辑客户'}
      content="维护客户基本信息、来源和分类。客户跟踪记录可在客户详情中查看和补充。"
      onBack={() => history.push('/crm/customers')}
      extra={
        <Space className={styles.pageActions}>
          <Button onClick={() => history.push('/crm/customers')}>取消</Button>
          <Button type="primary" loading={saving} onClick={() => void submit()}>
            保存
          </Button>
        </Space>
      }
    >
      <Spin spinning={loading}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <Card title="客户信息">
            <Form form={form} layout="vertical">
              {!isNew && (
                <Form.Item name="version" hidden>
                  <Input />
                </Form.Item>
              )}
              <Form.Item
                name="customerName"
                label="客户名称"
                rules={[
                  {
                    required: true,
                    whitespace: true,
                    message: '请输入客户名称',
                  },
                ]}
              >
                <Input maxLength={160} placeholder="请输入客户名称" />
              </Form.Item>
              <Form.Item
                name="phone"
                label="联系电话"
                rules={[
                  {
                    required: true,
                    whitespace: true,
                    message: '请输入联系电话',
                  },
                ]}
              >
                <Input maxLength={40} placeholder="请输入联系电话" />
              </Form.Item>
              <Form.Item
                name="address"
                label="详细地址"
                rules={[
                  {
                    required: true,
                    whitespace: true,
                    message: '请输入详细地址',
                  },
                ]}
              >
                <Input.TextArea rows={3} maxLength={500} />
              </Form.Item>
              <Form.Item
                name="source"
                label="来源渠道"
                rules={[{ required: true, message: '请选择来源渠道' }]}
              >
                <Select
                  allowClear
                  options={sources.map((value) => ({ value, label: value }))}
                  placeholder="请选择客户来源"
                />
              </Form.Item>
              <Form.Item
                name="categoryId"
                label="客户分类"
                rules={[{ required: true, message: '请选择客户分类' }]}
              >
                <TreeSelect
                  allowClear
                  treeDefaultExpandAll
                  treeData={buildCategoryTree(categories)}
                  fieldNames={{
                    label: 'title',
                    value: 'value',
                    children: 'children',
                  }}
                  placeholder="请选择客户分类"
                />
              </Form.Item>
              {!isNew && canChangeOwner && (
                <Form.Item
                  name="ownerUserId"
                  label="负责人"
                  rules={[{ required: true, message: '请选择负责人' }]}
                >
                  <Select
                    options={users.map((user: any) => ({
                      value: user.id,
                      label: user.departed
                        ? `${user.name}（已离职）`
                        : user.name,
                    }))}
                  />
                </Form.Item>
              )}
              {!isNew && !canChangeOwner && (
                <Form.Item label="负责人">
                  <Input
                    value={
                      users.find(
                        (user) => user.id === form.getFieldValue('ownerUserId'),
                      )?.name || '当前客户负责人'
                    }
                    disabled
                  />
                </Form.Item>
              )}
              {canEditCollaborators && (
                <Form.Item name="collaboratorUserIds" label="协作人">
                  <Select
                    mode="multiple"
                    allowClear
                    options={users
                      .filter((user) => !user.departed)
                      .map((user: any) => ({
                        value: user.id,
                        label: user.name,
                      }))}
                    placeholder="选择本公司 CRM 用户"
                  />
                </Form.Item>
              )}
              <Form.Item name="remark" label="备注">
                <Input.TextArea rows={4} maxLength={1000} showCount />
              </Form.Item>
            </Form>
          </Card>
        </div>
      </Spin>
      <div className={styles.mobileSaveBar}>
        <Button onClick={() => history.push('/crm/customers')}>取消</Button>
        <Button type="primary" loading={saving} onClick={() => void submit()}>
          保存客户
        </Button>
      </div>
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
  const prune = (list: any[]): any[] =>
    list.map((node) => ({
      ...node,
      children: node.children.length ? prune(node.children) : undefined,
    }));
  return prune(roots);
}
