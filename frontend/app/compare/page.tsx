"use client";

import { useState } from "react";
import axios from "axios";
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
  Legend,
} from "recharts";
import { motion, Variants } from "framer-motion";

const STAGGER_CONTAINER: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.12 } }
};

const FADE_UP: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 60, damping: 20 } }
};

// ── same logic as original ──────────────────────────────────────────────────
export default function ComparePage() {
  const [videoA, setVideoA] = useState<File | null>(null);
  const [videoB, setVideoB] = useState<File | null>(null);
  const [urlA, setUrlA] = useState("");
  const [urlB, setUrlB] = useState("");
  const [resultA, setResultA] = useState<any>(null);
  const [resultB, setResultB] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const analyzeVideo = async (file?: File, url?: string) => {
    const token = localStorage.getItem("token");
    const headers = (token && token !== "undefined" && token !== "null") ? { Authorization: `Bearer ${token}` } : {};

    if (file) {
      const formData = new FormData();
      formData.append("file", file);
      const response = await axios.post("http://127.0.0.1:8000/analyze", formData, { headers });
      return response.data;
    } else if (url) {
      const response = await axios.post("http://127.0.0.1:8000/analyze-url", { url: url.trim() }, { headers });
      return response.data;
    } else {
      throw new Error("No file or URL provided.");
    }
  };

  const handleCompare = async () => {
    if ((!videoA && !urlA) || (!videoB && !urlB)) {
      alert("Provide both videos (file or URL)");
      return;
    }
    try {
      setLoading(true);
      const [resA, resB] = await Promise.all([
        analyzeVideo(videoA || undefined, urlA),
        analyzeVideo(videoB || undefined, urlB),
      ]);
      setResultA(resA);
      setResultB(resB);
    } catch (error) {
      console.error("Comparison failed:", error);
      alert("Error analyzing videos");
    } finally {
      setLoading(false);
    }
  };

  const modalityComparison =
    resultA && resultB
      ? [
          { name: "Visual", videoA: resultA.visual.visual_score,       videoB: resultB.visual.visual_score },
          { name: "Audio",  videoA: resultA.audio.audio_afi_score,      videoB: resultB.audio.audio_afi_score },
          { name: "Text",   videoA: resultA.text.text_afi_score,        videoB: resultB.text.text_afi_score },
        ]
      : [];

  const timelineComparison =
    resultA && resultB
      ? Array.from(
          { length: Math.max(resultA.visual.timeline.length, resultB.visual.timeline.length) },
          (_, i) => ({
            time: resultA.visual.timeline[i]?.start ?? resultB.visual.timeline[i]?.start ?? i,
            videoA: resultA.visual.timeline[i]?.avg_motion ?? null,
            videoB: resultB.visual.timeline[i]?.avg_motion ?? null,
          })
        )
      : [];

  const comparisonInsight =
    resultA && resultB
      ? (() => {
          const diff = resultB.final.final_afi_score - resultA.final.final_afi_score;
          const percent = Math.abs((diff / resultA.final.final_afi_score) * 100).toFixed(1);
          if (diff > 0) return `Video B is ${percent}% more stimulating than Video A.`;
          if (diff < 0) return `Video A is ${percent}% more stimulating than Video B.`;
          return "Both videos have similar stimulation levels.";
        })()
      : null;
  // ─────────────────────────────────────────────────────────────────────────

  function getCategoryClass(cat: string) {
    if (cat === "Calm") return "badge-calm";
    if (cat === "Moderate") return "badge-moderate";
    if (cat === "High") return "badge-high";
    return "badge-over";
  }

  const tooltipStyle = { background: "#0d0d1a", border: "1px solid rgba(167,139,250,0.12)", borderRadius: "8px", color: "#f0f0f0" };

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
          <span style={{ color: "var(--foreground)" }}>Compare</span>
        </div>
        <h1 className="display-font" style={{ fontSize: "clamp(1.8rem, 4vw, 2.75rem)", fontWeight: 600, letterSpacing: "-0.02em", marginBottom: "0.35rem", color: "#ffffff" }}>
          Compare Videos
        </h1>
        <p className="sans" style={{ color: "var(--muted-mid)", fontSize: "0.95rem" }}>
          Analyze differences in attention stimulation side by side.
        </p>
      </motion.div>

      {/* INPUT SECTION */}
      <motion.div variants={FADE_UP} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.5rem" }}>

        {/* VIDEO A */}
        <div className="card-glass" style={{ padding: "2.5rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
            <span style={{ width: "2.5rem", height: "2.5rem", borderRadius: "10px", background: "var(--primary)", color: "#05050f", fontSize: "1rem", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 16px rgba(95, 75, 254, 0.4)" }}>A</span>
            <span className="sans" style={{ fontWeight: 600, fontSize: "1.1rem", color: "#ffffff" }}>Video A</span>
          </div>

          <label style={{ display: "block", background: videoA ? "rgba(95, 75, 254, 0.08)" : "rgba(255, 255, 255, 0.02)", border: "2px dashed", borderColor: videoA ? "rgba(95, 75, 254, 0.5)" : "var(--card-border)", borderRadius: "16px", padding: "2rem 1.5rem", textAlign: "center", cursor: "pointer", transition: "all 0.3s ease" }}>
            <input type="file" accept="video/*" style={{ display: "none" }} onChange={(e) => setVideoA(e.target.files?.[0] || null)} />
            {videoA ? (
              <><div className="anim-fade-up" style={{ color: "var(--primary)", fontSize: "1.5rem", marginBottom: "0.5rem" }}>✓</div><div className="sans" style={{ color: "#ffffff", fontSize: "0.95rem", fontWeight: 500 }}>{videoA.name}</div></>
            ) : (
              <><div style={{ color: "var(--muted-mid)", fontSize: "1.25rem", marginBottom: "0.4rem" }}>↑</div><div className="sans" style={{ color: "var(--muted)", fontSize: "0.9rem" }}>Upload video file</div></>
            )}
          </label>

          <div className="divider-or">OR</div>

          <input
            type="text"
            placeholder="Paste URL"
            value={urlA}
            onChange={(e) => setUrlA(e.target.value)}
            className="input-field"
            style={{ borderRadius: "12px", padding: "1rem" }}
          />
        </div>

        {/* VIDEO B */}
        <div className="card-glass" style={{ padding: "2.5rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
            <span style={{ width: "2.5rem", height: "2.5rem", borderRadius: "10px", background: "#f8fafc", color: "#05050f", fontSize: "1rem", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 16px rgba(248, 250, 252, 0.4)" }}>B</span>
            <span className="sans" style={{ fontWeight: 600, fontSize: "1.1rem", color: "#ffffff" }}>Video B</span>
          </div>

          <label style={{ display: "block", background: videoB ? "rgba(248, 250, 252, 0.08)" : "rgba(255, 255, 255, 0.02)", border: "2px dashed", borderColor: videoB ? "rgba(248, 250, 252, 0.5)" : "var(--card-border)", borderRadius: "16px", padding: "2rem 1.5rem", textAlign: "center", cursor: "pointer", transition: "all 0.3s ease" }}>
            <input type="file" accept="video/*" style={{ display: "none" }} onChange={(e) => setVideoB(e.target.files?.[0] || null)} />
            {videoB ? (
              <><div className="anim-fade-up" style={{ color: "#f8fafc", fontSize: "1.5rem", marginBottom: "0.5rem" }}>✓</div><div className="sans" style={{ color: "#ffffff", fontSize: "0.95rem", fontWeight: 500 }}>{videoB.name}</div></>
            ) : (
              <><div style={{ color: "var(--muted-mid)", fontSize: "1.25rem", marginBottom: "0.4rem" }}>↑</div><div className="sans" style={{ color: "var(--muted)", fontSize: "0.9rem" }}>Upload video file</div></>
            )}
          </label>

          <div className="divider-or">OR</div>

          <input
            type="text"
            placeholder="Paste URL"
            value={urlB}
            onChange={(e) => setUrlB(e.target.value)}
            className="input-field"
            style={{ borderRadius: "12px", padding: "1rem" }}
          />
        </div>
      </motion.div>

      {/* COMPARE BUTTON */}
      <motion.button
        variants={FADE_UP}
        onClick={handleCompare}
        disabled={loading}
        className="btn-primary"
        style={{ width: "100%", padding: "1.1rem" }}
      >
        {loading ? (
          <span><span className="spinner" style={{ marginRight: "0.5rem" }}/>Analyzing both videos...</span>
        ) : (
          "Compare Videos ✦"
        )}
      </motion.button>

      {/* RESULTS */}
      {resultA && resultB && (
        <motion.div variants={STAGGER_CONTAINER} initial="hidden" animate="show" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* SCORE CARDS */}
          <motion.div variants={FADE_UP} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.5rem" }}>
            <div className="card-glass" style={{ padding: "3rem 2rem", textAlign: "center" }}>
              <p className="sans" style={{ color: "var(--muted-mid)", fontSize: "0.95rem", marginBottom: "1.25rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Video A Score</p>
              <p className="mono" style={{ fontSize: "4.5rem", fontWeight: 700, color: "var(--primary)", lineHeight: 1 }}>
                {resultA.final.final_afi_score}
              </p>
              <span className={`tag-badge ${getCategoryClass(resultA.final.final_category)}`} style={{ marginTop: "1.5rem", borderRadius: "100px", fontSize: "0.75rem", padding: "0.4rem 1.25rem", border: "1px solid rgba(95, 75, 254, 0.3)", letterSpacing: "0.1em" }}>
                {resultA.final.final_category}
              </span>
            </div>

            <div className="card-glass" style={{ padding: "3rem 2rem", textAlign: "center" }}>
              <p className="sans" style={{ color: "var(--muted-mid)", fontSize: "0.95rem", marginBottom: "1.25rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Video B Score</p>
              <p className="mono" style={{ fontSize: "4.5rem", fontWeight: 700, color: "#ffffff", lineHeight: 1 }}>
                {resultB.final.final_afi_score}
              </p>
              <span className={`tag-badge ${getCategoryClass(resultB.final.final_category)}`} style={{ marginTop: "1.5rem", borderRadius: "100px", fontSize: "0.75rem", padding: "0.4rem 1.25rem", border: "1px solid rgba(255, 255, 255, 0.2)", letterSpacing: "0.1em" }}>
                {resultB.final.final_category}
              </span>
            </div>
          </motion.div>

          {/* INSIGHT */}
          {comparisonInsight && (
            <motion.div variants={FADE_UP} className="card-glass" style={{ padding: "2.5rem", background: "rgba(95, 75, 254, 0.05)", borderColor: "rgba(95, 75, 254, 0.2)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.25rem" }}>
                <span style={{ width: "2.5rem", height: "2.5rem", borderRadius: "10px", background: "rgba(95, 75, 254, 0.15)", border: "1px solid rgba(95, 75, 254, 0.3)", color: "var(--primary)", fontSize: "1.2rem", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 16px rgba(95, 75, 254, 0.2)" }}>✦</span>
                <span className="sans" style={{ fontWeight: 600, fontSize: "1.1rem", color: "#ffffff" }}>Comparison Insight</span>
              </div>
              <p className="sans" style={{ fontSize: "1.05rem", lineHeight: 1.7, color: "var(--muted-mid)" }}>{comparisonInsight}</p>
            </motion.div>
          )}

          {/* BAR CHART */}
          <motion.div variants={FADE_UP} className="card-glass" style={{ padding: "2.5rem" }}>
            <h2 className="sans" style={{ fontWeight: 600, fontSize: "1.2rem", marginBottom: "0.3rem", color: "#ffffff" }}>Modality Comparison</h2>
            <p className="sans" style={{ color: "var(--muted)", fontSize: "0.85rem", marginBottom: "1.5rem" }}>Visual, audio, and text scores for both videos</p>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={modalityComparison} barSize={40} barGap={8}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(167,139,250,0.12)" />
                <XAxis dataKey="name" tick={{ fill: "#6b6890", fontSize: 13, fontFamily: "'Inter', sans-serif" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#6b6890", fontSize: 12, fontFamily: "'Inter', sans-serif" }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: "rgba(167,139,250,0.04)" }} />
                <Legend wrapperStyle={{ fontSize: 13, color: "var(--muted)", fontFamily: "'Inter', sans-serif", paddingTop: "1.5rem" }} />
                <Bar dataKey="videoA" name="Video A" fill="var(--primary)" radius={[8, 8, 0, 0]} animationDuration={1500} animationEasing="ease-out" />
                <Bar dataKey="videoB" name="Video B" fill="#ffffff" radius={[8, 8, 0, 0]} animationDuration={1500} animationEasing="ease-out" />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>

          {/* LINE CHART */}
          <motion.div variants={FADE_UP} className="card-glass" style={{ padding: "2.5rem" }}>
            <h2 className="sans" style={{ fontWeight: 600, fontSize: "1.2rem", marginBottom: "0.3rem", color: "#ffffff" }}>Timeline Comparison</h2>
            <p className="sans" style={{ color: "var(--muted)", fontSize: "0.85rem", marginBottom: "1.5rem" }}>Scene-by-scene stimulation for both videos</p>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={timelineComparison}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(167,139,250,0.12)" />
                <XAxis dataKey="time" tick={{ fill: "#6b6890", fontSize: 13, fontFamily: "'Inter', sans-serif" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#6b6890", fontSize: 12, fontFamily: "'Inter', sans-serif" }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ stroke: "rgba(167,139,250,0.3)", strokeWidth: 2 }} />
                <Legend wrapperStyle={{ fontSize: 13, color: "var(--muted)", fontFamily: "'Inter', sans-serif", paddingTop: "1.5rem" }} />
                <Line type="monotone" dataKey="videoA" name="Video A" stroke="var(--primary)" strokeWidth={3} dot={{ r: 4, fill: "var(--primary)", strokeWidth: 0 }} activeDot={{ r: 8, strokeWidth: 0 }} animationDuration={2000} animationEasing="ease-out" />
                <Line type="monotone" dataKey="videoB" name="Video B" stroke="#ffffff" strokeWidth={3} dot={{ r: 4, fill: "#ffffff", strokeWidth: 0 }} activeDot={{ r: 8, strokeWidth: 0 }} animationDuration={2000} animationEasing="ease-out" />
              </LineChart>
            </ResponsiveContainer>
          </motion.div>
        </motion.div>
      )}

      {/* Footer nav */}
      <motion.div variants={FADE_UP} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "1rem", paddingTop: "0.5rem" }}>
        {[
          { href: "/results", icon: "←", label: "Results",  desc: "Detailed single analysis" },
          { href: "/history", icon: "↻", label: "History",  desc: "All past comparisons" },
          { href: "/wellbeing",icon: "◎", label: "Wellness", desc: "Media health overview" },
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