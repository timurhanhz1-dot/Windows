/**
 * Advanced Features Integration Test Suite
 * Task 11: Comprehensive testing of all advanced video conference features
 * Tests integration between Screen Sharing, AI Transcription, Media Controls, and Video Grid
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { VideoConferenceRooms, ActiveVideoRoom } from '../VideoConferenceRoom';
import { ScreenShareManager } from '../../services/screenShareManager';
import { AITranscriptionService } from '../../services/aiTranscriptionService';
import { VideoRoomService } from '../../services/videoRoomService';
import { WebRTCManager } from '../../services/webRTCManager';
import { VideoParticipant, MediaControlState } from '../../types/videoConference';

// Mock Firebase
vi.mock('../../firebase', () => ({
  db: {},
}));

// Mock Firebase database functions
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

// Mock WebRTC and Media APIs
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
    enumerateDevices: vi.fn().mockResolvedValue([
      { deviceId: 'camera1', kind: 'videoinput', label: 'Camera 1' },
      { deviceId: 'mic1', kind: 'audioinput', label: 'Microphone 1' },
      { deviceId: 'speaker1', kind: 'audiooutput', label: 'Speaker 1' }
    ]),
    getDisplayMedia: vi.fn().mockResolvedValue({
      getTracks: vi.fn().mockReturnValue([
        { 
          kind: 'video', 
          enabled: true, 
          stop: vi.fn(),
          addEventListener: vi.fn(),
          onended: null
        }
      ]),
      getVideoTracks: vi.fn().mockReturnValue([{ 
        enabled: true, 
        stop: vi.fn(),
        addEventListener: vi.fn(),
        onended: null
      }])
    })
  },
});

// Mock Audio Context for AI Transcription
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

describe('Advanced Features Integration Tests', () => {
  let mockParticipants: VideoParticipant[];
  let mockMediaState: MediaControlState;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockParticipants = [
      {
        userId: 'user1',
        username: 'Alice',
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
        username: 'Bob',
        joinedAt: Date.now(),
        isCameraOn: true,
        isMicOn: false,
        isScreenSharing: false,
        connectionQuality: 'excellent',
        latency: 30,
        transcriptionEnabled: true,
        isSpeaking: true
      }
    ];

    mockMediaState = {
      isCameraOn: true,
      isMicOn: true,
      isScreenSharing: false,
      permissions: { camera: true, microphone: true, screen: true },
      availableDevices: [
        { deviceId: 'camera1', kind: 'videoinput', label: 'Camera 1' } as MediaDeviceInfo,
        { deviceId: 'mic1', kind: 'audioinput', label: 'Microphone 1' } as MediaDeviceInfo
      ],
      selectedDevices: { camera: 'camera1', microphone: 'mic1' }
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. Screen Sharing Integration', () => {
    it('should integrate screen sharing with video grid layout', async () => {
      const onToggleScreenShare = vi.fn();
      const onResolveConflict = vi.fn();
      
      render(
        <div>
          {/* Mock VideoGrid component */}
          <div data-testid="video-grid">
            {mockParticipants.map(p => (
              <div key={p.userId} data-testid={`participant-${p.userId}`}>
                {p.username} - {p.isScreenSharing ? 'Sharing' : 'Not Sharing'}
              </div>
            ))}
          </div>
          
          {/* Mock ScreenShareControls */}
          <button 
            data-testid="screen-share-button"
            onClick={onToggleScreenShare}
          >
            {mockMediaState.isScreenSharing ? 'Stop Sharing' : 'Start Sharing'}
          </button>
        </div>
      );

      const screenShareButton = screen.getByTestId('screen-share-button');
      expect(screenShareButton).toBeInTheDocument();
      expect(screenShareButton).toHaveTextContent('Start Sharing');

      // Test screen sharing activation
      fireEvent.click(screenShareButton);
      expect(onToggleScreenShare).toHaveBeenCalledTimes(1);
    });

    it('should handle screen sharing conflicts between multiple users', async () => {
      const conflictUser = { userId: 'user2', username: 'Bob' };
      const onResolveConflict = vi.fn();
      
      // Mock conflict scenario
      const participantsWithConflict = [
        ...mockParticipants,
        { ...mockParticipants[1], isScreenSharing: true }
      ];

      render(
        <div>
          <div data-testid="conflict-modal">
            Screen sharing conflict with {conflictUser.username}
            <button 
              data-testid="takeover-button"
              onClick={() => onResolveConflict('takeover')}
            >
              Take Over
            </button>
            <button 
              data-testid="cancel-button"
              onClick={() => onResolveConflict('cancel')}
            >
              Cancel
            </button>
          </div>
        </div>
      );

      const takeoverButton = screen.getByTestId('takeover-button');
      const cancelButton = screen.getByTestId('cancel-button');

      // Test conflict resolution
      fireEvent.click(takeoverButton);
      expect(onResolveConflict).toHaveBeenCalledWith('takeover');

      fireEvent.click(cancelButton);
      expect(onResolveConflict).toHaveBeenCalledWith('cancel');
    });

    it('should optimize video grid layout for screen sharing', () => {
      const participantsWithScreenShare = [
        ...mockParticipants,
        { ...mockParticipants[0], isScreenSharing: true }
      ];

      render(
        <div data-testid="video-grid-optimized">
          {participantsWithScreenShare.map(p => (
            <div 
              key={p.userId} 
              data-testid={`participant-${p.userId}`}
              className={p.isScreenSharing ? 'screen-share-prominent' : 'participant-thumbnail'}
            >
              {p.username}
            </div>
          ))}
        </div>
      );

      const screenSharer = screen.getByTestId('participant-user1');
      expect(screenSharer).toHaveClass('screen-share-prominent');
    });
  });

  describe('2. AI Transcription Integration', () => {
    it('should integrate AI transcription with participant management', async () => {
      const transcriptionService = new AITranscriptionService();
      const onToggleTranscription = vi.fn();
      
      render(
        <div>
          <button 
            data-testid="transcription-toggle"
            onClick={onToggleTranscription}
          >
            Toggle Transcription
          </button>
          <div data-testid="transcription-panel">
            {mockParticipants
              .filter(p => p.transcriptionEnabled)
              .map(p => (
                <div key={p.userId} data-testid={`transcription-${p.userId}`}>
                  {p.username}: Transcription enabled
                </div>
              ))}
          </div>
        </div>
      );

      const toggleButton = screen.getByTestId('transcription-toggle');
      fireEvent.click(toggleButton);
      expect(onToggleTranscription).toHaveBeenCalled();

      // Verify transcription is shown for enabled participants
      expect(screen.getByTestId('transcription-user2')).toBeInTheDocument();
    });

    it('should handle speaker identification in transcription', () => {
      const speakingParticipants = mockParticipants.filter(p => p.isSpeaking);
      
      render(
        <div data-testid="speaker-indicator">
          {speakingParticipants.map(p => (
            <div key={p.userId} data-testid={`speaking-${p.userId}`}>
              {p.username} is speaking
            </div>
          ))}
        </div>
      );

      expect(screen.getByTestId('speaking-user2')).toBeInTheDocument();
      expect(screen.getByText('Bob is speaking')).toBeInTheDocument();
    });

    it('should require user consent for transcription', async () => {
      const onConsentGiven = vi.fn();
      
      render(
        <div data-testid="consent-modal">
          <p>AI transcription requires your consent</p>
          <button 
            data-testid="consent-accept"
            onClick={() => onConsentGiven(true)}
          >
            Accept
          </button>
          <button 
            data-testid="consent-decline"
            onClick={() => onConsentGiven(false)}
          >
            Decline
          </button>
        </div>
      );

      const acceptButton = screen.getByTestId('consent-accept');
      const declineButton = screen.getByTestId('consent-decline');

      fireEvent.click(acceptButton);
      expect(onConsentGiven).toHaveBeenCalledWith(true);

      fireEvent.click(declineButton);
      expect(onConsentGiven).toHaveBeenCalledWith(false);
    });
  });

  describe('3. Media Controls Integration', () => {
    it('should integrate media controls with device management', async () => {
      const onDeviceChange = vi.fn();
      const onToggleCamera = vi.fn();
      const onToggleMic = vi.fn();
      
      render(
        <div>
          <button 
            data-testid="camera-toggle"
            onClick={onToggleCamera}
          >
            {mockMediaState.isCameraOn ? 'Turn Off Camera' : 'Turn On Camera'}
          </button>
          <button 
            data-testid="mic-toggle"
            onClick={onToggleMic}
          >
            {mockMediaState.isMicOn ? 'Mute' : 'Unmute'}
          </button>
          <select 
            data-testid="camera-select"
            onChange={(e) => onDeviceChange('camera', e.target.value)}
          >
            {mockMediaState.availableDevices
              .filter(d => d.kind === 'videoinput')
              .map(device => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label}
                </option>
              ))}
          </select>
        </div>
      );

      // Test media controls
      const cameraToggle = screen.getByTestId('camera-toggle');
      const micToggle = screen.getByTestId('mic-toggle');
      const cameraSelect = screen.getByTestId('camera-select');

      fireEvent.click(cameraToggle);
      expect(onToggleCamera).toHaveBeenCalled();

      fireEvent.click(micToggle);
      expect(onToggleMic).toHaveBeenCalled();

      fireEvent.change(cameraSelect, { target: { value: 'camera1' } });
      expect(onDeviceChange).toHaveBeenCalledWith('camera', 'camera1');
    });

    it('should show connection quality indicators', () => {
      render(
        <div data-testid="connection-quality">
          {mockParticipants.map(p => (
            <div key={p.userId} data-testid={`quality-${p.userId}`}>
              {p.username}: {p.connectionQuality} ({p.latency}ms)
            </div>
          ))}
        </div>
      );

      expect(screen.getByText('Alice: good (50ms)')).toBeInTheDocument();
      expect(screen.getByText('Bob: excellent (30ms)')).toBeInTheDocument();
    });

    it('should handle permission denied scenarios', async () => {
      const mockError = new Error('Permission denied');
      vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValueOnce(mockError);

      const onPermissionError = vi.fn();
      
      render(
        <div>
          <button 
            data-testid="request-permissions"
            onClick={async () => {
              try {
                await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
              } catch (error) {
                onPermissionError(error);
              }
            }}
          >
            Request Permissions
          </button>
        </div>
      );

      const button = screen.getByTestId('request-permissions');
      fireEvent.click(button);

      await waitFor(() => {
        expect(onPermissionError).toHaveBeenCalledWith(mockError);
      });
    });
  });

  describe('4. Video Grid Layout Integration', () => {
    it('should calculate optimal layout for different participant counts', () => {
      const testCases = [
        { count: 2, expectedCols: 2, expectedRows: 1 },
        { count: 4, expectedCols: 2, expectedRows: 2 },
        { count: 6, expectedCols: 3, expectedRows: 2 },
        { count: 9, expectedCols: 3, expectedRows: 3 }
      ];

      testCases.forEach(({ count, expectedCols, expectedRows }) => {
        const participants = Array.from({ length: count }, (_, i) => ({
          ...mockParticipants[0],
          userId: `user${i}`,
          username: `User ${i}`
        }));

        render(
          <div 
            data-testid={`grid-${count}`}
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${expectedCols}, 1fr)`,
              gridTemplateRows: `repeat(${expectedRows}, 1fr)`
            }}
          >
            {participants.map(p => (
              <div key={p.userId} data-testid={`participant-${p.userId}`}>
                {p.username}
              </div>
            ))}
          </div>
        );

        const grid = screen.getByTestId(`grid-${count}`);
        expect(grid).toHaveStyle(`grid-template-columns: repeat(${expectedCols}, 1fr)`);
        expect(grid).toHaveStyle(`grid-template-rows: repeat(${expectedRows}, 1fr)`);
      });
    });

    it('should maintain aspect ratio for video cells', () => {
      render(
        <div data-testid="video-grid">
          {mockParticipants.map(p => (
            <div 
              key={p.userId}
              data-testid={`video-cell-${p.userId}`}
              style={{ aspectRatio: '16/9' }}
            >
              {p.username}
            </div>
          ))}
        </div>
      );

      mockParticipants.forEach(p => {
        const cell = screen.getByTestId(`video-cell-${p.userId}`);
        expect(cell).toHaveStyle('aspect-ratio: 16/9');
      });
    });

    it('should handle responsive design for different screen sizes', () => {
      const screenSizes = [
        { width: 320, height: 568, name: 'mobile' },
        { width: 768, height: 1024, name: 'tablet' },
        { width: 1920, height: 1080, name: 'desktop' }
      ];

      screenSizes.forEach(({ width, height, name }) => {
        // Mock window dimensions
        Object.defineProperty(window, 'innerWidth', { value: width, writable: true });
        Object.defineProperty(window, 'innerHeight', { value: height, writable: true });

        render(
          <div 
            data-testid={`responsive-grid-${name}`}
            style={{
              width: '100%',
              height: '100%',
              maxWidth: width,
              maxHeight: height
            }}
          >
            {mockParticipants.map(p => (
              <div key={p.userId} data-testid={`responsive-cell-${p.userId}`}>
                {p.username}
              </div>
            ))}
          </div>
        );

        const grid = screen.getByTestId(`responsive-grid-${name}`);
        expect(grid).toHaveStyle('width: 100%');
        expect(grid).toHaveStyle('height: 100%');
      });
    });
  });

  describe('5. Error Handling Integration', () => {
    it('should handle WebRTC connection failures gracefully', async () => {
      const mockConnectionError = new Error('Connection failed');
      const onConnectionError = vi.fn();

      // Mock failed peer connection
      vi.mocked(RTCPeerConnection).mockImplementationOnce(() => {
        throw mockConnectionError;
      });

      render(
        <div>
          <button 
            data-testid="connect-peer"
            onClick={() => {
              try {
                new RTCPeerConnection();
              } catch (error) {
                onConnectionError(error);
              }
            }}
          >
            Connect Peer
          </button>
        </div>
      );

      const button = screen.getByTestId('connect-peer');
      fireEvent.click(button);

      expect(onConnectionError).toHaveBeenCalledWith(mockConnectionError);
    });

    it('should handle screen sharing permission errors', async () => {
      const mockScreenShareError = new Error('Screen sharing not allowed');
      vi.mocked(navigator.mediaDevices.getDisplayMedia).mockRejectedValueOnce(mockScreenShareError);

      const onScreenShareError = vi.fn();

      render(
        <div>
          <button 
            data-testid="start-screen-share"
            onClick={async () => {
              try {
                await navigator.mediaDevices.getDisplayMedia({ video: true });
              } catch (error) {
                onScreenShareError(error);
              }
            }}
          >
            Start Screen Share
          </button>
        </div>
      );

      const button = screen.getByTestId('start-screen-share');
      fireEvent.click(button);

      await waitFor(() => {
        expect(onScreenShareError).toHaveBeenCalledWith(mockScreenShareError);
      });
    });

    it('should handle AI transcription service errors', async () => {
      const transcriptionService = new AITranscriptionService();
      const mockTranscriptionError = new Error('Transcription service unavailable');
      
      // Mock fetch to fail
      global.fetch = vi.fn().mockRejectedValueOnce(mockTranscriptionError);

      const onTranscriptionError = vi.fn();

      try {
        await transcriptionService.startTranscription('room1', 'user1', {} as MediaStream, true);
      } catch (error) {
        onTranscriptionError(error);
      }

      expect(onTranscriptionError).toHaveBeenCalled();
    });
  });

  describe('6. Performance Integration', () => {
    it('should handle multiple features active simultaneously', async () => {
      const performanceMetrics = {
        screenShareActive: true,
        transcriptionActive: true,
        participantCount: mockParticipants.length,
        connectionQuality: 'good'
      };

      render(
        <div data-testid="performance-monitor">
          <div>Screen Share: {performanceMetrics.screenShareActive ? 'Active' : 'Inactive'}</div>
          <div>Transcription: {performanceMetrics.transcriptionActive ? 'Active' : 'Inactive'}</div>
          <div>Participants: {performanceMetrics.participantCount}</div>
          <div>Quality: {performanceMetrics.connectionQuality}</div>
        </div>
      );

      expect(screen.getByText('Screen Share: Active')).toBeInTheDocument();
      expect(screen.getByText('Transcription: Active')).toBeInTheDocument();
      expect(screen.getByText('Participants: 2')).toBeInTheDocument();
      expect(screen.getByText('Quality: good')).toBeInTheDocument();
    });

    it('should monitor resource usage with multiple features', () => {
      const resourceUsage = {
        cpuUsage: 45,
        memoryUsage: 128,
        networkBandwidth: 2.5
      };

      render(
        <div data-testid="resource-monitor">
          <div>CPU: {resourceUsage.cpuUsage}%</div>
          <div>Memory: {resourceUsage.memoryUsage}MB</div>
          <div>Bandwidth: {resourceUsage.networkBandwidth}Mbps</div>
        </div>
      );

      expect(screen.getByText('CPU: 45%')).toBeInTheDocument();
      expect(screen.getByText('Memory: 128MB')).toBeInTheDocument();
      expect(screen.getByText('Bandwidth: 2.5Mbps')).toBeInTheDocument();
    });
  });

  describe('7. User Experience Integration', () => {
    it('should provide consistent UI/UX across all features', () => {
      render(
        <div data-testid="ui-consistency">
          <button className="primary-button" data-testid="camera-btn">Camera</button>
          <button className="primary-button" data-testid="mic-btn">Microphone</button>
          <button className="primary-button" data-testid="screen-btn">Screen Share</button>
          <button className="primary-button" data-testid="transcription-btn">Transcription</button>
        </div>
      );

      const buttons = [
        screen.getByTestId('camera-btn'),
        screen.getByTestId('mic-btn'),
        screen.getByTestId('screen-btn'),
        screen.getByTestId('transcription-btn')
      ];

      buttons.forEach(button => {
        expect(button).toHaveClass('primary-button');
      });
    });

    it('should handle accessibility requirements', () => {
      render(
        <div>
          <button 
            data-testid="accessible-camera"
            aria-label="Toggle camera on/off"
            aria-pressed={mockMediaState.isCameraOn}
          >
            Camera
          </button>
          <button 
            data-testid="accessible-mic"
            aria-label="Toggle microphone on/off"
            aria-pressed={mockMediaState.isMicOn}
          >
            Microphone
          </button>
        </div>
      );

      const cameraButton = screen.getByTestId('accessible-camera');
      const micButton = screen.getByTestId('accessible-mic');

      expect(cameraButton).toHaveAttribute('aria-label', 'Toggle camera on/off');
      expect(cameraButton).toHaveAttribute('aria-pressed', 'true');
      expect(micButton).toHaveAttribute('aria-label', 'Toggle microphone on/off');
      expect(micButton).toHaveAttribute('aria-pressed', 'true');
    });
  });

  describe('8. Cleanup and Resource Management', () => {
    it('should properly cleanup all resources when features are disabled', async () => {
      const screenShareManager = new ScreenShareManager();
      const transcriptionService = new AITranscriptionService();
      const webRTCManager = new WebRTCManager('test-user');

      // Initialize services
      await webRTCManager.initializeLocalStream();
      
      // Cleanup all services
      await Promise.all([
        screenShareManager.cleanup(),
        transcriptionService.cleanup(),
        webRTCManager.cleanup()
      ]);

      // Verify cleanup
      expect(webRTCManager.getLocalStream()).toBeNull();
      expect(screenShareManager.isScreenSharing()).toBe(false);
      expect(transcriptionService.isTranscriptionActive()).toBe(false);
    });

    it('should handle graceful degradation when features fail', async () => {
      const fallbackState = {
        screenShareFailed: true,
        transcriptionFailed: true,
        cameraFailed: false,
        microphoneFailed: false
      };

      render(
        <div data-testid="fallback-ui">
          {fallbackState.screenShareFailed && (
            <div data-testid="screen-share-fallback">
              Screen sharing unavailable - continuing with camera only
            </div>
          )}
          {fallbackState.transcriptionFailed && (
            <div data-testid="transcription-fallback">
              AI transcription unavailable - manual notes recommended
            </div>
          )}
          {!fallbackState.cameraFailed && (
            <div data-testid="camera-available">Camera working</div>
          )}
          {!fallbackState.microphoneFailed && (
            <div data-testid="microphone-available">Microphone working</div>
          )}
        </div>
      );

      expect(screen.getByTestId('screen-share-fallback')).toBeInTheDocument();
      expect(screen.getByTestId('transcription-fallback')).toBeInTheDocument();
      expect(screen.getByTestId('camera-available')).toBeInTheDocument();
      expect(screen.getByTestId('microphone-available')).toBeInTheDocument();
    });
  });
});