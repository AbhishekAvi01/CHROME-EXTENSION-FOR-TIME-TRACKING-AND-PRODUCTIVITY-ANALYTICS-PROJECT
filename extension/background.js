const BACKEND_URL = 'http://localhost:5000/api';
const DEFAULT_DETECTION_INTERVAL_SECONDS = 30;
const SYNC_PERIOD_MINUTES = 1;

const state = {
  activityQueue: [],
  isTracking: true,
  isIdle: false,
  currentSession: null
};

const storage = {
  get: (keys) => new Promise((resolve) => chrome.storage.local.get(keys, resolve)),
  set: (items) => new Promise((resolve) => chrome.storage.local.set(items, resolve))
};

const log = (...args) => console.log('[Tracker]', ...args);
const warn = (...args) => console.warn('[Tracker]', ...args);
const error = (...args) => console.error('[Tracker]', ...args);

const getTodayDate = () => new Date().toISOString().split('T')[0];

const normalizeDomain = (domain) => {
  if (!domain) return null;
  return domain.toLowerCase().replace(/^www\./, '');
};

const getDomain = (url) => {
  try {
    return normalizeDomain(new URL(url).hostname);
  } catch (e) {
    return null;
  }
};

const isTrackableUrl = (url) => {
  return url && !url.startsWith('chrome://') && !url.startsWith('chrome-extension://') && !url.startsWith('about:') && !url.startsWith('edge://');
};

const persistState = async () => {
  await storage.set({
    activityQueue: state.activityQueue,
    isTracking: state.isTracking,
    isIdle: state.isIdle,
    currentSession: state.currentSession
  });
};

const restoreState = async () => {
  const stored = await storage.get(['activityQueue', 'isTracking', 'isIdle', 'currentSession']);
  state.activityQueue = Array.isArray(stored.activityQueue) ? stored.activityQueue : [];
  state.isTracking = typeof stored.isTracking === 'boolean' ? stored.isTracking : true;
  state.isIdle = typeof stored.isIdle === 'boolean' ? stored.isIdle : false;
  state.currentSession = stored.currentSession || null;
  log('Restored state', { ...state, currentSession: stored.currentSession ? { ...stored.currentSession } : null });
};

const getActiveTab = async (windowId = chrome.windows.WINDOW_ID_CURRENT) => {
  try {
    const queryOptions = { active: true, windowId, lastFocusedWindow: true };
    const tabs = await chrome.tabs.query(queryOptions);
    return tabs?.[0] || null;
  } catch (err) {
    error('Error querying active tab:', err);
    return null;
  }
};

const stopCurrentSession = async () => {
  if (!state.currentSession) {
    return;
  }

  const endTime = Date.now();
  const duration = Math.floor((endTime - state.currentSession.startTime) / 1000);

  if (duration > 1) { // Only track activities longer than 1 second
    const normalizedDomain = normalizeDomain(state.currentSession.domain);
    const activity = {
      url: state.currentSession.url,
      domain: normalizedDomain, // Always store normalized domain
      title: state.currentSession.title,
      startTime: state.currentSession.startTime,
      endTime,
      duration,
      date: state.currentSession.date
    };

    state.activityQueue.push(activity);
    log('Queued activity', activity);
    state.currentSession = null;
    await persistState();
    await syncActivityQueue();
    return;
  } else {
    log('Skipped activity shorter than 1 second for', state.currentSession.url);
    state.currentSession = null;
    await persistState();
  }
};

const startSessionForTab = async (tab) => {
  if (!state.isTracking || state.isIdle) {
    log('Not starting session because tracking is disabled or state is idle');
    return;
  }

  if (!tab || !tab.url || !isTrackableUrl(tab.url)) {
    log('Tab not trackable:', tab?.url);
    return;
  }

  const domain = getDomain(tab.url);
  if (!domain) {
    log('Could not resolve domain for', tab.url);
    return;
  }

  const sessionKey = `${tab.id}-${tab.url}`;
  if (state.currentSession && state.currentSession.sessionKey === sessionKey) {
    log('Session already active for this tab/url');
    return;
  }

  await stopCurrentSession();

  state.currentSession = {
    sessionKey,
    tabId: tab.id,
    url: tab.url,
    domain,
    title: tab.title || '',
    startTime: Date.now(),
    date: getTodayDate()
  };

  await persistState();
  log('Started tracking session', state.currentSession);
};

const maybeResumeSession = async () => {
  if (!state.isTracking || state.isIdle) {
    log('Skipping resume because tracking disabled or idle');
    return;
  }

  if (state.currentSession) {
    log('Already have active session:', state.currentSession.sessionKey);
    return;
  }

  const tab = await getActiveTab();
  if (tab) {
    await startSessionForTab(tab);
  }
};

