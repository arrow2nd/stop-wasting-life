const DEFAULT_TIME_LIMIT = 3 * 60 * 1000; // 3 minutes
const COOLDOWN_PERIOD = 30 * 60 * 1000; // 30 minutes
const DAILY_LIMIT = 15 * 60 * 1000; // 15 minutes daily limit
const STRICT_MODE_COOLDOWN = 2 * 60 * 60 * 1000; // 2 hours strict cooldown

const warningMessages = [
  "こんなもんで人生無駄にすんなよ！",
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

// Initialize storage on startup
// Cross-browser compatibility
const browserAPI = typeof browser !== "undefined" ? browser : chrome;

browserAPI.runtime.onStartup.addListener(initializeStorage);
browserAPI.runtime.onInstalled.addListener(initializeStorage);

// Restore global session on startup
browserAPI.runtime.onStartup.addListener(async () => {
  const data = await browserAPI.storage.local.get([
    "globalSession",
    "activeTwitterTabs",
    "sessionBackup",
    "lastUsageUpdate",
  ]);

  // Check if we have a session backup from crash/shutdown
  if (data.sessionBackup && data.sessionBackup.endTime > Date.now()) {
    // Restore from backup
    await browserAPI.storage.local.set({ globalSession: data.sessionBackup });

    // If there was recent activity (within last 10 seconds before shutdown), restore session
    if (data.lastUsageUpdate && Date.now() - data.lastUsageUpdate < 10000) {
      startGlobalUsageTracking();

      const remainingTime = data.sessionBackup.endTime - Date.now();
      if (remainingTime > 0) {
        browserAPI.alarms.create("global-twitter-timer", {
          delayInMinutes: remainingTime / (60 * 1000),
        });
      }
    }
  } else if (data.globalSession && data.globalSession.endTime > Date.now()) {
    // Resume normal global session
    startGlobalUsageTracking();

    // Re-establish global timer alarm
    const remainingTime = data.globalSession.endTime - Date.now();
    if (remainingTime > 0) {
      browserAPI.alarms.create("global-twitter-timer", {
        delayInMinutes: remainingTime / (60 * 1000),
      });
    }
  }

  // Clean up any stale session data from improper shutdown
  await cleanupStaleData();
});

// Clean up stale data that might persist from improper Chrome shutdown
async function cleanupStaleData() {
  const data = await browserAPI.storage.local.get([
    "globalSession",
    "activeTwitterTabs",
  ]);

  // If there are active tabs listed but session expired, clean up
  if (data.globalSession && data.globalSession.endTime <= Date.now()) {
    await browserAPI.storage.local.remove([
      "globalSession",
      "global-twitter-timer",
    ]);
  }

  // Validate active tabs still exist
  if (data.activeTwitterTabs && data.activeTwitterTabs.length > 0) {
    const validTabs = [];
    for (const tabId of data.activeTwitterTabs) {
      try {
        const tab = await browserAPI.tabs.get(tabId);
        if (
          tab && (tab.url.includes("twitter.com") || tab.url.includes("x.com"))
        ) {
          validTabs.push(tabId);
        }
      } catch (error) {
        // Tab doesn't exist
      }
    }
    await browserAPI.storage.local.set({ activeTwitterTabs: validTabs });

    // If no valid tabs but session exists, clear session
    if (validTabs.length === 0 && data.globalSession) {
      await browserAPI.storage.local.remove([
        "globalSession",
        "global-twitter-timer",
      ]);
      browserAPI.alarms.clear("global-twitter-timer");
    }
  }
}

async function initializeStorage() {
  const today = new Date().toDateString();
  const data = await browserAPI.storage.local.get([
    "dailyUsage",
    "blockedUntil",
    "lastActiveDate",
    "globalSession",
    "activeTwitterTabs",
  ]);

  // Reset daily usage if it's a new day
  if (data.lastActiveDate !== today) {
    await browserAPI.storage.local.set({
      dailyUsage: 0,
      lastActiveDate: today,
      blockedUntil: {}, // Reset blocks on new day
      violationCount: 0, // Reset violations on new day
      strictModeUntil: 0, // Reset strict mode on new day
    });
  }

  // Initialize missing fields
  const updates = {};
  if (!data.blockedUntil) updates.blockedUntil = {};
  if (!data.activeTwitterTabs) updates.activeTwitterTabs = [];

  if (Object.keys(updates).length > 0) {
    await browserAPI.storage.local.set(updates);
  }

  // Clean up stale active tabs on startup
  if (data.activeTwitterTabs && data.activeTwitterTabs.length > 0) {
    const validTabs = [];
    for (const tabId of data.activeTwitterTabs) {
      try {
        await browserAPI.tabs.get(tabId);
        validTabs.push(tabId);
      } catch (error) {
        // Tab doesn't exist anymore
      }
    }
    await browserAPI.storage.local.set({ activeTwitterTabs: validTabs });
  }
}

browserAPI.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (
    changeInfo.status === "complete" && tab.url &&
    (tab.url.includes("twitter.com") || tab.url.includes("x.com"))
  ) {
    await initializeStorage();
    await handleTwitterTab(tabId, tab);
  }
});

