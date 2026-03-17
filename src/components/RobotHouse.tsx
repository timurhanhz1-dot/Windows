import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { 
  Bot, Cpu, Heart, MessageCircle, Share2, Bookmark, TrendingUp, Leaf,
  Sparkles, Eye, Camera, Music, Code, X, MoreVertical, Edit2, Trash2, Flag, Copy, Check
} from 'lucide-react';
import { auth } from '../firebase';
import { db } from '../firebase';
import { ref, push, onValue, set, remove, serverTimestamp } from 'firebase/database';
import { createPost, listenUserPosts, toggleLike, addComment, listenComments, toggleBookmark, listenBookmarks, sharePost, editPost, deletePost, reportPost } from '../services/postService';
import { listenBlockedUsers } from '../services/blockService';
import { Post, PostType, Comment } from '../types/profile';
import { LikeButton } from './LikeButton';
import { PostDetailModal } from './PostDetailModal';

export const RobotHouse = ({ theme }: { theme: any }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'feed' | 'trending' | 'nature' | 'tech'>('feed');
  const [posts, setPosts] = useState<Post[]>([]);
  const [friends, setFriends] = useState<Record<string, any>>({});
  const [newPost, setNewPost] = useState('');
  const [postType, setPostType] = useState<Post['type']>('text');
  const [showPostModal, setShowPostModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [ecoPoints, setEcoPoints] = useState(0);
  const [userMood, setUserMood] = useState('🌿');
  const [hasError, setHasError] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const commentInputRef = useRef<HTMLTextAreaElement>(null);

  const currentUser = auth.currentUser;
  const [usersMap, setUsersMap] = useState<Record<string, { username?: string; displayName?: string; avatar?: string }>>({});
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>([]);
  const moodEmojis = ['🌿', '🌱', '🍃', '🌲', '🌳', '🌺', '🌸', '🌼', '🌻', '🌙', '⭐', '✨', '💫', '🌊', '💧', '🔥', '⚡', '🌈'];
  const [blockedIds, setBlockedIds] = useState<string[]>([]);
  const [openMenuPostId, setOpenMenuPostId] = useState<string | null>(null);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [sharePostId, setSharePostId] = useState<string | null>(null);
  const [shareCopied, setShareCopied] = useState(false);

  if (hasError) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-[#0B0E11] via-[#0F1419] to-[#0B0E11]">
        <div className="text-center">
          <div className="text-6xl mb-4">🌿</div>
          <h3 className="text-white text-xl font-bold mb-2">Bir sorun oluştu</h3>
          <p className="text-white/60 mb-4">Robot House yüklenirken bir hata oluştu.</p>
          <button
            onClick={() => {
              setHasError(false);
              window.location.reload();
            }}
            className="px-6 py-3 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 transition-all"
          >
            Yeniden Dene
          </button>
        </div>
      </div>
    );
  }

  useEffect(() => {
    if (!currentUser) return;
    
    try {
      const postsRef = ref(db, 'nature_posts');
      const unsubscribePosts = onValue(postsRef, (snapshot) => {
        try {
          const data = snapshot.val();
          if (data) {
            const postsArray = Object.entries(data).map(([id, post]: [string, any]) => ({
              id,
              ...post
            })).sort((a, b) => b.timestamp - a.timestamp);
            setPosts(postsArray);
          }
        } catch (error) {
          console.error('Posts listener error:', error);
          setHasError(true);
        }
      });

      const friendsRef = ref(db, `users/${currentUser.uid}/friends`);
      const unsubscribeFriends = onValue(friendsRef, (snapshot) => {
        try {
          const friendsData = snapshot.val();
          setFriends(friendsData || {});
        } catch (error) {
          console.error('Friends listener error:', error);
          setHasError(true);
        }
      });

      const userRef = ref(db, `users/${currentUser.uid}`);
      const unsubscribeUser = onValue(userRef, (snapshot) => {
        try {
          const userData = snapshot.val();
          if (userData?.eco_points) {
            setEcoPoints(userData.eco_points);
          }
        } catch (error) {
          console.error('User listener error:', error);
        }
      });

      const allUsersRef = ref(db, 'users');
      const unsubscribeAllUsers = onValue(allUsersRef, (snapshot) => {
        try {
          const data = snapshot.val() || {};
          const map: Record<string, { username?: string; displayName?: string; avatar?: string }> = {};
          Object.entries(data).forEach(([uid, val]: [string, any]) => {
            map[uid] = { username: val?.username, displayName: val?.displayName, avatar: val?.avatar };
          });
          setUsersMap(map);
        } catch {}
      });

      const unsubscribeBookmarks = listenBookmarks(currentUser.uid, setBookmarkedIds);
      const unsubscribeBlocked = listenBlockedUsers(currentUser.uid, setBlockedIds);

      return () => {
        unsubscribePosts();
        unsubscribeFriends();
        unsubscribeUser();
        unsubscribeAllUsers();
        unsubscribeBookmarks();
        unsubscribeBlocked();
      };
    } catch (error) {
      console.error('useEffect setup error:', error);
      setHasError(true);
    }
  }, [currentUser]);

  const handleCreatePost = async () => {
    if (!newPost.trim() || !currentUser) return;

    try {
      setIsUploading(true);
      const username = currentUser.displayName || currentUser.email?.split('@')[0] || 'NatureUser';
      const avatar = currentUser.photoURL || undefined;
      
      const tags = postType === 'nature' ? ['nature', 'eco', 'sustainability'] : 
                   postType === 'tech' ? ['tech', 'innovation', 'future'] : [];

      await createPost(
        currentUser.uid,
        username,
        newPost,
        postType as PostType,
        {
          mood: userMood,
          tags,
          avatar,
          mediaFile: selectedMedia || undefined
        }
      );

      setNewPost('');
      setSelectedMedia(null);
      setMediaPreview(null);
      setShowPostModal(false);
    } catch (error: any) {
      console.error('Failed to create post:', error);
      alert(error.message || 'Post paylaşılamadı. Lütfen tekrar dene.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('Dosya boyutu 10MB\'dan küçük olmalıdır');
      return;
    }

    setSelectedMedia(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setMediaPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveMedia = () => {
    setSelectedMedia(null);
    setMediaPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleLike = async (postId: string) => {
    if (!currentUser) return;
    
    try {
      await toggleLike(postId, currentUser.uid);
    } catch (error) {
      console.error('Failed to toggle like:', error);
    }
  };

  const handleBookmark = async (postId: string) => {
    if (!currentUser) return;
    try {
      await toggleBookmark(postId, currentUser.uid);
    } catch (error) {
      console.error('Failed to toggle bookmark:', error);
    }
  };

  const handleShare = async (postId: string) => {
    setSharePostId(postId);
  };

  const handleShareCopy = async (postId: string) => {
    const url = `${window.location.origin}/post/${postId}`;
    try {
      await navigator.clipboard.writeText(url);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch {
      // fallback
    }
    if (!currentUser) return;
    await sharePost(postId, currentUser.uid).catch(() => {});
  };

  const handleEditPost = (post: Post) => {
    setEditingPostId(post.id);
    setEditContent(post.content);
    setOpenMenuPostId(null);
  };

  const handleEditSave = async (postId: string) => {
    if (!currentUser) return;
    try {
      await editPost(postId, currentUser.uid, editContent);
      setEditingPostId(null);
    } catch (err: any) {
      alert(err.message || 'Düzenlenemedi');
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!currentUser || !window.confirm('Bu postu silmek istediğine emin misin?')) return;
    try {
      await deletePost(postId, currentUser.uid);
      setOpenMenuPostId(null);
    } catch (err: any) {
      alert(err.message || 'Silinemedi');
    }
  };

  const handleReportPost = async (postId: string) => {
    if (!currentUser) return;
    const reason = window.prompt('Raporlama sebebini yaz:');
    if (!reason) return;
    await reportPost(postId, currentUser.uid, reason).catch(() => {});
    setOpenMenuPostId(null);
    alert('Rapor gönderildi.');
  };

  const renderHashtagContent = (content: string) => {
    const parts = content.split(/(#\w+)/g);
    return parts.map((part, i) =>
      part.startsWith('#') ? (
        <span
          key={i}
          className="text-emerald-400 cursor-pointer hover:underline"
          onClick={() => navigate(`/explore?tag=${part.slice(1)}`)}
        >
          {part}
        </span>
      ) : (
        <span key={i}>{part}</span>
      )
    );
  };

  const handleComment = async (postId: string) => {
    if (!newComment.trim() || !currentUser) return;

    try {
      const username = currentUser.displayName || currentUser.email?.split('@')[0] || 'NatureUser';
      await addComment(postId, currentUser.uid, username, newComment);
      setNewComment('');
      commentInputRef.current?.focus();
    } catch (error) {
      console.error('Failed to add comment:', error);
    }
  };

  const loadComments = (postId: string) => {
    const unsubscribe = listenComments(postId, (fetchedComments) => {
      setComments(fetchedComments);
    });
    // Store unsubscribe function if needed for cleanup
  };

  const getTypeIcon = (type: Post['type']) => {
    const icons = {
      text: MessageCircle,
      photo: Camera,
      music: Music,
      code: Code,
      nature: Leaf,
      tech: Cpu
    };
    return icons[type];
  };

  const getTypeColor = (type: Post['type']) => {
    const colors = {
      text: 'text-blue-400',
      photo: 'text-purple-400',
      music: 'text-pink-400',
      code: 'text-green-400',
      nature: 'text-emerald-400',
      tech: 'text-cyan-400'
    };
    return colors[type];
  };

  const filteredPosts = posts.filter(post => {
    try {
      if (!post || !post.userId) return false;
      if (blockedIds.includes(post.userId)) return false;
      
      const isCurrentUser = post.userId === currentUser?.uid;
      const isFriend = friends && friends[post.userId] === true;
      
      if (activeTab === 'feed') {
        return isCurrentUser || isFriend;
      }
      if (activeTab === 'trending') {
        return (post.shares || 0) > 5 || Object.keys(post.likes || {}).length > 10;
      }
      if (activeTab === 'nature') {
        return post.type === 'nature' || post.tags?.includes('nature');
      }
      if (activeTab === 'tech') {
        return post.type === 'tech' || post.tags?.includes('tech');
      }
      return true;
    } catch (error) {
      console.error('Filter error for post:', post?.id, error);
      return false;
    }
  });

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: '#0B0E11', backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(16, 185, 129, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(139, 92, 246, 0.1) 0%, transparent 50%)' }}>
      <header className="border-b border-emerald-500/10 flex items-center px-3 md:px-6 justify-between bg-black/30 backdrop-blur-xl flex-shrink-0" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 10px)', paddingBottom: 10, minHeight: 56 }}>
        <div className="flex items-center gap-2 md:gap-4 min-w-0">
          <div className="relative flex-shrink-0">
            <div className="p-2 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-xl border border-emerald-500/20">
              <Bot size={18} className="text-emerald-400" />
            </div>
            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
          </div>
          <div className="min-w-0">
            <h3 className="font-black text-white text-sm tracking-[0.05em] truncate">Nature Hub</h3>
            <p className="text-[10px] text-emerald-400/70 hidden md:block">Doğa ve Teknoloji Topluluğu</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
            <Leaf size={12} className="text-emerald-400" />
            <span className="text-xs font-bold text-emerald-400">{ecoPoints}</span>
          </div>
          
          <div className="flex items-center gap-1 px-2 py-1.5 bg-white/5 border border-white/10 rounded-full">
            <span className="text-sm">{userMood}</span>
            <select 
              value={userMood} 
              onChange={(e) => setUserMood(e.target.value)}
              className="bg-transparent text-xs text-white/70 outline-none cursor-pointer w-5"
              style={{ fontSize: 12 }}
            >
              {moodEmojis.map(emoji => (
                <option key={emoji} value={emoji}>{emoji}</option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setShowPostModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-full text-xs font-bold shadow-lg shadow-emerald-500/25 hover:shadow-xl transition-all"
          >
            <Sparkles size={13} />
            <span className="hidden sm:inline">İçerik Paylaş</span>
            <span className="sm:hidden">Paylaş</span>
          </button>
        </div>
      </header>

      <div className="px-3 md:px-6 py-2 border-b border-white/5 bg-black/20 flex-shrink-0">
        <div className="flex gap-1">
          {[
            { id: 'feed' as const, label: 'Akış', icon: MessageCircle },
            { id: 'trending' as const, label: 'Trendler', icon: TrendingUp },
            { id: 'nature' as const, label: 'Keşfet', icon: Leaf },
            { id: 'tech' as const, label: 'Teknoloji', icon: Cpu },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all relative flex-1 justify-center ${
                activeTab === tab.id 
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                  : 'text-white/40 hover:text-white/60 hover:bg-white/5'
              }`}
            >
              <tab.icon size={14} />
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden text-[10px]">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
          {filteredPosts.map((post, index) => {
            const TypeIcon = getTypeIcon(post.type);
            const commentCount = post.comments ? Object.keys(post.comments).length : 0;

            return (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden hover:border-emerald-500/10 transition-all"
              >
                <div className="p-4 border-b border-white/5">
                  <div className="flex items-start gap-3">
                    <div 
                      className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white font-black text-sm cursor-pointer hover:ring-2 hover:ring-emerald-400 transition-all"
                      onClick={() => navigate(`/profile/${post.userId}`)}
                    >
                      {(usersMap[post.userId]?.avatar || post.avatar) ? (
                        <img src={usersMap[post.userId]?.avatar || post.avatar} alt="avatar" className="w-full h-full rounded-full object-cover" />
                      ) : (
                        (usersMap[post.userId]?.username || post.username || '?').substring(0, 2).toUpperCase()
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 
                          className="font-bold text-white text-sm cursor-pointer hover:text-emerald-400 transition-colors"
                          onClick={() => navigate(`/profile/${post.userId}`)}
                        >{usersMap[post.userId]?.displayName || usersMap[post.userId]?.username || post.username}</h4>
                        <span className="text-lg">{post.mood}</span>
                        <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${getTypeColor(post.type)} bg-white/5`}>
                          <TypeIcon size={10} />
                          <span className="text-[10px] font-bold capitalize">{post.type}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[10px] text-white/40">
                          {new Date(post.timestamp).toLocaleDateString('tr-TR', { 
                            hour: '2-digit', 
                            minute: '2-digit',
                            day: 'numeric',
                            month: 'short'
                          })}
                        </span>
                        <span className="text-[10px] text-emerald-400/60">
                          <Eye size={10} className="inline mr-1" />
                          {post.views}
                        </span>
                      </div>
                    </div>
                    {/* Post menu */}
                    <div className="relative">
                      <button
                        onClick={() => setOpenMenuPostId(openMenuPostId === post.id ? null : post.id)}
                        className="p-1.5 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/5 transition-all"
                      >
                        <MoreVertical size={14} />
                      </button>
                      <AnimatePresence>
                        {openMenuPostId === post.id && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: -4 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: -4 }}
                            className="absolute right-0 top-8 z-20 bg-[#1a1d21] border border-white/10 rounded-xl shadow-xl min-w-[140px] overflow-hidden"
                          >
                            {post.userId === currentUser?.uid && (
                              <>
                                <button onClick={() => handleEditPost(post)} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white/70 hover:bg-white/5 hover:text-white transition-all">
                                  <Edit2 size={12} /> Düzenle
                                </button>
                                <button onClick={() => handleDeletePost(post.id)} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 transition-all">
                                  <Trash2 size={12} /> Sil
                                </button>
                              </>
                            )}
                            {post.userId !== currentUser?.uid && (
                              <button onClick={() => handleReportPost(post.id)} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-orange-400 hover:bg-orange-500/10 transition-all">
                                <Flag size={12} /> Raporla
                              </button>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>

                <div className="p-4">
                  {editingPostId === post.id ? (
                    <div>
                      <textarea
                        value={editContent}
                        onChange={e => setEditContent(e.target.value)}
                        className="w-full bg-white/5 border border-emerald-500/30 rounded-xl px-3 py-2 text-sm text-white resize-none focus:outline-none"
                        rows={3}
                        maxLength={500}
                      />
                      <div className="flex gap-2 mt-2">
                        <button onClick={() => handleEditSave(post.id)} className="px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-xs font-bold hover:bg-emerald-600 transition-all">Kaydet</button>
                        <button onClick={() => setEditingPostId(null)} className="px-3 py-1.5 bg-white/5 border border-white/10 text-white/60 rounded-lg text-xs hover:bg-white/10 transition-all">İptal</button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-white/80 text-sm leading-relaxed mb-3">
                      {renderHashtagContent(post.content)}
                      {(post as any).edited && <span className="text-[10px] text-white/30 ml-1">(düzenlendi)</span>}
                    </p>
                  )}
                  
                  {post.media?.url && (
                    <div className="rounded-xl overflow-hidden bg-white/5 border border-white/10">
                      <img src={post.media.url} alt="post media" className="w-full object-contain" />
                    </div>
                  )}

                  {post.tags && post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {post.tags.map(tag => (
                        <span
                          key={tag}
                          className="px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[10px] text-emerald-400 font-bold cursor-pointer hover:bg-emerald-500/20 transition-all"
                          onClick={() => navigate(`/explore?tag=${tag}`)}
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="px-4 py-3 border-t border-white/5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <LikeButton
                        postId={post.id}
                        userId={currentUser?.uid || ''}
                        initialLikes={post.likes || {}}
                        size={14}
                        showCount={true}
                        className="text-xs"
                      />
                      
                      <button
                        onClick={() => {
                          setSelectedPost(post);
                          loadComments(post.id);
                        }}
                        className="flex items-center gap-1.5 text-xs font-bold text-white/40 hover:text-blue-400 transition-all"
                      >
                        <MessageCircle size={14} />
                        {commentCount}
                      </button>
                      
                      <button
                        onClick={() => handleShare(post.id)}
                        className="flex items-center gap-1.5 text-xs font-bold text-white/40 hover:text-green-400 transition-all"
                      >
                        <Share2 size={14} />
                        {post.shares || 0}
                      </button>
                      
                      <button onClick={() => handleBookmark(post.id)} className={`flex items-center gap-1.5 text-xs font-bold transition-all ${bookmarkedIds.includes(post.id) ? 'text-yellow-400' : 'text-white/40 hover:text-yellow-400'}`} title={bookmarkedIds.includes(post.id) ? 'Kaydedilenlerden çıkar' : 'Kaydet'}>
                        <Bookmark size={14} fill={bookmarkedIds.includes(post.id) ? 'currentColor' : 'none'} />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}

          {filteredPosts.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                {activeTab === 'feed' && <MessageCircle size={24} className="text-emerald-400" />}
                {activeTab === 'trending' && <TrendingUp size={24} className="text-emerald-400" />}
                {activeTab === 'nature' && <Leaf size={24} className="text-emerald-400" />}
                {activeTab === 'tech' && <Cpu size={24} className="text-emerald-400" />}
              </div>
              <h3 className="text-white font-bold mb-2">
                {activeTab === 'feed' && 'Akışta içerik yok'}
                {activeTab === 'trending' && 'Trend içerik yok'}
                {activeTab === 'nature' && 'Keşfet bölümünde içerik yok'}
                {activeTab === 'tech' && 'Teknoloji içerikleri yok'}
              </h3>
              <p className="text-white/40 text-sm">
                {activeTab === 'feed' && 'Arkadaşlarını ekle veya ilk paylaşımı sen yap!'}
                {activeTab === 'trending' && 'Popüler içerikler burada görünecek'}
                {activeTab === 'nature' && 'Doğa ile ilgili ilk paylaşımı sen yap!'}
                {activeTab === 'tech' && 'Teknoloji ile ilgili ilk paylaşımı sen yap!'}
              </p>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showPostModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-xl z-50 flex items-center justify-center p-4"
            onClick={() => setShowPostModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#0B0E11] border border-white/10 rounded-2xl p-6 w-full max-w-lg"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-lg font-black text-white mb-4">İçerik Paylaş</h3>
              
              <div className="flex gap-2 mb-4">
                {[
                  { type: 'text' as const, icon: MessageCircle, label: 'Metin' },
                  { type: 'photo' as const, icon: Camera, label: 'Fotoğraf' },
                  { type: 'music' as const, icon: Music, label: 'Müzik' },
                  { type: 'code' as const, icon: Code, label: 'Kod' },
                  { type: 'nature' as const, icon: Leaf, label: 'Doğa' },
                  { type: 'tech' as const, icon: Cpu, label: 'Teknoloji' },
                ].map(({ type, icon: Icon, label }) => (
                  <button
                    key={type}
                    onClick={() => setPostType(type)}
                    className={`flex-1 flex flex-col items-center gap-1 p-3 rounded-xl border transition-all ${
                      postType === type 
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                        : 'bg-white/5 border-white/10 text-white/40 hover:text-white/60'
                    }`}
                  >
                    <Icon size={16} />
                    <span className="text-[10px] font-bold">{label}</span>
                  </button>
                ))}
              </div>

              <textarea
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
                placeholder="Düşüncelerini paylaş..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white resize-none focus:outline-none focus:border-emerald-500/50"
                rows={4}
                maxLength={500}
              />

              {/* Media upload section */}
              <div className="mt-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleMediaSelect}
                  className="hidden"
                />
                
                {mediaPreview ? (
                  <div className="relative rounded-xl overflow-hidden bg-white/5 border border-white/10">
                    {selectedMedia?.type.startsWith('video') ? (
                      <video src={mediaPreview} className="w-full h-48 object-cover" controls />
                    ) : (
                      <img src={mediaPreview} alt="preview" className="w-full h-48 object-cover" />
                    )}
                    <button
                      onClick={handleRemoveMedia}
                      className="absolute top-2 right-2 p-2 bg-black/60 hover:bg-black/80 rounded-full transition-colors"
                    >
                      <X size={16} className="text-white" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-3 bg-white/5 border border-white/10 border-dashed rounded-xl text-sm text-white/60 hover:text-white/80 hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                  >
                    <Camera size={16} />
                    Fotoğraf veya Video Ekle
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between mt-4">
                <span className="text-[10px] text-white/40">{newPost.length}/500</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowPostModal(false)}
                    className="px-4 py-2 bg-white/5 border border-white/10 text-white/60 rounded-xl text-sm font-bold hover:bg-white/10 transition-all"
                  >
                    İptal
                  </button>
                  <button
                    onClick={handleCreatePost}
                    disabled={!newPost.trim() || isUploading}
                    className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-sm font-bold hover:bg-emerald-600 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {isUploading ? 'Yükleniyor...' : 'Paylaş'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Share Modal */}
      <AnimatePresence>
        {sharePostId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-xl z-50 flex items-center justify-center p-4"
            onClick={() => setSharePostId(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#0B0E11] border border-white/10 rounded-2xl p-6 w-full max-w-sm"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-base font-black text-white mb-4">Postu Paylaş</h3>
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2 mb-4">
                <span className="text-xs text-white/50 flex-1 truncate">{`${window.location.origin}/post/${sharePostId}`}</span>
                <button
                  onClick={() => handleShareCopy(sharePostId)}
                  className="flex items-center gap-1 px-2 py-1 bg-emerald-500/20 border border-emerald-500/30 rounded-lg text-xs text-emerald-400 font-bold hover:bg-emerald-500/30 transition-all"
                >
                  {shareCopied ? <><Check size={12} /> Kopyalandı</> : <><Copy size={12} /> Kopyala</>}
                </button>
              </div>
              <button onClick={() => setSharePostId(null)} className="w-full py-2 bg-white/5 border border-white/10 text-white/60 rounded-xl text-sm hover:bg-white/10 transition-all">Kapat</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Post Detail Modal */}
      {selectedPost && currentUser && (
        <PostDetailModal
          post={selectedPost}
          isOpen={!!selectedPost}
          onClose={() => setSelectedPost(null)}
          currentUserId={currentUser.uid}
        />
      )}
    </div>
  );
};
