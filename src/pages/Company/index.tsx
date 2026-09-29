import {
  createCompany,
  listCompanies,
  updateCompany,
} from '@/services/management';
import { PlusOutlined } from '@ant-design/icons';
import type { ProColumns } from '@ant-design/pro-components';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { Button, Form, Input, message, Modal, Select, Space, Tag } from 'antd';
import { useEffect, useState } from 'react';

export default function CompanyPage() {
  const [companies, setCompanies] = useState<ManagementAPI.Company[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ManagementAPI.Company>();
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  const reload = async () => {
    const response = await listCompanies();
    setCompanies(response.data || []);
  };

  useEffect(() => {
    reload();
  }, []);

  const submit = async () => {
    const values = await form.validateFields();
    setLoading(true);
    try {
      if (editing) {
        await updateCompany(editing.id, {
          ...values,
          version: editing.version,
        });
        message.success('公司信息已更新');
      } else {
        const response = await createCompany(values);
        const account = response.data;
        Modal.success({
          title: '公司创建成功',
          content: (
            <div>
              <p>管理员账号：{String(account.administratorUsername)}</p>
              <p>初始密码：{String(account.initialPassword)}</p>
              <p>初始密码仅在这里展示，请妥善保存并及时修改。</p>
            </div>
          ),
        });
      }
      setOpen(false);
      form.resetFields();
      setEditing(undefined);
      await reload();
    } finally {
      setLoading(false);
    }
  };

  const columns: ProColumns<ManagementAPI.Company>[] = [
    { title: '公司编号', dataIndex: 'companyCode', copyable: true },
    { title: '公司名称', dataIndex: 'companyName' },
    { title: '渠道层级', dataIndex: 'channelLevel', width: 100 },
    { title: '上级渠道公司', dataIndex: 'upstreamCompanyName' },
    { title: '联系人', dataIndex: 'contactName' },
    { title: '联系电话', dataIndex: 'contactPhone' },
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
            setEditing(row);
            form.setFieldsValue(row);
            setOpen(true);
          }}
        >
          编辑
        </a>,
      ],
    },
  ];

  return (
    <PageContainer
      title="公司管理"
      content="维护独立公司主体及最多四级的渠道协作关系。渠道关系不会产生跨公司数据权限。"
    >
      <ProTable
        rowKey="id"
        search={false}
        dataSource={companies}
        columns={columns}
        pagination={false}
        toolBarRender={() => [
          <Button
            key="create"
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditing(undefined);
              form.resetFields();
              form.setFieldValue('status', 'ENABLED');
              setOpen(true);
            }}
          >
            创建公司
          </Button>,
        ]}
      />
      <Modal
        title={editing ? '编辑公司' : '创建公司'}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={submit}
        confirmLoading={loading}
        destroyOnClose
      >
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item
            name="companyCode"
            label="公司编号"
            rules={[{ required: true }, { pattern: /^[A-Za-z0-9_-]{2,32}$/ }]}
          >
            <Input disabled={Boolean(editing)} placeholder="例如 SH001" />
          </Form.Item>
          <Form.Item
            name="companyName"
            label="公司名称"
            rules={[{ required: true }]}
          >
            <Input maxLength={128} />
          </Form.Item>
          {!editing && (
            <Form.Item name="upstreamCompanyId" label="上级渠道公司">
              <Select
                allowClear
                options={companies
                  .filter(
                    (item) =>
                      item.channelLevel < 4 && item.status === 'ENABLED',
                  )
                  .map((item) => ({ label: item.companyName, value: item.id }))}
              />
            </Form.Item>
          )}
          <Space size={16} style={{ display: 'flex' }}>
            <Form.Item name="contactName" label="联系人">
              <Input maxLength={64} />
            </Form.Item>
            <Form.Item name="contactPhone" label="联系电话">
              <Input maxLength={32} />
            </Form.Item>
          </Space>
          {editing && (
            <Form.Item name="status" label="状态" rules={[{ required: true }]}>
              <Select
                options={[
                  { label: '启用', value: 'ENABLED' },
                  { label: '停用', value: 'DISABLED' },
                ]}
              />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </PageContainer>
  );
}
