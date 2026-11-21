import {
  getPositionPermissions,
  getUserPermissions,
  listCompanies,
  listPermissions,
  listPositions,
  listUsers,
  setPositionPermissions,
  setUserPermissions,
} from '@/services/management';
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
  InfoCircleOutlined,
  SaveOutlined,
  SearchOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { history, useModel } from '@umijs/max';
import {
  Alert,
  Badge,
  Button,
  Card,
  Checkbox,
  Col,
  Empty,
  Input,
  List,
  message,
  Modal,
  Row,
  Segmented,
  Select,
  Space,
  Spin,
  Tag,
  Typography,
} from 'antd';
import { useEffect, useMemo, useState } from 'react';
import styles from '../systemMobile.less';

type PermissionGroup = {
  key: string;
  label: string;
  moduleCode: string;
  codes: string[];
};

const moduleLabels: Record<string, string> = {
  OA: '办公协同',
  CRM: '客户销售',
  ERP: 'ERP 进销存',
};

const permissionGroups: PermissionGroup[] = [
  {
    key: 'hr-profile',
    label: '人员档案',
    moduleCode: 'OA',
    codes: ['hr:profile:approve'],
  },
  {
    key: 'expense',
    label: '报销',
    moduleCode: 'OA',
    codes: ['oa:expense:approve'],
  },
  {
    key: 'customers',
    label: '客户管理',
    moduleCode: 'CRM',
    codes: ['crm:customer:view', 'crm:customer:create', 'crm:customer:edit'],
  },
  {
    key: 'plans',
    label: '计划管理（每日 / 每周）',
    moduleCode: 'CRM',
    codes: [
      'crm:plan:view',
      'crm:plan:create',
      'crm:plan:edit',
      'crm:plan:delete',
    ],
  },
  {
    key: 'crm-orders',
    label: '销售订单',
    moduleCode: 'CRM',
    codes: [
      'crm:sales-order:view',
      'crm:sales-order:create',
      'crm:sales-order:edit',
      'crm:sales-order:withdraw',
      'crm:sales-order:approve',
    ],
  },
  {
    key: 'erp-products',
    label: '商品资料',
    moduleCode: 'ERP',
    codes: [
      'erp:product:view',
      'erp:product:create',
      'erp:product:edit',
      'erp:product:status',
    ],
  },
  {
    key: 'erp-orders',
    label: '销售订单履约',
    moduleCode: 'ERP',
    codes: [
      'erp:sales-order:view',
      'erp:sales-order:create',
      'erp:sales-order:approve',
      'erp:sales-dispatch:confirm',
      'erp:sales-order:sign',
      'erp:sales-order:complete',
    ],
  },
  {
    key: 'erp-warehouses',
    label: '仓库管理',
    moduleCode: 'ERP',
    codes: ['erp:warehouse:view', 'erp:warehouse:edit'],
  },
  {
    key: 'erp-inventory',
    label: '库存管理',
    moduleCode: 'ERP',
    codes: ['erp:inventory:view', 'erp:inventory:adjust'],
  },
  {
    key: 'erp-returns',
    label: '销售退货',
    moduleCode: 'ERP',
    codes: [
      'erp:sales-return:view',
      'erp:sales-return:create',
      'erp:sales-return:approve',
      'erp:sales-return:receive',
    ],
  },
  {
    key: 'erp-reports',
    label: '销售统计',
    moduleCode: 'ERP',
    codes: ['erp:sales-report:view'],
  },
];

const actionLabels: Record<string, string> = {
  view: '查看',
  create: '新增',
  edit: '编辑',
  delete: '删除',
  approve: '审核',
  status: '启停',
  confirm: '确认发货',
  sign: '确认签收',
  complete: '完成',
  adjust: '调整',
  receive: '收货入库',
};

