/**
 * Screen Share Manager Service
 * getDisplayMedia integration ve screen capture yönetimi
 * Requirements: 5.1, 5.2, 5.4
 */

import { 
  ScreenShareState, 
  ScreenCaptureOptions, 
  VideoConferenceError,
  VideoQualitySettings 
} from '../types/videoConference';

export class ScreenShareManager {
  private currentStream: MediaStream | null = null;
  private isActive: boolean = false;
  private startTime: number | null = null;
  private eventListeners: Map<string, Function[]> = new Map();
  private quality: VideoQualitySettings = {
    resolution: '1080p',
    frameRate: 30,
    bitrate: 2000
  };

  constructor() {
    this.setupEventHandlers();
  }

  // ============================================================================
  // SCREEN CAPTURE MANAGEMENT
  // ============================================================================

  async startScreenShare(options: Partial<ScreenCaptureOptions> = {}): Promise<MediaStream> {
    try {
      // Check if already sharing
      if (this.isActive) {
        throw new Error('Screen sharing is already active');
      }

      // Check browser support
      if (!navigator.mediaDevices?.getDisplayMedia) {
        const error: VideoConferenceError = {
          type: 'permission-denied',
          message: 'Screen sharing is not supported in this browser'
        };
        throw error;
      }

      // Default capture options
      const captureOptions: DisplayMediaStreamConstraints = {
        video: {
          cursor: options.video?.cursor || 'always',
          displaySurface: options.video?.displaySurface,
          frameRate: { ideal: this.quality.frameRate, max: 60 },
          width: { ideal: this.getResolutionWidth() },
          height: { ideal: this.getResolutionHeight() }
        },
        audio: options.audio !== false // Default to true unless explicitly false
      };

      // Request screen capture
      const stream = await navigator.mediaDevices.getDisplayMedia(captureOptions);
      
      if (!stream) {
        const error: VideoConferenceError = {
          type: 'permission-denied',
          message: 'Screen capture permission denied'
        };
        throw error;
      }

      // Store stream and update state
      this.currentStream = stream;
      this.isActive = true;
      this.startTime = Date.now();

      // Setup stream event handlers
      this.setupStreamEventHandlers(stream);

      // Emit start event
      this.emit('screenShareStarted', {
        stream,
        quality: this.quality,
        startTime: this.startTime
      });

      console.log('Screen sharing started successfully');
      return stream;

    } catch (error: any) {
      console.error('Failed to start screen sharing:', error);
      
      // Handle specific error types
      if (error.name === 'NotAllowedError') {
        const videoError: VideoConferenceError = {
          type: 'permission-denied',
          message: 'Screen sharing permission was denied by the user'
        };
        this.emit('error', videoError);
        throw videoError;
      } else if (error.name === 'NotSupportedError') {
        const videoError: VideoConferenceError = {
          type: 'permission-denied',
          message: 'Screen sharing is not supported on this device'
        };
        this.emit('error', videoError);
        throw videoError;
      } else if (error.name === 'AbortError') {
        const videoError: VideoConferenceError = {
          type: 'connection-failed',
          message: 'Screen sharing was cancelled by the user'
        };
        this.emit('error', videoError);
        throw videoError;
      }
      
      // Generic error
      const videoError: VideoConferenceError = {
        type: 'connection-failed',
        message: `Failed to start screen sharing: ${error.message || 'Unknown error'}`
      };
      this.emit('error', videoError);
      throw videoError;
    }
  }

  async stopScreenShare(): Promise<void> {
    try {
      if (!this.isActive || !this.currentStream) {
        console.warn('Screen sharing is not active');
        return;
      }

      // Stop all tracks
      this.currentStream.getTracks().forEach(track => {
        track.stop();
      });

      // Calculate duration
      const duration = this.startTime ? Date.now() - this.startTime : 0;

      // Reset state
      this.currentStream = null;
      this.isActive = false;
      this.startTime = null;

      // Emit stop event
      this.emit('screenShareStopped', {
        duration,
        endTime: Date.now()
      });

      console.log('Screen sharing stopped successfully');

    } catch (error: any) {
      console.error('Error stopping screen sharing:', error);
      
      const videoError: VideoConferenceError = {
        type: 'connection-failed',
        message: `Failed to stop screen sharing: ${error.message || 'Unknown error'}`
      };
      this.emit('error', videoError);
      throw videoError;
    }
  }

  // ============================================================================
  // STREAM EVENT HANDLERS
  // ============================================================================

  private setupStreamEventHandlers(stream: MediaStream): void {
    const videoTrack = stream.getVideoTracks()[0];
    const audioTrack = stream.getAudioTracks()[0];

    if (videoTrack) {
      // Handle video track end (user stops sharing via browser UI)
      videoTrack.addEventListener('ended', () => {
        console.log('Screen sharing ended by user');
        this.handleStreamEnded();
      });

      // Handle video track mute/unmute
      videoTrack.addEventListener('mute', () => {
        this.emit('screenShareMuted', { type: 'video' });
      });

      videoTrack.addEventListener('unmute', () => {
        this.emit('screenShareUnmuted', { type: 'video' });
      });
    }

    if (audioTrack) {
      // Handle audio track end
      audioTrack.addEventListener('ended', () => {
        console.log('Screen sharing audio ended');
        this.emit('screenShareAudioEnded');
      });

      // Handle audio track mute/unmute
      audioTrack.addEventListener('mute', () => {
        this.emit('screenShareMuted', { type: 'audio' });
      });

      audioTrack.addEventListener('unmute', () => {
        this.emit('screenShareUnmuted', { type: 'audio' });
      });
    }
  }

