import { ref, set, get, push, update, remove, onValue, off } from 'firebase/database';
import { db } from '../firebase';
import { awardEcoPoints } from './postService';
import { 
  VoiceRoom, 
  VoiceParticipant, 
  VoiceSettings, 
  VoiceRecording,
  VoiceTranscription,
  VoiceEffect,
  SoundEffect
} from '../types/voice';

/**
 * Advanced Voice Service
 * Better than Discord voice channels!
 * Features: AI noise suppression, transcription, effects, recording
 */

// ============================================================================
// VOICE ROOM MANAGEMENT
// ============================================================================

export async function createVoiceRoom(
  name: string,
  channelId: string,
  userId: string,
  options: Partial<VoiceRoom> = {}
): Promise<string> {
  const roomRef = push(ref(db, 'voice_rooms'));
  const roomId = roomRef.key!;
  
  const room: VoiceRoom = {
    id: roomId,
    name,
    channelId,
    
    maxParticipants: options.maxParticipants || 25,
    bitrate: options.bitrate || 64,
    region: options.region || 'auto',
    
    noiseSuppressionEnabled: options.noiseSuppressionEnabled ?? true,
    echoCancellationEnabled: options.echoCancellationEnabled ?? true,
    autoGainControlEnabled: options.autoGainControlEnabled ?? true,
    
    isRecording: false,
    
    participants: [],
    hostId: userId,
    moderatorIds: [userId],
    
    isActive: true,
    created_at: Date.now(),
    created_by: userId
  };
  
  await set(roomRef, room);
  return roomId;
}

export async function getVoiceRoom(roomId: string): Promise<VoiceRoom | null> {
  const snapshot = await get(ref(db, `voice_rooms/${roomId}`));
  
  if (!snapshot.exists()) return null;
  
  return { id: snapshot.key!, ...snapshot.val() };
}

export async function updateVoiceRoom(
  roomId: string,
  updates: Partial<VoiceRoom>
): Promise<void> {
  await update(ref(db, `voice_rooms/${roomId}`), updates);
}

export async function deleteVoiceRoom(roomId: string): Promise<void> {
  // Disconnect all participants first
  const room = await getVoiceRoom(roomId);
  if (room) {
    for (const participant of room.participants) {
      await leaveVoiceRoom(roomId, participant.userId);
    }
  }
  
  await remove(ref(db, `voice_rooms/${roomId}`));
}

// ============================================================================
// PARTICIPANT MANAGEMENT
// ============================================================================

export async function joinVoiceRoom(
  roomId: string,
  userId: string,
  username: string,
  avatar?: string
): Promise<void> {
  const room = await getVoiceRoom(roomId);
  
  if (!room) throw new Error('Voice room not found');
  if (room.participants.length >= room.maxParticipants) {
    throw new Error('Voice room is full');
  }
  
  const participant: VoiceParticipant = {
    userId,
    username,
    avatar,
    
    isMuted: false,
    isDeafened: false,
    isSpeaking: false,
    volume: 100,
    audioLevel: 0,
    
    hasVideo: false,
    videoEnabled: false,
    videoQuality: 'medium',
    
    isScreenSharing: false,
    screenShareQuality: 'medium',
    
    joinedAt: Date.now(),
    connectionQuality: 'good',
    latency: 0,
    packetLoss: 0,
    
    canSpeak: true,
    canShareScreen: true,
    canRecord: false,
    
    transcriptionEnabled: false,
    translationEnabled: false
  };
  
  const participants = [...room.participants, participant];
  await update(ref(db, `voice_rooms/${roomId}`), { participants });
  
  // Sesli odaya katılım için +5 Eco Points
  await awardEcoPoints(userId, 5, 'join_voice_room').catch(() => {});

  // Track analytics
  await trackVoiceJoin(roomId, userId);
}

export async function leaveVoiceRoom(
  roomId: string,
  userId: string
): Promise<void> {
  const room = await getVoiceRoom(roomId);
  
  if (!room) return;
  
  const participants = room.participants.filter(p => p.userId !== userId);
  await update(ref(db, `voice_rooms/${roomId}`), { participants });
  
  // Track analytics
  await trackVoiceLeave(roomId, userId);
  
  // If room is empty, mark as inactive
  if (participants.length === 0) {
    await update(ref(db, `voice_rooms/${roomId}`), { isActive: false });
  }
}

