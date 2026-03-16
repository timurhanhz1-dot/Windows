/**
 * AI Transcription Service
 * Real-time audio transcription using NatureBot service
 * Requirements: 7.1, 7.2, 7.5
 */

import { VideoTranscription, TranscriptionSettings } from '../types/videoConference';

interface TranscriptionEvent {
  type: 'transcription' | 'error' | 'consent' | 'speaker-change';
  data: any;
}

interface AudioProcessingOptions {
  sampleRate: number;
  channels: number;
  bufferSize: number;
}

export class AITranscriptionService {
  private isActive: boolean = false;
  private audioContext: AudioContext | null = null;
  private mediaStreamSource: MediaStreamAudioSourceNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private eventListeners: Map<string, Function[]> = new Map();
  private currentSettings: TranscriptionSettings;
  private transcriptionBuffer: VideoTranscription[] = [];
  private speakerDetection: Map<string, { lastActivity: number; confidence: number }> = new Map();
  private confidenceThreshold: number = 0.7;

  constructor(settings: Partial<TranscriptionSettings> = {}) {
    this.currentSettings = {
      enabled: false,
      language: 'tr',
      minConfidence: 0.7,
      realTimeDisplay: true,
      ...settings
    };
    
    this.confidenceThreshold = this.currentSettings.minConfidence;
  }

  // ============================================================================
  // INITIALIZATION & SETUP
  // ============================================================================

  async initialize(): Promise<void> {
    try {
      // Initialize Web Audio API
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Check if NatureBot service is available
      await this.checkNatureBotConnection();
      
      console.log('AI Transcription Service initialized');
    } catch (error) {
      console.error('Failed to initialize AI Transcription Service:', error);
      throw error;
    }
  }

  private async checkNatureBotConnection(): Promise<void> {
    try {
      // Test connection to NatureBot service
      const response = await fetch('/api/ai/health', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        throw new Error('NatureBot service not available');
      }
      
      const health = await response.json();
      console.log('NatureBot service status:', health);
    } catch (error) {
      console.warn('NatureBot service connection check failed:', error);
      // Continue without throwing - service might be available later
    }
  }

  // ============================================================================
  // TRANSCRIPTION CONTROL
  // ============================================================================

  async startTranscription(
    roomId: string, 
    userId: string, 
    audioStream: MediaStream,
    userConsent: boolean = false
  ): Promise<void> {
    if (!userConsent) {
      this.emit('consent', {
        required: true,
        message: 'AI transkripsiyon için açık izniniz gerekiyor. Ses verileriniz işlenecek ve metne çevrilecek.'
      });
      return;
    }

    if (this.isActive) {
      console.log('Transcription already active');
      return;
    }

    try {
      if (!this.audioContext) {
        await this.initialize();
      }

      // Setup audio processing
      await this.setupAudioProcessing(audioStream);
      
      this.isActive = true;
      
      console.log(`Started AI transcription for room ${roomId}, user ${userId}`);
      this.emit('transcription', {
        type: 'started',
        roomId,
        userId,
        timestamp: Date.now()
      });
      
    } catch (error) {
      console.error('Failed to start transcription:', error);
      this.emit('error', {
        type: 'start-failed',
        message: 'Transkripsiyon başlatılamadı',
        error
      });
      throw error;
    }
  }

  async stopTranscription(): Promise<void> {
    if (!this.isActive) return;

    try {
      // Cleanup audio processing
      if (this.processor) {
        this.processor.disconnect();
        this.processor = null;
      }
      
      if (this.mediaStreamSource) {
        this.mediaStreamSource.disconnect();
        this.mediaStreamSource = null;
      }

      this.isActive = false;
      
      console.log('Stopped AI transcription');
      this.emit('transcription', {
        type: 'stopped',
        timestamp: Date.now()
      });
      
    } catch (error) {
      console.error('Error stopping transcription:', error);
    }
  }

  // ============================================================================
  // AUDIO PROCESSING
  // ============================================================================

