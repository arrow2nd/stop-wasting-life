const DEFAULT_TIME_LIMIT = 3 * 60 * 1000; // 3 minutes
const COOLDOWN_PERIOD = 30 * 60 * 1000; // 30 minutes

let blockedUntil = new Map();

const warningMessages = [
  "こんなもんで人生無駄にしすんなよ！",
  "時間は有限だぞ！Twitterなんか見てる場合か！",
  "SNS中毒は人生の敵だ！今すぐ閉じろ！",
  "もっと有意義なことに時間を使え！",
  "人生は短い！無駄にするな！",
];

const cooldownMessages = [
  "こんなもん見てないで他の作業をするべきだろ！",
  "まだ懲りないのか！作業に戻れ！",
  "休憩時間はまだ終わってないぞ！",
  "他にやることがあるはずだ！",
  "Twitterは30分後だ！今は集中しろ！",
];

function getRandomMessage(messages) {
  return messages[Math.floor(Math.random() * messages.length)];
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (
    changeInfo.status === "complete" && tab.url &&
    (tab.url.includes("twitter.com") || tab.url.includes("x.com"))
  ) {
    handleTwitterTab(tabId, tab);
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  // Clear any alarms and countdown data for this tab
  chrome.alarms.clear(`twitter-timer-${tabId}`);
  chrome.storage.local.remove([`countdown-${tabId}`, `twitter-timer-${tabId}`]);
});

async function handleTwitterTab(tabId, tab) {
  const now = Date.now();
  const domain = tab.url.includes("twitter.com") ? "twitter.com" : "x.com";

  if (blockedUntil.has(domain) && blockedUntil.get(domain) > now) {
    const message = getRandomMessage(cooldownMessages);
    chrome.tabs.sendMessage(tabId, { action: "showBlockedMessage", message });
    chrome.tabs.remove(tabId);
    return;
  }

  // Check if there's an existing countdown for this tab
  const existingCountdown = await chrome.storage.local.get([`countdown-${tabId}`]);
  
  if (existingCountdown[`countdown-${tabId}`]) {
    // Resume existing countdown
    const countdownData = existingCountdown[`countdown-${tabId}`];
    chrome.tabs.sendMessage(tabId, {
      action: "resumeCountdown",
      endTime: countdownData.endTime,
    });
    return;
  }

  const settings = await chrome.storage.sync.get(["timeLimit"]);
  const timeLimit = settings.timeLimit || DEFAULT_TIME_LIMIT;
  const endTime = now + timeLimit;

  // Store countdown data
  chrome.storage.local.set({
    [`countdown-${tabId}`]: { 
      endTime: endTime,
      domain: domain,
      startTime: now
    }
  });

  // Send the time limit to content script to start countdown
  chrome.tabs.sendMessage(tabId, {
    action: "startCountdown",
    timeLimit: timeLimit,
  });

  // Use chrome.alarms API instead of setTimeout for reliability
  const alarmName = `twitter-timer-${tabId}`;
  chrome.alarms.create(alarmName, {
    delayInMinutes: timeLimit / (60 * 1000),
  });

  // Store tab info for when alarm fires
  chrome.storage.local.set({
    [alarmName]: { tabId, message: getRandomMessage(warningMessages) },
  });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "closeTab") {
    const tabId = sender.tab.id;
    const domain = sender.tab.url.includes("twitter.com")
      ? "twitter.com"
      : "x.com";

    blockedUntil.set(domain, Date.now() + COOLDOWN_PERIOD);
    chrome.tabs.remove(tabId);

    // Clear the alarm and countdown data for this tab
    chrome.alarms.clear(`twitter-timer-${tabId}`);
    chrome.storage.local.remove([`countdown-${tabId}`, `twitter-timer-${tabId}`]);
  }
});

// Handle alarms
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name.startsWith("twitter-timer-")) {
    const data = await chrome.storage.local.get(alarm.name);
    if (data[alarm.name]) {
      const { tabId, message } = data[alarm.name];

      // Check if tab still exists
      try {
        const tab = await chrome.tabs.get(tabId);
        if (
          tab && (tab.url.includes("twitter.com") || tab.url.includes("x.com"))
        ) {
          chrome.tabs.sendMessage(tabId, {
            action: "showWarning",
            message: message,
          });
        }
      } catch (error) {
        // Tab doesn't exist anymore
      }

      // Clean up storage
      chrome.storage.local.remove(alarm.name);
    }
  }
});
