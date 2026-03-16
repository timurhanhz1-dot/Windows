
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { db } from "../config/firebaseSecure";

export interface SavedConversation {
  id?: string;
  userId: string;
  role: "user" | "assistant";
  content: string;
  createdAt?: any;
}

export async function saveConversationMessage(
  userId: string,
  role: "user" | "assistant",
  content: string
) {
  await addDoc(collection(db, "ai_conversations"), {
    userId,
    role,
    content,
    createdAt: serverTimestamp(),
  });
}

export async function getConversationHistory(userId: string): Promise<SavedConversation[]> {
  const q = query(
    collection(db, "ai_conversations"),
    where("userId", "==", userId),
    orderBy("createdAt", "asc")
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({
    id: d.id,
    ...(d.data() as SavedConversation),
  }));
}

export async function clearConversationHistory(userId: string) {
  const q = query(collection(db, "ai_conversations"), where("userId", "==", userId));
  const snapshot = await getDocs(q);

  await Promise.all(snapshot.docs.map((item) => deleteDoc(doc(db, "ai_conversations", item.id))));
}
