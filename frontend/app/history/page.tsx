"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

const STAGGER_CONTAINER: any = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const FADE_UP: any = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 65, damping: 20 } }
};

export default function HistoryPage() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchHistory = async () => {
      const token = localStorage.getItem("token");

      try {
        if (token && token !== "undefined" && token !== "null") {
          setIsLoggedIn(true);
          const response = await axios.get("http://localhost:8000/history", {
            headers: { Authorization: `Bearer ${token}` },
          });
          setHistory(response.data);
        } else {
          setIsLoggedIn(false);
          // No auth — show empty state prompting login
          setHistory([]);
        }
      } catch (error: any) {
        if (error?.response?.status === 401) {
          // Token expired or invalid — clear and redirect
          localStorage.removeItem("token");
          localStorage.removeItem("user_name");
          router.push("/login");
        } else {
          console.error("Error fetching history:", error);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  function getCategoryClass(cat: string) {
    if (cat === "Calm") return "badge-calm";
    if (cat === "Moderate") return "badge-moderate";
    if (cat === "High") return "badge-high";
    return "badge-over";
  }

  function getScoreColor(score: number) {
    if (score >= 80) return "#f87171";
    if (score >= 60) return "#fb923c";
    if (score >= 40) return "#facc15";
    return "#34d399";
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", color: "var(--muted)", fontSize: "0.875rem" }}>
          <span className="spinner" style={{ borderTopColor: "var(--muted)", borderColor: "rgba(255,255,255,0.1)" }} />
          Loading history...
        </div>
      </div>
    );
  }

  if (!history.length) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "1rem" }}>
        {!isLoggedIn ? (
          <>
            <div style={{ color: "var(--muted)", fontSize: "0.9rem" }}>Sign in to see your analysis history.</div>
            <Link href="/login" className="btn-primary" style={{ fontSize: "0.82rem" }}>Sign in →</Link>
          </>
        ) : (
          <>
            <div style={{ color: "var(--muted)", fontSize: "0.9rem" }}>No history yet.</div>
            <Link href="/" className="btn-primary" style={{ fontSize: "0.82rem" }}>← Analyze a Video</Link>
          </>
        )}
      </div>
    );
  }

  return (
    <motion.div 
      className="container-section" 
      style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}
      variants={STAGGER_CONTAINER}
      initial="hidden"
      animate="show"
    >

      {/* HEADER */}
      <motion.div variants={FADE_UP}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.7rem", fontFamily: "monospace", color: "var(--muted)", marginBottom: "1rem" }}>
          <Link href="/" style={{ color: "var(--muted)", textDecoration: "none" }}>Home</Link>
          <span>/</span>
          <span style={{ color: "var(--foreground)" }}>History</span>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h1 className="display-font" style={{ fontSize: "clamp(1.8rem, 4vw, 2.75rem)", fontWeight: 600, letterSpacing: "-0.02em", marginBottom: "0.35rem", color: "#ffffff" }}>
              Analysis History
            </h1>
            <p className="sans" style={{ color: "var(--muted-mid)", fontSize: "0.95rem" }}>
              {isLoggedIn ? "Your personal analysis history." : "All analyses (sign in to see only yours)."}
            </p>
          </div>
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            {!isLoggedIn && (
              <Link href="/login" className="btn-secondary" style={{ fontSize: "0.85rem", padding: "0.6rem 1.1rem" }}>
                Sign in for your history
              </Link>
            )}
            <Link href="/" className="btn-primary" style={{ fontSize: "0.85rem", padding: "0.6rem 1.1rem" }}>
              + Analyze Video
            </Link>
          </div>
        </div>
      </motion.div>

      {/* Summary stats */}
      <motion.div variants={FADE_UP} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "1rem" }}>
        {[
          { label: "Total Analyzed",  val: history.length, unit: "videos" },
          { label: "Avg AFI",          val: history.length ? (history.reduce((s, h) => s + (h.final_afi || 0), 0) / history.length).toFixed(1) : 0, unit: "/100" },
          { label: "High Stimulation", val: history.filter((h) => (h.final_afi || 0) >= 70).length, unit: "videos" },
        ].map((s, i) => (
          <div key={i} className="card-glass" style={{ padding: "1.75rem 1.5rem" }}>
            <div className="sans" style={{ color: "var(--muted-mid)", fontSize: "0.95rem", marginBottom: "0.5rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.label}</div>
            <div className="mono" style={{ fontSize: "2rem", fontWeight: 700, color: "var(--primary)" }}>
              {s.val}<span className="sans" style={{ fontSize: "0.85rem", color: "var(--muted-mid)", fontWeight: 500, marginLeft: "0.3rem" }}>{s.unit}</span>
            </div>
          </div>
        ))}
      </motion.div>

      {/* TABLE */}
      <motion.div variants={FADE_UP} className="card-glass" style={{ overflow: "hidden", padding: "1.5rem 0" }}>
        <div style={{ overflowX: "auto" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th className="sans" style={{ color: "var(--muted-mid)", fontSize: "0.85rem" }}>Video</th>
                <th className="sans" style={{ color: "var(--muted-mid)", fontSize: "0.85rem" }}>AFI Score</th>
                <th className="sans" style={{ color: "var(--muted-mid)", fontSize: "0.85rem" }}>Category</th>
                <th className="sans" style={{ color: "var(--muted-mid)", fontSize: "0.85rem" }}>Visual</th>
                <th className="sans" style={{ color: "var(--muted-mid)", fontSize: "0.85rem" }}>Date</th>
              </tr>
            </thead>
            <motion.tbody
              variants={STAGGER_CONTAINER}
              initial="hidden"
              animate="show"
            >
              {history.map((item) => (
                <motion.tr variants={FADE_UP} key={item.id} style={{ borderBottom: "1px solid var(--card-border)" }}>
                  <td>
                    <div className="sans" style={{ fontWeight: 500, fontSize: "0.95rem", maxWidth: "260px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#ffffff" }}>
                      {item.url ? (
                        <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ color: "inherit", textDecoration: "underline", textUnderlineOffset: "4px" }}>{item.url}</a>
                      ) : (
                        item.video_name || item.video_path || "Video"
                      )}
                    </div>
                  </td>
                  <td>
                    <span className="mono" style={{ fontSize: "1.25rem", fontWeight: 700, color: getScoreColor(item.final_afi || 0) }}>
                      {item.final_afi?.toFixed(2)}
                    </span>
                  </td>
                  <td>
                    <span className={`tag-badge ${getCategoryClass(item.category)}`} style={{ borderRadius: "100px", border: "none", padding: "0.4rem 1rem", letterSpacing: "0.1em" }}>
                      {item.category}
                    </span>
                  </td>
                  <td>
                    <span className="mono" style={{ fontSize: "0.95rem", color: "var(--muted-mid)" }}>
                      {item.visual_score?.toFixed(1) ?? "—"}
                    </span>
                  </td>
                  <td>
                    <span className="sans" style={{ fontSize: "0.95rem", color: "var(--muted-mid)" }}>
                      {new Date(item.created_at).toLocaleDateString()}
                    </span>
                  </td>
                </motion.tr>
              ))}
            </motion.tbody>
          </table>
        </div>
      </motion.div>

      {/* Footer nav */}
      <motion.div variants={FADE_UP} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "1rem", paddingTop: "0.5rem" }}>
        {[
          { href: "/results",   icon: "←",  label: "Latest Results",  desc: "View most recent analysis" },
          { href: "/compare",   icon: "⇄",  label: "Compare Videos",  desc: "Side-by-side comparison" },
          { href: "/wellbeing", icon: "◎",  label: "Wellness",         desc: "Media health overview" },
        ].map((n) => (
          <Link key={n.href} href={n.href} style={{ textDecoration: "none" }}>
            <div className="card-glass card-hover" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <div className="mono" style={{ color: "var(--primary)", fontSize: "1.1rem", marginBottom: "0.75rem" }}>{n.icon}</div>
              <div className="sans" style={{ fontWeight: 600, fontSize: "1rem", marginBottom: "0.3rem", color: "#ffffff" }}>{n.label}</div>
              <div className="sans" style={{ color: "var(--muted-mid)", fontSize: "0.85rem" }}>{n.desc}</div>
            </div>
          </Link>
        ))}
      </motion.div>
    </motion.div>
  );
}