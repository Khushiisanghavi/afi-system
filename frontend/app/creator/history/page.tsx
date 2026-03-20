"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

interface Item {
  id: number;
  video_name: string | null;
  captivation_score: number;
  captivation_category: string;
  trend_match_score: number;
  created_at: string;
}

const CAT_COLORS: Record<string, string> = {
  "Very High": "bg-emerald-100 text-emerald-700",
  High:        "bg-blue-100 text-blue-700",
  Medium:      "bg-yellow-100 text-yellow-700",
  Low:         "bg-red-100 text-red-700",
};

export default function CreatorHistoryPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { setLoading(false); return; }
    fetch("http://localhost:8000/creator/history", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => setItems(Array.isArray(d) ? d : []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  // Sparkline data (last 10 scores for mini chart)
  const sparkScores = [...items].reverse().slice(-10).map((i) => i.captivation_score);
  const sparkMax = Math.max(...sparkScores, 1);
  const sparkMin = Math.min(...sparkScores, 0);

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="text-xs text-gray-400 mb-1">
              <Link href="/creator" className="hover:text-indigo-600">Creator Studio</Link> / History
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">All analyses</h1>
          </div>
          <Link
            href="/creator/upload"
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors"
          >
            + New analysis
          </Link>
        </div>

        {/* Sparkline trend */}
        {sparkScores.length >= 3 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 mb-6">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-3">Captivation trend (last {sparkScores.length})</p>
            <svg width="100%" height="60" viewBox={`0 0 ${sparkScores.length * 60} 60`} preserveAspectRatio="none">
              <polyline
                fill="none"
                stroke="#6366f1"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={sparkScores
                  .map((s, i) => {
                    const x = i * 60 + 30;
                    const y = 55 - ((s - sparkMin) / (sparkMax - sparkMin + 1)) * 50;
                    return `${x},${y}`;
                  })
                  .join(" ")}
              />
              {sparkScores.map((s, i) => (
                <circle
                  key={i}
                  cx={i * 60 + 30}
                  cy={55 - ((s - sparkMin) / (sparkMax - sparkMin + 1)) * 50}
                  r="4"
                  fill="#6366f1"
                />
              ))}
            </svg>
          </div>
        )}

        {/* Table */}
        {loading ? (
          <p className="text-gray-400">Loading…</p>
        ) : items.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-600 p-12 text-center">
            <p className="text-gray-400 text-sm">No analyses yet.</p>
            <Link href="/creator/upload" className="mt-4 inline-block px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700">
              Analyze your first video
            </Link>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-750 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-5 py-3 text-left font-medium text-gray-500">#</th>
                  <th className="px-5 py-3 text-left font-medium text-gray-500">Video</th>
                  <th className="px-5 py-3 text-right font-medium text-gray-500">Captivation</th>
                  <th className="px-5 py-3 text-center font-medium text-gray-500">Category</th>
                  <th className="px-5 py-3 text-right font-medium text-gray-500">Trend match</th>
                  <th className="px-5 py-3 text-right font-medium text-gray-500">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {items.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                    <td className="px-5 py-3 text-gray-400">{idx + 1}</td>
                    <td className="px-5 py-3 text-gray-800 dark:text-gray-200 max-w-xs truncate">
                      {item.video_name || "Untitled"}
                    </td>
                    <td className="px-5 py-3 text-right font-semibold text-indigo-600 dark:text-indigo-400">
                      {item.captivation_score.toFixed(1)}
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${CAT_COLORS[item.captivation_category] || "bg-gray-100 text-gray-700"}`}>
                        {item.captivation_category}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right text-gray-600 dark:text-gray-400">
                      {item.trend_match_score.toFixed(0)}%
                    </td>
                    <td className="px-5 py-3 text-right text-xs text-gray-400">
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
