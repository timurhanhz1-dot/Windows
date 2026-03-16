import { create } from 'zustand';
import { User } from 'firebase/auth';

// Types
export interface Channel {
  id: string;
  name: string;
  description?: string;
  created_at?: number;
  created_by?: string;
}

export interface Message {
  id: string;
  channel_id: string;
  sender_id: string;
  sender_name: string;
  content: string;
  timestamp: number | string;
  type?: 'text' | 'image' | 'file';
  reactions?: Record<string, string[]>;
  pinned?: boolean;
}

export interface AppState {
  // User State
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  
  // Channels
  channels: Channel[];
  setChannels: (channels: Channel[]) => void;
  addChannel: (channel: Channel) => void;
  
  // Messages
  messages: Message[];
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  updateMessage: (id: string, updates: Partial<Message>) => void;
  deleteMessage: (id: string) => void;
  
  // Active States
  activeChannelId: string;
  setActiveChannelId: (id: string) => void;
  activeDmUserId: string | null;
  setActiveDmUserId: (id: string | null) => void;
  
  // Online Users
  onlineUsers: string[];
  setOnlineUsers: (users: string[]) => void;
  
  // All Users
  allUsers: any[];
  setAllUsers: (users: any[]) => void;
  
  // UI State
  mobileSidebarOpen: boolean;
  setMobileSidebarOpen: (open: boolean) => void;
  showSettings: boolean;
  setShowSettings: (show: boolean) => void;
  
  // Loading States
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  
  // Error State
  error: string | null;
  setError: (error: string | null) => void;
  clearError: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  // User State
  currentUser: null,
  setCurrentUser: (user) => set({ currentUser: user }),
  
  // Channels
  channels: [],
  setChannels: (channels) => set({ channels }),
  addChannel: (channel) => set((state) => ({ 
    channels: [...state.channels, channel] 
  })),
  
  // Messages
  messages: [],
  setMessages: (messages) => set({ messages }),
  addMessage: (message) => set((state) => ({ 
    messages: [...state.messages, message] 
  })),
  updateMessage: (id, updates) => set((state) => ({
    messages: state.messages.map(msg => 
      msg.id === id ? { ...msg, ...updates } : msg
    )
  })),
  deleteMessage: (id) => set((state) => ({
    messages: state.messages.filter(msg => msg.id !== id)
  })),
  
  // Active States
  activeChannelId: 'genel',
  setActiveChannelId: (id) => set({ activeChannelId: id }),
  activeDmUserId: null,
  setActiveDmUserId: (id) => set({ activeDmUserId: id }),
  
  // Online Users
  onlineUsers: [],
  setOnlineUsers: (users) => set({ onlineUsers: users }),
  
  // All Users
  allUsers: [],
  setAllUsers: (users) => set({ allUsers: users }),
  
  // UI State
  mobileSidebarOpen: false,
  setMobileSidebarOpen: (open) => set({ mobileSidebarOpen: open }),
  showSettings: false,
  setShowSettings: (show) => set({ showSettings: show }),
  
  // Loading States
  isLoading: false,
  setIsLoading: (loading) => set({ isLoading: loading }),
  
  // Error State
  error: null,
  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),
}));

// Selectors (optional, for better performance)
export const selectCurrentUser = (state: AppState) => state.currentUser;
export const selectChannels = (state: AppState) => state.channels;
export const selectMessages = (state: AppState) => state.messages;
export const selectActiveChannelId = (state: AppState) => state.activeChannelId;
export const selectOnlineUsers = (state: AppState) => state.onlineUsers;
