export interface Channel {
  id: string;
  name: string;
  server_id: string;
  type: 'text' | 'voice' | 'forum';
  category?: string;
  is_locked?: number;
  slow_mode?: number;
}

export interface Message {
  id: string;
  channel_id?: string;
  sender_id: string;
  sender_name?: string;
  sender_avatar?: string;
  content: string;
  reply_to_id?: string;
  is_pinned?: boolean;
  is_edited?: boolean;
  edit_history?: string[];
  type: 'text' | 'file' | 'image' | 'system';
  timestamp: string;
  reactions?: Record<string, string[]>; // emoji -> [userId]
  file_url?: string;
  file_name?: string;
  file_type?: string;
  mentions?: string[]; // user ids
  role?: "user" | "model";
}

export interface User {
  id: string;
  username: string;
  avatar?: string;
  bio?: string;
  status: 'online' | 'idle' | 'dnd' | 'offline';
  status_message?: string;
  is_admin?: boolean;
  is_banned?: boolean;
  badges?: string[];
  message_count?: number;
  social_links?: { twitter?: string; github?: string; instagram?: string; };
  friends?: string[];
  friend_requests?: string[];
  blocked?: string[];
  created_at?: string;
  daily_reward_last?: string;
  xp?: number;
}

export interface Guild {
  id: string;
  name: string;
  emoji?: string;
  color?: string;
  owner_id: string;
  invite_code?: string;
  members?: Record<string, 'owner' | 'admin' | 'member'>;
  created_at?: string;
}

export interface Notification {
  id: string;
  type: 'friend_request' | 'mention' | 'game_invite' | 'message' | 'system';
  from_id?: string;
  from_name?: string;
  content: string;
  read: boolean;
  timestamp: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in-progress' | 'done';
  assignee_id?: string;
  due_date?: string;
}

export interface SiteSettings {
  site_name: string;
  maintenance_mode: string;
  maintenance_message: string;
  allow_registration: string;
  accent_color?: string;
}

// Export video conference types
export * from './videoConference';
