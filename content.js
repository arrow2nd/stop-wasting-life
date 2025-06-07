let countdownInterval;
let timerOverlay;
let vignetteOverlay;
let countdownEndTime;

function formatTime(milliseconds) {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${
    remainingSeconds.toString().padStart(2, "0")
  }`;
}

function createVignetteOverlay() {
  // Remove existing vignette if any
  if (vignetteOverlay) {
    vignetteOverlay.remove();
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

function createTimerOverlay() {
  // Remove existing overlay if any
  if (timerOverlay) {
    timerOverlay.remove();
  }

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
    color: #000000;
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
      if (seconds <= 30) {
        timerOverlay.style.color = "#FF6B6B";
      } else {
        timerOverlay.style.color = "#000000";
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

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "startCountdown") {
    startCountdown(request.timeLimit);
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
    chrome.runtime.sendMessage({ action: "closeTab" });
  } else if (request.action === "showBlockedMessage") {
    alert(request.message);
  }
});

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
});

