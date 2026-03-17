"use client";

import { useState } from "react";

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleSubmit = async () => {
    if (!file && !url) {
      alert("Upload a file or paste a URL");
      return;
    }

    const formData = new FormData();

    if (file) {
      formData.append("video", file);
    } else {
      formData.append("url", url);
    }

    try {
      setLoading(true);

      const res = await fetch("http://localhost:8000/analyze", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      setResult(data);
    } catch (err) {
      console.error(err);
      alert("Error analyzing video");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto mt-10 space-y-6">
      <h1 className="text-3xl font-bold text-center">Analyze Video</h1>

      {/* Upload Box */}
      <div className="bg-white text-black p-6 rounded-xl shadow-lg space-y-4">
        <div>
          <label className="block mb-2 font-medium">Upload File</label>
          <input
            type="file"
            className="w-full border p-2 rounded"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
        </div>

        <div className="text-center text-gray-500">OR</div>

        <div>
          <label className="block mb-2 font-medium">
            Paste Video URL
          </label>
          <input
            type="text"
            placeholder="https://youtube.com/shorts/..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full border p-2 rounded"
          />
        </div>

        <button
          onClick={handleSubmit}
          className="w-full bg-green-500 text-black font-semibold py-2 rounded hover:bg-green-600 transition"
        >
          {loading ? "Analyzing..." : "Analyze"}
        </button>
      </div>

      {/* Result */}
      {result && (
        <div className="bg-gray-900 p-6 rounded-xl space-y-2">
          <h2 className="text-xl font-semibold">Result</h2>
          <p>AFI Score: {result.afi_score}</p>
          <p>Visual: {result.visual_score}</p>
          <p>Audio: {result.audio_score}</p>
          <p>Text: {result.text_score}</p>
        </div>
      )}
    </div>
  );
}