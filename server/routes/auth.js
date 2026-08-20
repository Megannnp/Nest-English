import { Router } from 'express';

import { requireAuth } from '../middleware/authMiddleware.js';
import { validateRequest } from '../middleware/validate.js';
import {
  getCurrentUser,
  emailCodeAuth,
  loginUser,
  phoneCodeAuth,
  registerUser,
  requestPasswordReset,
  resetPassword,
  sendEmailLoginCode,
  sendPhoneCode,
  TOKEN_MAX_AGE_SECONDS,
} from '../services/authService.js';
import { clearAuthCookies, setAuthCookies, setCsrfCookie } from '../utils/authCookies.js';
import {
  emailCodeAuthBodySchema,
  forgotPasswordBodySchema,
  loginBodySchema,
  phoneCodeAuthBodySchema,
  registerBodySchema,
  resetPasswordBodySchema,
  sendEmailLoginCodeBodySchema,
  sendPhoneCodeBodySchema,
} from '../utils/schemas/authSchemas.js';

const router = Router();

router.post('/register', validateRequest({ body: registerBodySchema }), async (req, res, next) => {
  try {
    const data = await registerUser(req.validated.body);
    setAuthCookies(res, data.token, TOKEN_MAX_AGE_SECONDS);
    res.status(201).json({ code: 201, msg: '注册成功', data });
  } catch (err) {
    next(err);
  }
});

router.post('/login', validateRequest({ body: loginBodySchema }), async (req, res, next) => {
  try {
    const data = await loginUser(req.validated.body, req.ip);
    setAuthCookies(res, data.token, TOKEN_MAX_AGE_SECONDS);
    res.json({ code: 200, msg: '登录成功', data });
  } catch (err) {
    next(err);
  }
});

router.post('/forgot-password', validateRequest({ body: forgotPasswordBodySchema }), async (req, res, next) => {
  try {
    const response = await requestPasswordReset(req.validated.body);
    res.status(response.code || 200).json(response);
  } catch (err) {
    next(err);
  }
});

router.post('/reset-password', validateRequest({ body: resetPasswordBodySchema }), async (req, res, next) => {
  try {
    await resetPassword(req.validated.body);
    res.json({ code: 200, msg: '密码重置成功，请用新密码登录' });
  } catch (err) {
    next(err);
  }
});

router.post('/send-email-login-code', validateRequest({ body: sendEmailLoginCodeBodySchema }), async (req, res, next) => {
  try {
    const result = await sendEmailLoginCode(req.validated.body.email);
    res.json({ code: 200, msg: '验证码已发送至邮箱', data: result });
  } catch (err) {
    next(err);
  }
});

router.post('/email-code-auth', validateRequest({ body: emailCodeAuthBodySchema }), async (req, res, next) => {
  try {
    const data = await emailCodeAuth(req.validated.body);
    setAuthCookies(res, data.token, TOKEN_MAX_AGE_SECONDS);
    res.json({ code: 200, msg: '登录成功', data });
  } catch (err) {
    next(err);
  }
});

router.post('/send-phone-code', validateRequest({ body: sendPhoneCodeBodySchema }), async (req, res, next) => {
  try {
    const result = await sendPhoneCode(req.validated.body.phone);
    res.json({ code: 200, msg: '验证码已发送', data: result });
  } catch (err) {
    next(err);
  }
});

router.post('/phone-code-auth', validateRequest({ body: phoneCodeAuthBodySchema }), async (req, res, next) => {
  try {
    const data = await phoneCodeAuth(req.validated.body);
    setAuthCookies(res, data.token, TOKEN_MAX_AGE_SECONDS);
    res.json({ code: 200, msg: '登录成功', data });
  } catch (err) {
    next(err);
  }
});

router.post('/logout', (_req, res) => {
  clearAuthCookies(res);
  res.json({ code: 200, msg: '已退出登录' });
});

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const data = await getCurrentUser(req.user.id);
    setCsrfCookie(res, TOKEN_MAX_AGE_SECONDS);
    res.json({ code: 200, msg: 'ok', data });
  } catch (err) {
    next(err);
  }
});

export default router;
