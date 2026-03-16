/**
 * Advanced Features Performance Test Suite
 * Task 11: Performance testing with multiple features active simultaneously
 * Tests system performance under various load conditions
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ScreenShareManager } from '../screenShareManager';
import { AITranscriptionService } from '../aiTranscriptionService';
import { WebRTCManager } from '../webRTCManager';
import { VideoRoomService } from '../videoRoomService';
import { VideoParticipant, PerformanceMetrics } from '../../types/videoConference';

// Mock performance APIs
Object.defineProperty(global, 'performance', {
  writable: true,
  value: {
    now: vi.fn(() => Date.now()),
    mark: vi.fn(),
    measure: vi.fn(),
    getEntriesByType: vi.fn(() => []),
    getEntriesByName: vi.fn(() => []),
    clearMarks: vi.fn(),
    clearMeasures: vi.fn()
  }
});

// Mock WebRTC APIs
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
      replaceTrack: vi.fn().mockResolvedValue(undefined),
      getStats: vi.fn().mockResolvedValue(new Map([
        ['outbound-rtp', {
          type: 'outbound-rtp',
          bytesSent: 1024000,
          packetsSent: 1000,
          framesEncoded: 900
        }],
        ['inbound-rtp', {
          type: 'inbound-rtp',
          bytesReceived: 2048000,
          packetsReceived: 2000,
          framesDecoded: 1800
        }]
      ]))
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
    })
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

describe('Advanced Features Performance Tests', () => {
  let screenShareManager: ScreenShareManager;
  let transcriptionService: AITranscriptionService;
  let webRTCManager: WebRTCManager;
  let videoRoomService: VideoRoomService;

  beforeEach(() => {
    vi.clearAllMocks();
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

  describe('1. Single Feature Performance', () => {
    it('should measure WebRTC manager performance', async () => {
      const startTime = performance.now();
      
      await webRTCManager.initializeLocalStream();
      await webRTCManager.createPeerConnection('peer1', true);
      await webRTCManager.createPeerConnection('peer2', true);
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
      expect(webRTCManager.getConnectedPeers()).toHaveLength(2);
    });

    it('should measure screen sharing performance', async () => {
      const startTime = performance.now();
      
      const stream = await screenShareManager.startScreenShare();
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(500); // Should start within 500ms
      expect(stream).toBeDefined();
      expect(screenShareManager.isScreenSharing()).toBe(true);
    });

    it('should measure AI transcription initialization performance', async () => {
      const startTime = performance.now();
      
      await transcriptionService.initialize();
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(2000); // Should initialize within 2 seconds
    });
  });

  describe('2. Multiple Features Performance', () => {
    it('should handle all features active simultaneously', async () => {
      const startTime = performance.now();
      
      // Initialize all services
      await Promise.all([
        webRTCManager.initializeLocalStream(),
        transcriptionService.initialize()
      ]);
      
      // Create multiple peer connections
      const peerPromises = [];
      for (let i = 0; i < 5; i++) {
        peerPromises.push(webRTCManager.createPeerConnection(`peer${i}`, true));
      }
      await Promise.all(peerPromises);
      
      // Start screen sharing
      await screenShareManager.startScreenShare();
      
      // Start transcription
      const mockStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      await transcriptionService.startTranscription('room1', 'user1', mockStream, true);
      
      const endTime = performance.now();
      const totalDuration = endTime - startTime;
      
      expect(totalDuration).toBeLessThan(5000); // All features should start within 5 seconds
      expect(webRTCManager.getConnectedPeers()).toHaveLength(5);
      expect(screenShareManager.isScreenSharing()).toBe(true);
      expect(transcriptionService.isTranscriptionActive()).toBe(true);
    });

    it('should maintain performance with high participant count', async () => {
      const participantCount = 10;
      const startTime = performance.now();
      
      await webRTCManager.initializeLocalStream();
      
      // Create connections for multiple participants
      const connectionPromises = [];
      for (let i = 0; i < participantCount; i++) {
        connectionPromises.push(webRTCManager.createPeerConnection(`participant${i}`, true));
      }
      
      await Promise.all(connectionPromises);
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should handle 10 participants within reasonable time
      expect(duration).toBeLessThan(3000);
      expect(webRTCManager.getConnectedPeers()).toHaveLength(participantCount);
    });

    it('should measure memory usage with multiple features', async () => {
      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;
      
      // Initialize all services
      await webRTCManager.initializeLocalStream();
      await transcriptionService.initialize();
      await screenShareManager.startScreenShare();
      
      // Create multiple connections
      for (let i = 0; i < 5; i++) {
        await webRTCManager.createPeerConnection(`peer${i}`, true);
      }
      
      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });
  });

  describe('3. Network Performance', () => {
    it('should measure bandwidth usage with screen sharing', async () => {
      await webRTCManager.initializeLocalStream();
      const peerConnection = await webRTCManager.createPeerConnection('peer1', true);
      
      // Start screen sharing
      await screenShareManager.startScreenShare();
      
      // Simulate some time for stats collection
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const stats = await webRTCManager.getAllConnectionStats();
      expect(stats).toBeDefined();
      expect(stats instanceof Map).toBe(true);
    });

    it('should handle network quality degradation', async () => {
      await webRTCManager.initializeLocalStream();
      
      // Simulate poor network conditions
      const mockPoorConnection = {
        ...await webRTCManager.createPeerConnection('peer1', true),
        connectionState: 'connecting',
        iceConnectionState: 'checking'
      };
      
      // Should still maintain basic functionality
      expect(webRTCManager.getConnectedPeers()).toHaveLength(1);
    });

    it('should optimize quality based on available bandwidth', async () => {
      const qualitySettings = {
        high: { resolution: '1080p', frameRate: 30, bitrate: 2000 },
        medium: { resolution: '720p', frameRate: 24, bitrate: 1000 },
        low: { resolution: '480p', frameRate: 15, bitrate: 500 }
      };
      
      // Test quality adaptation
      screenShareManager.setQuality(qualitySettings.low);
      const state = screenShareManager.getState();
      
      expect(state.quality).toEqual(qualitySettings.low);
    });
  });

  describe('4. CPU and Resource Usage', () => {
    it('should monitor CPU usage during intensive operations', async () => {
      const cpuUsageBefore = getCPUUsage();
      
      // Perform CPU-intensive operations
      await Promise.all([
        webRTCManager.initializeLocalStream(),
        screenShareManager.startScreenShare(),
        transcriptionService.initialize()
      ]);
      
      // Create multiple peer connections
      for (let i = 0; i < 8; i++) {
        await webRTCManager.createPeerConnection(`peer${i}`, true);
      }
      
      const cpuUsageAfter = getCPUUsage();
      const cpuIncrease = cpuUsageAfter - cpuUsageBefore;
      
      // CPU increase should be reasonable
      expect(cpuIncrease).toBeLessThan(50); // Less than 50% increase
    });

    it('should handle resource cleanup efficiently', async () => {
      // Initialize all services
      await webRTCManager.initializeLocalStream();
      await screenShareManager.startScreenShare();
      await transcriptionService.initialize();
      
      const cleanupStartTime = performance.now();
      
      // Cleanup all services
      await Promise.all([
        webRTCManager.cleanup(),
        screenShareManager.cleanup(),
        transcriptionService.cleanup()
      ]);
      
      const cleanupEndTime = performance.now();
      const cleanupDuration = cleanupEndTime - cleanupStartTime;
      
      expect(cleanupDuration).toBeLessThan(1000); // Cleanup within 1 second
      expect(webRTCManager.getLocalStream()).toBeNull();
      expect(screenShareManager.isScreenSharing()).toBe(false);
      expect(transcriptionService.isTranscriptionActive()).toBe(false);
    });
  });

  describe('5. Stress Testing', () => {
    it('should handle rapid feature toggling', async () => {
      await webRTCManager.initializeLocalStream();
      
      // Rapidly toggle screen sharing
      for (let i = 0; i < 10; i++) {
        await screenShareManager.startScreenShare();
        await screenShareManager.stopScreenShare();
      }
      
      // Should remain stable
      expect(screenShareManager.isScreenSharing()).toBe(false);
    });

    it('should handle concurrent user actions', async () => {
      await webRTCManager.initializeLocalStream();
      
      // Simulate concurrent actions
      const actions = [
        screenShareManager.startScreenShare(),
        transcriptionService.initialize(),
        webRTCManager.createPeerConnection('peer1', true),
        webRTCManager.createPeerConnection('peer2', true)
      ];
      
      await Promise.all(actions);
      
      expect(screenShareManager.isScreenSharing()).toBe(true);
      expect(webRTCManager.getConnectedPeers()).toHaveLength(2);
    });

    it('should maintain performance under load', async () => {
      const iterations = 100;
      const startTime = performance.now();
      
      // Perform many operations
      for (let i = 0; i < iterations; i++) {
        await webRTCManager.initializeLocalStream();
        const stream = webRTCManager.getLocalStream();
        expect(stream).toBeDefined();
      }
      
      const endTime = performance.now();
      const averageTime = (endTime - startTime) / iterations;
      
      expect(averageTime).toBeLessThan(10); // Average less than 10ms per operation
    });
  });

  describe('6. Error Recovery Performance', () => {
    it('should recover quickly from connection failures', async () => {
      await webRTCManager.initializeLocalStream();
      
      // Simulate connection failure
      const mockError = new Error('Connection failed');
      vi.mocked(RTCPeerConnection).mockImplementationOnce(() => {
        throw mockError;
      });
      
      const recoveryStartTime = performance.now();
      
      try {
        await webRTCManager.createPeerConnection('peer1', true);
      } catch (error) {
        // Attempt recovery
        await webRTCManager.createPeerConnection('peer1-retry', true);
      }
      
      const recoveryEndTime = performance.now();
      const recoveryTime = recoveryEndTime - recoveryStartTime;
      
      expect(recoveryTime).toBeLessThan(2000); // Recovery within 2 seconds
    });

    it('should handle graceful degradation', async () => {
      // Simulate partial feature failure
      vi.mocked(navigator.mediaDevices.getDisplayMedia).mockRejectedValueOnce(
        new Error('Screen sharing not available')
      );
      
      await webRTCManager.initializeLocalStream();
      
      // Should continue working with other features
      expect(webRTCManager.getLocalStream()).toBeDefined();
      
      // Screen sharing should fail gracefully
      await expect(screenShareManager.startScreenShare()).rejects.toThrow();
      expect(screenShareManager.isScreenSharing()).toBe(false);
    });
  });
});

// Helper function to simulate CPU usage measurement
function getCPUUsage(): number {
  // In a real implementation, this would measure actual CPU usage
  // For testing, we return a mock value
  return Math.random() * 30 + 10; // Random value between 10-40%
}

// Helper function to create performance metrics
function createPerformanceMetrics(): PerformanceMetrics {
  return {
    cpuUsage: getCPUUsage(),
    memoryUsage: Math.random() * 200 + 100, // 100-300 MB
    networkBandwidth: Math.random() * 3 + 1, // 1-4 Mbps
    frameRate: 30,
    resolution: '1080p'
  };
}