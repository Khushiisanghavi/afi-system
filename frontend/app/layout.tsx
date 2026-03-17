import "./globals.css";
import Link from "next/link";

export const metadata = {
  title: "AFI — Attention Fragmentation Index",
  description: "Analyze short-form videos for attention stimulation using AI.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ background: "#05050f", color: "#e8e8f0", minHeight: "100vh" }}>
        <Navbar />
        <main style={{ paddingTop: "4.5rem" }}>{children}</main>
      </body>
    </html>
  );
}

function Navbar() {
  return (
    <nav style={{
      position: "fixed",
      top: 0, left: 0, right: 0,
      zIndex: 100,
      borderBottom: "1px solid rgba(167,139,250,0.1)",
      background: "rgba(5,5,15,0.85)",
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
    }}>
      <style>{`
        .nav-link {
          font-family: 'Tenor Sans', sans-serif;
          font-size: 0.82rem;
          font-weight: 500;
          color: rgba(232,232,240,0.45);
          text-decoration: none;
          padding: 0.4rem 0.9rem;
          border-radius: 0.3rem;
          transition: color 0.2s, background 0.2s;
          position: relative;
        }
        .nav-link:hover {
          color: rgba(232,232,240,0.9);
          background: rgba(167,139,250,0.08);
        }
        .nav-link::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 0;
          height: 1px;
          background: #a78bfa;
          transition: width 0.25s ease;
        }
        .nav-link:hover::after { width: 55%; }

        .nav-cta {
          font-family: 'Space Mono', monospace;
          font-size: 0.65rem;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #05050f;
          background: #a78bfa;
          padding: 0.5rem 1.1rem;
          font-weight: 700;
          text-decoration: none;
          transition: background 0.2s;
          display: inline-block;
        }
        .nav-cta:hover { background: #8b6fe8; }
      `}</style>

      <div style={{
        maxWidth: "72rem",
        margin: "0 auto",
        padding: "0 2rem",
        height: "4rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>

        {/* Logo */}
        <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <div style={{
            width: "1.75rem", height: "1.75rem",
            borderRadius: "0.35rem",
            background: "#a78bfa",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
              <path d="M7 1L13 7L7 13L1 7L7 1Z" fill="#05050f" />
              <circle cx="7" cy="7" r="2.5" fill="#05050f" />
            </svg>
          </div>
          <span style={{
            fontFamily: "'Tenor Sans', sans-serif",
            fontWeight: 700,
            fontSize: "0.95rem",
            letterSpacing: "0.04em",
            color: "#e8e8f0",
          }}>
            AFI
          </span>
          <span style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: "0.65rem",
            color: "rgba(167,139,250,0.45)",
            letterSpacing: "0.05em",
          }}>
            /attention-index
          </span>
        </Link>

        {/* Nav Links */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
          <Link href="/"         className="nav-link">Home</Link>
          <Link href="/results"  className="nav-link">Results</Link>
          <Link href="/compare"  className="nav-link">Compare</Link>
          <Link href="/history"  className="nav-link">History</Link>
          <Link href="/wellness" className="nav-link">Wellness</Link>
        </div>

        {/* CTA */}
        <Link href="/" className="nav-cta">
          Analyze
        </Link>

      </div>
    </nav>
  );
}