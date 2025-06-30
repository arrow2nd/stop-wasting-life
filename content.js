// Cross-browser compatibility
const browserAPI = typeof browser !== "undefined" ? browser : chrome;

let countdownInterval;
let timerOverlay;
let vignetteOverlay;
let countdownEndTime;
let currentUrl = window.location.href;

function formatTime(milliseconds) {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${
    remainingSeconds.toString().padStart(2, "0")
  }`;
}

function createVignetteOverlay() {
  // Don't create if already exists or if we're currently navigating
  if (vignetteOverlay || isNavigating) {
    return;
  }

  // Create vignette element
  vignetteOverlay = document.createElement("div");
  vignetteOverlay.id = "stop-wasting-life-vignette";
  vignetteOverlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 999998;
    opacity: 0;
    transition: opacity 1s ease-out;
  `;

  // Create inner vignette that will be animated
  const innerVignette = document.createElement("div");
  innerVignette.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: radial-gradient(ellipse at center, 
      transparent 0%, 
      transparent 30%, 
      rgba(139, 0, 0, 0.8) 70%, 
      rgba(139, 0, 0, 1) 100%);
    transition: transform 30s linear;
    transform: scale(2);
  `;

  vignetteOverlay.appendChild(innerVignette);
  document.body.appendChild(vignetteOverlay);

  // Store reference to inner element
  vignetteOverlay.innerVignette = innerVignette;
}

let vignetteStarted = false;
let lastVignetteUpdate = 0;

function updateVignette(remainingSeconds) {
  if (!vignetteOverlay || !vignetteOverlay.innerVignette) return;

  const now = Date.now();

  if (remainingSeconds <= 30) {
    // Start vignette effect when hitting 30 seconds
    if (!vignetteStarted) {
      vignetteStarted = true;
      vignetteOverlay.style.opacity = "1";
      vignetteOverlay.innerVignette.style.transform = "scale(1)";
    }

    // Add pulsing effect for last 10 seconds (update only when needed)
    if (remainingSeconds <= 10 && now - lastVignetteUpdate > 1000) {
      lastVignetteUpdate = now;
      const pulseSpeed = 2 - (remainingSeconds / 10);

      if (
        !vignetteOverlay.style.animation ||
        !vignetteOverlay.style.animation.includes("pulse")
      ) {
        vignetteOverlay.style.animation =
          `pulse ${pulseSpeed}s ease-in-out infinite`;
      }
    }
  } else {
    // Reset if above 30 seconds
    if (vignetteStarted) {
      vignetteStarted = false;
      vignetteOverlay.style.opacity = "0";
      vignetteOverlay.innerVignette.style.transform = "scale(2)";
      vignetteOverlay.style.animation = "none";
    }
  }
}

function isTwitterDarkMode() {
  const cookies = document.cookie.split(";");
  for (let cookie of cookies) {
    const [name, value] = cookie.trim().split("=");
    if (name === "night_mode") {
      return value !== "0";
    }
  }
  return false;
}

function createTimerOverlay() {
  // Don't create if already exists or if we're currently navigating
  if (timerOverlay || isNavigating) {
    return;
  }

  // Detect Twitter dark mode from cookie
  const isDarkMode = isTwitterDarkMode();
  const timerColor = isDarkMode ? "#ffffff" : "#000000";

  // Create overlay element
  timerOverlay = document.createElement("div");
  timerOverlay.id = "stop-wasting-life-timer";
  timerOverlay.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: 20vw;
    font-weight: bold;
    color: ${timerColor};
    z-index: 999999;
    opacity: 0.3;
    pointer-events: none;
    font-family: Arial, sans-serif;
    text-align: center;
    transition: color 0.3s ease;
  `;

  document.body.appendChild(timerOverlay);

  // Add CSS animation for pulsing if not already added
  if (!document.getElementById("stop-wasting-life-styles")) {
    const style = document.createElement("style");
    style.id = "stop-wasting-life-styles";
    style.textContent = `
      @keyframes pulse {
        0% { opacity: 1; }
        50% { opacity: 0.7; }
        100% { opacity: 1; }
      }
    `;
    document.head.appendChild(style);
  }
}