export async function updateParticipant(
  roomId: string,
  userId: string,
  updates: Partial<VoiceParticipant>
): Promise<void> {
  const room = await getVoiceRoom(roomId);
  
  if (!room) return;
  
  const participants = room.participants.map(p =>
    p.userId === userId ? { ...p, ...updates } : p
  );
  
  await update(ref(db, `voice_rooms/${roomId}`), { participants });
}

export async function toggleMute(
  roomId: string,
  userId: string
): Promise<void> {
  const room = await getVoiceRoom(roomId);
  if (!room) return;
  
  const participant = room.participants.find(p => p.userId === userId);
  if (!participant) return;
  
  await updateParticipant(roomId, userId, { isMuted: !participant.isMuted });
}

export async function toggleDeafen(
  roomId: string,
  userId: string
): Promise<void> {
  const room = await getVoiceRoom(roomId);
  if (!room) return;
  
  const participant = room.participants.find(p => p.userId === userId);
  if (!participant) return;
  
  await updateParticipant(roomId, userId, { 
    isDeafened: !participant.isDeafened,
    isMuted: !participant.isDeafened // Auto-mute when deafening
  });
}

export async function toggleVideo(
  roomId: string,
  userId: string
): Promise<void> {
  const room = await getVoiceRoom(roomId);
  if (!room) return;
  
  const participant = room.participants.find(p => p.userId === userId);
  if (!participant) return;
  
  await updateParticipant(roomId, userId, { 
    videoEnabled: !participant.videoEnabled,
    hasVideo: !participant.videoEnabled
  });
}

export async function toggleScreenShare(
  roomId: string,
  userId: string
): Promise<void> {
  const room = await getVoiceRoom(roomId);
  if (!room) return;
  
  const participant = room.participants.find(p => p.userId === userId);
  if (!participant || !participant.canShareScreen) return;
  
  await updateParticipant(roomId, userId, { 
    isScreenSharing: !participant.isScreenSharing 
  });
}

// ============================================================================
// AI FEATURES
// ============================================================================

export async function enableTranscription(
  roomId: string,
  userId: string
): Promise<void> {
  await updateParticipant(roomId, userId, { transcriptionEnabled: true });
}

export async function disableTranscription(
  roomId: string,
  userId: string
): Promise<void> {
  await updateParticipant(roomId, userId, { transcriptionEnabled: false });
}

export async function saveTranscription(
  roomId: string,
  userId: string,
  username: string,
  text: string,
  language: string,
  confidence: number
): Promise<void> {
  const transcriptionRef = push(ref(db, `voice_transcriptions/${roomId}`));
  
  const transcription: VoiceTranscription = {
    id: transcriptionRef.key!,
    roomId,
    userId,
    username,
    text,
    language,
    confidence,
    timestamp: Date.now(),
    duration: 0
  };
  
  await set(transcriptionRef, transcription);
}

export async function getTranscriptions(
  roomId: string
): Promise<VoiceTranscription[]> {
  const snapshot = await get(ref(db, `voice_transcriptions/${roomId}`));
  
  if (!snapshot.exists()) return [];
  
  const transcriptions: VoiceTranscription[] = [];
  snapshot.forEach((child) => {
    transcriptions.push({ id: child.key!, ...child.val() });
  });
  
  return transcriptions.sort((a, b) => a.timestamp - b.timestamp);
}

// ============================================================================
// RECORDING
// ============================================================================

export async function startRecording(
  roomId: string,
  userId: string
): Promise<void> {
  const room = await getVoiceRoom(roomId);
  
  if (!room) throw new Error('Voice room not found');
  if (room.hostId !== userId && !room.moderatorIds.includes(userId)) {
    throw new Error('Only host or moderators can start recording');
  }
  
  await update(ref(db, `voice_rooms/${roomId}`), {
    isRecording: true,
    recordingStartTime: Date.now()
  });
}

export async function stopRecording(
  roomId: string,
  userId: string,
  recordingUrl: string
): Promise<string> {
  const room = await getVoiceRoom(roomId);
  
  if (!room) throw new Error('Voice room not found');
  if (room.hostId !== userId && !room.moderatorIds.includes(userId)) {
    throw new Error('Only host or moderators can stop recording');
  }
  
  const recordingRef = push(ref(db, `voice_recordings/${roomId}`));
  const recordingId = recordingRef.key!;
  
  const recording: VoiceRecording = {
    id: recordingId,
    roomId,
    startTime: room.recordingStartTime || Date.now(),
    endTime: Date.now(),
    duration: Math.floor((Date.now() - (room.recordingStartTime || Date.now())) / 1000),
    fileSize: 0, // Will be updated after upload
    fileUrl: recordingUrl,
    participants: room.participants.map(p => p.userId),
    created_at: Date.now(),
    created_by: userId
  };
  
  await set(recordingRef, recording);
  
  await update(ref(db, `voice_rooms/${roomId}`), {
    isRecording: false,
    recordingStartTime: null,
    recordingUrl
  });
  
  return recordingId;
}

