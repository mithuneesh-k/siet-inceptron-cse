// Cross-tab broadcast channel for achievement lifecycle events
const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('siet-achievements') : null;

/**
 * Dispatch achievement lifecycle event across current window and all browser tabs.
 * Detail object: { action: 'created' | 'approved' | 'rejected' | 'deleted', userId, achievement, achievementId, score, achievement_count }
 */
export function dispatchAchievementEvent(detail) {
  if (!detail || !detail.action) return;

  // Local window CustomEvent
  window.dispatchEvent(new CustomEvent('achievementChanged', { detail }));

  // Cross-tab BroadcastChannel
  if (channel) {
    try {
      channel.postMessage(detail);
    } catch (err) {
      // Ignore serialization errors
    }
  }
}

/**
 * Subscribe to achievement lifecycle events from local window and other browser tabs.
 * Callback signature: (detail) => void
 */
export function subscribeAchievementEvents(callback) {
  const handleLocalEvent = (e) => {
    if (e?.detail) callback(e.detail);
  };

  window.addEventListener('achievementChanged', handleLocalEvent);

  const handleChannelMessage = (e) => {
    if (e?.data) callback(e.data);
  };

  if (channel) {
    channel.addEventListener('message', handleChannelMessage);
  }

  return () => {
    window.removeEventListener('achievementChanged', handleLocalEvent);
    if (channel) {
      channel.removeEventListener('message', handleChannelMessage);
    }
  };
}
