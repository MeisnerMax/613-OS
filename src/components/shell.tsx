"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type FocusEvent, type ReactNode } from "react";
import notificationStyles from "./shell-notifications.module.css";
import searchStyles from "./shell-search.module.css";

const nav = [
  ["/", "⌂", "Home"],
  ["/my-work", "✓", "My Work"],
  ["/tasks", "≡", "Tasks"],
  ["/assets", "▥", "Assets"],
  ["/projects", "◇", "Projects"],
] as const;

type SearchResult = {
  type: "task" | "asset" | "project";
  id: string;
  title: string;
  subtitle: string;
  href: string;
};

type SearchResponse = {
  results?: SearchResult[];
  error?: string;
};

type BasicNotification = {
  id: string;
  taskId: string;
  kind: "overdue" | "waiting" | "due-soon";
  title: string;
  context: string;
  priority: "High" | "Medium" | "Low";
  href: string;
};

type NotificationResponse = {
  owner?: string;
  today?: string;
  count?: number;
  notifications?: BasicNotification[];
  error?: string;
};

export function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const searchInput = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchBusy, setSearchBusy] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notificationBusy, setNotificationBusy] = useState(false);
  const [notificationError, setNotificationError] = useState<string | null>(null);
  const [notificationOwner, setNotificationOwner] = useState<string | null>(null);
  const [notificationCount, setNotificationCount] = useState(0);
  const [notifications, setNotifications] = useState<BasicNotification[]>([]);

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setNotificationOpen(false);
        searchInput.current?.focus();
        setSearchOpen(true);
        return;
      }
      if (event.key === "Escape") {
        if (searchOpen) searchInput.current?.blur();
        setSearchOpen(false);
        setNotificationOpen(false);
      }
    }

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [searchOpen]);

  useEffect(() => {
    const controller = new AbortController();
    void loadNotifications(controller.signal);
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const needle = query.trim();
    if (needle.length < 2) {
      setResults([]);
      setSearchBusy(false);
      setSearchError(null);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearchBusy(true);
      setSearchError(null);

      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(needle)}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const data = await response.json() as SearchResponse;
        if (!response.ok) {
          setResults([]);
          setSearchError(searchErrorMessage(response.status, data.error));
          return;
        }
        setResults(data.results ?? []);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setResults([]);
        setSearchError("Search could not be loaded.");
      } finally {
        if (!controller.signal.aborted) setSearchBusy(false);
      }
    }, 180);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  async function loadNotifications(signal?: AbortSignal) {
    setNotificationBusy(true);
    setNotificationError(null);

    try {
      const response = await fetch("/api/notifications", { cache: "no-store", signal });
      const data = await response.json() as NotificationResponse;
      if (!response.ok) {
        setNotifications([]);
        setNotificationCount(0);
        setNotificationOwner(null);
        setNotificationError(notificationErrorMessage(response.status, data.error));
        return;
      }
      setNotifications(data.notifications ?? []);
      setNotificationCount(data.count ?? 0);
      setNotificationOwner(data.owner ?? null);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setNotifications([]);
      setNotificationCount(0);
      setNotificationOwner(null);
      setNotificationError("Notifications could not be loaded.");
    } finally {
      if (!signal?.aborted) setNotificationBusy(false);
    }
  }

  function closeSearch() {
    setSearchOpen(false);
    setQuery("");
    setResults([]);
    setSearchError(null);
  }

  function handleSearchBlur(event: FocusEvent<HTMLDivElement>) {
    const next = event.relatedTarget;
    if (next instanceof Node && event.currentTarget.contains(next)) return;
    setSearchOpen(false);
  }

  function handleNotificationBlur(event: FocusEvent<HTMLDivElement>) {
    const next = event.relatedTarget;
    if (next instanceof Node && event.currentTarget.contains(next)) return;
    setNotificationOpen(false);
  }

  function toggleNotifications() {
    const next = !notificationOpen;
    setSearchOpen(false);
    setNotificationOpen(next);
    if (next) void loadNotifications();
  }

  const showSearchResults = searchOpen && query.trim().length >= 2;

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brandMark">613</div>
          <div><strong>613 OS</strong><small>Operations</small></div>
        </div>
        <nav>
          {nav.map(([href, icon, label]) => (
            <Link key={href} href={href} className={`navItem ${pathname === href ? "active" : ""}`}>
              <span className="navIcon">{icon}</span><span>{label}</span>{label === "My Work" ? <em>7</em> : null}
            </Link>
          ))}
        </nav>
        <div className="user"><div className="avatar">MM</div><div><strong>Max Meisner</strong><small>Asset Management</small></div></div>
      </aside>
      <section className="workspace">
        <header className="topbar">
          <div className={`search ${searchStyles.host}`} onBlur={handleSearchBlur}>
            <span>⌕</span>
            <input
              ref={searchInput}
              value={query}
              onChange={(event) => { setNotificationOpen(false); setQuery(event.target.value); setSearchOpen(true); }}
              onFocus={() => { setNotificationOpen(false); setSearchOpen(true); }}
              placeholder="Search assets, projects, tasks…"
              aria-label="Global search"
              aria-expanded={showSearchResults}
              aria-controls="global-search-results"
              autoComplete="off"
            />
            <kbd>⌘ K</kbd>
            {showSearchResults ? <div className={searchStyles.results} id="global-search-results" role="listbox">
              {searchBusy ? <div className={searchStyles.state}>Searching…</div> : null}
              {!searchBusy && searchError ? <div className={`${searchStyles.state} ${searchStyles.error}`}>{searchError}</div> : null}
              {!searchBusy && !searchError && results.length === 0 ? <div className={searchStyles.state}>No matching Tasks, Assets or Projects.</div> : null}
              {!searchBusy && !searchError ? results.map((result) => <Link
                key={`${result.type}-${result.id}`}
                href={result.href}
                className={searchStyles.result}
                role="option"
                onClick={closeSearch}
              >
                <span className={`${searchStyles.type} ${searchTypeClass(result.type)}`}>{result.type}</span>
                <span className={searchStyles.text}>
                  <strong>{result.title}</strong>
                  <small>{result.id}{result.subtitle ? ` · ${result.subtitle}` : ""}</small>
                </span>
                <span className={searchStyles.arrow}>↗</span>
              </Link>) : null}
            </div> : null}
          </div>
          <div className="actions">
            <div className={notificationStyles.host} onBlur={handleNotificationBlur}>
              <button
                className={`bell ${notificationStyles.button}`}
                aria-label="Notifications"
                aria-expanded={notificationOpen}
                aria-controls="basic-notifications-panel"
                onClick={toggleNotifications}
              >
                <svg className={notificationStyles.icon} viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
                  <path d="M10 21h4" />
                </svg>
                {notificationCount > 0 ? <span className={notificationStyles.badge}>{notificationCount > 99 ? "99+" : notificationCount}</span> : null}
              </button>
              {notificationOpen ? <div className={notificationStyles.panel} id="basic-notifications-panel">
                <div className={notificationStyles.head}>
                  <div><strong>Needs attention</strong><small>{notificationOwner ? `${notificationOwner} · active task signals` : "Your active task signals"}</small></div>
                  <span className={notificationStyles.count}>{notificationCount}</span>
                </div>
                {notificationBusy ? <div className={notificationStyles.state}>Refreshing…</div> : null}
                {!notificationBusy && notificationError ? <div className={`${notificationStyles.state} ${notificationStyles.error}`}>{notificationError}</div> : null}
                {!notificationBusy && !notificationError && notifications.length === 0 ? <div className={notificationStyles.state}>Nothing needs your attention right now.</div> : null}
                {!notificationBusy && !notificationError ? notifications.map((notification) => <Link
                  key={notification.id}
                  href={notification.href}
                  className={notificationStyles.item}
                  onClick={() => setNotificationOpen(false)}
                >
                  <span className={`${notificationStyles.kind} ${notificationKindClass(notification.kind)}`}>{notificationKindLabel(notification.kind)}</span>
                  <span className={notificationStyles.text}>
                    <strong>{notification.title}</strong>
                    <small>{notification.context} · {notification.priority}</small>
                  </span>
                  <span className={notificationStyles.arrow}>↗</span>
                </Link>) : null}
              </div> : null}
            </div>
            <button className="create">＋ Create</button>
          </div>
        </header>
        <main className="content">{children}</main>
      </section>
    </div>
  );
}

