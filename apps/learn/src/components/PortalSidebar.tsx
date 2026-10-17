'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PortalIcon, type PortalIconName } from './PortalIcon';

export interface PortalNavItem {
  href: string;
  label: string;
  icon: PortalIconName;
  /** The one "Admin panel →" style link gets the brand-accent treatment instead of the muted default. */
  accent?: boolean;
}

export interface PortalNavSection {
  label?: string;
  items: PortalNavItem[];
}

interface PortalSidebarProps {
  sections: PortalNavSection[];
  userName: string;
  userRole: string;
  profileHref?: string;
  logoutAction: () => void | Promise<void>;
  /** Separate localStorage key per sidebar instance (dashboard vs admin) so collapse state doesn't leak between them. */
  storageKey: string;
}

function initials(name: string) {
  const parts = name
    .trim()
    .split(/\s+/)
    .map((part) => part.match(/[A-Za-z]/)?.[0] ?? '')
    .filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1] ?? '') : '';
  return (first + last).toUpperCase();
}

interface IndicatorRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export default function PortalSidebar({ sections, userName, userRole, profileHref, logoutAction, storageKey }: PortalSidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState<IndicatorRect | null>(null);
  const [indicatorReady, setIndicatorReady] = useState(false);

  useLayoutEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(storageKey) === '1');
    } catch {
      // Private browsing / blocked storage — default to expanded.
    }
  }, [storageKey]);

  function measure(el: HTMLElement | null) {
    const container = scrollRef.current;
    if (!el || !container) return;
    const containerRect = container.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    setIndicator({
      top: elRect.top - containerRect.top + container.scrollTop,
      left: elRect.left - containerRect.left,
      width: elRect.width,
      height: elRect.height,
    });
    setIndicatorReady(true);
  }

  function moveToActive() {
    const container = scrollRef.current;
    const active = container?.querySelector<HTMLElement>('.portal-sidebar-item.is-active');
    if (active) measure(active);
    else setIndicatorReady(false);
  }

  // Re-measure on route change and on collapse/expand (item widths/positions shift).
  useLayoutEffect(() => {
    moveToActive();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, collapsed]);

  useLayoutEffect(() => {
    const onResize = () => moveToActive();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(storageKey, next ? '1' : '0');
      } catch {
        // Nothing to persist to — the toggle still works for this page view.
      }
      return next;
    });
  }

  const userRow = (
    <div className="portal-sidebar-user">
      <span className="portal-sidebar-avatar">{initials(userName)}</span>
      {!collapsed && (
        <span className="portal-sidebar-user-text">
          <span className="portal-sidebar-user-name">{userName}</span>
          <span className="portal-sidebar-user-role">{userRole}</span>
        </span>
      )}
      {!collapsed && <PortalIcon name="chevron-down" className="portal-sidebar-user-chevron" />}
    </div>
  );

  return (
    <nav className={`portal-nav-panel portal-sidebar${collapsed ? ' is-collapsed' : ''}`} aria-label="Dashboard navigation">
      <div className="portal-sidebar-chrome">
        <span className="portal-sidebar-dot portal-sidebar-dot-red" />
        <span className="portal-sidebar-dot portal-sidebar-dot-yellow" />
        <span className="portal-sidebar-dot portal-sidebar-dot-green" />
      </div>

      <button type="button" onClick={toggle} className="portal-sidebar-toggle" aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
        <PortalIcon name={collapsed ? 'chevron-right' : 'chevron-left'} className="h-3.5 w-3.5" />
      </button>

      {profileHref ? (
        <Link href={profileHref} className="portal-sidebar-user-link">
          {userRow}
        </Link>
      ) : (
        userRow
      )}

      <div className="portal-sidebar-scroll" ref={scrollRef} onMouseLeave={moveToActive}>
        <span
          className={`portal-sidebar-indicator${indicatorReady ? ' is-ready' : ''}`}
          aria-hidden="true"
          style={
            indicator
              ? {
                  transform: `translate(${indicator.left}px, ${indicator.top}px)`,
                  width: indicator.width,
                  height: indicator.height,
                }
              : undefined
          }
        />
        {sections.map((section, i) => (
          <div key={section.label ?? i} className="portal-sidebar-section">
            {section.label && !collapsed && <p className="portal-sidebar-label">{section.label}</p>}
            {section.items.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`portal-sidebar-item${active ? ' is-active' : ''}${item.accent ? ' is-accent' : ''}`}
                  title={collapsed ? item.label : undefined}
                  onMouseEnter={(e) => measure(e.currentTarget)}
                >
                  <PortalIcon name={item.icon} className="portal-sidebar-icon" />
                  {!collapsed && <span className="portal-sidebar-item-label">{item.label}</span>}
                </Link>
              );
            })}
          </div>
        ))}

        <div className="portal-sidebar-section">
          <form action={logoutAction}>
            <button
              type="submit"
              className="portal-sidebar-item portal-sidebar-logout"
              title={collapsed ? 'Log out' : undefined}
              onMouseEnter={(e) => measure(e.currentTarget)}
            >
              <PortalIcon name="log-out" className="portal-sidebar-icon" />
              {!collapsed && <span className="portal-sidebar-item-label">Log out</span>}
            </button>
          </form>
        </div>
      </div>
    </nav>
  );
}
