"use client";
import { useState } from "react";
import Link from "next/link";

export default function HomePage() {
  // ── same backend logic ───────────────────────────────────────────────────
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [analyzed, setAnalyzed] = useState(false);

  const handleAnalyze = async () => {
    if (!file && !url) { alert("Upload a file or paste a URL"); return; }

    try {
      setLoading(true);
      let data;

      if (file) {
        // ── file upload ── FormData to /analyze
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("http://localhost:8000/analyze", {
          method: "POST",
          body: formData,
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.detail || `Server error ${res.status}`);
        }
        data = await res.json();

      } else {
        // ── URL ── JSON body to /analyze-url
        const res = await fetch("http://localhost:8000/analyze-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: url.trim() }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.detail || `Server error ${res.status}`);
        }
        data = await res.json();
      }

      localStorage.setItem("afiResult", JSON.stringify(data));
      setAnalyzed(true);

    } catch (err: any) {
      console.error(err);
      alert(err.message || "Error analyzing video");
    } finally {
      setLoading(false);
    }
  };
  // ─────────────────────────────────────────────────────────────────────────

  const features = [
    { icon: "◈", title: "Visual Scoring",  desc: "Cuts, motion, colour bursts, on-screen text density" },
    { icon: "◉", title: "Audio Analysis",  desc: "BPM, sudden loud events, overlapping sounds" },
    { icon: "◎", title: "Text Detection",  desc: "Caption speed, emoji frequency, hook language" },
    { icon: "◆", title: "Timeline View",   desc: "Per-scene stimulation mapped across the full video" },
  ];

  return (
    <div style={{ position: "relative", zIndex: 1 }}>

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "6rem 2.5rem 4rem",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Soft Violet/Cyan glow */}
        <div style={{
          position: "absolute",
          width: "60vw", height: "60vw",
          top: "40%", left: "50%",
          transform: "translate(-50%, -50%)",
          background: "radial-gradient(ellipse, rgba(167,139,250,0.06) 0%, rgba(129,140,248,0.03) 40%, transparent 70%)",
          pointerEvents: "none",
          zIndex: 0,
          animation: "slowPulse 8s ease-in-out infinite alternate"
        }} />

        <div style={{ position: "relative", zIndex: 1, textAlign: "center", maxWidth: "50rem", width: "100%" }}>

          {/* Eyebrow */}
          <div className="anim-fade-up" style={{ marginBottom: "2.5rem" }}>
            <span className="label-sm" style={{ letterSpacing: "0.28em" }}>
              AI-Powered Attention Analysis
            </span>
          </div>

          {/* Title */}
          <h1 className="anim-fade-up delay-1 display-font" style={{
            fontSize: "clamp(2.8rem, 8vw, 6.5rem)",
            fontWeight: 600,
            lineHeight: 1.05,
            letterSpacing: "-0.02em",
            marginBottom: "2rem",
            color: "#ffffff"
          }}>
            Attention<br />
            <span style={{ 
              background: "linear-gradient(to right, #a78bfa, #818cf8)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent"
            }}>Fragmentation</span><br />
            Index
          </h1>

          {/* Subtext */}
          <p className="anim-fade-up delay-2 sans" style={{
            color: "rgba(232, 232, 240, 0.6)",
            fontSize: "1.05rem",
            letterSpacing: "0.02em",
            lineHeight: 1.85,
            maxWidth: "32rem",
            margin: "0 auto 3.5rem",
            fontWeight: 400
          }}>
            Measure the invisible forces that fragment your attention.
            Every cut, every sound spike, every word engineered to keep you watching.
          </p>

          {/* Stats */}
          <div className="anim-fade-up delay-3" style={{
            display: "flex",
            justifyContent: "center",
            gap: "3rem",
            marginBottom: "4rem",
          }}>
            {[
              { v: "2.3B", l: "Videos Analyzed" },
              { v: "94%",  l: "Accuracy Rate" },
              { v: "<2s",  l: "Analysis Speed" },
            ].map((s, i) => (
              <div key={i} style={{ textAlign: "center" }}>
                <div className="mono" style={{ fontSize: "1.3rem", fontWeight: 700, color: "#a78bfa", marginBottom: "0.2rem" }}>
                  {s.v}
                </div>
                <div style={{ fontSize: "0.62rem", color: "rgba(232,232,240,0.3)", letterSpacing: "0.15em", textTransform: "uppercase" }}>
                  {s.l}
                </div>
              </div>
            ))}
          </div>

          {/* ── UPLOAD CARD ── */}
          <div className="anim-fade-up delay-4" style={{ maxWidth: "28rem", margin: "0 auto" }}>

            {/* SUCCESS STATE */}
            {analyzed ? (
              <div className="card-glass" style={{
                padding: "3rem 2.5rem",
                textAlign: "center",
              }}>
                <div style={{
                  width: "4rem", height: "4rem",
                  borderRadius: "50%",
                  border: "2px solid rgba(167, 139, 250, 0.6)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  margin: "0 auto 1.5rem",
                  color: "#a78bfa", fontSize: "1.5rem",
                  background: "rgba(167, 139, 250, 0.1)",
                  boxShadow: "0 0 20px rgba(167, 139, 250, 0.2)"
                }}>✓</div>
                <p className="label-sm" style={{ color: "#a78bfa", marginBottom: "0.5rem" }}>Analysis Complete</p>
                <p className="sans" style={{ fontSize: "1.1rem", fontWeight: 500, marginBottom: "0.4rem" }}>Your video has been analyzed</p>
                <p className="sans" style={{ color: "rgba(232, 232, 240, 0.4)", fontSize: "0.85rem", marginBottom: "2.5rem", wordBreak: "break-all" }}>
                  {file ? file.name : url}
                </p>
                <a href="/results" className="btn-primary" style={{ display: "block", width: "100%", marginBottom: "1rem" }}>
                  View Results →
                </a>
                <button
                  onClick={() => { setAnalyzed(false); setFile(null); setUrl(""); }}
                  className="btn-secondary"
                  style={{ width: "100%", cursor: "pointer" }}
                >
                  Analyze Another
                </button>
              </div>

            ) : (

              /* DEFAULT / UPLOAD STATE */
              <div className="card-glass" style={{
                padding: "2.5rem",
              }}>
                <p className="label-sm" style={{ marginBottom: "1rem" }}>Upload Video File</p>

                {/* Drop zone */}
                <label
                  style={{
                    display: "block",
                    border: `1.5px dashed ${file ? "rgba(167,139,250,0.6)" : "rgba(255,255,255,0.15)"}`,
                    borderRadius: "12px",
                    padding: "2.5rem 2rem",
                    textAlign: "center",
                    cursor: "pointer",
                    transition: "all 0.3s ease",
                    background: file ? "rgba(167, 139, 250, 0.08)" : "rgba(255, 255, 255, 0.02)",
                    marginBottom: "1.5rem",
                  }}
                  onMouseEnter={(e) => { 
                    if (!file) {
                      e.currentTarget.style.borderColor = "rgba(167, 139, 250, 0.4)"; 
                      e.currentTarget.style.background = "rgba(255, 255, 255, 0.04)";
                    }
                  }}
                  onMouseLeave={(e) => { 
                    if (!file) {
                      e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.15)"; 
                      e.currentTarget.style.background = "rgba(255, 255, 255, 0.02)";
                    }
                  }}
                >
                  <input type="file" style={{ display: "none" }} onChange={(e) => setFile(e.target.files?.[0] || null)} />
                  {file ? (
                    <>
                      <div className="anim-fade-up" style={{ color: "#a78bfa", fontSize: "1.5rem", marginBottom: "0.5rem" }}>✓</div>
                      <div className="sans" style={{ color: "#e8e8f0", fontSize: "0.95rem", fontWeight: 500 }}>{file.name}</div>
                      <div className="mono" style={{ color: "rgba(232, 232, 240, 0.4)", fontSize: "0.75rem", marginTop: "0.4rem" }}>
                        {(file.size / 1e6).toFixed(1)} MB
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ color: "rgba(232, 232, 240, 0.4)", fontSize: "1.5rem", marginBottom: "0.6rem", transition: "transform 0.3s" }}>↑</div>
                      <div className="sans" style={{ fontSize: "0.95rem", color: "rgba(232, 232, 240, 0.8)", marginBottom: "0.4rem", fontWeight: 500 }}>
                        Drop video or click to browse
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "rgba(232, 232, 240, 0.4)", letterSpacing: "0.05em" }}>
                        MP4 · MOV · AVI · WebM
                      </div>
                    </>
                  )}
                </label>

                <div className="divider-or" style={{ marginBottom: "1.25rem" }}>OR</div>

                <p className="label-sm" style={{ marginBottom: "0.5rem" }}>Paste Video URL</p>
                <input
                  type="text"
                  placeholder="https://tiktok.com/@user/video/..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="input-field"
                  style={{ marginBottom: "1.5rem" }}
                />

                <button
                  onClick={handleAnalyze}
                  disabled={loading || (!file && !url)}
                  className="btn-primary"
                  style={{ width: "100%" }}
                >
                  {loading
                    ? <span><span className="spinner" />Analyzing...</span>
                    : "Analyze"
                  }
                </button>

                {loading && (
                  <p className="label-sm" style={{ textAlign: "center", marginTop: "0.875rem" }}>
                    Processing visual · audio · text
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── MARQUEE ── */}
      <div style={{
        overflow: "hidden",
        borderTop: "1px solid rgba(167,139,250,0.08)",
        borderBottom: "1px solid rgba(167,139,250,0.08)",
        padding: "0.75rem 0",
        marginBottom: "5rem",
      }}>
        <div className="marquee-track" style={{ display: "flex", gap: "2.5rem", whiteSpace: "nowrap" }}>
          {["Visual Scoring", "Audio Analysis", "Text Detection", "Scene Timeline", "AFI Score", "Wellness Insights", "Compare Videos", "AI Explanations",
            "Visual Scoring", "Audio Analysis", "Text Detection", "Scene Timeline", "AFI Score", "Wellness Insights", "Compare Videos", "AI Explanations"
          ].map((t, j) => (
            <span key={j} className="label-sm">
              {t} <span style={{ color: "#a78bfa", margin: "0 0.5rem" }}>·</span>
            </span>
          ))}
        </div>
      </div>

      {/* ── FEATURES ── */}
      <section className="container-section" style={{ paddingTop: 0, paddingBottom: "6rem" }}>
        <div style={{ textAlign: "center", marginBottom: "3.5rem" }}>
          <p className="label-sm" style={{ marginBottom: "1rem" }}>How It Works</p>
          <h2 style={{ fontSize: "clamp(1.5rem, 3vw, 2.25rem)", fontWeight: 300, letterSpacing: "-0.01em" }}>
            Three modalities. One score.
          </h2>
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
          gap: "1.5rem",
          padding: "1rem",
        }}>
          {features.map((f, i) => (
            <div key={i} className="card-glass card-hover" style={{ padding: "2rem 1.75rem" }}>
              <div style={{ 
                fontSize: "1.4rem", 
                color: "#a78bfa", 
                marginBottom: "1.25rem",
                width: "3rem",
                height: "3rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(167, 139, 250, 0.1)",
                borderRadius: "12px",
                border: "1px solid rgba(167, 139, 250, 0.2)"
              }}>{f.icon}</div>
              <div className="sans" style={{ fontWeight: 600, fontSize: "1rem", marginBottom: "0.75rem", letterSpacing: "0.02em", color: "#ffffff" }}>
                {f.title}
              </div>
              <div className="sans" style={{ color: "rgba(232, 232, 240, 0.5)", fontSize: "0.85rem", lineHeight: 1.6 }}>
                {f.desc}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="card-glass" style={{
          marginTop: "3rem",
          padding: "3.5rem 2.5rem",
          textAlign: "center",
          borderBottom: "none",
          borderLeft: "none",
          borderRight: "none",
          borderRadius: 0,
          background: "linear-gradient(to top, rgba(167, 139, 250, 0.03), transparent)"
        }}>
          <p className="label-sm" style={{ marginBottom: "1.5rem" }}>Explore More</p>
          <div style={{ display: "flex", justifyContent: "center", gap: "0.75rem", flexWrap: "wrap" }}>
            <Link href="/compare"  className="btn-secondary">Compare Two Videos</Link>
            <Link href="/history"  className="btn-secondary">View History</Link>
            <Link href="/wellness" className="btn-secondary">Wellness Dashboard</Link>
          </div>
        </div>
      </section>
    </div>
  );
}