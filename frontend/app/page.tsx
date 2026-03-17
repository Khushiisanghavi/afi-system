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
    const formData = new FormData();
    if (file) {
      formData.append("file", file);
    } else {
      alert("URL analysis is not supported by the backend yet. Please upload a file.");
      return;
    }
    try {
      setLoading(true);
      const res = await fetch("http://localhost:8000/analyze", { method: "POST", body: formData });
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
        {/* Violet glow */}
        <div style={{
          position: "absolute",
          width: "60vw", height: "60vw",
          top: "40%", left: "50%",
          transform: "translate(-50%, -50%)",
          background: "radial-gradient(ellipse, rgba(167,139,250,0.08) 0%, rgba(129,140,248,0.04) 40%, transparent 70%)",
          pointerEvents: "none",
          zIndex: 0,
        }} />

        <div style={{ position: "relative", zIndex: 1, textAlign: "center", maxWidth: "50rem", width: "100%" }}>

          {/* Eyebrow */}
          <div className="anim-fade-up" style={{ marginBottom: "2.5rem" }}>
            <span className="label-sm" style={{ letterSpacing: "0.28em" }}>
              AI-Powered Attention Analysis
            </span>
          </div>

          {/* Title */}
          <h1 className="anim-fade-up delay-1" style={{
            fontSize: "clamp(2.8rem, 8vw, 6.5rem)",
            fontWeight: 300,
            lineHeight: 1.05,
            letterSpacing: "-0.01em",
            marginBottom: "2rem",
          }}>
            Attention<br />
            <span style={{ color: "#a78bfa" }}>Fragmentation</span><br />
            Index
          </h1>

          {/* Subtext */}
          <p className="anim-fade-up delay-2" style={{
            color: "rgba(232,232,240,0.4)",
            fontSize: "0.92rem",
            letterSpacing: "0.05em",
            lineHeight: 1.85,
            maxWidth: "28rem",
            margin: "0 auto 3.5rem",
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
              <div style={{
                border: "1px solid rgba(167,139,250,0.35)",
                padding: "2.5rem 2rem",
                textAlign: "center",
                background: "rgba(167,139,250,0.04)",
              }}>
                <div style={{
                  width: "3.5rem", height: "3.5rem",
                  borderRadius: "50%",
                  border: "1px solid rgba(167,139,250,0.4)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  margin: "0 auto 1.5rem",
                  color: "#a78bfa", fontSize: "1.1rem",
                }}>✓</div>
                <p className="label-sm" style={{ color: "#a78bfa", marginBottom: "0.5rem" }}>Analysis Complete</p>
                <p style={{ fontSize: "0.95rem", fontWeight: 500, marginBottom: "0.4rem" }}>Your video has been analyzed</p>
                <p style={{ color: "rgba(232,232,240,0.35)", fontSize: "0.75rem", marginBottom: "2rem", wordBreak: "break-all" }}>
                  {file ? file.name : url}
                </p>
                <a href="/results" className="btn-primary" style={{ display: "block", width: "100%", marginBottom: "0.75rem" }}>
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
              <div style={{
                border: "1px solid rgba(167,139,250,0.12)",
                padding: "2rem",
                background: "rgba(167,139,250,0.03)",
              }}>
                <p className="label-sm" style={{ marginBottom: "0.75rem" }}>Upload Video File</p>

                {/* Drop zone */}
                <label
                  style={{
                    display: "block",
                    border: `1px dashed ${file ? "rgba(167,139,250,0.5)" : "rgba(167,139,250,0.15)"}`,
                    padding: "2rem",
                    textAlign: "center",
                    cursor: "pointer",
                    transition: "border-color 0.3s, background 0.3s",
                    background: file ? "rgba(167,139,250,0.05)" : "transparent",
                    marginBottom: "1.25rem",
                  }}
                  onMouseEnter={(e) => { if (!file) e.currentTarget.style.borderColor = "rgba(167,139,250,0.3)"; }}
                  onMouseLeave={(e) => { if (!file) e.currentTarget.style.borderColor = "rgba(167,139,250,0.15)"; }}
                >
                  <input type="file" style={{ display: "none" }} onChange={(e) => setFile(e.target.files?.[0] || null)} />
                  {file ? (
                    <>
                      <div style={{ color: "#a78bfa", fontSize: "1rem", marginBottom: "0.3rem" }}>✓</div>
                      <div style={{ color: "#a78bfa", fontSize: "0.82rem", fontWeight: 600 }}>{file.name}</div>
                      <div style={{ color: "rgba(232,232,240,0.3)", fontSize: "0.7rem", marginTop: "0.2rem" }}>
                        {(file.size / 1e6).toFixed(1)} MB
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ color: "rgba(232,232,240,0.2)", fontSize: "1rem", marginBottom: "0.4rem" }}>⬆</div>
                      <div style={{ fontSize: "0.82rem", color: "rgba(232,232,240,0.6)", marginBottom: "0.2rem" }}>
                        Drop video or click to browse
                      </div>
                      <div style={{ fontSize: "0.68rem", color: "rgba(232,232,240,0.25)", letterSpacing: "0.08em" }}>
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
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: "1px",
          background: "rgba(167,139,250,0.08)",
        }}>
          {features.map((f, i) => (
            <div key={i} className="card-hover" style={{ padding: "2rem 1.75rem", background: "#05050f" }}>
              <div style={{ fontSize: "1.2rem", color: "#a78bfa", marginBottom: "1rem" }}>{f.icon}</div>
              <div style={{ fontWeight: 600, fontSize: "0.88rem", marginBottom: "0.5rem", letterSpacing: "0.02em" }}>
                {f.title}
              </div>
              <div style={{ color: "rgba(232,232,240,0.35)", fontSize: "0.78rem", lineHeight: 1.7 }}>
                {f.desc}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div style={{
          marginTop: "1px",
          padding: "3rem 2.5rem",
          textAlign: "center",
          background: "rgba(167,139,250,0.03)",
          border: "1px solid rgba(167,139,250,0.08)",
          borderTop: "none",
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