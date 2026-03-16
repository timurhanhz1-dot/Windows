import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Search, UserPlus, UserMinus, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { UserProfile } from '../types/profile';
import { listenFollowers, listenFollowing, followUser, unfollowUser, isFollowing } from '../services/followService';

interface FollowerListModalProps {
  userId: string;
  currentUserId: string;
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'followers' | 'following';
}

export const FollowerListModal = ({
  userId,
  currentUserId,
  isOpen,
  onClose,
  initialTab = 'followers'
}: FollowerListModalProps) => {
  const [activeTab, setActiveTab] = useState<'followers' | 'following'>(initialTab);
  const [followers, setFollowers] = useState<UserProfile[]>([]);
  const [following, setFollowing] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [followingStates, setFollowingStates] = useState<Record<string, boolean>>({});
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Listen to followers
  useEffect(() => {
    if (!isOpen) return;

    const unsubscribe = listenFollowers(userId, (users) => {
      setFollowers(users);
    });

    return unsubscribe;
  }, [userId, isOpen]);

  // Listen to following
  useEffect(() => {
    if (!isOpen) return;

    const unsubscribe = listenFollowing(userId, (users) => {
      setFollowing(users);
    });

    return unsubscribe;
  }, [userId, isOpen]);

  // Load following states for all users
  useEffect(() => {
    if (!isOpen) return;

    const loadFollowingStates = async () => {
      const users = activeTab === 'followers' ? followers : following;
      const states: Record<string, boolean> = {};

      for (const user of users) {
        if (user.id !== currentUserId) {
          states[user.id] = await isFollowing(currentUserId, user.id);
        }
      }

      setFollowingStates(states);
    };

    loadFollowingStates();
  }, [followers, following, activeTab, currentUserId, isOpen]);

  const handleToggleFollow = async (targetUserId: string) => {
    if (targetUserId === currentUserId) return;

    setLoadingStates(prev => ({ ...prev, [targetUserId]: true }));

    try {
      const isCurrentlyFollowing = followingStates[targetUserId];

      if (isCurrentlyFollowing) {
        await unfollowUser(currentUserId, targetUserId);
        setFollowingStates(prev => ({ ...prev, [targetUserId]: false }));
      } else {
        await followUser(currentUserId, targetUserId);
        setFollowingStates(prev => ({ ...prev, [targetUserId]: true }));
      }
    } catch (error) {
      console.error('Toggle follow error:', error);
    } finally {
      setLoadingStates(prev => ({ ...prev, [targetUserId]: false }));
    }
  };

  const handleUserClick = (targetUserId: string) => {
    navigate(`/profile/${targetUserId}`);
    onClose();
  };

  // Filter users based on search query
  const currentUsers = activeTab === 'followers' ? followers : following;
  const filteredUsers = currentUsers.filter(user => {
    const query = searchQuery.toLowerCase();
    return (
      user.username.toLowerCase().includes(query) ||
      user.displayName?.toLowerCase().includes(query)
    );
  });

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="bg-gradient-to-br from-[#1a1d29] to-[#0f1117] rounded-2xl border border-white/10 shadow-2xl max-w-lg w-full max-h-[80vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-6 border-b border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">{t('followers.title')}</h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/5 rounded-xl transition-colors"
              >
                <X className="w-5 h-5 text-white/60" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 bg-white/5 p-1 rounded-xl">
              <button
                onClick={() => setActiveTab('followers')}
                className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-all ${
                  activeTab === 'followers'
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                {t('followers.followers')} ({followers.length})
              </button>
              <button
                onClick={() => setActiveTab('following')}
                className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-all ${
                  activeTab === 'following'
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                {t('followers.following')} ({following.length})
              </button>
            </div>

            {/* Search Input */}
            <div className="mt-4 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('followers.searchPlaceholder')}
                className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-emerald-500/50 transition-colors"
              />
            </div>
          </div>

          {/* User List */}
          <div className="overflow-y-auto max-h-[calc(80vh-240px)] p-4">
            {filteredUsers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
                  <User className="w-8 h-8 text-white/40" />
                </div>
                <p className="text-white/60 mb-1">
                  {searchQuery
                    ? t('followers.noResults')
                    : activeTab === 'followers'
                    ? t('followers.noFollowers')
                    : t('followers.noFollowing')}
                </p>
                <p className="text-sm text-white/40">
                  {searchQuery
                    ? t('followers.tryDifferent')
                    : t('followers.comingSoon')}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredUsers.map((user, index) => (
                  <motion.div
                    key={user.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors group"
                  >
                    {/* Avatar */}
                    <button
                      onClick={() => handleUserClick(user.id)}
                      className="relative flex-shrink-0"
                    >
                      <div className="w-12 h-12 rounded-xl overflow-hidden border-2 border-white/10 group-hover:border-emerald-500/50 transition-colors">
                        {user.avatar ? (
                          <img
                            src={user.avatar}
                            alt={user.username}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center">
                            <User className="w-6 h-6 text-emerald-400" />
                          </div>
                        )}
                      </div>
                      {user.is_verified && (
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full flex items-center justify-center border-2 border-[#1a1d29]">
                          <span className="text-xs">✓</span>
                        </div>
                      )}
                    </button>

                    {/* User Info */}
                    <button
                      onClick={() => handleUserClick(user.id)}
                      className="flex-1 text-left min-w-0"
                    >
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-white truncate">
                          {user.displayName || user.username}
                        </p>
                        {user.is_admin && (
                          <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded-md border border-purple-500/30">
                            Admin
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-white/40 truncate">@{user.username}</p>
                    </button>

                    {/* Follow/Unfollow Button */}
                    {user.id !== currentUserId && (
                      <button
                        onClick={() => handleToggleFollow(user.id)}
                        disabled={loadingStates[user.id]}
                        className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                          followingStates[user.id]
                            ? 'bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border border-white/10'
                            : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {loadingStates[user.id] ? (
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : followingStates[user.id] ? (
                          <>
                            <UserMinus className="w-4 h-4" />
                            <span className="hidden sm:inline">{t('followers.unfollow')}</span>
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-4 h-4" />
                            <span className="hidden sm:inline">{t('followers.follow')}</span>
                          </>
                        )}
                      </button>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
