"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [userName, setUserName] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setUserName(localStorage.getItem("user_name"));
    setUserEmail(localStorage.getItem("user_email"));
    const handleStorage = () => {
      setUserName(localStorage.getItem("user_name"));
      setUserEmail(localStorage.getItem("user_email"));
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [pathname]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user_id");
    localStorage.removeItem("user_name");
    localStorage.removeItem("user_email");
    setUserName(null);
    setUserEmail(null);
    setDropdownOpen(false);
    router.push("/");
  };

  const initials = userName
    ? userName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "";

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
          font-size: 0.9rem; font-weight: 500;
          color: rgba(232, 232, 240, 0.6);
          text-decoration: none;
          padding: 0.5rem 1rem; border-radius: 6px;
          transition: all 0.2s ease; position: relative;
        }
        .nav-link:hover {
          color: rgba(232, 232, 240, 1);
          background: rgba(255, 255, 255, 0.05);
        }
        .nav-link::after {
          content: ''; position: absolute;
          bottom: 4px; left: 50%; transform: translateX(-50%);
          width: 0; height: 2px; background: #a78bfa;
          transition: width 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          border-radius: 2px; opacity: 0;
        }
        .nav-link:hover::after { width: 40%; opacity: 1; }

        .nav-link-creator {
          font-family: 'Inter', sans-serif;
          font-size: 0.9rem; font-weight: 500;
          color: rgba(129, 140, 248, 0.8);
          text-decoration: none;
          padding: 0.5rem 1rem; border-radius: 6px;
          transition: all 0.2s ease; position: relative;
        }
        .nav-link-creator:hover {
          color: rgba(129, 140, 248, 1);
          background: rgba(129, 140, 248, 0.08);
        }
        .nav-link-creator::after {
          content: ''; position: absolute;
          bottom: 4px; left: 50%; transform: translateX(-50%);
          width: 0; height: 2px; background: #818cf8;
          transition: width 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          border-radius: 2px; opacity: 0;
        }
        .nav-link-creator:hover::after { width: 40%; opacity: 1; }

        .nav-link-wellbeing {
          font-family: 'Inter', sans-serif;
          font-size: 0.9rem; font-weight: 500;
          color: rgba(45, 212, 191, 0.8);
          text-decoration: none;
          padding: 0.5rem 1rem; border-radius: 6px;
          transition: all 0.2s ease; position: relative;
        }
        .nav-link-wellbeing:hover {
          color: rgba(45, 212, 191, 1);
          background: rgba(45, 212, 191, 0.08);
        }
        .nav-link-wellbeing::after {
          content: ''; position: absolute;
          bottom: 4px; left: 50%; transform: translateX(-50%);
          width: 0; height: 2px; background: #2dd4bf;
          transition: width 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          border-radius: 2px; opacity: 0;
        }
        .nav-link-wellbeing:hover::after { width: 40%; opacity: 1; }

        .nav-divider {
          width: 1px; height: 1.2rem;
          background: rgba(167, 139, 250, 0.2);
          margin: 0 0.25rem; flex-shrink: 0;
        }

        .nav-cta {
          font-family: 'Inter', sans-serif;
          font-size: 0.85rem; font-weight: 600;
          color: #05050f; background: #a78bfa;
          padding: 0.5rem 1.2rem; border-radius: 6px;
          text-decoration: none; transition: all 0.2s ease;
          display: inline-block;
          box-shadow: 0 2px 8px rgba(167, 139, 250, 0.15);
        }
        .nav-cta:hover {
          background: #b59cfc;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(167, 139, 250, 0.25);
        }

        .profile-avatar {
          width: 2rem; height: 2rem; border-radius: 50%;
          background: linear-gradient(135deg, #a78bfa, #818cf8);
          border: 1.5px solid rgba(167, 139, 250, 0.4);
          display: flex; align-items: center; justify-content: center;
          font-family: 'Inter', sans-serif;
          font-size: 0.7rem; font-weight: 700; color: #05050f;
          cursor: pointer; transition: all 0.2s ease; flex-shrink: 0;
        }
        .profile-avatar:hover {
          border-color: rgba(167, 139, 250, 0.8);
          box-shadow: 0 0 12px rgba(167, 139, 250, 0.35);
          transform: scale(1.06);
        }

        .profile-avatar-empty {
          width: 2rem; height: 2rem; border-radius: 50%;
          background: rgba(167, 139, 250, 0.07);
          border: 1.5px solid rgba(167, 139, 250, 0.2);
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: all 0.2s ease;
          text-decoration: none; flex-shrink: 0;
        }
        .profile-avatar-empty:hover {
          border-color: rgba(167, 139, 250, 0.5);
          background: rgba(167, 139, 250, 0.12);
        }

        .profile-dropdown {
          position: absolute;
          top: calc(100% + 0.75rem); right: 0;
          min-width: 13rem;
          background: rgba(10, 10, 22, 0.97);
          border: 1px solid rgba(167, 139, 250, 0.18);
          border-radius: 10px;
          box-shadow: 0 16px 40px rgba(0,0,0,0.55), 0 0 0 1px rgba(167,139,250,0.04);
          backdrop-filter: blur(20px);
          overflow: hidden;
          animation: dropIn 0.15s ease;
        }
        @keyframes dropIn {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .dropdown-header {
          padding: 0.9rem 1rem 0.75rem;
          border-bottom: 1px solid rgba(167, 139, 250, 0.1);
        }

        .dropdown-item {
          display: flex; align-items: center; gap: 0.6rem;
          padding: 0.65rem 1rem;
          font-family: 'Inter', sans-serif;
          font-size: 0.85rem; font-weight: 500;
          color: rgba(232, 232, 240, 0.65);
          text-decoration: none; transition: all 0.15s ease;
          cursor: pointer; border: none; background: none;
          width: 100%; text-align: left;
        }
        .dropdown-item:hover {
          color: rgba(232, 232, 240, 0.95);
          background: rgba(167, 139, 250, 0.07);
        }
        .dropdown-item.danger:hover {
          color: #f87171;
          background: rgba(248, 113, 113, 0.07);
        }
        .dropdown-divider {
          height: 1px;
          background: rgba(167, 139, 250, 0.1);
          margin: 0.25rem 0;
        }
      `}</style>

      <div style={{
        maxWidth: "72rem", margin: "0 auto",
        padding: "0 2rem", height: "4rem",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>

        {/* Logo */}
        <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <div style={{
            width: "1.75rem", height: "1.75rem", borderRadius: "0.35rem",
            background: "#a78bfa",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
              <path d="M7 1L13 7L7 13L1 7L7 1Z" fill="#05050f" />
              <circle cx="7" cy="7" r="2.5" fill="#05050f" />
            </svg>
          </div>
          <span style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 600, fontSize: "1.1rem", letterSpacing: "0.02em", color: "#e8e8f0" }}>AFI</span>
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.65rem", color: "rgba(167,139,250,0.45)", letterSpacing: "0.05em" }}>/attention-index</span>
        </Link>

        {/* Nav links */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
          <Link href="/"         className="nav-link">Home</Link>
          <Link href="/results"  className="nav-link">Results</Link>
          <Link href="/compare"  className="nav-link">Compare</Link>
          <Link href="/history"  className="nav-link">History</Link>
          <Link href="/reports" className="nav-link">Reports</Link>
          <div className="nav-divider" />
          <Link href="/creator"   className="nav-link-creator">Creator Studio</Link>
          <Link href="/wellbeing" className="nav-link-wellbeing">Wellbeing</Link>
        </div>

        {/* Right — CTA + profile */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <Link href="/" className="nav-cta">Analyze</Link>

          <div ref={dropdownRef} style={{ position: "relative" }}>
            {userName ? (
              <button className="profile-avatar" onClick={() => setDropdownOpen((o) => !o)} title={userName}>
                {initials}
              </button>
            ) : (
              <Link href="/login" className="profile-avatar-empty" title="Sign in">
                <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
                  <circle cx="10" cy="7" r="3.5" stroke="rgba(167,139,250,0.6)" strokeWidth="1.5"/>
                  <path d="M3 17c0-3.314 3.134-6 7-6s7 2.686 7 6" stroke="rgba(167,139,250,0.6)" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </Link>
            )}

            {dropdownOpen && userName && (
              <div className="profile-dropdown">
                <div className="dropdown-header">
                  <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.875rem", fontWeight: 600, color: "#e8e8f0", marginBottom: "0.2rem" }}>
                    {userName}
                  </div>
                  <div style={{ fontFamily: "monospace", fontSize: "0.72rem", color: "rgba(167,139,250,0.5)" }}>
                    {userEmail}
                  </div>
                </div>

                <div style={{ padding: "0.3rem 0" }}>
                  <Link href="/history" className="dropdown-item" onClick={() => setDropdownOpen(false)}>
                    <svg width="14" height="14" viewBox="0 0 20 20" fill="none"><path d="M10 6v4l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.5"/></svg>
                    My History
                  </Link>
                  <Link href="/wellness" className="dropdown-item" onClick={() => setDropdownOpen(false)}>
                    <svg width="14" height="14" viewBox="0 0 20 20" fill="none"><path d="M10 3.5C6.41 3.5 3.5 6.41 3.5 10S6.41 16.5 10 16.5 16.5 13.59 16.5 10 13.59 3.5 10 3.5z" stroke="currentColor" strokeWidth="1.5"/><path d="M7 10l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    Wellness
                  </Link>
                  <Link href="/wellbeing" className="dropdown-item" onClick={() => setDropdownOpen(false)}>
                    <svg width="14" height="14" viewBox="0 0 20 20" fill="none"><path d="M10 17s-7-4.5-7-9a7 7 0 0114 0c0 4.5-7 9-7 9z" stroke="currentColor" strokeWidth="1.5"/></svg>
                    Wellbeing
                  </Link>
                  <div className="dropdown-divider" />
                  <button className="dropdown-item danger" onClick={handleLogout}>
                    <svg width="14" height="14" viewBox="0 0 20 20" fill="none"><path d="M13 15l4-5-4-5M17 10H7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M9 5H5a1 1 0 00-1 1v8a1 1 0 001 1h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                    Log out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </nav>
  );
}