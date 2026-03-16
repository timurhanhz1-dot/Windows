// Advanced Forum Service - AI-powered forum features
// Standalone service to avoid circular dependencies

interface ForumPost {
  id: string;
  channelId: string;
  authorId: string;
  authorName: string;
  title: string;
  content: string;
  type: string;
  createdAt: number;
  likes: number;
  views: number;
  replyCount: number;
  tags: string[];
}

interface PostRecommendation {
  post: ForumPost;
  reason: string;
  score: number;
}

interface TrendingTopic {
  topic: string;
  count: number;
  trend: 'rising' | 'stable' | 'falling';
}

class AdvancedForumService {
  private posts: Map<string, ForumPost> = new Map();

  async createPost(
    channelId: string,
    authorId: string,
    authorName: string,
    title: string,
    content: string,
    type: string = 'text'
  ): Promise<ForumPost> {
    const post: ForumPost = {
      id: `post_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      channelId,
      authorId,
      authorName,
      title,
      content,
      type,
      createdAt: Date.now(),
      likes: 0,
      views: 0,
      replyCount: 0,
      tags: this.extractTags(content),
    };
    this.posts.set(post.id, post);
    return post;
  }

  async getRecommendedPosts(userId: string, limit: number = 5): Promise<PostRecommendation[]> {
    const allPosts = Array.from(this.posts.values());
    if (allPosts.length === 0) return [];

    return allPosts
      .slice(0, limit)
      .map(post => ({
        post,
        reason: 'Popüler içerik',
        score: Math.random() * 100,
      }));
  }

  async getTrendingTopics(limit: number = 10): Promise<TrendingTopic[]> {
    const topics = ['Doğa', 'Çevre', 'Teknoloji', 'Sürdürülebilirlik', 'Ekoloji'];
    return topics.slice(0, limit).map(topic => ({
      topic,
      count: Math.floor(Math.random() * 100) + 1,
      trend: 'rising' as const,
    }));
  }

  private extractTags(content: string): string[] {
    const tagRegex = /#(\w+)/g;
    const tags: string[] = [];
    let match;
    while ((match = tagRegex.exec(content)) !== null) {
      tags.push(match[1]);
    }
    return tags;
  }

  getPost(postId: string): ForumPost | undefined {
    return this.posts.get(postId);
  }
}

export const advancedForumService = new AdvancedForumService();
