"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

interface Session { url?: string | null; video_name: string | null; final_afi: number; harm_tier: string; created_at: string; }
interface ContentMix { calm: number; moderate: number; high: number; overstimulating: number; }
interface Checkin { focus_quality: number; notes: string | null; created_at: string; }
interface ProfileData {
  profile_tier: string;
  attention_fragmentation_index: number;
  overstim_ratio: number;
  weekly_high_afi_minutes: number;
  binge_signals: number;
  content_mix: ContentMix;
  summary: string;
  insights: string[];
  overall_minutes_watched: number;
  average_afi_score: number;
}

const HARM_INFO: Record<string, { color: string; bg: string; border: string; dot: string; desc: string }> = {
  Calm:            { color: "#34d399", bg: "rgba(52,211,153,0.06)",  border: "rgba(52,211,153,0.2)",  dot: "#34d399", desc: "Supports recovery of attention. Good for winding down and building sustained focus." },
  Moderate:        { color: "#a78bfa", bg: "rgba(167,139,250,0.06)", border: "rgba(167,139,250,0.2)", dot: "#a78bfa", desc: "Normal engagement. Sustainable in balance. Most long-form content falls here." },
  High:            { color: "#fb923c", bg: "rgba(251,146,60,0.06)",  border: "rgba(251,146,60,0.2)",  dot: "#fb923c", desc: "Activates the dopamine-reward loop more aggressively. Regular exposure raises your baseline stimulation threshold." },
  Overstimulating: { color: "#f87171", bg: "rgba(248,113,113,0.06)", border: "rgba(248,113,113,0.2)", dot: "#f87171", desc: "Sustained consumption fragments attention. Associated with reduced ability to focus, increased restlessness, and sleep disruption." },
};

const TIER_DESCS: Record<string, string> = {
  Healthy:    "Your content diet is well-balanced. Keep it up.",
  "At Risk":  "A significant portion of your recent content is highly stimulating. This can reduce your capacity for sustained focus over time.",
  Fragmented: "Extended high-AFI consumption detected. Your attention span may already be affected. A recovery plan is strongly recommended.",
};

const TIER_CONFIG: Record<string, { color: string; border: string; bg: string }> = {
  Healthy:    { color: "#34d399", border: "rgba(52,211,153,0.3)",  bg: "rgba(52,211,153,0.07)"  },
  "At Risk":  { color: "#fb923c", border: "rgba(251,146,60,0.3)",  bg: "rgba(251,146,60,0.07)"  },
  Fragmented: { color: "#f87171", border: "rgba(248,113,113,0.3)", bg: "rgba(248,113,113,0.07)" },
};

