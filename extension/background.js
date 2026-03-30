// background.js

let sessionStats = {
  videosWatched: 0,
  averageAfi: 0,
  highCount: 0,
  consecutiveHigh: 0,
  totalAfiSum: 0,
  startTime: Date.now()
};

// Keep track of the active video URL to avoid redundant analysis
let currentUrl = null;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "ANALYZE_URL") {
    if (request.url === currentUrl) return;
    currentUrl = request.url;

    // Call the backend API
    fetch("http://localhost:8000/extension/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ url: request.url })
    })
    .then(response => {
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    })
    .then(data => {
      // Update session stats
      sessionStats.videosWatched++;
      sessionStats.totalAfiSum += data.score;
      sessionStats.averageAfi = Math.round(sessionStats.totalAfiSum / sessionStats.videosWatched);
      
      const isHighOrOverstim = data.category === "High" || data.category === "Overstimulating";
      
      if (isHighOrOverstim) {
        sessionStats.highCount++;
        sessionStats.consecutiveHigh++;
      } else {
        sessionStats.consecutiveHigh = 0;
      }

      const showBreakBanner = sessionStats.consecutiveHigh >= 3;
      const elapsedMinutes = (Date.now() - sessionStats.startTime) / (60 * 1000);
      const showTimeBreakBanner = elapsedMinutes >= 30;

      // Send result back to content script
      chrome.tabs.sendMessage(sender.tab.id, {
        type: "ANALYSIS_RESULT",
        data: data,
        showBreakBanner: showBreakBanner,
        showTimeBreakBanner: showTimeBreakBanner,
        elapsedMinutes: Math.round(elapsedMinutes)
      });
      
      // Save stats to local storage so popup can read them
      chrome.storage.local.set({ extensionSessionStats: sessionStats });
    })
    .catch(error => {
      console.error("AFI Extension Error:", error);
      chrome.tabs.sendMessage(sender.tab.id, {
        type: "ANALYSIS_ERROR",
        error: error.message
      });
    });
    
    return true; // Keep message channel open for async fetch
  }
  
  if (request.type === "GET_STATS") {
    sendResponse(sessionStats);
  }
});
