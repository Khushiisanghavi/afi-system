"use client";
import { useState, useRef, DragEvent } from "react";
import { useRouter } from "next/navigation";

const STAGES = [
  "Uploading video…",
  "Running AFI analysis…",
  "Computing captivation score…",
  "Matching against trend profiles…",
  "Generating recommendations…",
];

export default function CreatorUploadPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [stageIdx, setStageIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) setFile(dropped);
  }

  async function handleAnalyze() {
    if (!file) return;
    const token = localStorage.getItem("token");
    if (!token) {
      setError("You must be logged in to use Creator Studio. Please sign in first.");
      return;
    }
    setUploading(true);
    setError(null);

    let idx = 0;
    const interval = setInterval(() => {
      idx = Math.min(idx + 1, STAGES.length - 1);
      setStageIdx(idx);
    }, 2000);

    try {
      const form = new FormData();
      form.append("file", file);

      const res = await fetch("http://localhost:8000/creator/analyze", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });

      clearInterval(interval);

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Analysis failed" }));
        throw new Error(err.detail || "Analysis failed");
      }

      const data = await res.json();
      localStorage.setItem("creatorResult", JSON.stringify(data));
      if (data.video_path) localStorage.setItem("lastVideoPath", data.video_path);
      router.push("/creator/results");
    } catch (e: unknown) {
      clearInterval(interval);
      setUploading(false);
      setStageIdx(0);
      setError(e instanceof Error ? e.message : "Unknown error occurred");
    }
  }

  return (
    <div className="container-section" style={{ display: "flex", flexDirection: "column", gap: "1.5rem", maxWidth: "640px" }}>

      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.7rem", fontFamily: "monospace", color: "var(--muted)" }}>
        <a href="/creator" style={{ color: "var(--muted)", textDecoration: "none" }}>Creator Studio</a>
        <span>/</span>
        <span style={{ color: "var(--foreground)" }}>Upload</span>
      </div>

      {/* Header */}
      <div>
        <h1 className="display-font" style={{ fontSize: "clamp(1.8rem, 4vw, 2.75rem)", fontWeight: 600, letterSpacing: "-0.02em", marginBottom: "0.35rem", color: "#ffffff" }}>
          Analyze your video
        </h1>
        <p className="sans" style={{ color: "var(--muted-mid)", fontSize: "0.95rem" }}>
          Upload a video to get your captivation score and improvement recommendations.
        </p>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => !uploading && inputRef.current?.click()}
        className="card-glass"
        style={{
          padding: "3rem 2rem",
          textAlign: "center",
          cursor: uploading ? "default" : "pointer",
          border: dragging
            ? "1.5px dashed #a78bfa"
            : "1.5px dashed rgba(167,139,250,0.25)",
          background: dragging ? "rgba(167,139,250,0.06)" : undefined,
          transition: "all 0.2s ease",
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="video/*"
          style={{ display: "none" }}
          onChange={(e) => e.target.files?.[0] && setFile(e.target.files[0])}
        />

        {file ? (
          <div>
            <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>🎬</div>
            <p className="sans" style={{ fontWeight: 600, color: "#a78bfa", fontSize: "1rem", marginBottom: "0.25rem" }}>
              {file.name}
            </p>
            <p className="sans" style={{ color: "var(--muted)", fontSize: "0.85rem" }}>
              {(file.size / 1024 / 1024).toFixed(1)} MB
            </p>
            {!uploading && (
              <p className="sans" style={{ color: "var(--muted)", fontSize: "0.78rem", marginTop: "0.75rem" }}>
                Click to choose a different file
              </p>
            )}
          </div>
        ) : (
          <div>
            <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>📁</div>
            <p className="sans" style={{ fontWeight: 600, color: "#ffffff", fontSize: "1rem", marginBottom: "0.4rem" }}>
              Drop your video here, or click to browse
            </p>
            <p className="sans" style={{ color: "var(--muted)", fontSize: "0.82rem" }}>
              MP4, MOV, AVI, WebM supported
            </p>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="card-glass" style={{ padding: "1rem 1.25rem", borderColor: "rgba(248,113,113,0.3)", background: "rgba(248,113,113,0.06)" }}>
          <p className="sans" style={{ color: "#f87171", fontSize: "0.9rem" }}>{error}</p>
          {error.includes("logged in") && (
            <a href="/login" className="sans" style={{ color: "#a78bfa", fontSize: "0.85rem", marginTop: "0.5rem", display: "inline-block" }}>
              Go to login →
            </a>
          )}
        </div>
      )}

      {/* Progress stages */}
      {uploading && (
        <div className="card-glass" style={{ padding: "1.5rem" }}>
          <p className="sans" style={{ color: "var(--muted-mid)", fontSize: "0.8rem", marginBottom: "1rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Processing
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {STAGES.map((stage, i) => (
              <div key={stage} style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div style={{
                  width: "1.5rem", height: "1.5rem", borderRadius: "50%", flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "0.7rem", fontWeight: 700,
                  background: i < stageIdx
                    ? "rgba(52,211,153,0.2)"
                    : i === stageIdx
                    ? "rgba(167,139,250,0.2)"
                    : "rgba(255,255,255,0.05)",
                  border: i < stageIdx
                    ? "1px solid rgba(52,211,153,0.4)"
                    : i === stageIdx
                    ? "1px solid rgba(167,139,250,0.5)"
                    : "1px solid rgba(255,255,255,0.08)",
                  color: i < stageIdx ? "#34d399" : i === stageIdx ? "#a78bfa" : "var(--muted)",
                }}>
                  {i < stageIdx ? "✓" : i + 1}
                </div>
                <span className="sans" style={{
                  fontSize: "0.9rem",
                  color: i === stageIdx ? "#ffffff" : i < stageIdx ? "#34d399" : "var(--muted)",
                  fontWeight: i === stageIdx ? 600 : 400,
                }}>
                  {stage}
                </span>
                {i === stageIdx && (
                  <span className="spinner" style={{
                    marginLeft: "auto",
                    width: "1rem", height: "1rem",
                    borderColor: "rgba(167,139,250,0.2)",
                    borderTopColor: "#a78bfa",
                  }} />
                )}
              </div>
            ))}
          </div>
          <p className="sans" style={{ color: "var(--muted)", fontSize: "0.78rem", marginTop: "1.25rem" }}>
            Analysis takes 30–90 seconds depending on video length.
          </p>
        </div>
      )}

      {/* Actions */}
      {!uploading && (
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <a
            href="/creator"
            className="btn-secondary"
            style={{ flex: 1, textAlign: "center", padding: "0.75rem", fontSize: "0.9rem", textDecoration: "none" }}
          >
            Cancel
          </a>
          <button
            onClick={handleAnalyze}
            disabled={!file}
            className="btn-primary"
            style={{
              flex: 2,
              padding: "0.75rem",
              fontSize: "0.9rem",
              opacity: file ? 1 : 0.4,
              cursor: file ? "pointer" : "not-allowed",
              border: "none",
            }}
          >
            Analyze video →
          </button>
        </div>
      )}
    </div>
  );
}