browserAPI.tabs.onRemoved.addListener(async (tabId) => {
  // Remove tab from active tabs list
  const data = await browserAPI.storage.local.get([
    "activeTwitterTabs",
    "globalSession",
  ]);
  const activeTwitterTabs = data.activeTwitterTabs || [];
  const updatedTabs = activeTwitterTabs.filter((id) => id !== tabId);

  await browserAPI.storage.local.set({ activeTwitterTabs: updatedTabs });

  // If no more active Twitter tabs, clear global session
  if (updatedTabs.length === 0) {
    browserAPI.alarms.clear("global-twitter-timer");
    await browserAPI.storage.local.remove([
      "globalSession",
      "global-twitter-timer",
    ]);
    clearGlobalUsageTracking();
  }

  // Legacy cleanup
  browserAPI.alarms.clear(`twitter-timer-${tabId}`);
  browserAPI.storage.local.remove([
    `countdown-${tabId}`,
    `twitter-timer-${tabId}`,
  ]);
});

async function handleTwitterTab(tabId, tab) {
  const now = Date.now();
  const domain = tab.url.includes("twitter.com") ? "twitter.com" : "x.com";

  // Get persistent data
  const data = await browserAPI.storage.local.get([
    "blockedUntil",
    "dailyUsage",
    "strictModeUntil",
    "globalSession",
    "activeTwitterTabs",
  ]);
  const blockedUntil = data.blockedUntil || {};
  const dailyUsage = data.dailyUsage || 0;
  const strictModeUntil = data.strictModeUntil || 0;
  const globalSession = data.globalSession || null;
  const activeTwitterTabs = data.activeTwitterTabs || [];

  // Get user's daily limit setting
  const syncSettings = await browserAPI.storage.sync.get(["dailyLimit"]);
  const userDailyLimit = syncSettings.dailyLimit || DAILY_LIMIT;

  // Check daily limit
  if (dailyUsage >= userDailyLimit) {
    const message = "今日はもう十分時間を使いました！明日まで待ってください！";
    browserAPI.tabs.sendMessage(tabId, {
      action: "showBlockedMessage",
      message,
    });
    browserAPI.tabs.remove(tabId);
    return;
  }

  // Check strict mode (triggered after multiple violations)
  if (strictModeUntil > now) {
    const message = "厳格モード中です。違反が多すぎます。";
    browserAPI.tabs.sendMessage(tabId, {
      action: "showBlockedMessage",
      message,
    });
    browserAPI.tabs.remove(tabId);
    return;
  }

  // Check domain-specific block
  if (blockedUntil[domain] && blockedUntil[domain] > now) {
    const message = getRandomMessage(cooldownMessages);
    browserAPI.tabs.sendMessage(tabId, {
      action: "showBlockedMessage",
      message,
    });
    browserAPI.tabs.remove(tabId);
    return;
  }

  // Add this tab to active tabs list
  if (!activeTwitterTabs.includes(tabId)) {
    activeTwitterTabs.push(tabId);
    await browserAPI.storage.local.set({ activeTwitterTabs });
  }

  // Check if there's an active global session
  if (globalSession && globalSession.endTime > now) {
    // Resume existing global session
    browserAPI.tabs.sendMessage(tabId, {
      action: "resumeCountdown",
      endTime: globalSession.endTime,
    });
    return;
  }

  // Start new global session
  const settings = await browserAPI.storage.sync.get(["timeLimit"]);
  const timeLimit = settings.timeLimit || DEFAULT_TIME_LIMIT;
  const endTime = now + timeLimit;

  const sessionData = {
    endTime: endTime,
    startTime: now,
    timeLimit: timeLimit,
    domain: domain,
    initiatingTabId: tabId,
  };

  // Store global session data
  await browserAPI.storage.local.set({
    globalSession: sessionData,
  });

  // Start tracking daily usage
  startGlobalUsageTracking();

  // Send countdown to ALL active Twitter tabs
  await broadcastToAllTwitterTabs({
    action: "startCountdown",
    timeLimit: timeLimit,
  });

  // Use browserAPI.alarms API for global timer
  const alarmName = "global-twitter-timer";
  browserAPI.alarms.clear(alarmName); // Clear any existing alarm
  browserAPI.alarms.create(alarmName, {
    delayInMinutes: timeLimit / (60 * 1000),
  });

  // Store alarm info
  browserAPI.storage.local.set({
    [alarmName]: { message: getRandomMessage(warningMessages) },
  });
}

