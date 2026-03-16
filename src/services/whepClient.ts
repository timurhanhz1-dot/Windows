import { WHEP_ENDPOINT } from './srsConstants'

/**
 * WHEP (WebRTC-HTTP Egress Protocol) istemcisi.
 * İzleyicilerin WebRTC üzerinden düşük gecikmeli yayın almasını sağlar.
 */
export class WHEPClient {
  private pc: RTCPeerConnection | null = null
  private onTrackCallback: ((stream: MediaStream) => void) | null = null
  private onStateChangeCallback: ((state: RTCPeerConnectionState) => void) | null = null

  onTrack(cb: (stream: MediaStream) => void) {
    this.onTrackCallback = cb
  }

  onStateChange(cb: (state: RTCPeerConnectionState) => void) {
    this.onStateChangeCallback = cb
  }

  async connect(streamKey: string): Promise<void> {
    this.pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    })

    // Gelen track'leri yakala
    const remoteStream = new MediaStream()
    this.pc.ontrack = (event) => {
      event.streams[0]?.getTracks().forEach(track => remoteStream.addTrack(track))
      this.onTrackCallback?.(remoteStream)
    }

    this.pc.onconnectionstatechange = () => {
      if (this.pc) this.onStateChangeCallback?.(this.pc.connectionState)
    }

    // Ses ve video alacağımızı belirt
    this.pc.addTransceiver('video', { direction: 'recvonly' })
    this.pc.addTransceiver('audio', { direction: 'recvonly' })

    const offer = await this.pc.createOffer()
    await this.pc.setLocalDescription(offer)

    // ICE gathering tamamlanana kadar bekle
    await new Promise<void>(resolve => {
      if (this.pc?.iceGatheringState === 'complete') { resolve(); return }
      const handler = () => {
        if (this.pc?.iceGatheringState === 'complete') {
          this.pc.removeEventListener('icegatheringstatechange', handler)
          resolve()
        }
      }
      this.pc?.addEventListener('icegatheringstatechange', handler)
      // 3 saniye timeout
      setTimeout(resolve, 3000)
    })

    const whepUrl = `${WHEP_ENDPOINT}?app=live&stream=${streamKey}`
    const response = await fetch(whepUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/sdp' },
      body: this.pc.localDescription?.sdp,
    })

    if (!response.ok) {
      throw new Error(`WHEP bağlantısı başarısız: ${response.status}`)
    }

    const answerSdp = await response.text()
    await this.pc.setRemoteDescription({ type: 'answer', sdp: answerSdp })
  }

  disconnect(): void {
    this.pc?.close()
    this.pc = null
  }
}
