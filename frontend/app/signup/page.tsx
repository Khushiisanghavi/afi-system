"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

function extractApiError(data: any, fallback = "Something went wrong"): string {
  const detail = data?.detail;
  if (!detail) return fallback;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail.map((e: any) => {
      const loc = Array.isArray(e.loc) ? e.loc : [];
      const field = loc.filter((s: any) => s !== "body").join(".");
      const msg = e.msg || String(e);
      return field ? `${field}: ${msg}` : msg;
    }).join("; ");
  }
  return String(detail);
}

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSignup = async () => {
    if (!name || !email || !password || !confirm) { setError("Please fill in all fields"); return; }
    if (password !== confirm) { setError("Passwords do not match"); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters"); return; }
    setError("");
    setLoading(true);
    try {
      const res = await fetch("http://localhost:8000/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(extractApiError(data, "Signup failed"));

      // Store token + user info
      localStorage.setItem("token", data.access_token);
      localStorage.setItem("user_id", data.user_id);
      localStorage.setItem("user_name", data.name);
      localStorage.setItem("user_email", data.email);

      router.push("/");
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: "relative", zIndex: 1, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>

      {/* Glow */}
      <div style={{
        position: "fixed",
        width: "60vw", height: "60vw",
        top: "40%", left: "50%",
        transform: "translate(-50%, -50%)",
        background: "radial-gradient(ellipse, rgba(167,139,250,0.07) 0%, rgba(129,140,248,0.03) 40%, transparent 70%)",
        pointerEvents: "none",
        zIndex: 0,
      }} />

      <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: "26rem" }}>

        {/* Back link */}
        <div className="anim-fade-up" style={{ marginBottom: "2rem", textAlign: "center" }}>
          <Link href="/" style={{ color: "rgba(232,232,240,0.4)", fontSize: "0.75rem", letterSpacing: "0.15em", textTransform: "uppercase", textDecoration: "none", fontFamily: "monospace" }}>
            ← Back to AFI
          </Link>
        </div>

        {/* Card */}
        <div className="anim-fade-up card-glass" style={{ padding: "2.75rem 2.5rem" }}>

          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: "2.25rem" }}>
            <div style={{
              width: "3rem", height: "3rem",
              borderRadius: "12px",
              background: "rgba(167, 139, 250, 0.1)",
              border: "1px solid rgba(167, 139, 250, 0.25)",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 1.25rem",
              fontSize: "1.2rem", color: "#a78bfa",
            }}>◆</div>
            <h1 className="display-font" style={{ fontSize: "1.75rem", fontWeight: 600, letterSpacing: "-0.02em", color: "#ffffff", marginBottom: "0.4rem" }}>
              Create account
            </h1>
            <p className="sans" style={{ color: "rgba(232,232,240,0.45)", fontSize: "0.875rem" }}>
              Start tracking your attention health
            </p>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              background: "rgba(248,113,113,0.08)",
              border: "1px solid rgba(248,113,113,0.25)",
              borderRadius: "8px",
              padding: "0.75rem 1rem",
              marginBottom: "1.25rem",
              color: "#f87171",
              fontSize: "0.825rem",
              fontFamily: "monospace",
            }}>
              {error}
            </div>
          )}

          {/* Fields */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "1.5rem" }}>
            <div>
              <label className="label-sm" style={{ display: "block", marginBottom: "0.5rem" }}>Name</label>
              <input
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-field"
                style={{ width: "100%" }}
              />
            </div>
            <div>
              <label className="label-sm" style={{ display: "block", marginBottom: "0.5rem" }}>Email</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                style={{ width: "100%" }}
              />
            </div>
            <div>
              <label className="label-sm" style={{ display: "block", marginBottom: "0.5rem" }}>Password</label>
              <input
                type="password"
                placeholder="Min. 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                style={{ width: "100%" }}
              />
            </div>
            <div>
              <label className="label-sm" style={{ display: "block", marginBottom: "0.5rem" }}>Confirm Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSignup()}
                className="input-field"
                style={{ width: "100%" }}
              />
            </div>
          </div>

          <button
            onClick={handleSignup}
            disabled={loading}
            className="btn-primary"
            style={{ width: "100%", marginBottom: "1.5rem" }}
          >
            {loading
              ? <span><span className="spinner" />Creating account...</span>
              : "Create Account →"
            }
          </button>

          <div style={{ textAlign: "center" }}>
            <span className="sans" style={{ color: "rgba(232,232,240,0.4)", fontSize: "0.85rem" }}>
              Already have an account?{" "}
            </span>
            <Link href="/login" style={{ color: "#a78bfa", fontSize: "0.85rem", textDecoration: "none", fontWeight: 500 }}>
              Sign in
            </Link>
          </div>
        </div>

        {/* Footer note */}
        <p className="anim-fade-up" style={{ textAlign: "center", color: "rgba(232,232,240,0.25)", fontSize: "0.72rem", letterSpacing: "0.08em", marginTop: "1.5rem", fontFamily: "monospace" }}>
          No ads · No tracking · Your data stays yours
        </p>
      </div>
    </div>
  );
}