"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

interface CreatorHistoryItem {
  id: number;
  video_name: string | null;
  captivation_score: number;
  captivation_category: string;
  trend_match_score: number;
  created_at: string;
}

function getCaptivationColor(score: number) {
  if (score >= 75) return "#34d399";
  if (score >= 50) return "#a78bfa";
  if (score >= 30) return "#fb923c";
  return "#f87171";
}

function getCategoryStyle(cat: string): { color: string; bg: string } {
  switch (cat) {
    case "Very High": return { color: "#34d399", bg: "rgba(52,211,153,0.1)" };
    case "High":      return { color: "#818cf8", bg: "rgba(129,140,248,0.1)" };
    case "Medium":    return { color: "#fb923c", bg: "rgba(251,146,60,0.1)" };
    default:          return { color: "#f87171", bg: "rgba(248,113,113,0.1)" };
  }
}

function truncateName(name: string | null, maxLen = 22): string {
  if (!name) return "Untitled";
  const withoutExt = name.replace(/\.[^/.]+$/, "");
  if (withoutExt.length <= maxLen) return withoutExt;
  return withoutExt.slice(0, maxLen) + "…";
}

export default function CreatorStudioPage() {
  const [history, setHistory] = useState<CreatorHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { setLoading(false); return; }
    setLoggedIn(true);
    fetch("http://localhost:8000/creator/history", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => setHistory(Array.isArray(data) ? data : []))
      .catch(() => setHistory([]))
      .finally(() => setLoading(false));
  }, []);

  const avgCaptivation = history.length > 0
    ? (history.reduce((s, h) => s + h.captivation_score, 0) / history.length).toFixed(1)
    : null;
  const best = history.length > 0
    ? history.reduce((a, b) => (a.captivation_score > b.captivation_score ? a : b))
    : null;

  return (
    <div style={{ position: "relative", zIndex: 1, minHeight: "100vh" }}>
      <div className="container-section" style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>

        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.7rem", fontFamily: "monospace", color: "var(--muted)" }}>
          <Link href="/" style={{ color: "var(--muted)", textDecoration: "none" }}>Home</Link>
          <span>/</span>
          <span style={{ color: "#818cf8" }}>Creator Studio</span>
        </div>

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "1.5rem" }}>
          <div>
            <div style={{ marginBottom: "0.75rem" }}>
              <span style={{ fontFamily: "monospace", fontSize: "0.65rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "#818cf8", background: "rgba(129,140,248,0.1)", border: "1px solid rgba(129,140,248,0.2)", padding: "0.25rem 0.6rem", borderRadius: "4px" }}>Creator Studio</span>
            </div>
            <h1 className="display-font" style={{ fontSize: "clamp(1.8rem, 4vw, 2.75rem)", fontWeight: 600, letterSpacing: "-0.02em", color: "#ffffff", marginBottom: "0.5rem" }}>
              Improve Your Content
            </h1>
            <p className="sans" style={{ color: "rgba(232,232,240,0.5)", fontSize: "0.95rem", maxWidth: "36rem", lineHeight: 1.7 }}>
              Analyze your videos for captivation score, platform trend alignment, and get actionable recommendations.
            </p>
          </div>
          <Link href="/creator/upload" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", background: "linear-gradient(135deg, #818cf8, #6366f1)", color: "#ffffff", textDecoration: "none", padding: "0.7rem 1.4rem", borderRadius: "8px", fontSize: "0.9rem", fontWeight: 600, boxShadow: "0 4px 16px rgba(99,102,241,0.3)", flexShrink: 0 }}>
            Analyze a video →
          </Link>
        </div>

        {!loggedIn && !loading && (
          <div className="card-glass" style={{ padding: "3rem", textAlign: "center" }}>
            <p className="sans" style={{ color: "rgba(232,232,240,0.6)", marginBottom: "1.5rem" }}>Sign in to access Creator Studio.</p>
            <Link href="/login" style={{ display: "inline-block", background: "linear-gradient(135deg, #818cf8, #6366f1)", color: "#fff", textDecoration: "none", padding: "0.6rem 1.4rem", borderRadius: "8px", fontSize: "0.875rem", fontWeight: 600 }}>Sign in →</Link>
          </div>
        )}

        {loggedIn && history.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem" }}>
            {[
              { label: "Videos Analyzed", val: String(history.length), unit: "", accent: "#818cf8", large: true },
              { label: "Avg Captivation",  val: avgCaptivation ?? "—", unit: "/100", accent: "#a78bfa", large: true },
              { label: "Best Performing",  val: truncateName(best?.video_name ?? null, 20), unit: "", accent: "#34d399", large: false },
            ].map((s, i) => (
              <div key={i} className="card-glass" style={{ padding: "1.5rem", minWidth: 0, overflow: "hidden" }}>
                <div className="sans" style={{ color: "rgba(232,232,240,0.45)", fontSize: "0.8rem", marginBottom: "0.5rem", letterSpacing: "0.05em", textTransform: "uppercase" }}>{s.label}</div>
                <div className="mono" style={{ fontSize: s.large ? "1.75rem" : "1rem", fontWeight: 700, color: s.accent, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {s.val}{s.unit && <span className="sans" style={{ fontSize: "0.8rem", color: "rgba(232,232,240,0.35)", marginLeft: "0.25rem" }}>{s.unit}</span>}
                </div>
              </div>
            ))}
          </div>
        )}

        {loggedIn && (
          <div>
            <h2 className="sans" style={{ fontSize: "0.85rem", fontWeight: 600, color: "rgba(232,232,240,0.5)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "1rem" }}>Recent Analyses</h2>
            {loading ? (
              <div className="card-glass" style={{ padding: "3rem", textAlign: "center" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.75rem", color: "rgba(232,232,240,0.4)", fontSize: "0.875rem" }}>
                  <span className="spinner" style={{ borderTopColor: "#818cf8", borderColor: "rgba(255,255,255,0.1)" }} />Loading…
                </div>
              </div>
            ) : history.length === 0 ? (
              <div className="card-glass" style={{ padding: "4rem", textAlign: "center" }}>
                <p className="sans" style={{ color: "rgba(232,232,240,0.45)", fontSize: "0.9rem", marginBottom: "1.5rem" }}>No analyses yet. Upload your first video.</p>
                <Link href="/creator/upload" style={{ display: "inline-block", background: "linear-gradient(135deg, #818cf8, #6366f1)", color: "#fff", textDecoration: "none", padding: "0.6rem 1.4rem", borderRadius: "8px", fontSize: "0.875rem", fontWeight: 600 }}>Upload video</Link>
              </div>
            ) : (
              <div className="card-glass" style={{ overflow: "hidden", padding: "1rem 0" }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      {["Video", "Captivation", "Category", "Trend Match", "Date"].map((h) => (
                        <th key={h} className="sans" style={{ color: "rgba(232,232,240,0.4)", fontSize: "0.8rem", letterSpacing: "0.05em", textTransform: "uppercase" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((item) => {
                      const catStyle = getCategoryStyle(item.captivation_category);
                      return (
                        <tr key={item.id} style={{ borderBottom: "1px solid var(--card-border)" }}>
                          <td style={{ maxWidth: "180px" }}>
                            <div className="sans" title={item.video_name || "Untitled"} style={{ fontWeight: 500, fontSize: "0.9rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#ffffff" }}>
                              {truncateName(item.video_name, 22)}
                            </div>
                          </td>
                          <td><span className="mono" style={{ fontSize: "1.2rem", fontWeight: 700, color: getCaptivationColor(item.captivation_score) }}>{item.captivation_score.toFixed(1)}</span></td>
                          <td>
                            <span style={{ display: "inline-block", padding: "0.2rem 0.6rem", borderRadius: "4px", fontSize: "0.78rem", fontWeight: 600, color: catStyle.color, background: catStyle.bg, border: `1px solid ${catStyle.color}33` }}>
                              {item.captivation_category}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                              <div style={{ flex: 1, height: "4px", background: "rgba(255,255,255,0.08)", borderRadius: "2px", maxWidth: "60px" }}>
                                <div style={{ height: "100%", width: `${item.trend_match_score}%`, background: "#818cf8", borderRadius: "2px" }} />
                              </div>
                              <span className="mono" style={{ fontSize: "0.85rem", color: "rgba(232,232,240,0.6)" }}>{item.trend_match_score.toFixed(0)}%</span>
                            </div>
                          </td>
                          <td><span className="sans" style={{ fontSize: "0.85rem", color: "rgba(232,232,240,0.4)" }}>{new Date(item.created_at).toLocaleDateString()}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "1rem" }}>
          {[
            { icon: "◈", color: "#818cf8", title: "Captivation Score",  desc: "Hook strength, pace variance, and text density fit — separate from AFI." },
            { icon: "◉", color: "#a78bfa", title: "Trend Matching",      desc: "How well your video aligns with current platform benchmarks." },
            { icon: "◆", color: "#34d399", title: "Improvement Engine",  desc: "Prioritised recommendations with predicted score delta." },
          ].map((c, i) => (
            <div key={i} className="card-glass card-hover" style={{ padding: "1.75rem" }}>
              <div style={{ fontSize: "1.3rem", color: c.color, marginBottom: "1rem", width: "2.75rem", height: "2.75rem", display: "flex", alignItems: "center", justifyContent: "center", background: `${c.color}18`, borderRadius: "10px", border: `1px solid ${c.color}33` }}>{c.icon}</div>
              <div className="sans" style={{ fontWeight: 600, fontSize: "0.95rem", color: "#ffffff", marginBottom: "0.5rem" }}>{c.title}</div>
              <div className="sans" style={{ color: "rgba(232,232,240,0.45)", fontSize: "0.82rem", lineHeight: 1.6 }}>{c.desc}</div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
