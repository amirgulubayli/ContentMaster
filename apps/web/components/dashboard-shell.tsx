import Link from "next/link";

const navItems = [
  { href: "/", label: "Overview" },
  { href: "/accounts", label: "Accounts" },
  { href: "/connect", label: "Connect" },
  { href: "/proxies", label: "Proxies" },
  { href: "/session-vault", label: "Session Vault" },
  { href: "/content-studio", label: "Content Studio" },
  { href: "/inbox", label: "Inbox" },
  { href: "/openclaw", label: "OpenClaw" },
  { href: "/audit", label: "Audit" }
];

export function DashboardShell({
  title,
  description,
  children
}: Readonly<{
  title: string;
  description: string;
  children: React.ReactNode;
}>) {
  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div>
          <p className="eyebrow">Content Empire</p>
          <h2 className="sidebar-title">Operator Network</h2>
          <p className="sidebar-copy">
            Private command layer for human oversight and OpenClaw automation.
          </p>
        </div>
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} prefetch={false}>
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <section className="content-shell">
        <header className="page-header">
          <div>
            <p className="eyebrow">Private Access</p>
            <h1 className="page-title">{title}</h1>
            <p className="lede">{description}</p>
          </div>
        </header>
        {children}
      </section>
    </main>
  );
}
