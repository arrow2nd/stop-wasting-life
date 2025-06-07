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

document.addEventListener('DOMContentLoaded', async () => {
  const timeLimitInput = document.getElementById('timeLimit');
  const saveButton = document.getElementById('save');
  const statusDiv = document.getElementById('status');
  
  // Check for dark mode when page loads
  isTwitterDarkMode();
  
  // Load saved settings
  const settings = await chrome.storage.sync.get(['timeLimit']);
  if (settings.timeLimit) {
    timeLimitInput.value = settings.timeLimit / 1000; // Convert to seconds
  }
  
  saveButton.addEventListener('click', async () => {
    const timeLimit = parseInt(timeLimitInput.value) * 1000; // Convert to milliseconds
    
    await chrome.storage.sync.set({ timeLimit });
    
    statusDiv.style.display = 'block';
    setTimeout(() => {
      statusDiv.style.display = 'none';
    }, 2000);
  });
});