  private handleStreamEnded(): void {
    // Auto-cleanup when stream ends
    this.stopScreenShare().catch(error => {
      console.error('Error during auto-cleanup:', error);
    });
  }

  // ============================================================================
  // QUALITY MANAGEMENT
  // ============================================================================

  setQuality(quality: Partial<VideoQualitySettings>): void {
    this.quality = { ...this.quality, ...quality };
    
    // If currently sharing, apply quality changes
    if (this.isActive && this.currentStream) {
      this.applyQualitySettings();
    }

    this.emit('qualityChanged', this.quality);
  }

  private applyQualitySettings(): void {
    if (!this.currentStream) return;

    const videoTrack = this.currentStream.getVideoTracks()[0];
    if (videoTrack) {
      // Apply constraints to existing track
      const constraints = {
        frameRate: { ideal: this.quality.frameRate },
        width: { ideal: this.getResolutionWidth() },
        height: { ideal: this.getResolutionHeight() }
      };

      videoTrack.applyConstraints(constraints).catch(error => {
        console.warn('Failed to apply quality constraints:', error);
      });
    }
  }

  private getResolutionWidth(): number {
    switch (this.quality.resolution) {
      case '480p': return 854;
      case '720p': return 1280;
      case '1080p': return 1920;
      default: return 1280;
    }
  }

  private getResolutionHeight(): number {
    switch (this.quality.resolution) {
      case '480p': return 480;
      case '720p': return 720;
      case '1080p': return 1080;
      default: return 720;
    }
  }

  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  getState(): ScreenShareState {
    return {
      isActive: this.isActive,
      startTime: this.startTime || undefined,
      quality: this.quality
    };
  }

  getCurrentStream(): MediaStream | null {
    return this.currentStream;
  }

  isScreenSharing(): boolean {
    return this.isActive;
  }

  getDuration(): number {
    if (!this.isActive || !this.startTime) return 0;
    return Date.now() - this.startTime;
  }

  // ============================================================================
  // BROWSER COMPATIBILITY
  // ============================================================================

  static isSupported(): boolean {
    return !!(
      navigator.mediaDevices && 
      navigator.mediaDevices.getDisplayMedia &&
      typeof navigator.mediaDevices.getDisplayMedia === 'function'
    );
  }

  static getSupportedConstraints(): MediaTrackSupportedConstraints | null {
    if (!this.isSupported()) return null;
    
    try {
      return navigator.mediaDevices.getSupportedConstraints();
    } catch (error) {
      console.warn('Failed to get supported constraints:', error);
      return null;
    }
  }

  // ============================================================================
  // ADVANCED FEATURES
  // ============================================================================

  async switchToWindow(): Promise<void> {
    if (!this.isActive) {
      throw new Error('Screen sharing is not active');
    }

    try {
      // Stop current stream
      await this.stopScreenShare();
      
      // Start new stream with window preference
      await this.startScreenShare({
        video: {
          cursor: 'always',
          displaySurface: 'window'
        },
        audio: false
      });

    } catch (error) {
      console.error('Failed to switch to window sharing:', error);
      throw error;
    }
  }

  async switchToScreen(): Promise<void> {
    if (!this.isActive) {
      throw new Error('Screen sharing is not active');
    }

    try {
      // Stop current stream
      await this.stopScreenShare();
      
      // Start new stream with screen preference
      await this.startScreenShare({
        video: {
          cursor: 'always',
          displaySurface: 'monitor'
        },
        audio: true
      });

    } catch (error) {
      console.error('Failed to switch to screen sharing:', error);
      throw error;
    }
  }

  async switchToTab(): Promise<void> {
    if (!this.isActive) {
      throw new Error('Screen sharing is not active');
    }

    try {
      // Stop current stream
      await this.stopScreenShare();
      
      // Start new stream with browser tab preference
      await this.startScreenShare({
        video: {
          cursor: 'motion',
          displaySurface: 'browser'
        },
        audio: true
      });

    } catch (error) {
      console.error('Failed to switch to tab sharing:', error);
      throw error;
    }
  }

  // ============================================================================
  // EVENT SYSTEM
  // ============================================================================

  private setupEventHandlers(): void {
    // Listen for visibility change to pause/resume if needed
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.isActive) {
        this.emit('screenShareBackgrounded');
      } else if (!document.hidden && this.isActive) {
        this.emit('screenShareForegrounded');
      }
    });
  }

  on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  off(event: string, callback: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, data?: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  // ============================================================================
  // CLEANUP
  // ============================================================================

  async cleanup(): Promise<void> {
    try {
      // Stop screen sharing if active
      if (this.isActive) {
        await this.stopScreenShare();
      }

      // Clear event listeners
      this.eventListeners.clear();

      console.log('ScreenShareManager cleaned up successfully');

    } catch (error) {
      console.error('Error during ScreenShareManager cleanup:', error);
    }
  }
}

// Export singleton instance
export const screenShareManager = new ScreenShareManager();
export default ScreenShareManager;