"use client";

import { useState } from "react";
import axios from "axios";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
} from "recharts";

export default function ComparePage() {
  const [videoA, setVideoA] = useState<File | null>(null);
  const [videoB, setVideoB] = useState<File | null>(null);

  const [resultA, setResultA] = useState<any>(null);
  const [resultB, setResultB] = useState<any>(null);

  const [loading, setLoading] = useState(false);

  const analyzeVideo = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await axios.post(
      "http://127.0.0.1:8000/analyze",
      formData,
      { headers: { "Content-Type": "multipart/form-data" } }
    );

    return response.data;
  };

  const handleCompare = async () => {
    if (!videoA || !videoB) {
      alert("Please upload both videos");
      return;
    }

    try {
      setLoading(true);

      const [resA, resB] = await Promise.all([
        analyzeVideo(videoA),
        analyzeVideo(videoB),
      ]);

      setResultA(resA);
      setResultB(resB);
    } catch (error) {
      console.error("Comparison failed:", error);
      alert("Error analyzing videos");
    } finally {
      setLoading(false);
    }
  };

  const modalityComparison =
    resultA && resultB
      ? [
          {
            name: "Visual",
            videoA: resultA.visual.visual_score,
            videoB: resultB.visual.visual_score,
          },
          {
            name: "Audio",
            videoA: resultA.audio.audio_afi_score,
            videoB: resultB.audio.audio_afi_score,
          },
          {
            name: "Text",
            videoA: resultA.text.text_afi_score,
            videoB: resultB.text.text_afi_score,
          },
        ]
      : [];

  const timelineComparison =
    resultA && resultB
      ? Array.from(
          {
            length: Math.max(
              resultA.visual.timeline.length,
              resultB.visual.timeline.length
            ),
          },
          (_, i) => ({
            time:
              resultA.visual.timeline[i]?.start ??
              resultB.visual.timeline[i]?.start ??
              i,

            videoA: resultA.visual.timeline[i]?.avg_motion ?? null,
            videoB: resultB.visual.timeline[i]?.avg_motion ?? null,
          })
        )
      : [];

  const comparisonInsight =
    resultA && resultB
      ? (() => {
          const diff =
            resultB.final.final_afi_score - resultA.final.final_afi_score;

          const percent = Math.abs(
            (diff / resultA.final.final_afi_score) * 100
          ).toFixed(1);

          if (diff > 0) {
            return `Video B is ${percent}% more attention-stimulating than Video A.`;
          } else if (diff < 0) {
            return `Video A is ${percent}% more attention-stimulating than Video B.`;
          } else {
            return "Both videos have similar attention fragmentation levels.";
          }
        })()
      : null;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-10">
      <h1 className="text-3xl font-bold">
        Compare Video Attention Fragmentation
      </h1>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow">
          <h2 className="font-semibold mb-3">Video A</h2>
          <input
            type="file"
            accept="video/*"
            onChange={(e) => setVideoA(e.target.files?.[0] || null)}
          />
        </div>

        <div className="bg-white p-6 rounded-xl shadow">
          <h2 className="font-semibold mb-3">Video B</h2>
          <input
            type="file"
            accept="video/*"
            onChange={(e) => setVideoB(e.target.files?.[0] || null)}
          />
        </div>
      </div>

      <button
        onClick={handleCompare}
        disabled={loading}
        className="px-6 py-2 bg-black text-white rounded-lg"
      >
        {loading ? "Analyzing Videos..." : "Compare Videos"}
      </button>

      {resultA && resultB && (
        <>
          {/* AFI SCORE CARDS */}

          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl shadow">
              <h2 className="font-semibold">Video A AFI</h2>
              <p className="text-4xl font-bold">
                {resultA.final.final_afi_score}
              </p>
              <p className="mt-2 text-lg">
                {resultA.final.final_category}
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow">
              <h2 className="font-semibold">Video B AFI</h2>
              <p className="text-4xl font-bold">
                {resultB.final.final_afi_score}
              </p>
              <p className="mt-2 text-lg">
                {resultB.final.final_category}
              </p>
            </div>
          </div>

          {/* AI INSIGHT */}

          {comparisonInsight && (
            <div className="bg-blue-50 border border-blue-200 p-6 rounded-xl">
              <h2 className="font-semibold text-lg mb-2">Insight</h2>
              <p className="text-gray-700">{comparisonInsight}</p>
            </div>
          )}

          {/* MODALITY CHART */}

          <div className="bg-white p-6 rounded-xl shadow">
            <h2 className="font-semibold mb-4">Modality Comparison</h2>

            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={modalityComparison}>
                <CartesianGrid strokeDasharray="3 3" />

                <XAxis
                  dataKey="name"
                  label={{
                    value: "Stimulus Type (Visual / Audio / Text)",
                    position: "insideBottom",
                    offset: -5,
                  }}
                />

                <YAxis
                  label={{
                    value: "Normalized AFI Score",
                    angle: -90,
                    position: "insideLeft",
                  }}
                />

                <Tooltip />
                <Legend />

                <Bar dataKey="videoA" fill="#2563eb" name="Video A" />
                <Bar dataKey="videoB" fill="#dc2626" name="Video B" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* TIMELINE CHART */}

          <div className="bg-white p-6 rounded-xl shadow">
            <h2 className="font-semibold mb-4">
              Stimulation Timeline Comparison
            </h2>

            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={timelineComparison}>
                <CartesianGrid strokeDasharray="3 3" />

                <XAxis
                  dataKey="time"
                  tickFormatter={(v) => Number(v).toFixed(1)}
                  label={{
                    value: "Video Time (seconds)",
                    position: "insideBottom",
                    offset: -5,
                  }}
                />

                <YAxis
                  label={{
                    value: "Motion Intensity",
                    angle: -90,
                    position: "insideLeft",
                  }}
                />

                <Tooltip />
                <Legend />

                <Line
                  type="monotone"
                  dataKey="videoA"
                  stroke="#2563eb"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                  connectNulls
                  name="Video A"
                />

                <Line
                  type="monotone"
                  dataKey="videoB"
                  stroke="#dc2626"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                  connectNulls
                  name="Video B"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}