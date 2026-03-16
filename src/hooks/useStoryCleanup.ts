import { useEffect, useRef } from 'react';
import { cleanupExpiredStories } from '../services/storyService';

/**
 * Hook to run story cleanup periodically
 * Requirements: 8.5
 * 
 * Runs cleanup every 5 minutes to remove expired stories (only current user's)
 */
export function useStoryCleanup(userId?: string) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!userId) return;

    cleanupExpiredStories(userId).catch(() => {});

    intervalRef.current = setInterval(() => {
      cleanupExpiredStories(userId).catch(() => {});
    }, 5 * 60 * 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [userId]);
}
