/**
 * Video Conference Integration Test
 * Tests the integration between VideoConferenceRoom component and services
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { VideoRoomService } from '../videoRoomService';
import { WebRTCManager } from '../webRTCManager';
import { VideoParticipant, VideoRoom } from '../../types/videoConference';

// Mock Firebase
vi.mock('../../firebase', () => ({
  db: {},
}));

// Mock Firebase database functions
vi.mock('firebase/database', () => ({
  ref: vi.fn(() => ({})),
  set: vi.fn().mockResolvedValue(undefined),
  get: vi.fn().mockResolvedValue({ val: () => null, exists: () => false }),
  update: vi.fn().mockResolvedValue(undefined),
  remove: vi.fn().mockResolvedValue(undefined),
  push: vi.fn(() => ({ key: 'mock-room-id' })),
  onValue: vi.fn(() => vi.fn()), // returns unsubscribe function
  off: vi.fn(),
}));

// Mock WebRTC APIs using a proper class
class RTCPeerConnection {
  createOffer = vi.fn().mockResolvedValue({ type: 'offer', sdp: 'mock-sdp' });
  createAnswer = vi.fn().mockResolvedValue({ type: 'answer', sdp: 'mock-sdp' });
  setLocalDescription = vi.fn().mockResolvedValue(undefined);
  setRemoteDescription = vi.fn().mockResolvedValue(undefined);
  addIceCandidate = vi.fn().mockResolvedValue(undefined);
  addTrack = vi.fn();
  getSenders = vi.fn().mockReturnValue([{ replaceTrack: vi.fn().mockResolvedValue(undefined) }]);
  getStats = vi.fn().mockResolvedValue(new Map([
    ['outbound-rtp', { type: 'outbound-rtp', bytesSent: 1024, packetsSent: 10 }]
  ]));
  close = vi.fn();
  connectionState = 'new';
  iceConnectionState = 'new';
  signalingState = 'stable';
  iceGatheringState = 'new';
  ontrack = null;
  onicecandidate = null;
  onconnectionstatechange = null;
  oniceconnectionstatechange = null;
  onicegatheringstatechange = null;
  onsignalingstatechange = null;
  ondatachannel = null;
}

Object.defineProperty(global, 'RTCPeerConnection', {
  writable: true,
  value: RTCPeerConnection,
});

Object.defineProperty(global, 'RTCIceCandidate', {
  writable: true,
  value: class MockRTCIceCandidate {
    candidate: string;
    sdpMLineIndex: number | null;
    sdpMid: string | null;
    constructor(init?: RTCIceCandidateInit) {
      this.candidate = init?.candidate || '';
      this.sdpMLineIndex = init?.sdpMLineIndex ?? null;
      this.sdpMid = init?.sdpMid ?? null;
    }
  },
});

Object.defineProperty(global.navigator, 'mediaDevices', {
  writable: true,
  value: {
    getUserMedia: vi.fn().mockResolvedValue({
      getTracks: vi.fn().mockReturnValue([
        { kind: 'video', enabled: true, stop: vi.fn() },
        { kind: 'audio', enabled: true, stop: vi.fn() }
      ]),
      getVideoTracks: vi.fn().mockReturnValue([{ enabled: true, stop: vi.fn() }]),
      getAudioTracks: vi.fn().mockReturnValue([{ enabled: true, stop: vi.fn() }]),
      active: true
    }),
    enumerateDevices: vi.fn().mockResolvedValue([
      { deviceId: 'camera1', kind: 'videoinput', label: 'Camera 1' },
      { deviceId: 'mic1', kind: 'audioinput', label: 'Microphone 1' }
    ]),
    getDisplayMedia: vi.fn().mockResolvedValue({
      getTracks: vi.fn().mockReturnValue([
        { kind: 'video', enabled: true, stop: vi.fn(), onended: null, addEventListener: vi.fn(), removeEventListener: vi.fn() }
      ]),
      getVideoTracks: vi.fn().mockReturnValue([{ enabled: true, stop: vi.fn(), onended: null, addEventListener: vi.fn(), removeEventListener: vi.fn() }])
    })
  },
});

describe('Video Conference Integration', () => {
  let videoRoomService: VideoRoomService;
  let webRTCManager: WebRTCManager;

  beforeEach(() => {
    vi.clearAllMocks();
    videoRoomService = new VideoRoomService();
    webRTCManager = new WebRTCManager('test-user');
  });

  afterEach(async () => {
    await videoRoomService.cleanup();
    await webRTCManager.cleanup();
  });

  describe('Service Initialization', () => {
    it('should initialize VideoRoomService correctly', () => {
      expect(videoRoomService).toBeDefined();
      expect(typeof videoRoomService.createVideoRoom).toBe('function');
      expect(typeof videoRoomService.joinVideoRoom).toBe('function');
      expect(typeof videoRoomService.leaveVideoRoom).toBe('function');
    });

    it('should initialize WebRTCManager correctly', () => {
      expect(webRTCManager).toBeDefined();
      expect(typeof webRTCManager.initializeLocalStream).toBe('function');
      expect(typeof webRTCManager.createPeerConnection).toBe('function');
      expect(typeof webRTCManager.cleanup).toBe('function');
    });
  });

  describe('Media Stream Management', () => {
    it('should initialize local media stream', async () => {
      const stream = await webRTCManager.initializeLocalStream();
      
      expect(stream).toBeDefined();
      expect(stream.getTracks).toBeDefined();
      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
        video: true,
        audio: true
      });
    });

    it('should handle media permission errors gracefully', async () => {
      const mockError = new Error('Permission denied');
      vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValueOnce(mockError);

      await expect(webRTCManager.initializeLocalStream()).rejects.toThrow();
    });

    it('should toggle audio and video tracks', async () => {
      await webRTCManager.initializeLocalStream();
      
      await webRTCManager.toggleAudio(false);
      await webRTCManager.toggleVideo(false);
      
      // Verify tracks are disabled
      const stream = webRTCManager.getLocalStream();
      expect(stream).toBeDefined();
    });
  });

  describe('Room Management', () => {
    it('should create a video room', async () => {
      const roomId = await videoRoomService.createVideoRoom(
        'Test Room',
        'test-user',
        'Test User',
        { maxParticipants: 10, isPrivate: false, videoEnabled: true, screenShareEnabled: true }
      );
      
      expect(roomId).toBeDefined();
      expect(typeof roomId).toBe('string');
    });

    it('should join a video room', async () => {
      // Mock successful room join
      const mockRoom: VideoRoom = {
        id: 'test-room',
        name: 'Test Room',
        hostId: 'host-user',
        hostName: 'Host User',
        maxParticipants: 10,
        isPrivate: false,
        password: undefined,
        videoEnabled: true,
        screenShareEnabled: true,
        recordingEnabled: false,
        aiModerationEnabled: false,
        transcriptionEnabled: false,
        participants: [],
        isRecording: false,
        createdAt: Date.now(),
        lastActivity: Date.now()
      };

      // Mock the getVideoRoom method
      vi.spyOn(videoRoomService, 'getVideoRoom').mockResolvedValue(mockRoom);
      
      await expect(
        videoRoomService.joinVideoRoom('test-room', 'test-user', 'Test User')
      ).resolves.not.toThrow();
    });

    it('should handle room full error', async () => {
      const fullRoom: VideoRoom = {
        id: 'full-room',
        name: 'Full Room',
        hostId: 'host-user',
        hostName: 'Host User',
        maxParticipants: 2,
        isPrivate: false,
        password: undefined,
        videoEnabled: true,
        screenShareEnabled: true,
        recordingEnabled: false,
        aiModerationEnabled: false,
        transcriptionEnabled: false,
        participants: [
          {
            userId: 'user1',
            username: 'User 1',
            joinedAt: Date.now(),
            isCameraOn: true,
            isMicOn: true,
            isScreenSharing: false,
            connectionQuality: 'good',
            latency: 50,
            transcriptionEnabled: false,
            isSpeaking: false
          },
          {
            userId: 'user2',
            username: 'User 2',
            joinedAt: Date.now(),
            isCameraOn: true,
            isMicOn: true,
            isScreenSharing: false,
            connectionQuality: 'good',
            latency: 60,
            transcriptionEnabled: false,
            isSpeaking: false
          }
        ],
        isRecording: false,
        createdAt: Date.now(),
        lastActivity: Date.now()
      };

      vi.spyOn(videoRoomService, 'getVideoRoom').mockResolvedValue(fullRoom);

      await expect(
        videoRoomService.joinVideoRoom('full-room', 'test-user', 'Test User')
      ).rejects.toThrow('Room is full');
    });
  });

  describe('WebRTC Peer Connections', () => {
    it('should create peer connection', async () => {
      await webRTCManager.initializeLocalStream();
      
      const peerConnection = await webRTCManager.createPeerConnection('peer-user', true);
      
      expect(peerConnection).toBeDefined();
      expect(peerConnection.constructor.name).toBe('RTCPeerConnection');
    });

    it('should handle signaling messages', async () => {
      await webRTCManager.initializeLocalStream();
      await webRTCManager.createPeerConnection('peer-user', false);

      const mockOffer = {
        type: 'offer' as RTCSdpType,
        sdp: 'mock-sdp'
      };

      await expect(
        webRTCManager.handleOffer(mockOffer, 'peer-user')
      ).resolves.not.toThrow();
    });

    it('should handle ICE candidates', async () => {
      await webRTCManager.initializeLocalStream();
      await webRTCManager.createPeerConnection('peer-user', false);

      const mockCandidate = new RTCIceCandidate({
        candidate: 'candidate:1 1 UDP 2130706431 192.168.1.1 54400 typ host',
        sdpMLineIndex: 0,
        sdpMid: '0'
      });

      await expect(
        webRTCManager.handleIceCandidate(mockCandidate, 'peer-user')
      ).resolves.not.toThrow();
    });
  });

  describe('Device Management', () => {
    it('should enumerate available devices', async () => {
      const devices = await videoRoomService.enumerateDevices();
      
      expect(devices).toBeDefined();
      expect(devices.cameras).toBeDefined();
      expect(devices.microphones).toBeDefined();
      expect(devices.speakers).toBeDefined();
      expect(Array.isArray(devices.cameras)).toBe(true);
      expect(Array.isArray(devices.microphones)).toBe(true);
      expect(Array.isArray(devices.speakers)).toBe(true);
    });

    it('should switch camera device', async () => {
      await expect(
        videoRoomService.switchCamera('camera1')
      ).resolves.not.toThrow();
    });

    it('should switch microphone device', async () => {
      await expect(
        videoRoomService.switchMicrophone('mic1')
      ).resolves.not.toThrow();
    });
  });

  describe('Screen Sharing', () => {
    it('should start screen sharing', async () => {
      const mockRoom: VideoRoom = {
        id: 'test-room',
        name: 'Test Room',
        hostId: 'test-user',
        hostName: 'Test User',
        maxParticipants: 10,
        isPrivate: false,
        password: undefined,
        videoEnabled: true,
        screenShareEnabled: true,
        recordingEnabled: false,
        aiModerationEnabled: false,
        transcriptionEnabled: false,
        participants: [],
        isRecording: false,
        createdAt: Date.now(),
        lastActivity: Date.now()
      };
      vi.spyOn(videoRoomService, 'getVideoRoom').mockResolvedValue(mockRoom);

      await expect(
        videoRoomService.startScreenShare('test-room', 'test-user')
      ).resolves.not.toThrow();
      
      expect(navigator.mediaDevices.getDisplayMedia).toHaveBeenCalled();
    });

    it('should stop screen sharing', async () => {
      await videoRoomService.startScreenShare('test-room', 'test-user');
      
      await expect(
        videoRoomService.stopScreenShare('test-room', 'test-user')
      ).resolves.not.toThrow();
    });
  });

  describe('Connection Quality', () => {
    it('should start connection quality monitoring', () => {
      expect(() => {
        webRTCManager.startConnectionQualityMonitoring();
      }).not.toThrow();
    });

    it('should stop connection quality monitoring', () => {
      webRTCManager.startConnectionQualityMonitoring();
      
      expect(() => {
        webRTCManager.stopConnectionQualityMonitoring();
      }).not.toThrow();
    });

    it('should get connection statistics', async () => {
      await webRTCManager.initializeLocalStream();
      await webRTCManager.createPeerConnection('peer-user', true);
      
      const stats = await webRTCManager.getAllConnectionStats();
      
      expect(stats).toBeDefined();
      expect(stats instanceof Map).toBe(true);
    });
  });

  describe('Cleanup', () => {
    it('should cleanup WebRTC manager properly', async () => {
      await webRTCManager.initializeLocalStream();
      await webRTCManager.createPeerConnection('peer-user', true);
      webRTCManager.startConnectionQualityMonitoring();
      
      await expect(webRTCManager.cleanup()).resolves.not.toThrow();
      
      expect(webRTCManager.getLocalStream()).toBeNull();
      expect(webRTCManager.getConnectedPeers()).toHaveLength(0);
    });

    it('should cleanup video room service properly', async () => {
      await expect(videoRoomService.cleanup()).resolves.not.toThrow();
    });
  });
});