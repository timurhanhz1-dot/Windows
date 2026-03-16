/**
 * Video Room Service Optimized Tests
 * Tests for Task 4 optimizations: room management, media permissions, device management
 */

import { VideoRoomService } from '../videoRoomService';
import { VideoConferenceError, MediaPermissions } from '../../types/videoConference';

// Mock Firebase
jest.mock('../../firebase', () => ({
  db: {}
}));

// Mock Firebase Database functions
jest.mock('firebase/database', () => ({
  ref: jest.fn(),
  set: jest.fn(),
  get: jest.fn(),
  push: jest.fn(() => ({ key: 'test-room-id' })),
  update: jest.fn(),
  remove: jest.fn(),
  onValue: jest.fn(),
  off: jest.fn()
}));

// Mock WebRTC APIs
const mockGetUserMedia = jest.fn();
const mockEnumerateDevices = jest.fn();
const mockGetDisplayMedia = jest.fn();

Object.defineProperty(global.navigator, 'mediaDevices', {
  value: {
    getUserMedia: mockGetUserMedia,
    enumerateDevices: mockEnumerateDevices,
    getDisplayMedia: mockGetDisplayMedia
  },
  writable: true
});

Object.defineProperty(global.navigator, 'permissions', {
  value: {
    query: jest.fn()
  },
  writable: true
});

// Mock MediaStream and MediaStreamTrack
class MockMediaStreamTrack {
  kind: string;
  enabled: boolean = true;
  
  constructor(kind: string) {
    this.kind = kind;
  }
  
  stop() {}
  addEventListener() {}
}

class MockMediaStream {
  tracks: MockMediaStreamTrack[] = [];
  
  constructor(tracks: MockMediaStreamTrack[] = []) {
    this.tracks = tracks;
  }
  
  getTracks() { return this.tracks; }
  getVideoTracks() { return this.tracks.filter(t => t.kind === 'video'); }
  getAudioTracks() { return this.tracks.filter(t => t.kind === 'audio'); }
  addTrack(track: MockMediaStreamTrack) { this.tracks.push(track); }
  removeTrack(track: MockMediaStreamTrack) { 
    this.tracks = this.tracks.filter(t => t !== track); 
  }
}

global.MediaStream = MockMediaStream as any;