function searchTypeClass(type: SearchResult["type"]) {
  if (type === "task") return searchStyles.task;
  if (type === "asset") return searchStyles.asset;
  return searchStyles.project;
}

function notificationKindClass(kind: BasicNotification["kind"]) {
  if (kind === "overdue") return notificationStyles.overdue;
  if (kind === "waiting") return notificationStyles.waiting;
  return notificationStyles.dueSoon;
}

function notificationKindLabel(kind: BasicNotification["kind"]) {
  if (kind === "overdue") return "Overdue";
  if (kind === "waiting") return "Waiting";
  return "Due soon";
}

function searchErrorMessage(status: number, code?: string) {
  if (status === 401 || code === "AUTH_REQUIRED") return "Connect your 613 Workspace session to search.";
  if (status === 403 || code === "WORKSPACE_DOMAIN_NOT_ALLOWED") return "This Google Workspace account is not allowed.";
  if (status === 503 || code === "SEARCH_SOURCE_NOT_READY") return "Search is temporarily unavailable while the database source is locked.";
  if (status === 400 || code === "QUERY_TOO_LONG") return "Search text is too long.";
  return "Search could not be loaded.";
}

function notificationErrorMessage(status: number, code?: string) {
  if (status === 401 || code === "AUTH_REQUIRED") return "Connect your 613 Workspace session to view notifications.";
  if (status === 403 || code === "WORKSPACE_DOMAIN_NOT_ALLOWED") return "This Google Workspace account is not allowed.";
  if (status === 503 || code === "NOTIFICATION_SOURCE_NOT_READY") return "Notifications are unavailable while the task database source is locked.";
  return "Notifications could not be loaded.";
}
