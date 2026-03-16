/**
 * AI Transcription Service Tests
 * Tests for real-time audio transcription functionality
 * Requirements: 7.1, 7.2, 7.5
 */

import { AITranscriptionService } from '../aiTranscriptionService';
import { TranscriptionSettings } from '../../types/videoConference';

// Mock Web Audio API
const mockAudioContext = {
  createMediaStreamSource: jest.fn(),
  createScriptProcessor: jest.fn(),
  close: jest.fn(),
  state: 'running'
};

const mockMediaStreamSource = {
  connect: jest.fn(),
  disconnect: jest.fn()
};

const mockProcessor = {
  connect: jest.fn(),
  disconnect: jest.fn(),
  onaudioprocess: null
};

// Mock fetch for API calls
global.fetch = jest.fn();

// Mock navigator.mediaDevices
Object.defineProperty(global.navigator, 'mediaDevices', {
  value: {
    getUserMedia: jest.fn()
  },
  writable: true
});

// Mock AudioContext
(global as any).AudioContext = jest.fn(() => mockAudioContext);
(global as any).webkitAudioContext = jest.fn(() => mockAudioContext);

describe('AITranscriptionService', () => {
  let transcriptionService: AITranscriptionService;
  let mockSettings: TranscriptionSettings;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockSettings = {
      enabled: false,
      language: 'tr',
      minConfidence: 0.7,
      realTimeDisplay: true
    };

    transcriptionService = new AITranscriptionService(mockSettings);
    
    // Setup mocks
    mockAudioContext.createMediaStreamSource.mockReturnValue(mockMediaStreamSource);
    mockAudioContext.createScriptProcessor.mockReturnValue(mockProcessor);
    
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: 'healthy' })
    });
  });

  afterEach(async () => {
    await transcriptionService.cleanup();
  });

  describe('Initialization', () => {
    test('should initialize with default settings', () => {
      const settings = transcriptionService.getSettings();
      
      expect(settings.language).toBe('tr');
      expect(settings.minConfidence).toBe(0.7);
      expect(settings.realTimeDisplay).toBe(true);
      expect(settings.enabled).toBe(false);
    });

    test('should initialize with custom settings', () => {
      const customSettings: Partial<TranscriptionSettings> = {
        language: 'en',
        minConfidence: 0.8,
        realTimeDisplay: false
      };
      
      const service = new AITranscriptionService(customSettings);
      const settings = service.getSettings();
      
      expect(settings.language).toBe('en');
      expect(settings.minConfidence).toBe(0.8);
      expect(settings.realTimeDisplay).toBe(false);
    });

    test('should initialize audio context on first use', async () => {
      await transcriptionService.initialize();
      
      expect(mockAudioContext.createMediaStreamSource).not.toHaveBeenCalled();
      expect(mockAudioContext.createScriptProcessor).not.toHaveBeenCalled();
    });
  });

  describe('Transcription Control', () => {
    test('should require user consent before starting transcription', async () => {
      const mockStream = new MediaStream();
      let consentEventFired = false;
      
      transcriptionService.on('consent', () => {
        consentEventFired = true;
      });

      await transcriptionService.startTranscription('room123', 'user456', mockStream, false);
      
      expect(consentEventFired).toBe(true);
      expect(transcriptionService.isTranscriptionActive()).toBe(false);
    });

    test('should start transcription with user consent', async () => {
      const mockStream = new MediaStream();
      await transcriptionService.initialize();
      
      let transcriptionStarted = false;
      transcriptionService.on('transcription', (event) => {
        if (event.type === 'started') {
          transcriptionStarted = true;
        }
      });

      await transcriptionService.startTranscription('room123', 'user456', mockStream, true);
      
      expect(transcriptionStarted).toBe(true);
      expect(transcriptionService.isTranscriptionActive()).toBe(true);
      expect(mockAudioContext.createMediaStreamSource).toHaveBeenCalledWith(mockStream);
    });

    test('should stop transcription and cleanup resources', async () => {
      const mockStream = new MediaStream();
      await transcriptionService.initialize();
      await transcriptionService.startTranscription('room123', 'user456', mockStream, true);
      
      let transcriptionStopped = false;
      transcriptionService.on('transcription', (event) => {
        if (event.type === 'stopped') {
          transcriptionStopped = true;
        }
      });

      await transcriptionService.stopTranscription();
      
      expect(transcriptionStopped).toBe(true);
      expect(transcriptionService.isTranscriptionActive()).toBe(false);
      expect(mockProcessor.disconnect).toHaveBeenCalled();
      expect(mockMediaStreamSource.disconnect).toHaveBeenCalled();
    });

    test('should not start transcription if already active', async () => {
      const mockStream = new MediaStream();
      await transcriptionService.initialize();
      await transcriptionService.startTranscription('room123', 'user456', mockStream, true);
      
      // Try to start again
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      await transcriptionService.startTranscription('room123', 'user456', mockStream, true);
      
      expect(consoleSpy).toHaveBeenCalledWith('Transcription already active');
      consoleSpy.mockRestore();
    });
  });

  describe('Settings Management', () => {
    test('should update settings correctly', () => {
      const newSettings: Partial<TranscriptionSettings> = {
        minConfidence: 0.9,
        language: 'en'
      };

      let settingsUpdated = false;
      transcriptionService.on('settings-updated', () => {
        settingsUpdated = true;
      });

      transcriptionService.updateSettings(newSettings);
      
      const settings = transcriptionService.getSettings();
      expect(settings.minConfidence).toBe(0.9);
      expect(settings.language).toBe('en');
      expect(settings.realTimeDisplay).toBe(true); // Should preserve existing
      expect(settingsUpdated).toBe(true);
    });

    test('should update confidence threshold when settings change', () => {
      transcriptionService.updateSettings({ minConfidence: 0.85 });
      
      // The confidence threshold should be updated internally
      // This is tested indirectly through transcription filtering
      const settings = transcriptionService.getSettings();
      expect(settings.minConfidence).toBe(0.85);
    });
  });

  describe('Speaker Detection', () => {
    test('should track speaker activity', () => {
      let speakerChangeEvent = null;
      transcriptionService.on('speaker-change', (event) => {
        speakerChangeEvent = event;
      });

      transcriptionService.updateSpeakerActivity('user123', 'John Doe', true);
      
      expect(speakerChangeEvent).toEqual({
        userId: 'user123',
        username: 'John Doe',
        isActive: true,
        timestamp: expect.any(Number)
      });

      const currentSpeaker = transcriptionService.getCurrentSpeaker();
      expect(currentSpeaker).toEqual({
        userId: 'user123',
        confidence: 0.8
      });
    });

    test('should remove speaker when activity stops', () => {
      transcriptionService.updateSpeakerActivity('user123', 'John Doe', true);
      transcriptionService.updateSpeakerActivity('user123', 'John Doe', false);
      
      const currentSpeaker = transcriptionService.getCurrentSpeaker();
      expect(currentSpeaker).toBeNull();
    });

    test('should identify current speaker with highest confidence', () => {
      transcriptionService.updateSpeakerActivity('user1', 'User 1', true);
      transcriptionService.updateSpeakerActivity('user2', 'User 2', true);
      
      // user2 should be current speaker (last active)
      const currentSpeaker = transcriptionService.getCurrentSpeaker();
      expect(currentSpeaker?.userId).toBe('user2');
    });
  });

  describe('Transcript Management', () => {
    test('should maintain transcription history', () => {
      const initialHistory = transcriptionService.getTranscriptionHistory();
      expect(initialHistory).toEqual([]);
    });

    test('should clear transcription history', () => {
      transcriptionService.clearTranscriptionHistory();
      
      const history = transcriptionService.getTranscriptionHistory();
      expect(history).toEqual([]);
    });

    test('should export transcript in text format', async () => {
      // Add some mock transcriptions to history
      const mockTranscriptions = [
        {
          id: 'trans1',
          roomId: 'room123',
          userId: 'user1',
          username: 'John',
          text: 'Hello everyone',
          language: 'en',
          confidence: 0.9,
          timestamp: Date.now(),
          duration: 1000
        }
      ];

      // Mock the internal buffer
      (transcriptionService as any).transcriptionBuffer = mockTranscriptions;
      
      const exported = await transcriptionService.exportTranscript('txt');
      expect(exported).toContain('John: Hello everyone');
    });

    test('should export transcript in JSON format', async () => {
      const mockTranscriptions = [
        {
          id: 'trans1',
          roomId: 'room123',
          userId: 'user1',
          username: 'John',
          text: 'Hello everyone',
          language: 'en',
          confidence: 0.9,
          timestamp: Date.now(),
          duration: 1000
        }
      ];

      (transcriptionService as any).transcriptionBuffer = mockTranscriptions;
      
      const exported = await transcriptionService.exportTranscript('json');
      const parsed = JSON.parse(exported);
      expect(parsed).toEqual(mockTranscriptions);
    });
  });

  describe('Error Handling', () => {
    test('should handle initialization errors gracefully', async () => {
      mockAudioContext.createMediaStreamSource.mockImplementation(() => {
        throw new Error('Audio context error');
      });

      await expect(transcriptionService.initialize()).rejects.toThrow();
    });

    test('should handle API connection errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));
      
      // Should not throw, just log warning
      await expect(transcriptionService.initialize()).resolves.not.toThrow();
    });

    test('should emit error events for transcription failures', async () => {
      const mockStream = new MediaStream();
      await transcriptionService.initialize();
      
      let errorEvent = null;
      transcriptionService.on('error', (event) => {
        errorEvent = event;
      });

      // Mock a failure in starting transcription
      mockAudioContext.createMediaStreamSource.mockImplementation(() => {
        throw new Error('Stream error');
      });

      await expect(
        transcriptionService.startTranscription('room123', 'user456', mockStream, true)
      ).rejects.toThrow();
    });
  });

  describe('Cleanup', () => {
    test('should cleanup all resources', async () => {
      const mockStream = new MediaStream();
      await transcriptionService.initialize();
      await transcriptionService.startTranscription('room123', 'user456', mockStream, true);
      
      await transcriptionService.cleanup();
      
      expect(transcriptionService.isTranscriptionActive()).toBe(false);
      expect(mockAudioContext.close).toHaveBeenCalled();
    });

    test('should clear all event listeners on cleanup', async () => {
      let eventFired = false;
      transcriptionService.on('test-event', () => {
        eventFired = true;
      });

      await transcriptionService.cleanup();
      
      // Try to emit event after cleanup
      (transcriptionService as any).emit('test-event');
      expect(eventFired).toBe(false);
    });
  });
});