browserAPI.runtime.onMessage.addListener(
  async (request, sender, sendResponse) => {
    if (request.action === "closeTab") {
      const tabId = sender.tab.id;
      const domain = sender.tab.url.includes("twitter.com")
        ? "twitter.com"
        : "x.com";

      // Get current data and update
      const data = await browserAPI.storage.local.get([
        "blockedUntil",
        "dailyUsage",
        "violationCount",
        "activeTwitterTabs",
      ]);
      const blockedUntil = data.blockedUntil || {};
      const violationCount = (data.violationCount || 0) + 1;

      // Send time expired violation notification
      try {
        await browserAPI.tabs.sendMessage(tabId, {
          action: "showViolationNotification",
          violationType: "timeExpired",
          message: "制限時間に到達しました。 (+1点)",
          violationCount: violationCount,
        });
      } catch (error) {
        // Tab might not exist anymore
      }

      // Set block with escalating cooldown
      let cooldownPeriod = COOLDOWN_PERIOD;
      if (violationCount >= 5) {
        // Activate strict mode after 5 violations
        await browserAPI.storage.local.set({
          strictModeUntil: Date.now() + STRICT_MODE_COOLDOWN,
        });
        cooldownPeriod = STRICT_MODE_COOLDOWN;
      } else if (violationCount >= 3) {
        cooldownPeriod = COOLDOWN_PERIOD * 2; // Double cooldown
      }

      blockedUntil[domain] = Date.now() + cooldownPeriod;

      await browserAPI.storage.local.set({
        blockedUntil,
        violationCount,
      });

      // Close ALL Twitter tabs when time limit is reached
      await closeAllTwitterTabs();

      // Clear global session
      browserAPI.alarms.clear("global-twitter-timer");
      await browserAPI.storage.local.remove([
        "globalSession",
        "global-twitter-timer",
      ]);
      clearGlobalUsageTracking();
    } else if (request.action === "reportSuspiciousActivity") {
      // Handle suspicious activity reports
      await handleSuspiciousActivity(request, sender);
    } else if (request.action === "checkMultipleTabs") {
      // This is now handled automatically in handleTwitterTab
      // Multiple tabs will share the same countdown
    }
  },
);

// Handle suspicious activity
async function handleSuspiciousActivity(request, sender) {
  const data = await browserAPI.storage.local.get([
    "violationCount",
    "suspiciousActivity",
  ]);
  const violationCount = data.violationCount || 0;
  const suspiciousActivity = data.suspiciousActivity || [];

  // Log the suspicious activity
  suspiciousActivity.push({
    type: request.type,
    timestamp: Date.now(),
    tabId: sender.tab.id,
    details: request,
  });

  // Keep only last 50 activities
  if (suspiciousActivity.length > 50) {
    suspiciousActivity.splice(0, suspiciousActivity.length - 50);
  }

  let newViolationCount = violationCount;
  let violationMessage = "";
  let addedPoints = 0;

  // Assign penalty based on activity type
  switch (request.type) {
    case "devToolsOpen":
      addedPoints = 2;
      newViolationCount += addedPoints;
      violationMessage = "開発者ツールの使用を検出しました。";
      break;
    case "pageHidden":
      if (request.duration > 60000) { // Hidden for more than 1 minute
        addedPoints = 1;
        newViolationCount += addedPoints;
        violationMessage = `ページを${
          Math.floor(request.duration / 1000)
        }秒間隠していました。`;
      }
      break;
    case "blockedShortcut":
      addedPoints = 1;
      newViolationCount += addedPoints;
      violationMessage =
        `ショートカットキー（${request.key}）のブロックを検出しました。`;
      break;
      // Removed windowBlur and urlManipulation violations
  }

  await browserAPI.storage.local.set({
    violationCount: newViolationCount,
    suspiciousActivity,
  });

  // Send notification to the tab if violation was added
  if (addedPoints > 0) {
    try {
      await browserAPI.tabs.sendMessage(sender.tab.id, {
        action: "showViolationNotification",
        violationType: request.type,
        message: violationMessage + ` (+${addedPoints}点)`,
        violationCount: newViolationCount,
      });
    } catch (error) {
      // Tab might not exist anymore
    }
  }

  // If too many violations, activate extended strict mode
  if (newViolationCount >= 10) {
    // Extended strict mode - no immediate tab closure
    await browserAPI.storage.local.set({
      strictModeUntil: Date.now() + STRICT_MODE_COOLDOWN * 2, // 4 hours strict mode for 10+ violations
    });
  }
}

