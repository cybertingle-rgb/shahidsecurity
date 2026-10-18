// A small, fixed set of clean outline icons for the portal sidebar
// (PortalSidebar.tsx) — plain SVG primitives rather than a dependency,
// matching the thin-stroke icon style in the glassmorphism reference.
// Same set as apps/learn's PortalIcon.tsx, plus the extra names this
// app's wider Business/Learn nav needs (briefcase, file-text, search,
// star, sparkles, image, sliders).
export type PortalIconName =
  | 'home'
  | 'book-open'
  | 'graduation-cap'
  | 'credit-card'
  | 'shopping-cart'
  | 'users'
  | 'receipt'
  | 'user'
  | 'settings'
  | 'log-out'
  | 'chevron-left'
  | 'chevron-right'
  | 'chevron-down'
  | 'shield'
  | 'tag'
  | 'user-plus'
  | 'megaphone'
  | 'wallet'
  | 'trending-up'
  | 'map'
  | 'briefcase'
  | 'file-text'
  | 'search'
  | 'star'
  | 'sparkles'
  | 'image'
  | 'sliders';

const SHARED_PROPS = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export function PortalIcon({ name, className }: { name: PortalIconName; className?: string }) {
  switch (name) {
    case 'home':
      return (
        <svg {...SHARED_PROPS} className={className}>
          <path d="M4 11l8-7 8 7" />
          <path d="M6 10v9h12v-9" />
          <rect x="10" y="14" width="4" height="5" />
        </svg>
      );
    case 'book-open':
      return (
        <svg {...SHARED_PROPS} className={className}>
          <path d="M4 5c2-1 5-1 8 1 3-2 6-2 8-1v13c-2-1-5-1-8 1-3-2-6-2-8-1V5z" />
          <line x1="12" y1="6" x2="12" y2="18" />
        </svg>
      );
    case 'graduation-cap':
      return (
        <svg {...SHARED_PROPS} className={className}>
          <path d="M2 9l10-5 10 5-10 5-10-5z" />
          <path d="M6 11.5V17c0 1.5 3 3 6 3s6-1.5 6-3v-5.5" />
          <line x1="22" y1="9" x2="22" y2="15" />
        </svg>
      );
    case 'credit-card':
      return (
        <svg {...SHARED_PROPS} className={className}>
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <line x1="2" y1="10" x2="22" y2="10" />
        </svg>
      );
    case 'shopping-cart':
      return (
        <svg {...SHARED_PROPS} className={className}>
          <circle cx="9" cy="20" r="1.3" />
          <circle cx="18" cy="20" r="1.3" />
          <path d="M2 3h2l2.6 12.4A2 2 0 0 0 8.5 17h9a2 2 0 0 0 2-1.6L21 7H6" />
        </svg>
      );
    case 'users':
      return (
        <svg {...SHARED_PROPS} className={className}>
          <circle cx="9" cy="8" r="3.2" />
          <path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" />
          <circle cx="17.5" cy="9" r="2.6" />
          <path d="M15.5 14.5c2.6.3 4.5 2.2 4.5 5.5" />
        </svg>
      );
    case 'receipt':
      return (
        <svg {...SHARED_PROPS} className={className}>
          <path d="M5 2h14v20l-2.5-1.5L14 22l-2.5-1.5L9 22l-2.5-1.5L5 22V2z" />
          <line x1="8" y1="7" x2="16" y2="7" />
          <line x1="8" y1="11" x2="16" y2="11" />
          <line x1="8" y1="15" x2="13" y2="15" />
        </svg>
      );
    case 'user':
      return (
        <svg {...SHARED_PROPS} className={className}>
          <circle cx="12" cy="8" r="3.5" />
          <path d="M5 20c0-3.9 3.1-7 7-7s7 3.1 7 7" />
        </svg>
      );
    case 'settings':
      return (
        <svg {...SHARED_PROPS} className={className}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19 12a7 7 0 0 0-.1-1.1l2-1.6-2-3.4-2.4 1a7 7 0 0 0-1.9-1.1L14.2 3H9.8l-.4 2.8a7 7 0 0 0-1.9 1.1l-2.4-1-2 3.4 2 1.6A7 7 0 0 0 5 12a7 7 0 0 0 .1 1.1l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 1.9 1.1l.4 2.8h4.4l.4-2.8a7 7 0 0 0 1.9-1.1l2.4 1 2-3.4-2-1.6c.07-.36.1-.73.1-1.1Z" />
        </svg>
      );
    case 'log-out':
      return (
        <svg {...SHARED_PROPS} className={className}>
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
      );
    case 'chevron-left':
      return (
        <svg {...SHARED_PROPS} className={className}>
          <polyline points="15 18 9 12 15 6" />
        </svg>
      );
    case 'chevron-right':
      return (
        <svg {...SHARED_PROPS} className={className}>
          <polyline points="9 18 15 12 9 6" />
        </svg>
      );
    case 'chevron-down':
      return (
        <svg {...SHARED_PROPS} className={className}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      );
    case 'shield':
      return (
        <svg {...SHARED_PROPS} className={className}>
          <path d="M12 2 4 6v6c0 5 3.5 8 8 10 4.5-2 8-5 8-10V6l-8-4Z" />
        </svg>
      );
    case 'tag':
      return (
        <svg {...SHARED_PROPS} className={className}>
          <path d="M20 12 12 20a2 2 0 0 1-2.8 0L3 13.8a2 2 0 0 1 0-2.8L11.2 3H19a1 1 0 0 1 1 1v8Z" />
          <circle cx="15.5" cy="8.5" r="1.3" />
        </svg>
      );
    case 'user-plus':
      return (
        <svg {...SHARED_PROPS} className={className}>
          <circle cx="9" cy="8" r="3.5" />
          <path d="M2 20c0-3.9 3.1-7 7-7s7 3.1 7 7" />
          <line x1="19" y1="8" x2="19" y2="14" />
          <line x1="16" y1="11" x2="22" y2="11" />
        </svg>
      );
    case 'megaphone':
      return (
        <svg {...SHARED_PROPS} className={className}>
          <path d="M3 10v4a1 1 0 0 0 1 1h2l5 4V5L6 9H4a1 1 0 0 0-1 1Z" />
          <path d="M15 8a4 4 0 0 1 0 8" />
          <path d="M18 5a8 8 0 0 1 0 14" />
        </svg>
      );
    case 'wallet':
      return (
        <svg {...SHARED_PROPS} className={className}>
          <path d="M3 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2h2a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H5a2 2 0 0 1-2-2V7Z" />
          <circle cx="17" cy="14" r="1.2" />
        </svg>
      );
    case 'trending-up':
      return (
        <svg {...SHARED_PROPS} className={className}>
          <polyline points="3 17 9 11 13 15 21 6" />
          <polyline points="15 6 21 6 21 12" />
        </svg>
      );
    case 'map':
      return (
        <svg {...SHARED_PROPS} className={className}>
          <path d="M3 5l6-2 6 2 6-2v16l-6 2-6-2-6 2V5Z" />
          <line x1="9" y1="3" x2="9" y2="19" />
          <line x1="15" y1="5" x2="15" y2="21" />
        </svg>
      );
    case 'briefcase':
      return (
        <svg {...SHARED_PROPS} className={className}>
          <rect x="2.5" y="7" width="19" height="13" rx="2" />
          <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          <line x1="2.5" y1="13" x2="21.5" y2="13" />
        </svg>
      );
    case 'file-text':
      return (
        <svg {...SHARED_PROPS} className={className}>
          <path d="M6 2h8l5 5v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1Z" />
          <polyline points="14 2 14 7 19 7" />
          <line x1="8" y1="13" x2="16" y2="13" />
          <line x1="8" y1="17" x2="13" y2="17" />
        </svg>
      );
    case 'search':
      return (
        <svg {...SHARED_PROPS} className={className}>
          <circle cx="10.5" cy="10.5" r="6.5" />
          <line x1="20" y1="20" x2="15.3" y2="15.3" />
        </svg>
      );
    case 'star':
      return (
        <svg {...SHARED_PROPS} className={className}>
          <path d="M12 2.5l2.9 6 6.6.8-4.8 4.6 1.2 6.5L12 17l-5.9 3.4 1.2-6.5-4.8-4.6 6.6-.8L12 2.5Z" />
        </svg>
      );
    case 'sparkles':
      return (
        <svg {...SHARED_PROPS} className={className}>
          <path d="M11 2v4M11 16v4M3 11h4M16 11h4" />
          <path d="M11 6l1.5 3.5L16 11l-3.5 1.5L11 16l-1.5-3.5L6 11l3.5-1.5L11 6Z" />
        </svg>
      );
    case 'image':
      return (
        <svg {...SHARED_PROPS} className={className}>
          <rect x="2.5" y="4" width="19" height="16" rx="2" />
          <circle cx="8.5" cy="10" r="1.6" />
          <path d="M21.5 17l-6-6-4 4-2.5-2.5-6.5 6.5" />
        </svg>
      );
    case 'sliders':
      return (
        <svg {...SHARED_PROPS} className={className}>
          <line x1="4" y1="6" x2="20" y2="6" />
          <line x1="4" y1="12" x2="20" y2="12" />
          <line x1="4" y1="18" x2="20" y2="18" />
          <circle cx="9" cy="6" r="2" />
          <circle cx="16" cy="12" r="2" />
          <circle cx="7" cy="18" r="2" />
        </svg>
      );
    default:
      return null;
  }
}
