import ProfileAiInsightsCard from "./ProfileAiInsightsCard";
import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { auth } from '../firebase';
import { updateProfile as updateFirebaseAuthProfile, signOut } from 'firebase/auth';
import { getUser, checkDailyReward } from '../services/firebaseService';
import { updateProfile, uploadProfilePhoto, uploadCoverPhoto, updateUsername, recordProfileVisit } from '../services/profileService';
import { followUser, unfollowUser, isFollowing as checkIsFollowing, listenFollowerCount, listenFollowingCount } from '../services/followService';
import { FollowerListModal } from './FollowerListModal';
import { blockUser, unblockUser, isBlocked } from '../services/blockService';
import { db } from '../firebase';
import { ref, set, get, remove } from 'firebase/database';
import {
  Camera, Edit3, Save, X, Twitter, Github, Instagram, LogOut,
  Star, Shield, Zap, Award, Gift, ChevronRight, ChevronDown, Globe, BadgeCheck, Clock, CheckCircle2, Leaf, Ban
} from 'lucide-react';
import { BadgeDisplay } from './BadgeSystem';
import { StatusDot } from './UserStatusSystem';
import { PostGrid } from './PostGrid';
import { CreatePostModal } from './CreatePostModal';
import { StoryRing } from './StoryRing';
import { CreateStoryModal } from './CreateStoryModal';
import { StoryViewer } from './StoryViewer';
import { getBookmarkedPosts, toggleBookmark } from '../services/postService';
import { Post } from '../types/profile';

const BADGE_CONFIG: Record<string, { label: string, color: string, icon: any }> = {
  founder: { label: 'Kurucu', color: 'text-yellow-400', icon: '👑' },
  admin: { label: 'Admin', color: 'text-red-400', icon: '🛡️' },
  early: { label: 'Erken Üye', color: 'text-purple-400', icon: '⭐' },
  active: { label: 'Aktif Üye', color: 'text-emerald-400', icon: '🌿' },
  chatty: { label: 'Sohbetçi', color: 'text-blue-400', icon: '💬' },
};

const getXPLevel = (xp: number) => {
  const level = Math.floor(xp / 100) + 1;
  const progress = xp % 100;
  return { level, progress };
};

