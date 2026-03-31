// content.js

const COLORS = {
  "Calm": "#34d399",
  "Moderate": "#a78bfa",
  "High": "#fb923c",
  "Overstimulating": "#f87171"
};

let currentUrl = location.href;
let overlayWrapper = null;
let bannerWrapper = null;

// Ensure we only run detection on actual video playback pages
function isVideoPage() {
  const url = window.location.href;
  if (url.includes("youtube.com/shorts/") || url.includes("youtube.com/watch")) return true;
  if (url.includes("tiktok.com/") && url.includes("/video/")) return true;
  if (url.includes("instagram.com/p/") || url.includes("instagram.com/reels/")) return true;
  return false;
}

function extractCleanUrl() {
  // Removes query parameters like time offsets for cleaner analysis, unless it's youtube ?v=
  const url = new URL(window.location.href);
  if (url.hostname.includes("youtube.com") && url.pathname === "/watch") {
    return url.origin + url.pathname + "?v=" + url.searchParams.get("v");
  }
  return url.origin + url.pathname;
}

// ── Overlay Injection ─────────────────────────────────────────────────────────

function createOrUpdateOverlay(data) {
  if (!overlayWrapper) {
    overlayWrapper = document.createElement("div");
    overlayWrapper.className = "afi-overlay-pill";
    document.body.appendChild(overlayWrapper);
  }
  
  if (data === "loading") {
    overlayWrapper.innerHTML = `
      <span class="afi-dot" style="background: #999; animation: pulse 1s infinite;"></span>
      <span class="afi-score" style="color: #999;">Analyzing AFI...</span>
    `;
    return;
  }
  
  if (data === "error") {
    overlayWrapper.innerHTML = `
      <span class="afi-dot" style="background: #ef4444;"></span>
      <span class="afi-score" style="color: #ef4444;">Analysis Failed</span>
    `;
    setTimeout(() => {
      if (overlayWrapper) overlayWrapper.remove();
      overlayWrapper = null;
    }, 3000);
    return;
  }

  const categoryColor = COLORS[data.category] || COLORS["Moderate"];
  overlayWrapper.innerHTML = `
    <span class="afi-dot" style="background: ${categoryColor}; box-shadow: 0 0 8px ${categoryColor}80;"></span>
    <span class="afi-score" style="color: ${categoryColor}; font-weight: 700;">${data.category}</span>
    <span class="afi-score" style="color: rgba(255,255,255,0.6);">${Math.round(data.score)} AFI</span>
    <span class="afi-close" onclick="this.parentElement.style.display='none'">✕</span>
  `;
  overlayWrapper.style.display = "flex";
}

function showBreakBanner() {
  if (bannerWrapper) return;
  
  bannerWrapper = document.createElement("div");
  bannerWrapper.className = "afi-break-banner";
  bannerWrapper.innerHTML = `
    <div class="afi-break-banner-header">
      <span class="afi-icon">⚠️</span>
      <span class="afi-title">Attention Fatigue</span>
      <span class="afi-banner-close" onclick="this.parentElement.parentElement.remove()">✕</span>
    </div>
    <div class="afi-break-banner-text">
      You've watched 3 highly stimulating videos in a row. Consider taking a 5-minute break to recover your focus.
    </div>
  `;
  document.body.appendChild(bannerWrapper);
  
  // Auto dismiss after 10 seconds
  setTimeout(() => {
    if (bannerWrapper) {
      bannerWrapper.remove();
      bannerWrapper = null;
    }
  }, 10000);
}

function showTimeBreakBanner(minutes) {
  if (bannerWrapper) return;
  
  bannerWrapper = document.createElement("div");
  bannerWrapper.className = "afi-break-banner";
  bannerWrapper.innerHTML = `
    <div class="afi-break-banner-header">
      <span class="afi-icon">⏰</span>
      <span class="afi-title">Screen Time Break</span>
      <span class="afi-banner-close" onclick="this.parentElement.parentElement.remove()">✕</span>
    </div>
    <div class="afi-break-banner-text">
      You've been watching short-form content for over ${minutes} minutes. Take a moment to rest your eyes.
    </div>
  `;
  document.body.appendChild(bannerWrapper);
  
  setTimeout(() => {
    if (bannerWrapper) {
      bannerWrapper.remove();
      bannerWrapper = null;
    }
  }, 10000);
}

// ── Analytics Trigger ────────────────────────────────────────────────────────

function triggerAnalysis() {
  if (!isVideoPage()) {
    if (overlayWrapper) {
      overlayWrapper.style.display = "none";
    }
    return;
  }
  
  const cleanUrl = extractCleanUrl();
  createOrUpdateOverlay("loading");
  
  chrome.runtime.sendMessage({
    type: "ANALYZE_URL",
    url: cleanUrl
  });
}

// ── Message Listener ─────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "ANALYSIS_RESULT") {
    createOrUpdateOverlay(message.data);
    if (message.showTimeBreakBanner) {
      showTimeBreakBanner(message.elapsedMinutes);
    } else if (message.showBreakBanner) {
      showBreakBanner();
    }
  } else if (message.type === "ANALYSIS_ERROR") {
    createOrUpdateOverlay("error");
  }
});

// ── URL Change Detection ─────────────────────────────────────────────────────

// For SPAs (YouTube, TikTok, IG), we need to detect history changes
// Intercept pushState and replaceState from within the page context is hard in content script,
// so we use a MutationObserver on the title or body, and a regular polling fallback.

let lastUrl = location.href;
new MutationObserver(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    console.log("AFI Extension: Navigated to", lastUrl);
    // Add a slight delay to allow video player to initialize
    setTimeout(triggerAnalysis, 1000);
  }
}).observe(document, { subtree: true, childList: true });

// Initial trigger
setTimeout(triggerAnalysis, 1500);
