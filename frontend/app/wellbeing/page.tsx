"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

interface ContentMix { calm: number; moderate: number; high: number; overstimulating: number; }
interface ProfileData {
  profile_tier: string;
  attention_fragmentation_index: number;
  overstim_ratio: number;
  weekly_high_afi_minutes: number;
  binge_signals: number;
  content_mix: ContentMix;
  summary: string;
}

const TIER_CONFIG: Record<string, { color: string; bg: string; border: string; icon: string; label: string }> = {
  Healthy:    { color: "#34d399", bg: "rgba(52,211,153,0.08)",  border: "rgba(52,211,153,0.25)",  icon: "◎", label: "Healthy"    },
  "At Risk":  { color: "#fb923c", bg: "rgba(251,146,60,0.08)",  border: "rgba(251,146,60,0.25)",  icon: "◉", label: "At Risk"    },
  Fragmented: { color: "#f87171", bg: "rgba(248,113,113,0.08)", border: "rgba(248,113,113,0.25)", icon: "◈", label: "Fragmented" },
};

function DonutChart({ mix }: { mix: ContentMix }) {
  const segments = [
    { key: "calm",            label: "Calm",            color: "#34d399", value: mix.calm },
    { key: "moderate",        label: "Moderate",        color: "#a78bfa", value: mix.moderate },
    { key: "high",            label: "High",            color: "#fb923c", value: mix.high },
    { key: "overstimulating", label: "Overstimulating", color: "#f87171", value: mix.overstimulating },
  ];
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;
  const r = 52, cx = 70, cy = 70, strokeW = 16;
  const circ = 2 * Math.PI * r;
  let cumulative = 0;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "2.5rem", flexWrap: "wrap" }}>
      <svg width={140} height={140} viewBox="0 0 140 140" style={{ flexShrink: 0 }}>
        {/* Track */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={strokeW} />
        {segments.map((seg) => {
          const pct = seg.value / total;
          const dash = pct * circ;
          const offset = circ * (1 - cumulative);
          cumulative += pct;
          return (
            <circle
              key={seg.key}
              cx={cx} cy={cy} r={r}
              fill="none"
              stroke={seg.color}
              strokeWidth={strokeW}
              strokeDasharray={`${dash} ${circ}`}
              strokeDashoffset={offset}
              style={{ transform: "rotate(-90deg)", transformOrigin: "70px 70px" }}
            />
          );
        })}
        {/* Center */}
        <circle cx={cx} cy={cy} r={r - strokeW / 2 - 4} fill="#05050f" />
        <text x={cx} y={cy - 4} textAnchor="middle" fill="rgba(232,232,240,0.9)" fontSize="13" fontWeight="700" fontFamily="monospace">
          {(segments[0].value * 100).toFixed(0)}%
        </text>
        <text x={cx} y={cy + 10} textAnchor="middle" fill="rgba(232,232,240,0.35)" fontSize="8" fontFamily="monospace">CALM</text>
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
        {segments.map((seg) => (
          <div key={seg.key} style={{ display: "flex", alignItems: "center", gap: "0.6rem", fontSize: "0.82rem" }}>
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: seg.color, flexShrink: 0 }} />
            <span className="sans" style={{ color: "rgba(232,232,240,0.55)", minWidth: "7rem" }}>{seg.label}</span>
            <span className="mono" style={{ color: "#ffffff", fontWeight: 700, marginLeft: "auto" }}>
              {(seg.value * 100).toFixed(0)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function WellbeingPage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setError("not_logged_in");
      setLoading(false);
      return;
    }
    fetch("http://localhost:8000/wellbeing/profile", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => { if (!r.ok) throw new Error("Could not load profile."); return r.json(); })
      .then((d) => setProfile(d))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const tier = profile ? (TIER_CONFIG[profile.profile_tier] || TIER_CONFIG["At Risk"]) : null;

  return (
    <div style={{ position: "relative", zIndex: 1, minHeight: "100vh" }}>

      {/* Glow — teal tint for wellbeing */}
      <div style={{
        position: "fixed",
        width: "55vw", height: "55vw",
        top: "30%", left: "40%",
        transform: "translate(-50%, -50%)",
        background: "radial-gradient(ellipse, rgba(45,212,191,0.05) 0%, transparent 70%)",
        pointerEvents: "none", zIndex: 0,
      }} />

      <div className="container-section" style={{ display: "flex", flexDirection: "column", gap: "1.75rem", position: "relative", zIndex: 1 }}>

        {/* Breadcrumb */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.7rem", fontFamily: "monospace", color: "var(--muted)" }}>
          <Link href="/" style={{ color: "var(--muted)", textDecoration: "none" }}>Home</Link>
          <span>/</span>
          <span style={{ color: "#2dd4bf" }}>Wellbeing</span>
        </div>

        {/* Header */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
            <span style={{
              fontFamily: "monospace", fontSize: "0.65rem", letterSpacing: "0.2em",
              textTransform: "uppercase", color: "#2dd4bf",
              background: "rgba(45,212,191,0.08)", border: "1px solid rgba(45,212,191,0.2)",
              padding: "0.25rem 0.6rem", borderRadius: "4px",
            }}>Wellbeing Dashboard</span>
          </div>
          <h1 className="display-font" style={{ fontSize: "clamp(1.8rem, 4vw, 2.75rem)", fontWeight: 600, letterSpacing: "-0.02em", color: "#ffffff", marginBottom: "0.5rem" }}>
            Your Attention Health
          </h1>
          <p className="sans" style={{ color: "rgba(232,232,240,0.5)", fontSize: "0.95rem", maxWidth: "36rem", lineHeight: 1.7 }}>
            Understand how the content you watch affects your attention span, and get a
            personalised plan to improve it.
          </p>
        </div>

        {/* Loading */}
        {loading && (
          <div className="card-glass" style={{ padding: "3rem", textAlign: "center" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.75rem", color: "rgba(232,232,240,0.4)", fontSize: "0.875rem" }}>
              <span className="spinner" style={{ borderTopColor: "#2dd4bf", borderColor: "rgba(255,255,255,0.1)" }} />
              Loading your profile…
            </div>
          </div>
        )}

        {/* Not logged in */}
        {!loading && error === "not_logged_in" && (
          <div className="card-glass" style={{ padding: "3.5rem", textAlign: "center" }}>
            <div style={{ fontSize: "2rem", color: "#2dd4bf", marginBottom: "1rem" }}>◎</div>
            <p className="sans" style={{ color: "rgba(232,232,240,0.6)", marginBottom: "1.5rem", fontSize: "0.95rem" }}>
              Sign in to see your personal attention health profile.
            </p>
            <Link href="/login" style={{
              display: "inline-block",
              background: "linear-gradient(135deg, #2dd4bf, #14b8a6)",
              color: "#05050f", textDecoration: "none",
              padding: "0.6rem 1.4rem", borderRadius: "8px",
              fontFamily: "'Inter', sans-serif", fontSize: "0.875rem", fontWeight: 700,
            }}>
              Sign in →
            </Link>
          </div>
        )}

        {/* Error */}
        {!loading && error && error !== "not_logged_in" && (
          <div style={{
            background: "rgba(248,113,113,0.07)",
            border: "1px solid rgba(248,113,113,0.2)",
            borderRadius: "12px", padding: "1.25rem 1.5rem",
            color: "#f87171", fontSize: "0.875rem", fontFamily: "monospace",
          }}>
            {error}
          </div>
        )}

        {/* Profile data */}
        {!loading && profile && tier && (
          <>
            {/* Top row — tier + AFI + stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>

              {/* Tier card */}
              <div className="card-glass" style={{
                padding: "1.75rem",
                borderColor: tier.border,
                background: tier.bg,
              }}>
                <div className="sans" style={{ fontSize: "0.75rem", color: "rgba(232,232,240,0.4)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.75rem" }}>
                  Profile Tier
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1rem" }}>
                  <span style={{ fontSize: "1.5rem", color: tier.color }}>{tier.icon}</span>
                  <span className="mono" style={{ fontSize: "1.3rem", fontWeight: 700, color: tier.color }}>{tier.label}</span>
                </div>
                <p className="sans" style={{ fontSize: "0.82rem", color: "rgba(232,232,240,0.5)", lineHeight: 1.65, marginBottom: "1rem" }}>
                  {profile.summary}
                </p>
                <Link href="/wellbeing/profile" style={{ fontSize: "0.8rem", color: "#2dd4bf", textDecoration: "none", fontFamily: "monospace" }}>
                  Full profile →
                </Link>
              </div>

              {/* AFI gauge */}
              <div className="card-glass" style={{ padding: "1.75rem" }}>
                <div className="sans" style={{ fontSize: "0.75rem", color: "rgba(232,232,240,0.4)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.75rem" }}>
                  Attention Fragmentation Index
                </div>
                <div style={{ display: "flex", alignItems: "flex-end", gap: "0.4rem", marginBottom: "1rem" }}>
                  <span className="mono" style={{ fontSize: "3rem", fontWeight: 700, color: "#ffffff", lineHeight: 1 }}>
                    {profile.attention_fragmentation_index.toFixed(0)}
                  </span>
                  <span className="sans" style={{ color: "rgba(232,232,240,0.35)", marginBottom: "0.4rem" }}>/100</span>
                </div>
                <div style={{ height: "4px", background: "rgba(255,255,255,0.07)", borderRadius: "2px", marginBottom: "0.6rem" }}>
                  <div style={{
                    height: "100%", borderRadius: "2px",
                    width: `${profile.attention_fragmentation_index}%`,
                    background: profile.attention_fragmentation_index < 35
                      ? "#34d399"
                      : profile.attention_fragmentation_index < 65
                      ? "#fb923c"
                      : "#f87171",
                    transition: "width 0.8s cubic-bezier(0.16,1,0.3,1)",
                  }} />
                </div>
                <p className="sans" style={{ fontSize: "0.75rem", color: "rgba(232,232,240,0.35)" }}>
                  Below 35 is healthy · Higher = more fragmented
                </p>
              </div>

              {/* Key stats */}
              <div className="card-glass" style={{ padding: "1.75rem", display: "flex", flexDirection: "column", gap: "1.1rem" }}>
                <div className="sans" style={{ fontSize: "0.75rem", color: "rgba(232,232,240,0.4)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                  Key Stats
                </div>
                {[
                  { label: "Overstimulation ratio",       val: `${(profile.overstim_ratio * 100).toFixed(0)}%`,         color: profile.overstim_ratio > 0.5 ? "#f87171" : "#34d399" },
                  { label: "High-AFI minutes (7 days)",   val: `${profile.weekly_high_afi_minutes.toFixed(0)} min`,      color: "#a78bfa" },
                  { label: "Binge sessions detected",     val: `${profile.binge_signals}`,                               color: profile.binge_signals > 0 ? "#f87171" : "#34d399" },
                ].map((s) => (
                  <div key={s.label}>
                    <div className="sans" style={{ fontSize: "0.78rem", color: "rgba(232,232,240,0.4)", marginBottom: "0.2rem" }}>{s.label}</div>
                    <div className="mono" style={{ fontSize: "1.4rem", fontWeight: 700, color: s.color }}>{s.val}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Content mix donut */}
            <div className="card-glass" style={{ padding: "1.75rem" }}>
              <div className="sans" style={{ fontSize: "0.75rem", color: "rgba(232,232,240,0.4)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "1.5rem" }}>
                Content Mix
              </div>
              <DonutChart mix={profile.content_mix} />
            </div>

            {/* CTA cards */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <Link href="/wellbeing/profile" style={{ textDecoration: "none" }}>
                <div className="card-glass card-hover" style={{ padding: "1.75rem" }}>
                  <div className="sans" style={{ fontWeight: 600, fontSize: "0.95rem", color: "#ffffff", marginBottom: "0.4rem" }}>
                    Full attention profile →
                  </div>
                  <div className="sans" style={{ fontSize: "0.82rem", color: "rgba(232,232,240,0.4)", lineHeight: 1.6 }}>
                    Detailed breakdown of your content habits and harm tiers.
                  </div>
                </div>
              </Link>
              <Link href="/wellbeing/plan" style={{ textDecoration: "none" }}>
                <div style={{
                  padding: "1.75rem", borderRadius: "12px",
                  background: "linear-gradient(135deg, rgba(45,212,191,0.15), rgba(20,184,166,0.08))",
                  border: "1px solid rgba(45,212,191,0.25)",
                  transition: "border-color 0.2s ease",
                }}>
                  <div className="sans" style={{ fontWeight: 600, fontSize: "0.95rem", color: "#2dd4bf", marginBottom: "0.4rem" }}>
                    Your recovery plan →
                  </div>
                  <div className="sans" style={{ fontSize: "0.82rem", color: "rgba(45,212,191,0.55)", lineHeight: 1.6 }}>
                    Daily goals, milestones, and personalised tips.
                  </div>
                </div>
              </Link>
            </div>
          </>
        )}

      </div>
    </div>
  );
}