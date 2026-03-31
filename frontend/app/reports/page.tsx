"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export default function ReportsPage() {
  const [today, setToday]         = useState<any>(null);
  const [weekly, setWeekly]       = useState<any>(null);
  const [trend, setTrend]         = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [llmInsight, setLlmInsight] = useState<string | null>(null);
  const [llmLoading, setLlmLoading] = useState(false);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const token = localStorage.getItem("token");
        const headers: Record<string, string> = {};
        if (token && token !== "undefined" && token !== "null") headers["Authorization"] = `Bearer ${token}`;

        const [t, w, tr, checkins] = await Promise.all([
          fetch("http://localhost:8000/wellness/today",   { headers }).then((r) => r.ok ? r.json() : null).catch(() => null),
          fetch("http://localhost:8000/wellness/weekly",  { headers }).then((r) => r.ok ? r.json() : null).catch(() => null),
          fetch("http://localhost:8000/wellness/trend",   { headers }).then((r) => r.ok ? r.json() : []).catch(() => []),
          fetch("http://localhost:8000/wellbeing/checkins", { headers }).then((r) => r.ok ? r.json() : []).catch(() => []),
        ]);
        setToday(t); setWeekly(w); setTrend(tr || []);

        // Fetch LLM report insight once we have weekly data
        if (w) {
          setLlmLoading(true);
          const categoryBreakdown = {
            calm:           w.calm_count          ?? 0,
            moderate:       w.moderate_count       ?? 0,
            high:           w.high_count           ?? 0,
            overstimulating: w.overstimulating_count ?? 0,
          };
          fetch("http://localhost:8000/insights/reports", {
            method: "POST",
            headers: { "Content-Type": "application/json", ...headers },
            body: JSON.stringify({
              period_label:       "This week",
              avg_afi:            w.average_afi        ?? 0,
              total_videos:       w.videos_analyzed    ?? 0,
              category_breakdown: categoryBreakdown,
              wow_trend:          w.wow_trend          ?? null,
              peak_hour:          w.peak_hour          ?? null,
              focus_checkins:     Array.isArray(checkins) ? checkins : [],
            }),
          })
            .then((r) => r.ok ? r.json() : null)
            .then((d) => d && setLlmInsight(d.llm_insight))
            .catch(console.error)
            .finally(() => setLlmLoading(false));
        }
      } catch (err) {
        console.error("Reports fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", color: "var(--muted)", fontSize: "0.875rem" }}>
          <span className="spinner" style={{ borderTopColor: "var(--muted)", borderColor: "rgba(255,255,255,0.1)" }} />
          Loading reports...
        </div>
      </div>
    );
  }

  const insightColor = weekly?.average_afi > 70 ? "#f87171" : weekly?.average_afi > 40 ? "#facc15" : "#34d399";
  const insightBadge = weekly?.average_afi > 70 ? "badge-over" : weekly?.average_afi > 40 ? "badge-moderate" : "badge-calm";
  const insightLabel = weekly?.average_afi > 70 ? "High Stimulation" : weekly?.average_afi > 40 ? "Moderate" : "Healthy";
  const tooltipStyle = { background: "#0d0d1a", border: "1px solid rgba(167,139,250,0.12)", borderRadius: "8px", color: "#f0f0f0" };

  // Fallback rule-based insight
  const fallbackInsight = weekly?.average_afi > 70
    ? "High stimulation levels detected. Consider balancing with calmer content."
    : weekly?.average_afi > 40 ? "Moderate stimulation. Try maintaining a balanced intake."
    : "Low stimulation — healthy consumption patterns detected.";

  return (
    <div className="container-section" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

      {/* HEADER — unchanged */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.7rem", fontFamily: "monospace", color: "var(--muted)", marginBottom: "1rem" }}>
          <Link href="/" style={{ color: "var(--muted)", textDecoration: "none" }}>Home</Link>
          <span>/</span>
          <span style={{ color: "var(--foreground)" }}>Reports</span>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h1 className="display-font" style={{ fontSize: "clamp(1.8rem, 4vw, 2.75rem)", fontWeight: 600, letterSpacing: "-0.02em", marginBottom: "0.35rem", color: "#ffffff" }}>
              Media Reports
            </h1>
            <p className="sans" style={{ color: "var(--muted-mid)", fontSize: "0.95rem" }}>Monitor your attention health and media habits.</p>
          </div>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <Link href="/history" className="btn-secondary" style={{ fontSize: "0.85rem", padding: "0.6rem 1.1rem" }}>Full History</Link>
            <Link href="/" className="btn-primary" style={{ fontSize: "0.85rem", padding: "0.6rem 1.1rem" }}>Analyze Video</Link>
          </div>
        </div>
      </div>

      {/* TODAY + WEEKLY — unchanged */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <div className="card-glass" style={{ padding: "2rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1.5rem" }}>
            <span style={{ width: "0.5rem", height: "0.5rem", borderRadius: "50%", background: "#34d399", boxShadow: "0 0 8px rgba(52,211,153,0.5)" }} />
            <span className="sans" style={{ fontWeight: 600, fontSize: "1rem", color: "#34d399" }}>Today</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {[
              { label: "Videos analyzed",  val: today?.videos_today || 0 },
              { label: "Average AFI",      val: today?.average_afi_today?.toFixed?.(2) || 0 },
              { label: "High stimulation", val: today?.high_stimulation_today || 0 },
            ].map((row) => (
              <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className="sans" style={{ color: "var(--muted-mid)", fontSize: "0.9rem" }}>{row.label}</span>
                <span className="mono" style={{ fontWeight: 700, fontSize: "1.1rem", color: "#ffffff" }}>{row.val}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card-glass" style={{ padding: "2rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1.5rem" }}>
            <span style={{ width: "0.5rem", height: "0.5rem", borderRadius: "50%", background: "#a78bfa", boxShadow: "0 0 8px rgba(167,139,250,0.5)" }} />
            <span className="sans" style={{ fontWeight: 600, fontSize: "1rem", color: "#a78bfa" }}>Weekly Summary</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {[
              { label: "Videos analyzed",  val: weekly?.videos_analyzed || 0 },
              { label: "Average AFI",      val: weekly?.average_afi?.toFixed?.(2) || 0 },
              { label: "High stimulation", val: weekly?.high_stimulation_videos || 0 },
            ].map((row) => (
              <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className="sans" style={{ color: "var(--muted-mid)", fontSize: "0.9rem" }}>{row.label}</span>
                <span className="mono" style={{ fontWeight: 700, fontSize: "1.1rem", color: "#ffffff" }}>{row.val}</span>
              </div>
            ))}
            {weekly?.recommendation && (
              <p className="sans" style={{ color: "var(--muted-mid)", fontSize: "0.85rem", paddingTop: "0.75rem", borderTop: "1px solid var(--card-border)", lineHeight: 1.6 }}>
                {weekly.recommendation}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* TREND CHART — unchanged */}
      <div className="card-glass" style={{ padding: "2rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem", flexWrap: "wrap", gap: "0.5rem" }}>
          <div>
            <h2 style={{ fontWeight: 700, fontSize: "1.1rem", marginBottom: "0.2rem" }}>7-Day AFI Trend</h2>
            <p style={{ color: "var(--muted)", fontSize: "0.78rem" }}>Daily average stimulation index over the past week</p>
          </div>
          <span className="tag-badge" style={{ borderColor: "rgba(167,139,250,0.3)", color: "#a78bfa", background: "rgba(167,139,250,0.06)" }}>Last 7 days</span>
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={trend}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(167,139,250,0.12)" />
            <XAxis dataKey="day" tick={{ fill: "#6b6890", fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#6b6890", fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: "rgba(167,139,250,0.2)" }} />
            <Line type="monotone" dataKey="afi" stroke="#a78bfa" strokeWidth={2.5} dot={{ r: 4, fill: "#a78bfa", strokeWidth: 0 }} activeDot={{ r: 6, fill: "#a78bfa", strokeWidth: 0 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* INSIGHT — now LLM-powered with fallback */}
      <div className="card-glass" style={{ padding: "1.5rem", borderColor: `${insightColor}33`, background: `${insightColor}10` }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem" }}>
          <div style={{ width: "2.5rem", height: "2.5rem", borderRadius: "8px", background: `${insightColor}15`, border: `1px solid ${insightColor}30`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <span style={{ color: insightColor, fontSize: "1.1rem" }}>◎</span>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem", flexWrap: "wrap" }}>
              <span className="sans" style={{ fontWeight: 600, fontSize: "1rem", color: "#ffffff" }}>Report Insight</span>
              <span className={`tag-badge ${insightBadge}`} style={{ fontSize: "0.65rem", borderRadius: "4px" }}>{insightLabel}</span>
              {llmLoading && <span className="spinner" style={{ width: "0.9rem", height: "0.9rem", borderTopColor: insightColor, borderColor: "rgba(255,255,255,0.1)" }} />}
            </div>
            {llmInsight ? (
              <div className="sans" style={{ fontSize: "0.92rem", lineHeight: 1.75, color: "var(--muted-mid)", whiteSpace: "pre-wrap" }}>
                {llmInsight}
              </div>
            ) : (
              <p className="sans" style={{ color: "var(--muted-mid)", fontSize: "0.95rem", lineHeight: 1.65 }}>{fallbackInsight}</p>
            )}
          </div>
        </div>
      </div>

      {/* Footer nav — unchanged */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "1rem", paddingTop: "0.5rem" }}>
        {[
          { href: "/",        icon: "↑", label: "Analyze", desc: "Analyze a new video" },
          { href: "/results", icon: "◈", label: "Results",  desc: "Latest analysis breakdown" },
          { href: "/compare", icon: "⇄", label: "Compare",  desc: "Head-to-head comparison" },
          { href: "/history", icon: "↻", label: "History",  desc: "All past analyses" },
        ].map((n) => (
          <Link key={n.href} href={n.href} style={{ textDecoration: "none" }}>
            <div className="card-glass card-hover" style={{ padding: "1.5rem" }}>
              <div className="mono" style={{ color: "var(--primary)", fontSize: "1.1rem", marginBottom: "0.5rem" }}>{n.icon}</div>
              <div className="sans" style={{ fontWeight: 600, fontSize: "0.95rem", marginBottom: "0.3rem", color: "#ffffff" }}>{n.label}</div>
              <div className="sans" style={{ color: "var(--muted-mid)", fontSize: "0.8rem" }}>{n.desc}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}