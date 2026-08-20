import { object, string } from '../schema.js';

export const classIdParamsSchema = object({
  id: string({ required: true, max: 64, message: '班级 ID 不合法' }),
});

export const classRosterIdParamsSchema = object({
  id: string({ required: true, max: 64, message: '班级 ID 不合法' }),
  rosterId: string({ required: true, max: 64, message: '名单 ID 不合法' }),
});

export const classSearchQuerySchema = object({
  code: string({ required: true, max: 32, message: '班级号格式不正确' }),
});

export const createClassBodySchema = object({
  className: string({ required: true, min: 1, max: 50, message: '请输入班级名称' }),
  password: string({ required: true, min: 4, max: 32, message: '班级密码长度需在4到32位之间' }),
});

export const classPasswordBodySchema = object({
  password: string({ required: true, min: 4, max: 32, message: '班级密码长度需在4到32位之间' }),
});
