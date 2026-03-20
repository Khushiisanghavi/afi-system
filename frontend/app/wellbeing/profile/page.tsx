"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

interface Session {
  video_name: string | null;
  final_afi: number;
  harm_tier: string;
  created_at: string;
}
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
}

const HARM_INFO: Record<string, { color: string; bg: string; dot: string; desc: string }> = {
  Calm: {
    color: "text-emerald-700", bg: "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700",
    dot: "bg-emerald-500",
    desc: "Supports recovery of attention. Good for winding down and building sustained focus.",
  },
  Moderate: {
    color: "text-yellow-700", bg: "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700",
    dot: "bg-yellow-500",
    desc: "Normal engagement. Sustainable in balance. Most long-form content falls here.",
  },
  High: {
    color: "text-orange-700", bg: "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-700",
    dot: "bg-orange-500",
    desc: "Activates the dopamine-reward loop more aggressively. Regular exposure raises your baseline stimulation threshold, making calm activities feel boring.",
  },
  Overstimulating: {
    color: "text-red-700", bg: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700",
    dot: "bg-red-500",
    desc: "Sustained consumption fragments attention. Associated with reduced ability to focus on single tasks, increased restlessness, and sleep disruption.",
  },
};

const TIER_DESCS: Record<string, string> = {
  Healthy: "Your content diet is well-balanced. Keep it up.",
  "At Risk": "A significant portion of your recent content is highly stimulating. This can reduce your capacity for sustained focus over time.",
  Fragmented: "Extended high-AFI consumption detected. Your attention span may already be affected. A recovery plan is strongly recommended.",
};

export default function WellbeingProfilePage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { setLoading(false); return; }
    const headers = { Authorization: `Bearer ${token}` };

    Promise.all([
      fetch("http://localhost:8000/wellbeing/profile", { headers }).then((r) => r.json()),
      fetch("http://localhost:8000/wellbeing/history", { headers }).then((r) => r.json()),
      fetch("http://localhost:8000/wellbeing/checkins", { headers }).then((r) => r.json()),
    ])
      .then(([p, s, c]) => {
        setProfile(p);
        setSessions(Array.isArray(s) ? s : []);
        setCheckins(Array.isArray(c) ? c : []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Derive which harm tiers the user has been exposed to
  const exposedTiers = profile
    ? Object.entries(profile.content_mix)
        .filter(([, v]) => v > 0)
        .map(([k]) => k.charAt(0).toUpperCase() + k.slice(1).replace("stimulating", " stimulating"))
    : [];

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Breadcrumb */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-3 text-sm text-gray-500">
        <Link href="/wellbeing" className="hover:text-teal-600">Wellbeing</Link>
        {" / "}
        <span className="text-gray-800 dark:text-gray-200 font-medium">Attention Profile</span>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {loading && <p className="text-gray-400">Loading…</p>}

        {profile && (
          <>
            {/* Profile tier card */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center gap-3 mb-3">
                <span className={`text-2xl font-bold text-gray-900 dark:text-white`}>
                  Profile: {profile.profile_tier}
                </span>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold
                  ${profile.profile_tier === "Healthy" ? "bg-emerald-100 text-emerald-700"
                    : profile.profile_tier === "At Risk" ? "bg-amber-100 text-amber-700"
                    : "bg-red-100 text-red-700"}`}>
                  {profile.attention_fragmentation_index.toFixed(0)} / 100 AFI
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-5">
                {TIER_DESCS[profile.profile_tier] || ""}
              </p>

              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: "Overstimulation ratio", value: `${(profile.overstim_ratio * 100).toFixed(0)}%` },
                  { label: "High-AFI minutes (7d)", value: `${profile.weekly_high_afi_minutes.toFixed(0)} min` },
                  { label: "Binge sessions", value: String(profile.binge_signals) },
                ].map((s) => (
                  <div key={s.label} className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 text-center">
                    <p className="text-xs text-gray-400 mb-1">{s.label}</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">{s.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Insights */}
            {profile.insights.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">Insights</h2>
                <ul className="space-y-3">
                  {profile.insights.map((ins, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300">
                      <span className="mt-0.5 w-5 h-5 rounded-full bg-teal-100 dark:bg-teal-900/30 text-teal-600 flex items-center justify-center text-xs shrink-0">{i + 1}</span>
                      {ins}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Content breakdown */}
            {sessions.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">
                  Recent content breakdown
                </h2>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {sessions.slice(0, 20).map((s, i) => {
                    const info = HARM_INFO[s.harm_tier] || HARM_INFO.Moderate;
                    return (
                      <div key={i} className="flex items-center gap-3 text-sm">
                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${info.dot}`} />
                        <span className="flex-1 text-gray-700 dark:text-gray-300 truncate">
                          {s.video_name || "Untitled"}
                        </span>
                        <span className="text-xs text-gray-400">{s.final_afi.toFixed(0)}</span>
                        <span className={`text-xs font-medium ${info.color}`}>{s.harm_tier}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Harm explanation cards */}
            <div>
              <h2 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-4">
                What each tier means for your attention
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(HARM_INFO).map(([tier, info]) => (
                  <div key={tier} className={`rounded-2xl border p-5 ${info.bg}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`w-3 h-3 rounded-full ${info.dot}`} />
                      <span className={`font-semibold text-sm ${info.color}`}>{tier}</span>
                      {exposedTiers.includes(tier) && (
                        <span className="ml-auto text-xs text-gray-400">in your history</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">{info.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Focus quality log */}
            {checkins.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">
                  Focus quality log
                </h2>
                <div className="grid grid-cols-7 gap-2">
                  {checkins.slice(0, 7).reverse().map((c, i) => (
                    <div key={i} className="text-center">
                      <div className={`w-full aspect-square rounded-xl flex items-center justify-center text-sm font-bold
                        ${c.focus_quality >= 4 ? "bg-emerald-100 text-emerald-700"
                          : c.focus_quality >= 3 ? "bg-yellow-100 text-yellow-700"
                          : "bg-red-100 text-red-700"}`}>
                        {c.focus_quality}/5
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(c.created_at).toLocaleDateString(undefined, { weekday: "short" })}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-center pt-2">
              <Link
                href="/wellbeing/plan"
                className="px-8 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-semibold transition-colors"
              >
                View your recovery plan →
              </Link>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
