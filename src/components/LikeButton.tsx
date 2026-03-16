import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Heart } from 'lucide-react';
import { toggleLike, listenLikes } from '../services/postService';

interface LikeButtonProps {
  postId: string;
  userId: string;
  initialLikes?: { [userId: string]: boolean };
  size?: number;
  showCount?: boolean;
  className?: string;
  /** If true, uses a real-time Firebase listener instead of initialLikes prop */
  realtime?: boolean;
}

export const LikeButton: React.FC<LikeButtonProps> = ({
  postId,
  userId,
  initialLikes,
  size = 18,
  showCount = true,
  className = '',
  realtime = false,
}) => {
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  // Real-time listener mode (Requirements: 5.3, 5.6)
  useEffect(() => {
    if (!realtime) return;

    const unsubscribe = listenLikes(postId, (likes) => {
      setIsLiked(!!likes[userId]);
      setLikeCount(Object.keys(likes).length);
    });

    return () => unsubscribe();
  }, [postId, userId, realtime]);

  // Prop-based mode — update when initialLikes changes
  useEffect(() => {
    if (realtime) return;
    const likes = initialLikes || {};
    setIsLiked(!!likes[userId]);
    setLikeCount(Object.keys(likes).length);
  }, [initialLikes, userId, realtime]);

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (isAnimating) return;

    try {
      setIsAnimating(true);

      // Optimistic update (only in prop mode; realtime mode gets Firebase update)
      if (!realtime) {
        const newLikedState = !isLiked;
        setIsLiked(newLikedState);
        setLikeCount(prev => newLikedState ? prev + 1 : prev - 1);
      }

      await toggleLike(postId, userId);
    } catch (error) {
      // Revert optimistic update on error (prop mode only)
      if (!realtime) {
        setIsLiked(prev => !prev);
        setLikeCount(prev => isLiked ? prev + 1 : prev - 1);
      }
      console.error('Failed to toggle like:', error);
    } finally {
      setTimeout(() => setIsAnimating(false), 300);
    }
  };

  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={handleLike}
      className={`flex items-center gap-1.5 font-bold transition-all ${
        isLiked ? 'text-red-400' : 'text-white/40 hover:text-red-400'
      } ${className}`}
    >
      <motion.div
        animate={isLiked && isAnimating ? { scale: [1, 1.3, 1] } : {}}
        transition={{ duration: 0.3 }}
      >
        <Heart size={size} fill={isLiked ? 'currentColor' : 'none'} />
      </motion.div>
      {showCount && <span className="text-sm">{likeCount}</span>}
    </motion.button>
  );
};