// Multiple tabs are now allowed but share the same countdown
// This encourages users to use one tab but doesn't punish multiple tabs harshly

// Handle alarms
browserAPI.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "global-twitter-timer") {
    const data = await browserAPI.storage.local.get([
      alarm.name,
      "activeTwitterTabs",
    ]);
    if (data[alarm.name]) {
      const { message } = data[alarm.name];
      const activeTwitterTabs = data.activeTwitterTabs || [];

      // Send warning to all active Twitter tabs
      for (const tabId of activeTwitterTabs) {
        try {
          const tab = await browserAPI.tabs.get(tabId);
          if (
            tab &&
            (tab.url.includes("twitter.com") || tab.url.includes("x.com"))
          ) {
            browserAPI.tabs.sendMessage(tabId, {
              action: "showWarning",
              message: message,
            });
          }
        } catch (error) {
          // Tab doesn't exist anymore
        }
      }

      // Clean up storage
      browserAPI.storage.local.remove([alarm.name, "globalSession"]);
      clearGlobalUsageTracking();
    }
  } else if (alarm.name.startsWith("twitter-timer-")) {
    // Legacy alarm handling
    const data = await browserAPI.storage.local.get(alarm.name);
    if (data[alarm.name]) {
      const { tabId, message } = data[alarm.name];

      try {
        const tab = await browserAPI.tabs.get(tabId);
        if (
          tab && (tab.url.includes("twitter.com") || tab.url.includes("x.com"))
        ) {
          browserAPI.tabs.sendMessage(tabId, {
            action: "showWarning",
            message: message,
          });
        }
      } catch (error) {
        // Tab doesn't exist anymore
      }

      browserAPI.storage.local.remove(alarm.name);
    }
  }
});

// Global usage tracking
let globalUsageInterval = null;
let lastUsageSave = Date.now();

async function startGlobalUsageTracking() {
  // Clear existing interval
  if (globalUsageInterval) {
    clearInterval(globalUsageInterval);
  }

  globalUsageInterval = setInterval(async () => {
    try {
      const data = await browserAPI.storage.local.get([
        "activeTwitterTabs",
        "globalSession",
        "dailyUsage",
      ]);
      const activeTwitterTabs = data.activeTwitterTabs || [];
      const globalSession = data.globalSession;

      // Check if session is still active
      if (!globalSession || globalSession.endTime <= Date.now()) {
        clearGlobalUsageTracking();
        return;
      }

      // Check if any Twitter tabs are still active
      let hasActiveTab = false;
      for (const tabId of activeTwitterTabs) {
        try {
          const tab = await browserAPI.tabs.get(tabId);
          if (
            tab &&
            (tab.url.includes("twitter.com") || tab.url.includes("x.com"))
          ) {
            hasActiveTab = true;
            break;
          }
        } catch (error) {
          // Tab doesn't exist, will be cleaned up
        }
      }

      if (hasActiveTab) {
        // Add 1 second to daily usage
        const newUsage = (data.dailyUsage || 0) + 1000;
        await browserAPI.storage.local.set({
          dailyUsage: newUsage,
          lastUsageUpdate: Date.now(), // Track when usage was last updated
        });

        // Save session state periodically (every 5 seconds) for crash recovery
        const now = Date.now();
        if (now - lastUsageSave >= 5000) {
          await browserAPI.storage.local.set({
            sessionBackup: {
              ...globalSession,
              currentUsage: newUsage,
              lastActive: now,
            },
          });
          lastUsageSave = now;
        }

        // Check if daily limit exceeded
        const syncSettings = await browserAPI.storage.sync.get(["dailyLimit"]);
        const userDailyLimit = syncSettings.dailyLimit || DAILY_LIMIT;
        if (newUsage >= userDailyLimit) {
          // Close all Twitter tabs
          await closeAllTwitterTabs();
          clearGlobalUsageTracking();
        }
      } else {
        // No active tabs, stop tracking
        clearGlobalUsageTracking();
      }
    } catch (error) {
      clearGlobalUsageTracking();
    }
  }, 1000);
}

