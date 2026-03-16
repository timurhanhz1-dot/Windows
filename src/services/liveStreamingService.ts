import { db } from '../firebase'
import { ref, set, remove, onValue, onDisconnect, DataSnapshot } from 'firebase/database'
import { WHIPClientImpl } from './whipClient.ts'
import { SRS_RTMP_URL as _SRS_RTMP_URL, SRS_HLS_BASE as _SRS_HLS_BASE, WHIP_ENDPOINT as _WHIP_ENDPOINT } from './srsConstants'

// ─── SRS Media Server Sabitleri (re-export) ───────────────────────────────────
export const SRS_RTMP_URL = _SRS_RTMP_URL
export const SRS_HLS_BASE = _SRS_HLS_BASE
export const WHIP_ENDPOINT = _WHIP_ENDPOINT

// ─── Arayüzler ────────────────────────────────────────────────────────────────

export interface StreamMetadata {
  uid: string
  username: string
  title: string
  category: string
  mode: 'browser_camera' | 'browser_screen' | 'browser_screen_cam' | 'obs'
  quality: '360p' | '720p' | '1080p'
  status: 'live' | 'ended'
  started_at: number
  hlsUrl: string
  streamKey: string
  viewerCount?: number
}

/** Firebase live_streams/{userId} düğümündeki kayıt yapısı */
export interface LiveStreamRecord {
  uid: string
  username: string
  title: string
  category: string
  mode: 'browser_camera' | 'browser_screen' | 'browser_screen_cam' | 'obs'
  quality: '360p' | '720p' | '1080p'
  status: 'live'
  started_at: number
  hlsUrl: string
  streamKey: string
  viewerCount: number
}

/** Firebase stream_chat/{streamId}/{messageId} düğümündeki kayıt yapısı */
export interface ChatMessage {
  id: string
  uid: string
  user: string
  text: string
  ts: number
  isModerator?: boolean
}

/** Kalite seçimine göre video kısıtlamaları */
export interface VideoConstraints {
  width: number
  height: number
  frameRate?: number
}

const QUALITY_CONSTRAINTS: Record<StreamMetadata['quality'], VideoConstraints> = {
  '360p': { width: 640, height: 360, frameRate: 30 },
  '720p': { width: 1280, height: 720, frameRate: 30 },
  '1080p': { width: 1920, height: 1080, frameRate: 30 },
}

// ─── Yardımcı Fonksiyonlar ────────────────────────────────────────────────────

/** StreamMetadata nesnesini Firebase'e yazılabilir LiveStreamRecord'a dönüştürür */
export function serializeMetadata(meta: StreamMetadata): LiveStreamRecord {
  return {
    uid: meta.uid,
    username: meta.username,
    title: meta.title,
    category: meta.category,
    mode: meta.mode,
    quality: meta.quality,
    status: 'live',
    started_at: meta.started_at,
    hlsUrl: meta.hlsUrl,
    streamKey: meta.streamKey,
    viewerCount: meta.viewerCount ?? 0,
  }
}

/** Firebase'den okunan ham veriyi StreamMetadata'ya dönüştürür; geçersizse null döner */
export function parseMetadata(raw: unknown): StreamMetadata | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>

  const requiredFields: (keyof LiveStreamRecord)[] = [
    'uid', 'username', 'title', 'category', 'mode',
    'quality', 'status', 'started_at', 'hlsUrl', 'streamKey',
  ]

  for (const field of requiredFields) {
    if (r[field] === undefined || r[field] === null) return null
  }

  return {
    uid: r.uid as string,
    username: r.username as string,
    title: r.title as string,
    category: r.category as string,
    mode: r.mode as StreamMetadata['mode'],
    quality: r.quality as StreamMetadata['quality'],
    status: r.status as 'live' | 'ended',
    started_at: r.started_at as number,
    hlsUrl: r.hlsUrl as string,
    streamKey: r.streamKey as string,
    viewerCount: typeof r.viewerCount === 'number' ? r.viewerCount : 0,
  }
}

/** Kalite değerine göre MediaTrackConstraints üretir */
export function buildMediaConstraints(
  quality: StreamMetadata['quality'],
  deviceId?: string
): MediaTrackConstraints {
  const { width, height, frameRate } = QUALITY_CONSTRAINTS[quality]
  return {
    width: { ideal: width },
    height: { ideal: height },
    frameRate: { ideal: frameRate },
    ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
  }
}

