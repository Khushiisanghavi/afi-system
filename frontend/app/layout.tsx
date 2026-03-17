import "./globals.css";
import Link from "next/link";

export const metadata = {
  title: "AFI — Attention Fragmentation Index",
  description: "Attention Fragmentation Index",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen" style={{ background: "var(--background)", color: "var(--foreground)" }}>
        <Navbar />
        <main className="pt-16">{children}</main>
      </body>
    </html>
  );
}

function Navbar() {
  return (
    <nav
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        borderBottom: "1px solid var(--border)",
        background: "rgba(10,10,10,0.85)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
      }}
    >
      <div
        style={{
          maxWidth: "72rem",
          margin: "0 auto",
          padding: "0 1.5rem",
          height: "3.75rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Logo */}
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: "0.5rem", textDecoration: "none" }}>
          <div
            style={{
              width: "1.75rem",
              height: "1.75rem",
              borderRadius: "0.375rem",
              background: "var(--primary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
              <path d="M7 1L13 7L7 13L1 7L7 1Z" fill="#0a0a0a" />
              <circle cx="7" cy="7" r="2.5" fill="#0a0a0a" />
            </svg>
          </div>
          <span style={{ fontWeight: 800, fontSize: "0.9rem", letterSpacing: "-0.01em", color: "var(--foreground)" }}>
            AFI
          </span>
          <span className="mono" style={{ color: "var(--muted)", fontSize: "0.7rem", marginLeft: "0.1rem" }}>
            /attention-index
          </span>
        </Link>

        {/* Nav links */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
          <NavItem href="/" label="Home" />
          <NavItem href="/results" label="Results" />
          <NavItem href="/compare" label="Compare" />
          <NavItem href="/history" label="History" />
          <NavItem href="/wellness" label="Wellness" />
        </div>

        {/* CTA */}
        <Link
          href="/"
          className="btn-primary"
          style={{ fontSize: "0.8rem", padding: "0.45rem 1rem" }}
        >
          Analyze Video
        </Link>
      </div>
    </nav>
  );
}

function NavItem({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      style={{ textDecoration: "none" }}
      className="nav-item"
    >
      <style>{`
        .nav-item {
          position: relative;
          padding: 0.4rem 0.85rem;
          font-size: 0.82rem;
          font-weight: 500;
          color: var(--muted);
          border-radius: 0.4rem;
          transition: color 0.2s, background 0.2s;
        }
        .nav-item:hover {
          color: var(--foreground);
          background: rgba(255,255,255,0.04);
        }
        .nav-item::after {
          content: '';
          position: absolute;
          bottom: -1px;
          left: 50%;
          transform: translateX(-50%);
          width: 0;
          height: 1px;
          background: var(--primary);
          transition: width 0.25s;
        }
        .nav-item:hover::after { width: 60%; }
      `}</style>
      {label}
    </Link>
  );
}