function startCountdown(timeLimit) {
  createTimerOverlay();
  createVignetteOverlay();

  // Store the end time
  countdownEndTime = Date.now() + timeLimit;

  // Clear any existing interval
  if (countdownInterval) {
    clearInterval(countdownInterval);
  }

  // Update function that uses actual time
  function updateCountdown() {
    const now = Date.now();
    const remainingTime = Math.max(0, countdownEndTime - now);

    if (remainingTime <= 0) {
      clearInterval(countdownInterval);
      if (timerOverlay) {
        timerOverlay.remove();
        timerOverlay = null;
      }
      if (vignetteOverlay) {
        vignetteOverlay.remove();
        vignetteOverlay = null;
      }
      return;
    }

    if (timerOverlay) {
      timerOverlay.textContent = formatTime(remainingTime);

      // Change color when under 30 seconds
      const seconds = Math.floor(remainingTime / 1000);
      const isDarkMode = isTwitterDarkMode();

      if (seconds <= 30) {
        timerOverlay.style.color = "#FF6B6B";
      } else {
        timerOverlay.style.color = isDarkMode ? "#ffffff" : "#000000";
      }

      // Update vignette effect
      updateVignette(seconds);
    }
  }

  // Update immediately
  updateCountdown();

  // Update every 100ms for more accurate display
  countdownInterval = setInterval(updateCountdown, 100);
}

function resumeCountdown(endTime) {
  const now = Date.now();
  const remainingTime = Math.max(0, endTime - now);

  if (remainingTime <= 0) {
    // Countdown already finished
    return;
  }

  createTimerOverlay();
  createVignetteOverlay();

  // Store the end time
  countdownEndTime = endTime;

  // Clear any existing interval
  if (countdownInterval) {
    clearInterval(countdownInterval);
  }

  // Update function that uses actual time
  function updateCountdown() {
    const now = Date.now();
    const remainingTime = Math.max(0, countdownEndTime - now);

    if (remainingTime <= 0) {
      clearInterval(countdownInterval);
      if (timerOverlay) {
        timerOverlay.remove();
        timerOverlay = null;
      }
      if (vignetteOverlay) {
        vignetteOverlay.remove();
        vignetteOverlay = null;
      }
      return;
    }

    if (timerOverlay) {
      timerOverlay.textContent = formatTime(remainingTime);

      // Change color when under 30 seconds
      const seconds = Math.floor(remainingTime / 1000);
      const isDarkMode = isTwitterDarkMode();

      if (seconds <= 30) {
        timerOverlay.style.color = "#FF6B6B";
      } else {
        timerOverlay.style.color = isDarkMode ? "#ffffff" : "#000000";
      }

      // Update vignette effect
      updateVignette(seconds);
    }
  }

  // Update immediately
  updateCountdown();

  // Update every 100ms for more accurate display
  countdownInterval = setInterval(updateCountdown, 100);
}

browserAPI.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "startCountdown") {
    startCountdown(request.timeLimit);
  } else if (request.action === "resumeCountdown") {
    resumeCountdown(request.endTime);
  } else if (request.action === "showWarning") {
    // Clear countdown when warning appears
    if (countdownInterval) {
      clearInterval(countdownInterval);
    }
    if (timerOverlay) {
      timerOverlay.remove();
      timerOverlay = null;
    }
    if (vignetteOverlay) {
      vignetteOverlay.remove();
      vignetteOverlay = null;
    }
    vignetteStarted = false;
    lastVignetteUpdate = 0;

    alert(request.message);
    browserAPI.runtime.sendMessage({ action: "closeTab" });
  } else if (request.action === "showBlockedMessage") {
    alert(request.message);
  } else if (request.action === "showViolationNotification") {
    // Show violation notification
    showViolationNotification(
      request.violationType,
      request.message,
      request.violationCount,
    );
  }
});

