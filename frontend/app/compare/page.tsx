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
    const formData = new FormData();
    if (file) {
      formData.append("video", file);
    } else if (url) {
      formData.append("url", url);
    } else {
      throw new Error("No input provided");
    }
    const response = await axios.post("http://127.0.0.1:8000/analyze", formData);
    return response.data;
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

  const tooltipStyle = { background: "#111", border: "1px solid #1e1e1e", borderRadius: "8px", color: "#f0f0f0" };

  return (
    <div className="container-section" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

      {/* HEADER */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.7rem", fontFamily: "monospace", color: "var(--muted)", marginBottom: "1rem" }}>
          <Link href="/" style={{ color: "var(--muted)", textDecoration: "none" }}>Home</Link>
          <span>/</span>
          <span style={{ color: "var(--foreground)" }}>Compare</span>
        </div>
        <h1 style={{ fontSize: "clamp(1.8rem, 4vw, 2.75rem)", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: "0.35rem" }}>
          Compare Videos
        </h1>
        <p style={{ color: "var(--muted)", fontSize: "0.85rem" }}>
          Analyze differences in attention stimulation side by side.
        </p>
      </div>

      {/* INPUT SECTION */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>

        {/* VIDEO A */}
        <div className="card" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "0.875rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
            <span style={{ width: "1.5rem", height: "1.5rem", borderRadius: "0.3rem", background: "#b8f03a", color: "#0a0a0a", fontSize: "0.7rem", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>A</span>
            <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>Video A</span>
          </div>

          <label style={{ display: "block", border: "2px dashed var(--border)", borderRadius: "0.625rem", padding: "1rem", textAlign: "center", cursor: "pointer", transition: "border-color 0.2s", borderColor: videoA ? "rgba(184,240,58,0.4)" : "var(--border)" }}>
            <input type="file" accept="video/*" style={{ display: "none" }} onChange={(e) => setVideoA(e.target.files?.[0] || null)} />
            {videoA ? (
              <><div style={{ color: "#b8f03a", fontSize: "1rem" }}>✓</div><div style={{ color: "#b8f03a", fontSize: "0.75rem", marginTop: "0.2rem" }}>{videoA.name}</div></>
            ) : (
              <><div style={{ color: "var(--muted)", fontSize: "1rem" }}>⬆</div><div style={{ color: "var(--muted)", fontSize: "0.75rem", marginTop: "0.2rem" }}>Upload video file</div></>
            )}
          </label>

          <div className="divider-or">OR</div>

          <input
            type="text"
            placeholder="Paste URL"
            value={urlA}
            onChange={(e) => setUrlA(e.target.value)}
            className="input-field"
          />
        </div>

        {/* VIDEO B */}
        <div className="card" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "0.875rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
            <span style={{ width: "1.5rem", height: "1.5rem", borderRadius: "0.3rem", background: "#f0f0f0", color: "#0a0a0a", fontSize: "0.7rem", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>B</span>
            <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>Video B</span>
          </div>

          <label style={{ display: "block", border: "2px dashed var(--border)", borderRadius: "0.625rem", padding: "1rem", textAlign: "center", cursor: "pointer", transition: "border-color 0.2s", borderColor: videoB ? "rgba(240,240,240,0.3)" : "var(--border)" }}>
            <input type="file" accept="video/*" style={{ display: "none" }} onChange={(e) => setVideoB(e.target.files?.[0] || null)} />
            {videoB ? (
              <><div style={{ color: "#f0f0f0", fontSize: "1rem" }}>✓</div><div style={{ color: "#f0f0f0", fontSize: "0.75rem", marginTop: "0.2rem" }}>{videoB.name}</div></>
            ) : (
              <><div style={{ color: "var(--muted)", fontSize: "1rem" }}>⬆</div><div style={{ color: "var(--muted)", fontSize: "0.75rem", marginTop: "0.2rem" }}>Upload video file</div></>
            )}
          </label>

          <div className="divider-or">OR</div>

          <input
            type="text"
            placeholder="Paste URL"
            value={urlB}
            onChange={(e) => setUrlB(e.target.value)}
            className="input-field"
          />
        </div>
      </div>

      {/* COMPARE BUTTON */}
      <button
        onClick={handleCompare}
        disabled={loading}
        className="btn-primary"
        style={{ width: "100%", padding: "0.875rem" }}
      >
        {loading ? (
          <span><span className="spinner" />Analyzing both videos...</span>
        ) : (
          "Compare ✦"
        )}
      </button>

      {/* RESULTS */}
      {resultA && resultB && (
        <>
          {/* SCORE CARDS */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div className="card" style={{ padding: "2rem", textAlign: "center", borderColor: "rgba(184,240,58,0.25)" }}>
              <p className="label-sm" style={{ marginBottom: "0.75rem" }}>Video A</p>
              <p className="mono" style={{ fontSize: "3.5rem", fontWeight: 700, color: "#b8f03a", lineHeight: 1 }}>
                {resultA.final.final_afi_score}
              </p>
              <span className={`tag-badge ${getCategoryClass(resultA.final.final_category)}`} style={{ marginTop: "0.75rem" }}>
                {resultA.final.final_category}
              </span>
            </div>

            <div className="card" style={{ padding: "2rem", textAlign: "center" }}>
              <p className="label-sm" style={{ marginBottom: "0.75rem" }}>Video B</p>
              <p className="mono" style={{ fontSize: "3.5rem", fontWeight: 700, color: "var(--foreground)", lineHeight: 1 }}>
                {resultB.final.final_afi_score}
              </p>
              <span className={`tag-badge ${getCategoryClass(resultB.final.final_category)}`} style={{ marginTop: "0.75rem" }}>
                {resultB.final.final_category}
              </span>
            </div>
          </div>

          {/* INSIGHT */}
          {comparisonInsight && (
            <div className="card" style={{ padding: "1.5rem", borderColor: "rgba(184,240,58,0.2)", background: "rgba(184,240,58,0.03)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.625rem" }}>
                <span style={{ width: "1.5rem", height: "1.5rem", borderRadius: "0.3rem", background: "rgba(184,240,58,0.1)", border: "1px solid rgba(184,240,58,0.25)", color: "#b8f03a", fontSize: "0.7rem", display: "flex", alignItems: "center", justifyContent: "center" }}>✦</span>
                <span className="label-sm">Comparison Insight</span>
              </div>
              <p style={{ fontSize: "0.9rem", lineHeight: 1.65 }}>{comparisonInsight}</p>
            </div>
          )}

          {/* BAR CHART */}
          <div className="card" style={{ padding: "2rem" }}>
            <h2 style={{ fontWeight: 700, fontSize: "1.1rem", marginBottom: "0.3rem" }}>Modality Comparison</h2>
            <p style={{ color: "var(--muted)", fontSize: "0.78rem", marginBottom: "1.5rem" }}>Visual, audio, and text scores for both videos</p>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={modalityComparison} barSize={32} barGap={6}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" />
                <XAxis dataKey="name" tick={{ fill: "#555", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#555", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(184,240,58,0.04)" }} />
                <Legend wrapperStyle={{ fontSize: 11, color: "#555" }} />
                <Bar dataKey="videoA" name="Video A" fill="#b8f03a" radius={[4, 4, 0, 0]} />
                <Bar dataKey="videoB" name="Video B" fill="#333"    radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* LINE CHART */}
          <div className="card" style={{ padding: "2rem" }}>
            <h2 style={{ fontWeight: 700, fontSize: "1.1rem", marginBottom: "0.3rem" }}>Timeline Comparison</h2>
            <p style={{ color: "var(--muted)", fontSize: "0.78rem", marginBottom: "1.5rem" }}>Scene-by-scene stimulation for both videos</p>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={timelineComparison}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" />
                <XAxis dataKey="time" tick={{ fill: "#555", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#555", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11, color: "#555" }} />
                <Line type="monotone" dataKey="videoA" name="Video A" stroke="#b8f03a" strokeWidth={2.5} dot={{ r: 3, fill: "#b8f03a", strokeWidth: 0 }} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="videoB" name="Video B" stroke="#555"    strokeWidth={2.5} dot={{ r: 3, fill: "#555",    strokeWidth: 0 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {/* Footer nav */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "0.75rem", paddingTop: "0.5rem" }}>
        {[
          { href: "/results", icon: "←", label: "Results",  desc: "Detailed single analysis" },
          { href: "/history", icon: "↻", label: "History",  desc: "All past comparisons" },
          { href: "/wellness",icon: "◎", label: "Wellness", desc: "Media health overview" },
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