const displayPermissionName = (
  permission: ManagementAPI.Permission,
  group?: PermissionGroup,
) => {
  const known: Record<string, string> = {
    'hr:profile:approve': '人员档案审批',
    'oa:expense:approve': '报销最终审批',
    'crm:customer:view': '查看客户',
    'crm:customer:create': '新增客户',
    'crm:customer:edit': '编辑客户',
    'crm:plan:view': '查看计划',
    'crm:plan:create': '新增计划',
    'crm:plan:edit': '编辑计划',
    'crm:plan:delete': '删除计划',
    'crm:sales-order:view': '查看销售订单',
    'crm:sales-order:create': '新增销售订单',
    'crm:sales-order:edit': '编辑销售订单',
    'crm:sales-order:withdraw': '撤回销售订单',
    'crm:sales-order:approve': '审核销售订单',
  };
  if (known[permission.permissionCode]) return known[permission.permissionCode];
  const action = permission.permissionCode.split(':').pop() || '';
  return `${actionLabels[action] || '使用'}${
    group?.label || permission.permissionName
  }`;
};

const configurableCodeSet = new Set(
  permissionGroups.flatMap((group) => group.codes),
);
const groupForPermission = (permission: ManagementAPI.Permission) =>
  permissionGroups.find((group) =>
    group.codes.includes(permission.permissionCode),
  );