  private async setupAudioProcessing(audioStream: MediaStream): Promise<void> {
    if (!this.audioContext) {
      throw new Error('Audio context not initialized');
    }

    // Create media stream source
    this.mediaStreamSource = this.audioContext.createMediaStreamSource(audioStream);
    
    // Create script processor for audio analysis
    const bufferSize = 4096;
    this.processor = this.audioContext.createScriptProcessor(bufferSize, 1, 1);
    
    // Audio processing callback
    this.processor.onaudioprocess = (event) => {
      this.processAudioBuffer(event.inputBuffer);
    };
    
    // Connect audio nodes
    this.mediaStreamSource.connect(this.processor);
    this.processor.connect(this.audioContext.destination);
    
    console.log('Audio processing setup complete');
  }

  private processAudioBuffer(buffer: AudioBuffer): void {
    if (!this.isActive) return;

    try {
      // Get audio data
      const audioData = buffer.getChannelData(0);
      
      // Calculate audio level for speaker detection
      const audioLevel = this.calculateAudioLevel(audioData);
      
      // Detect speech activity
      const isSpeaking = this.detectSpeechActivity(audioLevel);
      
      if (isSpeaking) {
        // Convert audio buffer to format suitable for transcription
        const audioChunk = this.prepareAudioForTranscription(audioData, buffer.sampleRate);
        
        // Send to transcription service
        this.sendAudioForTranscription(audioChunk);
      }
      
    } catch (error) {
      console.error('Error processing audio buffer:', error);
    }
  }