function clearGlobalUsageTracking() {
  if (globalUsageInterval) {
    clearInterval(globalUsageInterval);
    globalUsageInterval = null;
  }
}

// Broadcast message to all active Twitter tabs
async function broadcastToAllTwitterTabs(message) {
  const data = await browserAPI.storage.local.get(["activeTwitterTabs"]);
  const activeTwitterTabs = data.activeTwitterTabs || [];

  for (const tabId of activeTwitterTabs) {
    try {
      await browserAPI.tabs.sendMessage(tabId, message);
    } catch (error) {
      // Tab might not exist anymore, will be cleaned up
    }
  }
}

// Close all Twitter tabs
async function closeAllTwitterTabs() {
  const data = await browserAPI.storage.local.get(["activeTwitterTabs"]);
  const activeTwitterTabs = data.activeTwitterTabs || [];

  for (const tabId of activeTwitterTabs) {
    try {
      await browserAPI.tabs.remove(tabId);
    } catch (error) {
      // Tab might not exist anymore
    }
  }

  await browserAPI.storage.local.set({ activeTwitterTabs: [] });
}

// Monitor for suspicious activity (extension being disabled/enabled)
browserAPI.management.onDisabled.addListener(async (info) => {
  if (info.id === browserAPI.runtime.id) {
    // Save current session state before being disabled
    const data = await browserAPI.storage.local.get([
      "globalSession",
      "violationCount",
    ]);
    const now = Date.now();
    const newViolationCount = (data.violationCount || 0) + 2;

    await browserAPI.storage.local.set({
      disabledAt: now,
      violationCount: newViolationCount,
      sessionBeforeDisable: data.globalSession, // Preserve session
      pendingViolationNotification: {
        type: "extensionDisabled",
        message: "拡張機能の無効化を検出しました。 (+2点)",
        count: newViolationCount,
      },
    });
  }
});

browserAPI.management.onEnabled.addListener(async (info) => {
  if (info.id === browserAPI.runtime.id) {
    const data = await browserAPI.storage.local.get([
      "disabledAt",
      "blockedUntil",
      "sessionBeforeDisable",
      "pendingViolationNotification",
      "activeTwitterTabs",
    ]);
    if (data.disabledAt) {
      const disabledDuration = Date.now() - data.disabledAt;

      // If there was an active session before disable, preserve remaining time
      if (
        data.sessionBeforeDisable &&
        data.sessionBeforeDisable.endTime > Date.now()
      ) {
        await browserAPI.storage.local.set({
          globalSession: data.sessionBeforeDisable,
        });
      }

      // If disabled for less than cooldown period, extend the block
      if (disabledDuration < COOLDOWN_PERIOD) {
        const blockedUntil = data.blockedUntil || {};
        blockedUntil["twitter.com"] = Date.now() + STRICT_MODE_COOLDOWN;
        blockedUntil["x.com"] = Date.now() + STRICT_MODE_COOLDOWN;
        await browserAPI.storage.local.set({
          blockedUntil,
          strictModeUntil: Date.now() + STRICT_MODE_COOLDOWN,
        });
      }

      // Send pending violation notification to all active Twitter tabs
      if (data.pendingViolationNotification && data.activeTwitterTabs) {
        const notification = data.pendingViolationNotification;
        for (const tabId of data.activeTwitterTabs) {
          try {
            await browserAPI.tabs.sendMessage(tabId, {
              action: "showViolationNotification",
              violationType: notification.type,
              message: notification.message,
              violationCount: notification.count,
            });
          } catch (error) {
            // Tab might not exist anymore
          }
        }
      }

      browserAPI.storage.local.remove([
        "disabledAt",
        "sessionBeforeDisable",
        "pendingViolationNotification",
      ]);
    }
  }
});
