import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Post } from '../types/profile';
import { listenUserPosts } from '../services/postService';
import { PostDetailModal } from './PostDetailModal';
import { PostCard } from './PostCard';
import { auth } from '../firebase';
import { Leaf } from 'lucide-react';

interface PostGridProps {
  userId: string;
  onPostClick?: (post: Post) => void;
  isAdmin?: boolean;
}

export const PostGrid: React.FC<PostGridProps> = ({ userId, onPostClick, isAdmin = false }) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [visiblePosts, setVisiblePosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const POSTS_PER_PAGE = 20;

  const currentUser = auth.currentUser;

  // Listen to user posts in real-time
  useEffect(() => {
    setLoading(true);
    const unsubscribe = listenUserPosts(userId, (fetchedPosts) => {
      setPosts(fetchedPosts);
      setVisiblePosts(fetchedPosts.slice(0, POSTS_PER_PAGE));
      setLoading(false);
    });

    // Cleanup listener on unmount to prevent memory leaks
    return () => {
      unsubscribe();
    };
  }, [userId]);

  // Lazy loading with Intersection Observer
  const loadMorePosts = useCallback(() => {
    const currentLength = visiblePosts.length;
    const nextPosts = posts.slice(currentLength, currentLength + POSTS_PER_PAGE);
    if (nextPosts.length > 0) {
      setVisiblePosts(prev => [...prev, ...nextPosts]);
    }
  }, [posts, visiblePosts]);

  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && visiblePosts.length < posts.length) {
          loadMorePosts();
        }
      },
      { rootMargin: '50px' }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    // Cleanup observer on unmount to prevent memory leaks
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [loadMorePosts, visiblePosts.length, posts.length]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Leaf size={24} className="text-emerald-400" />
        </div>
        <h3 className="text-white font-bold mb-2">Henüz paylaşım yok</h3>
        <p className="text-white/40 text-sm">İlk paylaşımı sen yap! 🌿</p>
      </div>
    );
  }

  return (
    <div className="pb-8">
      {/* Post Grid - Responsive: 2 columns on mobile, 3 on desktop */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
        {visiblePosts.map((post, index) => (
          <PostCard
            key={post.id}
            post={post}
            index={index}
            onClick={() => {
              setSelectedPost(post);
              onPostClick?.(post);
            }}
          />
        ))}
      </div>

      {/* Load More Trigger */}
      {visiblePosts.length < posts.length && (
        <div ref={loadMoreRef} className="flex items-center justify-center py-8">
          <div className="w-6 h-6 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
        </div>
      )}

      {/* Post Detail Modal */}
      {selectedPost && currentUser && (
        <PostDetailModal
          post={selectedPost}
          isOpen={!!selectedPost}
          onClose={() => setSelectedPost(null)}
          currentUserId={currentUser.uid}
          isAdmin={isAdmin}
        />
      )}
    </div>
  );
};
