import { useCallback, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { buildRouteUrl, readRouteState } from "./routes.js";

export default function useAppRouter() {
  const location = useLocation();
  const navigate = useNavigate();
  const route = useMemo(() => readRouteState(location), [location]);

  const commitRoute = useCallback((nextRoute, options = {}) => {
    const resolvedRoute = typeof nextRoute === "function" ? nextRoute(route) : nextRoute;
    const url = buildRouteUrl(resolvedRoute);
    navigate(url, { replace: Boolean(options.replace) });
  }, [navigate, route]);

  return {
    route,
    commitRoute,
    isPending: false,
  };
}
