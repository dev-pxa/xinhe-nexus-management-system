import {
  createOrganization,
  createPosition,
  deleteOrganization,
  deletePosition,
  listCompanies,
  listOrganizations,
  listPositions,
  organizationDeleteImpact,
  positionDeleteImpact,
  updateOrganization,
  updatePosition,
} from '@/services/management';
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import type { ProColumns } from '@ant-design/pro-components';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { history, useModel } from '@umijs/max';
import {
  Button,
  Card,
  Col,
  Empty,
  Form,
  Input,
  message,
  Modal,
  Row,
  Select,
  Space,
  Tag,
  Tree,
  Typography,
} from 'antd';
import { useEffect, useMemo, useState } from 'react';

type TreeNode = {
  key: number;
  title: string;
  children?: TreeNode[];
};

const buildTree = (items: ManagementAPI.Organization[]) => {
  const nodes = new Map<number, TreeNode>();
  items.forEach((item) =>
    nodes.set(item.id, { key: item.id, title: item.orgName, children: [] }),
  );
  const roots: TreeNode[] = [];
  items.forEach((item) => {
    const node = nodes.get(item.id)!;
    if (item.parentId && nodes.has(item.parentId))
      nodes.get(item.parentId)!.children!.push(node);
    else roots.push(node);
  });
  return roots;
};

const validateContactPhone = (_: unknown, value?: string) => {
  const phone = value?.trim();
  if (!phone) return Promise.resolve();

  const digitCount = (phone.match(/\d/g) || []).length;
  let parenthesisBalance = 0;
  let validParentheses = true;
  for (const character of phone) {
    if (character === '(') {
      parenthesisBalance += 1;
      if (parenthesisBalance !== 1) validParentheses = false;
    } else if (character === ')') {
      parenthesisBalance -= 1;
      if (parenthesisBalance < 0) validParentheses = false;
    }
  }
  const plusIndex = phone.indexOf('+');
  const validPlus =
    plusIndex < 0 || (plusIndex === 0 && phone.lastIndexOf('+') === 0);
  const validBoundary = /^[+\d(]/.test(phone) && /[\d)]$/.test(phone);
  const valid =
    phone.length >= 5 &&
    phone.length <= 32 &&
    /^[0-9+()\- ]+$/.test(phone) &&
    digitCount >= 5 &&
    digitCount <= 20 &&
    validPlus &&
    validBoundary &&
    validParentheses &&
    parenthesisBalance === 0;

  return valid
    ? Promise.resolve()
    : Promise.reject(
        new Error('联系电话格式不正确，可填写国际号码、座机或手机号'),
      );
};

