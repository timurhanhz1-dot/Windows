import React, { memo } from 'react';
import { motion } from 'motion/react';
import { MessageCircle, Eye, Camera, Music, Code, Leaf, Cpu, MessageSquare } from 'lucide-react';
import { Post } from '../types/profile';
import { getMotionProps } from '../utils/animations';
import { LikeButton } from './LikeButton';
import { auth } from '../firebase';

interface PostCardProps {
  post: Post;
  index: number;
  onClick: () => void;
}

// Get post type icon
const getTypeIcon = (type: Post['type']) => {
  const icons = {
    text: MessageSquare,
    photo: Camera,
    music: Music,
    code: Code,
    nature: Leaf,
    tech: Cpu
  };
  return icons[type] || MessageSquare;
};

// Get post type color
const getTypeColor = (type: Post['type']) => {
  const colors = {
    text: 'from-blue-500/20 to-cyan-500/20 border-blue-500/30',
    photo: 'from-purple-500/20 to-pink-500/20 border-purple-500/30',
    music: 'from-pink-500/20 to-rose-500/20 border-pink-500/30',
    code: 'from-green-500/20 to-emerald-500/20 border-green-500/30',
    nature: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/30',
    tech: 'from-cyan-500/20 to-blue-500/20 border-cyan-500/30'
  };
  return colors[type] || colors.text;
};

export const PostCard = memo<PostCardProps>(({ post, index, onClick }) => {
  const TypeIcon = getTypeIcon(post.type);
  const commentCount = Object.keys(post.comments || {}).length;
  const currentUser = auth.currentUser;

  return (
    <motion.div
      {...getMotionProps({
        initial: { opacity: 0, scale: 0.9 },
        animate: { opacity: 1, scale: 1 },
        transition: { delay: index * 0.05, duration: 0.3 }
      })}
      onClick={onClick}
      className="group relative aspect-square bg-white/[0.02] border border-white/5 rounded-xl overflow-hidden cursor-pointer hover:border-emerald-500/30 transition-all"
    >
      {/* Post Media or Content Preview */}
      {post.media?.url ? (
        <div className="absolute inset-0">
          <img 
            src={post.media.thumbnail || post.media.url} 
            alt="post" 
            className="w-full h-full object-cover"
            loading="lazy"
          />
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />
        </div>
      ) : (
        <div className={`absolute inset-0 bg-gradient-to-br ${getTypeColor(post.type)} flex items-center justify-center p-4`}>
          <p className="text-white/80 text-sm line-clamp-4 text-center leading-relaxed">
            {post.content}
          </p>
        </div>
      )}

      {/* Type Badge */}
      <div className="absolute top-2 left-2 z-10">
        <div className={`flex items-center gap-1 px-2 py-1 bg-black/60 backdrop-blur-sm border ${getTypeColor(post.type)} rounded-full`}>
          <TypeIcon size={10} className="text-white" />
          <span className="text-[9px] font-bold text-white uppercase">{post.type}</span>
        </div>
      </div>

      {/* Mood Emoji */}
      {post.mood && (
        <div className="absolute top-2 right-2 z-10 text-lg">
          {post.mood}
        </div>
      )}

      {/* Hover Overlay with Stats */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center gap-3 z-20">
        <div className="flex items-center gap-4">
          {currentUser && (
            <LikeButton
              postId={post.id}
              userId={currentUser.uid}
              initialLikes={post.likes}
              size={16}
              showCount={true}
              className="text-sm"
            />
          )}
          <div className="flex items-center gap-1.5">
            <MessageCircle size={16} className="text-blue-400" />
            <span className="text-sm font-bold text-white">{commentCount}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Eye size={16} className="text-emerald-400" />
            <span className="text-sm font-bold text-white">{post.views || 0}</span>
          </div>
        </div>
        
        {/* Timestamp */}
        <span className="text-xs text-white/60">
          {new Date(post.timestamp).toLocaleDateString('tr-TR', { 
            day: 'numeric', 
            month: 'short',
            year: 'numeric'
          })}
        </span>
      </div>
    </motion.div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for better performance
  return (
    prevProps.post.id === nextProps.post.id &&
    Object.keys(prevProps.post.likes || {}).length === Object.keys(nextProps.post.likes || {}).length &&
    Object.keys(prevProps.post.comments || {}).length === Object.keys(nextProps.post.comments || {}).length &&
    prevProps.post.views === nextProps.post.views &&
    prevProps.index === nextProps.index
  );
});

PostCard.displayName = 'PostCard';
