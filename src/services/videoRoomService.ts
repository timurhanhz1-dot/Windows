/**
 * Video Room Service
 * Firebase signaling wrapper for video conference rooms
 * Requirements: 1.1, 2.3, 2.4, 6.4
 */

import { ref, set, get, push, update, remove, onValue, off } from 'firebase/database';
import { db } from '../firebase';
import { 
  VideoRoom, 
  VideoParticipant, 
  SignalingMessage, 
  MediaPermissions,
  VideoConferenceError,
  VIDEO_CONFERENCE_CONSTANTS
} from '../types/videoConference';
import { WebRTCManager } from './webRTCManager';

export class VideoRoomService {
  private webRTCManager: WebRTCManager;
  private currentUserId: string | null = null;
  private currentRoomId: string | null = null;
  private eventListeners: Map<string, Function[]> = new Map();
  private signalingListeners: Map<string, () => void> = new Map();

  constructor() {
    this.webRTCManager = new WebRTCManager();
    this.setupWebRTCEventHandlers();
    
    // Inject signaling service into WebRTC manager
    this.webRTCManager.setSignalingService((message: SignalingMessage) => {
      return this.sendSignalingMessage(message);
    });
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  private setupWebRTCEventHandlers(): void {
    this.webRTCManager.on('signalingMessage', (message: SignalingMessage) => {
      this.sendSignalingMessage(message);
    });

    this.webRTCManager.on('localStreamReady', (stream: MediaStream) => {
      this.emit('localStreamReady', stream);
    });

    this.webRTCManager.on('remoteStreamReceived', (data: { userId: string; stream: MediaStream }) => {
      this.emit('remoteStreamReceived', data);
    });

    this.webRTCManager.on('connectionStateChanged', (data: { userId: string; state: RTCPeerConnectionState }) => {
      this.emit('connectionStateChanged', data);
    });

    this.webRTCManager.on('error', (error: VideoConferenceError) => {
      this.emit('error', error);
    });
  }

  // ============================================================================
  // ROOM MANAGEMENT - OPTIMIZED
  // ============================================================================

  async createVideoRoom(
    name: string,
    hostId: string,
    hostName: string,
    options: Partial<VideoRoom> = {}
  ): Promise<string> {
    // Validate inputs
    if (!name || name.trim().length === 0) {
      throw new Error('Room name is required');
    }
    if (name.length > 100) {
      throw new Error('Room name must be 100 characters or less');
    }
    if (!hostId || !hostName) {
      throw new Error('Host ID and name are required');
    }

    const roomRef = push(ref(db, 'video_rooms'));
    const roomId = roomRef.key!;

    const room: VideoRoom = {
      id: roomId,
      name: name.trim(),
      hostId,
      hostName,
      
      maxParticipants: Math.min(Math.max(options.maxParticipants || VIDEO_CONFERENCE_CONSTANTS.MAX_PARTICIPANTS, 2), 10),
      isPrivate: options.isPrivate || false,
      password: options.password,
      
      videoEnabled: options.videoEnabled !== false,
      screenShareEnabled: options.screenShareEnabled !== false,
      recordingEnabled: options.recordingEnabled || false,
      
      aiModerationEnabled: options.aiModerationEnabled || false,
      transcriptionEnabled: options.transcriptionEnabled || false,
      
      participants: [],
      isRecording: false,
      
      createdAt: Date.now(),
      lastActivity: Date.now()
    };

    // Validate password requirement
    if (room.isPrivate && !room.password) {
      throw new Error('Password is required for private rooms');
    }

    try {
      await set(roomRef, room);
      
      // Schedule automatic cleanup
      this.scheduleRoomCleanup(roomId);
      
      this.emit('roomCreated', { roomId, room });
      return roomId;
    } catch (error) {
      console.error('Error creating video room:', error);
      throw error;
    }
  }

  async joinVideoRoom(
    roomId: string,
    userId: string,
    username: string,
    avatar?: string,
    password?: string
  ): Promise<void> {
    try {
      const room = await this.getVideoRoom(roomId);
      
      if (!room) {
        const error: VideoConferenceError = {
          type: 'room-full',
          message: 'Video room not found'
        };
        throw error;
      }

      // Validate room access
      if (room.isPrivate && room.password !== password) {
        const error: VideoConferenceError = {
          type: 'permission-denied',
          message: 'Invalid room password'
        };
        throw error;
      }

      if (room.participants.length >= room.maxParticipants) {
        const error: VideoConferenceError = {
          type: 'room-full',
          message: `Room is full (${room.maxParticipants} participants maximum)`
        };
        throw error;
      }

      // Check if user is already in room — remove stale entry and rejoin cleanly
      const existingParticipant = room.participants.find(p => p.userId === userId);
      if (existingParticipant) {
        try {
          await remove(ref(db, `video_rooms/${roomId}/participants/${userId}`));
          await remove(ref(db, `video_signaling/${roomId}/${userId}`));
        } catch {
          // ignore cleanup errors
        }
      }

      // Request media permissions with fallback options
      const permissions = await this.requestMediaPermissions({
        video: room.videoEnabled,
        audio: true,
        fallbackToAudioOnly: true
      });
      
      // Initialize local stream with obtained permissions
      await this.webRTCManager.initializeLocalStream({
        video: permissions.camera,
        audio: permissions.microphone
      });

      // Create participant (omit undefined fields — Firebase rejects them)
      const participant: VideoParticipant = {
        userId,
        username: (username ?? 'Kullanıcı').trim(),
        ...(avatar !== undefined && { avatar }),
        joinedAt: Date.now(),
        
        isCameraOn: permissions.camera,
        isMicOn: permissions.microphone,
        isScreenSharing: false,
        
        connectionQuality: 'good',
        latency: 0,
        
        transcriptionEnabled: room.transcriptionEnabled,
        isSpeaking: false
      };

      // Write participant directly to their own path — matches DB rule: participants/$uid write = auth.uid === $uid
      const participantRef = ref(db, `video_rooms/${roomId}/participants/${userId}`);
      const clean = JSON.parse(JSON.stringify(participant));
      await set(participantRef, clean);

      // Update lastActivity separately (host can write root, others can't — skip if not host)
      try {
        await update(ref(db, `video_rooms/${roomId}`), { lastActivity: Date.now() });
      } catch {
        // Non-host users can't update root — that's fine
      }

      // Set current user and room
      this.currentUserId = userId;
      this.currentRoomId = roomId;
      
      // Set user ID in WebRTC manager
      this.webRTCManager.setCurrentUserId(userId);

      // Setup signaling listeners
      this.setupSignalingListeners(roomId, userId);

      // Establish peer connections with existing participants
      for (const existingParticipant of room.participants) {
        if (existingParticipant.userId !== userId) {
          // Later joiner initiates connection
          const isInitiator = participant.joinedAt > existingParticipant.joinedAt;
          await this.webRTCManager.createPeerConnection(existingParticipant.userId, isInitiator);
        }
      }

      // Start connection quality monitoring
      this.webRTCManager.startConnectionQualityMonitoring();

      this.emit('participantJoined', { roomId, participant });
      
    } catch (error) {
      console.error('Error joining video room:', error);
      
      // Cleanup on failure
      if (this.currentUserId === userId) {
        await this.webRTCManager.cleanup();
        this.currentUserId = null;
        this.currentRoomId = null;
      }
      
      throw error;
    }
  }

  private scheduleRoomCleanup(roomId: string): void {
    // Schedule cleanup after 30 minutes of inactivity
    setTimeout(async () => {
      const room = await this.getVideoRoom(roomId);
      if (room && room.participants.length === 0) {
        const inactiveTime = Date.now() - room.lastActivity;
        if (inactiveTime >= 30 * 60 * 1000) { // 30 minutes
          await this.deleteVideoRoom(roomId);
        }
      }
    }, 30 * 60 * 1000); // 30 minutes
  }

  async validateRoomAccess(roomId: string, password?: string): Promise<{ valid: boolean; room?: VideoRoom; error?: string }> {
    try {
      const room = await this.getVideoRoom(roomId);
      
      if (!room) {
        return { valid: false, error: 'Room not found' };
      }

      if (room.isPrivate && room.password !== password) {
        return { valid: false, error: 'Invalid password' };
      }

      if (room.participants.length >= room.maxParticipants) {
        return { valid: false, error: 'Room is full' };
      }

      return { valid: true, room };
    } catch (error) {
      return { valid: false, error: 'Failed to validate room access' };
    }
  }

  async getVideoRoom(roomId: string): Promise<VideoRoom | null> {
    try {
      const snapshot = await get(ref(db, `video_rooms/${roomId}`));
      
      if (!snapshot.exists()) {
        return null;
      }
      
      const data = snapshot.val();
      // Firebase RTDB stores arrays as objects — normalize participants
      const raw = data.participants;
      const participants: VideoParticipant[] = raw
        ? Array.isArray(raw)
          ? raw
          : Object.values(raw)
        : [];
      return {
        id: snapshot.key!,
        ...data,
        participants,
      };
    } catch (error) {
      console.error('Error getting video room:', error);
      return null;
    }
  }

  async updateVideoRoom(roomId: string, updates: Partial<VideoRoom>): Promise<void> {
    try {
      // Firebase rejects undefined values — strip them out
      // Also convert participants array to object (RTDB doesn't support sparse arrays well)
      const payload: any = { ...updates, lastActivity: Date.now() };
      if (Array.isArray(payload.participants)) {
        const participantsObj: Record<string, VideoParticipant> = {};
        payload.participants.forEach((p: VideoParticipant) => {
          participantsObj[p.userId] = p;
        });
        payload.participants = participantsObj;
      }
      const clean = JSON.parse(JSON.stringify(payload));
      await update(ref(db, `video_rooms/${roomId}`), clean);
    } catch (error) {
      console.error('Error updating video room:', error);
      throw error;
    }
  }

  async deleteVideoRoom(roomId: string): Promise<void> {
    try {
      // First disconnect all participants
      const room = await this.getVideoRoom(roomId);
      if (room) {
        for (const participant of room.participants) {
          await this.leaveVideoRoom(roomId, participant.userId);
        }
      }

      // Remove room data
      await remove(ref(db, `video_rooms/${roomId}`));
      await remove(ref(db, `video_signaling/${roomId}`));
      
      this.emit('roomDeleted', { roomId });
    } catch (error) {
      console.error('Error deleting video room:', error);
      throw error;
    }
  }

  // ============================================================================
  // PARTICIPANT MANAGEMENT
  // ============================================================================

  async leaveVideoRoom(roomId: string, userId: string): Promise<void> {
    try {
      const room = await this.getVideoRoom(roomId);
      if (!room) return;

      // Remove participant from their own path — matches DB rule: participants/$uid write = auth.uid === $uid
      await remove(ref(db, `video_rooms/${roomId}/participants/${userId}`));

      // Update lastActivity (best-effort)
      try {
        await update(ref(db, `video_rooms/${roomId}`), {
          ...(room.activeScreenShare === userId ? { activeScreenShare: null } : {}),
          lastActivity: Date.now()
        });
      } catch {
        // Non-host users can't update root — that's fine
      }

      // Clean up WebRTC connections
      if (this.currentUserId === userId) {
        await this.webRTCManager.cleanup();
        this.cleanupSignalingListeners();
        this.currentUserId = null;
        this.currentRoomId = null;
      }

      this.emit('participantLeft', { roomId, userId });

      // If room is now empty, schedule cleanup
      const remaining = room.participants.filter(p => p.userId !== userId);
      if (remaining.length === 0) {
        this.scheduleRoomCleanup(roomId);
      }
      
    } catch (error) {
      console.error('Error leaving video room:', error);
      throw error;
    }
  }

  async handleConnectionFailure(userId: string, reason: string): Promise<void> {
    if (!this.currentRoomId) return;

    try {
      // Attempt to re-establish connection
      const room = await this.getVideoRoom(this.currentRoomId);
      if (room && room.participants.find(p => p.userId === userId)) {
        // Try to reconnect
        await this.webRTCManager.createPeerConnection(userId, true);
        
        this.emit('connectionRecoveryAttempt', { userId, reason });
      }
    } catch (error) {
      console.error(`Failed to recover connection for ${userId}:`, error);
      this.emit('connectionRecoveryFailed', { userId, reason, error });
    }
  }

  async updateRoomSettings(roomId: string, settings: Partial<VideoRoom>): Promise<void> {
    try {
      const room = await this.getVideoRoom(roomId);
      if (!room) {
        throw new Error('Room not found');
      }

      // Validate settings
      if (settings.maxParticipants !== undefined) {
        if (settings.maxParticipants < 2 || settings.maxParticipants > 10) {
          throw new Error('Max participants must be between 2 and 10');
        }
        if (settings.maxParticipants < room.participants.length) {
          throw new Error('Cannot reduce capacity below current participant count');
        }
      }

      if (settings.isPrivate !== undefined && settings.isPrivate && !settings.password && !room.password) {
        throw new Error('Password is required for private rooms');
      }

      await this.updateVideoRoom(roomId, {
        ...settings,
        lastActivity: Date.now()
      });

      this.emit('roomSettingsUpdated', { roomId, settings });
      
    } catch (error) {
      console.error('Error updating room settings:', error);
      throw error;
    }
  }

  getConnectionState(): { 
    isConnected: boolean; 
    roomId: string | null; 
    userId: string | null; 
    participantCount: number;
    connectionQuality: string;
  } {
    return {
      isConnected: this.currentRoomId !== null && this.currentUserId !== null,
      roomId: this.currentRoomId,
      userId: this.currentUserId,
      participantCount: this.webRTCManager.getConnectedPeers().length + (this.currentUserId ? 1 : 0),
      connectionQuality: this.getAverageConnectionQuality()
    };
  }

  getWebRTCManager(): WebRTCManager {
    return this.webRTCManager;
  }

  private getAverageConnectionQuality(): string {
    const connectedPeers = this.webRTCManager.getConnectedPeers();
    if (connectedPeers.length === 0) return 'good';
    
    // This would be enhanced with actual quality metrics
    return 'good';
  }

  async updateParticipant(
    roomId: string,
    userId: string,
    updates: Partial<VideoParticipant>
  ): Promise<void> {
    try {
      const room = await this.getVideoRoom(roomId);
      if (!room) return;

      const updatedParticipants = room.participants.map(p =>
        p.userId === userId ? { ...p, ...updates } : p
      );

      await this.updateVideoRoom(roomId, { participants: updatedParticipants });
      
      this.emit('participantUpdated', { roomId, userId, updates });
      
    } catch (error) {
      console.error('Error updating participant:', error);
      throw error;
    }
  }

  // ============================================================================
  // ENHANCED MEDIA CONTROLS
  // ============================================================================

  async toggleCamera(roomId: string, userId: string): Promise<void> {
    const room = await this.getVideoRoom(roomId);
    if (!room) return;

    const participant = room.participants.find(p => p.userId === userId);
    if (!participant) return;

    const newCameraState = !participant.isCameraOn;
    
    try {
      if (newCameraState) {
        // Turn camera on - request permission first
        const permissions = await this.requestMediaPermissions({ video: true, audio: false });
        if (!permissions.camera) {
          throw new Error('Camera permission denied');
        }
        
        // Initialize camera stream
        await this.webRTCManager.initializeLocalStream({ 
          video: true, 
          audio: participant.isMicOn 
        });
        
        // Update participant state
        await this.updateParticipant(roomId, userId, { isCameraOn: true });
        
      } else {
        // Turn camera off - replace with black video track
        const blackTrack = this.createBlackVideoTrack();
        await this.webRTCManager.replaceVideoTrack(blackTrack);
        
        // Update participant state
        await this.updateParticipant(roomId, userId, { isCameraOn: false });
      }
      
      this.emit('cameraToggled', { roomId, userId, isOn: newCameraState });
      
    } catch (error) {
      console.error('Error toggling camera:', error);
      
      // Revert state if failed
      await this.updateParticipant(roomId, userId, { isCameraOn: participant.isCameraOn });
      
      const videoError: VideoConferenceError = {
        type: 'permission-denied',
        message: 'Failed to toggle camera'
      };
      this.emit('error', videoError);
      throw videoError;
    }
  }

  async toggleMicrophone(roomId: string, userId: string): Promise<void> {
    const room = await this.getVideoRoom(roomId);
    if (!room) return;

    const participant = room.participants.find(p => p.userId === userId);
    if (!participant) return;

    const newMicState = !participant.isMicOn;
    
    try {
      if (newMicState) {
        // Turn microphone on - request permission first
        const permissions = await this.requestMediaPermissions({ video: false, audio: true });
        if (!permissions.microphone) {
          throw new Error('Microphone permission denied');
        }
        
        // Initialize audio stream
        await this.webRTCManager.initializeLocalStream({ 
          video: participant.isCameraOn, 
          audio: true 
        });
      }
      
      // Update participant state
      await this.updateParticipant(roomId, userId, { isMicOn: newMicState });
      
      // Enable/disable audio track
      const localStream = this.webRTCManager.getLocalStream();
      if (localStream) {
        const audioTracks = localStream.getAudioTracks();
        audioTracks.forEach(track => {
          track.enabled = newMicState;
        });
      }
      
      this.emit('microphoneToggled', { roomId, userId, isOn: newMicState });
      
    } catch (error) {
      console.error('Error toggling microphone:', error);
      
      // Revert state if failed
      await this.updateParticipant(roomId, userId, { isMicOn: participant.isMicOn });
      
      const videoError: VideoConferenceError = {
        type: 'permission-denied',
        message: 'Failed to toggle microphone'
      };
      this.emit('error', videoError);
      throw videoError;
    }
  }

  async startScreenShare(roomId: string, userId: string): Promise<void> {
    try {
      const room = await this.getVideoRoom(roomId);
      if (!room) return;

      // Check if someone else is already sharing
      const currentSharer = room.participants.find(p => p.isScreenSharing);
      if (currentSharer && currentSharer.userId !== userId) {
        const error: VideoConferenceError = {
          type: 'screen-share-conflict',
          message: 'Another participant is already sharing screen'
        };
        throw error;
      }

      // Request screen capture
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true
      } as any); // Type assertion for getDisplayMedia constraints

      // Replace video track
      const videoTrack = displayStream.getVideoTracks()[0];
      await this.webRTCManager.replaceVideoTrack(videoTrack);

      // Update participant state
      await this.updateParticipant(roomId, userId, { isScreenSharing: true });
      await this.updateVideoRoom(roomId, { activeScreenShare: userId });

      // Handle screen share end
      videoTrack.addEventListener('ended', () => {
        this.stopScreenShare(roomId, userId);
      });

      this.emit('screenShareStarted', { roomId, userId });
      
    } catch (error) {
      console.error('Error starting screen share:', error);
      throw error;
    }
  }

  async stopScreenShare(roomId: string, userId: string): Promise<void> {
    try {
      // Get camera stream back
      const cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
      const cameraTrack = cameraStream.getVideoTracks()[0];
      
      // Replace screen share track with camera
      await this.webRTCManager.replaceVideoTrack(cameraTrack);

      // Update participant state
      await this.updateParticipant(roomId, userId, { isScreenSharing: false });
      await this.updateVideoRoom(roomId, { activeScreenShare: undefined });

      this.emit('screenShareStopped', { roomId, userId });
      
    } catch (error) {
      console.error('Error stopping screen share:', error);
      // If camera fails, use black video track
      const blackTrack = this.createBlackVideoTrack();
      await this.webRTCManager.replaceVideoTrack(blackTrack);
      
      await this.updateParticipant(roomId, userId, { 
        isScreenSharing: false,
        isCameraOn: false 
      });
      await this.updateVideoRoom(roomId, { activeScreenShare: undefined });
    }
  }

  // ============================================================================
  // SIGNALING
  // ============================================================================

  private async sendSignalingMessage(message: SignalingMessage): Promise<void> {
    if (!this.currentRoomId) return;

    try {
      const signalingRef = push(ref(db, `video_signaling/${this.currentRoomId}/${message.toUserId}`));
      await set(signalingRef, message);
    } catch (error) {
      console.error('Error sending signaling message:', error);
    }
  }

  private setupSignalingListeners(roomId: string, userId: string): void {
    const signalingRef = ref(db, `video_signaling/${roomId}/${userId}`);
    
    const unsubscribe = onValue(signalingRef, (snapshot) => {
      if (!snapshot.exists()) return;

      snapshot.forEach((child) => {
        const message: SignalingMessage = child.val();
        this.handleSignalingMessage(message);
        
        // Remove processed message
        remove(child.ref);
      });
    });

    this.signalingListeners.set(`signaling_${roomId}_${userId}`, unsubscribe);
  }

  private async handleSignalingMessage(message: SignalingMessage): Promise<void> {
    try {
      switch (message.type) {
        case 'offer':
          await this.webRTCManager.handleOffer(message.data, message.fromUserId);
          break;
        case 'answer':
          await this.webRTCManager.handleAnswer(message.data, message.fromUserId);
          break;
        case 'ice-candidate':
          await this.webRTCManager.handleIceCandidate(message.data, message.fromUserId);
          break;
      }
    } catch (error) {
      console.error('Error handling signaling message:', error);
    }
  }

  private cleanupSignalingListeners(): void {
    for (const [, unsubscribe] of this.signalingListeners) {
      unsubscribe();
    }
    this.signalingListeners.clear();
  }

  // ============================================================================
  // MEDIA PERMISSIONS & DEVICE MANAGEMENT
  // ============================================================================

  async requestMediaPermissions(options: { 
    video?: boolean; 
    audio?: boolean; 
    fallbackToAudioOnly?: boolean 
  } = {}): Promise<MediaPermissions> {
    const { video = true, audio = true, fallbackToAudioOnly = true } = options;
    
    const permissions: MediaPermissions = {
      camera: false,
      microphone: false,
      screen: false
    };

    // Check if permissions API is available
    if (navigator.permissions) {
      try {
        const cameraPermission = await navigator.permissions.query({ name: 'camera' as PermissionName });
        const micPermission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        
        // If already denied, don't attempt getUserMedia
        if (video && cameraPermission.state === 'denied') {}
        if (audio && micPermission.state === 'denied') {}
      } catch (error) {
        // Permissions API not fully supported
      }
    }

    // Test camera permission
    if (video) {
      try {
        const videoStream = await navigator.mediaDevices.getUserMedia({ 
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 }
          }
        });
        permissions.camera = true;
        videoStream.getTracks().forEach(track => track.stop());
      } catch (error: any) {
        this.handlePermissionError('camera', error);
      }
    }

    // Test microphone permission
    if (audio) {
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });
        permissions.microphone = true;
        audioStream.getTracks().forEach(track => track.stop());
      } catch (error: any) {
        this.handlePermissionError('microphone', error);
      }
    }

    // Fallback logic
    if (!permissions.camera && !permissions.microphone) {
      if (fallbackToAudioOnly && video) {
        return this.requestMediaPermissions({ video: false, audio: true, fallbackToAudioOnly: false });
      } else {
        const error: VideoConferenceError = {
          type: 'permission-denied',
          message: 'Both camera and microphone permissions denied. Please enable at least one to join the video room.'
        };
        throw error;
      }
    }

    return permissions;
  }

  private handlePermissionError(deviceType: 'camera' | 'microphone', error: any): void {
    let message = '';
    
    switch (error.name) {
      case 'NotAllowedError':
        message = `${deviceType} access denied. Please allow ${deviceType} access in your browser settings.`;
        break;
      case 'NotFoundError':
        message = `No ${deviceType} device found. Please connect a ${deviceType} and try again.`;
        break;
      case 'NotReadableError':
        message = `${deviceType} is being used by another application. Please close other applications and try again.`;
        break;
      case 'OverconstrainedError':
        message = `${deviceType} doesn't meet the required specifications. Please check your device settings.`;
        break;
      default:
        message = `Failed to access ${deviceType}. Please check your device and browser settings.`;
    }
    
    this.emit('permissionError', { deviceType, message, error });
  }

  async enumerateDevices(): Promise<{ cameras: MediaDeviceInfo[]; microphones: MediaDeviceInfo[]; speakers: MediaDeviceInfo[] }> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      
      return {
        cameras: devices.filter(device => device.kind === 'videoinput'),
        microphones: devices.filter(device => device.kind === 'audioinput'),
        speakers: devices.filter(device => device.kind === 'audiooutput')
      };
    } catch (error) {
      console.error('Error enumerating devices:', error);
      return { cameras: [], microphones: [], speakers: [] };
    }
  }

  async switchCamera(deviceId: string): Promise<void> {
    if (!this.currentRoomId || !this.currentUserId) return;

    try {
      // Get new camera stream
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: deviceId } },
        audio: false
      });

      const newVideoTrack = newStream.getVideoTracks()[0];
      
      // Replace track in WebRTC manager
      await this.webRTCManager.replaceVideoTrack(newVideoTrack);
      
      this.emit('deviceSwitched', { type: 'camera', deviceId });
      
    } catch (error) {
      console.error('Error switching camera:', error);
      const videoError: VideoConferenceError = {
        type: 'permission-denied',
        message: 'Failed to switch camera device'
      };
      this.emit('error', videoError);
    }
  }

  async switchMicrophone(deviceId: string): Promise<void> {
    if (!this.currentRoomId || !this.currentUserId) return;

    try {
      // Get new microphone stream
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: false,
        audio: { deviceId: { exact: deviceId } }
      });

      const newAudioTrack = newStream.getAudioTracks()[0];
      
      // Replace audio track in local stream
      const localStream = this.webRTCManager.getLocalStream();
      if (localStream) {
        const oldAudioTrack = localStream.getAudioTracks()[0];
        if (oldAudioTrack) {
          localStream.removeTrack(oldAudioTrack);
          oldAudioTrack.stop();
        }
        localStream.addTrack(newAudioTrack);
        
        // Update all peer connections
        for (const [userId] of this.webRTCManager.getPeerConnections()) {
          const peerConnection = this.webRTCManager.getPeerConnections().get(userId)?.connection;
          if (peerConnection) {
            const sender = peerConnection.getSenders().find(s => s.track?.kind === 'audio');
            if (sender) {
              await sender.replaceTrack(newAudioTrack);
            }
          }
        }
      }
      
      this.emit('deviceSwitched', { type: 'microphone', deviceId });
      
    } catch (error) {
      console.error('Error switching microphone:', error);
      const videoError: VideoConferenceError = {
        type: 'permission-denied',
        message: 'Failed to switch microphone device'
      };
      this.emit('error', videoError);
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  private createBlackVideoTrack(): MediaStreamTrack {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    const stream = canvas.captureStream(1);
    return stream.getVideoTracks()[0];
  }

  private async cleanupEmptyRoom(roomId: string): Promise<void> {
    const room = await this.getVideoRoom(roomId);
    if (room && room.participants.length === 0) {
      await this.deleteVideoRoom(roomId);
    }
  }

  // ============================================================================
  // REAL-TIME LISTENERS
  // ============================================================================

  listenToVideoRoom(roomId: string, callback: (room: VideoRoom) => void): () => void {
    const roomRef = ref(db, `video_rooms/${roomId}`);
    
    const unsubscribe = onValue(roomRef, (snapshot) => {
      if (snapshot.exists()) {
        callback({ id: snapshot.key!, ...snapshot.val() });
      }
    });
    
    return unsubscribe;
  }

  // ============================================================================
  // EVENT SYSTEM
  // ============================================================================

  on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  off(event: string, callback: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, data?: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }

  // ============================================================================
  // CLEANUP
  // ============================================================================

  async cleanup(): Promise<void> {
    if (this.currentRoomId && this.currentUserId) {
      await this.leaveVideoRoom(this.currentRoomId, this.currentUserId);
    }
    
    await this.webRTCManager.cleanup();
    this.cleanupSignalingListeners();
    this.eventListeners.clear();
  }
}