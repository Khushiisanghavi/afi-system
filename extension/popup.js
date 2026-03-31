// popup.js

document.addEventListener("DOMContentLoaded", () => {
  // Load session stats from background
  chrome.runtime.sendMessage({ type: "GET_STATS" }, (stats) => {
    if (stats) {
      document.getElementById("videos-watched").innerText = stats.videosWatched;
      document.getElementById("average-afi").innerText = stats.averageAfi;
      
      const highElem = document.getElementById("high-count");
      highElem.innerText = stats.highCount;
      // Change color based on count
      if (stats.highCount === 0) {
        highElem.className = "stat-value calm";
      } else if (stats.highCount < 3) {
        highElem.className = "stat-value moderate";
      } else {
        highElem.className = "stat-value high";
      }
    }
  });

  // Load limit
  chrome.storage.local.get(["dailyLimit"], (result) => {
    if (result.dailyLimit) {
      document.getElementById("limit-input").value = result.dailyLimit;
    }
  });

  // Save limit
  document.getElementById("save-limit-btn").addEventListener("click", () => {
    const val = parseInt(document.getElementById("limit-input").value, 10);
    if (!isNaN(val)) {
      chrome.storage.local.set({ dailyLimit: val }, () => {
        const msg = document.getElementById("limit-msg");
        msg.style.display = "block";
        setTimeout(() => { msg.style.display = "none"; }, 2000);
      });
    }
  });

  // Handle Login button
  document.getElementById("login-btn").addEventListener("click", () => {
    chrome.tabs.create({ url: "http://localhost:3000/login" });
  });

  // Check auth state
  chrome.storage.local.get(["appToken"], (result) => {
    if (result.appToken) {
      document.getElementById("login-btn").style.display = "none";
      document.getElementById("login-msg").style.display = "none";
      document.getElementById("connected-msg").style.display = "flex";
      document.getElementById("login-section").style.borderColor = "rgba(52,211,153,0.3)";
      document.getElementById("login-section").style.background = "rgba(52,211,153,0.08)";
    }
  });
});
