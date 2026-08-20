import { useEffect } from "react";

import { DEFAULT_DESCRIPTION, DEFAULT_OG_IMAGE, DEFAULT_TITLE, PAGE_SEO, SITE_URL } from "./publicPageSeo.js";
import { getSiteTheme } from "./siteTheme.js";

function setMeta(id, value) {
  const element = document.getElementById(id);
  if (element && value) {
    element.setAttribute("content", value);
  }
}

function setHref(id, value) {
  const element = document.getElementById(id);
  if (element && value) {
    element.setAttribute("href", value);
  }
}

export default function AppDocumentHead({ page }) {
  useEffect(() => {
    // Set body data-site-theme so loading shell and body background match the page
    const theme = getSiteTheme(page);
    document.body.setAttribute("data-site-theme", theme);

    const config = PAGE_SEO[page] || {
      title: DEFAULT_TITLE,
      description: DEFAULT_DESCRIPTION,
      path: window.location.pathname,
      robots: "noindex,nofollow",
      structuredData: PAGE_SEO.portal.structuredData,
    };

    const canonical = new URL(config.path || window.location.pathname, SITE_URL).toString();

    document.title = config.title;
    setMeta("meta-description", config.description);
    setMeta("meta-robots", config.robots);
    setMeta("meta-og-title", config.title);
    setMeta("meta-og-description", config.description);
    setMeta("meta-og-url", canonical);
    setMeta("meta-og-image", config.image || DEFAULT_OG_IMAGE);
    setMeta("meta-og-image-secure", config.image || DEFAULT_OG_IMAGE);
    setMeta("meta-twitter-title", config.title);
    setMeta("meta-twitter-description", config.description);
    setMeta("meta-twitter-image", config.image || DEFAULT_OG_IMAGE);
    setHref("link-canonical", canonical);

    const structuredData = document.getElementById("structured-data");
    if (structuredData) {
      structuredData.textContent = JSON.stringify(config.structuredData || PAGE_SEO.portal.structuredData);
    }
  }, [page]);

  return null;
}
