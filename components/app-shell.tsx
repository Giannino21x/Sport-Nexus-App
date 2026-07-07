"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Avatar } from "./avatar";
import { CommandPalette } from "./command-palette";
import { Icon, type IconName } from "./icon";
import { LogoWordmark } from "./logo-wordmark";
import { NotificationsPopover } from "./notifications-popover";
import { PhotoGate } from "./photo-gate";
import { useSettings } from "./settings-context";
import { clearLiveCache, useEvents, useMe, useMembers, useNotifications } from "@/lib/hooks";
import { signOutAction } from "@/app/actions/auth";

type NavItem = { k: string; href: string; label: string; icon: IconName; badge?: number; dot?: boolean; beta?: boolean };

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme, dataSource } = useSettings();
  const { data: me, dbId: meDbId, resolved: meResolved } = useMe();
  const { data: events } = useEvents();
  const { data: notifs } = useNotifications(meDbId);

  const [notifsOpen, setNotifsOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  // Synchroner Startwert (Server: false — dort wird eh nur der Splash
  // gerendert). Verhindert einen falschen ersten Frame bei Drawer/Popover.
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.innerWidth < 780,
  );
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { data: members } = useMembers();

  useEffect(() => {
    try {
      const raw = localStorage.getItem("sn_sidebar_collapsed");
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Hydration aus localStorage
      if (raw === "1") setSidebarCollapsed(true);
    } catch {}
  }, []);

  const toggleSidebar = () => {
    setSidebarCollapsed((v) => {
      const next = !v;
      try { localStorage.setItem("sn_sidebar_collapsed", next ? "1" : "0"); } catch {}
      return next;
    });
  };

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

  // Ausgeloggt (Session geklärt, kein User): direkt zum Login — der User
  // sieht nur den Boot-Splash, nie einen "Nicht eingeloggt"-Zwischenschritt.
  useEffect(() => {
    if (meResolved && !me) router.replace("/login");
  }, [meResolved, me, router]);

  // Nicht-Edge-Hüllen (alte App-Store-Hülle, contentInset 'always'): der
  // Sticky-Anker der Topbar wandert beim Scrollen unter die Status-Bar.
  // --sn-scroll füttert das mitwachsende Safe-Area-Padding der Topbar
  // (globals.css clampt auf env(safe-area-inset-top)). In JS auf 120px
  // gedeckelt, damit nach der Sättigung keine Style-Writes mehr anfallen.
  useEffect(() => {
    const root = document.documentElement;
    if (root.getAttribute("data-shell") === "edge") return;
    let last = -1;
    const onScroll = () => {
      const v = Math.min(Math.max(window.scrollY, 0), 120);
      if (v === last) return;
      last = v;
      root.style.setProperty("--sn-scroll", v + "px");
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Hintergrund-Scroll sperren, solange der Drawer offen ist — sonst
  // scrollt auf iOS die Seite hinter dem Menü mit (fühlt sich kaputt an).
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [mobileMenuOpen]);

  const upcoming = useMemo(() => events.filter((e) => e.status === "upcoming"), [events]);
  const unreadCount = notifs.filter((n) => n.unread).length;

  const navItems: NavItem[] = [
    { k: "dashboard", href: "/dashboard", label: "Dashboard", icon: "dashboard" },
    { k: "directory", href: "/directory", label: "Member", icon: "users" },
    { k: "events", href: "/events", label: "Events", icon: "calendar", badge: upcoming.length },
    { k: "messages", href: "/messages", label: "Messages", icon: "message" },
    { k: "feed", href: "/feed", label: "Community Feed", icon: "feed", beta: true },
  ];

  const adminItems: NavItem[] = me?.isAdmin
    ? [
        { k: "admin-overview", href: "/admin", label: "Übersicht", icon: "dashboard" },
        { k: "table-wishes", href: "/admin/table-wishes", label: "Tischwünsche", icon: "trophy" },
        { k: "profile-changes", href: "/admin/profile-changes", label: "Profil-Änderungen", icon: "users" },
      ]
    : [];

  const isActive = (href: string) => {
    // Exact-match-only paths: parents that would otherwise stay highlighted
    // while sub-routes are open (e.g. /admin would highlight on /admin/table-wishes).
    if (href === "/dashboard" || href === "/admin") return pathname === href;
    return pathname === href || pathname.startsWith(href + "/");
  };

  const currentNavLabel =
    [...navItems, ...adminItems].find((n) => isActive(n.href))?.label ||
    (pathname.startsWith("/directory/") ? "Member Detail" :
      pathname.startsWith("/events/") ? "Event" :
        pathname === "/profile" ? "Profil bearbeiten" : "Dashboard");

  const handleLogout = async () => {
    // Persistenter Live-Cache gehört zum User — beim Abmelden leeren.
    clearLiveCache();
    if (dataSource === "live") {
      await signOutAction();
    } else {
      router.push("/login");
    }
  };

  if (!meResolved || !me) {
    // Boot-Splash: erste Antwort der Session steht noch aus (oder der
    // Redirect zu /login läuft gerade). Wird auch serverseitig so gerendert —
    // dadurch blitzen beim Laden nie Demo-Daten oder Platzhalter auf.
    return (
      <div className="boot-splash" aria-label="Lädt">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-n.png" alt="SportNexus" />
      </div>
    );
  }

  return (
    // Desktop/Mobile-Chrome wird per CSS-Media-Query ein-/ausgeblendet (nicht
    // per isMobile-State): die JS-Erkennung greift erst nach dem ersten
    // Render und liess auf dem Handy kurz das Desktop-Layout aufblitzen.
    <div className="app" data-mobile={isMobile} data-sidebar={sidebarCollapsed ? "collapsed" : "expanded"}>
      <button
        type="button"
        className="sidebar-collapse-btn"
        onClick={toggleSidebar}
        aria-label={sidebarCollapsed ? "Sidebar ausklappen" : "Sidebar einklappen"}
        title={sidebarCollapsed ? "Sidebar ausklappen" : "Sidebar einklappen"}
      >
        <Icon
          name="chevron"
          size={12}
          style={{
            transform: sidebarCollapsed ? "rotate(0deg)" : "rotate(180deg)",
            transition: "transform 160ms",
          }}
        />
      </button>
      <aside className="sidebar sidebar-desktop">
          <div className="brand">
            <div className="brand-logo-wrap brand-logo-full">
              <LogoWordmark height={22} invert={theme === "dark"} />
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="brand-logo-n"
              src={theme === "dark" ? "/logo-n-black.png" : "/logo-n.png"}
              alt="SportNexus"
              style={{
                height: 24,
                width: "auto",
                filter: theme === "dark" ? "invert(1)" : "none",
              }}
            />
          </div>
          <div className="upper-label sidebar-label-area" style={{ padding: "0 8px 12px", marginTop: 6, fontSize: 10.5 }}>Memberbereich</div>

          <div className="nav-section-label">Community</div>
          {navItems.map((item) => (
            <Link
              key={item.k}
              href={item.href}
              className={"nav-item" + (isActive(item.href) ? " active" : "")}
              onClick={() => { setMobileMenuOpen(false); setNotifsOpen(false); }}
              title={sidebarCollapsed ? item.label : undefined}
            >
              <Icon name={item.icon} className="icon" />
              <span className="nav-label">{item.label}</span>
              {item.beta && (
                <span className="mono nav-beta" style={{ fontSize: 9, padding: "1px 5px", background: "var(--accent-soft)", color: "var(--accent)", borderRadius: 4, marginLeft: "auto" }}>
                  BETA
                </span>
              )}
              {typeof item.badge === "number" && item.badge > 0 && <span className="count-badge">{item.badge}</span>}
            </Link>
          ))}

          {adminItems.length > 0 && (
            <>
              <div className="nav-section-label">Admin</div>
              {adminItems.map((item) => (
                <Link
                  key={item.k}
                  href={item.href}
                  className={"nav-item" + (isActive(item.href) ? " active" : "")}
                  onClick={() => { setMobileMenuOpen(false); setNotifsOpen(false); }}
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  <Icon name={item.icon} className="icon" />
                  <span className="nav-label">{item.label}</span>
                </Link>
              ))}
            </>
          )}

          <div className="nav-section-label">Konto</div>
          <Link href="/profile" className={"nav-item" + (pathname === "/profile" ? " active" : "")} title={sidebarCollapsed ? "Profil bearbeiten" : undefined}>
            <Icon name="edit" className="icon" /><span className="nav-label">Profil bearbeiten</span>
          </Link>
          <Link href="/settings" className={"nav-item" + (pathname === "/settings" ? " active" : "")} title={sidebarCollapsed ? "Einstellungen" : undefined}>
            <Icon name="settings" className="icon" /><span className="nav-label">Einstellungen</span>
          </Link>
          <button className="nav-item" onClick={handleLogout} title={sidebarCollapsed ? "Abmelden" : undefined}>
            <Icon name="logout" className="icon" /><span className="nav-label">Abmelden</span>
          </button>

          <Link href="/profile" className="me" style={{ cursor: "pointer" }} title={sidebarCollapsed ? `${me.first} ${me.last}` : undefined}>
            <Avatar first={me.first} last={me.last} color={me.color} size={34} url={me.avatarUrl} />
            <div className="me-text" style={{ flex: 1, minWidth: 0 }}>
              <div className="me-name">{me.first} {me.last}</div>
              <div className="me-role" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {me.company}
              </div>
            </div>
          </Link>
        </aside>

      <div className="main">
        <div className="topbar">
          <button className="icon-btn topbar-hamburger" onClick={() => setMobileMenuOpen(true)} style={{ marginRight: 2 }}>
            <Icon name="menu" size={18} />
          </button>
          <div className="breadcrumbs">
            <span className="crumbs-mobile">
              <LogoWordmark height={18} invert={theme === "dark"} />
            </span>
            <span className="crumbs-desktop">
              <span>SportNexus</span>
              <span>/</span>
              <span className="crumb-current">{currentNavLabel}</span>
            </span>
          </div>
          <div className="search-global" onClick={() => setPaletteOpen(true)} role="button" tabIndex={0}>
            <Icon name="search" size={14} />
            <span style={{ flex: 1 }}>Mitglieder, Events, Seiten suchen...</span>
            <kbd>⌘K</kbd>
          </div>
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
          <span className="topbar-avatar-mobile">
            <Avatar first={me.first} last={me.last} color={me.color} size={30} url={me.avatarUrl} />
          </span>
        </div>

        <div className="content">{children}</div>
      </div>

      <div className="tabbar">
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
            className={"tabbar-item" + (isActive(it.href) ? " active" : "")}
          >
            <Icon name={it.icon} size={19} />
            <span className="tabbar-label">{it.l}</span>
          </Link>
        ))}
      </div>

      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 100 }}
        >
          <aside
            onClick={(e) => e.stopPropagation()}
            className="sidebar sidebar-drawer"
            style={{ position: "fixed", top: 0, left: 0, width: 260, height: "100dvh" }}
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
            {adminItems.length > 0 && (
              <>
                <div className="nav-section-label">Admin</div>
                {adminItems.map((item) => (
                  <Link
                    key={item.k}
                    href={item.href}
                    className={"nav-item" + (isActive(item.href) ? " active" : "")}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Icon name={item.icon} className="icon" />
                    <span>{item.label}</span>
                  </Link>
                ))}
              </>
            )}
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

      <PhotoGate />
    </div>
  );
}
