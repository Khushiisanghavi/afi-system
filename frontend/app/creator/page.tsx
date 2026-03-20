"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

interface CreatorHistoryItem {
  id: number;
  video_name: string | null;
  captivation_score: number;
  captivation_category: string;
  trend_match_score: number;
  created_at: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  "Very High": "bg-emerald-100 text-emerald-800",
  High: "bg-blue-100 text-blue-800",
  Medium: "bg-yellow-100 text-yellow-800",
  Low: "bg-red-100 text-red-800",
};

export default function CreatorStudioPage() {
  const [history, setHistory] = useState<CreatorHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { setLoading(false); return; }
    fetch("http://localhost:8000/creator/history", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => setHistory(Array.isArray(data) ? data : []))
      .catch(() => setHistory([]))
      .finally(() => setLoading(false));
  }, []);

  const avgCaptivation =
    history.length > 0
      ? (history.reduce((s, h) => s + h.captivation_score, 0) / history.length).toFixed(1)
      : null;
  const best = history.length > 0
    ? history.reduce((a, b) => (a.captivation_score > b.captivation_score ? a : b))
    : null;

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                  Creator Studio
                </span>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Improve Your Content
              </h1>
              <p className="mt-2 text-gray-500 dark:text-gray-400 max-w-lg">
                Upload a video to find out how captivating it is, how it matches
                current platform trends, and exactly what to change to improve it.
              </p>
            </div>
            <Link
              href="/creator/upload"
              className="shrink-0 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold transition-colors"
            >
              Analyze a video →
            </Link>
          </div>

          {/* Stats row */}
          {history.length > 0 && (
            <div className="mt-8 grid grid-cols-3 gap-4">
              <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Videos analyzed
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {history.length}
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Avg captivation
                </p>
                <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">
                  {avgCaptivation ?? "—"}
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Best performing
                </p>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mt-1 truncate">
                  {best ? (best.video_name || "Untitled") : "—"}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recent analyses */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
          Recent analyses
        </h2>

        {loading ? (
          <p className="text-gray-400">Loading…</p>
        ) : history.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-600 p-12 text-center">
            <p className="text-gray-400 dark:text-gray-500 text-sm">
              No analyses yet. Upload your first video to get started.
            </p>
            <Link
              href="/creator/upload"
              className="mt-4 inline-block px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
            >
              Upload video
            </Link>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-750 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-5 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Video</th>
                  <th className="px-5 py-3 text-right font-medium text-gray-500 dark:text-gray-400">Captivation</th>
                  <th className="px-5 py-3 text-center font-medium text-gray-500 dark:text-gray-400">Category</th>
                  <th className="px-5 py-3 text-right font-medium text-gray-500 dark:text-gray-400">Trend match</th>
                  <th className="px-5 py-3 text-right font-medium text-gray-500 dark:text-gray-400">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {history.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                    <td className="px-5 py-3 text-gray-800 dark:text-gray-200 truncate max-w-xs">
                      {item.video_name || "Untitled"}
                    </td>
                    <td className="px-5 py-3 text-right font-semibold text-indigo-600 dark:text-indigo-400">
                      {item.captivation_score.toFixed(1)}
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${CATEGORY_COLORS[item.captivation_category] || "bg-gray-100 text-gray-700"}`}>
                        {item.captivation_category}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right text-gray-600 dark:text-gray-400">
                      {item.trend_match_score.toFixed(0)}%
                    </td>
                    <td className="px-5 py-3 text-right text-gray-400 dark:text-gray-500 text-xs">
                      {new Date(item.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