// ─── LiveStreamingService ─────────────────────────────────────────────────────

export class LiveStreamingService {
  private activeStream: MediaStream | null = null
  private whipClient: WHIPClientImpl | null = null
  private cameras: MediaDeviceInfo[] = []
  private microphones: MediaDeviceInfo[] = []
  private speakers: MediaDeviceInfo[] = []
  private onDeviceWarning: ((msg: string | null) => void) | null = null

  /**
   * Cihaz listesini günceller; devicechange olayında da çağrılır.
   * Gereksinim 8.1, 8.2, 8.3, 8.6
   */
  async refreshDevices(): Promise<{ cameras: MediaDeviceInfo[]; microphones: MediaDeviceInfo[]; speakers: MediaDeviceInfo[] }> {
    const devices = await navigator.mediaDevices.enumerateDevices()
    this.cameras = devices.filter(d => d.kind === 'videoinput')
    this.microphones = devices.filter(d => d.kind === 'audioinput')
    this.speakers = devices.filter(d => d.kind === 'audiooutput')

    // Aktif yayında kopan track kontrolü (Gereksinim 8.6)
    if (this.activeStream) {
      const hasEnded = this.activeStream.getTracks().some(t => t.readyState === 'ended')
      if (hasEnded && this.onDeviceWarning) {
        this.onDeviceWarning('⚠️ Bir cihaz bağlantısı kesildi! Ayarlardan yeni cihaz seç.')
      }
    }

    return { cameras: this.cameras, microphones: this.microphones, speakers: this.speakers }
  }

  /**
   * devicechange olayını dinler; cihaz listesini otomatik günceller.
   * @returns cleanup fonksiyonu
   */
  startDeviceChangeListener(onWarning?: (msg: string | null) => void): () => void {
    if (onWarning) this.onDeviceWarning = onWarning
    const handler = () => this.refreshDevices()
    navigator.mediaDevices.addEventListener('devicechange', handler)
    return () => navigator.mediaDevices.removeEventListener('devicechange', handler)
  }

  /**
   * Yayın sırasında cihazı değiştirir (hot-swap).
   * Gereksinim 8.4, 8.5
   */
  async hotSwapDevice(type: 'video' | 'audio', deviceId: string): Promise<void> {
    if (!this.activeStream) throw new Error('Aktif yayın yok')

    const constraints: MediaStreamConstraints = type === 'video'
      ? { video: { deviceId: { exact: deviceId } } }
      : { audio: { deviceId: { exact: deviceId } } }

    const newStream = await navigator.mediaDevices.getUserMedia(constraints)
    const [newTrack] = type === 'video' ? newStream.getVideoTracks() : newStream.getAudioTracks()

    // Eski track'i durdur (Gereksinim 8.4)
    const oldTracks = type === 'video'
      ? this.activeStream.getVideoTracks()
      : this.activeStream.getAudioTracks()
    oldTracks.forEach(t => { this.activeStream!.removeTrack(t); t.stop() })

    // Yeni track'i ekle (Gereksinim 8.5)
    this.activeStream.addTrack(newTrack)
    if (this.onDeviceWarning) this.onDeviceWarning(null)
  }

  /**
   * Tarayıcıdan WebRTC → WHIP → SRS → HLS yayını başlatır.
   * Gereksinim 1.6, 1.7, 1.8, 1.9, 10.3
   */
  async startBrowserStream(
    userId: string,
    metadata: Omit<StreamMetadata, 'uid' | 'status' | 'started_at' | 'hlsUrl' | 'streamKey'>
  ): Promise<void> {
    // HTTPS kontrolü (Gereksinim 10.3)
    if (typeof window !== 'undefined' && window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
      throw new Error('Kamera/mikrofon erişimi için HTTPS bağlantısı gereklidir.')
    }

    // Başlık uzunluk kontrolü (Gereksinim 5.7)
    if (!metadata.title || metadata.title.trim().length === 0) {
      throw new Error('Yayın başlığı boş olamaz.')
    }
    const title = metadata.title.length > 100 ? metadata.title.slice(0, 100) : metadata.title

    const hlsUrl = `${SRS_HLS_BASE}${userId}.m3u8`
    const streamKey = userId

    const streamData: StreamMetadata = {
      uid: userId,
      username: metadata.username,
      title,
      category: metadata.category,
      mode: metadata.mode,
      quality: metadata.quality,
      status: 'live',
      started_at: Date.now(),
      hlsUrl,
      streamKey,
    }

    // WHIPClient ile SRS'e bağlan
    this.whipClient = new WHIPClientImpl()

    if (this.activeStream) {
      await this.whipClient.connect(this.activeStream, streamKey)
    }

    // Firebase'e yayın kaydı yaz (Gereksinim 1.7)
    const streamRef = ref(db, `live_streams/${userId}`)
    await set(streamRef, serializeMetadata(streamData))

    // onDisconnect ile otomatik temizleme (Gereksinim 1.8)
    await onDisconnect(streamRef).remove()
  }

