export const CORE_ICON_RENDERERS = {
  "workbench": (p) => (
        <svg {...p}>
          <rect x="3.5" y="4.5" width="7" height="7" rx="1.5" />
          <rect x="13.5" y="4.5" width="7" height="5" rx="1.5" />
          <rect x="13.5" y="12.5" width="7" height="7" rx="1.5" />
          <rect x="3.5" y="14.5" width="7" height="5" rx="1.5" />
        </svg>
  ),
  "classes": (p) => (
        <svg {...p}>
          <path d="M4 10 12 4l8 6" />
          <path d="M6 9.5v9h12v-9" />
          <path d="M9.5 18.5v-4.5h5v4.5" />
        </svg>
  ),
  "tasks": (p) => (
        <svg {...p}>
          <path d="M8 6.5h11" />
          <path d="M8 12h11" />
          <path d="M8 17.5h11" />
          <path d="m4.5 6.5 1.5 1.5 2.5-3" />
          <path d="m4.5 12 1.5 1.5 2.5-3" />
          <path d="m4.5 17.5 1.5 1.5 2.5-3" />
        </svg>
  ),
  "writing": (p) => (
        <svg {...p}>
          <path d="M4 20h4.5l9.8-9.8a2.1 2.1 0 0 0 0-3L16.8 5.7a2.1 2.1 0 0 0-3 0L4 15.5Z" />
          <path d="m12.5 7 4.5 4.5" />
        </svg>
  ),
  "records": (p) => (
        <svg {...p}>
          <path d="M6 4.5h9l3 3v12a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 5 19.5V6A1.5 1.5 0 0 1 6.5 4.5Z" />
          <path d="M14.5 4.5v4h4" />
          <path d="M8.5 12h7" />
          <path d="M8.5 16h5" />
        </svg>
  ),
  "account": (p) => (
        <svg {...p}>
          <circle cx="12" cy="8" r="3.5" />
          <path d="M5 19c1.8-3 4.1-4.5 7-4.5s5.2 1.5 7 4.5" />
        </svg>
  ),
  "logout": (p) => (
        <svg {...p}>
          <path d="M9 5.5H6.5A1.5 1.5 0 0 0 5 7v10a1.5 1.5 0 0 0 1.5 1.5H9" />
          <path d="M13 16.5 18 12l-5-4.5" />
          <path d="M18 12H9" />
        </svg>
  ),
  "compass": (p) => (
        <svg {...p}>
          <circle cx="12" cy="12" r="9" />
          <polygon points="16.24,7.76 14.12,14.12 7.76,16.24 9.88,9.88" />
        </svg>
  ),
  "chart": (p) => (
        <svg {...p}>
          <rect x="3" y="13" width="4" height="8" rx="1" />
          <rect x="10" y="8" width="4" height="13" rx="1" />
          <rect x="17" y="3" width="4" height="18" rx="1" />
        </svg>
  ),
  "clock": (p) => (
        <svg {...p}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 3" />
        </svg>
  ),
  "pencil": (p) => (
        <svg {...p}>
          <path d="M17 3a2.85 2.85 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
          <path d="m15 5 4 4" />
        </svg>
  ),
  "book-open": (p) => (
        <svg {...p}>
          <path d="M2 6.5a2 2 0 0 1 2-2h6v15H4a2 2 0 0 1-2-2Z" />
          <path d="M22 6.5a2 2 0 0 0-2-2h-6v15h6a2 2 0 0 0 2-2Z" />
          <path d="M12 4.5v15" />
        </svg>
  ),
  "bookmark": (p) => (
        <svg {...p}>
          <path d="M6 4.5h12a1.5 1.5 0 0 1 1.5 1.5v14l-7.5-4-7.5 4V6A1.5 1.5 0 0 1 6 4.5Z" />
        </svg>
  ),
  "ticket": (p) => (
        <svg {...p}>
          <path d="M2 10v1a3 3 0 0 1 0 4v1a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-1a3 3 0 0 1 0-4v-1a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
          <line x1="9" y1="8" x2="9" y2="16" strokeDasharray="2 2" />
        </svg>
  ),
  "star": (p) => (
        <svg {...p}>
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
  ),
  "pen-line": (p) => (
        <svg {...p}>
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
  ),
  "layers": (p) => (
        <svg {...p}>
          <polygon points="12 2 2 7 12 12 22 7 12 2" />
          <polyline points="2 17 12 22 22 17" />
          <polyline points="2 12 12 17 22 12" />
        </svg>
  ),
  "target": (p) => (
        <svg {...p}>
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="5" />
          <circle cx="12" cy="12" r="1" fill="currentColor" strokeWidth="0" />
        </svg>
  ),
  "books": (p) => (
        <svg {...p}>
          <path d="M4 4.5h5A1.5 1.5 0 0 1 10.5 6v13a1 1 0 0 1-1 1H4.5A1.5 1.5 0 0 1 3 18.5V6A1.5 1.5 0 0 1 4.5 4.5Z" />
          <path d="M10.5 5.5h9A1.5 1.5 0 0 1 21 7v11a1.5 1.5 0 0 1-1.5 1.5h-9" />
          <path d="M10.5 10h6" />
          <path d="M10.5 14h4" />
        </svg>
  ),
  "file-text": (p) => (
        <svg {...p}>
          <path d="M15 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
          <path d="M15 3v5h5" />
          <line x1="8" y1="13" x2="16" y2="13" />
          <line x1="8" y1="17" x2="13" y2="17" />
        </svg>
  ),
  "lightbulb": (p) => (
        <svg {...p}>
          <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
          <path d="M9 18h6" />
          <path d="M10 22h4" />
        </svg>
  ),
  "zap": (p) => (
        <svg {...p}>
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
  ),
  "sparkles": (p) => (
        <svg {...p}>
          <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" />
          <path d="M5 3v4M3 5h4M19 17v4M17 19h4" />
        </svg>
  ),
  "gem": (p) => (
        <svg {...p}>
          <polygon points="6 3 18 3 22 9 12 22 2 9" />
          <line x1="2" y1="9" x2="22" y2="9" />
          <line x1="12" y1="3" x2="6" y2="9" />
          <line x1="12" y1="3" x2="18" y2="9" />
        </svg>
  ),
};