export const ProfilePage = ({ theme, userId, viewUserId }: { theme: any, userId: string, viewUserId?: string }) => {
  const targetId = viewUserId || userId;
  const isOwnProfile = targetId === userId;
  const { t } = useTranslation();

  const [user, setUser] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [editSocial, setEditSocial] = useState({ twitter: '', github: '', instagram: '' });
  const [editIsPrivate, setEditIsPrivate] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dailyReward, setDailyReward] = useState<{ claimed: boolean, xp: number } | null>(null);
  const [verifyRequest, setVerifyRequest] = useState<any>(null);
  const [verifyNote, setVerifyNote] = useState('');
  const [badgeExpanded, setBadgeExpanded] = useState(false);
  const [verifySubmitting, setVerifySubmitting] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOwnProfile && userId) {
      recordProfileVisit(userId, targetId);
    }
  }, [targetId, userId, isOwnProfile]);

  useEffect(() => {
    const load = async () => {
      const data = await getUser(targetId);
      if (data) {
        setUser(data);
        setEditDisplayName(data.displayName || data.username || '');
        setEditUsername(data.username || '');
        setEditBio(data.bio || '');
        setEditStatus(data.status_message || '');
        setEditSocial(data.social_links || {});
        setEditIsPrivate(data.is_private || false);
      } else {
        // DB'de kayıt yoksa Firebase Auth'dan temel profil oluştur
        const firebaseUser = auth.currentUser;
        if (firebaseUser && firebaseUser.uid === targetId) {
          const fallback = {
            id: firebaseUser.uid,
            username: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Kullanıcı',
            displayName: firebaseUser.displayName || '',
            email: firebaseUser.email || '',
            status: 'online',
            is_admin: false,
            is_verified: false,
          };
          // DB'ye yaz ki bir daha sorun çıkmasın
          try {
            const { set: dbSet, ref: dbRef } = await import('firebase/database');
            const { db: database } = await import('../firebase');
            await dbSet(dbRef(database, 'users/' + targetId), fallback);
          } catch {}
          setUser(fallback);
        }
      }
    };
    load();
  }, [targetId]);

  useEffect(() => {
    if (isOwnProfile) {
      const reqRef = ref(db, `verification_requests/${userId}`);
      get(reqRef).then(snap => {
        if (snap.exists()) setVerifyRequest(snap.val());
      });
    }
  }, [userId, isOwnProfile]);

  useEffect(() => {
    if (isOwnProfile) {
      checkDailyReward(userId).then(setDailyReward);
    }
  }, [userId, isOwnProfile]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploading(true);
    setUploadError('');
    setSaveError('');
    setSaveSuccess(false);
    
    try {
      // Use profileService.uploadProfilePhoto which handles validation and upload
      const url = await uploadProfilePhoto(userId, file);
      
      // Update Firebase Auth profile
      if (auth.currentUser) {
        await updateFirebaseAuthProfile(auth.currentUser, { photoURL: url });
      }
      
      // Update local state
      setUser((prev: any) => ({ ...prev, avatar: url }));
    } catch (err: any) {
      // Handle ProfileError with user-friendly messages
      if (err.code === 'FILE_TOO_LARGE') {
        setUploadError('Dosya 5MB\'den büyük olamaz');
      } else if (err.code === 'INVALID_FILE_TYPE') {
        setUploadError('Sadece JPG, PNG, WebP veya GIF yüklenebilir');
      } else {
        setUploadError('Yükleme başarısız. Tekrar dene.');
      }
      console.error('Avatar upload error:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError('');
    setSaveSuccess(false);
    
    try {
      // Kullanıcı adı değiştiyse önce onu güncelle
      if (editUsername.trim().toLowerCase() !== (user.username || '').toLowerCase()) {
        await updateUsername(userId, editUsername.trim(), user.username || '');
      }

      // Use profileService.updateProfile which handles validation
      await updateProfile(userId, {
        displayName: editDisplayName.trim() || undefined,
        bio: editBio,
        status_message: editStatus,
        social_links: editSocial,
        is_private: editIsPrivate,
      });
      
      // Update local state
      setUser((prev: any) => ({ 
        ...prev,
        username: editUsername.trim().toLowerCase() || prev.username,
        displayName: editDisplayName.trim() || prev.displayName,
        bio: editBio, 
        status_message: editStatus, 
        social_links: editSocial,
        is_private: editIsPrivate,
      }));
      
      setEditing(false);
      setSaveSuccess(true);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      // Handle ProfileError with user-friendly messages
      if (err.code === 'CONTENT_TOO_LONG') {
        setSaveError(err.message);
      } else {
        setSaveError('Profil güncellenemedi. Tekrar dene.');
      }
      console.error('Profile update error:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleVerifySubmit = async () => {
    if (!verifyNote.trim()) return;
    setVerifySubmitting(true);
    await set(ref(db, `verification_requests/${userId}`), {
      userId,
      username: user.username,
      email: user.email || '',
      note: verifyNote.trim(),
      requestedAt: new Date().toISOString(),
      status: 'pending',
    });
    setVerifyRequest({ status: 'pending', note: verifyNote.trim() });
    setVerifyNote('');
    setVerifySubmitting(false);
  };

  const handleVerifyCancel = async () => {
    await remove(ref(db, `verification_requests/${userId}`));
    setVerifyRequest(null);
  };

  const handleLogout = async () => {
    // Note: We still use the old updateUser for status updates since it's a simple operation
    // and doesn't need the full profileService validation
    const { updateUser } = await import('../services/firebaseService');
    await updateUser(userId, { status: 'offline' });
    await signOut(auth);
    window.location.href = '/landing';
  };

  const [profileTab, setProfileTab] = useState<'posts' | 'badges' | 'about' | 'bookmarks'>('posts');
  const [bookmarkedPosts, setBookmarkedPosts] = useState<Post[]>([]);
  const [bookmarksLoading, setBookmarksLoading] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const coverFileRef = useRef<HTMLInputElement>(null);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isBlockedByMe, setIsBlockedByMe] = useState(false);
  const [showCreatePostModal, setShowCreatePostModal] = useState(false);
  const [showCreateStoryModal, setShowCreateStoryModal] = useState(false);
  const [selectedStoryUserId, setSelectedStoryUserId] = useState<string | null>(null);
  const [selectedStories, setSelectedStories] = useState<any[]>([]);
  const [showFollowerModal, setShowFollowerModal] = useState(false);
  const [followerModalTab, setFollowerModalTab] = useState<'followers' | 'following'>('followers');

  // Real-time follower/following counts using followService
  useEffect(() => {
    if (!targetId) return;
    
    // Listen to follower count changes in real-time
    const unsubFollowers = listenFollowerCount(targetId, (count) => {
      setFollowerCount(count);
    });
    
    // Listen to following count changes in real-time
    const unsubFollowing = listenFollowingCount(targetId, (count) => {
      setFollowingCount(count);
    });
    
    // Check if current user is following the target user
    if (!isOwnProfile) {
      checkIsFollowing(userId, targetId).then(setIsFollowing);
      isBlocked(userId, targetId).then(setIsBlockedByMe);
    }
    
    // Cleanup listeners on unmount
    return () => {
      unsubFollowers();
      unsubFollowing();
    };
  }, [targetId, userId, isOwnProfile]);

  const handleFollow = async () => {
    if (isOwnProfile) return;
    
    try {
      if (isFollowing) {
        await unfollowUser(userId, targetId);
        setIsFollowing(false);
      } else {
        await followUser(userId, targetId);
        setIsFollowing(true);
      }
    } catch (error) {
      console.error('Follow/unfollow error:', error);
    }
  };

  const handleBlock = async () => {
    if (isOwnProfile) return;
    try {
      if (isBlockedByMe) {
        await unblockUser(userId, targetId);
        setIsBlockedByMe(false);
      } else {
        await blockUser(userId, targetId);
        setIsBlockedByMe(true);
        if (isFollowing) {
          await unfollowUser(userId, targetId);
          setIsFollowing(false);
        }
      }
    } catch (error) {
      console.error('Block/unblock error:', error);
    }
  };

  const handleTogglePrivate = async () => {
    const newVal = !user.is_private;
    try {
      await updateProfile(userId, { is_private: newVal });
      setUser((prev: any) => ({ ...prev, is_private: newVal }));
      setEditIsPrivate(newVal);
    } catch (error) {
      console.error('Privacy toggle error:', error);
    }
  };

  useEffect(() => {
    if (profileTab === 'bookmarks' && isOwnProfile) {
      setBookmarksLoading(true);
      getBookmarkedPosts(userId).then(posts => {
        setBookmarkedPosts(posts);
        setBookmarksLoading(false);
      }).catch(() => setBookmarksLoading(false));
    }
  }, [profileTab, userId, isOwnProfile]);

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setCoverUploading(true);
    setUploadError('');
    setSaveError('');
    setSaveSuccess(false);
    
    try {
      // Use profileService.uploadCoverPhoto which handles validation and upload
      const url = await uploadCoverPhoto(userId, file);
      
      // Update local state
      setUser((prev: any) => ({ ...prev, cover_photo: url }));
    } catch (err: any) {
      // Handle ProfileError with user-friendly messages
      if (err.code === 'FILE_TOO_LARGE') {
        setUploadError('Dosya 5MB\'den büyük olamaz');
      } else if (err.code === 'INVALID_FILE_TYPE') {
        setUploadError('Sadece JPG, PNG, WebP veya GIF yüklenebilir');
      } else {
        setUploadError('Yükleme başarısız. Tekrar dene.');
      }
      console.error('Cover upload error:', err);
    } finally {
      setCoverUploading(false);
    }
  };

  if (!user) return <div className="flex-1 flex items-center justify-center text-white/40">{t('common.loading')}</div>;

  const { level, progress } = getXPLevel(user.xp || 0);
  const joinDate = user.createdAt ? new Date(user.createdAt).toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' }) : '';
  const friendCount = Object.keys(user.friends || {}).length;

  return (
    <div className="flex-1 overflow-y-auto h-full bg-[#0B0E11]" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>

      {/* ═══ NATURE ECOSYSTEM HEADER ═══ */}
      <div className="relative h-36 md:h-52 overflow-hidden group flex-shrink-0">
        {/* Animated nature background with multiple layers */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/40 via-teal-800/30 to-cyan-900/40">
          {/* Animated orbs */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-10 left-10 w-32 h-32 bg-emerald-500/20 rounded-full blur-3xl animate-pulse" />
            <div className="absolute top-20 right-20 w-40 h-40 bg-teal-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
            <div className="absolute bottom-10 left-1/2 w-36 h-36 bg-cyan-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
          </div>
          
          {/* Pattern overlay */}
          <div className="absolute inset-0" style={{ 
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%2310b981' fill-opacity='0.05'%3E%3Cpath d='M20 20c0-5.5-4.5-10-10-10s-10 4.5-10 10 4.5 10 10 10 10-4.5 10-10zm10 0c0-5.5-4.5-10-10-10s-10 4.5-10 10 4.5 10 10 10 10-4.5 10-10zm10 0c0-5.5-4.5-10-10-10s-10 4.5-10 10 4.5 10 10 10 10-4.5 10-10zm10 0c0-5.5-4.5-10-10-10s-10 4.5-10 10 4.5 10 10 10 10-4.5 10-10z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            opacity: 0.3
          }} />
        </div>
        
        {/* User's cover photo overlay */}
        {user.cover_photo && (
          <img src={user.cover_photo} alt="cover" className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-80" />
        )}

        {/* Floating nature elements with staggered animation */}
        <div className="absolute top-4 left-4 text-2xl md:text-3xl animate-bounce opacity-70" style={{ animationDelay: '0s', animationDuration: '3s' }}>🌿</div>
        <div className="absolute top-8 right-8 text-xl md:text-2xl animate-bounce opacity-70" style={{ animationDelay: '0.5s', animationDuration: '3.5s' }}>🍃</div>
        <div className="absolute bottom-8 left-12 text-2xl md:text-3xl animate-bounce opacity-70" style={{ animationDelay: '1s', animationDuration: '4s' }}>🌱</div>
        <div className="absolute bottom-4 right-16 text-xl md:text-2xl animate-bounce opacity-70" style={{ animationDelay: '1.5s', animationDuration: '3.2s' }}>🌲</div>
        <div className="absolute top-1/2 left-1/4 text-lg md:text-xl animate-bounce opacity-50" style={{ animationDelay: '2s', animationDuration: '3.8s' }}>🌺</div>
        <div className="absolute top-1/3 right-1/3 text-lg md:text-xl animate-bounce opacity-50" style={{ animationDelay: '2.5s', animationDuration: '4.2s' }}>🦋</div>

        {/* Cover photo upload button */}
        {isOwnProfile && (
          <>
            <button
              onClick={() => coverFileRef.current?.click()}
              className="absolute top-4 right-4 px-3 py-2 bg-black/40 backdrop-blur-xl border border-emerald-500/30 rounded-lg text-xs font-bold opacity-0 group-hover:opacity-100 transition-all flex items-center gap-2 hover:bg-black/60 hover:border-emerald-500/50 text-emerald-300"
            >
              <Camera size={14} /> 
              <span className="hidden md:inline">{coverUploading ? 'Yükleniyor...' : 'Kapak Güncelle'}</span>
              <span className="md:hidden">{coverUploading ? '...' : 'Kapak'}</span>
            </button>
            <input ref={coverFileRef} type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
          </>
        )}
        
        {/* Gradient fade to bottom - enhanced */}
        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-[#0B0E11] via-[#0B0E11]/90 to-transparent" />
      </div>

      {/* ═══ PROFILE HEADER ═══ */}
      <div className="px-3 md:px-6 max-w-2xl mx-auto relative pb-20">
        {/* ═══ NATURE AVATAR CRYSTAL ═══ */}
        <div className="flex items-end gap-3 -mt-12 md:-mt-16 mb-3 relative z-10">
          <div className="relative flex-shrink-0">
            {/* Crystal frame with nature glow */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/30 via-teal-500/20 to-cyan-500/30 rounded-full blur-xl animate-pulse" />
              <div className="relative w-20 h-20 md:w-28 md:h-28 rounded-full border-2 border-emerald-500/30 bg-gradient-to-br from-emerald-900/50 via-teal-900/30 to-cyan-900/50 overflow-hidden shadow-2xl">
                {user.avatar ? (
                  <img src={user.avatar} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-emerald-600 via-teal-500 to-cyan-500 flex items-center justify-center text-3xl md:text-4xl font-black text-white">
                    {user.username?.substring(0, 2).toUpperCase()}
                  </div>
                )}
              </div>
              
              {/* Nature ring decoration */}
              <div className="absolute -inset-2 border-2 border-emerald-500/20 rounded-full" />
              <div className="absolute -inset-4 border border-emerald-500/10 rounded-full" />
              
              {/* Floating nature elements around avatar */}
              <div className="absolute -top-2 -left-2 text-lg animate-bounce" style={{ animationDelay: '0s' }}>🌿</div>
              <div className="absolute -bottom-2 -right-2 text-lg animate-bounce" style={{ animationDelay: '1s' }}>🍃</div>
            </div>

            {isOwnProfile && (
              <>
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="absolute bottom-0 right-0 w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full flex items-center justify-center shadow-lg hover:shadow-xl hover:from-emerald-600 hover:to-teal-600 transition-all disabled:opacity-60 border-2 border-[#0B0E11]"
                >
                  {uploading ? <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" /> : <Camera size={16} className="text-white" />}
                </button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
              </>
            )}
            {uploadError && <p className="absolute -bottom-6 left-0 text-[10px] text-red-400 whitespace-nowrap">{uploadError}</p>}
            
            {/* Eco status indicator */}
            <div className="absolute top-1 right-1 w-5 h-5 rounded-full border-2 border-[#0B0E11] flex items-center justify-center" style={{ background: user.status === 'online' ? '#10B981' : '#6B7280' }}>
              <div className="w-2 h-2 bg-white rounded-full" />
            </div>
          </div>

          {/* ═══ NATURE ACTION PANEL ═══ */}
          <div className="flex-1 flex flex-col items-end gap-3 pb-2">
            {/* User level badge */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 rounded-full">
              <Zap size={12} className="text-yellow-400" />
              <span className="text-xs font-bold text-emerald-300">Seviye {level}</span>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              {isOwnProfile ? (
                <>
                  <button
                    onClick={() => editing ? handleSave() : setEditing(true)}
                    disabled={saving}
                    className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 text-white rounded-xl text-xs font-bold hover:from-emerald-500/30 hover:to-teal-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? (
                      <div className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    ) : editing ? (
                      <><Save size={13} /> <span className="hidden sm:inline">Kaydet</span></>
                    ) : (
                      <><Edit3 size={13} /> <span>Güncelle</span></>
                    )}
                  </button>
                  {editing && (
                    <button
                      onClick={() => {
                        setEditing(false);
                        setEditDisplayName(user.displayName || user.username || '');
                        setEditUsername(user.username || '');
                        setEditBio(user.bio || '');
                        setEditStatus(user.status_message || '');
                        setEditSocial(user.social_links || {});
                        setEditIsPrivate(user.is_private || false);
                        setSaveError('');
                        setUploadError('');
                      }}
                      className="flex items-center gap-1.5 px-3 py-2 bg-white/5 border border-white/10 text-white/60 rounded-xl text-sm hover:bg-white/10 hover:text-white transition-all"
                    >
                      <X size={14} /> İptal
                    </button>
                  )}
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-1.5 px-3 py-2 bg-white/5 border border-white/10 text-white/60 rounded-xl text-sm hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 transition-all"
                  >
                    <LogOut size={14} />
                  </button>
                  {/* Gizli hesap toggle — her zaman görünür */}
                  <button
                    onClick={handleTogglePrivate}
                    title={user.is_private ? 'Gizli hesap — herkese aç' : 'Herkese açık — gizle'}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm border transition-all ${
                      user.is_private
                        ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25'
                        : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <Shield size={14} />
                    <span className="hidden sm:inline text-xs font-medium">
                      {user.is_private ? 'Gizli' : 'Herkese Açık'}
                    </span>
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleFollow}
                    disabled={isBlockedByMe}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                      isFollowing
                        ? 'bg-white/10 border border-white/15 text-white hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20'
                        : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600 shadow-lg shadow-emerald-500/20'
                    }`}
                  >
                    <Leaf size={14} />
                    {isFollowing ? 'Ekosistemde' : 'Ekosisteme Katıl'}
                  </button>
                  <button
                    onClick={handleBlock}
                    title={isBlockedByMe ? 'Engeli Kaldır' : 'Engelle'}
                    className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-bold transition-all border ${
                      isBlockedByMe
                        ? 'bg-red-500/20 border-red-500/40 text-red-400 hover:bg-red-500/30'
                        : 'bg-white/5 border-white/10 text-white/50 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20'
                    }`}
                  >
                    <Ban size={14} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Error and success messages */}
        {uploadError && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2">
            <X size={16} className="text-red-400" />
            <p className="text-sm text-red-400">{uploadError}</p>
          </div>
        )}
        {saveError && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2">
            <X size={16} className="text-red-400" />
            <p className="text-sm text-red-400">{saveError}</p>
          </div>
        )}
        {saveSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2"
          >
            <CheckCircle2 size={16} className="text-emerald-400" />
            <p className="text-sm text-emerald-400">Profil başarıyla güncellendi! 🎉</p>
          </motion.div>
        )}

        {/* ═══ NAME & BIO ═══ */}
        <div className="mb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-black text-white leading-tight">{user.displayName || user.username}</h1>
            {user.is_verified && (
              <div className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center" title="Doğrulanmış">
                <CheckCircle2 size={13} className="text-white" />
              </div>
            )}
            {user.is_admin && (
              <span className="px-2 py-0.5 bg-red-500/15 border border-red-500/25 text-red-400 text-[10px] font-bold rounded-full uppercase tracking-widest">Admin</span>
            )}
          </div>
          <p className="text-sm text-white/40 mt-0.5">@{user.username}</p>

          {/* Bio */}
          <div className="mt-3">
            {editing ? (
              <div>
                <input
                  value={editDisplayName}
                  onChange={e => setEditDisplayName(e.target.value)}
                  placeholder="İsim Soyisim"
                  maxLength={50}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50 mb-2"
                />
                <input
                  value={editUsername}
                  onChange={e => setEditUsername(e.target.value.replace(/[^a-z0-9_]/gi, '').toLowerCase())}
                  placeholder="kullanici_adi"
                  maxLength={20}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50 mb-2"
                />
                <textarea
                  value={editBio}
                  onChange={e => setEditBio(e.target.value)}
                  placeholder="Kendini tanıt..."
                  rows={3}
                  maxLength={300}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white resize-none focus:outline-none focus:border-emerald-500/50"
                />
                <div className="flex items-center justify-between mt-1 px-1">
                  <span className={`text-xs ${editBio.length > 280 ? 'text-yellow-400' : 'text-white/30'}`}>
                    {editBio.length}/300 karakter
                  </span>
                  {editBio.length > 300 && (
                    <span className="text-xs text-red-400">Maksimum karakter sayısı aşıldı</span>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-[15px] text-white/80 leading-relaxed">{user.bio || 'Henüz bir biyografi eklenmemiş.'}</p>
            )}
          </div>

          {/* Status message */}
          {editing ? (
            <div className="mt-2">
              <input
                value={editStatus}
                onChange={e => setEditStatus(e.target.value)}
                placeholder="Durum mesajı..."
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-emerald-500/50"
                maxLength={100}
              />
              <div className="flex items-center justify-between mt-1 px-1">
                <span className={`text-xs ${editStatus.length > 90 ? 'text-yellow-400' : 'text-white/30'}`}>
                  {editStatus.length}/100 karakter
                </span>
              </div>
            </div>
          ) : user.status_message ? (
            <p className="text-sm text-emerald-400/70 mt-1">🌿 {user.status_message}</p>
          ) : null}

          {/* Meta info */}
          <div className="flex items-center gap-4 mt-3 flex-wrap">
            {joinDate && (
              <span className="flex items-center gap-1.5 text-xs text-white/40">
                <Clock size={12} /> {joinDate} tarihinde katıldı
              </span>
            )}
            {/* Social links inline */}
            {user.social_links?.twitter && (
              <a href={`https://twitter.com/${user.social_links.twitter}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-white/40 hover:text-sky-400 transition-colors">
                <Twitter size={12} /> @{user.social_links.twitter}
              </a>
            )}
            {user.social_links?.instagram && (
              <a href={`https://instagram.com/${user.social_links.instagram}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-white/40 hover:text-pink-400 transition-colors">
                <Instagram size={12} /> @{user.social_links.instagram}
              </a>
            )}
            {user.social_links?.github && (
              <a href={`https://github.com/${user.social_links.github}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-white/40 hover:text-white transition-colors">
                <Github size={12} /> {user.social_links.github}
              </a>
            )}
          </div>

          {/* Social edit */}
          {editing && (
            <div className="mt-3 space-y-2">
              {(['twitter', 'github', 'instagram'] as const).map(platform => (
                <div key={platform} className="flex items-center gap-2">
                  <span className="text-white/40 w-20 text-xs capitalize">{platform}</span>
                  <input
                    value={editSocial[platform] || ''}
                    onChange={e => setEditSocial(prev => ({ ...prev, [platform]: e.target.value }))}
                    placeholder={`@${platform}`}
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ═══ NATURE ECOSYSTEM STATS ═══ */}
        <div className="mb-4 pb-4 border-b border-emerald-500/10">
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            {[
              { value: user.message_count || 0, label: 'Post', icon: '💬' },
              { value: followerCount, label: 'Takipçi', icon: '🌿', onClick: () => { setFollowerModalTab('followers'); setShowFollowerModal(true); } },
              { value: followingCount, label: 'Takip', icon: '🍃', onClick: () => { setFollowerModalTab('following'); setShowFollowerModal(true); } },
              { value: friendCount, label: 'Arkadaş', icon: '🌱' },
            ].map((stat, i) => (
              <motion.button
                key={stat.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                onClick={(stat as any).onClick}
                className={`flex items-center gap-1.5 px-2.5 py-1 bg-white/[0.04] border border-white/10 rounded-full hover:border-emerald-500/30 hover:bg-white/[0.07] transition-all ${(stat as any).onClick ? 'cursor-pointer' : 'cursor-default'}`}
              >
                <span className="text-xs">{stat.icon}</span>
                <span className="text-sm font-black text-white">{stat.value}</span>
                <span className="text-[10px] text-white/40 font-medium">{stat.label}</span>
              </motion.button>
            ))}
          </div>

          {/* XP Progress Bar - Nature Style with Level Badge */}
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {/* Level Badge */}
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/30 to-orange-500/30 rounded-xl blur-md" />
                  <div className="relative w-9 h-9 md:w-10 md:h-10 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-xl flex items-center justify-center">
                    <Zap size={16} className="text-yellow-400" />
                  </div>
                </div>
                
                <div>
                  <span className="text-sm md:text-base font-bold text-white block">Seviye {level}</span>
                  <span className="text-[10px] md:text-xs text-white/40">Ekosistem Gücü</span>
                </div>
              </div>
              
              {/* Eco Points Badge */}
              <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 rounded-full">
                <Leaf size={12} className="text-emerald-400" />
                <span className="text-xs font-bold text-emerald-300">{user.eco_points || 0} EP</span>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="relative h-4 bg-white/10 rounded-full overflow-hidden border border-white/5">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 via-teal-500/20 to-cyan-500/20" />
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 1.5, ease: 'easeOut' }}
                className="h-full bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 rounded-full relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/20 animate-pulse" />
                {/* Shimmer effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" 
                     style={{ animation: 'shimmer 2s infinite' }} />
              </motion.div>
            </div>
            
            {/* Progress Info */}
            <div className="flex items-center justify-between mt-2">
              <span className="text-[10px] md:text-xs text-emerald-400/70 font-medium">{user.xp || 0} XP</span>
              <span className="text-[10px] md:text-xs text-white/30">{100 - progress} XP kaldı</span>
              <span className="text-[10px] md:text-xs text-emerald-400/70 font-medium">{level * 100} XP</span>
            </div>
          </div>
        </div>

        {/* ═══ STORY RING ═══ */}
        <StoryRing
          currentUserId={userId}
          onStoryClick={(userId, stories) => {
            setSelectedStoryUserId(userId);
            setSelectedStories(stories);
          }}
          onCreateStory={() => {
            setShowCreateStoryModal(true);
          }}
          isOwnProfile={isOwnProfile}
        />

        {/* ═══ NATURE ECOSYSTEM TABS ═══ */}
        <div className="relative mb-4">
          <div className="flex gap-1 p-1 bg-white/5 rounded-xl border border-white/10">
            {[
              { id: 'posts' as const, label: 'Paylaşımlar', shortLabel: 'Ekosistem', icon: '🌿' },
              { id: 'badges' as const, label: 'Rozetler', shortLabel: 'Rozetler', icon: '🏆' },
              { id: 'about' as const, label: 'Hakkında', shortLabel: 'Hakkında', icon: '🍃' },
              ...(isOwnProfile ? [{ id: 'bookmarks' as const, label: 'Kaydedilenler', shortLabel: 'Kayıtlar', icon: '🔖' }] : []),
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setProfileTab(tab.id)}
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 px-1 rounded-lg text-[10px] md:text-xs font-bold transition-all relative overflow-hidden ${
                  profileTab === tab.id 
                    ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-400 border border-emerald-500/30' 
                    : 'text-white/40 hover:text-white/60 hover:bg-white/5'
                }`}
              >
                <span className="text-sm">{tab.icon}</span>
                <span className="truncate w-full text-center">{tab.shortLabel}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ═══ TAB CONTENT ═══ */}

        {/* POSTS TAB */}
        {profileTab === 'posts' && (
          <div className="space-y-4 pb-8">
            {/* Gizli hesap uyarısı */}
            {!isOwnProfile && user.is_private && (
              <div className="flex flex-col items-center gap-3 py-12 text-center">
                <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                  <Shield size={28} className="text-white/30" />
                </div>
                <p className="text-white/60 font-medium">Bu hesap gizli</p>
                <p className="text-sm text-white/30">İçerikleri görmek için takip etmen gerekiyor</p>
              </div>
            )}

            {/* Create Post Button - Only show on own profile */}
            {isOwnProfile && (
              <button
                onClick={() => setShowCreatePostModal(true)}
                className="w-full p-4 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border-2 border-dashed border-emerald-500/30 rounded-xl hover:border-emerald-500/50 hover:from-emerald-500/20 hover:to-teal-500/20 transition-all group"
              >
                <div className="flex items-center justify-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Leaf className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-white">Yeni İçerik Paylaş</p>
                    <p className="text-xs text-white/40">Ekosisteme katkıda bulun ve +10 eco points kazan</p>
                  </div>
                </div>
              </button>
            )}
            
            {/* PostGrid Component */}
            {(!user.is_private || isOwnProfile) && (
            <PostGrid 
              userId={targetId} 
              isAdmin={user?.is_admin || false}
              onPostClick={(post) => {
                console.log('Post clicked:', post);
              }} 
            />
            )}
          </div>
        )}

        {/* ROZETLER TAB */}
        {profileTab === 'badges' && (
          <div className="space-y-4 pb-8">
            <BadgeDisplay userId={userId} theme={theme} />

            {/* User badges */}
            {user.badges?.length > 0 && (
              <div>
                <p className="text-xs font-bold text-white/40 uppercase tracking-widest mb-3">Kazanılan Rozetler</p>
                <div className="grid grid-cols-2 gap-2">
                  {user.badges.map((badge: string) => {
                    const cfg = BADGE_CONFIG[badge];
                    if (!cfg) return null;
                    return (
                      <div key={badge} className="flex items-center gap-3 p-3 bg-white/[0.03] border border-white/5 rounded-xl">
                        <span className="text-2xl">{cfg.icon}</span>
                        <span className={`text-sm font-bold ${cfg.color}`}>{cfg.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Verification section */}
            {isOwnProfile && (
              <div className="rounded-2xl overflow-hidden border border-emerald-500/20 bg-gradient-to-b from-emerald-950/40 to-transparent">
                <div
                  className="flex items-center gap-3 px-5 pt-5 pb-4 cursor-pointer select-none"
                  onClick={() => setBadgeExpanded(v => !v)}
                >
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                    <BadgeCheck size={18} className="text-emerald-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-black text-white tracking-wide">🍃 Doğrulanmış Üye Rozeti</p>
                    <p className="text-[11px] text-white/40">Nature.co topluluğunun güvenilir üyelerine verilir</p>
                  </div>
                  {user.is_verified && (
                    <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/15 border border-emerald-500/30 rounded-full text-emerald-400 text-[11px] font-black uppercase tracking-widest">
                      <CheckCircle2 size={12} /> Aktif
                    </span>
                  )}
                  <ChevronDown size={16} className="text-white/30 transition-transform duration-200 ml-1" style={{ transform: badgeExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }} />
                </div>

                {badgeExpanded && <div className="px-5 pb-4 border-t border-emerald-500/10 pt-4">
                  <div className="mb-4">
                    <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-3">Kimler başvurabilir?</p>
                    <div className="space-y-2.5">
                      {[
                        { icon: '🌱', title: 'Gerçek Kimlik', desc: 'Hesabın gerçek bir kişiye veya kuruluşa ait olmalı.' },
                        { icon: '🌿', title: 'Tamamlanmış Profil', desc: 'Profil fotoğrafı, kullanıcı adı ve biyografi doldurulmuş olmalı.' },
                        { icon: '🍃', title: 'Topluluk Katkısı', desc: 'Ekosisteme aktif katkı sağlayan üyeler önceliklidir.' },
                        { icon: '🌲', title: 'Güvenilir Davranış', desc: 'Kurallara uyan, saygılı ve yapıcı iletişim geçmişi.' },
                      ].map(rule => (
                        <div key={rule.icon} className="flex gap-3 p-3 bg-white/[0.02] rounded-xl border border-white/5">
                          <span className="text-base flex-shrink-0 mt-0.5">{rule.icon}</span>
                          <div>
                            <p className="text-xs font-bold text-white/80 mb-0.5">{rule.title}</p>
                            <p className="text-[11px] text-white/40 leading-relaxed">{rule.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {user.is_verified ? (
                    <div className="flex items-center gap-2.5 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                      <CheckCircle2 size={16} className="text-emerald-400" />
                      <span className="text-sm font-bold text-emerald-300">Hesabın doğrulanmış 🎉</span>
                    </div>
                  ) : verifyRequest?.status === 'pending' ? (
                    <div className="p-3 bg-yellow-500/5 border border-yellow-500/20 rounded-xl">
                      <div className="flex items-center gap-2 text-yellow-400 mb-2">
                        <Clock size={14} />
                        <span className="text-sm font-bold">Talebiniz inceleniyor...</span>
                      </div>
                      <p className="text-[11px] text-white/40 mb-3 italic">"{verifyRequest.note}"</p>
                      <button onClick={handleVerifyCancel} className="text-xs text-red-400/70 hover:text-red-400 transition-colors">Talebi geri çek</button>
                    </div>
                  ) : verifyRequest?.status === 'rejected' ? (
                    <div>
                      <div className="p-3 bg-red-500/5 border border-red-500/20 rounded-xl mb-3">
                        <p className="text-sm font-bold text-red-400 mb-1">Talebiniz reddedildi</p>
                        {verifyRequest.adminNote && <p className="text-[11px] text-white/40">Gerekçe: {verifyRequest.adminNote}</p>}
                      </div>
                      <textarea value={verifyNote} onChange={e => setVerifyNote(e.target.value)} placeholder="Neden uygun olduğunuzu açıklayın..." className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-emerald-500/40 resize-none mb-2" rows={3} maxLength={300} />
                      <button onClick={handleVerifySubmit} disabled={verifySubmitting || !verifyNote.trim()} className="w-full py-2.5 bg-emerald-500/15 border border-emerald-500/25 text-emerald-300 rounded-xl text-sm font-bold hover:bg-emerald-500/25 transition-all disabled:opacity-40">
                        {verifySubmitting ? 'Gönderiliyor...' : '🍃 Tekrar Başvur'}
                      </button>
                    </div>
                  ) : (
                    <div>
                      <textarea value={verifyNote} onChange={e => setVerifyNote(e.target.value)} placeholder="Kim olduğunuzu ve neden doğrulanmak istediğinizi anlatın..." className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-emerald-500/40 resize-none mb-2" rows={4} maxLength={300} />
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-white/25">{verifyNote.length}/300</span>
                        <button onClick={handleVerifySubmit} disabled={verifySubmitting || verifyNote.trim().length < 20} className="px-5 py-2.5 bg-emerald-500/15 border border-emerald-500/25 text-emerald-300 rounded-xl text-sm font-bold hover:bg-emerald-500/25 transition-all disabled:opacity-40">
                          {verifySubmitting ? 'Gönderiliyor...' : '🍃 Rozet Talep Et'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>}
              </div>
            )}

            <ProfileAiInsightsCard />
          </div>
        )}

        {/* HAKKINDA TAB */}
        {profileTab === 'about' && (
          <div className="space-y-5 pb-8">
            {/* Gizlilik ayarı — sadece kendi profilinde ve editing modunda */}
            {isOwnProfile && editing && (
              <div className="flex items-center justify-between p-4 bg-white/[0.03] border border-white/10 rounded-xl">
                <div>
                  <p className="text-sm font-bold text-white">Gizli Hesap</p>
                  <p className="text-xs text-white/40 mt-0.5">Açıkken sadece takipçilerin içeriklerini görebilir</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditIsPrivate(p => !p)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${editIsPrivate ? 'bg-emerald-500' : 'bg-white/10'}`}
                >
                  <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${editIsPrivate ? 'translate-x-7' : 'translate-x-1'}`} />
                </button>
              </div>
            )}
            {isOwnProfile && !editing && user.is_private && (
              <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-sm text-emerald-400">
                <Shield size={14} /> Gizli hesap — sadece takipçilerin görebilir
              </div>
            )}

            {/* Bio section */}
            <div>
              <p className="text-xs font-bold text-white/40 uppercase tracking-widest mb-2">Biyografi</p>
              {editing ? (
                <textarea
                  value={editBio}
                  onChange={e => setEditBio(e.target.value)}
                  placeholder="Kendini tanıt..."
                  rows={3}
                  maxLength={300}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white resize-none focus:outline-none focus:border-emerald-500/50"
                />
              ) : (
                <p className="text-sm text-white/70 leading-relaxed">{user.bio || 'Henüz bir biyografi eklenmemiş.'}</p>
              )}
            </div>

            {/* Info cards */}
            <div>
              <p className="text-xs font-bold text-white/40 uppercase tracking-widest mb-2">Bilgiler</p>
              <div className="space-y-2">
                {joinDate && (
                  <div className="flex items-center gap-3 p-3 bg-white/[0.03] rounded-xl border border-white/5">
                    <Clock size={16} className="text-white/40" />
                    <div>
                      <p className="text-xs text-white/40">Katılım</p>
                      <p className="text-sm text-white font-medium">{joinDate}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-3 p-3 bg-white/[0.03] rounded-xl border border-white/5">
                  <Zap size={16} className="text-yellow-400" />
                  <div>
                    <p className="text-xs text-white/40">Seviye & XP</p>
                    <p className="text-sm text-white font-medium">Seviye {level} · {user.xp || 0} XP</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-white/[0.03] rounded-xl border border-white/5">
                  <Globe size={16} className="text-white/40" />
                  <div>
                    <p className="text-xs text-white/40">Durum</p>
                    <p className="text-sm text-white font-medium">{user.status === 'online' ? '🟢 Çevrimiçi' : '⚫ Çevrimdışı'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Social Links */}
            <div>
              <p className="text-xs font-bold text-white/40 uppercase tracking-widest mb-2">Sosyal Medya</p>
              {editing ? (
                <div className="space-y-2">
                  {(['twitter', 'github', 'instagram'] as const).map(platform => (
                    <div key={platform} className="flex items-center gap-2">
                      <span className="text-white/40 w-20 text-xs capitalize">{platform}</span>
                      <input
                        value={editSocial[platform] || ''}
                        onChange={e => setEditSocial(prev => ({ ...prev, [platform]: e.target.value }))}
                        placeholder={`@${platform}`}
                        className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-emerald-500/50"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {user.social_links?.twitter && (
                    <a href={`https://twitter.com/${user.social_links.twitter}`} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 bg-white/[0.03] border border-white/5 rounded-xl hover:bg-sky-500/5 hover:border-sky-500/15 transition-all">
                      <Twitter size={18} className="text-sky-400" />
                      <div>
                        <p className="text-xs text-white/40">Twitter</p>
                        <p className="text-sm text-white font-medium">@{user.social_links.twitter}</p>
                      </div>
                      <ChevronRight size={14} className="ml-auto text-white/20" />
                    </a>
                  )}
                  {user.social_links?.instagram && (
                    <a href={`https://instagram.com/${user.social_links.instagram}`} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 bg-white/[0.03] border border-white/5 rounded-xl hover:bg-pink-500/5 hover:border-pink-500/15 transition-all">
                      <Instagram size={18} className="text-pink-400" />
                      <div>
                        <p className="text-xs text-white/40">Instagram</p>
                        <p className="text-sm text-white font-medium">@{user.social_links.instagram}</p>
                      </div>
                      <ChevronRight size={14} className="ml-auto text-white/20" />
                    </a>
                  )}
                  {user.social_links?.github && (
                    <a href={`https://github.com/${user.social_links.github}`} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 bg-white/[0.03] border border-white/5 rounded-xl hover:bg-white/5 hover:border-white/10 transition-all">
                      <Github size={18} className="text-white/80" />
                      <div>
                        <p className="text-xs text-white/40">GitHub</p>
                        <p className="text-sm text-white font-medium">{user.social_links.github}</p>
                      </div>
                      <ChevronRight size={14} className="ml-auto text-white/20" />
                    </a>
                  )}
                  {!user.social_links?.twitter && !user.social_links?.github && !user.social_links?.instagram && (
                    <p className="text-sm text-white/30 p-3">Sosyal medya linki eklenmemiş</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* KAYDEDILENLER TAB */}
        {profileTab === 'bookmarks' && isOwnProfile && (
          <div className="pb-8">
            {bookmarksLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
              </div>
            ) : bookmarkedPosts.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-12 text-center">
                <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-2xl">🔖</div>
                <p className="text-white/60 font-medium">Henüz kaydedilen post yok</p>
                <p className="text-sm text-white/30">Robot House'da postların altındaki 🔖 ikonuna tıklayarak kaydet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {bookmarkedPosts.map(post => (
                  <div key={post.id} className="bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden hover:border-emerald-500/10 transition-all">
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-white/80 text-sm leading-relaxed">{post.content}</p>
                          {post.media?.url && (
                            <img src={post.media.url} alt="post" className="mt-3 rounded-xl w-full object-contain max-h-64 border border-white/10" />
                          )}
                          <p className="text-[10px] text-white/30 mt-2">
                            {new Date(post.timestamp).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                        <button
                          onClick={async () => {
                            await toggleBookmark(post.id, userId);
                            setBookmarkedPosts(prev => prev.filter(p => p.id !== post.id));
                          }}
                          className="text-yellow-400 hover:text-white/40 transition-all shrink-0"
                          title="Kaydedilenlerden çıkar"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* FollowerListModal */}
      <FollowerListModal
        userId={targetId}
        currentUserId={userId}
        isOpen={showFollowerModal}
        onClose={() => setShowFollowerModal(false)}
        initialTab={followerModalTab}
      />

      {/* CreatePostModal */}
      <CreatePostModal
        isOpen={showCreatePostModal}
        onClose={() => setShowCreatePostModal(false)}
        onPostCreated={() => {
          // Modal will close automatically, posts will update via real-time listener
          setShowCreatePostModal(false);
        }}
      />

      {/* CreateStoryModal */}
      <CreateStoryModal
        isOpen={showCreateStoryModal}
        onClose={() => setShowCreateStoryModal(false)}
        onStoryCreated={() => {
          // Modal will close automatically, stories will update via real-time listener
          setShowCreateStoryModal(false);
        }}
      />

      {/* StoryViewer */}
      {selectedStories.length > 0 && (
        <StoryViewer
          stories={selectedStories}
          currentUserId={userId}
          onClose={() => {
            setSelectedStories([]);
            setSelectedStoryUserId(null);
          }}
        />
      )}
    </div>
  );
};