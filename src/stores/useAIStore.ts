import { create } from 'zustand';

export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: number;
}

export interface AISession {
  id: string;
  mode: 'chat' | 'content' | 'code' | 'image' | 'image-gen';
  input: string;
  result: string;
  createdAt: number;
}

export interface UserMemoryProfile {
  goals: string[];
  interests: string[];
  preferences: string[];
  tone: string;
  summary: string;
}

export interface AIState {
  // Chat History
  aiHistory: AIMessage[];
  setAIHistory: (history: AIMessage[]) => void;
  addAIMessage: (message: AIMessage) => void;
  clearAIHistory: () => void;
  
  // Memory Profile
  memoryProfile: UserMemoryProfile;
  setMemoryProfile: (profile: UserMemoryProfile) => void;
  updateMemoryProfile: (updates: Partial<UserMemoryProfile>) => void;
  
  // AI Sessions
  aiSessions: AISession[];
  setAISessions: (sessions: AISession[]) => void;
  addAISession: (session: AISession) => void;
  
  // AI Loading State
  aiLoading: boolean;
  setAILoading: (loading: boolean) => void;
  
  // AI Error
  aiError: string | null;
  setAIError: (error: string | null) => void;
  clearAIError: () => void;
  
  // Generated Images
  generatedImages: string[];
  addGeneratedImage: (url: string) => void;
  clearGeneratedImages: () => void;
  
  // Companion Insight
  companionInsight: string;
  setCompanionInsight: (insight: string) => void;
}

const defaultMemoryProfile: UserMemoryProfile = {
  goals: [],
  interests: [],
  preferences: [],
  tone: 'dengeli',
  summary: ''
};

export const useAIStore = create<AIState>((set) => ({
  // Chat History
  aiHistory: [],
  setAIHistory: (history) => set({ aiHistory: history }),
  addAIMessage: (message) => set((state) => ({
    aiHistory: [...state.aiHistory, { ...message, timestamp: Date.now() }]
  })),
  clearAIHistory: () => set({ aiHistory: [] }),
  
  // Memory Profile
  memoryProfile: defaultMemoryProfile,
  setMemoryProfile: (profile) => set({ memoryProfile: profile }),
  updateMemoryProfile: (updates) => set((state) => ({
    memoryProfile: { ...state.memoryProfile, ...updates }
  })),
  
  // AI Sessions
  aiSessions: [],
  setAISessions: (sessions) => set({ aiSessions: sessions }),
  addAISession: (session) => set((state) => ({
    aiSessions: [session, ...state.aiSessions].slice(0, 50) // Keep last 50
  })),
  
  // AI Loading State
  aiLoading: false,
  setAILoading: (loading) => set({ aiLoading: loading }),
  
  // AI Error
  aiError: null,
  setAIError: (error) => set({ aiError: error }),
  clearAIError: () => set({ aiError: null }),
  
  // Generated Images
  generatedImages: [],
  addGeneratedImage: (url) => set((state) => ({
    generatedImages: [...state.generatedImages, url]
  })),
  clearGeneratedImages: () => set({ generatedImages: [] }),
  
  // Companion Insight
  companionInsight: 'NatureBot bugün sana eşlik etmeye hazır.',
  setCompanionInsight: (insight) => set({ companionInsight: insight }),
}));

// Selectors
export const selectAIHistory = (state: AIState) => state.aiHistory;
export const selectMemoryProfile = (state: AIState) => state.memoryProfile;
export const selectAILoading = (state: AIState) => state.aiLoading;
export const selectGeneratedImages = (state: AIState) => state.generatedImages;
