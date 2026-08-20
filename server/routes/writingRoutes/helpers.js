export function asyncRoute(handler) {
  return async function writingRouteHandler(req, res, next) {
    try {
      await handler(req, res, next);
    } catch (error) {
      next(error);
    }
  };
}

export function respondJson(res, { status = 200, msg = 'ok', data }) {
  return res.status(status).json({
    code: status,
    msg,
    data,
  });
}

export function respondServiceResult(res, result) {
  return respondJson(res, {
    status: result.statusCode,
    msg: result.msg,
    data: result.data,
  });
}

export function getWritingRouteContext(req) {
  return {
    writingId: req.params.id,
    user: req.user,
  };
}