// Monitor URL changes for SPA navigation (Twitter/X uses SPA)
let urlCheckTimeout;
let isNavigating = false;

function checkForUrlChange() {
  if (window.location.href !== currentUrl) {
    currentUrl = window.location.href;
    isNavigating = true;

    // Clear any existing timeout
    if (urlCheckTimeout) {
      clearTimeout(urlCheckTimeout);
    }

    // If countdown is active, preserve it across navigation
    if (countdownEndTime && countdownInterval) {
      const remainingTime = Math.max(0, countdownEndTime - Date.now());
      if (remainingTime > 0) {
        // Wait for navigation to complete before recreating overlays
        urlCheckTimeout = setTimeout(() => {
          if (!document.getElementById("stop-wasting-life-timer")) {
            createTimerOverlay();
          }
          if (!document.getElementById("stop-wasting-life-vignette")) {
            createVignetteOverlay();
          }
          isNavigating = false;
        }, 500);
      }
    }
  }
}

// Use MutationObserver for more efficient SPA navigation detection
let navigationObserver;

function setupNavigationObserver() {
  if (navigationObserver) {
    navigationObserver.disconnect();
  }

  navigationObserver = new MutationObserver((mutations) => {
    // Check if the page content has significantly changed
    const hasSignificantChange = mutations.some((mutation) =>
      mutation.type === "childList" &&
      mutation.addedNodes.length > 5 // Threshold for significant DOM changes
    );

    if (hasSignificantChange) {
      checkForUrlChange();
    }
  });

  navigationObserver.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

// Fallback: Check for URL changes every 500ms (reduced frequency)
setInterval(checkForUrlChange, 500);

// Start observing when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", setupNavigationObserver);
} else {
  setupNavigationObserver();
}

// Also listen for popstate events (back/forward navigation)
window.addEventListener("popstate", () => {
  setTimeout(checkForUrlChange, 100);
});

// Anti-circumvention measures
let pageHiddenTime = 0;
let lastVisibilityChange = Date.now();
let devToolsOpen = false;
let windowFocused = true;

// Detect when page becomes hidden (tab switching, minimizing, etc.)
document.addEventListener("visibilitychange", () => {
  const now = Date.now();

  if (document.hidden) {
    lastVisibilityChange = now;
  } else {
    // If page was hidden for significant time, track it
    const hiddenDuration = now - lastVisibilityChange;
    pageHiddenTime += hiddenDuration;
  }
});

// Detect window focus changes (for tracking, not violations)
window.addEventListener("focus", () => {
  windowFocused = true;
});

window.addEventListener("blur", () => {
  windowFocused = false;
  // Window blur is no longer a violation
});

// Detect potential developer tools usage
const threshold = 160;
setInterval(() => {
  if (
    window.outerHeight - window.innerHeight > threshold ||
    window.outerWidth - window.innerWidth > threshold
  ) {
    if (!devToolsOpen) {
      devToolsOpen = true;
      browserAPI.runtime.sendMessage({
        action: "reportSuspiciousActivity",
        type: "devToolsOpen",
      });
    }
  } else {
    devToolsOpen = false;
  }
}, 1000);

// Detect multiple Twitter/X tabs
browserAPI.runtime.sendMessage({ action: "checkMultipleTabs" });

// Monitor for URL changes (for tracking, not violations)
let originalUrl = window.location.href;
const urlObserver = new MutationObserver(() => {
  if (window.location.href !== originalUrl) {
    originalUrl = window.location.href;
    // URL manipulation is no longer a violation
  }
});

urlObserver.observe(document, { subtree: true, childList: true });


