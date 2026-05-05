// Listen for visibility changes on the page
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    chrome.runtime.sendMessage({ action: "pageVisible" }, (response) => {
      if (chrome.runtime.lastError) {
        console.warn('Extension pageVisible message failed', chrome.runtime.lastError.message);
      }
    });
  } else {
    chrome.runtime.sendMessage({ action: "pageHidden" }, (response) => {
      if (chrome.runtime.lastError) {
        console.warn('Extension pageHidden message failed', chrome.runtime.lastError.message);
      }
    });
  }
});

const syncTokenToExtension = async (token) => {
  if (!token) return;
  chrome.runtime.sendMessage({ action: "login", token }, (response) => {
    if (chrome.runtime.lastError) {
      console.warn('Extension token sync failed', chrome.runtime.lastError.message);
      return;
    }
    console.log("Extension login successful", response);
  });
};

const getPageToken = () => {
  try {
    return window.localStorage.getItem('token');
  } catch (e) {
    console.warn('Unable to read page localStorage token', e);
    return null;
  }
};

// Sync token when the page loads and whenever localStorage changes.
const token = getPageToken();
if (token) {
  syncTokenToExtension(token);
}

window.addEventListener("storage", (event) => {
  if (event.key === 'token') {
    syncTokenToExtension(event.newValue);
  }
});

// Listen for login event from the dashboard
window.addEventListener("EXTENSION_LOGIN", (e) => {
  if (e.detail && e.detail.token) {
    syncTokenToExtension(e.detail.token);
  }
});
