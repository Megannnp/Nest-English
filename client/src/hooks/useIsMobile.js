import { useEffect, useState } from "react";

function getInitialValue(breakpoint) {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia(`(max-width: ${breakpoint}px)`).matches;
}

export default function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(() => getInitialValue(breakpoint));

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return undefined;
    }

    const mediaQuery = window.matchMedia(`(max-width: ${breakpoint}px)`);
    const update = (event) => setIsMobile(event.matches);

    setIsMobile(mediaQuery.matches);

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", update);
      return () => mediaQuery.removeEventListener("change", update);
    }

    mediaQuery.addListener(update);
    return () => mediaQuery.removeListener(update);
  }, [breakpoint]);

  return isMobile;
}
