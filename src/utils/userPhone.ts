export const userPhoneRule = {
  transform: (value?: string) => value?.trim(),
  pattern: /^1[3-9][0-9]{9}$/,
  message: '请填写11位大陆手机号',
};