export default function WellbeingProfilePage() {
  const [profile, setProfile]       = useState<ProfileData | null>(null);
  const [sessions, setSessions]     = useState<Session[]>([]);
  const [checkins, setCheckins]     = useState<Checkin[]>([]);
  const [loading, setLoading]       = useState(true);
  const [llmInsight, setLlmInsight] = useState<string | null>(null);
  const [llmLoading, setLlmLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { setLoading(false); return; }
    const headers = { Authorization: `Bearer ${token}` };

    Promise.all([
      fetch("http://localhost:8000/wellbeing/profile",  { headers }).then((r) => r.json()),
      fetch("http://localhost:8000/wellbeing/history",  { headers }).then((r) => r.json()),
      fetch("http://localhost:8000/wellbeing/checkins", { headers }).then((r) => r.json()),
    ])
      .then(([p, s, c]) => {
        setProfile(p);
        setSessions(Array.isArray(s) ? s : []);
        setCheckins(Array.isArray(c) ? c : []);

        // Fetch LLM wellbeing analysis using last analyzed video
        const lastResult = localStorage.getItem("afiResult");
        if (lastResult && p) {
          const parsed = JSON.parse(lastResult);
          if (parsed?.video_path) {
            setLlmLoading(true);
            fetch("http://localhost:8000/insights/wellbeing/analysis", {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
              body: JSON.stringify({
                profile: {
                  profile_tier:                  p.profile_tier,
                  attention_fragmentation_index: p.attention_fragmentation_index,
                  overstim_ratio:                p.overstim_ratio,
                  weekly_high_afi_minutes:       p.weekly_high_afi_minutes,
                  binge_signals:                 p.binge_signals,
                  content_mix:                   p.content_mix,
                },
                last_video_path:     parsed.video_path,
                last_video_afi:      parsed.final?.final_afi_score ?? 0,
                last_video_category: parsed.final?.final_category  ?? "",
                last_video_visual:   parsed.visual?.visual_score   ?? 0,
                audio_metrics: {
                  tempo_bpm:             parsed.audio?.tempo_bpm             ?? 0,
                  rms_energy:            parsed.audio?.rms_energy            ?? 0,
                  amplitude_spike_ratio: parsed.audio?.amplitude_spike_ratio ?? 0,
                  zero_crossing_rate:    parsed.audio?.zero_crossing_rate    ?? 0,
                  duration_seconds:      parsed.audio?.duration_seconds      ?? 0,
                },
                text_metrics: {
                  total_words:         parsed.text?.total_words         ?? 0,
                  words_per_second:    parsed.text?.words_per_second    ?? 0,
                  avg_words_per_frame: parsed.text?.avg_words_per_frame ?? 0,
                  avg_text_area_ratio: parsed.text?.avg_text_area_ratio ?? 0,
                  text_change_rate:    parsed.text?.text_change_rate    ?? 0,
                  duration_seconds:    parsed.text?.duration_seconds    ?? 0,
                },
              }),
            })
              .then((r) => r.ok ? r.json() : null)
              .then((d) => d && setLlmInsight(d.llm_insight))
              .catch(console.error)
              .finally(() => setLlmLoading(false));
          }
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const tier = profile ? (TIER_CONFIG[profile.profile_tier] || TIER_CONFIG["At Risk"]) : null;

  return (
    <div style={{ position: "relative", zIndex: 1, minHeight: "100vh" }}>
      <div style={{ position: "fixed", width: "55vw", height: "55vw", top: "30%", left: "40%", transform: "translate(-50%,-50%)", background: "radial-gradient(ellipse, rgba(45,212,191,0.05) 0%, transparent 70%)", pointerEvents: "none", zIndex: 0 }} />

      <div className="container-section" style={{ display: "flex", flexDirection: "column", gap: "1.5rem", position: "relative", zIndex: 1 }}>

        {/* Breadcrumb */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.7rem", fontFamily: "monospace", color: "var(--muted)" }}>
          <Link href="/" style={{ color: "var(--muted)", textDecoration: "none" }}>Home</Link>
          <span>/</span>
          <Link href="/wellbeing" style={{ color: "rgba(45,212,191,0.6)", textDecoration: "none" }}>Wellbeing</Link>
          <span>/</span>
          <span style={{ color: "#2dd4bf" }}>Attention Profile</span>
        </div>

        <div>
          <h1 className="display-font" style={{ fontSize: "clamp(1.6rem, 3.5vw, 2.5rem)", fontWeight: 600, letterSpacing: "-0.02em", color: "#ffffff", marginBottom: "0.4rem" }}>
            Attention Profile
          </h1>
          <p className="sans" style={{ color: "rgba(232,232,240,0.45)", fontSize: "0.9rem" }}>
            A detailed breakdown of your content habits and attention health.
          </p>
        </div>

        {loading && (
          <div className="card-glass" style={{ padding: "3rem", textAlign: "center" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.75rem", color: "rgba(232,232,240,0.4)", fontSize: "0.875rem" }}>
              <span className="spinner" style={{ borderTopColor: "#2dd4bf", borderColor: "rgba(255,255,255,0.1)" }} />
              Loading profile…
            </div>
          </div>
        )}

        {profile && tier && (
          <>
            {/* Tier + stats */}
            <div className="card-glass" style={{ padding: "1.75rem", borderColor: tier.border, background: tier.bg }}>
              <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "0.75rem", flexWrap: "wrap" }}>
                <span className="display-font" style={{ fontSize: "1.5rem", fontWeight: 600, color: "#ffffff" }}>
                  Profile: {profile.profile_tier}
                </span>
                <span className="mono" style={{ padding: "0.2rem 0.7rem", borderRadius: "20px", fontSize: "0.8rem", fontWeight: 700, color: tier.color, background: `${tier.color}18`, border: `1px solid ${tier.color}44` }}>
                  {profile.attention_fragmentation_index.toFixed(0)} / 100 AFI
                </span>
              </div>
              <p className="sans" style={{ color: "rgba(232,232,240,0.5)", fontSize: "0.875rem", lineHeight: 1.65, marginBottom: "1.5rem" }}>
                {TIER_DESCS[profile.profile_tier] || ""}
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "0.75rem" }}>
                {[
                  { label: "Overall minutes watched", val: `${profile.overall_minutes_watched?.toFixed(0) || 0} min` },
                  { label: "Average AFI score", val: profile.average_afi_score?.toFixed(0) || "0" },
                  { label: "Overstimulation ratio", val: `${((profile.overstim_ratio || 0) * 100).toFixed(0)}%` },
                  { label: "High-AFI minutes (7d)",  val: `${profile.weekly_high_afi_minutes?.toFixed(0) || 0} min` },
                  { label: "Binge sessions",          val: String(profile.binge_signals || 0) },
                ].map((s) => (
                  <div key={s.label} style={{ background: "rgba(255,255,255,0.04)", borderRadius: "10px", padding: "1rem", textAlign: "center" }}>
                    <div className="sans" style={{ fontSize: "0.72rem", color: "rgba(232,232,240,0.4)", marginBottom: "0.4rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.label}</div>
                    <div className="mono" style={{ fontSize: "1.5rem", fontWeight: 700, color: "#ffffff" }}>{s.val}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Rule-based insights */}
            {profile.insights?.length > 0 && (
              <div className="card-glass" style={{ padding: "1.75rem" }}>
                <div className="sans" style={{ fontSize: "0.72rem", color: "rgba(232,232,240,0.4)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "1rem" }}>Insights</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {profile.insights.map((ins, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
                      <span style={{ width: "1.4rem", height: "1.4rem", borderRadius: "50%", flexShrink: 0, background: "rgba(45,212,191,0.12)", border: "1px solid rgba(45,212,191,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", fontWeight: 700, color: "#2dd4bf", fontFamily: "monospace" }}>{i + 1}</span>
                      <p className="sans" style={{ fontSize: "0.875rem", color: "rgba(232,232,240,0.7)", lineHeight: 1.6 }}>{ins}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* LLM AI Attention Analysis */}
            <div className="card-glass" style={{ padding: "1.75rem", borderColor: "rgba(45,212,191,0.2)", background: "rgba(45,212,191,0.04)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
                <span style={{ width: "1.75rem", height: "1.75rem", borderRadius: "8px", background: "rgba(45,212,191,0.15)", border: "1px solid rgba(45,212,191,0.3)", color: "#2dd4bf", fontSize: "0.9rem", display: "flex", alignItems: "center", justifyContent: "center" }}>✦</span>
                <span className="sans" style={{ fontWeight: 600, fontSize: "1rem", color: "#2dd4bf" }}>AI Attention Analysis</span>
                {llmLoading && <span className="spinner" style={{ width: "0.9rem", height: "0.9rem", borderTopColor: "#2dd4bf", borderColor: "rgba(255,255,255,0.1)" }} />}
              </div>
              {llmInsight ? (
                <div className="sans" style={{ fontSize: "0.9rem", lineHeight: 1.75, color: "rgba(232,232,240,0.65)", whiteSpace: "pre-wrap" }}>
                  {llmInsight}
                </div>
              ) : llmLoading ? (
                <p className="sans" style={{ fontSize: "0.88rem", color: "rgba(232,232,240,0.35)", fontStyle: "italic" }}>Analysing your attention profile…</p>
              ) : (
                <p className="sans" style={{ fontSize: "0.88rem", color: "rgba(232,232,240,0.35)" }}>
                  {profile.summary || "Analyse a video first to get a personalised AI insight here."}
                </p>
              )}
            </div>

            {/* Recent sessions */}
            {sessions.length > 0 && (
              <div className="card-glass" style={{ padding: "1.75rem" }}>
                <div className="sans" style={{ fontSize: "0.72rem", color: "rgba(232,232,240,0.4)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "1rem" }}>Recent Content Breakdown</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxHeight: "16rem", overflowY: "auto" }}>
                  {sessions.slice(0, 20).map((s, i) => {
                    const info = HARM_INFO[s.harm_tier] || HARM_INFO.Moderate;
                    return (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.75rem", fontSize: "0.85rem" }}>
                        <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: info.dot, flexShrink: 0 }} />
                        <span className="sans" style={{ flex: 1, color: "rgba(232,232,240,0.7)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {s.url ? (
                            <a href={s.url} target="_blank" rel="noopener noreferrer" style={{ color: "rgba(232,232,240,0.7)", textDecoration: "underline" }}>{s.url}</a>
                          ) : (
                            s.video_name || "Untitled"
                          )}
                        </span>
                        <span className="mono" style={{ fontSize: "0.8rem", color: "rgba(232,232,240,0.4)" }}>{s.final_afi.toFixed(0)}</span>
                        <span className="sans" style={{ fontSize: "0.78rem", fontWeight: 600, color: info.color, minWidth: "5rem", textAlign: "right" }}>{s.harm_tier}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Harm tier explanations */}
            <div>
              <div className="sans" style={{ fontSize: "0.85rem", fontWeight: 600, color: "rgba(232,232,240,0.5)", marginBottom: "1rem" }}>
                What each tier means for your attention
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "0.75rem" }}>
                {Object.entries(HARM_INFO).map(([t, info]) => (
                  <div key={t} style={{ borderRadius: "12px", padding: "1.25rem", background: info.bg, border: `1px solid ${info.border}` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                      <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: info.dot }} />
                      <span className="sans" style={{ fontSize: "0.85rem", fontWeight: 600, color: info.color }}>{t}</span>
                    </div>
                    <p className="sans" style={{ fontSize: "0.78rem", color: "rgba(232,232,240,0.5)", lineHeight: 1.6 }}>{info.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Focus quality log */}
            {checkins.length > 0 && (
              <div className="card-glass" style={{ padding: "1.75rem" }}>
                <div className="sans" style={{ fontSize: "0.72rem", color: "rgba(232,232,240,0.4)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "1rem" }}>Focus Quality Log</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "0.5rem" }}>
                  {checkins.slice(0, 7).reverse().map((c, i) => {
                    const scoreColor = c.focus_quality >= 4 ? "#34d399" : c.focus_quality >= 3 ? "#fb923c" : "#f87171";
                    return (
                      <div key={i} style={{ textAlign: "center" }}>
                        <div style={{ aspectRatio: "1", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", background: `${scoreColor}15`, border: `1px solid ${scoreColor}40`, fontFamily: "monospace", fontSize: "0.8rem", fontWeight: 700, color: scoreColor }}>
                          {c.focus_quality}/5
                        </div>
                        <div className="sans" style={{ fontSize: "0.65rem", color: "rgba(232,232,240,0.35)", marginTop: "0.3rem" }}>
                          {new Date(c.created_at).toLocaleDateString(undefined, { weekday: "short" })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* CTA */}
            <div style={{ display: "flex", justifyContent: "center", paddingBottom: "1rem" }}>
              <Link href="/wellbeing/plan" style={{ display: "inline-block", background: "linear-gradient(135deg, #2dd4bf, #14b8a6)", color: "#05050f", textDecoration: "none", padding: "0.75rem 2rem", borderRadius: "8px", fontFamily: "'Inter', sans-serif", fontSize: "0.9rem", fontWeight: 700, boxShadow: "0 4px 16px rgba(45,212,191,0.25)" }}>
                View your recovery plan →
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}