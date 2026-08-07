"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const nav = [
  ["/", "⌂", "Home"],
  ["/my-work", "✓", "My Work"],
  ["/tasks", "≡", "Tasks"],
  ["/assets", "▥", "Assets"],
  ["/projects", "◇", "Projects"],
] as const;

export function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

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
          <div className="search"><span>⌕</span><input placeholder="Search assets, projects, tasks…" aria-label="Global search"/><kbd>⌘ K</kbd></div>
          <div className="actions"><button className="bell" aria-label="Notifications">◇<i /></button><button className="create">＋ Create</button></div>
        </header>
        <main className="content">{children}</main>
      </section>
    </div>
  );
}