export default function PermissionConfigPage() {
  const { initialState } = useModel('@@initialState');
  const platform = initialState?.currentUser?.roles.includes('PLATFORM_ADMIN');
  const [companies, setCompanies] = useState<ManagementAPI.Company[]>([]);
  const [companyId, setCompanyId] = useState<number | undefined>(
    initialState?.currentUser?.companyId,
  );
  const [positions, setPositions] = useState<ManagementAPI.Position[]>([]);
  const [users, setUsers] = useState<ManagementAPI.User[]>([]);
  const [permissions, setPermissions] = useState<ManagementAPI.Permission[]>(
    [],
  );
  const [selectedPositionId, setSelectedPositionId] = useState<number>();
  const [selectedUserId, setSelectedUserId] = useState<number>();
  const [targetMode, setTargetMode] = useState<'POSITION' | 'USER'>('POSITION');
  const [inheritedPermissions, setInheritedPermissions] = useState<number[]>(
    [],
  );
  const [checkedPermissions, setCheckedPermissions] = useState<number[]>([]);
  const [permissionsToRemove, setPermissionsToRemove] = useState<number[]>([]);
  const [search, setSearch] = useState('');
  const [moduleCode, setModuleCode] = useState('ALL');
  const [onlySelected, setOnlySelected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mobileStep, setMobileStep] = useState<'TARGET' | 'CONFIG'>('TARGET');

  const configurablePermissions = useMemo(
    () =>
      permissions.filter((item) =>
        configurableCodeSet.has(item.permissionCode),
      ),
    [permissions],
  );
  const configurableIds = useMemo(
    () => new Set(configurablePermissions.map((item) => item.id)),
    [configurablePermissions],
  );
  const visiblePermissions = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return configurablePermissions.filter((item) => {
      const group = groupForPermission(item);
      if (!group || (moduleCode !== 'ALL' && group.moduleCode !== moduleCode))
        return false;
      if (onlySelected && !checkedPermissions.includes(item.id)) return false;
      if (!keyword) return true;
      return `${displayPermissionName(item, group)} ${item.permissionName} ${
        group.label
      }`
        .toLowerCase()
        .includes(keyword);
    });
  }, [
    checkedPermissions,
    configurablePermissions,
    moduleCode,
    onlySelected,
    search,
  ]);
  const selectedConfigurablePermissions = configurablePermissions.filter(
    (item) => checkedPermissions.includes(item.id),
  );
  const filteredGroups = permissionGroups.filter((group) =>
    visiblePermissions.some((item) =>
      group.codes.includes(item.permissionCode),
    ),
  );

  const loadPositionPermissions = async (positionId: number) => {
    const response = await getPositionPermissions(positionId);
    setInheritedPermissions([]);
    setCheckedPermissions(response.data || []);
  };

  const loadUserPermissions = async (userId: number) => {
    const response = await getUserPermissions(userId);
    setInheritedPermissions(response.data?.positionPermissionIds || []);
    setCheckedPermissions(response.data?.effectivePermissionIds || []);
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const catalogResponse = await listPermissions();
        setPermissions(catalogResponse.data || []);
        if (platform) {
          const companyResponse = await listCompanies();
          const values = companyResponse.data || [];
          setCompanies(values);
          const nextCompanyId = companyId || values[0]?.id;
          setCompanyId(nextCompanyId);
          if (nextCompanyId) {
            const [positionResponse, userResponse] = await Promise.all([
              listPositions(nextCompanyId),
              listUsers(nextCompanyId),
            ]);
            const nextPositions = positionResponse.data || [];
            setPositions(nextPositions);
            setUsers(
              (userResponse.data || []).filter((item) => !item.companyAdmin),
            );
            const requestedPositionId = Number(
              new URLSearchParams(window.location.search).get('positionId'),
            );
            const nextPositionId = nextPositions.some(
              (item) => item.id === requestedPositionId,
            )
              ? requestedPositionId
              : nextPositions[0]?.id;
            setSelectedPositionId(nextPositionId);
            if (nextPositionId) await loadPositionPermissions(nextPositionId);
          }
        } else {
          const [positionResponse, userResponse] = await Promise.all([
            listPositions(),
            listUsers(),
          ]);
          const nextPositions = positionResponse.data || [];
          setPositions(nextPositions);
          setUsers(
            (userResponse.data || []).filter((item) => !item.companyAdmin),
          );
          const requestedPositionId = Number(
            new URLSearchParams(window.location.search).get('positionId'),
          );
          const nextPositionId = nextPositions.some(
            (item) => item.id === requestedPositionId,
          )
            ? requestedPositionId
            : nextPositions[0]?.id;
          setSelectedPositionId(nextPositionId);
          if (nextPositionId) await loadPositionPermissions(nextPositionId);
        }
      } finally {
        setLoading(false);
      }
    };
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const changeCompany = async (nextCompanyId: number) => {
    setCompanyId(nextCompanyId);
    setLoading(true);
    try {
      const [positionResponse, userResponse] = await Promise.all([
        listPositions(nextCompanyId),
        listUsers(nextCompanyId),
      ]);
      const nextPositions = positionResponse.data || [];
      const nextUsers = (userResponse.data || []).filter(
        (item) => !item.companyAdmin,
      );
      setPositions(nextPositions);
      setUsers(nextUsers);
      const nextPositionId = nextPositions[0]?.id;
      const nextUserId = nextUsers[0]?.id;
      setSelectedPositionId(nextPositionId);
      setSelectedUserId(nextUserId);
      if (targetMode === 'USER' && nextUserId)
        await loadUserPermissions(nextUserId);
      else if (targetMode === 'POSITION' && nextPositionId)
        await loadPositionPermissions(nextPositionId);
      else {
        setCheckedPermissions([]);
        setInheritedPermissions([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const changePosition = async (positionId: number) => {
    setSelectedPositionId(positionId);
    setPermissionsToRemove([]);
    setLoading(true);
    try {
      await loadPositionPermissions(positionId);
    } finally {
      setLoading(false);
    }
  };

  const changeUser = async (userId: number) => {
    setSelectedUserId(userId);
    setPermissionsToRemove([]);
    setLoading(true);
    try {
      await loadUserPermissions(userId);
    } finally {
      setLoading(false);
    }
  };

  const changeTargetMode = async (mode: 'POSITION' | 'USER') => {
    setTargetMode(mode);
    setPermissionsToRemove([]);
    setLoading(true);
    try {
      if (mode === 'USER') {
        const nextUserId = selectedUserId || users[0]?.id;
        setSelectedUserId(nextUserId);
        if (nextUserId) await loadUserPermissions(nextUserId);
        else {
          setCheckedPermissions([]);
          setInheritedPermissions([]);
        }
      } else {
        const nextPositionId = selectedPositionId || positions[0]?.id;
        setSelectedPositionId(nextPositionId);
        if (nextPositionId) await loadPositionPermissions(nextPositionId);
        else setCheckedPermissions([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const updateSelection = (permissionIds: number[], checked: boolean) => {
    setCheckedPermissions((current) =>
      checked
        ? [...new Set([...current, ...permissionIds])]
        : current.filter(
            (id) =>
              !permissionIds.includes(id) || inheritedPermissions.includes(id),
          ),
    );
  };

  const save = async () => {
    if (targetMode === 'POSITION' && !selectedPositionId) return;
    if (targetMode === 'USER' && !selectedUserId) return;
    setSaving(true);
    try {
      const preservedIds = checkedPermissions.filter(
        (id) => !configurableIds.has(id),
      );
      if (targetMode === 'USER' && selectedUserId) {
        await setUserPermissions(
          selectedUserId,
          selectedConfigurablePermissions
            .map((item) => item.id)
            .filter((id) => !inheritedPermissions.includes(id)),
        );
        message.success('用户额外权限已保存');
        await loadUserPermissions(selectedUserId);
      } else if (selectedPositionId) {
        await setPositionPermissions(selectedPositionId, [
          ...new Set([
            ...preservedIds,
            ...selectedConfigurablePermissions.map((item) => item.id),
          ]),
        ]);
        message.success('岗位权限已保存');
        await loadPositionPermissions(selectedPositionId);
      }
      setPermissionsToRemove([]);
    } finally {
      setSaving(false);
    }
  };

  const selectedPosition = positions.find(
    (item) => item.id === selectedPositionId,
  );
  const selectedUser = users.find((item) => item.id === selectedUserId);
  const permissionTargets =
    targetMode === 'USER'
      ? users.map((user) => ({
          id: user.id,
          title: user.displayName,
          description: `${user.positionName || '未分配岗位'} · ${
            user.username
          }`,
        }))
      : positions.map((position) => ({
          id: position.id,
          title: position.positionName,
          description: `${position.orgName} · 已配置 ${position.permissionCount} 项`,
        }));
  const selectAllVisible = (checked: boolean) =>
    updateSelection(
      visiblePermissions.map((item) => item.id),
      checked,
    );
  const removeSelectedPermissions = () => {
    if (!permissionsToRemove.length) return;
    Modal.confirm({
      title: `确认删除 ${permissionsToRemove.length} 项已选权限？`,
      content: '删除后需要点击“保存权限”才会正式生效，确认继续吗？',
      okText: '确认删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => {
        updateSelection(permissionsToRemove, false);
        setPermissionsToRemove([]);
      },
    });
  };

  return (
    <PageContainer
      className={`${styles.page} ${styles.permissionPage}`}
      title="权限配置"
      content="岗位提供基础权限，用户只能增减岗位之外的额外权限。"
      extra={
        <Space>
          {platform && (
            <Select
              value={companyId}
              style={{ width: 220 }}
              placeholder="选择公司"
              options={companies.map((item) => ({
                label: item.companyName,
                value: item.id,
              }))}
              onChange={(value) => void changeCompany(value)}
            />
          )}
          <Button
            className={styles.desktopOnly}
            icon={<SettingOutlined />}
            onClick={() => history.push('/system/organization')}
          >
            返回组织与岗位
          </Button>
        </Space>
      }
    >
      <Segmented
        value={targetMode}
        options={[
          { label: '岗位权限配置', value: 'POSITION' },
          { label: '用户权限配置', value: 'USER' },
        ]}
        onChange={(value) => {
          setMobileStep('TARGET');
          void changeTargetMode(value as 'POSITION' | 'USER');
        }}
        style={{ marginBottom: 16 }}
      />
      <Alert
        type="info"
        showIcon
        icon={<InfoCircleOutlined />}
        message={targetMode === 'USER' ? '用户权限说明' : '内置权限说明'}
        description={
          targetMode === 'USER'
            ? '标记为“岗位权限”的项已默认选中且不可删除；授予“报销最终审批”后，该用户可以处理本公司的报销终审。'
            : '直属部门负责人按组织配置自动初审；“报销最终审批”可授予财务等岗位，公司管理员默认拥有终审资格。'
        }
        style={{ marginBottom: 16 }}
      />
      <Row className={styles.permissionLayout} gutter={16} align="stretch">
        <Col xs={24} lg={6}>
          <Card
            className={`${styles.permissionTargetCard} ${
              mobileStep === 'TARGET' ? styles.mobileStepActive : ''
            }`}
            title={targetMode === 'USER' ? '用户列表' : '岗位列表'}
            bodyStyle={{ padding: 8 }}
          >
            {permissionTargets.length ? (
              <List
                dataSource={permissionTargets}
                renderItem={(target) => (
                  <List.Item
                    onClick={() => {
                      if (targetMode === 'USER') void changeUser(target.id);
                      else void changePosition(target.id);
                      setMobileStep('CONFIG');
                    }}
                    style={{
                      cursor: 'pointer',
                      padding: '12px 10px',
                      borderRadius: 6,
                      background:
                        target.id ===
                        (targetMode === 'USER'
                          ? selectedUserId
                          : selectedPositionId)
                          ? '#e6f4ff'
                          : undefined,
                    }}
                  >
                    <List.Item.Meta
                      title={target.title}
                      description={target.description}
                    />
                  </List.Item>
                )}
              />
            ) : (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  targetMode === 'USER' ? '暂无可配置用户' : '暂无岗位'
                }
              />
            )}
          </Card>
        </Col>
        <Col xs={24} lg={18}>
          <Card
            className={`${styles.permissionConfigCard} ${
              mobileStep === 'CONFIG' ? styles.mobileStepActive : ''
            }`}
            title={
              <Space>
                <Button
                  className={styles.mobilePermissionBack}
                  type="text"
                  icon={<ArrowLeftOutlined />}
                  aria-label="返回选择配置对象"
                  onClick={() => setMobileStep('TARGET')}
                />
                <Typography.Text strong>
                  {targetMode === 'USER'
                    ? selectedUser?.displayName || '请选择用户'
                    : selectedPosition?.positionName || '请选择岗位'}
                </Typography.Text>
                <Tag color="blue">
                  已选 {selectedConfigurablePermissions.length} 项
                </Tag>
              </Space>
            }
            extra={
              <Button
                className={styles.mobilePermissionSave}
                type="primary"
                icon={<SaveOutlined />}
                loading={saving}
                disabled={
                  targetMode === 'USER' ? !selectedUserId : !selectedPositionId
                }
                onClick={() => void save()}
              >
                保存权限
              </Button>
            }
          >
            <Space
              className={styles.permissionFilters}
              wrap
              style={{ width: '100%', marginBottom: 16 }}
            >
              <Input
                allowClear
                prefix={<SearchOutlined />}
                placeholder="搜索权限名称"
                style={{ width: 260 }}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <Select
                value={moduleCode}
                style={{ width: 150 }}
                options={[
                  { label: '全部模块', value: 'ALL' },
                  ...Object.entries(moduleLabels).map(([value, label]) => ({
                    value,
                    label,
                  })),
                ]}
                onChange={setModuleCode}
              />
              <Checkbox
                checked={onlySelected}
                onChange={(event) => setOnlySelected(event.target.checked)}
              >
                仅看已选
              </Checkbox>
              <Button
                onClick={() => selectAllVisible(true)}
                disabled={!visiblePermissions.length}
              >
                全选当前结果
              </Button>
              <Button
                danger
                onClick={() => selectAllVisible(false)}
                disabled={!visiblePermissions.length}
              >
                清空当前结果
              </Button>
            </Space>
            <Row gutter={16}>
              <Col xs={24} xl={15}>
                {loading ? (
                  <div style={{ padding: 48, textAlign: 'center' }}>
                    <Spin />
                  </div>
                ) : filteredGroups.length ? (
                  filteredGroups.map((group) => {
                    const groupPermissions = visiblePermissions.filter((item) =>
                      group.codes.includes(item.permissionCode),
                    );
                    const groupIds = groupPermissions.map((item) => item.id);
                    const selectedCount = groupIds.filter((id) =>
                      checkedPermissions.includes(id),
                    ).length;
                    return (
                      <Card
                        key={group.key}
                        size="small"
                        title={
                          <Space>
                            <Checkbox
                              checked={
                                groupIds.length > 0 &&
                                selectedCount === groupIds.length
                              }
                              indeterminate={
                                selectedCount > 0 &&
                                selectedCount < groupIds.length
                              }
                              onChange={(event) =>
                                updateSelection(groupIds, event.target.checked)
                              }
                            />
                            <Typography.Text strong>
                              {group.label}
                            </Typography.Text>
                            <Typography.Text type="secondary">
                              {selectedCount} / {groupIds.length}
                            </Typography.Text>
                          </Space>
                        }
                        style={{ marginBottom: 12 }}
                      >
                        <Row gutter={[8, 8]}>
                          {groupPermissions.map((permission) => (
                            <Col xs={24} md={12} key={permission.id}>
                              <Checkbox
                                checked={checkedPermissions.includes(
                                  permission.id,
                                )}
                                disabled={inheritedPermissions.includes(
                                  permission.id,
                                )}
                                onChange={(event) =>
                                  updateSelection(
                                    [permission.id],
                                    event.target.checked,
                                  )
                                }
                              >
                                {displayPermissionName(permission, group)}
                                {inheritedPermissions.includes(
                                  permission.id,
                                ) && (
                                  <Tag color="blue" style={{ marginLeft: 8 }}>
                                    岗位权限
                                  </Tag>
                                )}
                              </Checkbox>
                            </Col>
                          ))}
                        </Row>
                      </Card>
                    );
                  })
                ) : (
                  <Empty description="没有匹配的可配置权限" />
                )}
              </Col>
              <Col xs={24} xl={9}>
                <Card
                  size="small"
                  title={
                    <Space>
                      <CheckCircleOutlined />
                      已选权限
                    </Space>
                  }
                  extra={
                    <Button
                      danger
                      size="small"
                      disabled={!permissionsToRemove.length}
                      onClick={removeSelectedPermissions}
                    >
                      删除已选
                      {permissionsToRemove.length
                        ? ` (${permissionsToRemove.length})`
                        : ''}
                    </Button>
                  }
                  bodyStyle={{ maxHeight: 560, overflowY: 'auto' }}
                >
                  {selectedConfigurablePermissions.length ? (
                    <List
                      size="small"
                      dataSource={selectedConfigurablePermissions}
                      renderItem={(permission) => {
                        const group = groupForPermission(permission);
                        return (
                          <List.Item
                            style={{ width: '100%', alignItems: 'flex-start' }}
                            actions={
                              inheritedPermissions.includes(permission.id)
                                ? []
                                : [
                                    <Button
                                      key="remove"
                                      type="text"
                                      size="small"
                                      icon={<DeleteOutlined />}
                                      aria-label={`移除${displayPermissionName(
                                        permission,
                                        group,
                                      )}`}
                                      onClick={() => {
                                        setPermissionsToRemove([permission.id]);
                                        Modal.confirm({
                                          title: `确认删除“${displayPermissionName(
                                            permission,
                                            group,
                                          )}”？`,
                                          content:
                                            '删除后需要点击“保存权限”才会正式生效。',
                                          okText: '确认删除',
                                          okType: 'danger',
                                          cancelText: '取消',
                                          onOk: () => {
                                            updateSelection(
                                              [permission.id],
                                              false,
                                            );
                                            setPermissionsToRemove([]);
                                          },
                                          onCancel: () =>
                                            setPermissionsToRemove([]),
                                        });
                                      }}
                                    />,
                                  ]
                            }
                          >
                            <div
                              style={{
                                display: 'flex',
                                flex: 1,
                                minWidth: 0,
                                alignItems: 'flex-start',
                              }}
                            >
                              <Checkbox
                                style={{
                                  flex: 'none',
                                  marginTop: 4,
                                  marginRight: 8,
                                }}
                                checked={permissionsToRemove.includes(
                                  permission.id,
                                )}
                                disabled={inheritedPermissions.includes(
                                  permission.id,
                                )}
                                aria-label={`选择删除${displayPermissionName(
                                  permission,
                                  group,
                                )}`}
                                onChange={(event) => {
                                  setPermissionsToRemove((current) =>
                                    event.target.checked
                                      ? [...current, permission.id]
                                      : current.filter(
                                          (id) => id !== permission.id,
                                        ),
                                  );
                                }}
                              />
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <List.Item.Meta
                                  title={displayPermissionName(
                                    permission,
                                    group,
                                  )}
                                  description={`${
                                    moduleLabels[group?.moduleCode || ''] ||
                                    '业务功能'
                                  } · ${group?.label || '其他'} · ${
                                    inheritedPermissions.includes(permission.id)
                                      ? '岗位权限'
                                      : targetMode === 'USER'
                                      ? '用户额外权限'
                                      : '岗位权限'
                                  }`}
                                />
                              </div>
                            </div>
                          </List.Item>
                        );
                      }}
                    />
                  ) : (
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description="暂未选择权限"
                    />
                  )}
                </Card>
              </Col>
            </Row>
            <Space style={{ marginTop: 16 }}>
              <Badge
                status="processing"
                text={`当前结果 ${visiblePermissions.length} 项`}
              />
              <Typography.Text type="secondary">
                模块全选会作用于当前筛选结果。
              </Typography.Text>
            </Space>
          </Card>
        </Col>
      </Row>
    </PageContainer>
  );
}
