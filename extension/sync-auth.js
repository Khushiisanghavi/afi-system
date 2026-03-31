// sync-auth.js
function syncToken() {
  const token = localStorage.getItem("token");
  if (token && token !== "undefined" && token !== "null") {
    chrome.runtime.sendMessage({ type: "SYNC_TOKEN", token: token });
  } else {
    chrome.runtime.sendMessage({ type: "SYNC_TOKEN", token: null });
  }
}

// Check on load
syncToken();

// Also check when localStorage changes in other tabs
window.addEventListener("storage", (e) => {
  if (e.key === "token") {
    syncToken();
  }
});

// Hack to detect changes within the same tab
const originalSetItem = localStorage.setItem;
localStorage.setItem = function(key, value) {
  originalSetItem.apply(this, arguments);
  if (key === "token") {
    syncToken();
  }
};

const originalRemoveItem = localStorage.removeItem;
localStorage.removeItem = function(key) {
  originalRemoveItem.apply(this, arguments);
  if (key === "token") {
    syncToken();
  }
};
