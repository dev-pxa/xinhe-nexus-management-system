import { Table, Tag, Typography } from 'antd';

const fieldLabel: Record<string, string> = {
  gender: '性别',
  birthDate: '出生日期',
  idType: '证件类型',
  idNumber: '证件号码',
  address: '居住地址',
  emergencyContactName: '紧急联系人',
  emergencyContactRelation: '联系人关系',
  emergencyContactPhone: '联系人电话',
  educations: '教育经历',
};
const enumLabels: Record<string, Record<string, string>> = {
  gender: { MALE: '男', FEMALE: '女', OTHER: '其他' },
  idType: { ID_CARD: '身份证', OTHER: '其他证件' },
  educationLevel: { HIGH_SCHOOL: '高中', SECONDARY: '中专', COLLEGE: '大专', BACHELOR: '本科', MASTER: '硕士', DOCTOR: '博士', OTHER: '其他' },
};

type Education = { startMonth?: string; endMonth?: string; educationLevel?: string; schoolName?: string };
type DiffRow = { key: string; label: string; before: unknown; after: unknown };

const parse = (value?: string | Record<string, unknown>) => {
  if (!value) return {} as Record<string, unknown>;
  if (typeof value !== 'string') return value;
  try { return JSON.parse(value) as Record<string, unknown>; } catch { return {}; }
};
const enumText = (field: string, value: unknown) => {
  if (value === null || value === undefined || value === '') return '未填写';
  return enumLabels[field]?.[String(value)] || '未知';
};
const formatEducation = (value: unknown) => {
  if (!Array.isArray(value) || value.length === 0) return '未填写';
  return <div>{(value as Education[]).map((item, index) => <div key={`${item.schoolName || 'education'}-${index}`}><Tag color="blue">{enumLabels.educationLevel[item.educationLevel || ''] || '其他学历'}</Tag><Typography.Text>{item.startMonth || '-'} 至 {item.endMonth || '-'} / {item.schoolName || '未填写'}</Typography.Text></div>)}</div>;
};
const formatValue = (field: string, value: unknown) => {
  if (field === 'educations') return formatEducation(value);
  if (field === 'birthDate' && typeof value === 'string') return value.slice(0, 10);
  if (field === 'gender' || field === 'idType') return enumText(field, value);
  if (field === 'idNumber' && typeof value === 'string') return value.includes('*') ? value : value.length <= 4 ? '****' : `${'*'.repeat(value.length - 4)}${value.slice(-4)}`;
  if (value === null || value === undefined || value === '') return '未填写';
  return String(value);
};
const hasContent = (value: unknown) => value !== null && value !== undefined && (!(typeof value === 'string') || value.trim() !== '');
const hasMeaningfulValue = (field: string, value: unknown) => {
  if (field !== 'educations') return hasContent(value);
  return Array.isArray(value) && value.some((item) => item && typeof item === 'object' && Object.values(item).some(hasContent));
};

export function ProfileChangeDiff({ beforeData, afterData }: { beforeData?: string | Record<string, unknown>; afterData?: string | Record<string, unknown> }) {
  const before = parse(beforeData);
  const after = parse(afterData);
  const keys = Object.keys(after).filter((key) => fieldLabel[key] && hasMeaningfulValue(key, after[key]) && JSON.stringify(before[key]) !== JSON.stringify(after[key]));
  const rows: DiffRow[] = keys.map((key) => ({ key, label: fieldLabel[key], before: before[key], after: after[key] }));
  return <Table<DiffRow> rowKey="key" size="small" pagination={false} locale={{ emptyText: '没有字段发生变化' }} dataSource={rows} columns={[{ title: '字段', dataIndex: 'label', width: 150 }, { title: '修改前', dataIndex: 'before', render: (_, row) => <span style={{ color: '#8c8c8c' }}>{formatValue(row.key, row.before)}</span> }, { title: '修改后', dataIndex: 'after', render: (_, row) => <Tag color="blue">{formatValue(row.key, row.after)}</Tag> }]} />;
}
