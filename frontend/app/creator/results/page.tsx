"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

interface GapEntry { yours: number; trend: number; gap: number; }
interface Recommendation {
  rank: number;
  dimension: string;
  issue: string;
  action: string;
  predicted_score_delta: number;
}
interface CreatorResult {
  captivation_score: number;
  captivation_category: string;
  hook_strength: number;
  pace_variance: number;
  audio_energy_arc: string;
  text_density_fit: number;
  trend_match_score: number;
  closest_trend_category: string;
  gap_analysis: Record<string, GapEntry>;
  prioritised_recommendations: Recommendation[];
  predicted_score_after_changes: number;
  creator_insights: string[];
}
interface AFIResult {
  final_afi_score: number;
  final_category: string;
  ml_powered: boolean;
  feature_importance: Record<string, number>;
  model_confidence: number;
  insights: string[];
}
interface FullResult { afi: AFIResult; creator: CreatorResult; }

const DIM_LABELS: Record<string, string> = {
  scene_change_rate: "Scene pacing",
  tempo_bpm:         "Music tempo",
  words_per_second:  "Speech / text rate",
  text_area_ratio:   "Text overlay density",
  rms_energy:        "Audio energy",
};
const DIM_ICONS: Record<string, string> = {
  scene_change_rate: "🎬",
  tempo_bpm:         "🎵",
  words_per_second:  "💬",
  text_area_ratio:   "📝",
  rms_energy:        "🔊",
};

function ScoreRing({ score, color, size = 140 }: { score: number; color: string; size?: number }) {
  const r = size / 2 - 12;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={10} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={10}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        style={{ transition: "stroke-dasharray 1s ease" }} />
    </svg>
  );
}

