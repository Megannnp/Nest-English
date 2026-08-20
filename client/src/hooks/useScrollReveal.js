import { useEffect, useLayoutEffect, useRef } from "react";

export default function useScrollReveal({
  targetSelector = ".studio-reveal",
  revealedClass = "studio-revealed",
  threshold = 0.15,
} = {}) {
  const ref = useRef(null);

  // Immediately reveal elements that are already in the viewport BEFORE the
  // browser's first paint. This prevents the opacity-0 → opacity-1 transition
  // from replaying every time the component re-mounts (e.g. after navigating
  // back to a page), which is the primary cause of navigation "flash".
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const targets = element.querySelectorAll(targetSelector);
    targets.forEach((target) => {
      const rect = target.getBoundingClientRect();
      // Reveal elements in the viewport. Also reveal zero-height elements
      // (not yet laid out) so content is never stuck invisible.
      if (rect.top < window.innerHeight && (rect.bottom > 0 || rect.height === 0)) {
        target.classList.add(revealedClass);
      }
    });
  }, [revealedClass, targetSelector]);

  // For elements below the fold, use IntersectionObserver so they still
  // animate in as the user scrolls down.
  useEffect(() => {
    const element = ref.current;
    if (!element) return undefined;

    // Skip elements already revealed by the layout effect above.
    const targets = Array.from(element.querySelectorAll(targetSelector)).filter(
      (el) => !el.classList.contains(revealedClass)
    );

    if (typeof IntersectionObserver === "undefined") {
      targets.forEach((target) => target.classList.add(revealedClass));
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add(revealedClass);
          observer.unobserve(entry.target);
        });
      },
      { threshold }
    );

    targets.forEach((target) => observer.observe(target));

    // Safety fallback: if IntersectionObserver hasn't revealed elements within
    // 300ms (callback delayed, zero-height element, hidden tab, etc.),
    // force-reveal everything so content is never permanently stuck at
    // opacity:0.01 — which users perceive as a blank page.
    const fallbackId = window.setTimeout(() => {
      targets.forEach((target) => {
        if (!target.classList.contains(revealedClass)) {
          target.classList.add(revealedClass);
        }
      });
    }, 300);

    return () => {
      observer.disconnect();
      window.clearTimeout(fallbackId);
    };
  }, [revealedClass, targetSelector, threshold]);

  return ref;
}
