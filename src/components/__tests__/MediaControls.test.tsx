/**
 * MediaControls Test Suite
 * Task 8.4 - Device management ve error handling testleri
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import MediaControls from '../MediaControls';
import { MediaControlState } from '../../types/videoConference';

// Mock framer-motion
jest.mock('motion/react', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Video: () => <span data-testid="video-icon">Video</span>,
  VideoOff: () => <span data-testid="video-off-icon">VideoOff</span>,
  Mic: () => <span data-testid="mic-icon">Mic</span>,
  MicOff: () => <span data-testid="mic-off-icon">MicOff</span>,
  Monitor: () => <span data-testid="monitor-icon">Monitor</span>,
  MonitorOff: () => <span data-testid="monitor-off-icon">MonitorOff</span>,
  PhoneOff: () => <span data-testid="phone-off-icon">PhoneOff</span>,
  Settings: () => <span data-testid="settings-icon">Settings</span>,
  Camera: () => <span data-testid="camera-icon">Camera</span>,
  Volume2: () => <span data-testid="volume-icon">Volume2</span>,
  ChevronUp: () => <span data-testid="chevron-up-icon">ChevronUp</span>,
  Wifi: () => <span data-testid="wifi-icon">Wifi</span>,
  WifiOff: () => <span data-testid="wifi-off-icon">WifiOff</span>,
  AlertTriangle: () => <span data-testid="alert-icon">AlertTriangle</span>,
  CheckCircle: () => <span data-testid="check-icon">CheckCircle</span>,
}));

describe('MediaControls', () => {
  const mockDevices: MediaDeviceInfo[] = [
    {
      deviceId: 'camera1',
      kind: 'videoinput',
      label: 'Built-in Camera',
      groupId: 'group1',
      toJSON: () => ({})
    },
    {
      deviceId: 'camera2',
      kind: 'videoinput',
      label: 'External Camera',
      groupId: 'group2',
      toJSON: () => ({})
    },
    {
      deviceId: 'mic1',
      kind: 'audioinput',
      label: 'Built-in Microphone',
      groupId: 'group1',
      toJSON: () => ({})
    },
    {
      deviceId: 'speaker1',
      kind: 'audiooutput',
      label: 'Built-in Speakers',
      groupId: 'group1',
      toJSON: () => ({})
    }
  ];

  const defaultMediaState: MediaControlState = {
    isCameraOn: true,
    isMicOn: true,
    isScreenSharing: false,
    permissions: {
      camera: true,
      microphone: true,
      screen: false
    },
    availableDevices: mockDevices,
    selectedDevices: {
      camera: 'camera1',
      microphone: 'mic1',
      speaker: 'speaker1'
    }
  };

  const defaultProps = {
    mediaState: defaultMediaState,
    onToggleCamera: jest.fn(),
    onToggleMic: jest.fn(),
    onToggleScreenShare: jest.fn(),
    onLeaveRoom: jest.fn(),
    onDeviceChange: jest.fn(),
    connectionQuality: 'good' as const,
    participantCount: 3,
    roomDuration: 120
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    test('renders all main control buttons', () => {
      render(<MediaControls {...defaultProps} />);
      
      expect(screen.getByTestId('video-icon')).toBeInTheDocument();
      expect(screen.getByTestId('mic-icon')).toBeInTheDocument();
      expect(screen.getByTestId('monitor-icon')).toBeInTheDocument();
      expect(screen.getByTestId('settings-icon')).toBeInTheDocument();
      expect(screen.getByTestId('phone-off-icon')).toBeInTheDocument();
    });

    test('shows correct icons based on media state', () => {
      const mediaStateOff = {
        ...defaultMediaState,
        isCameraOn: false,
        isMicOn: false,
        isScreenSharing: true
      };

      render(<MediaControls {...defaultProps} mediaState={mediaStateOff} />);
      
      expect(screen.getByTestId('video-off-icon')).toBeInTheDocument();
      expect(screen.getByTestId('mic-off-icon')).toBeInTheDocument();
      expect(screen.getByTestId('monitor-off-icon')).toBeInTheDocument();
    });
  });

  describe('Media Control Actions', () => {
    test('calls onToggleCamera when camera button clicked', () => {
      render(<MediaControls {...defaultProps} />);
      
      const cameraButton = screen.getByTestId('video-icon').closest('button');
      fireEvent.click(cameraButton!);
      
      expect(defaultProps.onToggleCamera).toHaveBeenCalledTimes(1);
    });

    test('calls onToggleMic when microphone button clicked', () => {
      render(<MediaControls {...defaultProps} />);
      
      const micButton = screen.getByTestId('mic-icon').closest('button');
      fireEvent.click(micButton!);
      
      expect(defaultProps.onToggleMic).toHaveBeenCalledTimes(1);
    });

    test('calls onToggleScreenShare when screen share button clicked', () => {
      render(<MediaControls {...defaultProps} />);
      
      const screenButton = screen.getByTestId('monitor-icon').closest('button');
      fireEvent.click(screenButton!);
      
      expect(defaultProps.onToggleScreenShare).toHaveBeenCalledTimes(1);
    });

    test('calls onLeaveRoom when leave button clicked', () => {
      render(<MediaControls {...defaultProps} />);
      
      const leaveButton = screen.getByTestId('phone-off-icon').closest('button');
      fireEvent.click(leaveButton!);
      
      expect(defaultProps.onLeaveRoom).toHaveBeenCalledTimes(1);
    });
  });

  describe('Permission Handling', () => {
    test('disables camera button when permission denied', () => {
      const mediaStateNoPermission = {
        ...defaultMediaState,
        permissions: { camera: false, microphone: true, screen: false }
      };

      render(<MediaControls {...defaultProps} mediaState={mediaStateNoPermission} />);
      
      const cameraButton = screen.getByTestId('video-off-icon').closest('button');
      expect(cameraButton).toBeDisabled();
    });

    test('disables microphone button when permission denied', () => {
      const mediaStateNoPermission = {
        ...defaultMediaState,
        permissions: { camera: true, microphone: false, screen: false }
      };

      render(<MediaControls {...defaultProps} mediaState={mediaStateNoPermission} />);
      
      const micButton = screen.getByTestId('mic-off-icon').closest('button');
      expect(micButton).toBeDisabled();
    });
  });

  describe('Advanced Controls Panel', () => {
    test('shows advanced controls when settings button clicked', async () => {
      render(<MediaControls {...defaultProps} />);
      
      const settingsButton = screen.getByTestId('settings-icon').closest('button');
      fireEvent.click(settingsButton!);
      
      await waitFor(() => {
        expect(screen.getByText('3 katılımcı • 2:00')).toBeInTheDocument();
      });
    });

    test('displays connection quality indicator', async () => {
      render(<MediaControls {...defaultProps} connectionQuality="excellent" />);
      
      const settingsButton = screen.getByTestId('settings-icon').closest('button');
      fireEvent.click(settingsButton!);
      
      await waitFor(() => {
        expect(screen.getByText('Mükemmel')).toBeInTheDocument();
      });
    });

    test('shows device selection menus', async () => {
      render(<MediaControls {...defaultProps} />);
      
      // Open advanced controls
      const settingsButton = screen.getByTestId('settings-icon').closest('button');
      fireEvent.click(settingsButton!);
      
      await waitFor(() => {
        expect(screen.getByText('Kamera')).toBeInTheDocument();
        expect(screen.getByText('Mikrofon')).toBeInTheDocument();
        expect(screen.getByText('Hoparlör')).toBeInTheDocument();
      });
    });
  });

  describe('Device Management', () => {
    test('calls onDeviceChange when camera device selected', async () => {
      render(<MediaControls {...defaultProps} />);
      
      // Open advanced controls
      const settingsButton = screen.getByTestId('settings-icon').closest('button');
      fireEvent.click(settingsButton!);
      
      await waitFor(() => {
        const cameraButton = screen.getByText('Kamera');
        fireEvent.click(cameraButton);
      });
      
      await waitFor(() => {
        const externalCamera = screen.getByText('External Camera');
        fireEvent.click(externalCamera);
      });
      
      expect(defaultProps.onDeviceChange).toHaveBeenCalledWith('camera', 'camera2');
    });

    test('shows no devices message when no devices available', async () => {
      const mediaStateNoDevices = {
        ...defaultMediaState,
        availableDevices: []
      };

      render(<MediaControls {...defaultProps} mediaState={mediaStateNoDevices} />);
      
      // Open advanced controls
      const settingsButton = screen.getByTestId('settings-icon').closest('button');
      fireEvent.click(settingsButton!);
      
      await waitFor(() => {
        const cameraButton = screen.getByText('Kamera');
        fireEvent.click(cameraButton);
      });
      
      await waitFor(() => {
        expect(screen.getByText('Cihaz bulunamadı')).toBeInTheDocument();
      });
    });

    test('highlights selected device in device menu', async () => {
      render(<MediaControls {...defaultProps} />);
      
      // Open advanced controls
      const settingsButton = screen.getByTestId('settings-icon').closest('button');
      fireEvent.click(settingsButton!);
      
      await waitFor(() => {
        const cameraButton = screen.getByText('Kamera');
        fireEvent.click(cameraButton);
      });
      
      await waitFor(() => {
        const selectedDevice = screen.getByText('Built-in Camera');
        expect(selectedDevice.closest('button')).toHaveStyle({
          color: '#10B981'
        });
      });
    });
  });

  describe('Recording Indicator', () => {
    test('shows recording indicator when recording', () => {
      render(<MediaControls {...defaultProps} isRecording={true} />);
      
      expect(screen.getByText('KAYIT EDİLİYOR')).toBeInTheDocument();
    });

    test('hides recording indicator when not recording', () => {
      render(<MediaControls {...defaultProps} isRecording={false} />);
      
      expect(screen.queryByText('KAYIT EDİLİYOR')).not.toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    test('handles missing onDeviceChange prop gracefully', async () => {
      const propsWithoutDeviceChange = {
        ...defaultProps,
        onDeviceChange: undefined
      };

      render(<MediaControls {...propsWithoutDeviceChange} />);
      
      // Should not crash when trying to change device
      const settingsButton = screen.getByTestId('settings-icon').closest('button');
      fireEvent.click(settingsButton!);
      
      await waitFor(() => {
        const cameraButton = screen.getByText('Kamera');
        fireEvent.click(cameraButton);
      });
      
      // Should render without errors
      expect(screen.getByText('Kamera Seçin')).toBeInTheDocument();
    });

    test('handles device with no label gracefully', async () => {
      const devicesWithoutLabel: MediaDeviceInfo[] = [
        {
          deviceId: 'camera-no-label',
          kind: 'videoinput',
          label: '',
          groupId: 'group1',
          toJSON: () => ({})
        }
      ];

      const mediaStateNoLabel = {
        ...defaultMediaState,
        availableDevices: devicesWithoutLabel
      };

      render(<MediaControls {...defaultProps} mediaState={mediaStateNoLabel} />);
      
      const settingsButton = screen.getByTestId('settings-icon').closest('button');
      fireEvent.click(settingsButton!);
      
      await waitFor(() => {
        const cameraButton = screen.getByText('Kamera');
        fireEvent.click(cameraButton);
      });
      
      await waitFor(() => {
        // Should show fallback label
        expect(screen.getByText('Kamera bel')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    test('buttons have proper cursor styles', () => {
      render(<MediaControls {...defaultProps} />);
      
      const cameraButton = screen.getByTestId('video-icon').closest('button');
      expect(cameraButton).toHaveStyle({ cursor: 'pointer' });
    });

    test('disabled buttons have not-allowed cursor', () => {
      const mediaStateNoPermission = {
        ...defaultMediaState,
        permissions: { camera: false, microphone: true, screen: false }
      };

      render(<MediaControls {...defaultProps} mediaState={mediaStateNoPermission} />);
      
      const cameraButton = screen.getByTestId('video-off-icon').closest('button');
      expect(cameraButton).toHaveStyle({ cursor: 'not-allowed' });
    });
  });
});