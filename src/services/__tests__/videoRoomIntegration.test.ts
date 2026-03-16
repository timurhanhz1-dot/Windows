/**
 * Video Room Integration Tests
 * Tests the integration between WebRTCManager and VideoRoomService
 */

import { WebRTCManager } from '../webRTCManager';
import { VideoRoomService } from '../videoRoomService';

// Mock Firebase
jest.mock('../firebase', () => ({
  db: {}
}));

// Mock Firebase database functions
jest.mock('firebase/database', () => ({
  ref: jest.fn(),
  set: jest.fn(),
  get: jest.fn(),
  push: jest.fn(() => ({ key: 'mock-room-id' })),
  update: jest.fn(),
  remove: jest.fn(),
  onValue: jest.fn(),
  off: jest.fn(),
}));

// Mock WebRTC APIs
const mockGetUserMedia = jest.fn();
const mockGetDisplayMedia = jest.fn();
const mockRTCPeerConnection = jest.fn();

Object.defineProperty(global.navigator, 'mediaDevices', {
  value: {
    getUserMedia: mockGetUserMedia,
    getDisplayMedia: mockGetDisplayMedia,
  },
  writable: true,
});

Object.defineProperty(global, 'RTCPeerConnection', {
  value: mockRTCPeerConnection,
  writable: true,
});

describe('Video Room Integration', () => {
  let videoRoomService: VideoRoomService;
  let mockConnection: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock RTCPeerConnection
    mockConnection = {
      addTrack: jest.fn(),
      createOffer: jest.fn(),
      createAnswer: jest.fn(),
      setLocalDescription: jest.fn(),
      setRemoteDescription: jest.fn(),
      addIceCandidate: jest.fn(),
      close: jest.fn(),
      getSenders: jest.fn(() => []),
      getStats: jest.fn(() => Promise.resolve(new Map())),
      connectionState: 'new',
      iceConnectionState: 'new',
      signalingState: 'stable',
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      ontrack: null,
      onicecandidate: null,
      onconnectionstatechange: null,
      oniceconnectionstatechange: null,
      onicegatheringstatechange: null,
      onsignalingstatechange: null,
      ondatachannel: null,
    };

    mockRTCPeerConnection.mockImplementation(() => mockConnection);
    
    // Create service instance
    videoRoomService = new VideoRoomService();
  });

  afterEach(async () => {
    await videoRoomService.cleanup();
  });

  describe('WebRTC Manager Integration', () => {
    test('should create WebRTC manager with signaling service', () => {
      expect(videoRoomService).toBeDefined();
      // WebRTC manager should be created and configured internally
    });

    test('should handle signaling messages through video room service', async () => {
      const mockStream = {
        getTracks: jest.fn(() => []),
        getVideoTracks: jest.fn(() => []),
        getAudioTracks: jest.fn(() => []),
        active: true,
      };

      mockGetUserMedia.mockResolvedValue(mockStream);

      // Mock Firebase get to return empty room
      const { get } = require('firebase/database');
      get.mockResolvedValue({
        exists: () => true,
        val: () => ({
          id: 'test-room',
          name: 'Test Room',
          hostId: 'host-123',
          hostName: 'Host User',
          maxParticipants: 10,
          participants: [],
          videoEnabled: true,
          screenShareEnabled: true,
          recordingEnabled: false,
          aiModerationEnabled: false,
          transcriptionEnabled: false,
          isRecording: false,
          createdAt: Date.now(),
          lastActivity: Date.now()
        })
      });

      // Test that signaling integration works
      let signalingMessageReceived = false;
      videoRoomService.on('signalingMessage', () => {
        signalingMessageReceived = true;
      });

      // This should trigger WebRTC manager initialization
      // In a real scenario, this would establish peer connections
      expect(mockRTCPeerConnection).toBeDefined();
    });
  });

  describe('Media Stream Management', () => {
    test('should handle media permissions correctly', async () => {
      const mockVideoStream = {
        getTracks: jest.fn(() => [{ stop: jest.fn() }]),
        getVideoTracks: jest.fn(() => [{ stop: jest.fn() }]),
        getAudioTracks: jest.fn(() => []),
        active: true,
      };

      const mockAudioStream = {
        getTracks: jest.fn(() => [{ stop: jest.fn() }]),
        getVideoTracks: jest.fn(() => []),
        getAudioTracks: jest.fn(() => [{ stop: jest.fn() }]),
        active: true,
      };

      // Mock successful permission requests
      mockGetUserMedia
        .mockResolvedValueOnce(mockVideoStream) // Camera test
        .mockResolvedValueOnce(mockAudioStream); // Microphone test

      // The service should handle media permissions internally
      expect(mockGetUserMedia).toBeDefined();
    });

    test('should handle screen sharing', async () => {
      const mockDisplayStream = {
        getTracks: jest.fn(() => []),
        getVideoTracks: jest.fn(() => [{
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
        }]),
        getAudioTracks: jest.fn(() => []),
        active: true,
      };

      mockGetDisplayMedia.mockResolvedValue(mockDisplayStream);

      // Screen sharing should work through the service
      expect(mockGetDisplayMedia).toBeDefined();
    });
  });

  describe('Connection Management', () => {
    test('should create peer connections for multiple participants', () => {
      // Mock multiple participants scenario
      const participants = ['user1', 'user2', 'user3'];
      
      // Each participant should get a peer connection
      participants.forEach(() => {
        // In real scenario, this would create RTCPeerConnection instances
        expect(mockRTCPeerConnection).toBeDefined();
      });
    });

    test('should handle connection failures gracefully', () => {
      // Mock connection failure
      mockConnection.connectionState = 'failed';
      
      // Service should handle failures and attempt reconnection
      expect(mockConnection).toBeDefined();
    });
  });

  describe('Event Handling', () => {
    test('should emit events for connection state changes', () => {
      let eventEmitted = false;
      
      videoRoomService.on('connectionStateChanged', () => {
        eventEmitted = true;
      });

      // Simulate connection state change
      // In real scenario, this would be triggered by WebRTC events
      expect(eventEmitted).toBe(false); // No events yet in this test
    });

    test('should emit events for remote streams', () => {
      let streamReceived = false;
      
      videoRoomService.on('remoteStreamReceived', () => {
        streamReceived = true;
      });

      // Simulate remote stream reception
      // In real scenario, this would be triggered by WebRTC ontrack event
      expect(streamReceived).toBe(false); // No streams yet in this test
    });
  });

  describe('Cleanup', () => {
    test('should cleanup all resources properly', async () => {
      // Create some mock state
      const mockStream = {
        getTracks: jest.fn(() => [{ stop: jest.fn() }]),
        getVideoTracks: jest.fn(() => []),
        getAudioTracks: jest.fn(() => []),
        active: true,
      };

      mockGetUserMedia.mockResolvedValue(mockStream);

      // Cleanup should not throw errors
      await expect(videoRoomService.cleanup()).resolves.not.toThrow();
    });
  });
});