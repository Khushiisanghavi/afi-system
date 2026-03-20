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

const CAT_COLORS: Record<string, { bg: string; text: string; ring: string }> = {
  "Very High": { bg: "bg-emerald-50", text: "text-emerald-700", ring: "#10b981" },
  High:        { bg: "bg-blue-50",    text: "text-blue-700",    ring: "#3b82f6" },
  Medium:      { bg: "bg-yellow-50",  text: "text-yellow-700",  ring: "#f59e0b" },
  Low:         { bg: "bg-red-50",     text: "text-red-700",     ring: "#ef4444" },
};

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

function ScoreRing({ score, color, size = 160 }: { score: number; color: string; size?: number }) {
  const r = size / 2 - 14;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e5e7eb" strokeWidth={10} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={10}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        style={{ transition: "stroke-dasharray 1s ease" }}
      />
    </svg>
  );
}

function Bar({ value, max = 1, color = "bg-indigo-500" }: { value: number; max?: number; color?: string }) {
  return (
    <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
      <div
        className={`h-full ${color} rounded-full transition-all duration-700`}
        style={{ width: `${Math.min((value / max) * 100, 100)}%` }}
      />
    </div>
  );
}

export default function CreatorResultsPage() {
  const [data, setData] = useState<FullResult | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem("creatorResult");
    if (raw) setData(JSON.parse(raw));
  }, []);

  if (!data) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400">No result found. <Link href="/creator/upload" className="text-indigo-600 underline">Upload a video</Link></p>
      </main>
    );
  }

  const { afi, creator } = data;
  const capColors = CAT_COLORS[creator.captivation_category] || CAT_COLORS["Medium"];

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-16">
      {/* Breadcrumb */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-3 flex items-center gap-2 text-sm text-gray-500">
        <Link href="/creator" className="hover:text-indigo-600">Creator Studio</Link>
        <span>/</span>
        <span className="text-gray-800 dark:text-gray-200 font-medium">Results</span>
        {afi.ml_powered && (
          <span className="ml-2 px-2 py-0.5 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 text-xs rounded-full font-semibold">
            ML POWERED
          </span>
        )}
      </div>

      <div className="max-w-5xl mx-auto px-6 pt-8 space-y-6">

        {/* ── Row 1: Captivation ring + AFI comparison ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Captivation card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">
              Captivation Score
            </h2>
            <div className="flex items-center gap-6">
              <div className="relative shrink-0">
                <ScoreRing score={creator.captivation_score} color={capColors.ring} />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">
                    {creator.captivation_score.toFixed(0)}
                  </span>
                  <span className="text-xs text-gray-400">/100</span>
                </div>
              </div>
              <div className="flex-1 space-y-4">
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${capColors.bg} ${capColors.text}`}>
                  {creator.captivation_category}
                </span>
                <div className="space-y-2 text-xs text-gray-500 dark:text-gray-400">
                  <div>
                    <div className="flex justify-between mb-1"><span>Hook strength</span><span>{(creator.hook_strength * 100).toFixed(0)}%</span></div>
                    <Bar value={creator.hook_strength} color="bg-indigo-500" />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1"><span>Pace variance</span><span>{(creator.pace_variance * 100).toFixed(0)}%</span></div>
                    <Bar value={creator.pace_variance} color="bg-violet-500" />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1"><span>Text density fit</span><span>{(creator.text_density_fit * 100).toFixed(0)}%</span></div>
                    <Bar value={creator.text_density_fit} color="bg-sky-500" />
                  </div>
                </div>
              </div>
            </div>
            {/* Audio arc badge */}
            <div className="mt-4 flex items-center gap-2">
              <span className="text-xs text-gray-400">Audio arc:</span>
              <span className="px-2 py-0.5 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-xs rounded-full font-medium capitalize">
                {creator.audio_energy_arc}
              </span>
            </div>
          </div>

          {/* AFI vs Captivation explainer */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">
              AFI vs. Captivation
            </h2>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 text-center">
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">AFI Score</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{afi.final_afi_score.toFixed(0)}</p>
                <p className="text-xs text-gray-500 mt-1">{afi.final_category}</p>
                <p className="text-xs text-gray-400 mt-2">How stimulating?</p>
              </div>
              <div className={`rounded-xl p-4 text-center ${capColors.bg}`}>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Captivation</p>
                <p className={`text-3xl font-bold ${capColors.text}`}>{creator.captivation_score.toFixed(0)}</p>
                <p className={`text-xs mt-1 ${capColors.text}`}>{creator.captivation_category}</p>
                <p className="text-xs text-gray-400 mt-2">How captivating?</p>
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              A high AFI score means stimulating content — but stimulating ≠ captivating.
              Calm content can score high on captivation through strong pacing, a great hook, and
              well-matched audio. Focus on captivation to build loyal viewers.
            </p>
          </div>
        </div>

        {/* ── Row 2: Trend match panel ── */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400">
              Trend Match
            </h2>
            <span className="px-3 py-1 bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400 text-xs rounded-full font-semibold">
              {creator.closest_trend_category}
            </span>
          </div>

          {/* Gauge */}
          <div className="mb-2 flex items-center justify-between text-xs text-gray-400">
            <span>0</span>
            <span className="font-semibold text-gray-700 dark:text-gray-200 text-base">
              {creator.trend_match_score.toFixed(0)} / 100
            </span>
            <span>100</span>
          </div>
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-6">
            <div
              className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-all duration-700"
              style={{ width: `${creator.trend_match_score}%` }}
            />
          </div>

          {/* Gap table */}
          <div className="overflow-hidden rounded-xl border border-gray-100 dark:border-gray-700">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 dark:bg-gray-750">
                <tr>
                  <th className="px-4 py-2 text-left text-gray-500 font-medium">Dimension</th>
                  <th className="px-4 py-2 text-right text-gray-500 font-medium">Your video</th>
                  <th className="px-4 py-2 text-right text-gray-500 font-medium">Trend optimal</th>
                  <th className="px-4 py-2 text-right text-gray-500 font-medium">Gap</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {Object.entries(creator.gap_analysis).map(([dim, entry]) => (
                  <tr key={dim} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                    <td className="px-4 py-2 text-gray-700 dark:text-gray-300 flex items-center gap-1">
                      <span>{DIM_ICONS[dim] || "•"}</span>
                      {DIM_LABELS[dim] || dim}
                    </td>
                    <td className="px-4 py-2 text-right text-gray-700 dark:text-gray-300">{entry.yours.toFixed(3)}</td>
                    <td className="px-4 py-2 text-right text-gray-500">{entry.trend.toFixed(3)}</td>
                    <td className={`px-4 py-2 text-right font-semibold ${
                      Math.abs(entry.gap) < 0.05 * entry.trend
                        ? "text-green-600"
                        : entry.gap < 0
                        ? "text-red-500"
                        : "text-amber-500"
                    }`}>
                      {entry.gap > 0 ? "+" : ""}{entry.gap.toFixed(3)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Row 3: Recommendations ── */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              Improvement recommendations
            </h2>
            <div className="text-xs text-gray-400">
              Predicted score after applying top changes:{" "}
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                {creator.predicted_score_after_changes.toFixed(0)} / 100
              </span>
            </div>
          </div>

          {creator.prioritised_recommendations.length === 0 ? (
            <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-2xl p-6 text-center">
              <p className="text-emerald-700 dark:text-emerald-400 font-medium">
                🎉 Your video closely matches current trends — no significant gaps detected.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {creator.prioritised_recommendations.map((rec) => (
                <div key={rec.rank} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
                  <div className="flex items-start gap-4">
                    <div className="shrink-0 w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 flex items-center justify-center text-sm font-bold">
                      {rec.rank}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{DIM_ICONS[rec.dimension] || "•"}</span>
                        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                          {DIM_LABELS[rec.dimension] || rec.dimension}
                        </span>
                        <span className="ml-auto px-2 py-0.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-xs rounded-full font-semibold">
                          +{rec.predicted_score_delta.toFixed(1)} pts
                        </span>
                      </div>
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">
                        {rec.issue}
                      </p>
                      <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-3">
                        <p className="text-xs text-indigo-700 dark:text-indigo-300 leading-relaxed">
                          <span className="font-semibold">Action: </span>{rec.action}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Row 4: Creator insights ── */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">
            Insights
          </h2>
          <ul className="space-y-3">
            {creator.creator_insights.map((insight, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300">
                <span className="mt-0.5 w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs shrink-0">
                  {i + 1}
                </span>
                {insight}
              </li>
            ))}
          </ul>
        </div>

        {/* Actions */}
        <div className="flex gap-4 justify-center pt-4">
          <Link
            href="/creator/upload"
            className="px-6 py-3 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm font-medium"
          >
            Analyze another video
          </Link>
          <Link
            href="/creator"
            className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors"
          >
            Back to Creator Studio
          </Link>
        </div>
      </div>
    </main>
  );
}
