"use client";
import Link from "next/link";
import { useState } from "react";

export default function ExtensionPage() {
  const [activeTab, setActiveTab] = useState<"desktop" | "mobile">("desktop");

  return (
    <div style={{ position: "relative", zIndex: 1, minHeight: "100vh" }}>
      {/* Background glow */}
      <div style={{
        position: "fixed",
        width: "60vw", height: "60vw",
        top: "30%", left: "50%",
        transform: "translate(-50%, -50%)",
        background: "radial-gradient(ellipse, rgba(253, 224, 71, 0.04) 0%, transparent 60%)",
        pointerEvents: "none", zIndex: 0,
      }} />

      <div className="container-section" style={{ maxWidth: "56rem", display: "flex", flexDirection: "column", gap: "2rem", position: "relative", zIndex: 1 }}>
        
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "1rem" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.25rem" }}>
            <span style={{
              fontFamily: "monospace", fontSize: "0.65rem", letterSpacing: "0.2em",
              textTransform: "uppercase", color: "#fde047",
              background: "rgba(253,224,71,0.06)", border: "1px solid rgba(253,224,71,0.2)",
              padding: "0.25rem 0.6rem", borderRadius: "4px",
            }}>AFI Extension</span>
          </div>
          <h1 className="display-font" style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)", fontWeight: 600, letterSpacing: "-0.02em", color: "#ffffff", marginBottom: "0.75rem", lineHeight: 1.1 }}>
            Monitor your attention <br/> in real-time.
          </h1>
          <p className="sans" style={{ color: "rgba(232,232,240,0.5)", fontSize: "1rem", maxWidth: "36rem", margin: "0 auto", lineHeight: 1.6 }}>
            Get real-time feedback and wellbeing nudges while you watch short-form content. Choose your platform below to get started.
          </p>
        </div>

        {/* Device toggle */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "1rem" }}>
          <div style={{ 
            display: "inline-flex", background: "rgba(255,255,255,0.03)", 
            padding: "0.3rem", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.08)" 
          }}>
            <button
              onClick={() => setActiveTab("desktop")}
              className="sans"
              style={{
                background: activeTab === "desktop" ? "rgba(253,224,71,0.15)" : "transparent",
                color: activeTab === "desktop" ? "#fde047" : "rgba(232,232,240,0.5)",
                border: "none", borderRadius: "6px", padding: "0.6rem 1.5rem",
                fontSize: "0.85rem", fontWeight: 600, cursor: "pointer", transition: "all 0.2s ease"
              }}
            >
              Desktop Chrome
            </button>
            <button
              onClick={() => setActiveTab("mobile")}
              className="sans"
              style={{
                background: activeTab === "mobile" ? "rgba(253,224,71,0.15)" : "transparent",
                color: activeTab === "mobile" ? "#fde047" : "rgba(232,232,240,0.5)",
                border: "none", borderRadius: "6px", padding: "0.6rem 1.5rem",
                fontSize: "0.85rem", fontWeight: 600, cursor: "pointer", transition: "all 0.2s ease"
              }}
            >
              iOS / Android
            </button>
          </div>
        </div>

        {/* Content based on tab */}
        {activeTab === "desktop" && (
          <div className="anim-fade-in card-glass" style={{ padding: "2.5rem" }}>
            <h2 className="sans" style={{ fontSize: "1.25rem", fontWeight: 600, color: "#ffffff", marginBottom: "1.5rem" }}>
              Install on Google Chrome
            </h2>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
              
              <div style={{ display: "flex", gap: "1rem" }}>
                <div style={{ width: "2rem", height: "2rem", borderRadius: "50%", background: "rgba(253,224,71,0.1)", border: "1px solid rgba(253,224,71,0.3)", color: "#fde047", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "monospace", flexShrink: 0 }}>1</div>
                <div>
                  <h3 className="sans" style={{ fontSize: "0.95rem", color: "#ffffff", fontWeight: 600, marginBottom: "0.5rem" }}>Download the Extension</h3>
                  <p className="sans" style={{ fontSize: "0.85rem", color: "rgba(232,232,240,0.5)", marginBottom: "1rem", lineHeight: 1.6 }}>Download the plugin bundle to your computer. It contains the lightweight code that securely talks to the AFI Dashboard.</p>
                  <a href="/afi-extension.zip" download className="btn-primary" style={{ background: "#fde047", color: "#05050f", borderColor: "#fde047", boxShadow: "0 4px 16px rgba(253,224,71,0.25)" }}>
                    Download afi-extension.zip
                  </a>
                </div>
              </div>

              <div style={{ width: "100%", height: "1px", background: "rgba(255,255,255,0.06)" }} />

              <div style={{ display: "flex", gap: "1rem" }}>
                <div style={{ width: "2rem", height: "2rem", borderRadius: "50%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "monospace", flexShrink: 0 }}>2</div>
                <div>
                  <h3 className="sans" style={{ fontSize: "0.95rem", color: "#ffffff", fontWeight: 600, marginBottom: "0.5rem" }}>Load into Chrome</h3>
                  <p className="sans" style={{ fontSize: "0.85rem", color: "rgba(232,232,240,0.5)", lineHeight: 1.6, marginBottom: "0.75rem" }}>
                    1. Unzip the downloaded folder.<br/>
                    2. In Chrome, go to <span className="mono" style={{ padding: "0.15rem 0.4rem", background: "rgba(255,255,255,0.05)", borderRadius: "4px", userSelect: "all" }}>chrome://extensions/</span><br/>
                    3. Turn on <strong>Developer mode</strong> in the top-right corner.<br/>
                    4. Click <strong>Load unpacked</strong> and select the unzipped <span className="mono">extension</span> folder.
                  </p>
                </div>
              </div>

              <div style={{ width: "100%", height: "1px", background: "rgba(255,255,255,0.06)" }} />

              <div style={{ display: "flex", gap: "1rem" }}>
                <div style={{ width: "2rem", height: "2rem", borderRadius: "50%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "monospace", flexShrink: 0 }}>3</div>
                <div>
                  <h3 className="sans" style={{ fontSize: "0.95rem", color: "#ffffff", fontWeight: 600, marginBottom: "0.5rem" }}>Start Surfing</h3>
                  <p className="sans" style={{ fontSize: "0.85rem", color: "rgba(232,232,240,0.5)", lineHeight: 1.6 }}>
                    Visit YouTube Shorts, TikTok, or Instagram Reels. The AFI monitor will automatically appear in the top right corner of the video. Make sure to click the extension icon to connect your dashboard account!
                  </p>
                  <div style={{ marginTop: "1rem" }}>
                    <Link href="/wellbeing" className="sans" style={{ fontSize: "0.85rem", color: "#a78bfa", textDecoration: "none" }}>Open Dashboard →</Link>
                  </div>
                </div>
              </div>
              
            </div>
          </div>
        )}

        {activeTab === "mobile" && (
          <div className="anim-fade-in card-glass" style={{ padding: "2.5rem" }}>
            <h2 className="sans" style={{ fontSize: "1.25rem", fontWeight: 600, color: "#ffffff", marginBottom: "1rem" }}>
              Mobile Device Instructions
            </h2>
            <p className="sans" style={{ fontSize: "0.95rem", color: "rgba(248,113,113,0.9)", background: "rgba(248,113,113,0.05)", padding: "1rem", borderRadius: "8px", border: "1px solid rgba(248,113,113,0.2)", marginBottom: "2rem", lineHeight: 1.5 }}>
              Browser extensions cannot run in the background on mobile apps like TikTok, Instagram, or YouTube due to Apple and Google sandboxing restrictions.
            </p>
            
            <h3 className="sans" style={{ fontSize: "1rem", fontWeight: 600, color: "#ffffff", marginBottom: "0.75rem" }}>
              How to check content on your phone:
            </h3>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", marginBottom: "2rem" }}>
              <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                <div style={{ width: "2.5rem", height: "2.5rem", borderRadius: "8px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem", flexShrink: 0 }}>🔗</div>
                <p className="sans" style={{ fontSize: "0.9rem", color: "rgba(232,232,240,0.7)", lineHeight: 1.5 }}><strong>Copy the link</strong> to the video you want to check directly from your app (Share {'>'} Copy Link).</p>
              </div>
              <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                <div style={{ width: "2.5rem", height: "2.5rem", borderRadius: "8px", background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem", flexShrink: 0 }}>📱</div>
                <p className="sans" style={{ fontSize: "0.9rem", color: "rgba(232,232,240,0.7)", lineHeight: 1.5 }}><strong>Open this Dashboard</strong> on your phone browser. It's fully optimized for mobile.</p>
              </div>
              <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                <div style={{ width: "2.5rem", height: "2.5rem", borderRadius: "8px", background: "rgba(253,224,71,0.1)", border: "1px solid rgba(253,224,71,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem", flexShrink: 0 }}>📊</div>
                <p className="sans" style={{ fontSize: "0.9rem", color: "rgba(232,232,240,0.7)", lineHeight: 1.5 }}><strong>Paste the link</strong> into the analyzer to instantly get the AFI score and update your profile.</p>
              </div>
            </div>

            <div style={{ textAlign: "center", marginTop: "1rem" }}>
              <Link href="/" className="btn-primary" style={{ width: "100%", maxWidth: "20rem" }}>
                Go to Analyzer
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
