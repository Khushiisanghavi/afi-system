"use client";

import { useEffect, useState } from "react";
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
} from "recharts";

export default function ResultsPage() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const stored = localStorage.getItem("afiResult");
    if (stored) {
      setData(JSON.parse(stored));
    }
  }, []);

  if (!data) {
    return <div className="p-6">No analysis data found.</div>;
  }

  const category = data.final.final_category;

const categoryStyles: any = {
  Calm: "bg-green-100 text-green-700 border-green-300",
  Moderate: "bg-yellow-100 text-yellow-700 border-yellow-300",
  High: "bg-orange-100 text-orange-700 border-orange-300",
  Overstimulating: "bg-red-100 text-red-700 border-red-300",
};

  const modalityData = [
    { name: "Visual", score: data.visual.visual_score },
    { name: "Audio", score: data.audio.audio_afi_score },
    { name: "Text", score: data.text.text_afi_score },
  ];

  const timelineData = data.visual.timeline?.map(
    (scene: any, index: number) => ({
      scene: index + 1,
      score: scene.avg_motion,
      start: scene.start,
      end: scene.end,
    })
  );

  // 🔥 Detect peak stimulation
  const peakScene = timelineData.reduce(
    (max: any, s: any) => (s.score > max.score ? s : max),
    timelineData[0]
  );

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-10">
      <h1 className="text-3xl font-bold">AFI Analysis Results</h1>

      {/* FINAL SCORE CARD */}
      <div className="bg-white p-6 rounded-2xl shadow-md">
  <h2 className="text-xl font-semibold">Final Score</h2>

  <p className={`text-5xl font-bold mt-4 ${categoryStyles[category]}`}>
    {data.final.final_afi_score}
  </p>

  <span
    className={`inline-block mt-3 px-4 py-1 rounded-full border text-sm font-semibold ${categoryStyles[category]}`}
  >
    {category}
  </span>
</div>

      {/* MODALITY BREAKDOWN */}
      <div className="bg-white p-6 rounded-2xl shadow-md">
        <h2 className="text-xl font-semibold mb-4">
          Modality Breakdown
        </h2>

        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={modalityData}>
            <CartesianGrid strokeDasharray="3 3" />

            <XAxis
              dataKey="name"
              label={{
                value: "Modality Type",
                position: "insideBottom",
                offset: -5,
              }}
            />

            <YAxis
              label={{
                value: "Normalized Score",
                angle: -90,
                position: "insideLeft",
              }}
            />

            <Tooltip />

            <Bar dataKey="score" fill="#2563eb" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* TIMELINE GRAPH */}
      {timelineData && (
        <div className="bg-white p-6 rounded-2xl shadow-md">
          <h2 className="text-xl font-semibold mb-4">
            Stimulation Timeline
          </h2>

          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={timelineData}>
              <CartesianGrid strokeDasharray="3 3" />

              <XAxis
                dataKey="scene"
                label={{
                  value: "Scene Index",
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

              <Line
                type="monotone"
                dataKey="score"
                stroke="#dc2626"
                strokeWidth={3}
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>

          {/* 🔥 Peak stimulation insight */}
          <div className="mt-4 p-4 bg-red-50 rounded-lg border border-red-200">
            <p className="font-semibold text-red-700">
              Peak Stimulation Detected
            </p>

            <p className="text-sm text-red-600 mt-1">
              Scene {peakScene.scene} shows the highest stimulation level
              (motion intensity: {peakScene.score.toFixed(2)})
            </p>

            <p className="text-sm text-red-600">
              Occurs between {peakScene.start.toFixed(2)}s and{" "}
              {peakScene.end.toFixed(2)}s in the video.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}