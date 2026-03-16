import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { X, Heart, MessageCircle, Send, Trash2, Camera, Music, Code, Leaf, Cpu, MessageSquare, Eye } from 'lucide-react';
import { Post, Comment } from '../types/profile';
import { listenComments, addComment, deletePost, toggleLike } from '../services/postService';
import { auth } from '../firebase';

interface PostDetailModalProps {
  post: Post;
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
  isAdmin?: boolean;
}

export const PostDetailModal: React.FC<PostDetailModalProps> = ({
  post,
  isOpen,
  onClose,
  currentUserId,
  isAdmin = false,
}) => {
  const { t } = useTranslation();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const commentInputRef = useRef<HTMLTextAreaElement>(null);

  const currentUser = auth.currentUser;
  const isOwner = post.userId === currentUserId;
  const canDelete = isOwner || isAdmin;
  const navigate = useNavigate();

  // Listen to comments in real-time
  useEffect(() => {
    if (!isOpen || !post.id) return;

    const unsubscribe = listenComments(post.id, (fetchedComments) => {
      setComments(fetchedComments);
    });

    return () => {
      unsubscribe();
    };
  }, [post.id, isOpen]);

  // Update like state
  useEffect(() => {
    const likes = post.likes || {};
    setIsLiked(!!likes[currentUserId]);
    setLikeCount(Object.keys(likes).length);
  }, [post.likes, currentUserId]);

  // Handle comment submission
  const handleAddComment = async () => {
    if (!newComment.trim() || isSubmitting || !currentUser) return;

    try {
      setIsSubmitting(true);
      await addComment(
        post.id,
        currentUserId,
        currentUser.displayName || currentUser.email?.split('@')[0] || 'User',
        newComment.trim()
      );
      setNewComment('');
      commentInputRef.current?.focus();
    } catch (error) {
      console.error('Failed to add comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle like toggle
  const handleLike = async () => {
    try {
      await toggleLike(post.id, currentUserId);
    } catch (error) {
      console.error('Failed to toggle like:', error);
    }
  };

  // Handle post delete
  const handleDelete = async () => {
    try {
      await deletePost(post.id, currentUserId);
      onClose();
    } catch (error) {
      console.error('Failed to delete post:', error);
    }
  };

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

  const TypeIcon = getTypeIcon(post.type);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-xl z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="bg-[#0B0E11] border border-white/10 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col md:flex-row overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Left side - Post content */}
          <div className="flex-1 flex flex-col bg-black/30">
            {/* Post media or content */}
            {post.media?.url ? (
              <div className="flex-1 bg-black flex items-center justify-center">
                {post.media.type.startsWith('video') ? (
                  <video
                    src={post.media.url}
                    controls
                    className="max-w-full max-h-full"
                  />
                ) : (
                  <img
                    src={post.media.url}
                    alt="post"
                    className="max-w-full max-h-full object-contain"
                  />
                )}
              </div>
            ) : (
              <div className={`flex-1 bg-gradient-to-br ${getTypeColor(post.type)} flex items-center justify-center p-8`}>
                <p className="text-white text-lg leading-relaxed text-center max-w-md">
                  {post.content}
                </p>
              </div>
            )}
          </div>

          {/* Right side - Post details and comments */}
          <div className="w-full md:w-96 flex flex-col bg-white/[0.02]">
            {/* Header */}
            <div className="p-4 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white font-black text-sm">
                  {post.avatar ? (
                    <img src={post.avatar} alt="avatar" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    post.username.substring(0, 2).toUpperCase()
                  )}
                </div>
                <div>
                  <h4
                    className="font-bold text-white text-sm cursor-pointer hover:text-emerald-400 transition-colors"
                    onClick={() => { onClose(); navigate(`/profile/${post.userId}`); }}
                  >{post.username}</h4>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{post.mood}</span>
                    <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r ${getTypeColor(post.type)} border`}>
                      <TypeIcon size={10} className="text-white" />
                      <span className="text-[10px] font-bold text-white uppercase">{post.type}</span>
                    </div>
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/5 rounded-lg transition-colors"
              >
                <X size={20} className="text-white/60" />
              </button>
            </div>

            {/* Post content (if media exists) */}
            {post.media?.url && (
              <div className="p-4 border-b border-white/5">
                <p className="text-white/80 text-sm leading-relaxed">{post.content}</p>
              </div>
            )}

            {/* Post stats */}
            <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={handleLike}
                  className={`flex items-center gap-1.5 text-sm font-bold transition-all ${
                    isLiked ? 'text-red-400' : 'text-white/40 hover:text-red-400'
                  }`}
                >
                  <motion.div
                    animate={isLiked ? { scale: [1, 1.3, 1] } : {}}
                    transition={{ duration: 0.3 }}
                  >
                    <Heart size={18} fill={isLiked ? 'currentColor' : 'none'} />
                  </motion.div>
                  {likeCount}
                </motion.button>
                
                <div className="flex items-center gap-1.5 text-sm font-bold text-white/40">
                  <MessageCircle size={18} />
                  {comments.length}
                </div>

                <div className="flex items-center gap-1.5 text-sm font-bold text-white/40">
                  <Eye size={18} />
                  {post.views || 0}
                </div>
              </div>

              {canDelete && (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="p-2 hover:bg-red-500/10 rounded-lg transition-colors group"
                  title="Sil"
                >
                  <Trash2 size={16} className="text-white/40 group-hover:text-red-400" />
                </button>
              )}
            </div>

            {/* Timestamp */}
            <div className="px-4 py-2 border-b border-white/5">
              <span className="text-xs text-white/40">
                {new Date(post.timestamp).toLocaleDateString('tr-TR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>

            {/* Comments list */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              {comments.length === 0 ? (
                <div className="text-center py-8">
                  <MessageCircle size={32} className="text-white/20 mx-auto mb-2" />
                  <p className="text-white/40 text-sm">{t('post.noComments')}</p>
                  <p className="text-white/30 text-xs mt-1">{t('post.firstComment')}</p>
                </div>
              ) : (
                comments.map((comment) => (
                  <motion.div
                    key={comment.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex gap-3"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white font-black text-xs flex-shrink-0">
                      {comment.avatar ? (
                        <img src={comment.avatar} alt="avatar" className="w-full h-full rounded-full object-cover" />
                      ) : (
                        comment.username.substring(0, 2).toUpperCase()
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-white">{comment.username}</span>
                        <span className="text-[10px] text-white/40">
                          {new Date(comment.timestamp).toLocaleDateString('tr-TR', {
                            hour: '2-digit',
                            minute: '2-digit',
                            day: 'numeric',
                            month: 'short'
                          })}
                        </span>
                      </div>
                      <p className="text-sm text-white/70 leading-relaxed">{comment.content}</p>
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            {/* Comment form */}
            <div className="p-4 border-t border-white/5">
              <div className="flex gap-2">
                <textarea
                  ref={commentInputRef}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleAddComment();
                    }
                  }}
                  placeholder={t('post.commentPlaceholder')}
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white resize-none focus:outline-none focus:border-emerald-500/50 placeholder:text-white/30"
                  rows={2}
                  maxLength={500}
                />
                <button
                  onClick={handleAddComment}
                  disabled={!newComment.trim() || isSubmitting}
                  className="px-3 py-2 bg-emerald-500 text-white rounded-xl text-sm font-bold hover:bg-emerald-600 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Send size={16} />
                </button>
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-[10px] text-white/40">{newComment.length}/500</span>
                <span className="text-[10px] text-emerald-400/60">{t('post.commentEcoPoints')}</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Delete confirmation modal */}
        <AnimatePresence>
          {showDeleteConfirm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center"
              onClick={() => setShowDeleteConfirm(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-[#0B0E11] border border-red-500/20 rounded-2xl p-6 max-w-sm mx-4"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-lg font-bold text-white mb-2">{t('post.deleteTitle')}</h3>
                <p className="text-white/60 text-sm mb-6">
                  {t('post.deleteDesc')}
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 px-4 py-2 bg-white/5 border border-white/10 text-white rounded-xl text-sm font-bold hover:bg-white/10 transition-all"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    onClick={handleDelete}
                    className="flex-1 px-4 py-2 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600 transition-all"
                  >
                    {t('common.delete')}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
};
