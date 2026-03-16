// Advanced DM Service - AI-powered direct messaging features
// Standalone service to avoid circular dependencies

interface DMMessage {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  type: 'text' | 'voice' | 'file';
  timestamp: number;
}

interface Conversation {
  id: string;
  participants: string[];
  createdBy: string;
  type: string;
  createdAt: number;
}

interface SmartReplySuggestions {
  suggestions: string[];
}

class AdvancedDMService {
  private conversations: Map<string, Conversation> = new Map();
  private messages: Map<string, DMMessage[]> = new Map();

  createConversation(participants: string[], createdBy: string, type: string = 'dm'): Conversation {
    const id = participants.sort().join('_');
    const conversation: Conversation = {
      id,
      participants,
      createdBy,
      type,
      createdAt: Date.now(),
    };
    this.conversations.set(id, conversation);
    return conversation;
  }

  getConversation(conversationId: string): Conversation | undefined {
    return this.conversations.get(conversationId);
  }

  async sendMessage(
    conversationId: string,
    senderId: string,
    content: string,
    type: 'text' | 'voice' | 'file' = 'text'
  ): Promise<DMMessage> {
    const message: DMMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      conversationId,
      senderId,
      content,
      type,
      timestamp: Date.now(),
    };

    const existing = this.messages.get(conversationId) || [];
    existing.push(message);
    this.messages.set(conversationId, existing);

    return message;
  }

  async sendVoiceMessage(conversationId: string, senderId: string, audioBlob: Blob): Promise<DMMessage> {
    const url = URL.createObjectURL(audioBlob);
    return this.sendMessage(conversationId, senderId, url, 'voice');
  }

  async generateSmartReplies(conversationId: string, lastMessage: any): Promise<SmartReplySuggestions> {
    const content = lastMessage?.content || '';
    const suggestions: string[] = [];

    if (content.includes('?')) {
      suggestions.push('Evet, tabii ki!', 'Hayır, maalesef.', 'Biraz daha düşünmem lazım.');
    } else {
      suggestions.push('Anladım 👍', 'Harika!', 'Tamam, not aldım.');
    }

    return { suggestions };
  }

  getMessages(conversationId: string): DMMessage[] {
    return this.messages.get(conversationId) || [];
  }
}

export const advancedDMService = new AdvancedDMService();
