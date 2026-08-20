export function validateRequest(schemaMap) {
  return (req, _res, next) => {
    try {
      req.validated = {
        body: schemaMap.body ? schemaMap.body.parse(req.body, 'body') : req.body,
        query: schemaMap.query ? schemaMap.query.parse(req.query, 'query') : req.query,
        params: schemaMap.params ? schemaMap.params.parse(req.params, 'params') : req.params,
      };
      next();
    } catch (error) {
      next(error);
    }
  };
}