export default function OrganizationPage() {
  const { initialState } = useModel('@@initialState');
  const platform = initialState?.currentUser?.roles.includes('PLATFORM_ADMIN');
  const [companies, setCompanies] = useState<ManagementAPI.Company[]>([]);
  const [companyId, setCompanyId] = useState<number | undefined>(
    initialState?.currentUser?.companyId,
  );
  const [organizations, setOrganizations] = useState<
    ManagementAPI.Organization[]
  >([]);
  const [positions, setPositions] = useState<ManagementAPI.Position[]>([]);
  const [selectedId, setSelectedId] = useState<number>();
  const [orgOpen, setOrgOpen] = useState(false);
  const [positionOpen, setPositionOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<ManagementAPI.Organization>();
  const [editingPosition, setEditingPosition] =
    useState<ManagementAPI.Position>();
  const [orgForm] = Form.useForm();
  const [positionForm] = Form.useForm();

  const selectedOrg = organizations.find((item) => item.id === selectedId);
  const treeData = useMemo(() => buildTree(organizations), [organizations]);

  const reload = async (targetCompanyId = companyId) => {
    if (!targetCompanyId && platform) return;
    const orgResponse = await listOrganizations(
      platform ? targetCompanyId : undefined,
    );
    const nextOrganizations = orgResponse.data || [];
    setOrganizations(nextOrganizations);
    const nextSelected = nextOrganizations.some(
      (item) => item.id === selectedId,
    )
      ? selectedId
      : nextOrganizations[0]?.id;
    setSelectedId(nextSelected);
    const positionResponse = await listPositions(
      platform ? targetCompanyId : undefined,
      nextSelected,
    );
    setPositions(positionResponse.data || []);
  };

  useEffect(() => {
    if (platform) {
      listCompanies().then((response) => {
        const values = response.data || [];
        setCompanies(values);
        const first = values[0]?.id;
        setCompanyId(first);
        if (first) reload(first);
      });
    } else {
      reload();
    }
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setPositions([]);
      return;
    }
    listPositions(platform ? companyId : undefined, selectedId).then(
      (response) => setPositions(response.data || []),
    );
  }, [selectedId]);

  const openCreateOrg = () => {
    setEditingOrg(undefined);
    orgForm.resetFields();
    orgForm.setFieldsValue({ parentId: selectedId, status: 'ENABLED' });
    setOrgOpen(true);
  };

  const saveOrg = async () => {
    const values = await orgForm.validateFields();
    if (editingOrg) {
      await updateOrganization(editingOrg.id, {
        ...values,
        version: editingOrg.version,
      });
      message.success('组织已更新');
    } else {
      await createOrganization(platform ? companyId : undefined, values);
      message.success('组织已创建，编码由系统自动生成');
    }
    setOrgOpen(false);
    await reload();
  };

  const removeOrg = async () => {
    if (!selectedOrg) return;
    const response = await organizationDeleteImpact(selectedOrg.id);
    const impact = response.data;
    if (!impact.canDelete) {
      Modal.warning({
        title: '当前组织不能删除',
        content: `下级组织 ${impact.childOrganizations || 0} 个，岗位 ${
          impact.positions || 0
        } 个，在岗用户 ${impact.users || 0} 人。`,
      });
      return;
    }
    Modal.confirm({
      title: `确认删除“${selectedOrg.orgName}”？`,
      content: '删除后组织将进入历史状态，编码不会再次使用。',
      okText: '删除组织',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        await deleteOrganization(selectedOrg.id);
        message.success('组织已删除');
        await reload();
      },
    });
  };

  const savePosition = async () => {
    const values = await positionForm.validateFields();
    if (editingPosition) {
      await updatePosition(editingPosition.id, {
        ...values,
        version: editingPosition.version,
      });
      message.success('岗位已更新');
    } else {
      await createPosition(platform ? companyId : undefined, values);
      message.success('岗位已创建');
    }
    setPositionOpen(false);
    await reload();
  };

  const positionColumns: ProColumns<ManagementAPI.Position>[] = [
    { title: '岗位编码', dataIndex: 'positionCode', copyable: true },
    { title: '岗位名称', dataIndex: 'positionName' },
    { title: '在岗人数', dataIndex: 'userCount', width: 90 },
    { title: '权限数', dataIndex: 'permissionCount', width: 80 },
    {
      title: '状态',
      dataIndex: 'status',
      render: (_, row) => (
        <Tag color={row.status === 'ENABLED' ? 'success' : 'default'}>
          {row.status === 'ENABLED' ? '启用' : '停用'}
        </Tag>
      ),
    },
    {
      title: '操作',
      valueType: 'option',
      render: (_, row) => [
        <a
          key="edit"
          onClick={() => {
            setEditingPosition(row);
            positionForm.setFieldsValue(row);
            setPositionOpen(true);
          }}
        >
          编辑
        </a>,
        <a
          key="permission"
          onClick={() =>
            history.push(`/system/permissions?positionId=${row.id}`)
          }
        >
          配置权限
        </a>,
        <Button
          key="delete"
          type="link"
          danger
          size="small"
          style={{ padding: 0 }}
          onClick={async () => {
            const impact = (await positionDeleteImpact(row.id)).data;
            if (!impact.canDelete) {
              message.warning(`岗位仍有 ${impact.users} 名用户，不能删除`);
              return;
            }
            Modal.confirm({
              title: `确认删除岗位“${row.positionName}”？`,
              content: '删除后，该岗位将不再可用于组织和权限配置。',
              okText: '删除岗位',
              okType: 'danger',
              cancelText: '取消',
              onOk: async () => {
                await deletePosition(row.id);
                message.success('岗位已删除');
                await reload();
              },
            });
          }}
        >
          删除
        </Button>,
      ],
    },
  ];

  return (
    <PageContainer
      title="组织与岗位"
      content="组织编码和岗位编码由系统生成。岗位权限只控制功能，公司及组织数据边界由系统固定校验。"
      extra={
        platform ? (
          <Select
            value={companyId}
            style={{ width: 260 }}
            options={companies.map((item) => ({
              label: item.companyName,
              value: item.id,
            }))}
            onChange={(value) => {
              setCompanyId(value);
              setSelectedId(undefined);
              reload(value);
            }}
          />
        ) : null
      }
    >
      <Row gutter={16} align="stretch">
        <Col xs={24} lg={7}>
          <Card
            title="公司内部组织"
            extra={
              <Space>
                <Button
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={openCreateOrg}
                >
                  新建
                </Button>
                <Button
                  size="small"
                  icon={<EditOutlined />}
                  disabled={!selectedOrg}
                  onClick={() => {
                    setEditingOrg(selectedOrg);
                    orgForm.setFieldsValue(selectedOrg);
                    setOrgOpen(true);
                  }}
                />
                <Button
                  size="small"
                  type="link"
                  danger
                  icon={<DeleteOutlined />}
                  disabled={!selectedOrg || !selectedOrg.parentId}
                  onClick={removeOrg}
                >
                  删除
                </Button>
              </Space>
            }
          >
            {treeData.length ? (
              <Tree
                blockNode
                defaultExpandAll
                selectedKeys={selectedId ? [selectedId] : []}
                treeData={treeData}
                onSelect={(keys) => setSelectedId(keys[0] as number)}
              />
            ) : (
              <Empty description="暂无组织" />
            )}
          </Card>
        </Col>
        <Col xs={24} lg={17}>
          <Card>
            {selectedOrg && (
              <Space direction="vertical" size={2} style={{ marginBottom: 16 }}>
                <Typography.Title level={4} style={{ margin: 0 }}>
                  {selectedOrg.orgName}
                </Typography.Title>
                <Typography.Text type="secondary">
                  {selectedOrg.orgCode} ·{' '}
                  {selectedOrg.effectiveEnabled ? '实际启用' : '实际停用'}
                </Typography.Text>
              </Space>
            )}
            <ProTable
              rowKey="id"
              headerTitle="岗位列表"
              search={false}
              dataSource={positions}
              columns={positionColumns}
              pagination={false}
              toolBarRender={() => [
                <Button
                  key="create"
                  type="primary"
                  icon={<PlusOutlined />}
                  disabled={!selectedOrg}
                  onClick={() => {
                    setEditingPosition(undefined);
                    positionForm.resetFields();
                    positionForm.setFieldsValue({
                      orgUnitId: selectedId,
                      status: 'ENABLED',
                    });
                    setPositionOpen(true);
                  }}
                >
                  新建岗位
                </Button>,
              ]}
            />
          </Card>
        </Col>
      </Row>

      <Modal
        title={editingOrg ? '编辑组织' : '新建组织'}
        open={orgOpen}
        onCancel={() => setOrgOpen(false)}
        onOk={saveOrg}
        destroyOnClose
      >
        <Form form={orgForm} layout="vertical" preserve={false}>
          {editingOrg && (
            <Form.Item label="组织编码">
              <Input value={editingOrg.orgCode} disabled />
            </Form.Item>
          )}
          <Form.Item
            name="orgName"
            label="组织名称"
            rules={[{ required: true }]}
          >
            <Input maxLength={128} />
          </Form.Item>
          {editingOrg && (
            <Form.Item name="managerPositionId" label="负责人">
              <Select
                allowClear
                placeholder="请选择当前组织下的负责人岗位"
                options={positions
                  .filter(
                    (item) =>
                      item.status === 'ENABLED' ||
                      item.id === editingOrg.managerPositionId,
                  )
                  .map((item) => ({
                    label: `${item.positionName}（${item.positionCode}）`,
                    value: item.id,
                  }))}
              />
            </Form.Item>
          )}
          {editingOrg && !editingOrg.parentId ? (
            <Form.Item label="上级组织">
              <Input value="公司根组织（不可移动）" disabled />
            </Form.Item>
          ) : (
            <Form.Item
              name="parentId"
              label="上级组织"
              rules={[{ required: true }]}
            >
              <Select
                options={organizations
                  .filter(
                    (item) =>
                      item.id !== editingOrg?.id &&
                      !item.orgPath.startsWith(editingOrg?.orgPath || '---'),
                  )
                  .map((item) => ({ label: item.orgName, value: item.id }))}
              />
            </Form.Item>
          )}
          <Form.Item
            name="contactPhone"
            label="联系电话"
            rules={[{ validator: validateContactPhone }]}
          >
            <Input
              maxLength={32}
              inputMode="tel"
              placeholder="例如：+1 (415) 555-2671 或 010-88886666"
            />
          </Form.Item>
          <Form.Item name="description" label="说明">
            <Input.TextArea maxLength={500} rows={3} />
          </Form.Item>
          <Form.Item name="status" label="状态" rules={[{ required: true }]}>
            <Select
              options={[
                { label: '启用', value: 'ENABLED' },
                { label: '停用', value: 'DISABLED' },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={editingPosition ? '编辑岗位' : '新建岗位'}
        open={positionOpen}
        onCancel={() => setPositionOpen(false)}
        onOk={savePosition}
        destroyOnClose
      >
        <Form form={positionForm} layout="vertical" preserve={false}>
          {editingPosition && (
            <Form.Item label="岗位编码">
              <Input value={editingPosition.positionCode} disabled />
            </Form.Item>
          )}
          <Form.Item
            name="positionName"
            label="岗位名称"
            rules={[{ required: true }]}
          >
            <Input maxLength={128} />
          </Form.Item>
          <Form.Item
            name="orgUnitId"
            label="所属组织"
            rules={[{ required: true }]}
          >
            <Select
              options={organizations.map((item) => ({
                label: item.orgName,
                value: item.id,
              }))}
            />
          </Form.Item>
          <Form.Item name="responsibilities" label="岗位职责">
            <Input.TextArea maxLength={1000} rows={4} />
          </Form.Item>
          <Form.Item name="status" label="状态" rules={[{ required: true }]}>
            <Select
              options={[
                { label: '启用', value: 'ENABLED' },
                { label: '停用', value: 'DISABLED' },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
}
