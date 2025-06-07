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

document.getElementById('options').addEventListener('click', (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});

// Check for dark mode when popup opens
isTwitterDarkMode();