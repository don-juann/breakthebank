const base = { width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const

export const IconEvent = () => (
  <svg {...base}>
    <path d="M4 7.5A1.5 1.5 0 0 1 5.5 6h13A1.5 1.5 0 0 1 20 7.5v2a2.5 2.5 0 0 0 0 5v2a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 16.5v-2a2.5 2.5 0 0 0 0-5z" />
    <path d="M14 6v12" strokeDasharray="2 2.5" />
  </svg>
)
export const IconDining = () => (
  <svg {...base}>
    <path d="M7 3v8M4.5 3v5a2.5 2.5 0 0 0 5 0V3M7 11v10" />
    <path d="M17 21V3c-2 1.5-3 4-3 7v3h3" />
  </svg>
)
export const IconTransport = () => (
  <svg {...base}>
    <path d="M5 16V11l1.8-4.2A2 2 0 0 1 8.6 5.5h6.8a2 2 0 0 1 1.8 1.3L19 11v5" />
    <rect x="3.5" y="11" width="17" height="6" rx="2" />
    <path d="M6.5 17v2M17.5 17v2" />
    <circle cx="7.5" cy="14" r=".6" fill="currentColor" />
    <circle cx="16.5" cy="14" r=".6" fill="currentColor" />
  </svg>
)
export const IconSettle = () => (
  <svg {...base}>
    <path d="M4 8h13l-3.5-3.5M20 16H7l3.5 3.5" />
  </svg>
)
export const IconBack = () => (
  <svg {...base} strokeWidth={2.6}>
    <path d="M15 5l-7 7 7 7" />
  </svg>
)
export const IconPlus = () => (
  <svg {...base} strokeWidth={2.6}>
    <path d="M12 5v14M5 12h14" />
  </svg>
)
export const IconTrash = () => (
  <svg {...base}>
    <path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13" />
  </svg>
)
export const IconMore = () => (
  <svg {...base} strokeWidth={3}>
    <path d="M5 12h.01M12 12h.01M19 12h.01" />
  </svg>
)
export const IconPeople = () => (
  <svg {...base}>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.5a6.5 6.5 0 0 1 3.5 5.5" />
  </svg>
)
export const IconCopy = () => (
  <svg {...base}>
    <rect x="8" y="8" width="12" height="12" rx="2.5" />
    <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
  </svg>
)
export const IconGear = () => (
  <svg {...base}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1.08-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1.08 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
)
export const IconLink = () => (
  <svg {...base}>
    <path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1" />
    <path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1" />
  </svg>
)
export const FlagNL = () => (
  <svg viewBox="0 0 9 6" preserveAspectRatio="none" aria-label="Dutch flag">
    <rect width="9" height="2" fill="#ae1c28" />
    <rect y="2" width="9" height="2" fill="#fff" />
    <rect y="4" width="9" height="2" fill="#21468b" />
  </svg>
)
export const IconShare = () => (
  <svg {...base}>
    <path d="M12 3v12M7.5 7.5L12 3l4.5 4.5M6 11H5v9h14v-9h-1" />
  </svg>
)
export const IconBackspace = () => (
  <svg {...base}>
    <path d="M9 5h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-6-7z" />
    <path d="M12.5 9.5l5 5M17.5 9.5l-5 5" />
  </svg>
)
export const IconChevronDown = () => (
  <svg {...base}>
    <path d="M6 9l6 6 6-6" />
  </svg>
)
export const IconClose = () => (
  <svg {...base}>
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
)
