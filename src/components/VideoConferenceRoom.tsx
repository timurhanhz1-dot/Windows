/**
 * VideoConferenceRoom — Video Konferans Odaları
 * VoiceRooms'dan genişletilmiş video konferans sistemi
 * Requirements: 1.1, 2.2, 2.3, 2.4
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Video, VideoOff, Mic, MicOff, PhoneOff, Monitor, MonitorOff,
  Users, Plus, Lock, Unlock, Crown, X, Check, Settings,
  Volume2, VolumeX, Camera, CameraOff
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { db } from '../firebase';
import { ref, onValue, set, remove, off, push, get, update } from 'firebase/database';
import { VideoRoomService } from '../services/videoRoomService';
import VideoGrid from './VideoGrid';
import MediaControls from './MediaControls';
import ScreenShareControls from './ScreenShareControls';
import TranscriptionPanel from './TranscriptionPanel';
import { AITranscriptionService } from '../services/aiTranscriptionService';
import { 
  VideoRoom, 
  VideoParticipant, 
  MediaControlState,
  VideoConferenceError,
  ICE_SERVERS,
  VIDEO_CONFERENCE_CONSTANTS 
} from '../types/videoConference';

const MAX_PARTICIPANTS = VIDEO_CONFERENCE_CONSTANTS.MAX_PARTICIPANTS;

interface VideoRoomProps {
  userId: string;
  username: string;
  theme: any;
  activeVideoRoom?: { id: string; name: string } | null;
  onJoinRoom?: (id: string, name: string) => void;
  onLeaveRoom?: () => void;
}

// Video Grid Component for displaying participant videos
function VideoGridWrapper({ participants, localUserId, screenShareActive, screenShareUserId }: { 
  participants: VideoParticipant[]; 
  localUserId: string;
  screenShareActive?: boolean;
  screenShareUserId?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 800, height: 500 });

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      setSize({ width, height });
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%' }}>
      <VideoGrid
        participants={participants}
        localUserId={localUserId}
        screenShareActive={screenShareActive}
        screenShareUserId={screenShareUserId}
        containerWidth={size.width}
        containerHeight={size.height}
        onParticipantClick={(participant) => {
          // Gelecekte participant detay modal'ı açılabilir
        }}
      />
    </div>
  );
}
// Media Controls Component
// Active Video Room Component
export function ActiveVideoRoom({ 
  roomId, 
  roomName, 
  userId, 
  username, 
  onLeave, 
  onMinimize 
}: {
  roomId: string;
  roomName: string;
  userId: string;
  username: string;
  onLeave: () => void;
  onMinimize?: () => void;
}) {
  const { t } = useTranslation();
  const [participants, setParticipants] = useState<VideoParticipant[]>([]);
  const [mediaState, setMediaState] = useState<MediaControlState>({
    isCameraOn: true,
    isMicOn: true,
    isScreenSharing: false,
    permissions: { camera: false, microphone: false, screen: false },
    availableDevices: [],
    selectedDevices: {}
  });
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<VideoConferenceError | null>(null);
  const [connectionQuality, setConnectionQuality] = useState<'excellent' | 'good' | 'fair' | 'poor'>('good');
  const [screenShareConflictUser, setScreenShareConflictUser] = useState<{ userId: string; username: string } | null>(null);
  const [showTranscriptionPanel, setShowTranscriptionPanel] = useState(false);
  
  const videoRoomService = useRef<VideoRoomService | null>(null);
  const transcriptionService = useRef<AITranscriptionService | null>(null);
  const localStream = useRef<MediaStream | null>(null);
  const timer = useRef<any>(null);
  const mounted = useRef(true);

  // Initialize services
  useEffect(() => {
    videoRoomService.current = new VideoRoomService();
    transcriptionService.current = new AITranscriptionService({
      enabled: false,
      language: 'tr',
      minConfidence: 0.7,
      realTimeDisplay: true
    });
    
    // Load available devices
    const loadDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        setMediaState(prev => ({
          ...prev,
          availableDevices: devices
        }));
      } catch (err) {
        console.error('Failed to enumerate devices:', err);
      }
    };
    
    loadDevices();
    
    // Listen for device changes
    navigator.mediaDevices.addEventListener('devicechange', loadDevices);
    
    return () => {
      videoRoomService.current?.cleanup();
      transcriptionService.current?.cleanup();
      navigator.mediaDevices.removeEventListener('devicechange', loadDevices);
    };
  }, [userId]);

  // Cleanup function
  const cleanup = useCallback(async () => {
    mounted.current = false;
    clearInterval(timer.current);
    
    // Stop local media streams
    localStream.current?.getTracks().forEach(track => track.stop());
    
    // Cleanup transcription service
    await transcriptionService.current?.cleanup();
    
    // Leave room in Firebase
    await videoRoomService.current?.leaveVideoRoom(roomId, userId);
  }, [roomId, userId]);

  // Join room and initialize media
  useEffect(() => {
    mounted.current = true;
    
    const joinRoom = async () => {
      try {
        // Request media permissions
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });
        
        if (!mounted.current) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }
        
        localStream.current = stream;
        
        // Update permissions state
        setMediaState(prev => ({
          ...prev,
          permissions: { camera: true, microphone: true, screen: false }
        }));

        // Join room via service
        await videoRoomService.current?.joinVideoRoom(roomId, userId, username);

        // Start timer and connection monitoring
        timer.current = setInterval(() => {
          setDuration(d => d + 1);
          
          // Update connection quality based on WebRTC stats
          if (videoRoomService.current) {
            const rtcManager = videoRoomService.current.getWebRTCManager();
            const connectedPeers = rtcManager.getConnectedPeers();
            if (connectedPeers.length > 0) {
              // Simple quality estimation based on peer count and connection state
              const avgQuality = connectedPeers.length > 5 ? 'fair' : 
                               connectedPeers.length > 2 ? 'good' : 'excellent';
              setConnectionQuality(avgQuality);
            }
          }
        }, 1000);

        // Listen for participant changes
        const participantsRef = ref(db, `video_rooms/${roomId}/participants`);
        onValue(participantsRef, (snapshot) => {
          if (!mounted.current) return;
          
          const data = snapshot.val();
          if (!data) {
            setParticipants([]);
            return;
          }
          // Firebase stores arrays as objects — normalize
          const participantList: VideoParticipant[] = (Array.isArray(data)
            ? data
            : Object.values(data)
          ).filter((p: any) => p && p.userId) as VideoParticipant[];
          
          // Add local stream to current user's participant
          const enrichedList = participantList.map(p => {
            if (p.userId === userId && localStream.current) {
              return { ...p, videoStream: localStream.current };
            }
            // Add remote streams from WebRTC manager
            const remoteStream = videoRoomService.current?.getWebRTCManager().getRemoteStream(p.userId);
            if (remoteStream) {
              return { ...p, videoStream: remoteStream };
            }
            return p;
          });
          
          setParticipants(enrichedList);
        });

        // Listen for remote streams from WebRTC
        const handleRemoteStream = ({ userId: remoteUserId, stream }: { userId: string; stream: MediaStream }) => {
          setParticipants(prev => prev.map(p => 
            p.userId === remoteUserId 
              ? { ...p, videoStream: stream, isCameraOn: stream.getVideoTracks().length > 0 && stream.getVideoTracks()[0].enabled }
              : p
          ));
        };
        
        const rtcManager = videoRoomService.current?.getWebRTCManager();
        rtcManager?.on('remoteStreamReceived', handleRemoteStream);

        return () => {
          rtcManager?.off('remoteStreamReceived', handleRemoteStream);
        };

      } catch (err: any) {
        console.error('Failed to join video room:', err);
        setError({
          type: 'permission-denied',
          message: 'Kamera ve mikrofon izni gerekli',
          details: err
        });
        onLeave();
      }
    };

    joinRoom();

    return () => {
      cleanup();
      off(ref(db, `video_rooms/${roomId}/participants`));
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, userId, username]);

  // Media control handlers
  const handleToggleCamera = useCallback(async () => {
    if (!localStream.current) return;
    
    const videoTrack = localStream.current.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !mediaState.isCameraOn;
      setMediaState(prev => ({ ...prev, isCameraOn: !prev.isCameraOn }));
      
      // Update in Firebase
      await update(ref(db, `video_rooms/${roomId}/participants/${userId}`), {
        isCameraOn: !mediaState.isCameraOn
      });
    }
  }, [mediaState.isCameraOn, roomId, userId]);

  const handleToggleMic = useCallback(async () => {
    if (!localStream.current) return;
    
    const audioTrack = localStream.current.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !mediaState.isMicOn;
      setMediaState(prev => ({ ...prev, isMicOn: !prev.isMicOn }));
      
      // Update in Firebase
      await update(ref(db, `video_rooms/${roomId}/participants/${userId}`), {
        isMicOn: !mediaState.isMicOn
      });
    }
  }, [mediaState.isMicOn, roomId, userId]);

  const handleToggleScreenShare = useCallback(async () => {
    try {
      if (!mediaState.isScreenSharing) {
        // Check if someone else is already sharing
        const currentSharer = participants.find(p => p.isScreenSharing && p.userId !== userId);
        if (currentSharer) {
          setScreenShareConflictUser({
            userId: currentSharer.userId,
            username: currentSharer.username
          });
          return;
        }

        // Start screen sharing
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false
        });

        const screenTrack = screenStream.getVideoTracks()[0];

        // Replace video track in WebRTC connections
        await videoRoomService.current?.getWebRTCManager().replaceVideoTrack(screenTrack);

        // Update local participant's videoStream so VideoGrid shows screen share
        setParticipants(prev => prev.map(p =>
          p.userId === userId ? { ...p, videoStream: screenStream, isScreenSharing: true } : p
        ));

        setMediaState(prev => ({ ...prev, isScreenSharing: true }));

        await update(ref(db, `video_rooms/${roomId}/participants/${userId}`), {
          isScreenSharing: true
        });

        // Handle screen share end (user clicks browser stop button)
        screenTrack.onended = async () => {
          // Restore camera track
          if (localStream.current) {
            const cameraTrack = localStream.current.getVideoTracks()[0];
            if (cameraTrack) {
              await videoRoomService.current?.getWebRTCManager().replaceVideoTrack(cameraTrack);
            }
          }
          setParticipants(prev => prev.map(p =>
            p.userId === userId
              ? { ...p, videoStream: localStream.current ?? undefined, isScreenSharing: false }
              : p
          ));
          setMediaState(prev => ({ ...prev, isScreenSharing: false }));
          await update(ref(db, `video_rooms/${roomId}/participants/${userId}`), {
            isScreenSharing: false
          });
        };

      } else {
        // Stop screen sharing — restore camera
        if (localStream.current) {
          const cameraTrack = localStream.current.getVideoTracks()[0];
          if (cameraTrack) {
            await videoRoomService.current?.getWebRTCManager().replaceVideoTrack(cameraTrack);
          }
        }
        setParticipants(prev => prev.map(p =>
          p.userId === userId
            ? { ...p, videoStream: localStream.current ?? undefined, isScreenSharing: false }
            : p
        ));
        setMediaState(prev => ({ ...prev, isScreenSharing: false }));
        await update(ref(db, `video_rooms/${roomId}/participants/${userId}`), {
          isScreenSharing: false
        });
      }
    } catch (err) {
      console.error('Screen share error:', err);
    }
  }, [mediaState.isScreenSharing, roomId, userId, participants]);

  const handleScreenShareConflictResolve = useCallback(async (action: 'takeover' | 'cancel') => {
    if (action === 'takeover' && screenShareConflictUser) {
      try {
        // Stop the other user's screen share
        await update(ref(db, `video_rooms/${roomId}/participants/${screenShareConflictUser.userId}`), {
          isScreenSharing: false
        });
        
        // Clear conflict state
        setScreenShareConflictUser(null);
        
        // Start our screen share after a brief delay
        setTimeout(() => {
          handleToggleScreenShare();
        }, 500);
        
      } catch (err) {
        console.error('Error resolving screen share conflict:', err);
      }
    } else {
      // Cancel - just clear the conflict state
      setScreenShareConflictUser(null);
    }
  }, [screenShareConflictUser, roomId, handleToggleScreenShare]);

  const handleLeaveRoom = useCallback(async () => {
    await cleanup();
    onLeave();
  }, [cleanup, onLeave]);

  const handleToggleTranscription = useCallback(() => {
    setShowTranscriptionPanel(prev => !prev);
  }, []);

  const handleDeviceChange = useCallback(async (deviceType: 'camera' | 'microphone' | 'speaker', deviceId: string) => {
    try {
      if (deviceType === 'camera') {
        await videoRoomService.current?.switchCamera(deviceId);
        setMediaState(prev => ({
          ...prev,
          selectedDevices: { ...prev.selectedDevices, camera: deviceId }
        }));
      } else if (deviceType === 'microphone') {
        await videoRoomService.current?.switchMicrophone(deviceId);
        setMediaState(prev => ({
          ...prev,
          selectedDevices: { ...prev.selectedDevices, microphone: deviceId }
        }));
      } else if (deviceType === 'speaker') {
        // Speaker switching - HTML5 Audio API
        const audioElements = document.querySelectorAll('audio, video');
        for (const element of audioElements) {
          if ('setSinkId' in element && typeof (element as any).setSinkId === 'function') {
            try {
              await (element as any).setSinkId(deviceId);
            } catch (err) {
              console.warn('Failed to set sink ID for element:', err);
            }
          }
        }
        setMediaState(prev => ({
          ...prev,
          selectedDevices: { ...prev.selectedDevices, speaker: deviceId }
        }));
      }
    } catch (err) {
      console.error('Device change error:', err);
      setError({
        type: 'permission-denied',
        message: `${deviceType} değiştirilemedi: ${err instanceof Error ? err.message : 'Bilinmeyen hata'}`
      });
    }
  }, []);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (error) {
    return (
      <div style={{
        minHeight: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0B0E11',
        color: '#fff',
        textAlign: 'center',
        padding: 24
      }}>
        <div>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
            {t('video.connectionError')}
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: 16 }}>
            {error.message}
          </p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onLeave}
            style={{
              padding: '12px 24px',
              background: '#10B981',
              color: '#000',
              border: 'none',
              borderRadius: 12,
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            {t('common.back')}
          </motion.button>
        </div>
      </div>
    );
  }
  return (
    <div style={{
      minHeight: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: '#0B0E11',
      backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(16, 185, 129, 0.15) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(139, 92, 246, 0.15) 0%, transparent 50%)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background gradient */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(16,185,129,0.07) 0%, transparent 70%)',
        pointerEvents: 'none'
      }} />

      {/* Header */}
      <div style={{
        padding: '20px 24px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        position: 'relative',
        zIndex: 1
      }}>
        <div style={{ flex: 1 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 2
          }}>
            <div style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#10B981',
              boxShadow: '0 0 8px #10B981'
            }} />
            <span style={{
              fontWeight: 900,
              textTransform: 'uppercase' as const,
              letterSpacing: '0.15em',
              color: '#fff',
              fontSize: 13
            }}>
              {roomName}
            </span>
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            fontSize: 11,
            color: 'rgba(255,255,255,0.3)'
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Video size={10} /> {participants.length}/{MAX_PARTICIPANTS} {t('voice.people')}
            </span>
            <span>·</span>
            <span style={{ fontWeight: 700 }}>
              {formatDuration(duration)}
            </span>
          </div>
        </div>

        {/* Header controls */}
        <div style={{ display: 'flex', gap: 8 }}>
          {onMinimize && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onMinimize}
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                border: 'none',
                cursor: 'pointer',
                background: 'rgba(255,255,255,0.05)',
                color: 'rgba(255,255,255,0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18
              }}
            >
              ⌄
            </motion.button>
          )}
        </div>
      </div>

      {/* Video Grid Area */}
      <div style={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        position: 'relative',
        zIndex: 1,
        overflow: 'hidden'
      }}>
        <div style={{ width: '100%', height: '100%' }}>
          <VideoGridWrapper 
            participants={participants} 
            localUserId={userId}
            screenShareActive={participants.some(p => p.isScreenSharing)}
            screenShareUserId={participants.find(p => p.isScreenSharing)?.userId}
          />
        </div>
      </div>

      {/* Media Controls */}
      <div style={{
        padding: '16px 24px 24px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 16,
        position: 'relative',
        zIndex: 1
      }}>
        <MediaControls
          mediaState={mediaState}
          onToggleCamera={handleToggleCamera}
          onToggleMic={handleToggleMic}
          onToggleScreenShare={handleToggleScreenShare}
          onToggleTranscription={handleToggleTranscription}
          onLeaveRoom={handleLeaveRoom}
          onDeviceChange={handleDeviceChange}
          connectionQuality={connectionQuality}
          isTranscriptionActive={transcriptionService.current?.isTranscriptionActive() || false}
          participantCount={participants.length}
          roomDuration={duration}
        />
        
        <ScreenShareControls
          isScreenSharing={mediaState.isScreenSharing}
          onStartScreenShare={handleToggleScreenShare}
          onStopScreenShare={handleToggleScreenShare}
          conflictUser={screenShareConflictUser}
          onResolveConflict={handleScreenShareConflictResolve}
          participantCount={participants.length}
          roomDuration={duration}
        />
      </div>

      {/* AI Transcription Panel */}
      {transcriptionService.current && (
        <TranscriptionPanel
          isVisible={showTranscriptionPanel}
          onToggle={handleToggleTranscription}
          transcriptionService={transcriptionService.current}
          roomId={roomId}
          userId={userId}
          username={username}
          participants={participants.map(p => ({
            userId: p.userId,
            username: p.username,
            isSpeaking: p.isSpeaking
          }))}
        />
      )}
    </div>
  );
}
// Main Video Conference Rooms Component
export function VideoConferenceRooms({ 
  userId, 
  username, 
  theme, 
  activeVideoRoom, 
  onJoinRoom, 
  onLeaveRoom 
}: VideoRoomProps) {
  const { t } = useTranslation();
  const [rooms, setRooms] = useState<VideoRoom[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [activeRoomName, setActiveRoomName] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomPrivate, setNewRoomPrivate] = useState(false);
  const [newRoomPassword, setNewRoomPassword] = useState('');
  const [joinPasswordRoomId, setJoinPasswordRoomId] = useState<string | null>(null);
  const [joinPasswordInput, setJoinPasswordInput] = useState('');
  const [joinPasswordError, setJoinPasswordError] = useState('');

  // Load rooms from Firebase
  useEffect(() => {
    const roomsRef = ref(db, 'video_rooms');
    onValue(roomsRef, (snapshot) => {
      const data = snapshot.val() || {};
      const roomList: VideoRoom[] = [];
      
      Object.entries(data).forEach(([id, roomData]: any) => {
        if (!roomData.name) return;
        
        const participants = Object.values(roomData.participants || {}).filter((p: any) => p && p.userId) as VideoParticipant[];
        
        roomList.push({
          id,
          name: roomData.name,
          hostId: roomData.hostId,
          hostName: roomData.hostName,
          maxParticipants: roomData.maxParticipants || MAX_PARTICIPANTS,
          isPrivate: roomData.isPrivate || false,
          password: roomData.password,
          videoEnabled: roomData.videoEnabled !== false,
          screenShareEnabled: roomData.screenShareEnabled !== false,
          recordingEnabled: roomData.recordingEnabled || false,
          aiModerationEnabled: roomData.aiModerationEnabled || false,
          transcriptionEnabled: roomData.transcriptionEnabled || false,
          participants,
          activeScreenShare: roomData.activeScreenShare,
          isRecording: roomData.isRecording || false,
          recordingUrl: roomData.recordingUrl,
          createdAt: roomData.createdAt,
          lastActivity: roomData.lastActivity || Date.now()
        });
      });
      
      roomList.sort((a, b) => b.createdAt - a.createdAt);
      setRooms(roomList);
    });

    return () => off(roomsRef);
  }, []);

  // Create new room
  const createRoom = async () => {
    if (!newRoomName.trim()) return;
    
    const newRoomRef = push(ref(db, 'video_rooms'));
    const roomData = {
      name: newRoomName.trim(),
      hostId: userId,
      hostName: username,
      maxParticipants: MAX_PARTICIPANTS,
      isPrivate: newRoomPrivate,
      password: newRoomPrivate ? newRoomPassword : null,
      videoEnabled: true,
      screenShareEnabled: true,
      recordingEnabled: false,
      aiModerationEnabled: false,
      transcriptionEnabled: false,
      participants: {},
      isRecording: false,
      createdAt: Date.now(),
      lastActivity: Date.now()
    };
    
    await set(newRoomRef, roomData);
    
    // Reset form
    setNewRoomName('');
    setNewRoomPassword('');
    setNewRoomPrivate(false);
    setShowCreate(false);
    
    // Join the created room
    setActiveRoomId(newRoomRef.key!);
    setActiveRoomName(newRoomName.trim());
    onJoinRoom?.(newRoomRef.key!, newRoomName.trim());
  };

  // Join existing room
  const joinRoom = (room: VideoRoom) => {
    if (room.participants.length >= room.maxParticipants) return;
    
    if (room.isPrivate) {
      setJoinPasswordRoomId(room.id);
      setJoinPasswordInput('');
      setJoinPasswordError('');
      return;
    }
    
    setActiveRoomId(room.id);
    setActiveRoomName(room.name);
    onJoinRoom?.(room.id, room.name);
  };

  // Join with password
  const joinWithPassword = () => {
    const room = rooms.find(r => r.id === joinPasswordRoomId);
    if (!room || joinPasswordInput !== room.password) {
      setJoinPasswordError(t('voice.wrongPassword'));
      return;
    }
    
    if (room.participants.length >= room.maxParticipants) return;
    
    setActiveRoomId(room.id);
    setActiveRoomName(room.name);
    setJoinPasswordRoomId(null);
    onJoinRoom?.(room.id, room.name);
  };

  // If in active room, show the room interface
  if (activeRoomId && onJoinRoom) return null; // Global panel handles this
  if (activeRoomId) {
    return (
      <ActiveVideoRoom
        roomId={activeRoomId}
        roomName={activeRoomName}
        userId={userId}
        username={username}
        onLeave={() => {
          setActiveRoomId(null);
          onLeaveRoom?.();
        }}
      />
    );
  }
  // Show rooms list
  return (
    <div style={{
      minHeight: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: '#0B0E11',
      backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(16, 185, 129, 0.15) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(139, 92, 246, 0.15) 0%, transparent 50%)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background gradient */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '50vh',
        background: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(16,185,129,0.07) 0%, transparent 70%)',
        pointerEvents: 'none',
        zIndex: 0
      }} />

      {/* Header */}
      <div style={{
        padding: '28px 28px 20px',
        position: 'relative',
        zIndex: 1
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 12px',
              background: 'rgba(16,185,129,0.08)',
              border: '1px solid rgba(16,185,129,0.15)',
              borderRadius: 20,
              marginBottom: 12
            }}>
              <div style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: '#10B981',
                boxShadow: '0 0 6px #10B981'
              }} />
              <span style={{
                fontSize: 10,
                fontWeight: 800,
                color: '#10B981',
                textTransform: 'uppercase' as const,
                letterSpacing: '0.15em'
              }}>
                {rooms.length} {t('voice.roomsActive')}
              </span>
            </div>
            <h1 style={{
              fontWeight: 900,
              color: '#fff',
              fontSize: 32,
              lineHeight: 1,
              margin: 0,
              letterSpacing: '-0.03em'
            }}>
              {t('video.title')}<br />
              <span style={{ color: '#10B981' }}>{t('video.titleAccent')}</span>
            </h1>
            <p style={{
              fontSize: 12,
              color: 'rgba(255,255,255,0.3)',
              marginTop: 8,
              fontWeight: 500
            }}>
              {t('voice.subtitle', { max: MAX_PARTICIPANTS })}
            </p>
          </div>
          <motion.div
            animate={{ scale: [1, 1.04, 1] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              width: 72,
              height: 72,
              borderRadius: 24,
              background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(5,150,105,0.08))',
              border: '1px solid rgba(16,185,129,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 30px rgba(16,185,129,0.1)',
              flexShrink: 0
            }}
          >
            <Video size={32} color="#10B981" strokeWidth={1.5} />
          </motion.div>
        </div>

        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowCreate(true)}
          style={{
            marginTop: 20,
            width: '100%',
            padding: '14px 0',
            background: '#10B981',
            border: 'none',
            borderRadius: 16,
            color: '#000',
            fontSize: 13,
            fontWeight: 900,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            boxShadow: '0 4px 20px rgba(16,185,129,0.25)',
            letterSpacing: '0.1em',
            textTransform: 'uppercase' as const
          }}
        >
          <Plus size={16} strokeWidth={3} /> {t('voice.createRoom')}
        </motion.button>
      </div>

      {/* Rooms List */}
      <div style={{
        flex: 1,
        padding: '4px 28px 28px',
        position: 'relative',
        zIndex: 1,
        overflowY: 'auto'
      }}>
        {rooms.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            style={{ textAlign: 'center', paddingTop: 48 }}
          >
            <motion.div
              animate={{ scale: [1, 1.05, 1], rotate: [0, 2, -2, 0] }}
              transition={{ duration: 4, repeat: Infinity }}
              style={{ fontSize: 52, marginBottom: 16 }}
            >
              📹
            </motion.div>
            <div style={{
              fontSize: 20,
              fontWeight: 900,
              color: '#fff',
              letterSpacing: '-0.02em',
              marginBottom: 6
            }}>
              {t('voice.noRooms')}
            </div>
            <div style={{
              fontSize: 13,
              color: 'rgba(255,255,255,0.25)'
            }}>
              {t('video.noRoomsDesc')}
            </div>
          </motion.div>
        ) : (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 10
          }}>
            {rooms.map((room, i) => {
              const participantCount = room.participants.length;
              const isFull = participantCount >= room.maxParticipants;
              const fillPercentage = (participantCount / room.maxParticipants) * 100;
              const fillColor = fillPercentage >= 90 ? '#EF4444' : 
                              fillPercentage >= 60 ? '#F59E0B' : '#10B981';
              const isHost = room.hostId === userId;

              return (
                <motion.div
                  key={room.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  whileHover={isFull ? {} : { y: -2 }}
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: 20,
                    padding: 20,
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                >
                  {/* Fill indicator */}
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 2,
                    background: 'rgba(255,255,255,0.04)'
                  }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${fillPercentage}%` }}
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                      style={{
                        height: '100%',
                        background: fillColor,
                        boxShadow: `0 0 8px ${fillColor}80`
                      }}
                    />
                  </div>

                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    marginBottom: 14
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 40,
                        height: 40,
                        borderRadius: 12,
                        background: room.isPrivate ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)',
                        border: `1px solid ${room.isPrivate ? 'rgba(245,158,11,0.2)' : 'rgba(16,185,129,0.2)'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        {room.isPrivate ? 
                          <Lock size={16} color="#F59E0B" /> : 
                          <Video size={16} color="#10B981" />
                        }
                      </div>
                      <div>
                        <div style={{
                          fontSize: 15,
                          fontWeight: 800,
                          color: '#fff',
                          letterSpacing: '-0.02em',
                          marginBottom: 2
                        }}>
                          {room.name}
                        </div>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 5,
                          fontSize: 11,
                          color: 'rgba(255,255,255,0.3)'
                        }}>
                          <Crown size={9} color="#F59E0B" />
                          <span>{room.hostName}</span>
                        </div>
                      </div>
                    </div>
                    {isHost && (
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => remove(ref(db, `video_rooms/${room.id}`))}
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 8,
                          background: 'rgba(239,68,68,0.08)',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'rgba(239,68,68,0.6)',
                          flexShrink: 0
                        }}
                      >
                        <X size={12} />
                      </motion.button>
                    )}
                  </div>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 14
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '4px 10px',
                        background: participantCount > 0 ? `${fillColor}18` : 'rgba(255,255,255,0.04)',
                        borderRadius: 20,
                        border: `1px solid ${participantCount > 0 ? fillColor + '30' : 'rgba(255,255,255,0.06)'}`
                      }}>
                        <div style={{
                          width: 5,
                          height: 5,
                          borderRadius: '50%',
                          background: participantCount > 0 ? fillColor : 'rgba(255,255,255,0.2)',
                          boxShadow: participantCount > 0 ? `0 0 5px ${fillColor}` : 'none'
                        }} />
                        <span style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: participantCount > 0 ? fillColor : 'rgba(255,255,255,0.3)'
                        }}>
                          {participantCount}/{room.maxParticipants}
                        </span>
                      </div>
                      {isFull && (
                        <span style={{
                          fontSize: 10,
                          fontWeight: 800,
                          color: '#EF4444',
                          textTransform: 'uppercase' as const,
                          letterSpacing: '0.08em'
                        }}>
                          DOLU
                        </span>
                      )}
                    </div>
                  </div>

                  <motion.button
                    whileHover={isFull ? {} : { scale: 1.01 }}
                    whileTap={isFull ? {} : { scale: 0.98 }}
                    onClick={() => joinRoom(room)}
                    disabled={isFull}
                    style={{
                      width: '100%',
                      padding: '11px 0',
                      background: isFull ? 'rgba(255,255,255,0.03)' : 
                                 room.isPrivate ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)',
                      border: `1px solid ${isFull ? 'rgba(255,255,255,0.05)' : 
                                          room.isPrivate ? 'rgba(245,158,11,0.25)' : 'rgba(16,185,129,0.25)'}`,
                      borderRadius: 12,
                      color: isFull ? 'rgba(255,255,255,0.2)' : 
                             room.isPrivate ? '#F59E0B' : '#10B981',
                      fontWeight: 800,
                      fontSize: 13,
                      cursor: isFull ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 7,
                      letterSpacing: '0.05em',
                      textTransform: 'uppercase' as const,
                      boxShadow: isFull ? 'none' : 
                                `0 0 16px ${room.isPrivate ? 'rgba(245,158,11,0.08)' : 'rgba(16,185,129,0.08)'}`
                    }}
                  >
                    {room.isPrivate ? <Lock size={13} /> : <Video size={13} />}
                    {isFull ? t('voice.roomFull') : room.isPrivate ? t('voice.joinWithPassword') : t('voice.joinRoom')}
                  </motion.button>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
      {/* Create Room Modal */}
      <AnimatePresence>
        {showCreate && (
          <div 
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.8)',
              backdropFilter: 'blur(8px)',
              zIndex: 50,
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'center'
            }}
            onClick={() => setShowCreate(false)}
          >
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              onClick={e => e.stopPropagation()}
              style={{
                width: '100%',
                maxWidth: 500,
                background: '#111418',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '24px 24px 0 0',
                padding: 28
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 24
              }}>
                <div>
                  <div style={{
                    fontWeight: 900,
                    color: '#fff',
                    fontSize: 20,
                    letterSpacing: '-0.02em'
                  }}>
                    Yeni Video Konferans
                  </div>
                  <div style={{
                    fontSize: 12,
                    color: 'rgba(255,255,255,0.3)',
                    marginTop: 2
                  }}>
                    {t('voice.maxPeople', { max: MAX_PARTICIPANTS })}
                  </div>
                </div>
                <button
                  onClick={() => setShowCreate(false)}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 10,
                    background: 'rgba(255,255,255,0.05)',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'rgba(255,255,255,0.4)'
                  }}
                >
                  <X size={16} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <input
                  value={newRoomName}
                  onChange={e => setNewRoomName(e.target.value)}
                  placeholder={t('voice.roomNamePlaceholder')}
                  maxLength={40}
                  onKeyDown={e => e.key === 'Enter' && createRoom()}
                  autoFocus
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 12,
                    padding: '13px 16px',
                    color: '#fff',
                    fontSize: 14,
                    outline: 'none'
                  }}
                />

                <motion.div
                  whileTap={{ scale: 0.99 }}
                  onClick={() => setNewRoomPrivate(v => !v)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '13px 16px',
                    background: 'rgba(255,255,255,0.02)',
                    borderRadius: 12,
                    border: `1px solid ${newRoomPrivate ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.06)'}`,
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 32,
                      height: 32,
                      borderRadius: 9,
                      background: newRoomPrivate ? 'rgba(245,158,11,0.12)' : 'rgba(255,255,255,0.04)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {newRoomPrivate ? 
                        <Lock size={14} color="#F59E0B" /> : 
                        <Unlock size={14} color="rgba(255,255,255,0.3)" />
                      }
                    </div>
                    <div>
                      <div style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: newRoomPrivate ? '#F59E0B' : 'rgba(255,255,255,0.6)'
                      }}>
                        {newRoomPrivate ? t('voice.privateRoom') : t('voice.publicRoom')}
                      </div>
                      <div style={{
                        fontSize: 10,
                        color: 'rgba(255,255,255,0.25)'
                      }}>
                        {newRoomPrivate ? t('voice.privateRoomDesc') : t('voice.publicRoomDesc')}
                      </div>
                    </div>
                  </div>
                  <div style={{
                    width: 44,
                    height: 24,
                    borderRadius: 12,
                    background: newRoomPrivate ? '#F59E0B' : 'rgba(255,255,255,0.08)',
                    position: 'relative',
                    flexShrink: 0
                  }}>
                    <motion.div
                      animate={{ left: newRoomPrivate ? 22 : 4 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                      style={{
                        position: 'absolute',
                        top: 4,
                        width: 16,
                        height: 16,
                        borderRadius: '50%',
                        background: '#fff',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.3)'
                      }}
                    />
                  </div>
                </motion.div>

                <AnimatePresence>
                  {newRoomPrivate && (
                    <motion.input
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      value={newRoomPassword}
                      onChange={e => setNewRoomPassword(e.target.value)}
                      placeholder={t('voice.roomPasswordPlaceholder')}
                      type="password"
                      style={{
                        background: 'rgba(245,158,11,0.05)',
                        border: '1px solid rgba(245,158,11,0.2)',
                        borderRadius: 12,
                        padding: '13px 16px',
                        color: '#fff',
                        fontSize: 14,
                        outline: 'none'
                      }}
                    />
                  )}
                </AnimatePresence>

                <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
                  <button
                    onClick={() => setShowCreate(false)}
                    style={{
                      flex: 1,
                      padding: '13px 0',
                      background: 'rgba(255,255,255,0.04)',
                      color: 'rgba(255,255,255,0.4)',
                      border: 'none',
                      borderRadius: 12,
                      fontSize: 12,
                      fontWeight: 800,
                      cursor: 'pointer',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase' as const
                    }}
                  >
                    {t('common.cancel')}
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={createRoom}
                    disabled={!newRoomName.trim() || (newRoomPrivate && !newRoomPassword.trim())}
                    style={{
                      flex: 2,
                      padding: '13px 0',
                      background: newRoomName.trim() ? '#10B981' : 'rgba(16,185,129,0.2)',
                      color: newRoomName.trim() ? '#000' : 'rgba(255,255,255,0.2)',
                      border: 'none',
                      borderRadius: 12,
                      fontSize: 12,
                      fontWeight: 900,
                      cursor: 'pointer',
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase' as const,
                      boxShadow: newRoomName.trim() ? '0 4px 16px rgba(16,185,129,0.3)' : 'none'
                    }}
                  >
                    {t('voice.createButton')}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Password Modal */}
      <AnimatePresence>
        {joinPasswordRoomId && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.8)',
            backdropFilter: 'blur(8px)',
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24
          }}>
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0 }}
              style={{
                width: '100%',
                maxWidth: 360,
                background: '#111418',
                border: '1px solid rgba(245,158,11,0.15)',
                borderRadius: 24,
                padding: 28
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                marginBottom: 20
              }}>
                <div style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  background: 'rgba(245,158,11,0.1)',
                  border: '1px solid rgba(245,158,11,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Lock size={18} color="#F59E0B" />
                </div>
                <div>
                  <div style={{
                    fontWeight: 900,
                    color: '#fff',
                    fontSize: 16,
                    letterSpacing: '-0.01em'
                  }}>
                    {t('voice.privateRoomTitle')}
                  </div>
                </div>
              </div>

              <input
                value={joinPasswordInput}
                onChange={e => setJoinPasswordInput(e.target.value)}
                type="password"
                placeholder={t('voice.enterPassword')}
                autoFocus
                onKeyDown={e => e.key === 'Enter' && joinWithPassword()}
                style={{
                  width: '100%',
                  background: 'rgba(255,255,255,0.04)',
                  border: `1px solid ${joinPasswordError ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.08)'}`,
                  borderRadius: 12,
                  padding: '12px 14px',
                  color: '#fff',
                  fontSize: 14,
                  outline: 'none',
                  marginBottom: 8,
                  boxSizing: 'border-box' as const
                }}
              />

              <AnimatePresence>
                {joinPasswordError && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    style={{
                      fontSize: 12,
                      color: '#EF4444',
                      marginBottom: 10,
                      fontWeight: 600
                    }}
                  >
                    {joinPasswordError}
                  </motion.p>
                )}
              </AnimatePresence>

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => setJoinPasswordRoomId(null)}
                  style={{
                    flex: 1,
                    padding: '11px 0',
                    background: 'rgba(255,255,255,0.04)',
                    color: 'rgba(255,255,255,0.4)',
                    border: 'none',
                    borderRadius: 10,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    textTransform: 'uppercase' as const,
                    letterSpacing: '0.05em'
                  }}
                >
                  {t('common.cancel')}
                </button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={joinWithPassword}
                  style={{
                    flex: 2,
                    padding: '11px 0',
                    background: '#F59E0B',
                    color: '#000',
                    border: 'none',
                    borderRadius: 10,
                    fontSize: 12,
                    fontWeight: 900,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    textTransform: 'uppercase' as const,
                    letterSpacing: '0.08em',
                    boxShadow: '0 4px 16px rgba(245,158,11,0.25)'
                  }}
                >
                  <Check size={13} strokeWidth={3} /> {t('guild.join')}
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default VideoConferenceRooms;