  private calculateAudioLevel(audioData: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < audioData.length; i++) {
      sum += audioData[i] * audioData[i];
    }
    return Math.sqrt(sum / audioData.length);
  }

  private detectSpeechActivity(audioLevel: number): boolean {
    const speechThreshold = 0.01; // Adjust based on testing
    return audioLevel > speechThreshold;
  }

  private prepareAudioForTranscription(audioData: Float32Array, sampleRate: number): ArrayBuffer {
    // Convert Float32Array to 16-bit PCM
    const pcmData = new Int16Array(audioData.length);
    for (let i = 0; i < audioData.length; i++) {
      const sample = Math.max(-1, Math.min(1, audioData[i]));
      pcmData[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
    }
    return pcmData.buffer;
  }

  // ============================================================================
  // NATUREBOT INTEGRATION
  // ============================================================================

  private async sendAudioForTranscription(audioBuffer: ArrayBuffer): Promise<void> {
    try {
      // Convert audio buffer to base64 for transmission
      const base64Audio = this.arrayBufferToBase64(audioBuffer);
      
      const response = await fetch('/api/ai/transcribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          audio: base64Audio,
          language: this.currentSettings.language,
          format: 'pcm16',
          sampleRate: 16000
        })
      });

      if (!response.ok) {
        throw new Error(`Transcription API error: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success && result.data) {
        this.handleTranscriptionResult(result.data);
      }
      
    } catch (error) {
      console.error('Error sending audio for transcription:', error);
      // Don't emit error for every failed chunk - just log it
    }
  }

  private handleTranscriptionResult(result: any): void {
    const { text, confidence, language, timestamp } = result;
    
    // Filter by confidence threshold
    if (confidence < this.confidenceThreshold) {
      console.log(`Transcription confidence too low: ${confidence} < ${this.confidenceThreshold}`);
      return;
    }

    // Create transcription object
    const transcription: VideoTranscription = {
      id: `trans_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      roomId: '', // Will be set by caller
      userId: '', // Will be set by caller
      username: '', // Will be set by caller
      text: text.trim(),
      language: language || this.currentSettings.language,
      confidence,
      timestamp: timestamp || Date.now(),
      duration: 0 // Will be calculated
    };

    // Add to buffer
    this.transcriptionBuffer.push(transcription);
    
    // Emit transcription event
    if (this.currentSettings.realTimeDisplay) {
      this.emit('transcription', {
        type: 'text',
        transcription
      });
    }

    console.log(`Transcription: "${text}" (confidence: ${confidence})`);
  }

  // ============================================================================
  // SPEAKER IDENTIFICATION
  // ============================================================================

  updateSpeakerActivity(userId: string, username: string, isActive: boolean): void {
    if (isActive) {
      this.speakerDetection.set(userId, {
        lastActivity: Date.now(),
        confidence: 0.8 // Base confidence for speaker detection
      });
      
      this.emit('speaker-change', {
        userId,
        username,
        isActive: true,
        timestamp: Date.now()
      });
    } else {
      const speaker = this.speakerDetection.get(userId);
      if (speaker) {
        this.speakerDetection.delete(userId);
        
        this.emit('speaker-change', {
          userId,
          username,
          isActive: false,
          timestamp: Date.now()
        });
      }
    }
  }

  getCurrentSpeaker(): { userId: string; confidence: number } | null {
    let currentSpeaker = null;
    let highestConfidence = 0;
    const now = Date.now();
    
    for (const [userId, data] of this.speakerDetection) {
      // Consider speaker active if activity was within last 2 seconds
      if (now - data.lastActivity < 2000 && data.confidence > highestConfidence) {
        currentSpeaker = userId;
        highestConfidence = data.confidence;
      }
    }
    
    return currentSpeaker ? { userId: currentSpeaker, confidence: highestConfidence } : null;
  }

  // ============================================================================
  // TRANSCRIPT MANAGEMENT
  // ============================================================================

  getTranscriptionHistory(): VideoTranscription[] {
    return [...this.transcriptionBuffer];
  }

  clearTranscriptionHistory(): void {
    this.transcriptionBuffer = [];
  }

  async exportTranscript(format: 'txt' | 'json' | 'srt' = 'txt'): Promise<string> {
    const transcriptions = this.getTranscriptionHistory();
    
    switch (format) {
      case 'txt':
        return this.exportAsText(transcriptions);
      case 'json':
        return JSON.stringify(transcriptions, null, 2);
      case 'srt':
        return this.exportAsSRT(transcriptions);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  private exportAsText(transcriptions: VideoTranscription[]): string {
    return transcriptions
      .map(t => {
        const time = new Date(t.timestamp).toLocaleTimeString();
        return `[${time}] ${t.username}: ${t.text}`;
      })
      .join('\n');
  }

  private exportAsSRT(transcriptions: VideoTranscription[]): string {
    let srt = '';
    
    transcriptions.forEach((t, index) => {
      const startTime = this.formatSRTTime(t.timestamp);
      const endTime = this.formatSRTTime(t.timestamp + (t.duration || 3000));
      
      srt += `${index + 1}\n`;
      srt += `${startTime} --> ${endTime}\n`;
      srt += `${t.username}: ${t.text}\n\n`;
    });
    
    return srt;
  }

  private formatSRTTime(timestamp: number): string {
    const date = new Date(timestamp);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    const milliseconds = date.getMilliseconds().toString().padStart(3, '0');
    
    return `${hours}:${minutes}:${seconds},${milliseconds}`;
  }

  // ============================================================================
  // SETTINGS & CONFIGURATION
  // ============================================================================

  updateSettings(newSettings: Partial<TranscriptionSettings>): void {
    this.currentSettings = { ...this.currentSettings, ...newSettings };
    this.confidenceThreshold = this.currentSettings.minConfidence;
    
    this.emit('settings-updated', this.currentSettings);
  }

  getSettings(): TranscriptionSettings {
    return { ...this.currentSettings };
  }

  isTranscriptionActive(): boolean {
    return this.isActive;
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  // ============================================================================
  // EVENT SYSTEM
  // ============================================================================

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
          console.error('Error in transcription event listener:', error);
        }
      });
    }
  }

  // ============================================================================
  // CLEANUP
  // ============================================================================

  async cleanup(): Promise<void> {
    await this.stopTranscription();
    
    if (this.audioContext && this.audioContext.state !== 'closed') {
      await this.audioContext.close();
      this.audioContext = null;
    }
    
    this.eventListeners.clear();
    this.speakerDetection.clear();
    this.transcriptionBuffer = [];
    
    console.log('AI Transcription Service cleaned up');
  }
}