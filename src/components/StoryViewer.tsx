import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronLeft, ChevronRight, Smile } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import { Story } from '../types/profile';
import { viewStory, addStoryReaction } from '../services/storyService';
import { EmojiPicker } from './EmojiPicker';

interface StoryViewerProps {
  stories: Story[];
  initialIndex?: number;
  currentUserId: string;
  onClose: () => void;
}

export const StoryViewer = ({ 
  stories, 
  initialIndex = 0, 
  currentUserId,
  onClose 
}: StoryViewerProps) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [userReaction, setUserReaction] = useState<string | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const viewTrackedRef = useRef<Set<string>>(new Set());

  const currentStory = stories[currentIndex];
  const duration = currentStory?.duration || 5; // seconds
  const progressStep = 100 / (duration * 60); // 60 FPS

  // Track story view
  useEffect(() => {
    if (!currentStory || viewTrackedRef.current.has(currentStory.id)) return;

    // Track view
    viewStory(currentStory.id, currentUserId, currentStory.userId).catch(err => {
      console.error('Failed to track story view:', err);
    });

    viewTrackedRef.current.add(currentStory.id);
  }, [currentStory, currentUserId]);

  // Load user's reaction for current story
  useEffect(() => {
    if (!currentStory) return;
    
    const reaction = currentStory.reactions?.[currentUserId];
    setUserReaction(reaction || null);
  }, [currentStory, currentUserId]);

  // Progress bar animation
  useEffect(() => {
    if (isPaused || !currentStory) return;

    setProgress(0);
    
    progressIntervalRef.current = setInterval(() => {
      setProgress(prev => {
        const next = prev + progressStep;
        
        if (next >= 100) {
          // Auto-advance to next story
          if (currentIndex < stories.length - 1) {
            setCurrentIndex(currentIndex + 1);
          } else {
            // Last story finished, close viewer
            onClose();
          }
          return 0;
        }
        
        return next;
      });
    }, 1000 / 60); // 60 FPS

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [currentIndex, isPaused, currentStory, stories.length, progressStep, onClose]);

  // Navigate to previous story
  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setProgress(0);
    }
  };

  // Navigate to next story
  const handleNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setProgress(0);
    } else {
      onClose();
    }
  };

  // Handle emoji reaction
  const handleReaction = async (emoji: string) => {
    if (!currentStory) return;

    try {
      await addStoryReaction(
        currentStory.id,
        currentUserId,
        currentStory.userId,
        emoji
      );
      setUserReaction(emoji);
      setShowEmojiPicker(false);
    } catch (error) {
      console.error('Failed to add reaction:', error);
    }
  };

  // Handle touch/swipe navigation
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    touchEndX.current = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX.current;

    // Swipe threshold: 50px
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        // Swipe left - next story
        handleNext();
      } else {
        // Swipe right - previous story
        handlePrevious();
      }
    }
  };

  // Handle click navigation (left/right side of screen)
  const handleScreenClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const screenWidth = rect.width;

    // Left third: previous, right two-thirds: next
    if (clickX < screenWidth / 3) {
      handlePrevious();
    } else {
      handleNext();
    }
  };

  if (!currentStory) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black z-50 flex items-center justify-center"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Story Content */}
        <div 
          className="relative w-full h-full max-w-[500px] mx-auto cursor-pointer"
          onClick={handleScreenClick}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {/* Progress bars */}
          <div className="absolute top-0 left-0 right-0 z-20 flex gap-1 p-2">
            {stories.map((_, index) => (
              <div
                key={index}
                className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden"
              >
                <motion.div
                  className="h-full bg-white rounded-full"
                  initial={{ width: '0%' }}
                  animate={{
                    width: index < currentIndex 
                      ? '100%' 
                      : index === currentIndex 
                        ? `${progress}%` 
                        : '0%'
                  }}
                  transition={{ duration: 0.1 }}
                />
              </div>
            ))}
          </div>

          {/* Story Header */}
          <div className="absolute top-4 left-0 right-0 z-20 px-4 mt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white">
                  {currentStory.avatar ? (
                    <img
                      src={currentStory.avatar}
                      alt={currentStory.username}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-emerald-600 via-teal-500 to-cyan-500 flex items-center justify-center text-sm font-black text-white">
                      {currentStory.username.substring(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>

                {/* User info */}
                <div>
                  <p className="text-white font-medium text-sm drop-shadow-lg">
                    {currentStory.username}
                  </p>
                  <p className="text-white/80 text-xs drop-shadow-lg">
                    {getTimeAgo(currentStory.createdAt)}
                  </p>
                </div>
              </div>

              {/* Close button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-white drop-shadow-lg" />
              </button>
            </div>
          </div>

          {/* Story Media */}
          <div className="w-full h-full flex items-center justify-center bg-black">
            {currentStory.media.type === 'video' ? (
              <video
                key={currentStory.id}
                src={currentStory.media.url}
                className="w-full h-full object-contain"
                autoPlay
                loop
                playsInline
                onPlay={() => setIsPaused(false)}
                onPause={() => setIsPaused(true)}
              />
            ) : (
              <img
                src={currentStory.media.url}
                alt="Story"
                className="w-full h-full object-contain"
              />
            )}
          </div>

          {/* Navigation buttons (desktop) */}
          <div className="hidden md:block">
            {currentIndex > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrevious();
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-3 bg-black/40 hover:bg-black/60 rounded-full transition-colors backdrop-blur-sm"
              >
                <ChevronLeft className="w-6 h-6 text-white" />
              </button>
            )}

            {currentIndex < stories.length - 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleNext();
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-3 bg-black/40 hover:bg-black/60 rounded-full transition-colors backdrop-blur-sm"
              >
                <ChevronRight className="w-6 h-6 text-white" />
              </button>
            )}
          </div>

          {/* Reaction section */}
          <div className="absolute bottom-0 left-0 right-0 z-20 p-4 bg-gradient-to-t from-black/60 to-transparent">
            <div className="flex items-center justify-between">
              {/* View count */}
              <div className="flex items-center gap-2 text-white/80 text-sm">
                <span>👁️</span>
                <span>{Object.keys(currentStory.views || {}).length} görüntülenme</span>
              </div>

              {/* Reaction button */}
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowEmojiPicker(!showEmojiPicker);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full transition-colors"
                >
                  {userReaction ? (
                    <span className="text-2xl">{userReaction}</span>
                  ) : (
                    <Smile className="w-5 h-5 text-white" />
                  )}
                  <span className="text-white text-sm font-medium">
                    {userReaction ? 'Tepki' : 'Tepki Ver'}
                  </span>
                </button>

                {/* Emoji Picker */}
                {showEmojiPicker && (
                  <div onClick={(e) => e.stopPropagation()}>
                    <EmojiPicker
                      onSelect={handleReaction}
                      onClose={() => setShowEmojiPicker(false)}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Reactions preview */}
            {Object.keys(currentStory.reactions || {}).length > 0 && (
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                {Object.entries(currentStory.reactions || {})
                  .slice(0, 5)
                  .map(([userId, emoji]) => (
                    <span key={userId} className="text-xl">
                      {emoji}
                    </span>
                  ))}
                {Object.keys(currentStory.reactions || {}).length > 5 && (
                  <span className="text-white/60 text-sm">
                    +{Object.keys(currentStory.reactions || {}).length - 5}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Paused indicator */}
          {isPaused && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-black/60 backdrop-blur-sm rounded-full p-4"
              >
                <div className="w-12 h-12 flex items-center justify-center">
                  <div className="flex gap-1.5">
                    <div className="w-1.5 h-8 bg-white rounded-full" />
                    <div className="w-1.5 h-8 bg-white rounded-full" />
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

// Helper function to get time ago
function getTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return i18n.t('common.hoursAgo', { count: hours, defaultValue: `${hours}h ago` });
  } else if (minutes > 0) {
    return i18n.t('common.minutesAgo', { count: minutes, defaultValue: `${minutes}m ago` });
  } else {
    return i18n.t('common.justNow', 'Just now');
  }
}
