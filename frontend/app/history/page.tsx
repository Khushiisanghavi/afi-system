"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import Link from "next/link";

// ── same logic as original ──────────────────────────────────────────────────
export default function HistoryPage() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await axios.get("http://127.0.0.1:8000/history");
        setHistory(response.data);
      } catch (error) {
        console.error("Error fetching history:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);
  // ─────────────────────────────────────────────────────────────────────────

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
        <div style={{ color: "var(--muted)", fontSize: "0.9rem" }}>No history available yet.</div>
        <Link href="/" className="btn-primary" style={{ fontSize: "0.82rem" }}>← Analyze a Video</Link>
      </div>
    );
  }

  return (
    <div className="container-section" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

      {/* HEADER */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.7rem", fontFamily: "monospace", color: "var(--muted)", marginBottom: "1rem" }}>
          <Link href="/" style={{ color: "var(--muted)", textDecoration: "none" }}>Home</Link>
          <span>/</span>
          <span style={{ color: "var(--foreground)" }}>History</span>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h1 style={{ fontSize: "clamp(1.8rem, 4vw, 2.75rem)", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: "0.35rem" }}>
              Analysis History
            </h1>
            <p style={{ color: "var(--muted)", fontSize: "0.85rem" }}>
              View previously analyzed videos and their AFI scores.
            </p>
          </div>
          <Link href="/" className="btn-primary" style={{ fontSize: "0.8rem", padding: "0.45rem 0.9rem" }}>
            + Analyze New
          </Link>
        </div>
      </div>

      {/* Summary stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "0.75rem" }}>
        {[
          { label: "Total Analyzed",   val: history.length, unit: "videos" },
          { label: "Avg AFI",           val: (history.reduce((s, h) => s + (h.final_afi || 0), 0) / history.length).toFixed(1), unit: "/100" },
          { label: "High Stimulation",  val: history.filter((h) => (h.final_afi || 0) >= 70).length, unit: "videos" },
        ].map((s, i) => (
          <div key={i} className="card" style={{ padding: "1.125rem 1.25rem" }}>
            <div className="label-sm" style={{ marginBottom: "0.3rem" }}>{s.label}</div>
            <div className="mono" style={{ fontSize: "1.6rem", fontWeight: 700 }}>
              {s.val}<span style={{ fontSize: "0.75rem", color: "var(--muted)", fontWeight: 400, marginLeft: "0.25rem" }}>{s.unit}</span>
            </div>
          </div>
        ))}
      </div>

      {/* TABLE */}
      <div className="card" style={{ overflow: "hidden" }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Video</th>
              <th>AFI Score</th>
              <th>Category</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {history.map((item) => (
              <tr key={item.id}>
                {/* Video */}
                <td>
                  <div style={{ fontWeight: 600, fontSize: "0.85rem", maxWidth: "280px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {item.video_url || item.video_path || "Video"}
                  </div>
                </td>

                {/* AFI Score */}
                <td>
                  <span className="mono" style={{ fontSize: "1.25rem", fontWeight: 700, color: getScoreColor(item.final_afi || 0) }}>
                    {item.final_afi?.toFixed(2)}
                  </span>
                </td>

                {/* Category Badge */}
                <td>
                  <span className={`tag-badge ${getCategoryClass(item.category)}`}>
                    {item.category}
                  </span>
                </td>

                {/* Date */}
                <td>
                  <span className="mono" style={{ fontSize: "0.78rem", color: "var(--muted)" }}>
                    {new Date(item.created_at).toLocaleDateString()}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer nav */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "0.75rem", paddingTop: "0.5rem" }}>
        {[
          { href: "/results", icon: "←", label: "Latest Results",  desc: "View most recent analysis" },
          { href: "/compare", icon: "⇄", label: "Compare Videos",  desc: "Side-by-side comparison" },
          { href: "/wellness",icon: "◎", label: "Wellness",         desc: "Media health overview" },
        ].map((n) => (
          <Link key={n.href} href={n.href} style={{ textDecoration: "none" }}>
            <div className="card card-hover" style={{ padding: "1.125rem 1.25rem" }}>
              <div className="mono" style={{ color: "var(--muted)", fontSize: "0.75rem", marginBottom: "0.3rem" }}>{n.icon}</div>
              <div style={{ fontWeight: 600, fontSize: "0.85rem", marginBottom: "0.2rem" }}>{n.label}</div>
              <div style={{ color: "var(--muted)", fontSize: "0.72rem" }}>{n.desc}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}