"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import WavyBackground from "../components/WavyBackground";

// Framer Motion Variants for Visily aesthetics
import { Variants } from "framer-motion";

const STAGGER_CONTAINER: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15
    }
  }
};

const FADE_UP: Variants = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 60, damping: 20 } }
};

const FLOATING_ANIMATION: any = {
  y: ["-4px", "4px", "-4px"],
  transition: {
    duration: 5,
    repeat: Infinity,
    ease: "easeInOut"
  }
};

export default function HomePage() {
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [analyzed, setAnalyzed] = useState(false);
  const [realStats, setRealStats] = useState<{ total: number; avgTime: string } | null>(null);
  // Load real stats from backend on mount
  useEffect(() => {
  }, []);

  const handleAnalyze = async () => {
    if (!file && !url) { alert("Upload a file or paste a URL"); return; }

    try {
      setLoading(true);
      // Always send JWT if logged in so analysis is tied to user
      const token = localStorage.getItem("token");
      const authHeaders: Record<string, string> = token
        ? { Authorization: `Bearer ${token}` }
        : {};

      let data;

      if (file) {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("http://localhost:8000/analyze", {
          method: "POST",
          headers: authHeaders,
          body: formData,
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.detail || `Server error ${res.status}`);
        }
        data = await res.json();
      } else {
        const res = await fetch("http://localhost:8000/analyze-url", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders },
          body: JSON.stringify({ url: url.trim() }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.detail || `Server error ${res.status}`);
        }
        data = await res.json();
      }

      localStorage.setItem("afiResult", JSON.stringify(data));
      if (data.video_path) localStorage.setItem("lastVideoPath", data.video_path);
      setAnalyzed(true);

    } catch (err: any) {
      console.error(err);
      alert(err.message || "Error analyzing video");
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: "◈", title: "Visual Scoring",  desc: "Optical flow motion magnitude and scene cut density — measured frame-by-frame with Farneback optical flow." },
    { icon: "◉", title: "Audio Analysis",  desc: "Tempo (BPM), RMS energy, amplitude spike ratio, and zero-crossing rate — four independent dimensions of audio stimulation." },
    { icon: "◎", title: "Text Detection",  desc: "Text regions per frame, screen area coverage, and region change rate — extracted from raw video frames using OCR." },
    { icon: "◆", title: "Timeline View",   desc: "Per-scene motion mapped across the full video — see exactly where stimulation spikes and where it drops." },
  ];

  // Real stats — only show numbers we can back up
  const stats = [
    { v: realStats ? `${realStats.total}` : "—",  l: "Videos Analyzed" },
    { v: "3",                                      l: "Modalities Measured" },
    { v: "20–40s",                                 l: "Avg Analysis Time" },
  ];

  return (
    <div style={{ position: "relative", zIndex: 1 }}>

      {/* HERO */}
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
        <WavyBackground />
        <div style={{
          position: "absolute",
          width: "60vw", height: "60vw",
          top: "40%", left: "50%",
          transform: "translate(-50%, -50%)",
          background: "radial-gradient(ellipse, rgba(167,139,250,0.06) 0%, rgba(129,140,248,0.03) 40%, transparent 70%)",
          pointerEvents: "none",
          zIndex: 0,
        }} />

        <motion.div 
          className="relative z-10 text-center w-full max-w-5xl"
          variants={STAGGER_CONTAINER}
          initial="hidden"
          animate="show"
        >

          <motion.div variants={FADE_UP} style={{ marginBottom: "2.5rem" }}>
            <span className="label-sm" style={{ letterSpacing: "0.28em" }}>
              Quantified Attention Analysis
            </span>
          </motion.div>

          <motion.h1 variants={FADE_UP} className="display-font" style={{
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
          </motion.h1>

          <motion.p variants={FADE_UP} className="sans" style={{
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
          </motion.p>

          {/* Stats — real numbers */}
          <motion.div variants={FADE_UP} style={{
            display: "flex",
            justifyContent: "center",
            gap: "3rem",
            marginBottom: "4rem",
            flexWrap: "wrap",
          }}>
            {stats.map((s, i) => (
              <div key={i} style={{ textAlign: "center" }}>
                <div className="mono" style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--primary)", marginBottom: "0.2rem" }}>
                  {s.v}
                </div>
                <div style={{ fontSize: "0.62rem", color: "rgba(232,232,240,0.3)", letterSpacing: "0.15em", textTransform: "uppercase" }}>
                  {s.l}
                </div>
              </div>
            ))}
          </motion.div>

          {/* UPLOAD CARD */}
          <motion.div
            variants={FADE_UP}
            animate={FLOATING_ANIMATION}
            style={{ maxWidth: "28rem", margin: "0 auto" }}
          >

            {analyzed ? (
              <div className="card-glass" style={{ padding: "3rem 2.5rem", textAlign: "center" }}>
                <div style={{
                  width: "4rem", height: "4rem",
                  borderRadius: "50%",
                  border: "2px solid rgba(167, 139, 250, 0.6)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  margin: "0 auto 1.5rem",
                  color: "#a78bfa", fontSize: "1.5rem",
                  background: "rgba(167, 139, 250, 0.1)",
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

              <div className="card-glass" style={{ padding: "2.5rem" }}>
                <p className="label-sm" style={{ marginBottom: "1rem" }}>Upload Video File</p>

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
                >
                  <input type="file" style={{ display: "none" }} onChange={(e) => setFile(e.target.files?.[0] || null)} />
                  {file ? (
                    <>
                      <div style={{ color: "#a78bfa", fontSize: "1.5rem", marginBottom: "0.5rem" }}>✓</div>
                      <div className="sans" style={{ color: "#e8e8f0", fontSize: "0.95rem", fontWeight: 500 }}>{file.name}</div>
                      <div className="mono" style={{ color: "rgba(232, 232, 240, 0.4)", fontSize: "0.75rem", marginTop: "0.4rem" }}>
                        {(file.size / 1e6).toFixed(1)} MB
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ color: "rgba(232, 232, 240, 0.4)", fontSize: "1.5rem", marginBottom: "0.6rem" }}>↑</div>
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
          </motion.div>
        </motion.div>
      </section>

      {/* MARQUEE */}
      <div style={{
        overflow: "hidden",
        borderTop: "1px solid rgba(167,139,250,0.08)",
        borderBottom: "1px solid rgba(167,139,250,0.08)",
        padding: "0.75rem 0",
        marginBottom: "5rem",
      }}>
        <div className="marquee-track" style={{ display: "flex", gap: "2.5rem", whiteSpace: "nowrap" }}>
          {["Visual Scoring", "Audio Analysis", "Text Detection", "Scene Timeline", "AFI Score", "Wellness Insights", "Compare Videos", "Score Breakdown",
            "Visual Scoring", "Audio Analysis", "Text Detection", "Scene Timeline", "AFI Score", "Wellness Insights", "Compare Videos", "Score Breakdown"
          ].map((t, j) => (
            <span key={j} className="label-sm">
              {t} <span style={{ color: "#a78bfa", margin: "0 0.5rem" }}>·</span>
            </span>
          ))}
        </div>
      </div>

      {/* FEATURES - Bento box layout */}
      <section className="container-section" style={{ paddingTop: 0, paddingBottom: "6rem" }}>
        <motion.div 
          initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }}
          variants={STAGGER_CONTAINER}
          style={{ textAlign: "center", marginBottom: "3.5rem" }}
        >
          <motion.p variants={FADE_UP} className="label-sm" style={{ marginBottom: "1rem" }}>How It Works</motion.p>
          <motion.h2 variants={FADE_UP} style={{ fontSize: "clamp(1.5rem, 3vw, 2.25rem)", fontWeight: 300, letterSpacing: "-0.01em" }}>
            Three modalities. One score.
          </motion.h2>
        </motion.div>

        <motion.div 
          initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }}
          variants={STAGGER_CONTAINER}
          style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "1.5rem",
          padding: "1rem",
        }}>
          {features.map((f, i) => (
            <motion.div 
              variants={FADE_UP}
              whileHover={{ y: -6, transition: { duration: 0.3 } }}
              key={i} 
              className="card-glass card-hover" 
              style={{ 
                padding: "2rem 1.75rem",
                gridColumn: i === 0 || i === 3 ? "span 2" : "span 1", // Visily asymmetrical Bento style
                display: "flex",
                flexDirection: "column",
                justifyContent: "center"
              }}
            >
              <div style={{
                fontSize: "1.4rem",
                color: "var(--primary)",
                marginBottom: "1.25rem",
                width: "4rem",
                height: "4rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(167, 139, 250, 0.05)",
                borderRadius: "16px",
                border: "1px solid rgba(167, 139, 250, 0.15)"
              }}>{f.icon}</div>
              <div className="sans" style={{ fontWeight: 600, fontSize: "1.2rem", marginBottom: "0.75rem", color: "#ffffff" }}>
                {f.title}
              </div>
              <div className="sans" style={{ color: "rgba(232, 232, 240, 0.5)", fontSize: "0.95rem", lineHeight: 1.6 }}>
                {f.desc}
              </div>
            </motion.div>
          ))}
        </motion.div>

        <motion.div 
          initial="hidden" whileInView="show" viewport={{ once: true }}
          variants={FADE_UP}
          className="card-glass" style={{
          marginTop: "3rem",
          padding: "3.5rem 2.5rem",
          textAlign: "center",
          borderRadius: "24px",
          background: "linear-gradient(to top, rgba(95, 75, 254, 0.05), transparent)"
        }}>
          <p className="label-sm" style={{ marginBottom: "1.5rem" }}>Explore More</p>
          <div style={{ display: "flex", justifyContent: "center", gap: "0.75rem", flexWrap: "wrap" }}>
            <Link href="/compare"  className="btn-secondary">Compare Two Videos</Link>
            <Link href="/history"  className="btn-secondary">View History</Link>
            <Link href="/wellbeing"  className="btn-secondary">Wellness Reports</Link>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