  /**
   * OBS ile RTMP yayını için kurulum yapar.
   * Gereksinim 2.3, 2.4, 2.5
   */
  async startOBSStream(
    userId: string,
    metadata: Omit<StreamMetadata, 'uid' | 'status' | 'started_at' | 'hlsUrl' | 'streamKey' | 'mode'>
  ): Promise<{ rtmpUrl: string; streamKey: string }> {
    const title = metadata.title.length > 100 ? metadata.title.slice(0, 100) : metadata.title
    const hlsUrl = `${SRS_HLS_BASE}${userId}.m3u8`
    const streamKey = userId

    const streamData: StreamMetadata = {
      uid: userId,
      username: metadata.username,
      title,
      category: metadata.category,
      mode: 'obs',
      quality: metadata.quality,
      status: 'live',
      started_at: Date.now(),
      hlsUrl,
      streamKey,
    }

    const streamRef = ref(db, `live_streams/${userId}`)
    await set(streamRef, serializeMetadata(streamData))
    await onDisconnect(streamRef).remove()

    return { rtmpUrl: SRS_RTMP_URL, streamKey }
  }

  /**
   * Yayını sonlandırır; Firebase kaydını siler, track'leri durdurur.
   * Gereksinim 11.1, 11.2, 11.3
   */
  async stopStream(userId: string): Promise<void> {
    // Firebase kaydını sil (Gereksinim 11.1)
    const streamRef = ref(db, `live_streams/${userId}`)
    await remove(streamRef)

    // MediaStream track'lerini durdur (Gereksinim 11.2)
    if (this.activeStream) {
      this.activeStream.getTracks().forEach(track => track.stop())
      this.activeStream = null
    }

    // WHIPClient bağlantısını kapat (Gereksinim 11.3)
    if (this.whipClient) {
      this.whipClient.disconnect()
      this.whipClient = null
    }
  }

  /**
   * Firebase'deki aktif yayınları gerçek zamanlı olarak dinler.
   * Gereksinim 5.5
   * @returns unsubscribe fonksiyonu
   */
  getActiveStreams(callback: (streams: StreamMetadata[]) => void): () => void {
    const streamsRef = ref(db, 'live_streams')
    const unsubscribe = onValue(streamsRef, (snapshot: DataSnapshot) => {
      const streams: StreamMetadata[] = []
      snapshot.forEach(child => {
        const parsed = parseMetadata(child.val())
        if (parsed) streams.push(parsed)
      })
      callback(streams)
    })
    return unsubscribe
  }

  /**
   * Yayın başlığını günceller.
   * Gereksinim 5.7
   */
  async updateStreamTitle(userId: string, title: string): Promise<void> {
    const trimmed = title.length > 100 ? title.slice(0, 100) : title
    const titleRef = ref(db, `live_streams/${userId}/title`)
    await set(titleRef, trimmed)
  }

  /** Aktif MediaStream'i ayarlar (WHIPClient'a iletilmek üzere) */
  setActiveStream(stream: MediaStream): void {
    this.activeStream = stream
  }

  /** Ekran paylaşımı için video sender'ı döndürür */
  getVideoSender(): RTCRtpSender | null {
    return this.whipClient?.getVideoSender() ?? null
  }

  /** Kalite seçimine göre video kısıtlamalarını döndürür */
  getVideoConstraints(quality: StreamMetadata['quality']): VideoConstraints {
    return QUALITY_CONSTRAINTS[quality]
  }
}
