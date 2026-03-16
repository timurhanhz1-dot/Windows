import { WHIP_ENDPOINT } from './srsConstants'

// ─── WHIPClient Arayüzü ───────────────────────────────────────────────────────

export interface WHIPClient {
  connect(stream: MediaStream, streamKey: string): Promise<void>
  disconnect(): void
  onConnectionStateChange(callback: (state: RTCPeerConnectionState) => void): void
}

// ─── WHIPClientImpl ───────────────────────────────────────────────────────────

const MAX_RETRY_COUNT = 3
const RETRY_DELAY_MS = 3000

export class WHIPClientImpl implements WHIPClient {
  private peerConnection: RTCPeerConnection | null = null
  private connectionStateCallback: ((state: RTCPeerConnectionState) => void) | null = null
  private retryCount = 0

  /**
   * MediaStream'i SRS WHIP endpoint'ine bağlar.
   * Gereksinim 3.1, 3.2, 3.3, 3.6
   */
  async connect(stream: MediaStream, streamKey: string): Promise<void> {
    this.retryCount = 0
    await this._attemptConnect(stream, streamKey)
  }

  private async _attemptConnect(stream: MediaStream, streamKey: string): Promise<void> {
    try {
      // RTCPeerConnection oluştur
      this.peerConnection = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      })

      // MediaStream track'lerini ekle
      stream.getTracks().forEach(track => {
        this.peerConnection!.addTrack(track, stream)
      })

      // Bağlantı durumu değişikliklerini dinle
      this.peerConnection.onconnectionstatechange = () => {
        const state = this.peerConnection?.connectionState
        if (state && this.connectionStateCallback) {
          this.connectionStateCallback(state)
        }
      }

      // SDP offer oluştur
      const offer = await this.peerConnection.createOffer()
      await this.peerConnection.setLocalDescription(offer)

      // ICE gathering tamamlanana kadar bekle
      await this._waitForIceGathering()

      // WHIP endpoint'ine SDP offer gönder
      const whipUrl = `${WHIP_ENDPOINT}?app=live&stream=${streamKey}`
      const response = await fetch(whipUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/sdp' },
        body: this.peerConnection.localDescription?.sdp,
      })

      if (!response.ok) {
        throw new Error(`WHIP sunucusu hata döndürdü: ${response.status} ${response.statusText}`)
      }

      // SDP answer al ve uygula
      const answerSdp = await response.text()
      await this.peerConnection.setRemoteDescription({
        type: 'answer',
        sdp: answerSdp,
      })

      this.retryCount = 0
    } catch (error) {
      this._closePeerConnection()

      if (this.retryCount < MAX_RETRY_COUNT) {
        this.retryCount++
        await this._delay(RETRY_DELAY_MS)
        return this._attemptConnect(stream, streamKey)
      }

      throw new Error(
        `SRS WHIP bağlantısı kurulamadı (${MAX_RETRY_COUNT} deneme sonrası): ${(error as Error).message}`
      )
    }
  }

  /**
   * RTCPeerConnection'ı kapatır, tüm track'leri durdurur.
   * Gereksinim 11.3
   */
  disconnect(): void {
    this._closePeerConnection()
    this.connectionStateCallback = null
    this.retryCount = 0
  }

  /**
   * Bağlantı durumu değişikliklerini dinlemek için geri çağırım kaydeder.
   * Gereksinim 3.6
   */
  onConnectionStateChange(callback: (state: RTCPeerConnectionState) => void): void {
    this.connectionStateCallback = callback
  }

  /** Mevcut video sender'ı döndürür (ekran paylaşımı için track replace) */
  getVideoSender(): RTCRtpSender | null {
    if (!this.peerConnection) return null
    return this.peerConnection.getSenders().find(s => s.track?.kind === 'video') ?? null
  }

  /** Mevcut yeniden deneme sayısını döndürür (test amaçlı) */
  getRetryCount(): number {
    return this.retryCount
  }

  /** Mevcut bağlantı durumunu döndürür */
  getConnectionState(): RTCPeerConnectionState | null {
    return this.peerConnection?.connectionState ?? null
  }

  // ─── Özel Yardımcı Metodlar ─────────────────────────────────────────────────

  private _closePeerConnection(): void {
    if (this.peerConnection) {
      this.peerConnection.onconnectionstatechange = null
      this.peerConnection.close()
      this.peerConnection = null
    }
  }

  private _waitForIceGathering(): Promise<void> {
    return new Promise(resolve => {
      if (!this.peerConnection) {
        resolve()
        return
      }
      if (this.peerConnection.iceGatheringState === 'complete') {
        resolve()
        return
      }
      const handler = () => {
        if (this.peerConnection?.iceGatheringState === 'complete') {
          this.peerConnection.removeEventListener('icegatheringstatechange', handler)
          resolve()
        }
      }
      this.peerConnection.addEventListener('icegatheringstatechange', handler)
    })
  }

  private _delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
