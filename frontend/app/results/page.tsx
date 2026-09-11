"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, Variants } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Cell,
} from "recharts";

// Framer Motion Variants
const STAGGER_CONTAINER: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.12 } }
};

const FADE_UP: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 60, damping: 20 } }
};

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
    visual_score: "Visual Activity", tempo_bpm: "Audio Tempo",
    rms_energy: "Audio Loudness", amplitude_spike_ratio: "Audio Spikes",
    zero_crossing_rate: "Audio Texture", words_per_second: "Text Speed",
    avg_text_area_ratio: "Text Coverage", text_change_rate: "Text Changes",
  };
  return map[key] ?? key;
}

export default function ResultsPage() {
  const [data, setData]           = useState<any>(null);
  const [llmInsight, setLlmInsight] = useState<string | null>(null);
  const [llmLoading, setLlmLoading] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("afiResult");
    if (!stored) return;
    const parsed = JSON.parse(stored);
    setData(parsed);

    // Fetch LLM insight after data loads
    if (parsed?.video_path) {
      setLlmLoading(true);
      fetch("http://localhost:8000/insights/results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          video_path:        parsed.video_path,
          final_afi_score:   parsed.final?.final_afi_score,
          final_category:    parsed.final?.final_category,
          visual_score:      parsed.visual?.visual_score ?? 0,
          audio_metrics: {
            tempo_bpm:               parsed.audio?.tempo_bpm ?? 0,
            rms_energy:              parsed.audio?.rms_energy ?? 0,
            amplitude_spike_ratio:   parsed.audio?.amplitude_spike_ratio ?? 0,
            zero_crossing_rate:      parsed.audio?.zero_crossing_rate ?? 0,
            duration_seconds:        parsed.audio?.duration_seconds ?? 0,
          },
          text_metrics: {
            total_words:          parsed.text?.total_words ?? 0,
            words_per_second:     parsed.text?.words_per_second ?? 0,
            avg_words_per_frame:  parsed.text?.avg_words_per_frame ?? 0,
            avg_text_area_ratio:  parsed.text?.avg_text_area_ratio ?? 0,
            text_change_rate:     parsed.text?.text_change_rate ?? 0,
            duration_seconds:     parsed.text?.duration_seconds ?? 0,
          },
          feature_importance: parsed.final?.feature_importance ?? {},
        }),
      })
        .then((r) => r.ok ? r.json() : null)
        .then((d) => d && setLlmInsight(d.llm_insight))
        .catch(console.error)
        .finally(() => setLlmLoading(false));
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

  const category     = data.final?.final_category;
  const score        = data.final?.final_afi_score ?? 0;
  const catColor     = getCategoryColor(category);
  const circumference = 2 * Math.PI * 45;
  const dashOffset   = circumference - (score / 100) * circumference;

  const modalityData = [
    { name: "Visual", score: data.visual?.visual_score ?? 0 },
    { name: "Audio",  score: data.audio?.audio_afi_score ?? 0 },
    { name: "Text",   score: data.text?.text_afi_score ?? 0 },
  ];

  const timelineData =
    data.visual?.timeline?.map((s: any, i: number) => ({
      scene: i + 1, score: s.avg_motion, start: s.start, end: s.end,
    })) ?? [];

  const peakScene = timelineData.length > 0
    ? timelineData.reduce((max: any, s: any) => (s.score > max.score ? s : max))
    : null;

  const mlPowered      = data.final?.ml_powered ?? false;
  const insights       = data.final?.insights ?? [];
  const rawImportance  = data.final?.feature_importance ?? {};

  const importanceData = Object.entries(rawImportance)
    .map(([key, val]) => ({ name: featureLabel(key), value: Math.round((val as number) * 100), raw: val as number }))
    .sort((a, b) => b.value - a.value);

  const topFeature = importanceData[0];

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
          <span style={{ color: "var(--foreground)" }}>Results</span>
          {mlPowered && (
            <span style={{ marginLeft: "0.5rem", background: "rgba(95, 75, 254, 0.12)", border: "1px solid rgba(95, 75, 254, 0.3)", color: "var(--primary)", borderRadius: "4px", padding: "0.1rem 0.6rem", fontSize: "0.65rem", letterSpacing: "0.05em" }}>
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
      </motion.div>

      {/* SCORE + INSIGHT ROW */}
      <motion.div variants={FADE_UP} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.5rem" }}>
        
        {/* Score Card */}
        <div className="card-glass" style={{ padding: "2.5rem 2rem", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
          <p className="sans" style={{ color: "var(--muted-mid)", fontSize: "0.9rem", marginBottom: "1.5rem" }}>AFI Score</p>
          <div style={{ position: "relative", width: "8.5rem", height: "8.5rem", marginBottom: "1.5rem" }}>
            <svg width="100%" height="100%" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
              <circle cx="50" cy="50" r="45" fill="none" stroke={catColor} strokeWidth="8" strokeLinecap="round"
                style={{ strokeDasharray: circumference, strokeDashoffset: dashOffset, transform: "rotate(-90deg)", transformOrigin: "center", transition: "stroke-dashoffset 1.4s ease" }} />
            </svg>
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <span className="mono" style={{ fontSize: "2.75rem", fontWeight: 700, color: catColor, lineHeight: 1 }}>{score}</span>
              <span className="sans" style={{ fontSize: "0.85rem", color: "var(--muted-mid)", marginTop: "0.2rem" }}>/100</span>
            </div>
          </div>
          <span className={`tag-badge ${getCategoryClass(category)}`} style={{ borderRadius: "100px", fontSize: "0.75rem", padding: "0.4rem 1.25rem", letterSpacing: "0.15em", border: "none" }}>{category}</span>
        </div>

        {/* AI Insight Card */}
        <div className="card-glass" style={{ padding: "2.5rem", gridColumn: "span 2" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.25rem" }}>
            <span style={{ width: "2.5rem", height: "2.5rem", borderRadius: "10px", background: "rgba(95, 75, 254, 0.15)", border: "1px solid rgba(95, 75, 254, 0.3)", color: "var(--primary)", fontSize: "1.2rem", display: "flex", alignItems: "center", justifyContent: "center" }}>✦</span>
            <span className="sans" style={{ fontWeight: 600, fontSize: "1.1rem", color: "#ffffff" }}>AI Insight</span>
            {llmLoading && (
              <span className="spinner" style={{ width: "1rem", height: "1rem", borderTopColor: "var(--primary)", borderColor: "rgba(255,255,255,0.1)", marginLeft: "0.5rem" }} />
            )}
          </div>

          {/* LLM insight — shown when ready, falls back to rule-based */}
          {llmInsight ? (
            <div style={{ fontSize: "0.95rem", lineHeight: 1.8, color: "var(--muted-mid)", whiteSpace: "pre-wrap" }}>
              {llmInsight}
            </div>
          ) : !llmLoading ? (
            <p className="sans" style={{ fontSize: "1.05rem", lineHeight: 1.8, color: "var(--muted-mid)" }}>
              {`This video shows ${category?.toLowerCase()} levels of attention stimulation.` +
                (data.visual?.visual_score > 70 ? " High visual fragmentation contributes significantly." : "") +
                (score > 70 ? " Frequent audio spikes increase stimulation." : "") +
                (data.text?.text_afi_score > 70 ? " Rapid on-screen text adds to cognitive load." : "")}
            </p>
          ) : (
            <p className="sans" style={{ fontSize: "1rem", color: "var(--muted)", fontStyle: "italic" }}>
              Generating insight from matrix...
            </p>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "1rem", marginTop: "2.5rem" }}>
            {modalityData.map((m) => (
              <div key={m.name} style={{ background: "rgba(255,255,255,0.02)", borderRadius: "16px", padding: "1.25rem", border: "1px solid var(--card-border)" }}>
                <div className="sans" style={{ color: "var(--muted-mid)", fontSize: "0.85rem", marginBottom: "0.5rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>{m.name}</div>
                <div className="mono" style={{ fontSize: "1.6rem", fontWeight: 700, color: m.score > 70 ? "#f87171" : m.score > 50 ? "#fb923c" : "var(--primary)" }}>
                  {typeof m.score === "number" ? m.score.toFixed(1) : m.score}
                </div>
                <div style={{ marginTop: "0.85rem", height: "4px", background: "rgba(255,255,255,0.08)", borderRadius: "9999px", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${m.score}%`, background: m.score > 70 ? "#f87171" : m.score > 50 ? "#fb923c" : "var(--primary)", borderRadius: "9999px", transition: "width 1.2s cubic-bezier(0.16,1,0.3,1)" }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ML INSIGHTS CARDS */}
      {insights.length > 0 && (
        <motion.div variants={FADE_UP} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <span style={{ width: "0.4rem", height: "0.4rem", borderRadius: "50%", background: "var(--primary)", boxShadow: "0 0 8px var(--primary)" }} />
            <span className="sans" style={{ fontWeight: 600, fontSize: "0.95rem", color: "var(--primary)", letterSpacing: "0.06em", textTransform: "uppercase" }}>ML Subsystem Checks</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
            {insights.map((insight: string, i: number) => {
              const isWarning   = insight.startsWith("⚠️");
              const borderColor = isWarning ? "rgba(248,113,113,0.3)" : "rgba(95, 75, 254, 0.2)";
              const bgColor     = isWarning ? "rgba(248,113,113,0.06)" : "rgba(95, 75, 254, 0.05)";
              const dotColor    = isWarning ? "#f87171" : "var(--primary)";
              return (
                <motion.div 
                  whileHover={{ y: -4, transition: { duration: 0.2 } }}
                  key={i} className="card-glass" style={{ padding: "1.25rem 1.5rem", borderColor, background: bgColor, display: "flex", gap: "0.85rem", alignItems: "flex-start" }}>
                  <span style={{ color: dotColor, fontSize: "0.9rem", marginTop: "0.15rem", flexShrink: 0 }}>→</span>
                  <span className="sans" style={{ color: "var(--foreground)", fontSize: "0.95rem", lineHeight: 1.6 }}>{insight}</span>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* FEATURE IMPORTANCE */}
      {importanceData.length > 0 && (
        <motion.div variants={FADE_UP} className="card-glass" style={{ padding: "2.5rem" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "1.5rem", flexWrap: "wrap", gap: "0.5rem" }}>
            <div>
              <h2 className="sans" style={{ fontWeight: 600, fontSize: "1.2rem", marginBottom: "0.25rem", color: "#ffffff" }}>Model Weighting</h2>
              <p style={{ color: "var(--muted)", fontSize: "0.85rem" }}>What the ML model weighted most heavily for this score</p>
            </div>
            {topFeature && (
              <div style={{ background: "rgba(95, 75, 254, 0.08)", border: "1px solid rgba(95, 75, 254, 0.2)", borderRadius: "12px", padding: "0.75rem 1.25rem", textAlign: "right" }}>
                <div className="sans" style={{ fontSize: "0.7rem", color: "var(--muted-mid)", marginBottom: "0.2rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Top driver</div>
                <div className="sans" style={{ fontSize: "1rem", fontWeight: 600, color: "var(--primary)" }}>{topFeature.name}</div>
                <div className="mono" style={{ fontSize: "0.8rem", color: "var(--muted-mid)" }}>{topFeature.value}% weight</div>
              </div>
            )}
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={importanceData} layout="vertical" barSize={18} margin={{ left: 16, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(167,139,250,0.08)" horizontal={false} />
              <XAxis type="number" domain={[0, 100]} tick={{ fill: "#6b6890", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
              <YAxis type="category" dataKey="name" width={130} tick={{ fill: "#9ca3af", fontSize: 12, fontFamily: "'Inter', sans-serif" }} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: "rgba(167,139,250,0.04)" }} />
              <Bar dataKey="value" radius={[0, 8, 8, 0]} animationDuration={1500} animationEasing="ease-out">
                {importanceData.map((_, i) => (
                  <Cell key={i} fill={i === 0 ? "var(--primary)" : i === 1 ? "#7c3aed66" : "rgba(167,139,250,0.25)"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      )}

      {/* MODALITY & TIMELINE GRIDS */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.5rem" }}>
        {/* MODALITY BAR CHART */}
        <motion.div variants={FADE_UP} className="card-glass" style={{ padding: "2.5rem" }}>
          <h2 className="sans" style={{ fontWeight: 600, fontSize: "1.2rem", color: "#ffffff", marginBottom: "0.25rem" }}>Modality Breakdown</h2>
          <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginBottom: "1.5rem" }}>Visual, audio, and text sub-scores</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={modalityData} barSize={54}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(167,139,250,0.12)" />
              <XAxis dataKey="name" tick={{ fill: "#6b6890", fontSize: 12, fontFamily: "'Inter', sans-serif" }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fill: "#6b6890", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: "rgba(167,139,250,0.04)" }} />
              <Bar dataKey="score" fill="var(--primary)" radius={[8, 8, 0, 0]} animationDuration={1500} animationEasing="ease-out" />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* TIMELINE */}
        {timelineData.length > 0 && (
          <motion.div variants={FADE_UP} className="card-glass" style={{ padding: "2.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem", flexWrap: "wrap", gap: "0.5rem" }}>
              <div>
                <h2 className="sans" style={{ fontWeight: 600, fontSize: "1.2rem", marginBottom: "0.25rem", color: "#ffffff" }}>Stimulation Timeline</h2>
                <p className="sans" style={{ color: "var(--muted-mid)", fontSize: "0.85rem" }}>Scene-by-scene stimulation</p>
              </div>
              {peakScene && <span className="tag-badge badge-over" style={{ fontSize: "0.75rem", borderRadius: "100px", border: "none" }}>Peak Scene: {peakScene.scene}</span>}
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(167,139,250,0.12)" />
                <XAxis dataKey="scene" tick={{ fill: "#6b6890", fontSize: 12, fontFamily: "'Inter', sans-serif" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#6b6890", fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ stroke: "rgba(167,139,250,0.3)", strokeWidth: 2 }} />
                <Line type="monotone" dataKey="score" stroke="var(--primary)" strokeWidth={3} dot={{ r: 4, fill: "var(--primary)", strokeWidth: 0 }} activeDot={{ r: 7, fill: "#ffffff", strokeWidth: 0 }} animationDuration={2000} animationEasing="ease-out" />
              </LineChart>
            </ResponsiveContainer>
            {peakScene && (
              <div style={{ marginTop: "1.5rem", padding: "1.25rem", background: "rgba(248,113,113,0.05)", borderRadius: "16px", border: "1px solid rgba(248,113,113,0.2)" }}>
                <p className="sans" style={{ fontWeight: 500, color: "#fca5a5", fontSize: "0.95rem", marginBottom: "0.4rem" }}>Peak Stimulation Detected</p>
                <p className="sans" style={{ color: "rgba(248,113,113,0.85)", fontSize: "0.9rem", lineHeight: 1.6 }}>
                  Scene {peakScene.scene} registered the highest stimulation ({peakScene.score.toFixed(2)}) between {peakScene.start.toFixed(2)}s and {peakScene.end.toFixed(2)}s.
                </p>
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* Footer nav */}
      <motion.div variants={FADE_UP} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "1rem", paddingTop: "0.5rem" }}>
        {[
          { href: "/compare", icon: "⇄", label: "Compare Videos", desc: "Side-by-side AFI comparison" },
          { href: "/history", icon: "↻", label: "View History",   desc: "Browse past analyses" },
          { href: "/wellbeing",icon: "◎", label: "Wellness",        desc: "Track your media habits" },
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