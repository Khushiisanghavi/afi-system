"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Cell,
} from "recharts";

// ── helpers ───────────────────────────────────────────────────────────────────
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
function featureLabel(key: string) {
  const map: Record<string, string> = {
    visual_score:           "Visual Activity",
    tempo_bpm:              "Audio Tempo",
    rms_energy:             "Audio Loudness",
    amplitude_spike_ratio:  "Audio Spikes",
    zero_crossing_rate:     "Audio Texture",
    words_per_second:       "Text Speed",
    avg_text_area_ratio:    "Text Coverage",
    text_change_rate:       "Text Changes",
  };
  return map[key] ?? key;
}
// ─────────────────────────────────────────────────────────────────────────────

export default function ResultsPage() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const stored = localStorage.getItem("afiResult");
    if (stored) setData(JSON.parse(stored));
  }, []);

  if (!data) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "1rem" }}>
        <div style={{ color: "var(--muted)", fontSize: "0.9rem" }}>No analysis data found.</div>
        <Link href="/" className="btn-primary" style={{ fontSize: "0.82rem" }}>← Analyze a Video</Link>
      </div>
    );
  }

  const category  = data.final?.final_category;
  const score     = data.final?.final_afi_score ?? 0;
  const catColor  = getCategoryColor(category);
  const circumference = 2 * Math.PI * 45;
  const dashOffset    = circumference - (score / 100) * circumference;

  // ── existing charts ───────────────────────────────────────────────────────
  const modalityData = [
    { name: "Visual", score: data.visual?.visual_score ?? 0 },
    { name: "Audio",  score: data.audio?.audio_afi_score ?? data.audio?.tempo_bpm ? Math.round(score) : 0 },
    { name: "Text",   score: data.text?.text_afi_score ?? 0 },
  ];

  const timelineData =
    data.visual?.timeline?.map((s: any, i: number) => ({
      scene: i + 1,
      score: s.avg_motion,
      start: s.start,
      end:   s.end,
    })) ?? [];

  const peakScene =
    timelineData.length > 0
      ? timelineData.reduce((max: any, s: any) => (s.score > max.score ? s : max))
      : null;

  // ── ML fields ─────────────────────────────────────────────────────────────
  const mlPowered   = data.final?.ml_powered ?? false;
  const confidence  = data.final?.model_confidence ?? null;
  const insights    = data.final?.insights ?? [];
  const rawImportance = data.final?.feature_importance ?? {};

  // Sort features by importance desc, format for chart
  const importanceData = Object.entries(rawImportance)
    .map(([key, val]) => ({ name: featureLabel(key), value: Math.round((val as number) * 100), raw: val as number }))
    .sort((a, b) => b.value - a.value);

  const topFeature = importanceData[0];

  const explanation =
    `This video shows ${category?.toLowerCase()} levels of attention stimulation.` +
    (data.visual?.visual_score > 70 ? " High visual fragmentation contributes significantly." : "") +
    (score > 70 ? " Frequent audio spikes increase stimulation." : "") +
    (data.text?.text_afi_score > 70 ? " Rapid on-screen text adds to cognitive load." : "");

  // Confidence bar color
  const confColor = confidence == null ? "#6b6890"
    : confidence >= 0.75 ? "#34d399"
    : confidence >= 0.5  ? "#facc15"
    : "#f87171";

  return (
    <div className="container-section" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

      {/* HEADER */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.7rem", fontFamily: "monospace", color: "var(--muted)", marginBottom: "1rem" }}>
          <Link href="/" style={{ color: "var(--muted)", textDecoration: "none" }}>Home</Link>
          <span>/</span>
          <span style={{ color: "var(--foreground)" }}>Results</span>
          {mlPowered && (
            <span style={{ marginLeft: "0.5rem", background: "rgba(167,139,250,0.12)", border: "1px solid rgba(167,139,250,0.3)", color: "#a78bfa", borderRadius: "4px", padding: "0.1rem 0.5rem", fontSize: "0.65rem", letterSpacing: "0.05em" }}>
              ML POWERED
            </span>
          )}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: "1rem" }}>
          <div>
            <h1 className="display-font" style={{ fontSize: "clamp(1.8rem, 4vw, 2.75rem)", fontWeight: 600, letterSpacing: "-0.02em", marginBottom: "0.35rem", color: "#ffffff" }}>
              AFI Analysis Results
            </h1>
            <p className="sans" style={{ color: "var(--muted-mid)", fontSize: "0.95rem" }}>Insights into attention fragmentation patterns.</p>
          </div>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <Link href="/compare" className="btn-secondary" style={{ fontSize: "0.85rem", padding: "0.6rem 1.1rem" }}>Compare →</Link>
            <Link href="/" className="btn-primary" style={{ fontSize: "0.85rem", padding: "0.6rem 1.1rem" }}>Analyze Video</Link>
          </div>
        </div>
      </div>

      {/* SCORE + INSIGHT ROW */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "1rem" }}>

        {/* Score Card */}
        <div className="card-glass" style={{ padding: "2.5rem 2rem", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
          <p className="sans" style={{ color: "var(--muted-mid)", fontSize: "0.9rem", marginBottom: "1.5rem" }}>AFI Score</p>
          <div style={{ position: "relative", width: "8.5rem", height: "8.5rem", marginBottom: "1.5rem" }}>
            <svg width="100%" height="100%" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
              <circle cx="50" cy="50" r="45" fill="none" stroke={catColor} strokeWidth="6" strokeLinecap="round"
                style={{ strokeDasharray: circumference, strokeDashoffset: dashOffset, transform: "rotate(-90deg)", transformOrigin: "center", transition: "stroke-dashoffset 1.4s ease" }} />
            </svg>
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <span className="mono" style={{ fontSize: "2.75rem", fontWeight: 700, color: catColor, lineHeight: 1 }}>{score}</span>
              <span className="sans" style={{ fontSize: "0.85rem", color: "var(--muted-mid)", marginTop: "0.2rem" }}>/100</span>
            </div>
          </div>
          <span className={`tag-badge ${getCategoryClass(category)}`} style={{ borderRadius: "6px", fontSize: "0.75rem", padding: "0.4rem 1rem" }}>{category}</span>

          {/* Model confidence */}
          {confidence !== null && (
            <div style={{ marginTop: "1.5rem", width: "100%" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
                <span className="sans" style={{ fontSize: "0.75rem", color: "var(--muted-mid)" }}>Model confidence</span>
                <span className="mono" style={{ fontSize: "0.8rem", color: confColor }}>{Math.round(confidence * 100)}%</span>
              </div>
              <div style={{ height: "4px", background: "rgba(255,255,255,0.08)", borderRadius: "9999px", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${confidence * 100}%`, background: confColor, borderRadius: "9999px", transition: "width 1.2s ease" }} />
              </div>
            </div>
          )}
        </div>

        {/* AI Insight */}
        <div className="card-glass" style={{ padding: "2.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.25rem" }}>
            <span style={{ width: "2rem", height: "2rem", borderRadius: "8px", background: "rgba(167,139,250,0.15)", border: "1px solid rgba(167,139,250,0.3)", color: "#a78bfa", fontSize: "1rem", display: "flex", alignItems: "center", justifyContent: "center" }}>✦</span>
            <span className="sans" style={{ fontWeight: 600, fontSize: "1.05rem", color: "#ffffff" }}>AI Insight</span>
          </div>
          <p className="sans" style={{ fontSize: "1rem", lineHeight: 1.7, color: "var(--muted-mid)" }}>{explanation}</p>

          {/* Modality mini stats */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", marginTop: "2rem" }}>
            {modalityData.map((m) => (
              <div key={m.name} style={{ background: "rgba(255,255,255,0.03)", borderRadius: "12px", padding: "1rem", border: "1px solid var(--card-border)" }}>
                <div className="sans" style={{ color: "var(--muted-mid)", fontSize: "0.85rem", marginBottom: "0.5rem" }}>{m.name}</div>
                <div className="mono" style={{ fontSize: "1.6rem", fontWeight: 700, color: m.score > 70 ? "#f87171" : m.score > 50 ? "#fb923c" : "#a78bfa" }}>
                  {typeof m.score === "number" ? m.score.toFixed(1) : m.score}
                </div>
                <div style={{ marginTop: "0.75rem", height: "4px", background: "rgba(255,255,255,0.08)", borderRadius: "9999px", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${m.score}%`, background: m.score > 70 ? "#f87171" : m.score > 50 ? "#fb923c" : "#a78bfa", borderRadius: "9999px", transition: "width 1.2s cubic-bezier(0.16,1,0.3,1)" }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ML INSIGHTS CARDS */}
      {insights.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <span style={{ width: "0.4rem", height: "0.4rem", borderRadius: "50%", background: "#a78bfa", boxShadow: "0 0 6px rgba(167,139,250,0.6)" }} />
            <span className="sans" style={{ fontWeight: 600, fontSize: "0.9rem", color: "#a78bfa", letterSpacing: "0.06em", textTransform: "uppercase" }}>ML Insights</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "0.75rem" }}>
            {insights.map((insight: string, i: number) => {
              const isWarning = insight.startsWith("⚠️");
              const borderColor = isWarning ? "rgba(248,113,113,0.3)" : "rgba(167,139,250,0.2)";
              const bgColor     = isWarning ? "rgba(248,113,113,0.06)" : "rgba(167,139,250,0.05)";
              const dotColor    = isWarning ? "#f87171" : "#a78bfa";
              return (
                <div key={i} className="card-glass" style={{ padding: "1.1rem 1.25rem", borderColor, background: bgColor, display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
                  <span style={{ color: dotColor, fontSize: "0.85rem", marginTop: "0.1rem", flexShrink: 0 }}>→</span>
                  <span className="sans" style={{ color: "var(--muted-mid)", fontSize: "0.88rem", lineHeight: 1.6 }}>{insight}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* FEATURE IMPORTANCE */}
      {importanceData.length > 0 && (
        <div className="card-glass" style={{ padding: "2.5rem" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "1.5rem", flexWrap: "wrap", gap: "0.5rem" }}>
            <div>
              <h2 style={{ fontWeight: 700, fontSize: "1.1rem", marginBottom: "0.25rem" }}>Feature Importance</h2>
              <p style={{ color: "var(--muted)", fontSize: "0.78rem" }}>What the ML model weighted most heavily for this score</p>
            </div>
            {topFeature && (
              <div style={{ background: "rgba(167,139,250,0.08)", border: "1px solid rgba(167,139,250,0.2)", borderRadius: "8px", padding: "0.6rem 1rem", textAlign: "right" }}>
                <div className="sans" style={{ fontSize: "0.7rem", color: "var(--muted-mid)", marginBottom: "0.15rem" }}>Top driver</div>
                <div className="sans" style={{ fontSize: "0.88rem", fontWeight: 600, color: "#a78bfa" }}>{topFeature.name}</div>
                <div className="mono" style={{ fontSize: "0.8rem", color: "var(--muted-mid)" }}>{topFeature.value}% weight</div>
              </div>
            )}
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={importanceData} layout="vertical" barSize={14} margin={{ left: 16, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(167,139,250,0.08)" horizontal={false} />
              <XAxis type="number" domain={[0, 100]} tick={{ fill: "#6b6890", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
              <YAxis type="category" dataKey="name" width={110} tick={{ fill: "#9ca3af", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: "#0d0d1a", border: "1px solid rgba(167,139,250,0.15)", borderRadius: "8px", color: "#f0f0f0" }}
                formatter={(v: any) => [`${v}%`, "Importance"]}
                cursor={{ fill: "rgba(167,139,250,0.04)" }}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {importanceData.map((entry, i) => (
                  <Cell key={i} fill={i === 0 ? "#a78bfa" : i === 1 ? "#7c3aed55" : "rgba(167,139,250,0.25)"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* MODALITY BAR CHART */}
      <div className="card-glass" style={{ padding: "2.5rem" }}>
        <h2 style={{ fontWeight: 700, fontSize: "1.1rem", marginBottom: "0.3rem" }}>Modality Breakdown</h2>
        <p style={{ color: "var(--muted)", fontSize: "0.78rem", marginBottom: "1.5rem" }}>Visual, audio, and text sub-scores</p>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={modalityData} barSize={44}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(167,139,250,0.12)" />
            <XAxis dataKey="name" tick={{ fill: "#6b6890", fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 100]} tick={{ fill: "#6b6890", fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: "#0d0d1a", border: "1px solid rgba(167,139,250,0.12)", borderRadius: "8px", color: "#f0f0f0" }} cursor={{ fill: "rgba(167,139,250,0.04)" }} />
            <Bar dataKey="score" fill="#a78bfa" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* TIMELINE CHART */}
      {timelineData.length > 0 && (
        <div className="card-glass" style={{ padding: "2.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem", flexWrap: "wrap", gap: "0.5rem" }}>
            <div>
              <h2 className="sans" style={{ fontWeight: 600, fontSize: "1.1rem", marginBottom: "0.2rem", color: "#ffffff" }}>Stimulation Timeline</h2>
              <p className="sans" style={{ color: "var(--muted-mid)", fontSize: "0.9rem" }}>Scene-by-scene stimulation across the video</p>
            </div>
            {peakScene && (
              <span className="tag-badge badge-over" style={{ fontSize: "0.75rem", borderRadius: "4px" }}>
                Peak at Scene {peakScene.scene}
              </span>
            )}
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={timelineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(167,139,250,0.12)" />
              <XAxis dataKey="scene" tick={{ fill: "#6b6890", fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#6b6890", fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "rgba(5,5,15,0.9)", border: "1px solid rgba(167,139,250,0.2)", borderRadius: "12px", color: "#f0f0f0" }} cursor={{ stroke: "rgba(167,139,250,0.3)", strokeWidth: 2 }} />
              <Line type="monotone" dataKey="score" stroke="#a78bfa" strokeWidth={3}
                dot={{ r: 4, fill: "#a78bfa", strokeWidth: 0 }}
                activeDot={{ r: 7, fill: "#ffffff", strokeWidth: 0, stroke: "#a78bfa" }} />
            </LineChart>
          </ResponsiveContainer>
          {peakScene && (
            <div style={{ marginTop: "1.5rem", padding: "1.25rem", background: "rgba(248,113,113,0.08)", borderRadius: "12px", border: "1px solid rgba(248,113,113,0.25)" }}>
              <p className="sans" style={{ fontWeight: 600, color: "#fca5a5", fontSize: "0.95rem", marginBottom: "0.4rem" }}>Peak Stimulation Detected</p>
              <p className="sans" style={{ color: "rgba(248,113,113,0.85)", fontSize: "0.9rem", lineHeight: 1.5 }}>
                Scene {peakScene.scene} — highest stimulation ({peakScene.score.toFixed(2)}) between {peakScene.start.toFixed(2)}s and {peakScene.end.toFixed(2)}s
              </p>
            </div>
          )}
        </div>
      )}

      {/* Footer nav */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "1rem", paddingTop: "0.5rem" }}>
        {[
          { href: "/compare", icon: "⇄", label: "Compare Videos", desc: "Side-by-side AFI comparison" },
          { href: "/history", icon: "↻", label: "View History",   desc: "Browse past analyses" },
          { href: "/wellness",icon: "◎", label: "Wellness",        desc: "Track your media habits" },
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
