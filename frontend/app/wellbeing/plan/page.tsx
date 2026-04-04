"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, Variants } from "framer-motion";

const STAGGER_CONTAINER: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const FADE_UP: Variants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 65, damping: 20 } }
};

interface DailyGoal { goal: string; rationale: string; }
interface Plan { daily_goals: DailyGoal[]; weekly_milestones: string[]; tips: string[]; }
interface ContentMix { calm: number; moderate: number; high: number; overstimulating: number; }
interface ProfileData {
  profile_tier: string;
  attention_fragmentation_index: number;
  overstim_ratio: number;
  weekly_high_afi_minutes: number;
  binge_signals: number;
  content_mix: ContentMix;
}

export default function WellbeingPlanPage() {
  const [plan, setPlan]               = useState<Plan | null>(null);
  const [tier, setTier]               = useState<string>("");
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [checked, setChecked]         = useState<boolean[]>([]);
  const [checkinScore, setCheckinScore] = useState<number | null>(null);
  const [checkinNote, setCheckinNote] = useState("");
  const [checkinSent, setCheckinSent] = useState(false);
  const [checkinError, setCheckinError] = useState<string | null>(null);
  const [llmInsight, setLlmInsight]   = useState<string | null>(null);
  const [llmLoading, setLlmLoading]   = useState(false);

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const fetchLlmInsight = (p: Plan, prof: ProfileData) => {
    if (!token) return;
    setLlmLoading(true);
    fetch("http://localhost:8000/insights/wellbeing/recovery", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        profile: {
          profile_tier:                  prof.profile_tier,
          attention_fragmentation_index: prof.attention_fragmentation_index,
          overstim_ratio:                prof.overstim_ratio,
          weekly_high_afi_minutes:       prof.weekly_high_afi_minutes,
          binge_signals:                 prof.binge_signals,
          content_mix:                   prof.content_mix,
        },
        existing_plan: p,
      }),
    })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => d && setLlmInsight(d.llm_insight))
      .catch(console.error)
      .finally(() => setLlmLoading(false));
  };

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    Promise.all([
      fetch("http://localhost:8000/wellbeing/plan",    { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
      fetch("http://localhost:8000/wellbeing/profile", { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
    ])
      .then(([p, prof]) => {
        setPlan(p);
        setTier(prof.profile_tier || "");
        setChecked(new Array((p.daily_goals || []).length).fill(false));
        fetchLlmInsight(p, prof);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function handleRefresh() {
    if (!token) return;
    setRefreshing(true);
    try {
      const res = await fetch("http://localhost:8000/wellbeing/plan/update", {
        method: "POST", headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setPlan(data.plan);
      setChecked(new Array((data.plan.daily_goals || []).length).fill(false));
    } catch (e) { console.error(e); }
    finally { setRefreshing(false); }
  }

  async function handleCheckin() {
    if (!token || checkinScore === null) return;
    setCheckinError(null);
    try {
      const res = await fetch("http://localhost:8000/wellbeing/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ focus_quality: checkinScore, notes: checkinNote || undefined }),
      });
      if (!res.ok) throw new Error("Failed to log check-in.");
      setCheckinSent(true);
    } catch (e: unknown) { setCheckinError(e instanceof Error ? e.message : "Error"); }
  }

  const tierColor = tier === "Healthy" ? "#34d399" : tier === "Fragmented" ? "#f87171" : "#fb923c";
  const progress  = plan ? Math.round((checked.filter(Boolean).length / Math.max(plan.daily_goals.length, 1)) * 100) : 0;

  return (
    <div style={{ position: "relative", zIndex: 1, minHeight: "100vh" }}>
      <div style={{ position: "fixed", width: "55vw", height: "55vw", top: "30%", left: "40%", transform: "translate(-50%,-50%)", background: "radial-gradient(ellipse, rgba(45,212,191,0.05) 0%, transparent 70%)", pointerEvents: "none", zIndex: 0 }} />

      <motion.div variants={STAGGER_CONTAINER} initial="hidden" animate="show" className="container-section" style={{ display: "flex", flexDirection: "column", gap: "1.75rem", maxWidth: "56rem", position: "relative", zIndex: 1 }}>

        {/* Breadcrumb */}
        <motion.div variants={FADE_UP} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.7rem", fontFamily: "monospace", color: "var(--muted)" }}>
          <Link href="/" style={{ color: "var(--muted)", textDecoration: "none" }}>Home</Link>
          <span>/</span>
          <Link href="/wellbeing" style={{ color: "rgba(45,212,191,0.6)", textDecoration: "none" }}>Wellbeing</Link>
          <span>/</span>
          <span style={{ color: "#2dd4bf" }}>Recovery Plan</span>
        </motion.div>

        {/* Header */}
        <motion.div variants={FADE_UP} style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "1.5rem" }}>
          <div>
            <h1 className="display-font" style={{ fontSize: "clamp(1.8rem, 4vw, 2.75rem)", fontWeight: 600, letterSpacing: "-0.02em", color: "#ffffff", marginBottom: "0.75rem" }}>
              Recovery Plan
            </h1>
            {tier && (
              <span className="mono" style={{ padding: "0.4rem 1rem", borderRadius: "100px", fontSize: "0.85rem", fontWeight: 700, color: tierColor, background: `${tierColor}15`, border: `1px solid ${tierColor}40`, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                {tier}
              </span>
            )}
          </div>
          <button onClick={handleRefresh} disabled={refreshing} style={{ padding: "0.8rem 1.6rem", borderRadius: "100px", fontSize: "0.9rem", fontWeight: 500, color: "rgba(232,232,240,0.55)", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(167,139,250,0.2)", cursor: "pointer", transition: "all 0.2s", fontFamily: "'Inter', sans-serif" }} className="card-hover">
            {refreshing ? (
              <span><span className="spinner" style={{ borderTopColor: "rgba(232, 232, 240, 0.55)", marginRight: "0.5rem" }} />Refreshing…</span>
            ) : "↻ Refresh plan"}
          </button>
        </motion.div>

        {loading && (
          <div className="card-glass" style={{ padding: "4rem", textAlign: "center" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.75rem", color: "rgba(232,232,240,0.4)", fontSize: "0.875rem" }}>
              <span className="spinner" style={{ borderTopColor: "#2dd4bf", borderColor: "rgba(255,255,255,0.1)" }} />
              Loading your plan…
            </div>
          </div>
        )}

        {plan && (
          <>
            {/* Progress bar */}
            <motion.div variants={FADE_UP} className="card-glass" style={{ padding: "2.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <span className="sans" style={{ fontSize: "0.95rem", fontWeight: 500, color: "rgba(232,232,240,0.8)" }}>Today's progress</span>
                <span className="mono" style={{ fontSize: "1.05rem", fontWeight: 700, color: "#2dd4bf" }}>{progress}%</span>
              </div>
              <div style={{ height: "8px", background: "rgba(255,255,255,0.07)", borderRadius: "100px", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${progress}%`, background: "linear-gradient(90deg, #2dd4bf, #14b8a6)", borderRadius: "100px", transition: "width 0.5s cubic-bezier(0.16,1,0.3,1)" }} />
              </div>
              <div className="sans" style={{ fontSize: "0.85rem", color: "rgba(232,232,240,0.45)", marginTop: "0.75rem" }}>
                {checked.filter(Boolean).length} of {plan.daily_goals.length} daily goals completed
              </div>
            </motion.div>

            {/* LLM Coaching Note */}
            <motion.div variants={FADE_UP} className="card-glass" style={{ padding: "2.5rem", borderColor: "rgba(45,212,191,0.2)", background: "rgba(45,212,191,0.04)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.25rem" }}>
                <span style={{ width: "2rem", height: "2rem", borderRadius: "8px", background: "rgba(45,212,191,0.15)", border: "1px solid rgba(45,212,191,0.3)", color: "#2dd4bf", fontSize: "1rem", display: "flex", alignItems: "center", justifyContent: "center" }}>✦</span>
                <span className="sans" style={{ fontWeight: 600, fontSize: "1.1rem", color: "#2dd4bf" }}>Your Coaching Note</span>
                {llmLoading && <span className="spinner" style={{ width: "0.9rem", height: "0.9rem", borderTopColor: "#2dd4bf", borderColor: "rgba(255,255,255,0.1)" }} />}
              </div>
              {llmInsight ? (
                <div className="sans" style={{ fontSize: "0.95rem", lineHeight: 1.75, color: "rgba(232,232,240,0.7)", whiteSpace: "pre-wrap" }}>
                  {llmInsight}
                </div>
              ) : llmLoading ? (
                <p className="sans" style={{ fontSize: "0.9rem", color: "rgba(232,232,240,0.45)", fontStyle: "italic" }}>Generating your personalised coaching note…</p>
              ) : (
                <p className="sans" style={{ fontSize: "0.9rem", color: "rgba(232,232,240,0.45)" }}>Your coaching note will appear here.</p>
              )}
            </motion.div>

            {/* Daily goals */}
            <motion.div variants={FADE_UP}>
              <div className="sans" style={{ fontSize: "0.85rem", color: "rgba(232,232,240,0.4)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "1.25rem" }}>Daily Goals</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {plan.daily_goals.map((goal, i) => (
                  <motion.div whileHover={{ scale: 1.01 }} key={i} onClick={() => setChecked((prev) => { const n = [...prev]; n[i] = !n[i]; return n; })}
                    style={{ padding: "1.75rem 2rem", borderRadius: "16px", cursor: "pointer", background: checked[i] ? "rgba(45,212,191,0.06)" : "rgba(255,255,255,0.03)", border: `1px solid ${checked[i] ? "rgba(45,212,191,0.3)" : "rgba(255,255,255,0.08)"}`, transition: "all 0.2s ease", display: "flex", alignItems: "flex-start", gap: "1.25rem" }}>
                    <div style={{ width: "1.75rem", height: "1.75rem", borderRadius: "50%", flexShrink: 0, marginTop: "0.1rem", border: `2px solid ${checked[i] ? "#2dd4bf" : "rgba(255,255,255,0.2)"}`, background: checked[i] ? "#2dd4bf" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s ease", fontSize: "0.85rem", color: "#05050f", fontWeight: 700 }}>
                      {checked[i] && "✓"}
                    </div>
                    <div>
                      <p className="sans" style={{ fontSize: "1.05rem", fontWeight: 500, lineHeight: 1.4, marginBottom: "0.4rem", color: checked[i] ? "rgba(232,232,240,0.45)" : "#ffffff", textDecoration: checked[i] ? "line-through" : "none", transition: "all 0.2s" }}>{goal.goal}</p>
                      <p className="sans" style={{ fontSize: "0.9rem", color: "rgba(232,232,240,0.5)", lineHeight: 1.6 }}>{goal.rationale}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Weekly milestones */}
            <motion.div variants={FADE_UP} className="card-glass" style={{ padding: "2.5rem" }}>
              <div className="sans" style={{ fontSize: "0.85rem", color: "rgba(232,232,240,0.4)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "1.5rem" }}>Weekly Milestones</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {plan.weekly_milestones.map((m, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "1rem" }}>
                    <span style={{ width: "1.75rem", height: "1.75rem", borderRadius: "50%", flexShrink: 0, background: "rgba(167,139,250,0.12)", border: "1px solid rgba(167,139,250,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.85rem", fontWeight: 700, color: "#a78bfa", fontFamily: "monospace" }}>{i + 1}</span>
                    <p className="sans" style={{ fontSize: "0.95rem", color: "rgba(232,232,240,0.7)", lineHeight: 1.6 }}>{m}</p>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Tips */}
            <motion.div variants={FADE_UP}>
              <div className="sans" style={{ fontSize: "0.85rem", color: "rgba(232,232,240,0.4)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "1.25rem" }}>Personalised Tips</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {plan.tips.map((tip, i) => (
                  <div key={i} style={{ padding: "1.5rem 2rem", borderRadius: "16px", background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.18)", display: "flex", alignItems: "flex-start", gap: "1rem" }}>
                    <span style={{ fontSize: "1.25rem", flexShrink: 0 }}>💡</span>
                    <p className="sans" style={{ fontSize: "0.95rem", color: "rgba(232,232,240,0.8)", lineHeight: 1.6 }}>{tip}</p>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Daily check-in */}
            <motion.div variants={FADE_UP} className="card-glass" style={{ padding: "2.5rem" }}>
              <div className="sans" style={{ fontSize: "0.85rem", color: "rgba(232,232,240,0.4)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "1.5rem" }}>Daily Focus Check-in</div>
              {checkinSent ? (
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", color: "#34d399", fontSize: "0.95rem", fontFamily: "'Inter', sans-serif" }}>
                  <span>✓</span> Focus quality logged. Keep it up!
                </div>
              ) : (
                <>
                  <p className="sans" style={{ fontSize: "0.9rem", color: "rgba(232,232,240,0.5)", marginBottom: "1.25rem" }}>
                    How focused did you feel today? (1 = very scattered, 5 = deeply focused)
                  </p>
                  <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.25rem" }}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button key={n} onClick={() => setCheckinScore(n)} style={{ flex: 1, padding: "1rem", borderRadius: "12px", fontSize: "1rem", fontWeight: 700, fontFamily: "monospace", cursor: "pointer", transition: "all 0.2s", background: checkinScore === n ? "#2dd4bf" : "rgba(255,255,255,0.04)", color: checkinScore === n ? "#05050f" : "rgba(232,232,240,0.6)", border: `1.5px solid ${checkinScore === n ? "#2dd4bf" : "rgba(255,255,255,0.1)"}` }}>{n}</button>
                    ))}
                  </div>
                  <textarea value={checkinNote} onChange={(e) => setCheckinNote(e.target.value)} placeholder="Optional note…" rows={2}
                    style={{ width: "100%", fontSize: "0.95rem", padding: "1rem", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.03)", color: "#e8e8f0", resize: "none", outline: "none", fontFamily: "'Inter', sans-serif", marginBottom: "1.25rem", boxSizing: "border-box" }} />
                  {checkinError && <p style={{ color: "#f87171", fontSize: "0.85rem", marginBottom: "0.75rem", fontFamily: "'Inter', sans-serif" }}>{checkinError}</p>}
                  <button onClick={handleCheckin} disabled={checkinScore === null} style={{ width: "100%", padding: "1rem", background: checkinScore !== null ? "linear-gradient(135deg, #2dd4bf, #14b8a6)" : "rgba(255,255,255,0.06)", color: checkinScore !== null ? "#05050f" : "rgba(232,232,240,0.3)", border: "none", borderRadius: "12px", fontSize: "0.95rem", fontWeight: 700, cursor: checkinScore !== null ? "pointer" : "not-allowed", fontFamily: "'Inter', sans-serif", transition: "all 0.2s" }}>
                    Log focus quality
                  </button>
                </>
              )}
            </motion.div>

            <motion.div variants={FADE_UP} style={{ textAlign: "center", paddingBottom: "2rem" }}>
              <Link href="/wellbeing" style={{ fontSize: "0.95rem", color: "#2dd4bf", textDecoration: "none", fontFamily: "monospace" }}>
                ← Back to Wellbeing
              </Link>
            </motion.div>
          </>
        )}
      </motion.div>
    </div>
  );
}