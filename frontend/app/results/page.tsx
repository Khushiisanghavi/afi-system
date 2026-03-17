"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";

// ── helper ───────────────────────────────────────────────────────────────────
function getCategoryClass(cat: string) {
  if (cat === "Calm") return "badge-calm";
  if (cat === "Moderate") return "badge-moderate";
  if (cat === "High") return "badge-high";
  return "badge-over";
}

function getCategoryColor(cat: string) {
  if (cat === "Calm") return "#34d399";
  if (cat === "Moderate") return "#facc15";
  if (cat === "High") return "#fb923c";
  return "#f87171";
}
// ─────────────────────────────────────────────────────────────────────────────

export default function ResultsPage() {
  // ── same logic as original ────────────────────────────────────────────────
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const stored = localStorage.getItem("afiResult");
    if (stored) {
      setData(JSON.parse(stored));
    }
  }, []);

  if (!data) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "1rem" }}>
        <div style={{ color: "var(--muted)", fontSize: "0.9rem" }}>No analysis data found.</div>
        <Link href="/" className="btn-primary" style={{ fontSize: "0.82rem" }}>← Analyze a Video</Link>
      </div>
    );
  }

  const category = data.final?.final_category;

  const modalityData = [
    { name: "Visual", score: data.visual?.visual_score || 0 },
    { name: "Audio",  score: data.audio?.audio_afi_score || 0 },
    { name: "Text",   score: data.text?.text_afi_score || 0 },
  ];

  const timelineData =
    data.visual?.timeline?.map((scene: any, index: number) => ({
      scene: index + 1,
      score: scene.avg_motion,
      start: scene.start,
      end: scene.end,
    })) || [];

  const peakScene =
    timelineData.length > 0
      ? timelineData.reduce((max: any, s: any) => (s.score > max.score ? s : max))
      : null;

  const explanation = `This video shows ${category?.toLowerCase()} levels of attention stimulation.${
    data.visual?.visual_score > 70 ? " High visual fragmentation contributes significantly." : ""
  }${
    data.audio?.audio_afi_score > 70 ? " Frequent audio spikes increase stimulation." : ""
  }${
    data.text?.text_afi_score > 70 ? " Rapid on-screen text adds to cognitive load." : ""
  }`;
  // ─────────────────────────────────────────────────────────────────────────

  const score = data.final?.final_afi_score ?? 0;
  const circumference = 2 * Math.PI * 45;
  const dashOffset = circumference - (score / 100) * circumference;
  const catColor = getCategoryColor(category);

  return (
    <div className="container-section" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

      {/* HEADER */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.7rem", fontFamily: "monospace", color: "var(--muted)", marginBottom: "1rem" }}>
          <Link href="/" style={{ color: "var(--muted)", textDecoration: "none" }}>Home</Link>
          <span>/</span>
          <span style={{ color: "var(--foreground)" }}>Results</span>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: "1rem" }}>
          <div>
            <h1 style={{ fontSize: "clamp(1.8rem, 4vw, 2.75rem)", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: "0.35rem" }}>
              AFI Analysis Results
            </h1>
            <p style={{ color: "var(--muted)", fontSize: "0.85rem" }}>Insights into attention fragmentation patterns.</p>
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <Link href="/compare" className="btn-secondary" style={{ fontSize: "0.8rem", padding: "0.45rem 0.9rem" }}>Compare →</Link>
            <Link href="/" className="btn-primary" style={{ fontSize: "0.8rem", padding: "0.45rem 0.9rem" }}>Analyze New</Link>
          </div>
        </div>
      </div>

      {/* SCORE + INSIGHT ROW */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "1rem" }}>

        {/* Score Card */}
        <div className="card" style={{ padding: "2rem", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
          <p className="label-sm" style={{ marginBottom: "1.25rem" }}>AFI Score</p>

          {/* SVG ring */}
          <div style={{ position: "relative", width: "7.5rem", height: "7.5rem", marginBottom: "1.25rem" }}>
            <svg width="100%" height="100%" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" fill="none" stroke="#1e1e1e" strokeWidth="6" />
              <circle
                cx="50" cy="50" r="45"
                fill="none"
                stroke={catColor}
                strokeWidth="6"
                strokeLinecap="round"
                style={{
                  strokeDasharray: circumference,
                  strokeDashoffset: dashOffset,
                  transform: "rotate(-90deg)",
                  transformOrigin: "center",
                  transition: "stroke-dashoffset 1.4s ease",
                }}
              />
            </svg>
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <span className="mono" style={{ fontSize: "2.25rem", fontWeight: 700, color: catColor, lineHeight: 1 }}>{score}</span>
              <span style={{ fontSize: "0.65rem", color: "var(--muted)" }}>/100</span>
            </div>
          </div>

          <span className={`tag-badge ${getCategoryClass(category)}`}>{category}</span>
        </div>

        {/* AI Insight */}
        <div className="card" style={{ padding: "2rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
            <span style={{ width: "1.5rem", height: "1.5rem", borderRadius: "0.3rem", background: "rgba(184,240,58,0.1)", border: "1px solid rgba(184,240,58,0.25)", color: "#b8f03a", fontSize: "0.7rem", display: "flex", alignItems: "center", justifyContent: "center" }}>✦</span>
            <span className="label-sm">AI Insight</span>
          </div>
          <p style={{ fontSize: "0.9rem", lineHeight: 1.7, color: "var(--foreground)" }}>{explanation}</p>

          {/* Modality mini stats */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem", marginTop: "1.5rem" }}>
            {modalityData.map((m) => (
              <div key={m.name} style={{ background: "rgba(255,255,255,0.02)", borderRadius: "0.5rem", padding: "0.75rem", border: "1px solid var(--border)" }}>
                <div className="label-sm" style={{ marginBottom: "0.3rem" }}>{m.name}</div>
                <div className="mono" style={{ fontSize: "1.4rem", fontWeight: 700, color: m.score > 70 ? "#f87171" : m.score > 50 ? "#fb923c" : "#b8f03a" }}>
                  {m.score}
                </div>
                <div style={{ marginTop: "0.35rem", height: "3px", background: "var(--border)", borderRadius: "9999px", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${m.score}%`, background: m.score > 70 ? "#f87171" : m.score > 50 ? "#fb923c" : "#b8f03a", borderRadius: "9999px", transition: "width 1s ease" }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* MODALITY BAR CHART */}
      <div className="card" style={{ padding: "2rem" }}>
        <h2 style={{ fontWeight: 700, fontSize: "1.1rem", marginBottom: "0.3rem" }}>Modality Breakdown</h2>
        <p style={{ color: "var(--muted)", fontSize: "0.78rem", marginBottom: "1.5rem" }}>Visual, audio, and text scores</p>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={modalityData} barSize={44}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" />
            <XAxis dataKey="name" tick={{ fill: "#555", fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 100]} tick={{ fill: "#555", fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: "8px", color: "#f0f0f0" }}
              cursor={{ fill: "rgba(184,240,58,0.04)" }}
            />
            <Bar dataKey="score" fill="#b8f03a" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* TIMELINE CHART */}
      {timelineData.length > 0 && (
        <div className="card" style={{ padding: "2rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem", flexWrap: "wrap", gap: "0.5rem" }}>
            <div>
              <h2 style={{ fontWeight: 700, fontSize: "1.1rem", marginBottom: "0.2rem" }}>Stimulation Timeline</h2>
              <p style={{ color: "var(--muted)", fontSize: "0.78rem" }}>Scene-by-scene stimulation across the video</p>
            </div>
            {peakScene && (
              <span className="tag-badge badge-over" style={{ fontSize: "0.62rem" }}>
                Peak at Scene {peakScene.scene}
              </span>
            )}
          </div>

          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={timelineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" />
              <XAxis dataKey="scene" tick={{ fill: "#555", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#555", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: "8px", color: "#f0f0f0" }}
                cursor={{ stroke: "rgba(184,240,58,0.2)" }}
              />
              <Line
                type="monotone"
                dataKey="score"
                stroke="#b8f03a"
                strokeWidth={2.5}
                dot={{ r: 4, fill: "#b8f03a", strokeWidth: 0 }}
                activeDot={{ r: 6, fill: "#b8f03a", strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>

          {/* Peak insight */}
          {peakScene && (
            <div style={{ marginTop: "1rem", padding: "0.875rem 1rem", background: "rgba(248,113,113,0.06)", borderRadius: "0.625rem", border: "1px solid rgba(248,113,113,0.2)" }}>
              <p style={{ fontWeight: 600, color: "#f87171", fontSize: "0.82rem", marginBottom: "0.2rem" }}>Peak Stimulation Detected</p>
              <p style={{ color: "rgba(248,113,113,0.8)", fontSize: "0.78rem" }}>
                Scene {peakScene.scene} — highest stimulation ({peakScene.score.toFixed(2)}) between {peakScene.start.toFixed(2)}s and {peakScene.end.toFixed(2)}s
              </p>
            </div>
          )}
        </div>
      )}

      {/* Footer nav */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "0.75rem", paddingTop: "0.5rem" }}>
        {[
          { href: "/compare", icon: "⇄", label: "Compare Videos", desc: "Side-by-side AFI comparison" },
          { href: "/history", icon: "↻", label: "View History",   desc: "Browse past analyses" },
          { href: "/wellness",icon: "◎", label: "Wellness",        desc: "Track your media habits" },
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