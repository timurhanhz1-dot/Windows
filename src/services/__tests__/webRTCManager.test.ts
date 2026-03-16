/**
 * WebRTC Manager Tests
 * Basic functionality tests for WebRTC Manager service
 */

import { describe, it, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { WebRTCManager } from '../webRTCManager';

// Mock Firebase
vi.mock('../../firebase', () => ({ db: {} }));
vi.mock('firebase/database', () => ({
  ref: vi.fn(() => ({})),
  set: vi.fn().mockResolvedValue(undefined),
  get: vi.fn().mockResolvedValue({ val: () => null, exists: () => false }),
  update: vi.fn().mockResolvedValue(undefined),
  remove: vi.fn().mockResolvedValue(undefined),
  push: vi.fn(() => ({ key: 'mock-id' })),
  onValue: vi.fn(() => vi.fn()),
  off: vi.fn(),
}));

// Mock WebRTC APIs - use a shared connection object that tests can modify
let currentMockConnection: any = null;

class RTCPeerConnection {
  addTrack: any; createOffer: any; createAnswer: any;
  setLocalDescription: any; setRemoteDescription: any; addIceCandidate: any;
  close: any; getSenders: any; getStats: any;
  connectionState: any; iceConnectionState: any; signalingState: any;
  addEventListener: any; removeEventListener: any;
  ontrack: any; onicecandidate: any; onconnectionstatechange: any;
  oniceconnectionstatechange: any; onicegatheringstatechange: any;
  onsignalingstatechange: any; ondatachannel: any;
  constructor() {
    if (currentMockConnection) {
      Object.assign(this, currentMockConnection);
    }
  }
}

Object.defineProperty(global, 'RTCPeerConnection', {
  writable: true,
  configurable: true,
  value: RTCPeerConnection,
});

const mockGetUserMedia = vi.fn();

// Setup mocks
Object.defineProperty(global.navigator, 'mediaDevices', {
  value: {
    getUserMedia: mockGetUserMedia,
  },
  writable: true,
});

describe('WebRTCManager', () => {
  let webRTCManager: WebRTCManager;
  let mockConnection: any;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Mock RTCPeerConnection
    mockConnection = {
      addTrack: vi.fn(),
      createOffer: vi.fn().mockResolvedValue({ type: 'offer', sdp: 'mock-sdp' }),
      createAnswer: vi.fn().mockResolvedValue({ type: 'answer', sdp: 'mock-answer-sdp' }),
      setLocalDescription: vi.fn().mockResolvedValue(undefined),
      setRemoteDescription: vi.fn().mockResolvedValue(undefined),
      addIceCandidate: vi.fn().mockResolvedValue(undefined),
      close: vi.fn(),
      getSenders: vi.fn(() => []),
      getStats: vi.fn(() => Promise.resolve(new Map())),
      connectionState: 'new',
      iceConnectionState: 'new',
      signalingState: 'stable',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      ontrack: null,
      onicecandidate: null,
      onconnectionstatechange: null,
      oniceconnectionstatechange: null,
      onicegatheringstatechange: null,
      onsignalingstatechange: null,
      ondatachannel: null,
    };

    // Set the shared connection so RTCPeerConnection constructor uses it
    currentMockConnection = mockConnection;
    
    // Create WebRTC Manager instance
    webRTCManager = new WebRTCManager('test-user-123');
  });

  afterEach(() => {
    webRTCManager.cleanup();
  });

  describe('Initialization', () => {
    test('should initialize with correct user ID', () => {
      expect(webRTCManager).toBeDefined();
      // Test that user ID is set correctly (we can't directly access private field)
    });

    test('should set current user ID', () => {
      webRTCManager.setCurrentUserId('new-user-456');
      // User ID should be updated internally
    });
  });

  describe('Local Stream Management', () => {
    test('should initialize local stream successfully', async () => {
      const mockStream = {
        getTracks: vi.fn(() => []),
        getVideoTracks: vi.fn(() => []),
        getAudioTracks: vi.fn(() => []),
        active: true,
      };

      mockGetUserMedia.mockResolvedValue(mockStream);

      const stream = await webRTCManager.initializeLocalStream();
      
      expect(mockGetUserMedia).toHaveBeenCalledWith({ video: true, audio: true });
      expect(stream).toBe(mockStream);
      expect(webRTCManager.getLocalStream()).toBe(mockStream);
    });

    test('should handle permission denied error', async () => {
      const permissionError = new Error('Permission denied');
      mockGetUserMedia.mockRejectedValue(permissionError);

      let errorEmitted = false;
      webRTCManager.on('error', () => {
        errorEmitted = true;
      });

      await expect(webRTCManager.initializeLocalStream()).rejects.toThrow();
      expect(errorEmitted).toBe(true);
    });

    test('should stop local stream', async () => {
      const mockTrack = { stop: vi.fn() };
      const mockStream = {
        getTracks: vi.fn(() => [mockTrack]),
        getVideoTracks: vi.fn(() => []),
        getAudioTracks: vi.fn(() => []),
        active: true,
      };

      mockGetUserMedia.mockResolvedValue(mockStream);
      await webRTCManager.initializeLocalStream();
      
      await webRTCManager.stopLocalStream();
      
      expect(mockTrack.stop).toHaveBeenCalled();
      expect(webRTCManager.getLocalStream()).toBeNull();
    });
  });

  describe('Peer Connection Management', () => {
    test('should create peer connection successfully', async () => {
      const targetUserId = 'target-user-123';
      
      const connection = await webRTCManager.createPeerConnection(targetUserId, true);
      
      expect(connection).toBeDefined();
      expect(webRTCManager.getConnectionState(targetUserId)).toBe('new');
    });

    test('should not create duplicate peer connections', async () => {
      const targetUserId = 'target-user-123';
      
      const connection1 = await webRTCManager.createPeerConnection(targetUserId, true);
      const connection2 = await webRTCManager.createPeerConnection(targetUserId, false);
      
      expect(connection1).toBe(connection2);
    });

    test('should remove peer connection', async () => {
      const targetUserId = 'target-user-123';
      
      await webRTCManager.createPeerConnection(targetUserId, true);
      expect(webRTCManager.getConnectionState(targetUserId)).toBe('new');
      
      await webRTCManager.removePeerConnection(targetUserId);
      expect(webRTCManager.getConnectionState(targetUserId)).toBeNull();
      expect(mockConnection.close).toHaveBeenCalled();
    });
  });

  describe('Signaling Handling', () => {
    test('should handle offer correctly', async () => {
      const fromUserId = 'sender-user-123';
      const mockOffer = { type: 'offer', sdp: 'mock-sdp' } as RTCSessionDescription;
      const mockAnswer = { type: 'answer', sdp: 'mock-answer-sdp' } as RTCSessionDescription;
      
      mockConnection.createAnswer.mockResolvedValue(mockAnswer);
      
      let signalingMessageSent = false;
      webRTCManager.on('signalingMessage', () => {
        signalingMessageSent = true;
      });
      
      await webRTCManager.handleOffer(mockOffer, fromUserId);
      
      expect(mockConnection.setRemoteDescription).toHaveBeenCalledWith(mockOffer);
      expect(mockConnection.createAnswer).toHaveBeenCalled();
      expect(mockConnection.setLocalDescription).toHaveBeenCalledWith(mockAnswer);
      expect(signalingMessageSent).toBe(true);
    });

    test('should handle answer correctly', async () => {
      const fromUserId = 'sender-user-123';
      const mockAnswer = { type: 'answer', sdp: 'mock-answer-sdp' } as RTCSessionDescription;
      
      // Create peer connection first
      await webRTCManager.createPeerConnection(fromUserId, false);
      
      await webRTCManager.handleAnswer(mockAnswer, fromUserId);
      
      expect(mockConnection.setRemoteDescription).toHaveBeenCalledWith(mockAnswer);
    });

    test('should handle ICE candidate correctly', async () => {
      const fromUserId = 'sender-user-123';
      const mockCandidate = { candidate: 'mock-candidate' } as RTCIceCandidate;
      
      // Create peer connection first
      await webRTCManager.createPeerConnection(fromUserId, false);
      
      await webRTCManager.handleIceCandidate(mockCandidate, fromUserId);
      
      expect(mockConnection.addIceCandidate).toHaveBeenCalledWith(mockCandidate);
    });
  });

  describe('Utility Methods', () => {
    test('should check if user is connected', async () => {
      const targetUserId = 'target-user-123';
      
      await webRTCManager.createPeerConnection(targetUserId, true);
      expect(webRTCManager.isConnected(targetUserId)).toBe(false);
      
      // Simulate connection state change
      const peerConnections = webRTCManager.getPeerConnections();
      const peerState = peerConnections.get(targetUserId);
      if (peerState) {
        peerState.connectionState = 'connected';
      }
      
      expect(webRTCManager.isConnected(targetUserId)).toBe(true);
    });

    test('should get connected peers', async () => {
      await webRTCManager.createPeerConnection('user1', true);
      await webRTCManager.createPeerConnection('user2', true);
      
      // Simulate one connection as connected
      const peerConnections = webRTCManager.getPeerConnections();
      const peerState1 = peerConnections.get('user1');
      if (peerState1) {
        peerState1.connectionState = 'connected';
      }
      
      const connectedPeers = webRTCManager.getConnectedPeers();
      expect(connectedPeers).toEqual(['user1']);
    });

    test('should check if has local stream', async () => {
      expect(webRTCManager.hasLocalStream()).toBe(false);
      
      const mockStream = {
        getTracks: vi.fn(() => []),
        getVideoTracks: vi.fn(() => []),
        getAudioTracks: vi.fn(() => []),
        active: true,
      };
      
      mockGetUserMedia.mockResolvedValue(mockStream);
      await webRTCManager.initializeLocalStream();
      
      expect(webRTCManager.hasLocalStream()).toBe(true);
    });
  });

  describe('Media Controls', () => {
    beforeEach(async () => {
      const mockTrack = { enabled: true };
      const mockStream = {
        getTracks: vi.fn(() => [mockTrack]),
        getVideoTracks: vi.fn(() => [mockTrack]),
        getAudioTracks: vi.fn(() => [mockTrack]),
        active: true,
      };
      
      mockGetUserMedia.mockResolvedValue(mockStream);
      await webRTCManager.initializeLocalStream();
    });

    test('should toggle audio', async () => {
      let audioToggled = false;
      webRTCManager.on('audioToggled', () => {
        audioToggled = true;
      });
      
      await webRTCManager.toggleAudio(false);
      expect(audioToggled).toBe(true);
    });

    test('should toggle video', async () => {
      let videoToggled = false;
      webRTCManager.on('videoToggled', () => {
        videoToggled = true;
      });
      
      await webRTCManager.toggleVideo(false);
      expect(videoToggled).toBe(true);
    });
  });

  describe('Cleanup', () => {
    test('should cleanup all resources', async () => {
      // Create some connections and local stream
      const mockStream = {
        getTracks: vi.fn(() => [{ stop: vi.fn() }]),
        getVideoTracks: vi.fn(() => []),
        getAudioTracks: vi.fn(() => []),
        active: true,
      };
      
      mockGetUserMedia.mockResolvedValue(mockStream);
      await webRTCManager.initializeLocalStream();
      await webRTCManager.createPeerConnection('user1', true);
      
      await webRTCManager.cleanup();
      
      expect(webRTCManager.getLocalStream()).toBeNull();
      expect(webRTCManager.getPeerConnections().size).toBe(0);
    });
  });
});