import { getPublicOnboardingForm, submitPublicOnboardingForm, type EducationInput } from '@/services/onboarding';
import { PASSWORD_REQUIREMENT, validatePassword } from '@/utils/password';
import { history, useParams } from '@umijs/max';
import { Button, Card, DatePicker, Form, Input, message, Result, Select, Space, Typography } from 'antd';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';

const educationOptions = [{ label: '高中', value: 'HIGH_SCHOOL' }, { label: '中专', value: 'SECONDARY' }, { label: '大专', value: 'COLLEGE' }, { label: '本科', value: 'BACHELOR' }, { label: '硕士', value: 'MASTER' }, { label: '博士', value: 'DOCTOR' }, { label: '其他', value: 'OTHER' }];
const sortedEducations = (items: EducationInput[] = []) => [...items].sort((a, b) => `${b.startMonth}`.localeCompare(`${a.startMonth}`) || `${b.endMonth}`.localeCompare(`${a.endMonth}`));
const validateMobile = (_: unknown, value?: string) => !value || /^1[3-9]\d{9}$/.test(value) ? Promise.resolve() : Promise.reject(new Error('请填写11位大陆手机号'));
const validateIdNumber = (idType: string | undefined, value?: string) => {
  if (!value) return Promise.resolve();
  if (idType !== 'ID_CARD') return value.length >= 3 && value.length <= 32 ? Promise.resolve() : Promise.reject(new Error('证件号码长度必须为3-32位'));
  if (!/^[1-9]\d{5}(18|19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[0-9Xx]$/.test(value)) return Promise.reject(new Error('身份证号码格式不正确'));
  const weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
  const checks = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2'];
  const upper = value.toUpperCase();
  const sum = weights.reduce((total, weight, index) => total + Number(upper[index]) * weight, 0);
  return checks[sum % 11] === upper[17] ? Promise.resolve() : Promise.reject(new Error('身份证号码校验位不正确'));
};

export default function OnboardingPage() {
  const { token = '' } = useParams<{ token: string }>();
  const [info, setInfo] = useState<{ candidateName: string; companyName: string; departmentName: string; positionName: string; status?: string }>();
  const [submitted, setSubmitted] = useState(false);
  const [form] = Form.useForm();
  useEffect(() => { getPublicOnboardingForm(token).then((r) => { setInfo(r.data); if (r.data?.status === 'SUBMITTED') setSubmitted(true); }).catch(() => setSubmitted(true)); }, [token]);
  if (submitted) return <Result status="success" title="资料已提交" subTitle="该表单已锁定，无法再次编辑。" />;
  if (!info) return <Card loading style={{ maxWidth: 760, margin: '40px auto' }} />;
  const submit = async () => {
    const values = await form.validateFields();
    const education = sortedEducations((values.educations || []).filter((item: EducationInput) => item && (item.startMonth || item.endMonth || item.educationLevel || item.schoolName)).map((item: EducationInput) => ({ ...item, startMonth: item.startMonth ? dayjs(item.startMonth).format('YYYY-MM') : '', endMonth: item.endMonth ? dayjs(item.endMonth).format('YYYY-MM') : '' })));
    await submitPublicOnboardingForm(token, { ...values, birthDate: values.birthDate?.format('YYYY-MM-DD'), educations: education });
    setSubmitted(true); message.success('资料提交成功'); history.replace(`/onboarding/${token}`);
  };
  return <Card title="入职信息采集" style={{ maxWidth: 760, margin: '40px auto' }}><Typography.Paragraph>公司：{info.companyName}</Typography.Paragraph><Typography.Paragraph>姓名：{info.candidateName}　部门：{info.departmentName}　岗位：{info.positionName}</Typography.Paragraph><Typography.Paragraph type="secondary">除教育背景外，以下信息均为必填。提交后将自动创建系统账号并锁定资料，请确认填写准确。</Typography.Paragraph>
    <Form form={form} layout="vertical"><Form.Item name="gender" label="性别" rules={[{ required: true, message: '请选择性别' }]}><Select options={[{ label: '男', value: 'MALE' }, { label: '女', value: 'FEMALE' }, { label: '其他', value: 'OTHER' }]} /></Form.Item><Form.Item name="birthDate" label="出生日期" rules={[{ required: true, message: '请选择出生日期' }]}><DatePicker /></Form.Item><Form.Item name="idType" label="证件类型" rules={[{ required: true, message: '请选择证件类型' }]}><Select options={[{ label: '身份证', value: 'ID_CARD' }, { label: '其他', value: 'OTHER' }]} /></Form.Item><Form.Item dependencies={['idType']} name="idNumber" label="证件号码" rules={[{ required: true, message: '请输入证件号码' }, ({ getFieldValue }) => ({ validator: (_, value) => validateIdNumber(getFieldValue('idType'), value) })]}><Input /></Form.Item><Form.Item name="phone" label="手机号" rules={[{ required: true, message: '请输入手机号' }, { validator: validateMobile }]}><Input /></Form.Item><Form.Item name="email" label="邮箱" rules={[{ required: true, message: '请输入邮箱' }, { type: 'email', message: '邮箱格式不正确' }]}><Input /></Form.Item><Form.Item name="address" label="居住地址" rules={[{ required: true, message: '请输入居住地址' }]}><Input.TextArea /></Form.Item><Form.Item name="emergencyContactName" label="紧急联系人" rules={[{ required: true, message: '请输入紧急联系人' }]}><Input /></Form.Item><Form.Item name="emergencyContactRelation" label="紧急联系人关系" rules={[{ required: true, message: '请输入紧急联系人关系' }]}><Input /></Form.Item><Form.Item name="emergencyContactPhone" label="紧急联系人电话" rules={[{ required: true, message: '请输入紧急联系人电话' }, { validator: validateMobile }]}><Input /></Form.Item>
      <Card size="small" title="账号设置"><Form.Item name="username" label="登录用户名" rules={[{ required: true, message: '请输入用户名' }, { pattern: /^[A-Za-z][A-Za-z0-9_.-]{2,63}$/, message: '须以字母开头，长度为3-64位' }]}><Input /></Form.Item><Form.Item name="password" label="登录密码" rules={[{ required: true, message: '请输入登录密码' }, { validator: (_, value) => validatePassword(_, value) }]}><Input.Password placeholder={PASSWORD_REQUIREMENT} /></Form.Item><Form.Item dependencies={['password']} name="confirmPassword" label="确认密码" rules={[{ required: true, message: '请再次输入密码' }, ({ getFieldValue }) => ({ validator: (_, value) => value === getFieldValue('password') ? Promise.resolve() : Promise.reject(new Error('两次输入的密码不一致')) })]}><Input.Password /></Form.Item></Card>
      <Card size="small" title="教育背景" style={{ marginTop: 16 }}><Typography.Paragraph type="secondary">教育背景可以不填；如填写，请完整填写开始月份、结束月份、学历和院校。系统会按开始时间自动排序。</Typography.Paragraph><Form.List name="educations">{(fields, { add, remove }) => <><Space direction="vertical" style={{ width: '100%' }}>{fields.map(({ key, name, ...rest }) => <Space key={key} align="start"><Form.Item {...rest} name={[name, 'startMonth']} rules={[{ required: true, message: '请选择开始月份' }]}><DatePicker picker="month" placeholder="开始月份" /></Form.Item><Form.Item {...rest} name={[name, 'endMonth']} rules={[{ required: true, message: '请选择结束月份' }]}><DatePicker picker="month" placeholder="结束月份" /></Form.Item><Form.Item {...rest} name={[name, 'educationLevel']} rules={[{ required: true, message: '请选择学历' }]}><Select placeholder="学历" options={educationOptions} style={{ width: 120 }} /></Form.Item><Form.Item {...rest} name={[name, 'schoolName']} rules={[{ required: true, message: '请输入院校' }]}><Input placeholder="院校" /></Form.Item><Button type="link" danger onClick={() => remove(name)}>删除</Button></Space>)}</Space><Button type="dashed" block onClick={() => add()}>新增教育背景</Button></>}</Form.List></Card>
      <Button type="primary" block style={{ marginTop: 24 }} onClick={submit}>确认提交并锁定</Button>
    </Form></Card>;
}
