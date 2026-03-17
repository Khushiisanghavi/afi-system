"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

// ── same logic as original ──────────────────────────────────────────────────
export default function WellnessPage() {
  const [today, setToday] = useState<any>(null);
  const [weekly, setWeekly] = useState<any>(null);
  const [trend, setTrend] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [t, w, tr] = await Promise.all([
          fetch("http://localhost:8000/wellness/today").then((r) => r.json()),
          fetch("http://localhost:8000/wellness/weekly").then((r) => r.json()),
          fetch("http://localhost:8000/wellness/trend").then((r) => r.json()),
        ]);
        setToday(t);
        setWeekly(w);
        setTrend(tr);
      } catch (err) {
        console.error("Wellness fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);
  // ─────────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", color: "var(--muted)", fontSize: "0.875rem" }}>
          <span className="spinner" style={{ borderTopColor: "var(--muted)", borderColor: "rgba(255,255,255,0.1)" }} />
          Loading wellness report...
        </div>
      </div>
    );
  }

  const wellnessInsight =
    weekly?.average_afi > 70
      ? "High stimulation levels detected. Consider balancing with calmer content."
      : weekly?.average_afi > 40
      ? "Moderate stimulation. Try maintaining a balanced intake."
      : "Low stimulation — healthy consumption patterns detected.";

  const insightColor = weekly?.average_afi > 70 ? "#f87171" : weekly?.average_afi > 40 ? "#facc15" : "#34d399";
  const insightBadge = weekly?.average_afi > 70 ? "badge-over" : weekly?.average_afi > 40 ? "badge-moderate" : "badge-calm";
  const insightLabel = weekly?.average_afi > 70 ? "High Stimulation" : weekly?.average_afi > 40 ? "Moderate" : "Healthy";

  const tooltipStyle = { background: "#111", border: "1px solid #1e1e1e", borderRadius: "8px", color: "#f0f0f0" };

  return (
    <div className="container-section" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

      {/* HEADER */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.7rem", fontFamily: "monospace", color: "var(--muted)", marginBottom: "1rem" }}>
          <Link href="/" style={{ color: "var(--muted)", textDecoration: "none" }}>Home</Link>
          <span>/</span>
          <span style={{ color: "var(--foreground)" }}>Wellness</span>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h1 style={{ fontSize: "clamp(1.8rem, 4vw, 2.75rem)", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: "0.35rem" }}>
              Media Wellness Dashboard
            </h1>
            <p style={{ color: "var(--muted)", fontSize: "0.85rem" }}>
              Monitor your attention health and media habits.
            </p>
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <Link href="/history" className="btn-secondary" style={{ fontSize: "0.8rem", padding: "0.45rem 0.9rem" }}>Full History</Link>
            <Link href="/" className="btn-primary" style={{ fontSize: "0.8rem", padding: "0.45rem 0.9rem" }}>Analyze Video</Link>
          </div>
        </div>
      </div>

      {/* TODAY + WEEKLY */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>

        {/* TODAY */}
        <div className="card" style={{ padding: "1.75rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.25rem" }}>
            <span style={{ width: "0.4rem", height: "0.4rem", borderRadius: "50%", background: "#34d399" }} />
            <span style={{ fontWeight: 700, fontSize: "0.9rem", color: "#34d399" }}>Today</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
            {[
              { label: "Videos analyzed", val: today?.videos_today || 0 },
              { label: "Average AFI",     val: today?.average_afi_today?.toFixed?.(2) || 0 },
              { label: "High stimulation",val: today?.high_stimulation_today || 0 },
            ].map((row) => (
              <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "var(--muted)", fontSize: "0.82rem" }}>{row.label}</span>
                <span className="mono" style={{ fontWeight: 700, fontSize: "1rem" }}>{row.val}</span>
              </div>
            ))}
          </div>
        </div>

        {/* WEEKLY */}
        <div className="card" style={{ padding: "1.75rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.25rem" }}>
            <span style={{ width: "0.4rem", height: "0.4rem", borderRadius: "50%", background: "#b8f03a" }} />
            <span style={{ fontWeight: 700, fontSize: "0.9rem", color: "#b8f03a" }}>Weekly Summary</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
            {[
              { label: "Videos analyzed",  val: weekly?.videos_analyzed || 0 },
              { label: "Average AFI",      val: weekly?.average_afi?.toFixed?.(2) || 0 },
              { label: "High stimulation", val: weekly?.high_stimulation_videos || 0 },
            ].map((row) => (
              <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "var(--muted)", fontSize: "0.82rem" }}>{row.label}</span>
                <span className="mono" style={{ fontWeight: 700, fontSize: "1rem" }}>{row.val}</span>
              </div>
            ))}
            {weekly?.recommendation && (
              <p style={{ color: "var(--muted)", fontSize: "0.78rem", paddingTop: "0.5rem", borderTop: "1px solid var(--border)", lineHeight: 1.55 }}>
                {weekly.recommendation}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* TREND CHART */}
      <div className="card" style={{ padding: "2rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem", flexWrap: "wrap", gap: "0.5rem" }}>
          <div>
            <h2 style={{ fontWeight: 700, fontSize: "1.1rem", marginBottom: "0.2rem" }}>7-Day AFI Trend</h2>
            <p style={{ color: "var(--muted)", fontSize: "0.78rem" }}>Daily average stimulation index over the past week</p>
          </div>
          <span className="tag-badge" style={{ borderColor: "rgba(184,240,58,0.3)", color: "#b8f03a", background: "rgba(184,240,58,0.06)" }}>
            Last 7 days
          </span>
        </div>

        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={trend}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" />
            <XAxis dataKey="day"  tick={{ fill: "#555", fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#555", fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: "rgba(184,240,58,0.2)" }} />
            <Line
              type="monotone"
              dataKey="afi"
              stroke="#b8f03a"
              strokeWidth={2.5}
              dot={{ r: 4, fill: "#b8f03a", strokeWidth: 0 }}
              activeDot={{ r: 6, fill: "#b8f03a", strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* WELLNESS INSIGHT */}
      <div className="card" style={{ padding: "1.5rem", borderColor: `${insightColor}22`, background: `${insightColor}08` }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem" }}>
          <div style={{ width: "2rem", height: "2rem", borderRadius: "0.4rem", background: `${insightColor}15`, border: `1px solid ${insightColor}30`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: "0.1rem" }}>
            <span style={{ color: insightColor, fontSize: "0.85rem" }}>◎</span>
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.4rem" }}>
              <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>Wellness Insight</span>
              <span className={`tag-badge ${insightBadge}`} style={{ fontSize: "0.6rem" }}>{insightLabel}</span>
            </div>
            <p style={{ color: "var(--muted)", fontSize: "0.875rem", lineHeight: 1.65 }}>{wellnessInsight}</p>
          </div>
        </div>
      </div>

      {/* Footer nav */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "0.75rem", paddingTop: "0.5rem" }}>
        {[
          { href: "/",        icon: "⬆", label: "Analyze",        desc: "Analyze a new video" },
          { href: "/results", icon: "◈", label: "Results",         desc: "Latest analysis breakdown" },
          { href: "/compare", icon: "⇄", label: "Compare",         desc: "Head-to-head comparison" },
          { href: "/history", icon: "↻", label: "History",         desc: "All past analyses" },
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