function MiniBar({ value, color = "#a78bfa" }: { value: number; color?: string }) {
  return (
    <div style={{ height: "4px", background: "rgba(255,255,255,0.08)", borderRadius: "2px", overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${Math.min(value * 100, 100)}%`, background: color, borderRadius: "2px", transition: "width 0.7s ease" }} />
    </div>
  );
}

function getCategoryColor(cat: string): string {
  if (cat === "Very High") return "#34d399";
  if (cat === "High")      return "#a78bfa";
  if (cat === "Medium")    return "#facc15";
  return "#f87171";
}

export default function CreatorResultsPage() {
  const [data, setData] = useState<FullResult | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem("creatorResult");
    if (raw) setData(JSON.parse(raw));
  }, []);

  if (!data) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "1rem" }}>
        <p style={{ color: "var(--muted)" }}>No result found.</p>
        <Link href="/creator/upload" className="btn-primary" style={{ fontSize: "0.85rem" }}>Upload a video</Link>
      </div>
    );
  }

  const { afi, creator } = data;
  const capColor = getCategoryColor(creator.captivation_category);

  return (
    <div className="container-section" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.7rem", fontFamily: "monospace", color: "var(--muted)" }}>
        <Link href="/creator" style={{ color: "var(--muted)", textDecoration: "none" }}>Creator Studio</Link>
        <span>/</span>
        <span style={{ color: "var(--foreground)" }}>Results</span>
        {afi.ml_powered && (
          <span style={{ marginLeft: "0.5rem", padding: "0.15rem 0.5rem", background: "rgba(167,139,250,0.15)", border: "1px solid rgba(167,139,250,0.3)", borderRadius: "4px", color: "#a78bfa", fontSize: "0.65rem", letterSpacing: "0.05em" }}>
            ML POWERED
          </span>
        )}
      </div>

      {/* ── Row 1: Captivation ring + AFI vs Captivation ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>

        {/* Captivation card */}
        <div className="card-glass" style={{ padding: "2rem" }}>
          <div className="sans" style={{ color: "var(--muted-mid)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "1.5rem" }}>
            Captivation Score
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
            <div style={{ position: "relative", flexShrink: 0 }}>
              <ScoreRing score={creator.captivation_score} color={capColor} />
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <span className="mono" style={{ fontSize: "1.6rem", fontWeight: 700, color: "#ffffff" }}>
                  {creator.captivation_score.toFixed(0)}
                </span>
                <span className="sans" style={{ fontSize: "0.7rem", color: "var(--muted)" }}>/100</span>
              </div>
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <span style={{ display: "inline-block", padding: "0.25rem 0.75rem", borderRadius: "4px", fontSize: "0.8rem", fontWeight: 600, background: `${capColor}18`, border: `1px solid ${capColor}40`, color: capColor }}>
                {creator.captivation_category}
              </span>
              {[
                { label: "Hook strength",    val: creator.hook_strength,    color: "#a78bfa" },
                { label: "Pace variance",    val: creator.pace_variance,    color: "#818cf8" },
                { label: "Text density fit", val: creator.text_density_fit, color: "#38bdf8" },
              ].map((m) => (
                <div key={m.label}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.3rem" }}>
                    <span className="sans" style={{ color: "var(--muted-mid)", fontSize: "0.8rem" }}>{m.label}</span>
                    <span className="mono" style={{ color: "#ffffff", fontSize: "0.8rem" }}>{(m.val * 100).toFixed(0)}%</span>
                  </div>
                  <MiniBar value={m.val} color={m.color} />
                </div>
              ))}
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.25rem" }}>
                <span className="sans" style={{ color: "var(--muted)", fontSize: "0.75rem" }}>Audio arc:</span>
                <span style={{ padding: "0.15rem 0.5rem", background: "rgba(250,204,21,0.12)", border: "1px solid rgba(250,204,21,0.25)", borderRadius: "4px", color: "#facc15", fontSize: "0.75rem", textTransform: "capitalize" }}>
                  {creator.audio_energy_arc}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* AFI vs Captivation */}
        <div className="card-glass" style={{ padding: "2rem" }}>
          <div className="sans" style={{ color: "var(--muted-mid)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "1.5rem" }}>
            AFI vs. Captivation
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.25rem" }}>
            <div className="card-glass" style={{ padding: "1.25rem", textAlign: "center" }}>
              <div className="sans" style={{ color: "var(--muted)", fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>AFI Score</div>
              <div className="mono" style={{ fontSize: "2rem", fontWeight: 700, color: "#ffffff" }}>{afi.final_afi_score.toFixed(0)}</div>
              <div className="sans" style={{ color: "var(--muted-mid)", fontSize: "0.8rem", marginTop: "0.25rem" }}>{afi.final_category}</div>
              <div className="sans" style={{ color: "var(--muted)", fontSize: "0.72rem", marginTop: "0.5rem" }}>How stimulating?</div>
            </div>
            <div style={{ padding: "1.25rem", textAlign: "center", background: `${capColor}0d`, border: `1px solid ${capColor}25`, borderRadius: "8px" }}>
              <div className="sans" style={{ color: "var(--muted)", fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>Captivation</div>
              <div className="mono" style={{ fontSize: "2rem", fontWeight: 700, color: capColor }}>{creator.captivation_score.toFixed(0)}</div>
              <div className="sans" style={{ color: capColor, fontSize: "0.8rem", marginTop: "0.25rem" }}>{creator.captivation_category}</div>
              <div className="sans" style={{ color: "var(--muted)", fontSize: "0.72rem", marginTop: "0.5rem" }}>How captivating?</div>
            </div>
          </div>
          <p className="sans" style={{ color: "var(--muted-mid)", fontSize: "0.82rem", lineHeight: 1.65 }}>
            A high AFI score means stimulating content — but stimulating ≠ captivating.
            Calm content can score high on captivation through strong pacing, a great hook,
            and well-matched audio. Focus on captivation to build loyal viewers.
          </p>
        </div>
      </div>

      {/* ── Row 2: Trend Match ── */}
      <div className="card-glass" style={{ padding: "2rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem", flexWrap: "wrap", gap: "0.5rem" }}>
          <div className="sans" style={{ color: "var(--muted-mid)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Trend Match
          </div>
          <span style={{ padding: "0.2rem 0.7rem", background: "rgba(129,140,248,0.1)", border: "1px solid rgba(129,140,248,0.25)", borderRadius: "4px", color: "#818cf8", fontSize: "0.78rem", fontWeight: 600 }}>
            {creator.closest_trend_category}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.4rem" }}>
          <span className="sans" style={{ color: "var(--muted)", fontSize: "0.75rem" }}>0</span>
          <span className="mono" style={{ fontWeight: 700, fontSize: "1.1rem", color: "#ffffff" }}>{creator.trend_match_score.toFixed(0)} / 100</span>
          <span className="sans" style={{ color: "var(--muted)", fontSize: "0.75rem" }}>100</span>
        </div>
        <div style={{ height: "6px", background: "rgba(255,255,255,0.08)", borderRadius: "3px", overflow: "hidden", marginBottom: "1.5rem" }}>
          <div style={{ height: "100%", width: `${creator.trend_match_score}%`, background: "linear-gradient(90deg, #818cf8, #a78bfa)", borderRadius: "3px", transition: "width 0.7s ease" }} />
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th className="sans" style={{ color: "var(--muted-mid)", fontSize: "0.8rem" }}>Dimension</th>
                <th className="sans" style={{ color: "var(--muted-mid)", fontSize: "0.8rem", textAlign: "right" }}>Your video</th>
                <th className="sans" style={{ color: "var(--muted-mid)", fontSize: "0.8rem", textAlign: "right" }}>Trend optimal</th>
                <th className="sans" style={{ color: "var(--muted-mid)", fontSize: "0.8rem", textAlign: "right" }}>Gap</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(creator.gap_analysis).map(([dim, entry]) => {
                const gapColor = Math.abs(entry.gap) < 0.05 * Math.abs(entry.trend)
                  ? "#34d399" : entry.gap < 0 ? "#f87171" : "#facc15";
                return (
                  <tr key={dim} style={{ borderBottom: "1px solid var(--card-border)" }}>
                    <td><span className="sans" style={{ color: "var(--foreground)", fontSize: "0.88rem" }}>{DIM_ICONS[dim] || "•"} {DIM_LABELS[dim] || dim}</span></td>
                    <td style={{ textAlign: "right" }}><span className="mono" style={{ color: "#ffffff", fontSize: "0.88rem" }}>{entry.yours.toFixed(3)}</span></td>
                    <td style={{ textAlign: "right" }}><span className="mono" style={{ color: "var(--muted-mid)", fontSize: "0.88rem" }}>{entry.trend.toFixed(3)}</span></td>
                    <td style={{ textAlign: "right" }}><span className="mono" style={{ color: gapColor, fontWeight: 700, fontSize: "0.88rem" }}>{entry.gap > 0 ? "+" : ""}{entry.gap.toFixed(3)}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Row 3: Recommendations ── */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
          <h2 className="sans" style={{ fontWeight: 700, fontSize: "1.1rem", color: "#ffffff" }}>Improvement recommendations</h2>
          <div className="sans" style={{ color: "var(--muted-mid)", fontSize: "0.85rem" }}>
            Predicted after top changes:{" "}
            <span className="mono" style={{ color: "#34d399", fontWeight: 700 }}>{creator.predicted_score_after_changes.toFixed(0)} / 100</span>
          </div>
        </div>
        {creator.prioritised_recommendations.length === 0 ? (
          <div className="card-glass" style={{ padding: "2rem", textAlign: "center" }}>
            <p className="sans" style={{ color: "#34d399" }}>🎉 Your video closely matches current trends.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {creator.prioritised_recommendations.map((rec) => (
              <div key={rec.rank} className="card-glass" style={{ padding: "1.5rem" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem" }}>
                  <div style={{ width: "2rem", height: "2rem", borderRadius: "50%", background: "rgba(167,139,250,0.15)", border: "1px solid rgba(167,139,250,0.3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <span className="mono" style={{ color: "#a78bfa", fontSize: "0.8rem", fontWeight: 700 }}>{rec.rank}</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem", flexWrap: "wrap" }}>
                      <span>{DIM_ICONS[rec.dimension] || "•"}</span>
                      <span className="sans" style={{ color: "var(--muted-mid)", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>{DIM_LABELS[rec.dimension] || rec.dimension}</span>
                      <span style={{ marginLeft: "auto", padding: "0.15rem 0.6rem", background: "rgba(52,211,153,0.12)", border: "1px solid rgba(52,211,153,0.3)", borderRadius: "4px", color: "#34d399", fontSize: "0.75rem", fontWeight: 700 }}>
                        +{rec.predicted_score_delta.toFixed(1)} pts
                      </span>
                    </div>
                    <p className="sans" style={{ color: "#ffffff", fontSize: "0.92rem", fontWeight: 500, marginBottom: "0.6rem", lineHeight: 1.5 }}>{rec.issue}</p>
                    <div style={{ padding: "0.75rem 1rem", background: "rgba(167,139,250,0.06)", border: "1px solid rgba(167,139,250,0.15)", borderRadius: "6px" }}>
                      <span className="sans" style={{ color: "var(--muted-mid)", fontSize: "0.82rem", lineHeight: 1.65 }}>
                        <span style={{ color: "#a78bfa", fontWeight: 600 }}>Action: </span>{rec.action}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Row 4: Insights ── */}
      <div className="card-glass" style={{ padding: "2rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.25rem" }}>
          <span style={{ width: "0.5rem", height: "0.5rem", borderRadius: "50%", background: "#a78bfa", boxShadow: "0 0 8px rgba(167,139,250,0.5)" }} />
          <span className="sans" style={{ fontWeight: 600, fontSize: "1rem", color: "#a78bfa" }}>Insights</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {creator.creator_insights.map((insight, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
              <div style={{ width: "1.4rem", height: "1.4rem", borderRadius: "50%", background: "rgba(167,139,250,0.12)", border: "1px solid rgba(167,139,250,0.25)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: "0.1rem" }}>
                <span className="mono" style={{ color: "#a78bfa", fontSize: "0.65rem", fontWeight: 700 }}>{i + 1}</span>
              </div>
              <p className="sans" style={{ color: "var(--muted-mid)", fontSize: "0.9rem", lineHeight: 1.65 }}>{insight}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", paddingTop: "0.5rem" }}>
        <Link href="/creator/upload" className="btn-secondary" style={{ fontSize: "0.85rem", padding: "0.6rem 1.2rem" }}>Analyze another video</Link>
        <Link href="/creator" className="btn-primary" style={{ fontSize: "0.85rem", padding: "0.6rem 1.2rem" }}>Back to Creator Studio</Link>
      </div>
    </div>
  );
}