const syncActivityQueue = async () => {
  if (!state.activityQueue.length) {
    log('No queued activities to sync');
    return;
  }

  // Check if online using a simple fetch request instead of navigator.onLine
  try {
    await fetch('https://www.google.com/favicon.ico', { method: 'HEAD', mode: 'no-cors' });
  } catch (err) {
    warn('Offline: waiting to sync activities');
    return;
  }

  const { token } = await storage.get(['token']);
  if (!token) {
    warn('No auth token available for sync');
    return;
  }

  const payload = { activities: state.activityQueue };

  try {
    const response = await fetch(`${BACKEND_URL}/track`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const body = await response.text();
      warn('Sync request failed', response.status, body);
      if (response.status === 401 || response.status === 403) {
        warn('Token invalid or expired during sync; clearing token');
        await storage.set({ token: null });
      }
      return;
    }

    log('Successfully synced', state.activityQueue.length, 'activities');
    state.activityQueue = [];
    await persistState();
  } catch (err) {
    warn('Sync failed, will retry later:', err);
  }
};

const initialize = async () => {
  try {
    chrome.idle.setDetectionInterval(DEFAULT_DETECTION_INTERVAL_SECONDS);
  } catch (err) {
    warn('Failed to set idle detection interval:', err);
  }

  await restoreState();
  
  // Important: Always try to resume tracking or start a new session
  await maybeResumeSession();

  try {
    chrome.alarms.create('syncData', { periodInMinutes: SYNC_PERIOD_MINUTES });
  } catch (err) {
    warn('Failed to create sync alarm, using default interval:', err);
  }

  // Force a sync on initialization
  await syncActivityQueue();

  log('Background initialized');
};

chrome.runtime.onInstalled.addListener(() => {
  log('Extension installed');
  initialize();
});

chrome.runtime.onStartup.addListener(() => {
  log('Browser startup detected');
  initialize();
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'toggleTracking') {
    (async () => {
      if (request.isTracking === false) {
        await stopCurrentSession();
      }
      state.isTracking = request.isTracking;
      await persistState();
      log('Tracking toggled', state.isTracking);
      sendResponse({ success: true });
    })();
    return true;
  }

  if (request.action === 'getStatus') {
    sendResponse({
      isTracking: state.isTracking,
      queueLength: state.activityQueue.length,
      hasActiveSession: Boolean(state.currentSession)
    });
    return false;
  }

  if (request.action === 'login') {
    storage.set({ token: request.token })
      .then(() => log('Stored auth token from login event'))
      .catch((err) => error('Failed to store token', err));
    sendResponse({ success: true });
    return false;
  }

  if (request.action === 'pageVisible') {
    log('Page became visible');
    state.isIdle = false;
    maybeResumeSession();
    sendResponse({ success: true });
    return false;
  }

  if (request.action === 'pageHidden') {
    log('Page became hidden');
    state.isIdle = true;
    stopCurrentSession();
    sendResponse({ success: true });
    return false;
  }

  return false;
});

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  if (!state.isTracking || state.isIdle) {
    log('Ignoring tab activation because tracking disabled or idle');
    return;
  }

  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    await startSessionForTab(tab);
  } catch (err) {
    error('Error handling tab activation:', err);
  }
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (!tab || tabId !== tab.id) {
    return;
  }

  try {
    if (state.currentSession && state.currentSession.tabId === tabId && changeInfo.url) {
      log('Active tab URL changed, saving previous session and starting a new one');
      await stopCurrentSession();
      await startSessionForTab(tab);
    }

    if (state.currentSession && state.currentSession.tabId === tabId && changeInfo.title) {
      state.currentSession.title = changeInfo.title;
      await persistState();
      log('Updated active tab title', changeInfo.title);
    }
  } catch (err) {
    error('Error handling tab update:', err);
  }
});

chrome.webNavigation.onHistoryStateUpdated.addListener(async (details) => {
  if (!state.isTracking || state.isIdle) return;
  if (!state.currentSession || state.currentSession.tabId !== details.tabId) return;
  if (!details.url) return;

  try {
    const tab = await chrome.tabs.get(details.tabId).catch(() => null);
    if (!tab || !tab.url || !isTrackableUrl(tab.url)) return;
    if (tab.url === state.currentSession.url) return;

    log('SPA navigation detected, restarting session for', tab.url);
    await stopCurrentSession();
    await startSessionForTab(tab);
  } catch (err) {
    error('Error handling web navigation:', err);
  }
});

chrome.tabs.onRemoved.addListener(async (tabId) => {
  if (state.currentSession && state.currentSession.tabId === tabId) {
    log('Active tab closed, stopping current session');
    await stopCurrentSession();
    await maybeResumeSession();
  }
});

chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    log('Window lost focus');
    state.isIdle = true;
    await stopCurrentSession();
    await persistState();
    return;
  }

  state.isIdle = false;
  await persistState();
  const tab = await getActiveTab(windowId);
  await startSessionForTab(tab);
});

chrome.idle.onStateChanged.addListener(async (newState) => {
  log('Idle state changed to', newState);
  if (newState === 'idle' || newState === 'locked') {
    state.isIdle = true;
    await stopCurrentSession();
    await persistState();
  } else if (newState === 'active') {
    state.isIdle = false;
    await persistState();
    await maybeResumeSession();
  }
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== 'syncData') {
    return;
  }

  await syncActivityQueue();
});

initialize();
