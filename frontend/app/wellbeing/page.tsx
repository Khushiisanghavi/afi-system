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

const TIER_STYLES: Record<string, { badge: string; border: string; label: string }> = {
  Healthy:    { badge: "bg-emerald-100 text-emerald-700",  border: "border-emerald-300", label: "✅ Healthy"    },
  "At Risk":  { badge: "bg-amber-100 text-amber-700",      border: "border-amber-300",   label: "⚠️ At Risk"   },
  Fragmented: { badge: "bg-red-100 text-red-700",          border: "border-red-300",     label: "🔴 Fragmented" },
};

function DonutChart({ mix }: { mix: ContentMix }) {
  const segments = [
    { key: "calm",           label: "Calm",            color: "#10b981", value: mix.calm },
    { key: "moderate",       label: "Moderate",        color: "#f59e0b", value: mix.moderate },
    { key: "high",           label: "High",            color: "#f97316", value: mix.high },
    { key: "overstimulating",label: "Overstimulating", color: "#ef4444", value: mix.overstimulating },
  ];

  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;
  const r = 52, cx = 70, cy = 70, strokeW = 18;
  const circ = 2 * Math.PI * r;
  let cumulative = 0;

  return (
    <div className="flex items-center gap-8">
      <svg width={140} height={140} viewBox="0 0 140 140">
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
        {/* Center hole */}
        <circle cx={cx} cy={cy} r={r - strokeW / 2 - 2} fill="white" className="dark:fill-gray-800" />
      </svg>
      <div className="space-y-2">
        {segments.map((seg) => (
          <div key={seg.key} className="flex items-center gap-2 text-xs">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
            <span className="text-gray-600 dark:text-gray-400">{seg.label}</span>
            <span className="ml-auto font-semibold text-gray-800 dark:text-gray-200">
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
    if (!token) { setError("Please log in to see your wellbeing profile."); setLoading(false); return; }
    fetch("http://localhost:8000/wellbeing/profile", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => {
        if (!r.ok) throw new Error("Could not load profile.");
        return r.json();
      })
      .then((d) => setProfile(d))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const tierStyle = profile ? (TIER_STYLES[profile.profile_tier] || TIER_STYLES["At Risk"]) : null;

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <span className="text-xs font-semibold uppercase tracking-widest text-teal-600 dark:text-teal-400">
            Wellbeing Dashboard
          </span>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
            Your Attention Health
          </h1>
          <p className="mt-2 text-gray-500 dark:text-gray-400 max-w-lg text-sm">
            Understand how the content you watch affects your attention span, and get a
            personalised plan to improve it.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {loading && <p className="text-gray-400">Loading your profile…</p>}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-2xl p-5 text-red-700 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        {profile && tierStyle && (
          <>
            {/* Tier + AFI row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Profile tier card */}
              <div className={`bg-white dark:bg-gray-800 rounded-2xl border-2 ${tierStyle.border} p-6 md:col-span-1`}>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Profile tier</p>
                <span className={`inline-block px-4 py-2 rounded-full text-sm font-bold ${tierStyle.badge}`}>
                  {tierStyle.label}
                </span>
                <p className="mt-4 text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  {profile.summary}
                </p>
                <Link
                  href="/wellbeing/profile"
                  className="mt-4 inline-block text-xs text-teal-600 dark:text-teal-400 font-medium hover:underline"
                >
                  See full profile →
                </Link>
              </div>

              {/* AFI gauge */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-3">Attention Fragmentation Index</p>
                <div className="flex items-end gap-2">
                  <span className="text-4xl font-bold text-gray-900 dark:text-white">
                    {profile.attention_fragmentation_index.toFixed(0)}
                  </span>
                  <span className="text-gray-400 mb-1">/100</span>
                </div>
                <div className="mt-3 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      profile.attention_fragmentation_index < 35
                        ? "bg-emerald-500"
                        : profile.attention_fragmentation_index < 65
                        ? "bg-amber-500"
                        : "bg-red-500"
                    }`}
                    style={{ width: `${profile.attention_fragmentation_index}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Higher = more fragmented. Below 35 is healthy.
                </p>
              </div>

              {/* Key stats */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 space-y-4">
                <p className="text-xs text-gray-400 uppercase tracking-wide">Key stats</p>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Overstimulation ratio</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">
                    {(profile.overstim_ratio * 100).toFixed(0)}%
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">High-AFI minutes (7 days)</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">
                    {profile.weekly_high_afi_minutes.toFixed(0)} min
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Binge sessions detected</p>
                  <p className={`text-xl font-bold ${profile.binge_signals > 0 ? "text-red-500" : "text-emerald-500"}`}>
                    {profile.binge_signals}
                  </p>
                </div>
              </div>
            </div>

            {/* Content mix donut */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-5">
                Content mix
              </p>
              <DonutChart mix={profile.content_mix} />
            </div>

            {/* CTAs */}
            <div className="grid grid-cols-2 gap-4">
              <Link
                href="/wellbeing/profile"
                className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 hover:border-teal-400 transition-colors group"
              >
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 group-hover:text-teal-600">
                  Full attention profile →
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Detailed breakdown of your content habits and harm tiers
                </p>
              </Link>
              <Link
                href="/wellbeing/plan"
                className="bg-teal-600 hover:bg-teal-700 rounded-2xl p-5 transition-colors group"
              >
                <p className="text-sm font-semibold text-white">Your recovery plan →</p>
                <p className="text-xs text-teal-200 mt-1">
                  Daily goals, milestones, and personalised tips
                </p>
              </Link>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
