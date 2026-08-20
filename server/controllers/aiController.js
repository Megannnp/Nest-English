const aiService = require('../services/aiService');

/**
 * AI 分析作文接口
 * @param {Request} req 请求对象
 * @param {Response} res 响应对象
 * @param {NextFunction} next 下一步中间件
 */
exports.analyzeWriting = async (req, res, next) => {
  try {
    // 1. 校验参数
    if (!req.body.content || !req.body.type) {
      return res.status(400).json({ code: 400, msg: '作文内容和类型不能为空' });
    }

    // 2. 调用服务层逻辑
    const result = await aiService.analyzeWriting(req.body);

    // 3. 返回响应
    res.json({
      code: 200,
      msg: '分析成功',
      data: result
    });
  } catch (err) {
    // 交给错误处理中间件
    next(err);
  }
};