/**
 * WebRTC Manager Service
 * Handles peer-to-peer connections and media streams for video conferencing
 * Requirements: 6.1, 6.3, 10.2
 */

import { 
  PeerConnectionState, 
  SignalingMessage, 
  ConnectionQualityMetrics,
  VideoConferenceError,
  ICE_SERVERS,
  VIDEO_CONFERENCE_CONSTANTS
} from '../types/videoConference';

export class WebRTCManager {
  private localStream: MediaStream | null = null;
  private peerConnections: Map<string, PeerConnectionState> = new Map();
  private eventListeners: Map<string, Function[]> = new Map();
  private connectionQualityInterval: NodeJS.Timeout | null = null;
  private currentUserId: string = 'current-user';
  private sendSignalingMessage: (message: SignalingMessage) => Promise<void> = async () => {};
  private iceCandidateQueues: Map<string, RTCIceCandidateInit[]> = new Map();

  constructor(userId?: string) {
    if (userId) {
      this.currentUserId = userId;
    }
    this.setupEventListeners();
  }

  setCurrentUserId(userId: string): void {
    this.currentUserId = userId;
  }

  setSignalingService(signalingService: (message: SignalingMessage) => Promise<void>): void {
    this.sendSignalingMessage = signalingService;
  }

  private setupEventListeners(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.cleanup();
      });
    }
  }

  async initializeLocalStream(constraints: MediaStreamConstraints = { video: true, audio: true }): Promise<MediaStream> {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      this.emit('localStreamReady', this.localStream);
      return this.localStream;
    } catch (error) {
      const videoError: VideoConferenceError = {
        type: 'permission-denied',
        message: 'Failed to access camera or microphone',
        details: error
      };
      this.emit('error', videoError);
      throw videoError;
    }
  }

  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  async replaceVideoTrack(newTrack: MediaStreamTrack): Promise<void> {
    if (!this.localStream) return;

    const oldTrack = this.localStream.getVideoTracks()[0];
    if (oldTrack) {
      this.localStream.removeTrack(oldTrack);
      oldTrack.stop();
    }
    this.localStream.addTrack(newTrack);

    for (const [userId, peerState] of this.peerConnections) {
      const sender = peerState.connection.getSenders().find(s => 
        s.track && s.track.kind === 'video'
      );
      if (sender) {
        try {
          await sender.replaceTrack(newTrack);
        } catch (error) {
          console.error(`Failed to replace track for peer ${userId}:`, error);
        }
      }
    }
  }

  async stopLocalStream(): Promise<void> {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
  }

  async createPeerConnection(targetUserId: string, isInitiator: boolean = false): Promise<RTCPeerConnection> {
    if (this.peerConnections.has(targetUserId)) {
      return this.peerConnections.get(targetUserId)!.connection;
    }

    const connection = new RTCPeerConnection({
      iceServers: ICE_SERVERS,
      iceCandidatePoolSize: 10
    });

    const peerState: PeerConnectionState = {
      connection,
      localStream: this.localStream || undefined,
      isInitiator,
      connectionState: connection.connectionState
    };

    this.peerConnections.set(targetUserId, peerState);

    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        connection.addTrack(track, this.localStream!);
      });
    }

    this.setupPeerConnectionEventHandlers(targetUserId, connection);

    if (isInitiator) {
      await this.createAndSendOffer(targetUserId);
    }

    return connection;
  }

  private setupPeerConnectionEventHandlers(userId: string, connection: RTCPeerConnection): void {
    connection.ontrack = (event) => {
      const peerState = this.peerConnections.get(userId);
      if (peerState) {
        peerState.remoteStream = event.streams[0];
        this.emit('remoteStreamReceived', { userId, stream: event.streams[0] });
      }
    };

    connection.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignalingMessage({
          type: 'ice-candidate',
          fromUserId: this.currentUserId,
          toUserId: userId,
          data: {
            candidate: event.candidate.candidate,
            sdpMid: event.candidate.sdpMid,
            sdpMLineIndex: event.candidate.sdpMLineIndex,
            usernameFragment: event.candidate.usernameFragment
          },
          timestamp: Date.now()
        });
      }
    };

    connection.onconnectionstatechange = () => {
      const peerState = this.peerConnections.get(userId);
      if (peerState) {
        const oldState = peerState.connectionState;
        const newState = connection.connectionState;
        peerState.connectionState = newState;
        this.emit('connectionStateChanged', { userId, state: newState, previousState: oldState });

        switch (newState) {
          case 'connected':
            this.emit('peerConnected', { userId });
            break;
          case 'disconnected':
            this.emit('peerDisconnected', { userId, reason: 'disconnected' });
            break;
          case 'failed':
            console.error(`Connection failed for ${userId}`);
            this.handleConnectionFailure(userId);
            break;
          case 'closed':
            this.emit('peerDisconnected', { userId, reason: 'closed' });
            break;
        }
      }
    };

    connection.oniceconnectionstatechange = () => {
      const iceState = connection.iceConnectionState;
      this.emit('iceConnectionStateChanged', { userId, state: iceState });
      if (iceState === 'failed') {
        console.error(`ICE connection failed for ${userId}`);
        this.handleConnectionFailure(userId);
      }
    };

    connection.onicegatheringstatechange = () => {};
    connection.onsignalingstatechange = () => {};

    connection.ondatachannel = (event) => {
      this.emit('dataChannelReceived', { userId, channel: event.channel });
    };
  }

  async handleOffer(offer: RTCSessionDescription | RTCSessionDescriptionInit, fromUserId: string): Promise<void> {
    let peerState = this.peerConnections.get(fromUserId);

    if (!peerState) {
      await this.createPeerConnection(fromUserId, false);
      peerState = this.peerConnections.get(fromUserId)!;
    }

    try {
      const signalingState = peerState.connection.signalingState;

      if (signalingState === 'have-local-offer') {
        await peerState.connection.setLocalDescription({ type: 'rollback' } as RTCSessionDescriptionInit);
      } else if (signalingState !== 'stable') {
        console.warn(`Cannot handle offer in state: ${signalingState}, skipping`);
        return;
      }

      const sdp = offer instanceof RTCSessionDescription
        ? offer
        : new RTCSessionDescription({ type: offer.type, sdp: offer.sdp });

      await peerState.connection.setRemoteDescription(sdp);
      await this.flushIceCandidateQueue(fromUserId);

      const answer = await peerState.connection.createAnswer();
      await peerState.connection.setLocalDescription(answer);

      this.sendSignalingMessage({
        type: 'answer',
        fromUserId: this.currentUserId,
        toUserId: fromUserId,
        data: { type: answer.type, sdp: answer.sdp },
        timestamp: Date.now()
      });
    } catch (error) {
      console.error(`Error handling offer from ${fromUserId}:`, error);
      this.emit('signalingError', { userId: fromUserId, error, type: 'offer' });
      this.handleConnectionFailure(fromUserId);
    }
  }

  async handleAnswer(answer: RTCSessionDescription | RTCSessionDescriptionInit, fromUserId: string): Promise<void> {
    const peerState = this.peerConnections.get(fromUserId);
    if (!peerState) {
      console.error(`No peer connection found for ${fromUserId} when handling answer`);
      return;
    }

    try {
      if (peerState.connection.signalingState !== 'have-local-offer') {
        console.warn(`Cannot handle answer in state: ${peerState.connection.signalingState}, skipping`);
        return;
      }

      const sdp = answer instanceof RTCSessionDescription
        ? answer
        : new RTCSessionDescription({ type: answer.type, sdp: answer.sdp });

      await peerState.connection.setRemoteDescription(sdp);
      await this.flushIceCandidateQueue(fromUserId);
    } catch (error) {
      console.error(`Error handling answer from ${fromUserId}:`, error);
      this.emit('signalingError', { userId: fromUserId, error, type: 'answer' });
      this.handleConnectionFailure(fromUserId);
    }
  }

  async handleIceCandidate(candidate: RTCIceCandidate, fromUserId: string): Promise<void> {
    const peerState = this.peerConnections.get(fromUserId);
    if (!peerState) {
      console.error(`No peer connection found for ${fromUserId} when handling ICE candidate`);
      return;
    }

    if (!peerState.connection.remoteDescription) {
      const queue = this.iceCandidateQueues.get(fromUserId) ?? [];
      queue.push(candidate as unknown as RTCIceCandidateInit);
      this.iceCandidateQueues.set(fromUserId, queue);
      return;
    }

    try {
      const ice = candidate instanceof RTCIceCandidate
        ? candidate
        : new RTCIceCandidate(candidate);
      await peerState.connection.addIceCandidate(ice);
    } catch (error) {
      console.error(`Error adding ICE candidate for ${fromUserId}:`, error);
      this.emit('signalingError', { userId: fromUserId, error, type: 'ice-candidate' });
    }
  }

  private async flushIceCandidateQueue(userId: string): Promise<void> {
    const queue = this.iceCandidateQueues.get(userId);
    if (!queue || queue.length === 0) return;
    this.iceCandidateQueues.delete(userId);
    const peerState = this.peerConnections.get(userId);
    if (!peerState) return;
    for (const c of queue) {
      try {
        await peerState.connection.addIceCandidate(new RTCIceCandidate(c));
      } catch (e) {
        console.error(`Error flushing ICE candidate for ${userId}:`, e);
      }
    }
  }

  private async createAndSendOffer(targetUserId: string): Promise<void> {
    const peerState = this.peerConnections.get(targetUserId);
    if (!peerState) {
      console.error(`No peer connection found for ${targetUserId} when creating offer`);
      return;
    }

    try {
      const offer = await peerState.connection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });
      await peerState.connection.setLocalDescription(offer);

      this.sendSignalingMessage({
        type: 'offer',
        fromUserId: this.currentUserId,
        toUserId: targetUserId,
        data: { type: offer.type, sdp: offer.sdp },
        timestamp: Date.now()
      });
    } catch (error) {
      console.error(`Error creating offer for ${targetUserId}:`, error);
      this.emit('signalingError', { userId: targetUserId, error, type: 'offer-creation' });
      this.handleConnectionFailure(targetUserId);
    }
  }

  private async handleConnectionFailure(userId: string): Promise<void> {
    const peerState = this.peerConnections.get(userId);
    if (!peerState) return;

    this.emit('connectionFailed', { userId, reason: 'connection_lost' });

    const maxAttempts = VIDEO_CONFERENCE_CONSTANTS.RECONNECTION_ATTEMPTS;
    let attempts = 0;

    const reconnect = async (): Promise<void> => {
      if (attempts >= maxAttempts) {
        console.error(`Max reconnection attempts reached for user ${userId}`);
        this.emit('connectionFailed', { userId, reason: 'max_attempts_reached' });
        await this.removePeerConnection(userId);
        return;
      }

      attempts++;
      const delay = Math.min(Math.pow(2, attempts) * 1000, 30000);
      this.emit('reconnectionAttempt', { userId, attempt: attempts, maxAttempts, delay });

      setTimeout(async () => {
        try {
          await this.removePeerConnection(userId);
          const newConnection = await this.createPeerConnection(userId, true);
          await new Promise(resolve => setTimeout(resolve, 5000));
          if (newConnection.connectionState === 'connected') {
            this.emit('reconnectionSuccess', { userId, attempts });
          } else {
            reconnect();
          }
        } catch (error) {
          console.error(`Reconnection attempt ${attempts} failed for user ${userId}:`, error);
          reconnect();
        }
      }, delay);
    };

    reconnect();
  }

  startConnectionQualityMonitoring(): void {
    if (this.connectionQualityInterval) return;
    this.connectionQualityInterval = setInterval(async () => {
      for (const [userId, peerState] of this.peerConnections) {
        const metrics = await this.getConnectionQualityMetrics(peerState.connection);
        this.emit('connectionQualityUpdate', { userId, metrics });
      }
    }, VIDEO_CONFERENCE_CONSTANTS.QUALITY_CHECK_INTERVAL);
  }

  stopConnectionQualityMonitoring(): void {
    if (this.connectionQualityInterval) {
      clearInterval(this.connectionQualityInterval);
      this.connectionQualityInterval = null;
    }
  }

  private async getConnectionQualityMetrics(connection: RTCPeerConnection): Promise<ConnectionQualityMetrics> {
    const stats = await connection.getStats();
    let latency = 0;
    let packetLoss = 0;
    let bandwidth = 0;
    let resolution = '';
    let frameRate = 0;

    stats.forEach((report) => {
      if (report.type === 'candidate-pair' && report.state === 'succeeded') {
        latency = report.currentRoundTripTime * 1000 || 0;
      }
      if (report.type === 'inbound-rtp' && report.mediaType === 'video') {
        packetLoss = report.packetsLost || 0;
        frameRate = report.framesPerSecond || 0;
        if (report.frameWidth && report.frameHeight) {
          resolution = `${report.frameWidth}x${report.frameHeight}`;
        }
      }
      if (report.type === 'outbound-rtp') {
        bandwidth = report.bytesSent || 0;
      }
    });

    return { latency, packetLoss, bandwidth, resolution, frameRate };
  }

  async removePeerConnection(userId: string): Promise<void> {
    const peerState = this.peerConnections.get(userId);
    if (peerState) {
      peerState.connection.close();
      this.peerConnections.delete(userId);
      this.emit('peerDisconnected', { userId });
    }
  }

  async cleanup(): Promise<void> {
    this.stopConnectionQualityMonitoring();
    for (const [userId] of this.peerConnections) {
      await this.removePeerConnection(userId);
    }
    await this.stopLocalStream();
    this.eventListeners.clear();
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
      listeners.forEach(callback => callback(data));
    }
  }

  getPeerConnections(): Map<string, PeerConnectionState> {
    return new Map(this.peerConnections);
  }

  getConnectionState(userId: string): RTCPeerConnectionState | null {
    const peerState = this.peerConnections.get(userId);
    return peerState ? peerState.connectionState : null;
  }

  isConnected(userId: string): boolean {
    return this.getConnectionState(userId) === 'connected';
  }

  getConnectedPeers(): string[] {
    const connectedPeers: string[] = [];
    for (const [userId, peerState] of this.peerConnections) {
      if (peerState.connectionState === 'connected') {
        connectedPeers.push(userId);
      }
    }
    return connectedPeers;
  }

  getRemoteStream(userId: string): MediaStream | null {
    return this.peerConnections.get(userId)?.remoteStream || null;
  }

  hasLocalStream(): boolean {
    return this.localStream !== null && this.localStream.active;
  }

  getCurrentMediaConstraints(): MediaStreamConstraints {
    if (!this.localStream) return { video: false, audio: false };
    return {
      video: this.localStream.getVideoTracks().length > 0,
      audio: this.localStream.getAudioTracks().length > 0
    };
  }

  async toggleAudio(enabled: boolean): Promise<void> {
    if (!this.localStream) return;
    this.localStream.getAudioTracks().forEach(track => { track.enabled = enabled; });
    this.emit('audioToggled', { enabled });
  }

  async toggleVideo(enabled: boolean): Promise<void> {
    if (!this.localStream) return;
    this.localStream.getVideoTracks().forEach(track => { track.enabled = enabled; });
    this.emit('videoToggled', { enabled });
  }

  async getAllConnectionStats(): Promise<Map<string, ConnectionQualityMetrics>> {
    const stats = new Map<string, ConnectionQualityMetrics>();
    for (const [userId, peerState] of this.peerConnections) {
      try {
        const metrics = await this.getConnectionQualityMetrics(peerState.connection);
        stats.set(userId, metrics);
      } catch (error) {
        console.error(`Failed to get stats for peer ${userId}:`, error);
      }
    }
    return stats;
  }
}
