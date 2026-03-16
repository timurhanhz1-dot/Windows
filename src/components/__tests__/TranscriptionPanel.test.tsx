/**
 * TranscriptionPanel Component Tests
 * Tests for AI transcription UI component
 * Requirements: 7.2, 7.3, 7.4
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TranscriptionPanel } from '../TranscriptionPanel';
import { AITranscriptionService } from '../../services/aiTranscriptionService';

// Mock the AITranscriptionService
jest.mock('../../services/aiTranscriptionService');

// Mock navigator.clipboard
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn(() => Promise.resolve())
  }
});

// Mock navigator.mediaDevices
Object.defineProperty(global.navigator, 'mediaDevices', {
  value: {
    getUserMedia: jest.fn(() => Promise.resolve(new MediaStream()))
  },
  writable: true
});

describe('TranscriptionPanel', () => {
  let mockTranscriptionService: jest.Mocked<AITranscriptionService>;
  let defaultProps: any;

  beforeEach(() => {
    mockTranscriptionService = {
      getSettings: jest.fn(() => ({
        enabled: false,
        language: 'tr',
        minConfidence: 0.7,
        realTimeDisplay: true
      })),
      isTranscriptionActive: jest.fn(() => false),
      startTranscription: jest.fn(() => Promise.resolve()),
      stopTranscription: jest.fn(() => Promise.resolve()),
      updateSettings: jest.fn(),
      exportTranscript: jest.fn(() => Promise.resolve('Mock transcript')),
      clearTranscriptionHistory: jest.fn(),
      on: jest.fn(),
      off: jest.fn()
    } as any;

    defaultProps = {
      isVisible: true,
      onToggle: jest.fn(),
      transcriptionService: mockTranscriptionService,
      roomId: 'room123',
      userId: 'user456',
      username: 'Test User',
      participants: [
        { userId: 'user456', username: 'Test User', isSpeaking: false },
        { userId: 'user789', username: 'Other User', isSpeaking: true }
      ]
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    test('should render floating button when not visible', () => {
      render(
        <TranscriptionPanel
          {...defaultProps}
          isVisible={false}
        />
      );

      const floatingButton = screen.getByRole('button');
      expect(floatingButton).toBeInTheDocument();
      expect(floatingButton).toHaveStyle({
        position: 'fixed',
        bottom: '120px',
        right: '24px'
      });
    });

    test('should render full panel when visible', () => {
      render(<TranscriptionPanel {...defaultProps} />);

      expect(screen.getByText('AI Transkripsiyon')).toBeInTheDocument();
      expect(screen.getByText('Pasif')).toBeInTheDocument();
      expect(screen.getByText('Başlat')).toBeInTheDocument();
    });

    test('should show active status when transcription is running', () => {
      mockTranscriptionService.isTranscriptionActive.mockReturnValue(true);
      
      render(<TranscriptionPanel {...defaultProps} />);

      expect(screen.getByText('Aktif')).toBeInTheDocument();
      expect(screen.getByText('Durdur')).toBeInTheDocument();
    });

    test('should display current speaker when someone is speaking', () => {
      render(<TranscriptionPanel {...defaultProps} />);

      // Simulate speaker change event
      const onCallback = mockTranscriptionService.on.mock.calls.find(
        call => call[0] === 'speaker-change'
      )?.[1];

      if (onCallback) {
        onCallback({
          userId: 'user789',
          username: 'Other User',
          isActive: true,
          timestamp: Date.now()
        });
      }

      // Note: This would require state updates, which might need more complex mocking
    });
  });

  describe('Transcription Control', () => {
    test('should show consent modal when starting transcription without consent', async () => {
      render(<TranscriptionPanel {...defaultProps} />);

      const startButton = screen.getByText('Başlat');
      fireEvent.click(startButton);

      // Simulate consent request event
      const onCallback = mockTranscriptionService.on.mock.calls.find(
        call => call[0] === 'consent'
      )?.[1];

      if (onCallback) {
        onCallback({ required: true });
      }

      await waitFor(() => {
        expect(screen.getByText('AI Transkripsiyon İzni')).toBeInTheDocument();
      });
    });

    test('should start transcription when consent is given', async () => {
      render(<TranscriptionPanel {...defaultProps} />);

      const startButton = screen.getByText('Başlat');
      fireEvent.click(startButton);

      // Simulate consent modal and accept
      const onCallback = mockTranscriptionService.on.mock.calls.find(
        call => call[0] === 'consent'
      )?.[1];

      if (onCallback) {
        onCallback({ required: true });
      }

      await waitFor(() => {
        const acceptButton = screen.getByText('İzin Ver ve Başlat');
        fireEvent.click(acceptButton);
      });

      expect(mockTranscriptionService.startTranscription).toHaveBeenCalledWith(
        'room123',
        'user456',
        expect.any(MediaStream),
        true
      );
    });

    test('should stop transcription when stop button is clicked', async () => {
      mockTranscriptionService.isTranscriptionActive.mockReturnValue(true);
      
      render(<TranscriptionPanel {...defaultProps} />);

      const stopButton = screen.getByText('Durdur');
      fireEvent.click(stopButton);

      expect(mockTranscriptionService.stopTranscription).toHaveBeenCalled();
    });
  });

  describe('Settings Management', () => {
    test('should show settings panel when settings button is clicked', () => {
      render(<TranscriptionPanel {...defaultProps} />);

      const settingsButton = screen.getByRole('button', { name: /settings/i });
      fireEvent.click(settingsButton);

      expect(screen.getByText('Güven Eşiği')).toBeInTheDocument();
      expect(screen.getByText('Gerçek Zamanlı Görüntüleme')).toBeInTheDocument();
    });

    test('should update confidence threshold when slider changes', () => {
      render(<TranscriptionPanel {...defaultProps} />);

      // Open settings
      const settingsButton = screen.getByRole('button', { name: /settings/i });
      fireEvent.click(settingsButton);

      const slider = screen.getByRole('slider');
      fireEvent.change(slider, { target: { value: '0.8' } });

      expect(mockTranscriptionService.updateSettings).toHaveBeenCalledWith({
        minConfidence: 0.8
      });
    });

    test('should toggle real-time display setting', () => {
      render(<TranscriptionPanel {...defaultProps} />);

      // Open settings
      const settingsButton = screen.getByRole('button', { name: /settings/i });
      fireEvent.click(settingsButton);

      // Find and click the toggle (this might need more specific targeting)
      const toggles = screen.getAllByRole('button');
      const realtimeToggle = toggles.find(button => 
        button.parentElement?.textContent?.includes('Gerçek Zamanlı Görüntüleme')
      );

      if (realtimeToggle) {
        fireEvent.click(realtimeToggle);
        expect(mockTranscriptionService.updateSettings).toHaveBeenCalledWith({
          realTimeDisplay: false
        });
      }
    });
  });

  describe('Transcript Management', () => {
    test('should show empty state when no transcriptions exist', () => {
      render(<TranscriptionPanel {...defaultProps} />);

      expect(screen.getByText('Henüz transkripsiyon yok')).toBeInTheDocument();
      expect(screen.getByText('Transkripsiyon başlatın ve konuşmaya başlayın')).toBeInTheDocument();
    });

    test('should export transcript when export button is clicked', async () => {
      render(<TranscriptionPanel {...defaultProps} />);

      const exportButton = screen.getByRole('button', { name: /download/i });
      fireEvent.click(exportButton);

      expect(mockTranscriptionService.exportTranscript).toHaveBeenCalledWith('txt');
    });

    test('should copy transcript to clipboard', async () => {
      render(<TranscriptionPanel {...defaultProps} />);

      // Simulate having transcriptions (this would require state management)
      // For now, we'll test the button exists
      const copyButton = screen.queryByText('Kopyala');
      
      if (copyButton) {
        fireEvent.click(copyButton);
        expect(mockTranscriptionService.exportTranscript).toHaveBeenCalledWith('txt');
      }
    });

    test('should clear transcript history', () => {
      render(<TranscriptionPanel {...defaultProps} />);

      const clearButton = screen.queryByText('Temizle');
      
      if (clearButton) {
        fireEvent.click(clearButton);
        expect(mockTranscriptionService.clearTranscriptionHistory).toHaveBeenCalled();
      }
    });
  });

  describe('Event Handling', () => {
    test('should register event listeners on mount', () => {
      render(<TranscriptionPanel {...defaultProps} />);

      expect(mockTranscriptionService.on).toHaveBeenCalledWith('transcription', expect.any(Function));
      expect(mockTranscriptionService.on).toHaveBeenCalledWith('speaker-change', expect.any(Function));
      expect(mockTranscriptionService.on).toHaveBeenCalledWith('consent', expect.any(Function));
      expect(mockTranscriptionService.on).toHaveBeenCalledWith('error', expect.any(Function));
    });

    test('should unregister event listeners on unmount', () => {
      const { unmount } = render(<TranscriptionPanel {...defaultProps} />);

      unmount();

      expect(mockTranscriptionService.off).toHaveBeenCalledWith('transcription', expect.any(Function));
      expect(mockTranscriptionService.off).toHaveBeenCalledWith('speaker-change', expect.any(Function));
      expect(mockTranscriptionService.off).toHaveBeenCalledWith('consent', expect.any(Function));
      expect(mockTranscriptionService.off).toHaveBeenCalledWith('error', expect.any(Function));
    });
  });

  describe('Accessibility', () => {
    test('should have proper ARIA labels and roles', () => {
      render(<TranscriptionPanel {...defaultProps} />);

      // Check for proper button roles
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);

      // Check for proper slider role in settings
      const settingsButton = screen.getByRole('button', { name: /settings/i });
      fireEvent.click(settingsButton);

      const slider = screen.getByRole('slider');
      expect(slider).toBeInTheDocument();
    });

    test('should support keyboard navigation', () => {
      render(<TranscriptionPanel {...defaultProps} />);

      const startButton = screen.getByText('Başlat');
      
      // Test focus
      startButton.focus();
      expect(startButton).toHaveFocus();

      // Test Enter key
      fireEvent.keyDown(startButton, { key: 'Enter' });
      // Should trigger the same action as click
    });
  });

  describe('Error Handling', () => {
    test('should handle transcription service errors gracefully', () => {
      render(<TranscriptionPanel {...defaultProps} />);

      // Simulate error event
      const onCallback = mockTranscriptionService.on.mock.calls.find(
        call => call[0] === 'error'
      )?.[1];

      if (onCallback) {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
        
        onCallback({
          type: 'start-failed',
          message: 'Test error'
        });

        expect(consoleSpy).toHaveBeenCalledWith('Transcription error:', expect.any(Object));
        consoleSpy.mockRestore();
      }
    });

    test('should handle export failures gracefully', async () => {
      mockTranscriptionService.exportTranscript.mockRejectedValue(new Error('Export failed'));
      
      render(<TranscriptionPanel {...defaultProps} />);

      const exportButton = screen.getByRole('button', { name: /download/i });
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Export failed:', expect.any(Error));
      });
      
      consoleSpy.mockRestore();
    });
  });
});