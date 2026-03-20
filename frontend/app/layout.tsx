import "./globals.css";
import Link from "next/link";

export const metadata = {
  title: "AFI – Attention Fragmentation Index",
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
          font-family: 'Inter', sans-serif;
          font-size: 0.9rem;
          font-weight: 500;
          color: rgba(232, 232, 240, 0.6);
          text-decoration: none;
          padding: 0.5rem 1rem;
          border-radius: 6px;
          transition: all 0.2s ease;
          position: relative;
        }
        .nav-link:hover {
          color: rgba(232, 232, 240, 1);
          background: rgba(255, 255, 255, 0.05);
        }
        .nav-link::after {
          content: '';
          position: absolute;
          bottom: 4px;
          left: 50%;
          transform: translateX(-50%);
          width: 0;
          height: 2px;
          background: var(--primary);
          transition: width 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          border-radius: 2px;
          opacity: 0;
        }
        .nav-link:hover::after { width: 40%; opacity: 1; }

        .nav-link-creator {
          font-family: 'Inter', sans-serif;
          font-size: 0.9rem;
          font-weight: 500;
          color: rgba(129, 140, 248, 0.8);
          text-decoration: none;
          padding: 0.5rem 1rem;
          border-radius: 6px;
          transition: all 0.2s ease;
          position: relative;
        }
        .nav-link-creator:hover {
          color: rgba(129, 140, 248, 1);
          background: rgba(129, 140, 248, 0.08);
        }
        .nav-link-creator::after {
          content: '';
          position: absolute;
          bottom: 4px;
          left: 50%;
          transform: translateX(-50%);
          width: 0;
          height: 2px;
          background: #818cf8;
          transition: width 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          border-radius: 2px;
          opacity: 0;
        }
        .nav-link-creator:hover::after { width: 40%; opacity: 1; }

        .nav-link-wellbeing {
          font-family: 'Inter', sans-serif;
          font-size: 0.9rem;
          font-weight: 500;
          color: rgba(45, 212, 191, 0.8);
          text-decoration: none;
          padding: 0.5rem 1rem;
          border-radius: 6px;
          transition: all 0.2s ease;
          position: relative;
        }
        .nav-link-wellbeing:hover {
          color: rgba(45, 212, 191, 1);
          background: rgba(45, 212, 191, 0.08);
        }
        .nav-link-wellbeing::after {
          content: '';
          position: absolute;
          bottom: 4px;
          left: 50%;
          transform: translateX(-50%);
          width: 0;
          height: 2px;
          background: #2dd4bf;
          transition: width 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          border-radius: 2px;
          opacity: 0;
        }
        .nav-link-wellbeing:hover::after { width: 40%; opacity: 1; }

        .nav-divider {
          width: 1px;
          height: 1.2rem;
          background: rgba(167, 139, 250, 0.2);
          margin: 0 0.25rem;
          flex-shrink: 0;
        }

        .nav-cta {
          font-family: 'Inter', sans-serif;
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--primary-text);
          background: var(--primary);
          padding: 0.5rem 1.2rem;
          border-radius: 6px;
          text-decoration: none;
          transition: all 0.2s ease;
          display: inline-block;
          box-shadow: 0 2px 8px rgba(167, 139, 250, 0.15);
        }
        .nav-cta:hover {
          background: #b59cfc;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(167, 139, 250, 0.25);
        }
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
            fontFamily: "'Outfit', sans-serif",
            fontWeight: 600,
            fontSize: "1.1rem",
            letterSpacing: "0.02em",
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

          <div className="nav-divider" />

          <Link href="/creator"   className="nav-link-creator">Creator Studio</Link>
          <Link href="/wellbeing" className="nav-link-wellbeing">Wellbeing</Link>
        </div>

        {/* CTA */}
        <Link href="/" className="nav-cta">
          Analyze
        </Link>

      </div>
    </nav>
  );
}
