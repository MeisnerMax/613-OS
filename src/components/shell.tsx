"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type FocusEvent, type ReactNode } from "react";
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

export function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const searchInput = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchBusy, setSearchBusy] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchInput.current?.focus();
        setSearchOpen(true);
        return;
      }
      if (event.key === "Escape" && searchOpen) {
        setSearchOpen(false);
        searchInput.current?.blur();
      }
    }

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [searchOpen]);

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
              onChange={(event) => { setQuery(event.target.value); setSearchOpen(true); }}
              onFocus={() => setSearchOpen(true)}
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
          <div className="actions"><button className="bell" aria-label="Notifications">◇<i /></button><button className="create">＋ Create</button></div>
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

function searchErrorMessage(status: number, code?: string) {
  if (status === 401 || code === "AUTH_REQUIRED") return "Connect your 613 Workspace session to search.";
  if (status === 403 || code === "WORKSPACE_DOMAIN_NOT_ALLOWED") return "This Google Workspace account is not allowed.";
  if (status === 503 || code === "SEARCH_SOURCE_NOT_READY") return "Search is temporarily unavailable while the database source is locked.";
  if (status === 400 || code === "QUERY_TOO_LONG") return "Search text is too long.";
  return "Search could not be loaded.";
}
