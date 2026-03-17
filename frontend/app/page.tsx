"use client";

import { useState } from "react";
import Link from "next/link";

// ── same logic as original ──────────────────────────────────────────────────
export default function HomePage() {
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [analyzed, setAnalyzed] = useState(false);

  const handleAnalyze = async () => {
    if (!file && !url) {
      alert("Upload a file or paste a URL");
      return;
    }

    const formData = new FormData();
    if (file) {
      formData.append("video", file);
    } else {
      formData.append("url", url);
    }

    try {
      setLoading(true);
      const res = await fetch("http://localhost:8000/analyze", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      localStorage.setItem("afiResult", JSON.stringify(data));
      setAnalyzed(true);
    } catch (err) {
      console.error(err);
      alert("Error analyzing video");
    } finally {
      setLoading(false);
    }
  };
  // ───────────────────────────────────────────────────────────────────────────

  const features = [
    { icon: "◈", title: "Visual Scoring", desc: "Cuts, motion, colour bursts, on-screen text density" },
    { icon: "◉", title: "Audio Analysis", desc: "BPM, sudden loud events, overlapping sounds" },
    { icon: "◎", title: "Text Detection", desc: "Caption speed, emoji frequency, hook language" },
    { icon: "◆", title: "Timeline View", desc: "Per-scene stimulation mapped across the full video" },
  ];

  return (
    <div>
      {/* ── HERO ──────────────────────────────────────────────── */}
      <section className="grid-bg" style={{ position: "relative", overflow: "hidden" }}>
        {/* Glow orb */}
        <div style={{
          position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)",
          width: "700px", height: "350px",
          background: "radial-gradient(ellipse, rgba(184,240,58,0.07) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />

        <div className="container-section" style={{ textAlign: "center", paddingTop: "4rem", paddingBottom: "3rem" }}>

          {/* Badge */}
          <div className="anim-fade-up" style={{ marginBottom: "1.5rem" }}>
            <span className="tag-badge" style={{ borderColor: "rgba(184,240,58,0.3)", color: "#b8f03a", background: "rgba(184,240,58,0.06)" }}>
              ✦ AI-Powered Attention Analysis
            </span>
          </div>

          {/* Heading */}
          <div className="anim-fade-up delay-1" style={{ marginBottom: "1rem" }}>
            <h1 style={{ fontSize: "clamp(2.6rem, 7vw, 5rem)", fontWeight: 800, lineHeight: 1.05, letterSpacing: "-0.02em", margin: 0 }}>
              Attention<br />
              <span style={{ background: "linear-gradient(135deg,#f0f0f0,#b8f03a)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                Fragmentation
              </span><br />
              Index
            </h1>
          </div>

          <p className="anim-fade-up delay-2" style={{ color: "var(--muted)", fontSize: "1rem", maxWidth: "26rem", margin: "0 auto 2.5rem", lineHeight: 1.6 }}>
            Analyze short-form videos for attention stimulation using AI. Understand exactly how content hijacks your brain.
          </p>

          {/* Stats Row */}
          <div className="anim-fade-up delay-3" style={{ display: "flex", justifyContent: "center", gap: "2.5rem", marginBottom: "3rem" }}>
            {[{ v: "2.3B", l: "Videos Analyzed" }, { v: "94%", l: "Accuracy Rate" }, { v: "<2s", l: "Analysis Speed" }].map((s, i) => (
              <div key={i} style={{ textAlign: "center" }}>
                <div className="mono" style={{ fontSize: "1.4rem", fontWeight: 700, color: "#b8f03a" }}>{s.v}</div>
                <div style={{ fontSize: "0.7rem", color: "var(--muted)" }}>{s.l}</div>
              </div>
            ))}
          </div>

          {/* ── UPLOAD CARD ── */}
          <div className="anim-fade-up delay-4" style={{ maxWidth: "30rem", margin: "0 auto" }}>
            <div className="card" style={{ padding: "1.75rem", textAlign: "left", boxShadow: "0 24px 64px rgba(0,0,0,0.4)" }}>

              {/* File upload drop zone */}
              <div style={{ marginBottom: "0.5rem" }}>
                <p className="label-sm" style={{ marginBottom: "0.5rem" }}>Upload Video File</p>
                <label
                  style={{
                    display: "block",
                    border: "2px dashed var(--border)",
                    borderRadius: "0.625rem",
                    padding: "1.5rem",
                    textAlign: "center",
                    cursor: "pointer",
                    transition: "border-color 0.2s, background 0.2s",
                    background: file ? "rgba(184,240,58,0.04)" : "transparent",
                    borderColor: file ? "rgba(184,240,58,0.4)" : "var(--border)",
                  }}
                  onMouseEnter={(e) => { if (!file) (e.currentTarget.style.borderColor = "rgba(184,240,58,0.3)"); }}
                  onMouseLeave={(e) => { if (!file) (e.currentTarget.style.borderColor = "var(--border)"); }}
                >
                  <input
                    type="file"
                    style={{ display: "none" }}
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                  />
                  {file ? (
                    <>
                      <div style={{ color: "#b8f03a", fontSize: "1.25rem", marginBottom: "0.25rem" }}>✓</div>
                      <div style={{ color: "#b8f03a", fontSize: "0.8rem", fontWeight: 600 }}>{file.name}</div>
                      <div style={{ color: "var(--muted)", fontSize: "0.7rem" }}>{(file.size / 1e6).toFixed(1)} MB</div>
                    </>
                  ) : (
                    <>
                      <div style={{ color: "var(--muted)", fontSize: "1.25rem", marginBottom: "0.35rem" }}>⬆</div>
                      <div style={{ fontSize: "0.82rem", fontWeight: 600, marginBottom: "0.2rem" }}>Drop video or click to browse</div>
                      <div style={{ color: "var(--muted)", fontSize: "0.7rem" }}>MP4, MOV, AVI, WebM</div>
                    </>
                  )}
                </label>
              </div>

              <div className="divider-or" style={{ margin: "0.75rem 0" }}>OR</div>

              {/* URL Input */}
              <div style={{ marginBottom: "1rem" }}>
                <p className="label-sm" style={{ marginBottom: "0.5rem" }}>Paste Video URL</p>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "var(--muted)", fontSize: "0.8rem" }}>↗</span>
                  <input
                    type="text"
                    placeholder="https://tiktok.com/@user/video/..."
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="input-field"
                    style={{ paddingLeft: "2rem" }}
                  />
                </div>
              </div>

              {/* Analyze Button */}
              <button
                onClick={handleAnalyze}
                disabled={loading || (!file && !url)}
                className="btn-primary"
                style={{ width: "100%", opacity: (!file && !url) ? 0.45 : 1 }}
              >
                {loading ? (
                  <span><span className="spinner" />Analyzing...</span>
                ) : (
                  "Analyze ✦"
                )}
              </button>

              {/* View Result Button — same logic, same href */}
              {analyzed && (
                <a
                  href="/results"
                  className="btn-secondary"
                  style={{ width: "100%", display: "block", textAlign: "center", marginTop: "0.625rem" }}
                >
                  View Result →
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── MARQUEE ── */}
      <div style={{ overflow: "hidden", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)", padding: "0.625rem 0", margin: "2.5rem 0" }}>
        <div className="marquee-track" style={{ display: "flex", gap: "2rem", whiteSpace: "nowrap" }}>
          {[...Array(2)].flatMap((_, i) =>
            ["Visual Scoring", "Audio Analysis", "Text Detection", "Scene Timeline", "AFI Score", "Wellness Insights", "Compare Videos", "AI Explanations"].map((t, j) => (
              <span key={`${i}-${j}`} className="label-sm" style={{ color: "var(--muted)" }}>
                {t} <span style={{ color: "#b8f03a", margin: "0 0.35rem" }}>✦</span>
              </span>
            ))
          )}
        </div>
      </div>

      {/* ── FEATURES ── */}
      <section className="container-section" style={{ paddingTop: "0.5rem", paddingBottom: "5rem" }}>
        <div style={{ textAlign: "center", marginBottom: "3rem" }}>
          <h2 style={{ fontSize: "1.75rem", fontWeight: 800, marginBottom: "0.5rem" }}>How AFI Works</h2>
          <p style={{ color: "var(--muted)", fontSize: "0.88rem", maxWidth: "22rem", margin: "0 auto" }}>
            Three modalities. One score. A complete picture of attention manipulation.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "1rem" }}>
          {features.map((f, i) => (
            <div key={i} className="card card-hover" style={{ padding: "1.5rem" }}>
              <div style={{ fontSize: "1.4rem", color: "#b8f03a", marginBottom: "0.75rem" }}>{f.icon}</div>
              <div style={{ fontWeight: 700, fontSize: "0.9rem", marginBottom: "0.4rem" }}>{f.title}</div>
              <div style={{ color: "var(--muted)", fontSize: "0.78rem", lineHeight: 1.6 }}>{f.desc}</div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="card" style={{ marginTop: "3rem", padding: "2.5rem", textAlign: "center", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at center, rgba(184,240,58,0.04), transparent 70%)", pointerEvents: "none" }} />
          <h2 style={{ fontSize: "1.35rem", fontWeight: 800, marginBottom: "0.4rem", position: "relative" }}>Ready to measure stimulation?</h2>
          <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginBottom: "1.5rem", position: "relative" }}>Upload a video and get your AFI score in seconds.</p>
          <div style={{ display: "flex", justifyContent: "center", gap: "0.75rem", flexWrap: "wrap", position: "relative" }}>
            <Link href="/" className="btn-primary" style={{ fontSize: "0.82rem" }}>Analyze Now</Link>
            <Link href="/compare" className="btn-secondary" style={{ fontSize: "0.82rem" }}>Compare Two Videos</Link>
            <Link href="/wellness" className="btn-secondary" style={{ fontSize: "0.82rem" }}>Wellness Dashboard</Link>
          </div>
        </div>
      </section>
    </div>
  );
}