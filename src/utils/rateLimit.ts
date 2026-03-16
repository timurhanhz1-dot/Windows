
const messageTimestamps: Record<string, number[]> = {};

export function canSendMessage(userId: string, limit = 5, windowMs = 5000) {
  const now = Date.now();
  if (!messageTimestamps[userId]) messageTimestamps[userId] = [];

  messageTimestamps[userId] = messageTimestamps[userId].filter(
    (t) => now - t < windowMs
  );

  if (messageTimestamps[userId].length >= limit) {
    return false;
  }

  messageTimestamps[userId].push(now);
  return true;
}
