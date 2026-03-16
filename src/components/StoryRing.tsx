import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Plus } from 'lucide-react';
import { Story } from '../types/profile';
import { db } from '../firebase';
import { ref, onValue, off, get } from 'firebase/database';
import { getUser } from '../services/firebaseService';

interface StoryRingProps {
  currentUserId: string;
  onStoryClick: (userId: string, stories: Story[]) => void;
  onCreateStory: () => void;
}

interface UserWithStories {
  userId: string;
  username: string;
  avatar?: string;
  stories: Story[];
  hasUnviewed: boolean;
}

export const StoryRing = ({ currentUserId, onStoryClick, onCreateStory }: StoryRingProps) => {
  const [usersWithStories, setUsersWithStories] = useState<UserWithStories[]>([]);
  const [currentUserStories, setCurrentUserStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUserId) return;
    setLoading(true);

    const now = Date.now();

    // Listen to current user's own stories directly
    const myStoriesRef = ref(db, `stories/${currentUserId}`);
    const unsubMyStories = onValue(myStoriesRef, (snap) => {
      const data = snap.val() || {};
      const myStories: Story[] = Object.entries(data)
        .filter(([, val]: any) => val.expiresAt > now)
        .map(([id, val]: any) => ({
          id,
          userId: val.userId,
          username: val.username,
          avatar: val.avatar || '',
          media: val.media,
          duration: val.duration || 5,
          createdAt: val.createdAt,
          expiresAt: val.expiresAt,
          views: val.views || {},
          reactions: val.reactions || {},
        }))
        .sort((a, b) => b.createdAt - a.createdAt);

      setCurrentUserStories(myStories);
      setLoading(false);
    });

    // Listen to following list and fetch their stories
    const followingRef = ref(db, `following/${currentUserId}`);
    const unsubFollowing = onValue(followingRef, async (snap) => {
      const followingData = snap.val() || {};
      const followingIds = Object.keys(followingData);

      const usersData: UserWithStories[] = [];

      for (const uid of followingIds) {
        if (uid === currentUserId) continue;
        try {
          const storiesSnap = await get(ref(db, `stories/${uid}`));
          const storiesData = storiesSnap.val() || {};

          const userStories: Story[] = Object.entries(storiesData)
            .filter(([, val]: any) => val.expiresAt > now)
            .map(([id, val]: any) => ({
              id,
              userId: val.userId,
              username: val.username,
              avatar: val.avatar || '',
              media: val.media,
              duration: val.duration || 5,
              createdAt: val.createdAt,
              expiresAt: val.expiresAt,
              views: val.views || {},
              reactions: val.reactions || {},
            }));

          if (userStories.length > 0) {
            const userData = await getUser(uid);
            const hasUnviewed = userStories.some(
              (s) => !s.views || !s.views[currentUserId]
            );
            usersData.push({
              userId: uid,
              username: userData?.username || userData?.displayName || 'Kullanıcı',
              avatar: userData?.avatar || userData?.photoURL,
              stories: userStories.sort((a, b) => b.createdAt - a.createdAt),
              hasUnviewed,
            });
          }
        } catch {
          // skip user on error
        }
      }

      usersData.sort((a, b) => (b.hasUnviewed ? 1 : 0) - (a.hasUnviewed ? 1 : 0));
      setUsersWithStories(usersData);
    });

    return () => {
      unsubMyStories();
      unsubFollowing();
    };
  }, [currentUserId]);

  return (
    <div className="mb-6">
      <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide">

        {/* Create Story Button - Always visible */}
        <motion.button
          onClick={onCreateStory}
          className="flex-shrink-0 flex flex-col items-center gap-2 group"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 p-[2px]">
              <div className="w-full h-full rounded-full bg-[#0B0E11]" />
            </div>
            <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border-2 border-emerald-500/30 flex items-center justify-center group-hover:border-emerald-500/60 transition-all">
              <Plus className="w-6 h-6 text-emerald-400" />
            </div>
          </div>
          <span className="text-xs text-white/60 font-medium max-w-[64px] truncate">
            Hikaye Ekle
          </span>
        </motion.button>

        {/* Current User's Stories */}
        {currentUserStories.length > 0 && (
          <motion.button
            onClick={() => onStoryClick(currentUserId, currentUserStories)}
            className="flex-shrink-0 flex flex-col items-center gap-2 group"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <StoryAvatar
              avatar={currentUserStories[0].avatar}
              username="Hikayeniz"
              hasUnviewed={false}
              isOwn={true}
            />
            <span className="text-xs text-white/80 font-medium max-w-[64px] truncate">
              Hikayeniz
            </span>
          </motion.button>
        )}

        {/* Loading skeletons for following stories */}
        {loading && [1, 2, 3].map((i) => (
          <div key={i} className="flex-shrink-0 flex flex-col items-center gap-2">
            <div className="w-16 h-16 rounded-full bg-white/5 animate-pulse" />
            <div className="w-12 h-3 bg-white/5 rounded animate-pulse" />
          </div>
        ))}

        {/* Following Users' Stories */}
        {usersWithStories.map((user) => (
          <motion.button
            key={user.userId}
            onClick={() => onStoryClick(user.userId, user.stories)}
            className="flex-shrink-0 flex flex-col items-center gap-2 group"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <StoryAvatar
              avatar={user.avatar}
              username={user.username}
              hasUnviewed={user.hasUnviewed}
              isOwn={false}
            />
            <span className="text-xs text-white/80 font-medium max-w-[64px] truncate">
              {user.username}
            </span>
          </motion.button>
        ))}
      </div>
    </div>
  );
};

interface StoryAvatarProps {
  avatar?: string;
  username: string;
  hasUnviewed: boolean;
  isOwn: boolean;
}

const StoryAvatar = ({ avatar, username, hasUnviewed, isOwn }: StoryAvatarProps) => {
  return (
    <div className="relative">
      <div
        className={`absolute inset-0 rounded-full p-[2px] ${
          hasUnviewed
            ? 'bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500'
            : isOwn
            ? 'bg-gradient-to-br from-emerald-500/50 via-teal-500/50 to-cyan-500/50'
            : 'bg-white/20'
        }`}
      >
        <div className="w-full h-full rounded-full bg-[#0B0E11]" />
      </div>
      <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-[#0B0E11]">
        {avatar ? (
          <img src={avatar} alt={username} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-emerald-600 via-teal-500 to-cyan-500 flex items-center justify-center text-lg font-black text-white">
            {username.substring(0, 2).toUpperCase()}
          </div>
        )}
      </div>
      {hasUnviewed && (
        <div className="absolute bottom-0 right-0 w-4 h-4 bg-emerald-500 rounded-full border-2 border-[#0B0E11]" />
      )}
    </div>
  );
};
