export const EXTENDED_ICON_RENDERERS = {
  "users": (p) => (
        <svg {...p}>
          <circle cx="9" cy="8" r="3.2" />
          <path d="M3.5 19c1.2-3 3.2-4.5 5.5-4.5s4.3 1.5 5.5 4.5" />
          <path d="M15.5 4.7a3.2 3.2 0 0 1 0 6.2" />
          <path d="M17 14.7c2 .5 3.4 2 4.2 4.3" />
        </svg>
  ),
  "shield": (p) => (
        <svg {...p}>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
        </svg>
  ),
  "graduation-cap": (p) => (
        <svg {...p}>
          <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
          <path d="M6 12v5c3 3 9 3 12 0v-5" />
        </svg>
  ),
  "teacher": (p) => (
        <svg {...p}>
          <circle cx="9" cy="8" r="3.5" />
          <path d="M3 20c1.5-2.5 3.5-4 6-4s4.5 1.5 6 4" />
          <path d="m15 12 2 2 4-4" />
        </svg>
  ),
  "clipboard": (p) => (
        <svg {...p}>
          <rect x="8" y="2" width="8" height="4" rx="1" />
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
          <path d="M12 11h4M12 16h4M8 11h.01M8 16h.01" />
        </svg>
  ),
  "trending-up": (p) => (
        <svg {...p}>
          <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
          <polyline points="16 7 22 7 22 13" />
        </svg>
  ),
  "alert": (p) => (
        <svg {...p}>
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
  ),
  "dumbbell": (p) => (
        <svg {...p}>
          <path d="M14.4 14.4 9.6 9.6" />
          <path d="M18.657 5.343a4 4 0 0 1 0 5.657l-1.06 1.06a4 4 0 0 1-5.657 0l-2-2a4 4 0 0 1 0-5.656l1.06-1.06a4 4 0 0 1 5.657 0Z" />
          <path d="m5.343 18.657 1.06-1.06a4 4 0 0 1 5.657 0l2 2a4 4 0 0 1 0 5.656" />
        </svg>
  ),
  "refresh": (p) => (
        <svg {...p}>
          <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
          <path d="M21 3v5h-5" />
          <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
          <path d="M3 21v-5h5" />
        </svg>
  ),
  "construction": (p) => (
        <svg {...p}>
          <rect x="2" y="14" width="20" height="6" rx="2" />
          <path d="M17 14V8" />
          <path d="M12 14v-4" />
          <path d="M7 14V8" />
          <path d="M2 8h20" />
        </svg>
  ),
  "message": (p) => (
        <svg {...p}>
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z" />
        </svg>
  ),
  "leaf": (p) => (
        <svg {...p}>
          <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
          <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
        </svg>
  ),
  "mic": (p) => (
        <svg {...p}>
          <path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3Z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" y1="19" x2="12" y2="22" />
          <line x1="8" y1="22" x2="16" y2="22" />
        </svg>
  ),
  "mail": (p) => (
        <svg {...p}>
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <path d="m2 7 10 7 10-7" />
        </svg>
  ),
  "search": (p) => (
        <svg {...p}>
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
  ),
  "heart": (p) => (
        <svg {...p}>
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78Z" />
        </svg>
  ),
  "pie-chart": (p) => (
        <svg {...p}>
          <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
          <path d="M22 12A10 10 0 0 0 12 2v10Z" />
        </svg>
  ),
  "radar": (p) => (
        <svg {...p}>
          <path d="M12 2 2 19.8h20Z" />
          <path d="M12 2v17.8" />
          <path d="M2 19.8h20" />
          <path d="M5.2 9.5h13.6" />
          <path d="M12 2 4.4 14.9M12 2l7.6 12.9" />
        </svg>
  ),
  "notepad": (p) => (
        <svg {...p}>
          <path d="M16 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8Z" />
          <path d="M15 3v5h5" />
          <path d="M8 13h8M8 17h5" />
          <path d="M10 9H8" />
        </svg>
  ),
  "alarm": (p) => (
        <svg {...p}>
          <circle cx="12" cy="13" r="7" />
          <path d="M12 10v3l2 2" />
          <path d="M5 3 2 6M22 6l-3-3" />
          <path d="M6.38 18.7 4 21M17.64 18.67 20 21" />
        </svg>
  ),
  "camera": (p) => (
        <svg {...p}>
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
          <circle cx="12" cy="13" r="4" />
        </svg>
  ),
  "folder-open": (p) => (
        <svg {...p}>
          <path d="M6 14l1.5-5.5A2 2 0 0 1 9.4 7H20a2 2 0 0 1 1.9 2.6l-1.7 5A2 2 0 0 1 18.3 16H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.4.6L11 5h9a2 2 0 0 1 2 2v2" />
        </svg>
  ),
  "upload": (p) => (
        <svg {...p}>
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
  ),
  "index-card": (p) => (
        <svg {...p}>
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <path d="M2 10h20" />
          <path d="M7 5V3M12 5V3M17 5V3" />
        </svg>
  ),
};