export async function getRecordings(roomId: string): Promise<VoiceRecording[]> {
  const snapshot = await get(ref(db, `voice_recordings/${roomId}`));
  
  if (!snapshot.exists()) return [];
  
  const recordings: VoiceRecording[] = [];
  snapshot.forEach((child) => {
    recordings.push({ id: child.key!, ...child.val() });
  });
  
  return recordings.sort((a, b) => b.created_at - a.created_at);
}

// ============================================================================
// VOICE EFFECTS
// ============================================================================

export async function applyVoiceEffect(
  roomId: string,
  userId: string,
  effect: VoiceEffect
): Promise<void> {
  // Store user's active effects
  await set(ref(db, `voice_effects/${roomId}/${userId}/${effect.id}`), effect);
}

export async function removeVoiceEffect(
  roomId: string,
  userId: string,
  effectId: string
): Promise<void> {
  await remove(ref(db, `voice_effects/${roomId}/${userId}/${effectId}`));
}

export async function getUserEffects(
  roomId: string,
  userId: string
): Promise<VoiceEffect[]> {
  const snapshot = await get(ref(db, `voice_effects/${roomId}/${userId}`));
  
  if (!snapshot.exists()) return [];
  
  const effects: VoiceEffect[] = [];
  snapshot.forEach((child) => {
    effects.push({ id: child.key!, ...child.val() });
  });
  
  return effects;
}

// ============================================================================
// SOUND EFFECTS
// ============================================================================

export async function playSoundEffect(
  roomId: string,
  userId: string,
  soundEffect: SoundEffect
): Promise<void> {
  // Broadcast sound effect to all participants
  await push(ref(db, `voice_sound_effects/${roomId}`), {
    userId,
    soundEffect,
    timestamp: Date.now()
  });
}

// ============================================================================
// ANALYTICS
// ============================================================================

async function trackVoiceJoin(roomId: string, userId: string): Promise<void> {
  const analyticsRef = ref(db, `voice_analytics/${roomId}`);
  const snapshot = await get(analyticsRef);
  
  const analytics = snapshot.exists() ? snapshot.val() : {
    roomId,
    totalSessions: 0,
    totalDuration: 0,
    averageDuration: 0,
    uniqueParticipants: 0,
    averageParticipants: 0,
    peakParticipants: 0,
    averageLatency: 0,
    averagePacketLoss: 0,
    connectionIssues: 0,
    screenShareCount: 0,
    recordingCount: 0,
    transcriptionCount: 0,
    mostActiveUsers: [],
    mostActiveHours: []
  };
  
  analytics.totalSessions++;
  
  await set(analyticsRef, analytics);
}

async function trackVoiceLeave(roomId: string, userId: string): Promise<void> {
  // Track session duration and update analytics
  // Implementation depends on session tracking
}

export async function getVoiceAnalytics(roomId: string) {
  const snapshot = await get(ref(db, `voice_analytics/${roomId}`));
  return snapshot.exists() ? snapshot.val() : null;
}

// ============================================================================
// REAL-TIME LISTENERS
// ============================================================================

export function listenToVoiceRoom(
  roomId: string,
  callback: (room: VoiceRoom) => void
): () => void {
  const roomRef = ref(db, `voice_rooms/${roomId}`);
  
  const unsubscribe = onValue(roomRef, (snapshot) => {
    if (snapshot.exists()) {
      callback({ id: snapshot.key!, ...snapshot.val() });
    }
  });
  
  return () => off(roomRef);
}

export function listenToTranscriptions(
  roomId: string,
  callback: (transcriptions: VoiceTranscription[]) => void
): () => void {
  const transcriptionsRef = ref(db, `voice_transcriptions/${roomId}`);
  
  const unsubscribe = onValue(transcriptionsRef, (snapshot) => {
    const transcriptions: VoiceTranscription[] = [];
    
    if (snapshot.exists()) {
      snapshot.forEach((child) => {
        transcriptions.push({ id: child.key!, ...child.val() });
      });
    }
    
    callback(transcriptions.sort((a, b) => a.timestamp - b.timestamp));
  });
  
  return () => off(transcriptionsRef);
}
