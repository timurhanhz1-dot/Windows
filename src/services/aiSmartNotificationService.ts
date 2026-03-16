export async function buildSmartNotificationBundle(userId?: string) {
  return {
    priority: [],
    discovery: [],
    nudges: [],
    reason: "AI smart notification bundle placeholder active"
  };
}

export async function buildSmartNotifications(userId?: string) {
  return {
    alerts: [],
    highlights: [],
    reason: "AI smart notifications placeholder active"
  };
}

export async function getSmartNotifications(userId?: string) {
  return [];
}

export default {
  buildSmartNotificationBundle,
  buildSmartNotifications,
  getSmartNotifications,
};
