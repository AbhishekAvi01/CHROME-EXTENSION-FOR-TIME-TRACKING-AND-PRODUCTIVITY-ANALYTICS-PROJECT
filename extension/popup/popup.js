const BACKEND_URL = 'http://localhost:5000/api';

const getStorage = (keys) => new Promise((resolve) => chrome.storage.local.get(keys, resolve));

const formatTime = (seconds) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h === 0 && m === 0) {
    return `${s}s`;
  }
  if (h === 0) {
    return `${m}m ${s}s`;
  }
  return `${h}h ${m}m ${s}s`;
};

const fetchAndUpdateStats = async () => {
  try {
    const tokenResult = await getStorage(['token']);
    if (!tokenResult.token) {
      document.getElementById('total-time').textContent = 'Please login in Dashboard';
      document.getElementById('productive-time').textContent = '--';
      document.getElementById('unproductive-time').textContent = '--';
      return;
    }

    const response = await fetch(`${BACKEND_URL}/analytics/today`, {
      headers: {
        'Authorization': `Bearer ${tokenResult.token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error:', response.status, errorText);
      document.getElementById('total-time').textContent = `Error: ${response.status}`;
      document.getElementById('productive-time').textContent = '--';
      document.getElementById('unproductive-time').textContent = '--';
      return;
    }

    const data = await response.json();
    document.getElementById('total-time').textContent = formatTime(data.totalTime || 0);
    document.getElementById('productive-time').textContent = formatTime(data.productiveTime || 0);
    document.getElementById('unproductive-time').textContent = formatTime(data.unproductiveTime || 0);
    document.getElementById('neutral-time').textContent = formatTime(data.neutralTime || 0);
  } catch (err) {
    console.error('Popup fetch error', err);
    document.getElementById('total-time').textContent = 'Unable to connect';
    document.getElementById('productive-time').textContent = '--';
    document.getElementById('unproductive-time').textContent = '--';
    document.getElementById('neutral-time').textContent = '--';
  }
};

document.addEventListener('DOMContentLoaded', async () => {
  const toggle = document.getElementById('tracking-toggle');
  const btnDashboard = document.getElementById('open-dashboard');

  // Get initial tracking status
  chrome.runtime.sendMessage({ action: 'getStatus' }, (response) => {
    if (chrome.runtime.lastError) {
      console.error('Error getting status:', chrome.runtime.lastError);
      return;
    }
    if (response && typeof response.isTracking === 'boolean') {
      toggle.checked = response.isTracking;
    }
  });

  toggle.addEventListener('change', (e) => {
    chrome.runtime.sendMessage({ action: 'toggleTracking', isTracking: e.target.checked }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error toggling tracking:', chrome.runtime.lastError);
      }
    });
  });

  btnDashboard.addEventListener('click', () => {
    chrome.tabs.create({ url: 'http://localhost:5174' });
  });

  // Fetch stats initially
  await fetchAndUpdateStats();

  // Refresh stats every 10 seconds
  setInterval(fetchAndUpdateStats, 10000);
});
