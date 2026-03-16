
import {
  get,
  push,
  ref,
  remove,
  query,
  orderByChild,
  equalTo,
} from "firebase/database";
import { db } from "../firebase";

export interface SavedConversation {
  id?: string;
  userId: string;
  role: "user" | "assistant";
  content: string;
  created_at: number;
}

export async function saveConversationMessage(
  userId: string,
  role: "user" | "assistant",
  content: string
) {
  const listRef = ref(db, `ai_conversations/${userId}`);
  await push(listRef, {
    userId,
    role,
    content,
    created_at: Date.now(),
  });
}

export async function getConversationHistory(userId: string): Promise<SavedConversation[]> {
  const listRef = ref(db, `ai_conversations/${userId}`);
  const snapshot = await get(listRef);

  if (!snapshot.exists()) return [];

  const raw = snapshot.val() || {};
  return Object.entries(raw)
    .map(([id, value]: any) => ({
      id,
      ...(value as SavedConversation),
    }))
    .sort((a, b) => a.created_at - b.created_at);
}

export async function clearConversationHistory(userId: string) {
  const listRef = ref(db, `ai_conversations/${userId}`);
  await remove(listRef);
}
