"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

interface DailyGoal { goal: string; rationale: string; }
interface Plan {
  daily_goals: DailyGoal[];
  weekly_milestones: string[];
  tips: string[];
}

export default function WellbeingPlanPage() {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [tier, setTier] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [checked, setChecked] = useState<boolean[]>([]);

  // Check-in state
  const [checkinScore, setCheckinScore] = useState<number | null>(null);
  const [checkinNote, setCheckinNote] = useState("");
  const [checkinSent, setCheckinSent] = useState(false);
  const [checkinError, setCheckinError] = useState<string | null>(null);

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    Promise.all([
      fetch("http://localhost:8000/wellbeing/plan", {
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => r.json()),
      fetch("http://localhost:8000/wellbeing/profile", {
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => r.json()),
    ])
      .then(([p, prof]) => {
        setPlan(p);
        setTier(prof.profile_tier || "");
        setChecked(new Array((p.daily_goals || []).length).fill(false));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function handleRefresh() {
    if (!token) return;
    setRefreshing(true);
    try {
      const res = await fetch("http://localhost:8000/wellbeing/plan/update", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setPlan(data.plan);
      setChecked(new Array((data.plan.daily_goals || []).length).fill(false));
    } catch (e) {
      console.error(e);
    } finally {
      setRefreshing(false);
    }
  }

  async function handleCheckin() {
    if (!token || checkinScore === null) return;
    setCheckinError(null);
    try {
      const res = await fetch("http://localhost:8000/wellbeing/checkin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ focus_quality: checkinScore, notes: checkinNote || undefined }),
      });
      if (!res.ok) throw new Error("Failed to log check-in.");
      setCheckinSent(true);
    } catch (e: unknown) {
      setCheckinError(e instanceof Error ? e.message : "Error");
    }
  }

  const tierColor = tier === "Healthy"
    ? "bg-emerald-600"
    : tier === "Fragmented"
    ? "bg-red-600"
    : "bg-amber-500";

  const progress = plan
    ? Math.round((checked.filter(Boolean).length / Math.max(plan.daily_goals.length, 1)) * 100)
    : 0;

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-3 text-sm text-gray-500">
        <Link href="/wellbeing" className="hover:text-teal-600">Wellbeing</Link>
        {" / "}
        <span className="text-gray-800 dark:text-gray-200 font-medium">Recovery Plan</span>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        {loading && <p className="text-gray-400">Loading your plan…</p>}

        {plan && (
          <>
            {/* Plan header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Your recovery plan</h1>
                {tier && (
                  <span className={`inline-block mt-1 px-3 py-0.5 rounded-full text-xs font-semibold text-white ${tierColor}`}>
                    {tier}
                  </span>
                )}
              </div>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="px-4 py-2 text-xs rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
              >
                {refreshing ? "Refreshing…" : "↻ Refresh plan"}
              </button>
            </div>

            {/* Daily progress bar */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Today's progress</p>
                <p className="text-sm font-bold text-teal-600 dark:text-teal-400">{progress}%</p>
              </div>
              <div className="h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-teal-500 rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {checked.filter(Boolean).length} of {plan.daily_goals.length} daily goals completed
              </p>
            </div>

            {/* Daily goals */}
            <div>
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-3">
                Daily goals
              </h2>
              <div className="space-y-3">
                {plan.daily_goals.map((goal, i) => (
                  <div
                    key={i}
                    onClick={() => setChecked((prev) => { const n = [...prev]; n[i] = !n[i]; return n; })}
                    className={`cursor-pointer bg-white dark:bg-gray-800 rounded-2xl border p-5 transition-all
                      ${checked[i]
                        ? "border-teal-300 dark:border-teal-600 bg-teal-50/40 dark:bg-teal-900/10"
                        : "border-gray-200 dark:border-gray-700 hover:border-teal-300"}`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`mt-0.5 w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors
                        ${checked[i] ? "bg-teal-500 border-teal-500 text-white" : "border-gray-300 dark:border-gray-600"}`}>
                        {checked[i] && <span className="text-xs">✓</span>}
                      </div>
                      <div>
                        <p className={`text-sm font-medium leading-snug ${checked[i] ? "line-through text-gray-400" : "text-gray-800 dark:text-gray-200"}`}>
                          {goal.goal}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 leading-relaxed">
                          {goal.rationale}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Weekly milestones */}
            <div>
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-3">
                Weekly milestones
              </h2>
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 space-y-3">
                {plan.weekly_milestones.map((m, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="mt-0.5 w-5 h-5 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 flex items-center justify-center text-xs shrink-0 font-bold">
                      {i + 1}
                    </span>
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-snug">{m}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Tips */}
            <div>
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-3">
                Personalised tips
              </h2>
              <div className="space-y-3">
                {plan.tips.map((tip, i) => (
                  <div key={i} className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-2xl p-4 flex items-start gap-3">
                    <span className="text-lg shrink-0">💡</span>
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{tip}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Daily check-in */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-3">
                Daily focus check-in
              </h2>
              {checkinSent ? (
                <div className="text-emerald-600 dark:text-emerald-400 text-sm font-medium">
                  ✓ Focus quality logged. Keep it up!
                </div>
              ) : (
                <>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                    How focused did you feel today? (1 = very scattered, 5 = deeply focused)
                  </p>
                  <div className="flex gap-3 mb-4">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        onClick={() => setCheckinScore(n)}
                        className={`flex-1 py-3 rounded-xl text-sm font-bold border-2 transition-all
                          ${checkinScore === n
                            ? "bg-teal-600 border-teal-600 text-white"
                            : "border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-teal-400"}`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={checkinNote}
                    onChange={(e) => setCheckinNote(e.target.value)}
                    placeholder="Optional note…"
                    rows={2}
                    className="w-full text-sm p-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200 placeholder-gray-400 resize-none focus:outline-none focus:border-teal-400 mb-3"
                  />
                  {checkinError && (
                    <p className="text-red-500 text-xs mb-2">{checkinError}</p>
                  )}
                  <button
                    onClick={handleCheckin}
                    disabled={checkinScore === null}
                    className="w-full py-3 bg-teal-600 hover:bg-teal-700 disabled:opacity-40 text-white rounded-xl text-sm font-semibold transition-colors"
                  >
                    Log focus quality
                  </button>
                </>
              )}
            </div>

            <div className="flex justify-center pb-4">
              <Link
                href="/wellbeing"
                className="text-sm text-teal-600 dark:text-teal-400 hover:underline"
              >
                ← Back to dashboard
              </Link>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
