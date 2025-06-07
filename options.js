function isTwitterDarkMode() {
  // Get Twitter cookie from background script
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    if (tabs[0] && (tabs[0].url.includes('twitter.com') || tabs[0].url.includes('x.com'))) {
      chrome.scripting.executeScript({
        target: {tabId: tabs[0].id},
        func: () => {
          const cookies = document.cookie.split(';');
          for (let cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if (name === 'night_mode') {
              return value !== '0';
            }
          }
          return false;
        }
      }, (results) => {
        if (results && results[0] && results[0].result) {
          document.body.classList.add('dark-mode');
        }
      });
    }
  });
}

function formatTime(milliseconds) {
  const minutes = Math.floor(milliseconds / (60 * 1000));
  const seconds = Math.floor((milliseconds % (60 * 1000)) / 1000);
  return `${minutes}分${seconds}秒`;
}

async function updateUsageDisplay() {
  const data = await chrome.storage.local.get([
    'dailyUsage', 'violationCount', 'blockedUntil', 'strictModeUntil'
  ]);
  
  const dailyUsage = data.dailyUsage || 0;
  const violationCount = data.violationCount || 0;
  const blockedUntil = data.blockedUntil || {};
  const strictModeUntil = data.strictModeUntil || 0;
  const now = Date.now();
  
  // Update daily usage display
  const usageDiv = document.getElementById('dailyUsage');
  const dailyLimitMs = (await chrome.storage.sync.get(['dailyLimit'])).dailyLimit || (15 * 60 * 1000);
  const usagePercent = Math.round((dailyUsage / dailyLimitMs) * 100);
  
  let usageClass = '';
  if (usagePercent >= 90) usageClass = 'danger';
  else if (usagePercent >= 70) usageClass = 'warning';
  
  usageDiv.innerHTML = `
    <div class="usage-info">
      <div class="${usageClass}">使用時間: ${formatTime(dailyUsage)} / ${formatTime(dailyLimitMs)} (${usagePercent}%)</div>
    </div>
  `;
  
  // Update violation count
  const violationDiv = document.getElementById('violationCount');
  if (violationCount > 0) {
    violationDiv.innerHTML = `<div class="usage-info"><span class="warning">違反回数: ${violationCount}回</span></div>`;
  } else {
    violationDiv.innerHTML = '<div class="usage-info">違反なし</div>';
  }
  
  // Update block status
  const blockDiv = document.getElementById('blockStatus');
  let blockText = '';
  
  if (strictModeUntil > now) {
    const remaining = Math.ceil((strictModeUntil - now) / (60 * 1000));
    blockText = `<span class="danger">厳格モード: あと${remaining}分</span>`;
  } else {
    const twitterBlock = blockedUntil['twitter.com'] || 0;
    const xBlock = blockedUntil['x.com'] || 0;
    
    if (twitterBlock > now || xBlock > now) {
      const maxBlock = Math.max(twitterBlock, xBlock);
      const remaining = Math.ceil((maxBlock - now) / (60 * 1000));
      blockText = `<span class="warning">ブロック中: あと${remaining}分</span>`;
    } else {
      blockText = 'ブロックなし';
    }
  }
  
  blockDiv.innerHTML = `<div class="usage-info">${blockText}</div>`;
}

document.addEventListener('DOMContentLoaded', async () => {
  const timeLimitInput = document.getElementById('timeLimit');
  const dailyLimitInput = document.getElementById('dailyLimit');
  const saveButton = document.getElementById('save');
  const resetDailyButton = document.getElementById('resetDaily');
  const resetViolationsButton = document.getElementById('resetViolations');
  const statusDiv = document.getElementById('status');
  
  // Check for dark mode when page loads
  isTwitterDarkMode();
  
  // Load saved settings
  const syncSettings = await chrome.storage.sync.get(['timeLimit', 'dailyLimit']);
  if (syncSettings.timeLimit) {
    timeLimitInput.value = syncSettings.timeLimit / 1000; // Convert to seconds
  }
  if (syncSettings.dailyLimit) {
    dailyLimitInput.value = syncSettings.dailyLimit / (60 * 1000); // Convert to minutes
  }
  
  // Update usage display
  await updateUsageDisplay();
  
  // Update usage display every 5 seconds
  setInterval(updateUsageDisplay, 5000);
  
  saveButton.addEventListener('click', async () => {
    const timeLimit = parseInt(timeLimitInput.value) * 1000; // Convert to milliseconds
    const dailyLimit = parseInt(dailyLimitInput.value) * 60 * 1000; // Convert to milliseconds
    
    await chrome.storage.sync.set({ timeLimit, dailyLimit });
    
    statusDiv.style.display = 'block';
    setTimeout(() => {
      statusDiv.style.display = 'none';
    }, 2000);
  });
  
  resetDailyButton.addEventListener('click', async () => {
    await chrome.storage.local.set({ dailyUsage: 0 });
    await updateUsageDisplay();
    statusDiv.textContent = '使用時間をリセットしました';
    statusDiv.style.display = 'block';
    setTimeout(() => {
      statusDiv.style.display = 'none';
    }, 2000);
  });
  
  resetViolationsButton.addEventListener('click', async () => {
    await chrome.storage.local.set({ 
      violationCount: 0,
      blockedUntil: {},
      strictModeUntil: 0
    });
    await updateUsageDisplay();
    statusDiv.textContent = '違反情報をリセットしました';
    statusDiv.style.display = 'block';
    setTimeout(() => {
      statusDiv.style.display = 'none';
    }, 2000);
  });
});