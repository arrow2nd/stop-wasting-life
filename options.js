document.addEventListener('DOMContentLoaded', async () => {
  const timeLimitInput = document.getElementById('timeLimit');
  const saveButton = document.getElementById('save');
  const statusDiv = document.getElementById('status');
  
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