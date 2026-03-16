/**
 * Task 4 Integration Test - Video Room Service Optimizations
 * Quick integration test for room management and media permissions
 */

import { VideoRoomService } from '../videoRoomService';

// Mock Firebase
jest.mock('../../firebase', () => ({ db: {} }));
jest.mock('firebase/database', () => ({
  ref: jest.fn(),
  set: jest.fn().mockResolvedValue(undefined),
  get: jest.fn().mockResolvedValue({
    exists: () => true,
    val: () => ({ participants: [], maxParticipants: 10, isPrivate: false }),
    key: 'test-room'
  }),
  push: jest.fn(() => ({ key: 'test-room-id' })),
  update: jest.fn().mockResolvedValue(undefined),
  remove: jest.fn(),
  onValue: jest.fn(),
  off: jest.fn()
}));

// Mock WebRTC
Object.defineProperty(global.navigator, 'mediaDevices', {
  value: {
    getUserMedia: jest.fn().mockResolvedValue({
      getTracks: () => [{ stop: jest.fn() }],
      getVideoTracks: () => [{ kind: 'video' }],
      getAudioTracks: () => [{ kind: 'audio' }]
    }),
    enumerateDevices: jest.fn().mockResolvedValue([])
  }
});

describe('Task 4 - Video Room Service Integration', () => {
  let service: VideoRoomService;

  beforeEach(() => {
    service = new VideoRoomService();
  });

  test('should create room with optimized validation', async () => {
    const roomId = await service.createVideoRoom(
      'Test Room',
      'host123',
      'Host User',
      { maxParticipants: 5 }
    );
    
    expect(roomId).toBe('test-room-id');
  });

  test('should request media permissions with fallback', async () => {
    const permissions = await service.requestMediaPermissions({
      video: true,
      audio: true,
      fallbackToAudioOnly: true
    });
    
    expect(permissions).toHaveProperty('camera');
    expect(permissions).toHaveProperty('microphone');
  });

  test('should validate room access', async () => {
    const result = await service.validateRoomAccess('test-room');
    expect(result.valid).toBe(true);
  });
});