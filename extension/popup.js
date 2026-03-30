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

  // Handle Login button (placeholder for actual auth flow)
  document.getElementById("login-btn").addEventListener("click", () => {
    chrome.tabs.create({ url: "http://localhost:3000/auth" });
  });
});