// Violation notification system
function showViolationNotification(violationType, message, violationCount) {
  // Create notification element
  const notification = document.createElement("div");
  notification.id = "stop-wasting-life-violation-notification";

  // Get violation type in Japanese
  const violationTypeJa = {
    "devToolsOpen": "開発者ツールの使用",
    "pageHidden": "ページの非表示",
    "windowBlur": "ウィンドウのフォーカス外し",
    "urlManipulation": "URL操作の試み",
    "blockedShortcut": "ショートカットキーのブロック",
    "extensionDisabled": "拡張機能の無効化",
    "timeExpired": "制限時間到達",
  }[violationType] || "不正行為";

  // Determine severity based on violation count
  let bgColor, borderColor;
  if (violationCount >= 10) {
    bgColor = "rgba(139, 0, 0, 0.95)"; // Dark red
    borderColor = "#FF0000";
  } else if (violationCount >= 5) {
    bgColor = "rgba(255, 140, 0, 0.95)"; // Dark orange
    borderColor = "#FF8C00";
  } else if (violationCount >= 3) {
    bgColor = "rgba(255, 165, 0, 0.95)"; // Orange
    borderColor = "#FFA500";
  } else {
    bgColor = "rgba(255, 215, 0, 0.95)"; // Gold
    borderColor = "#FFD700";
  }

  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    max-width: 400px;
    padding: 20px;
    background: ${bgColor};
    color: white;
    border: 3px solid ${borderColor};
    border-radius: 10px;
    font-family: Arial, sans-serif;
    font-size: 16px;
    z-index: 2147483647;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
    animation: slideIn 0.3s ease-out, shake 0.5s ease-in-out 0.3s;
    cursor: pointer;
  `;

  notification.innerHTML = `
    <div style="font-weight: bold; font-size: 18px; margin-bottom: 10px;">⚠️ 違反検出</div>
    <div style="margin-bottom: 8px;">種類: ${violationTypeJa}</div>
    <div style="margin-bottom: 12px;">${message}</div>
    <div style="font-size: 14px; opacity: 0.9;">累計違反回数: ${violationCount}回</div>
    ${
    violationCount >= 10
      ? '<div style="font-size: 14px; margin-top: 8px; font-weight: bold;">⚡ 10回以上の違反により4時間の厳格モードが適用されます</div>'
      : ""
  }
    ${
    violationCount >= 5 && violationCount < 10
      ? '<div style="font-size: 14px; margin-top: 8px;">🔒 5回以上の違反により厳格モードが適用されます</div>'
      : ""
  }
    ${
    violationCount >= 3 && violationCount < 5
      ? '<div style="font-size: 14px; margin-top: 8px;">⏰ 3回以上の違反によりクールダウンが延長されます</div>'
      : ""
  }
  `;

  // Add click to dismiss
  notification.addEventListener("click", () => {
    notification.style.animation = "slideOut 0.3s ease-in";
    setTimeout(() => notification.remove(), 300);
  });

  // Add animations
  if (!document.getElementById("stop-wasting-life-violation-styles")) {
    const style = document.createElement("style");
    style.id = "stop-wasting-life-violation-styles";
    style.textContent = `
      @keyframes slideIn {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      @keyframes slideOut {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(100%);
          opacity: 0;
        }
      }
      @keyframes shake {
        0%, 100% { transform: translateX(0); }
        10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
        20%, 40%, 60%, 80% { transform: translateX(5px); }
      }
    `;
    document.head.appendChild(style);
  }

  document.body.appendChild(notification);

  // Auto-remove after 10 seconds
  setTimeout(() => {
    if (document.getElementById("stop-wasting-life-violation-notification")) {
      notification.style.animation = "slideOut 0.3s ease-in";
      setTimeout(() => notification.remove(), 300);
    }
  }, 10000);
}

// Clean up when page unloads
window.addEventListener("beforeunload", () => {
  if (countdownInterval) {
    clearInterval(countdownInterval);
  }
  if (timerOverlay) {
    timerOverlay.remove();
  }
  if (vignetteOverlay) {
    vignetteOverlay.remove();
  }
  if (navigationObserver) {
    navigationObserver.disconnect();
  }
  if (urlCheckTimeout) {
    clearTimeout(urlCheckTimeout);
  }
  if (urlObserver) {
    urlObserver.disconnect();
  }
});
