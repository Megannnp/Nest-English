import { object, passthrough, string } from '../schema.js';

const phonePattern = /^1[3-9]\d{9}$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const registerBodySchema = object({
  email: string({ required: true, max: 128, pattern: emailPattern, message: '邮箱格式不正确' }),
  phone: string({ max: 20, pattern: phonePattern, message: '手机号格式不正确' }),
  password: string({ required: true, min: 8, max: 128, message: '请填写密码' }),
  confirmPassword: string({ required: true, min: 8, max: 128, message: '请确认密码' }),
  role: string({ required: true, enum: ['student', 'teacher', 'parent'], message: '身份无效' }),
  realName: string({ required: true, min: 2, max: 30, message: '姓名长度需在2到30个字符之间' }),
  preferences: passthrough({ defaultValue: null }),
});

export const loginBodySchema = object({
  account: string({ required: true, max: 128, message: '请填写账号和密码' }),
  password: string({ required: true, max: 128, message: '请填写账号和密码' }),
});

export const forgotPasswordBodySchema = object({
  account: string({ required: true, max: 128, message: '请填写账号' }),
  type: string({ required: true, enum: ['email', 'phone'], message: '找回方式无效' }),
});

export const resetPasswordBodySchema = object({
  account: string({ required: true, max: 128, message: '请填写完整信息' }),
  type: string({ required: true, enum: ['email', 'phone'], message: '重置方式无效' }),
  code: string({ required: true, max: 16, message: '请填写完整信息' }),
  newPassword: string({ required: true, min: 8, max: 128, message: '请填写完整信息' }),
});

export const sendEmailLoginCodeBodySchema = object({
  email: string({ required: true, max: 128, message: '请填写邮箱' }),
});

export const emailCodeAuthBodySchema = object({
  email: string({ required: true, max: 128, message: '请填写邮箱' }),
  code: string({ required: true, max: 16, message: '请填写验证码' }),
  realName: string({ max: 30 }),
  role: string({ enum: ['student'] }),
  preferences: passthrough({ defaultValue: null }),
});

export const sendPhoneCodeBodySchema = object({
  phone: string({ required: true, max: 20, message: '请填写手机号' }),
});

export const phoneCodeAuthBodySchema = object({
  phone: string({ required: true, max: 20, message: '请填写手机号' }),
  code: string({ required: true, max: 16, message: '请填写验证码' }),
  realName: string({ max: 30 }),
  role: string({ enum: ['student'] }),
});