describe('VideoRoomService - Task 4 Optimizations', () => {
  let videoRoomService: VideoRoomService;
  
  beforeEach(() => {
    jest.clearAllMocks();
    videoRoomService = new VideoRoomService();
    
    // Setup default mock responses
    mockGetUserMedia.mockResolvedValue(
      new MockMediaStream([
        new MockMediaStreamTrack('video'),
        new MockMediaStreamTrack('audio')
      ])
    );
    
    mockEnumerateDevices.mockResolvedValue([
      { deviceId: 'camera1', kind: 'videoinput', label: 'Camera 1' },
      { deviceId: 'mic1', kind: 'audioinput', label: 'Microphone 1' },
      { deviceId: 'speaker1', kind: 'audiooutput', label: 'Speaker 1' }
    ]);
  });

  describe('Enhanced Media Permissions', () => {
    test('should request media permissions with fallback options', async () => {
      const permissions = await videoRoomService.requestMediaPermissions({
        video: true,
        audio: true,
        fallbackToAudioOnly: true
      });

      expect(permissions).toEqual({
        camera: true,
        microphone: true,
        screen: false
      });
      
      expect(mockGetUserMedia).toHaveBeenCalledTimes(2); // Once for video, once for audio
    });

    test('should fallback to audio-only when camera permission denied', async () => {
      mockGetUserMedia
        .mockRejectedValueOnce(new Error('NotAllowedError')) // Camera denied
        .mockResolvedValueOnce(new MockMediaStream([new MockMediaStreamTrack('audio')])); // Audio allowed

      const permissions = await videoRoomService.requestMediaPermissions({
        video: true,
        audio: true,
        fallbackToAudioOnly: true
      });

      expect(permissions).toEqual({
        camera: false,
        microphone: true,
        screen: false
      });
    });

    test('should throw error when both permissions denied and no fallback', async () => {
      mockGetUserMedia.mockRejectedValue(new Error('NotAllowedError'));

      await expect(
        videoRoomService.requestMediaPermissions({
          video: true,
          audio: true,
          fallbackToAudioOnly: false
        })
      ).rejects.toThrow('Both camera and microphone permissions denied');
    });

    test('should handle different permission error types', async () => {
      const errorHandler = jest.fn();
      videoRoomService.on('permissionError', errorHandler);

      mockGetUserMedia.mockRejectedValueOnce({ name: 'NotFoundError' });

      await videoRoomService.requestMediaPermissions({ video: true, audio: false });

      expect(errorHandler).toHaveBeenCalledWith({
        deviceType: 'camera',
        message: 'No camera device found. Please connect a camera and try again.',
        error: { name: 'NotFoundError' }
      });
    });
  });

  describe('Device Management', () => {
    test('should enumerate available devices', async () => {
      const devices = await videoRoomService.enumerateDevices();

      expect(devices).toEqual({
        cameras: [{ deviceId: 'camera1', kind: 'videoinput', label: 'Camera 1' }],
        microphones: [{ deviceId: 'mic1', kind: 'audioinput', label: 'Microphone 1' }],
        speakers: [{ deviceId: 'speaker1', kind: 'audiooutput', label: 'Speaker 1' }]
      });
    });

    test('should handle device enumeration failure gracefully', async () => {
      mockEnumerateDevices.mockRejectedValue(new Error('Device access denied'));

      const devices = await videoRoomService.enumerateDevices();

      expect(devices).toEqual({
        cameras: [],
        microphones: [],
        speakers: []
      });
    });

    test('should switch camera device', async () => {
      // Mock WebRTC manager methods
      const mockReplaceVideoTrack = jest.fn();
      (videoRoomService as any).webRTCManager.replaceVideoTrack = mockReplaceVideoTrack;
      (videoRoomService as any).currentRoomId = 'test-room';
      (videoRoomService as any).currentUserId = 'test-user';

      const deviceSwitchedHandler = jest.fn();
      videoRoomService.on('deviceSwitched', deviceSwitchedHandler);

      await videoRoomService.switchCamera('camera2');

      expect(mockGetUserMedia).toHaveBeenCalledWith({
        video: { deviceId: { exact: 'camera2' } },
        audio: false
      });
      
      expect(mockReplaceVideoTrack).toHaveBeenCalled();
      expect(deviceSwitchedHandler).toHaveBeenCalledWith({
        type: 'camera',
        deviceId: 'camera2'
      });
    });
  });

  describe('Optimized Room Management', () => {
    test('should create room with validation', async () => {
      const { set } = require('firebase/database');
      set.mockResolvedValue(undefined);

      const roomId = await videoRoomService.createVideoRoom(
        'Test Room',
        'host123',
        'Host User',
        { maxParticipants: 5, isPrivate: true, password: 'secret123' }
      );

      expect(roomId).toBe('test-room-id');
      expect(set).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          name: 'Test Room',
          hostId: 'host123',
          hostName: 'Host User',
          maxParticipants: 5,
          isPrivate: true,
          password: 'secret123'
        })
      );
    });

    test('should validate room creation inputs', async () => {
      await expect(
        videoRoomService.createVideoRoom('', 'host123', 'Host User')
      ).rejects.toThrow('Room name is required');

      await expect(
        videoRoomService.createVideoRoom('A'.repeat(101), 'host123', 'Host User')
      ).rejects.toThrow('Room name must be 100 characters or less');

      await expect(
        videoRoomService.createVideoRoom('Test', '', 'Host User')
      ).rejects.toThrow('Host ID and name are required');
    });

    test('should validate private room password requirement', async () => {
      await expect(
        videoRoomService.createVideoRoom('Test Room', 'host123', 'Host User', {
          isPrivate: true
          // No password provided
        })
      ).rejects.toThrow('Password is required for private rooms');
    });

    test('should validate room access', async () => {
      const { get } = require('firebase/database');
      
      // Mock room data
      get.mockResolvedValue({
        exists: () => true,
        val: () => ({
          name: 'Test Room',
          isPrivate: true,
          password: 'secret123',
          maxParticipants: 5,
          participants: []
        }),
        key: 'test-room-id'
      });

      // Valid access
      const validResult = await videoRoomService.validateRoomAccess('test-room-id', 'secret123');
      expect(validResult.valid).toBe(true);
      expect(validResult.room).toBeDefined();

      // Invalid password
      const invalidResult = await videoRoomService.validateRoomAccess('test-room-id', 'wrong-password');
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.error).toBe('Invalid password');
    });

    test('should handle room capacity validation', async () => {
      const { get } = require('firebase/database');
      
      // Mock full room
      get.mockResolvedValue({
        exists: () => true,
        val: () => ({
          name: 'Full Room',
          maxParticipants: 2,
          participants: [
            { userId: 'user1', username: 'User 1' },
            { userId: 'user2', username: 'User 2' }
          ]
        }),
        key: 'full-room-id'
      });

      const result = await videoRoomService.validateRoomAccess('full-room-id');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Room is full');
    });
  });

  describe('Enhanced Media Controls', () => {
    beforeEach(() => {
      // Setup room and user context
      (videoRoomService as any).currentRoomId = 'test-room';
      (videoRoomService as any).currentUserId = 'test-user';
      
      // Mock room data
      const { get } = require('firebase/database');
      get.mockResolvedValue({
        exists: () => true,
        val: () => ({
          participants: [
            { userId: 'test-user', username: 'Test User', isCameraOn: false, isMicOn: true }
          ]
        }),
        key: 'test-room'
      });
    });

    test('should toggle camera with permission check', async () => {
      const { update } = require('firebase/database');
      update.mockResolvedValue(undefined);

      const mockInitializeLocalStream = jest.fn();
      (videoRoomService as any).webRTCManager.initializeLocalStream = mockInitializeLocalStream;

      const cameraToggledHandler = jest.fn();
      videoRoomService.on('cameraToggled', cameraToggledHandler);

      await videoRoomService.toggleCamera('test-room', 'test-user');

      expect(mockGetUserMedia).toHaveBeenCalledWith({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        }
      });
      
      expect(mockInitializeLocalStream).toHaveBeenCalledWith({
        video: true,
        audio: true
      });

      expect(cameraToggledHandler).toHaveBeenCalledWith({
        roomId: 'test-room',
        userId: 'test-user',
        isOn: true
      });
    });

    test('should handle camera toggle failure gracefully', async () => {
      mockGetUserMedia.mockRejectedValue(new Error('Camera access denied'));

      const errorHandler = jest.fn();
      videoRoomService.on('error', errorHandler);

      await expect(
        videoRoomService.toggleCamera('test-room', 'test-user')
      ).rejects.toThrow('Failed to toggle camera');

      expect(errorHandler).toHaveBeenCalledWith({
        type: 'permission-denied',
        message: 'Failed to toggle camera'
      });
    });
  });

  describe('Connection State Management', () => {
    test('should provide connection state information', () => {
      (videoRoomService as any).currentRoomId = 'test-room';
      (videoRoomService as any).currentUserId = 'test-user';
      
      const mockGetConnectedPeers = jest.fn().mockReturnValue(['peer1', 'peer2']);
      (videoRoomService as any).webRTCManager.getConnectedPeers = mockGetConnectedPeers;

      const state = videoRoomService.getConnectionState();

      expect(state).toEqual({
        isConnected: true,
        roomId: 'test-room',
        userId: 'test-user',
        participantCount: 3, // 2 peers + current user
        connectionQuality: 'good'
      });
    });

    test('should handle connection failure recovery', async () => {
      (videoRoomService as any).currentRoomId = 'test-room';
      
      const mockCreatePeerConnection = jest.fn();
      (videoRoomService as any).webRTCManager.createPeerConnection = mockCreatePeerConnection;
      
      const { get } = require('firebase/database');
      get.mockResolvedValue({
        exists: () => true,
        val: () => ({
          participants: [{ userId: 'failed-user', username: 'Failed User' }]
        })
      });

      const recoveryAttemptHandler = jest.fn();
      videoRoomService.on('connectionRecoveryAttempt', recoveryAttemptHandler);

      await videoRoomService.handleConnectionFailure('failed-user', 'network-timeout');

      expect(mockCreatePeerConnection).toHaveBeenCalledWith('failed-user', true);
      expect(recoveryAttemptHandler).toHaveBeenCalledWith({
        userId: 'failed-user',
        reason: 'network-timeout'
      });
    });
  });

  describe('Room Settings Management', () => {
    test('should update room settings with validation', async () => {
      const { get, update } = require('firebase/database');
      
      get.mockResolvedValue({
        exists: () => true,
        val: () => ({
          name: 'Test Room',
          maxParticipants: 5,
          participants: [{ userId: 'user1' }]
        })
      });
      
      update.mockResolvedValue(undefined);

      const settingsUpdatedHandler = jest.fn();
      videoRoomService.on('roomSettingsUpdated', settingsUpdatedHandler);

      await videoRoomService.updateRoomSettings('test-room', {
        maxParticipants: 8,
        aiModerationEnabled: true
      });

      expect(update).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          maxParticipants: 8,
          aiModerationEnabled: true,
          lastActivity: expect.any(Number)
        })
      );

      expect(settingsUpdatedHandler).toHaveBeenCalledWith({
        roomId: 'test-room',
        settings: {
          maxParticipants: 8,
          aiModerationEnabled: true
        }
      });
    });

    test('should validate room settings constraints', async () => {
      const { get } = require('firebase/database');
      
      get.mockResolvedValue({
        exists: () => true,
        val: () => ({
          participants: [{ userId: 'user1' }, { userId: 'user2' }, { userId: 'user3' }]
        })
      });

      // Cannot reduce capacity below current participant count
      await expect(
        videoRoomService.updateRoomSettings('test-room', { maxParticipants: 2 })
      ).rejects.toThrow('Cannot reduce capacity below current participant count');

      // Invalid capacity range
      await expect(
        videoRoomService.updateRoomSettings('test-room', { maxParticipants: 15 })
      ).rejects.toThrow('Max participants must be between 2 and 10');
    });
  });
});