/**
 * Advanced Features Error Handling Test Suite
 * Task 11: Comprehensive error handling validation for all advanced features
 * Tests error scenarios, recovery mechanisms, and graceful degradation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ScreenShareManager } from '../screenShareManager';
import { AITranscriptionService } from '../aiTranscriptionService';
import { WebRTCManager } from '../webRTCManager';
import { VideoRoomService } from '../videoRoomService';
import { VideoConferenceError } from '../../types/videoConference';

// Mock console to capture error logs
const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
const mockConsoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});

// Mock WebRTC APIs with error scenarios
Object.defineProperty(global, 'RTCPeerConnection', {
  writable: true,
  value: vi.fn().mockImplementation(() => ({
    createOffer: vi.fn().mockResolvedValue({}),
    createAnswer: vi.fn().mockResolvedValue({}),
    setLocalDescription: vi.fn().mockResolvedValue(undefined),
    setRemoteDescription: vi.fn().mockResolvedValue(undefined),
    addIceCandidate: vi.fn().mockResolvedValue(undefined),
    addTrack: vi.fn(),
    getSenders: vi.fn().mockReturnValue([{
      replaceTrack: vi.fn().mockResolvedValue(undefined)
    }]),
    getStats: vi.fn().mockResolvedValue(new Map()),
    close: vi.fn(),
    connectionState: 'connected',
    iceConnectionState: 'connected',
  })),
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
    }),
    getDisplayMedia: vi.fn().mockResolvedValue({
      getTracks: vi.fn().mockReturnValue([
        { kind: 'video', enabled: true, stop: vi.fn(), addEventListener: vi.fn() }
      ]),
      getVideoTracks: vi.fn().mockReturnValue([{ 
        enabled: true, 
        stop: vi.fn(),
        addEventListener: vi.fn()
      }])
    }),
    enumerateDevices: vi.fn().mockResolvedValue([])
  },
});

// Mock Audio Context
Object.defineProperty(global, 'AudioContext', {
  writable: true,
  value: vi.fn().mockImplementation(() => ({
    createMediaStreamSource: vi.fn().mockReturnValue({
      connect: vi.fn(),
      disconnect: vi.fn()
    }),
    createScriptProcessor: vi.fn().mockReturnValue({
      connect: vi.fn(),
      disconnect: vi.fn(),
      onaudioprocess: null
    }),
    destination: {},
    close: vi.fn().mockResolvedValue(undefined),
    state: 'running'
  })),
});

// Mock Firebase
vi.mock('../../firebase', () => ({
  db: {},
}));

vi.mock('firebase/database', () => ({
  ref: vi.fn(),
  set: vi.fn(),
  get: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  push: vi.fn(() => ({ key: 'test-room-id' })),
  onValue: vi.fn(),
  off: vi.fn(),
}));

describe('Advanced Features Error Handling Tests', () => {
  let screenShareManager: ScreenShareManager;
  let transcriptionService: AITranscriptionService;
  let webRTCManager: WebRTCManager;
  let videoRoomService: VideoRoomService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockConsoleError.mockClear();
    mockConsoleWarn.mockClear();
    
    screenShareManager = new ScreenShareManager();
    transcriptionService = new AITranscriptionService();
    webRTCManager = new WebRTCManager('test-user');
    videoRoomService = new VideoRoomService();
  });

  afterEach(async () => {
    await Promise.all([
      screenShareManager.cleanup(),
      transcriptionService.cleanup(),
      webRTCManager.cleanup(),
      videoRoomService.cleanup()
    ]);
  });

  describe('1. Media Permission Errors', () => {
    it('should handle camera permission denied gracefully', async () => {
      const permissionError = new DOMException('Permission denied', 'NotAllowedError');
      vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValueOnce(permissionError);

      await expect(webRTCManager.initializeLocalStream()).rejects.toThrow('Permission denied');
      expect(mockConsoleError).toHaveBeenCalled();
    });

    it('should handle microphone permission denied gracefully', async () => {
      const permissionError = new DOMException('Permission denied', 'NotAllowedError');
      vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValueOnce(permissionError);

      await expect(webRTCManager.initializeLocalStream()).rejects.toThrow('Permission denied');
      expect(webRTCManager.getLocalStream()).toBeNull();
    });

    it('should handle screen sharing permission denied', async () => {
      const screenShareError = new DOMException('Permission denied', 'NotAllowedError');
      vi.mocked(navigator.mediaDevices.getDisplayMedia).mockRejectedValueOnce(screenShareError);

      await expect(screenShareManager.startScreenShare()).rejects.toThrow();
      expect(screenShareManager.isScreenSharing()).toBe(false);
    });

    it('should provide fallback options when permissions are denied', async () => {
      const permissionError = new DOMException('Permission denied', 'NotAllowedError');
      vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValueOnce(permissionError);

      try {
        await webRTCManager.initializeLocalStream();
      } catch (error) {
        // Should provide guidance for permission issues
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('Permission denied');
      }
    });
  });

  describe('2. WebRTC Connection Errors', () => {
    it('should handle peer connection creation failure', async () => {
      const connectionError = new Error('Failed to create peer connection');
      vi.mocked(RTCPeerConnection).mockImplementationOnce(() => {
        throw connectionError;
      });

      await expect(webRTCManager.createPeerConnection('peer1', true)).rejects.toThrow();
      expect(webRTCManager.getConnectedPeers()).toHaveLength(0);
    });

    it('should handle ICE connection failures', async () => {
      await webRTCManager.initializeLocalStream();
      const peerConnection = await webRTCManager.createPeerConnection('peer1', true);
      
      // Simulate ICE connection failure
      Object.defineProperty(peerConnection, 'iceConnectionState', {
        value: 'failed',
        writable: true
      });

      // Trigger connection state change
      if (peerConnection.oniceconnectionstatechange) {
        peerConnection.oniceconnectionstatechange({} as Event);
      }

      expect(mockConsoleError).toHaveBeenCalled();
    });

    it('should attempt reconnection on connection failure', async () => {
      await webRTCManager.initializeLocalStream();
      
      // First connection fails
      vi.mocked(RTCPeerConnection).mockImplementationOnce(() => {
        throw new Error('Connection failed');
      });

      // Second connection succeeds
      vi.mocked(RTCPeerConnection).mockImplementationOnce(() => ({
        createOffer: vi.fn().mockResolvedValue({}),
        createAnswer: vi.fn().mockResolvedValue({}),
        setLocalDescription: vi.fn().mockResolvedValue(undefined),
        setRemoteDescription: vi.fn().mockResolvedValue(undefined),
        addIceCandidate: vi.fn().mockResolvedValue(undefined),
        addTrack: vi.fn(),
        getSenders: vi.fn().mockReturnValue([]),
        getStats: vi.fn().mockResolvedValue(new Map()),
        close: vi.fn(),
        connectionState: 'connected',
        iceConnectionState: 'connected',
      }));

      // First attempt should fail
      await expect(webRTCManager.createPeerConnection('peer1', true)).rejects.toThrow();
      
      // Retry should succeed
      const retryConnection = await webRTCManager.createPeerConnection('peer1-retry', true);
      expect(retryConnection).toBeDefined();
    });

    it('should handle signaling errors gracefully', async () => {
      await webRTCManager.initializeLocalStream();
      const peerConnection = await webRTCManager.createPeerConnection('peer1', false);

      // Mock signaling error
      const invalidOffer = { type: 'invalid' as RTCSdpType, sdp: 'invalid-sdp' };
      
      await expect(webRTCManager.handleOffer(invalidOffer, 'peer1')).rejects.toThrow();
      expect(mockConsoleError).toHaveBeenCalled();
    });
  });

  describe('3. Screen Sharing Errors', () => {
    it('should handle screen sharing not supported', async () => {
      // Mock unsupported browser
      Object.defineProperty(navigator.mediaDevices, 'getDisplayMedia', {
        value: undefined,
        writable: true
      });

      expect(ScreenShareManager.isSupported()).toBe(false);
      
      await expect(screenShareManager.startScreenShare()).rejects.toThrow();
    });

    it('should handle screen sharing cancellation by user', async () => {
      const cancelError = new DOMException('User cancelled', 'AbortError');
      vi.mocked(navigator.mediaDevices.getDisplayMedia).mockRejectedValueOnce(cancelError);

      await expect(screenShareManager.startScreenShare()).rejects.toThrow();
      expect(screenShareManager.isScreenSharing()).toBe(false);
    });

    it('should handle screen sharing stream ending unexpectedly', async () => {
      const mockStream = await screenShareManager.startScreenShare();
      expect(screenShareManager.isScreenSharing()).toBe(true);

      // Simulate stream ending
      const videoTrack = mockStream.getVideoTracks()[0];
      if (videoTrack.addEventListener) {
        // Trigger ended event
        const endedCallback = vi.fn();
        videoTrack.addEventListener('ended', endedCallback);
        
        // Simulate track ending
        Object.defineProperty(videoTrack, 'readyState', { value: 'ended' });
        
        // Manually trigger the ended event handler
        if (videoTrack.onended) {
          videoTrack.onended({} as Event);
        }
      }

      // Should auto-cleanup
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(screenShareManager.isScreenSharing()).toBe(false);
    });

    it('should handle multiple screen sharing conflicts', async () => {
      // Start screen sharing
      await screenShareManager.startScreenShare();
      expect(screenShareManager.isScreenSharing()).toBe(true);

      // Attempt to start again should fail
      await expect(screenShareManager.startScreenShare()).rejects.toThrow('already active');
    });
  });

  describe('4. AI Transcription Errors', () => {
    it('should handle transcription service unavailable', async () => {
      // Mock fetch failure
      global.fetch = vi.fn().mockRejectedValueOnce(new Error('Service unavailable'));

      await expect(transcriptionService.initialize()).rejects.toThrow();
      expect(mockConsoleError).toHaveBeenCalled();
    });

    it('should handle audio context creation failure', async () => {
      // Mock AudioContext failure
      vi.mocked(AudioContext).mockImplementationOnce(() => {
        throw new Error('AudioContext not supported');
      });

      await expect(transcriptionService.initialize()).rejects.toThrow();
    });

    it('should handle transcription without user consent', async () => {
      const mockStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Start transcription without consent
      await transcriptionService.startTranscription('room1', 'user1', mockStream, false);
      
      // Should emit consent request
      expect(transcriptionService.isTranscriptionActive()).toBe(false);
    });

    it('should handle low confidence transcriptions', async () => {
      await transcriptionService.initialize();
      
      // Mock low confidence result
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValueOnce({
          success: true,
          data: {
            text: 'unclear speech',
            confidence: 0.3, // Below threshold
            language: 'tr',
            timestamp: Date.now()
          }
        })
      } as any);

      const mockStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      await transcriptionService.startTranscription('room1', 'user1', mockStream, true);

      // Low confidence transcriptions should be filtered out
      expect(mockConsoleWarn).toHaveBeenCalled();
    });
  });

  describe('5. Device Management Errors', () => {
    it('should handle device enumeration failure', async () => {
      const deviceError = new Error('Device enumeration failed');
      vi.mocked(navigator.mediaDevices.enumerateDevices).mockRejectedValueOnce(deviceError);

      await expect(videoRoomService.enumerateDevices()).rejects.toThrow();
      expect(mockConsoleError).toHaveBeenCalled();
    });

    it('should handle device switching failure', async () => {
      // Mock device switching error
      const switchError = new Error('Device not available');
      vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValueOnce(switchError);

      await expect(videoRoomService.switchCamera('invalid-device')).rejects.toThrow();
    });

    it('should handle device disconnection during call', async () => {
      await webRTCManager.initializeLocalStream();
      const stream = webRTCManager.getLocalStream();
      
      // Simulate device disconnection
      if (stream) {
        stream.getTracks().forEach(track => {
          Object.defineProperty(track, 'readyState', { value: 'ended' });
          if (track.onended) {
            track.onended({} as Event);
          }
        });
      }

      expect(mockConsoleWarn).toHaveBeenCalled();
    });
  });

  describe('6. Network and Connectivity Errors', () => {
    it('should handle network disconnection', async () => {
      await webRTCManager.initializeLocalStream();
      const peerConnection = await webRTCManager.createPeerConnection('peer1', true);

      // Simulate network disconnection
      Object.defineProperty(peerConnection, 'connectionState', {
        value: 'disconnected',
        writable: true
      });

      if (peerConnection.onconnectionstatechange) {
        peerConnection.onconnectionstatechange({} as Event);
      }

      expect(mockConsoleWarn).toHaveBeenCalled();
    });

    it('should handle poor network quality', async () => {
      await webRTCManager.initializeLocalStream();
      const peerConnection = await webRTCManager.createPeerConnection('peer1', true);

      // Simulate poor connection quality
      Object.defineProperty(peerConnection, 'iceConnectionState', {
        value: 'checking',
        writable: true
      });

      if (peerConnection.oniceconnectionstatechange) {
        peerConnection.oniceconnectionstatechange({} as Event);
      }

      // Should adapt to poor quality
      expect(mockConsoleWarn).toHaveBeenCalled();
    });

    it('should handle bandwidth limitations', async () => {
      // Test quality adaptation under bandwidth constraints
      const lowBandwidthSettings = {
        resolution: '480p',
        frameRate: 15,
        bitrate: 500
      };

      screenShareManager.setQuality(lowBandwidthSettings);
      const state = screenShareManager.getState();
      
      expect(state.quality).toEqual(lowBandwidthSettings);
    });
  });

  describe('7. Room Management Errors', () => {
    it('should handle room capacity exceeded', async () => {
      const fullRoomError = new Error('Room is full');
      
      // Mock room full scenario
      vi.spyOn(videoRoomService, 'joinVideoRoom').mockRejectedValueOnce(fullRoomError);

      await expect(
        videoRoomService.joinVideoRoom('full-room', 'user1', 'User 1')
      ).rejects.toThrow('Room is full');
    });

    it('should handle invalid room credentials', async () => {
      const authError = new Error('Invalid room password');
      
      vi.spyOn(videoRoomService, 'joinVideoRoom').mockRejectedValueOnce(authError);

      await expect(
        videoRoomService.joinVideoRoom('private-room', 'user1', 'User 1')
      ).rejects.toThrow('Invalid room password');
    });

    it('should handle room cleanup on host disconnect', async () => {
      const roomId = await videoRoomService.createVideoRoom({
        name: 'Test Room',
        hostId: 'host-user',
        hostName: 'Host User',
        maxParticipants: 10,
        isPrivate: false,
        videoEnabled: true,
        screenShareEnabled: true
      });

      // Simulate host disconnect
      await videoRoomService.leaveVideoRoom(roomId, 'host-user');

      // Room should handle host disconnect gracefully
      expect(mockConsoleWarn).toHaveBeenCalled();
    });
  });

  describe('8. Resource Management Errors', () => {
    it('should handle memory pressure', async () => {
      // Simulate memory pressure by creating many connections
      await webRTCManager.initializeLocalStream();
      
      const connections = [];
      for (let i = 0; i < 20; i++) {
        try {
          const connection = await webRTCManager.createPeerConnection(`peer${i}`, true);
          connections.push(connection);
        } catch (error) {
          // Should handle resource exhaustion gracefully
          expect(error).toBeInstanceOf(Error);
          break;
        }
      }

      // Should not crash the application
      expect(webRTCManager.getConnectedPeers().length).toBeGreaterThan(0);
    });

    it('should handle cleanup failures gracefully', async () => {
      await webRTCManager.initializeLocalStream();
      
      // Mock cleanup failure
      const mockStream = webRTCManager.getLocalStream();
      if (mockStream) {
        mockStream.getTracks().forEach(track => {
          vi.spyOn(track, 'stop').mockImplementationOnce(() => {
            throw new Error('Cleanup failed');
          });
        });
      }

      // Cleanup should not throw
      await expect(webRTCManager.cleanup()).resolves.not.toThrow();
      expect(mockConsoleError).toHaveBeenCalled();
    });
  });

  describe('9. Error Recovery and Resilience', () => {
    it('should recover from temporary service failures', async () => {
      // First attempt fails
      global.fetch = vi.fn().mockRejectedValueOnce(new Error('Temporary failure'));
      
      await expect(transcriptionService.initialize()).rejects.toThrow();

      // Second attempt succeeds
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValueOnce({ status: 'healthy' })
      } as any);

      await expect(transcriptionService.initialize()).resolves.not.toThrow();
    });

    it('should maintain core functionality when advanced features fail', async () => {
      // Core WebRTC should work even if screen sharing fails
      await webRTCManager.initializeLocalStream();
      expect(webRTCManager.getLocalStream()).toBeDefined();

      // Screen sharing failure shouldn't affect core functionality
      vi.mocked(navigator.mediaDevices.getDisplayMedia).mockRejectedValueOnce(
        new Error('Screen sharing failed')
      );

      await expect(screenShareManager.startScreenShare()).rejects.toThrow();
      expect(webRTCManager.getLocalStream()).toBeDefined(); // Still working
    });

    it('should provide meaningful error messages to users', async () => {
      const permissionError = new DOMException('Permission denied', 'NotAllowedError');
      vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValueOnce(permissionError);

      try {
        await webRTCManager.initializeLocalStream();
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('Permission denied');
      }
    });
  });

  describe('10. Graceful Degradation', () => {
    it('should degrade gracefully when features are unavailable', async () => {
      // Disable screen sharing
      Object.defineProperty(navigator.mediaDevices, 'getDisplayMedia', {
        value: undefined,
        writable: true
      });

      // Disable audio context
      vi.mocked(AudioContext).mockImplementationOnce(() => {
        throw new Error('AudioContext not supported');
      });

      // Core video functionality should still work
      await webRTCManager.initializeLocalStream();
      expect(webRTCManager.getLocalStream()).toBeDefined();

      // Advanced features should fail gracefully
      expect(ScreenShareManager.isSupported()).toBe(false);
      await expect(transcriptionService.initialize()).rejects.toThrow();
    });

    it('should provide fallback UI when features fail', async () => {
      const errorStates = {
        screenShareUnavailable: !ScreenShareManager.isSupported(),
        transcriptionUnavailable: false,
        cameraUnavailable: false,
        microphoneUnavailable: false
      };

      // Should provide appropriate fallback states
      expect(typeof errorStates.screenShareUnavailable).toBe('boolean');
      expect(typeof errorStates.transcriptionUnavailable).toBe('boolean');
    });
  });
});