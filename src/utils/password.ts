export const PASSWORD_REQUIREMENT =
  '密码长度不低于6位，只能包含大写字母、小写字母、数字和标点符号，且至少包含其中三种';

export function validatePassword(_: unknown, value?: string) {
  if (!value) return Promise.reject(new Error('请输入新密码'));
  if (value.length < 6 || value.length > 72) {
    return Promise.reject(new Error(PASSWORD_REQUIREMENT));
  }
  let categories = 0;
  if (/[A-Z]/.test(value)) categories += 1;
  if (/[a-z]/.test(value)) categories += 1;
  if (/[0-9]/.test(value)) categories += 1;
  if (/[^A-Za-z0-9]/.test(value)) categories += 1;
  if (!/^[\x21-\x7e]+$/.test(value) || categories < 3) {
    return Promise.reject(new Error(PASSWORD_REQUIREMENT));
  }
  return Promise.resolve();
}
