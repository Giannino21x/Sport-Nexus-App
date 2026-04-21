"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Avatar } from "./avatar";
import { CommandPalette } from "./command-palette";
import { Icon, type IconName } from "./icon";
import { LogoWordmark } from "./logo-wordmark";
import { NotificationsPopover } from "./notifications-popover";
import { useSettings } from "./settings-context";
import { useEvents, useMe, useMembers, useNotifications } from "@/lib/hooks";
import { signOutAction } from "@/app/actions/auth";

type NavItem = { k: string; href: string; label: string; icon: IconName; badge?: number; dot?: boolean; beta?: boolean };

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme, dataSource } = useSettings();
  const { data: me, dbId: meDbId } = useMe();
  const { data: events } = useEvents();
  const { data: notifs } = useNotifications(meDbId);

  const [notifsOpen, setNotifsOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const { data: members } = useMembers();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 780);
    h();
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);

  const upcoming = useMemo(() => events.filter((e) => e.status === "upcoming"), [events]);
  const unreadCount = notifs.filter((n) => n.unread).length;

  const navItems: NavItem[] = [
    { k: "dashboard", href: "/dashboard", label: "Dashboard", icon: "dashboard" },
    { k: "directory", href: "/directory", label: "Member Directory", icon: "users" },
    { k: "events", href: "/events", label: "Events", icon: "calendar", badge: upcoming.length },
    { k: "messages", href: "/messages", label: "Messages", icon: "message" },
    { k: "feed", href: "/feed", label: "Community Feed", icon: "feed", beta: true },
  ];

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname === href || pathname.startsWith(href + "/");
  };

  const currentNavLabel =
    navItems.find((n) => isActive(n.href))?.label ||
    (pathname.startsWith("/directory/") ? "Member Detail" :
      pathname.startsWith("/events/") ? "Event" :
        pathname === "/profile" ? "Profil bearbeiten" : "Dashboard");

  const navigate = (href: string) => {
    router.push(href);
    setMobileMenuOpen(false);
    setNotifsOpen(false);
    window.scrollTo(0, 0);
  };

  const handleLogout = async () => {
    if (dataSource === "live") {
      await signOutAction();
    } else {
      router.push("/login");
    }
  };

  if (!me) {
    // In live mode when signed out: still render shell (middleware only protects /login redirect)
    // Show minimal placeholder — user likely needs to login
    return (
      <div style={{ padding: 40 }}>
        <div className="serif" style={{ fontSize: 24 }}>Nicht eingeloggt</div>
        <Link href="/login" className="btn btn-primary" style={{ marginTop: 14 }}>
          Zum Login
        </Link>
      </div>
    );
  }

  return (
    <div className="app" data-mobile={isMobile}>
      {!isMobile && (
        <aside className="sidebar">
          <div className="brand">
            <LogoWordmark height={22} invert={theme === "dark"} />
          </div>
          <div className="upper-label" style={{ padding: "0 8px 12px", marginTop: 6, fontSize: 10.5 }}>Member Area</div>

          <div className="nav-section-label">Community</div>
          {navItems.map((item) => (
            <Link
              key={item.k}
              href={item.href}
              className={"nav-item" + (isActive(item.href) ? " active" : "")}
              onClick={() => { setMobileMenuOpen(false); setNotifsOpen(false); }}
            >
              <Icon name={item.icon} className="icon" />
              <span>{item.label}</span>
              {item.beta && (
                <span className="mono" style={{ fontSize: 9, padding: "1px 5px", background: "var(--accent-soft)", color: "var(--accent)", borderRadius: 4, marginLeft: "auto" }}>
                  BETA
                </span>
              )}
              {typeof item.badge === "number" && item.badge > 0 && <span className="count-badge">{item.badge}</span>}
            </Link>
          ))}

          <div className="nav-section-label">Konto</div>
          <Link href="/profile" className={"nav-item" + (pathname === "/profile" ? " active" : "")}>
            <Icon name="edit" className="icon" /><span>Profil bearbeiten</span>
          </Link>
          <Link href="/settings" className={"nav-item" + (pathname === "/settings" ? " active" : "")}>
            <Icon name="settings" className="icon" /><span>Einstellungen</span>
          </Link>
          <button className="nav-item" onClick={handleLogout}>
            <Icon name="logout" className="icon" /><span>Abmelden</span>
          </button>

          <Link href="/profile" className="me" style={{ cursor: "pointer" }}>
            <Avatar first={me.first} last={me.last} color={me.color} size={34} url={me.avatarUrl} />
            <div className="me-text" style={{ flex: 1, minWidth: 0 }}>
              <div className="me-name">{me.first} {me.last}</div>
              <div className="me-role" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {me.company}
              </div>
            </div>
          </Link>
        </aside>
      )}

      <div className="main">
        <div className="topbar">
          {isMobile && (
            <button className="icon-btn" onClick={() => setMobileMenuOpen(true)} style={{ marginRight: 2 }}>
              <Icon name="menu" size={18} />
            </button>
          )}
          <div className="breadcrumbs">
            {isMobile ? (
              <LogoWordmark height={18} invert={theme === "dark"} />
            ) : (
              <>
                <span>SportNexus</span>
                <span>/</span>
                <span className="crumb-current">{currentNavLabel}</span>
              </>
            )}
          </div>
          {!isMobile && (
            <div className="search-global" onClick={() => setPaletteOpen(true)} role="button" tabIndex={0}>
              <Icon name="search" size={14} />
              <span style={{ flex: 1 }}>Mitglieder, Events, Seiten suchen...</span>
              <kbd>⌘K</kbd>
            </div>
          )}
          <div style={{ position: "relative" }}>
            <button className="icon-btn" onClick={() => setNotifsOpen(!notifsOpen)}>
              <Icon name="bell" />
              {unreadCount > 0 && <span className="has-dot" />}
            </button>
            {notifsOpen && (
              <NotificationsPopover notifs={notifs} onClose={() => setNotifsOpen(false)} />
            )}
          </div>
          <button
            className="icon-btn"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            title="Dark mode toggle"
          >
            <Icon name={theme === "dark" ? "sun" : "moon"} />
          </button>
          {isMobile && <Avatar first={me.first} last={me.last} color={me.color} size={30} url={me.avatarUrl} />}
        </div>

        <div className="content">{children}</div>
      </div>

      {isMobile && (
        <div
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            background: "var(--bg-elevated)",
            borderTop: "1px solid var(--line)",
            display: "flex",
            padding: "6px 6px calc(6px + env(safe-area-inset-bottom))",
            zIndex: 50,
          }}
        >
          {[
            { href: "/dashboard", icon: "home" as const, l: "Home" },
            { href: "/directory", icon: "users" as const, l: "Members" },
            { href: "/events", icon: "calendar" as const, l: "Events" },
            { href: "/messages", icon: "message" as const, l: "Chat" },
            { href: "/profile", icon: "user" as const, l: "Profil" },
          ].map((it) => (
            <Link
              key={it.href}
              href={it.href}
              style={{
                flex: 1,
                padding: "8px 4px",
                background: "transparent",
                border: "none",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 3,
                color: isActive(it.href) ? "var(--ink)" : "var(--ink-3)",
                cursor: "pointer",
              }}
            >
              <Icon name={it.icon} size={19} />
              <span style={{ fontSize: 10 }}>{it.l}</span>
            </Link>
          ))}
        </div>
      )}

      {isMobile && mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 100 }}
        >
          <aside
            onClick={(e) => e.stopPropagation()}
            className="sidebar"
            style={{ position: "fixed", top: 0, left: 0, width: 260, height: "100vh" }}
          >
            <div className="brand"><LogoWordmark height={22} invert={theme === "dark"} /></div>
            {navItems.map((item) => (
              <Link
                key={item.k}
                href={item.href}
                className={"nav-item" + (isActive(item.href) ? " active" : "")}
                onClick={() => setMobileMenuOpen(false)}
              >
                <Icon name={item.icon} className="icon" />
                <span>{item.label}</span>
                {typeof item.badge === "number" && item.badge > 0 && <span className="count-badge">{item.badge}</span>}
              </Link>
            ))}
            <Link href="/profile" className="nav-item" onClick={() => setMobileMenuOpen(false)}>
              <Icon name="edit" className="icon" /><span>Profil bearbeiten</span>
            </Link>
            <button className="nav-item" onClick={() => { setMobileMenuOpen(false); handleLogout(); }}>
              <Icon name="logout" className="icon" /><span>Abmelden</span>
            </button>
          </aside>
        </div>
      )}

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        members={members}
        events={events}
      />
    </div>
  );
}
