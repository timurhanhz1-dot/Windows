import React, { useEffect, useRef, useState } from 'react'
import Hls from 'hls.js'
import { Loader2, WifiOff, Radio } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface HLSPlayerProps {
  hlsUrl: string
  className?: string
  onEnded?: () => void
  autoPlay?: boolean
  muted?: boolean
}

type PlayerState = 'loading' | 'playing' | 'error' | 'ended'

/**
 * HLS video oynatıcı bileşeni.
 * Safari'de native HLS, diğer tarayıcılarda HLS.js kullanır.
 * Gereksinim 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 9.5, 11.5
 */
const HLSPlayer: React.FC<HLSPlayerProps> = ({
  hlsUrl,
  className = '',
  onEnded,
  autoPlay = true,
  muted = false,
}) => {
  const { t } = useTranslation()
  const videoRef = useRef<HTMLVideoElement>(null)
  const hlsRef = useRef<Hls | null>(null)
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const retryCountRef = useRef(0)
  const [state, setState] = useState<PlayerState>('loading')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video || !hlsUrl) return

    setState('loading')
    setErrorMsg(null)

    // Safari native HLS (Gereksinim 4.1)
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = hlsUrl
      video.onloadedmetadata = () => {
        setState('playing')
        if (autoPlay) video.play().catch(() => {})
      }
      video.onerror = () => {
        setState('error')
        setErrorMsg('Video yüklenemedi.')
      }
      video.onended = () => {
        setState('ended')
        onEnded?.()
      }
      return
    }

    // HLS.js (Gereksinim 4.2, 4.3)
    if (!Hls.isSupported()) {
      setState('error')
      setErrorMsg('Tarayıcınız HLS oynatmayı desteklemiyor.')
      return
    }

    const hls = new Hls({
      enableWorker: true,
      lowLatencyMode: false,
      startLevel: -1,
      liveSyncDurationCount: 2,
      liveMaxLatencyDurationCount: 4,
      backBufferLength: 10,
      maxBufferLength: 10,
      maxMaxBufferLength: 20,
      maxBufferHole: 0.5,
      highBufferWatchdogPeriod: 2,
      nudgeMaxRetry: 5,
      manifestLoadingTimeOut: 30000,
      manifestLoadingMaxRetry: 10,
      manifestLoadingRetryDelay: 2000,
      levelLoadingTimeOut: 30000,
      levelLoadingMaxRetry: 10,
      fragLoadingTimeOut: 30000,
      fragLoadingMaxRetry: 10,
      fragLoadingRetryDelay: 2000,
    })
    hlsRef.current = hls

    hls.loadSource(hlsUrl)
    hls.attachMedia(video)

    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      setState('playing')
      if (autoPlay) video.play().catch(() => {})
    })

    // Hata kurtarma (Gereksinim 4.4, 4.5)
    hls.on(Hls.Events.ERROR, (_event, data) => {
      if (!data.fatal) return
      if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
        // 404 veya ağ hatası: yayın henüz başlamamış olabilir, tekrar dene
        if (retryTimerRef.current) clearTimeout(retryTimerRef.current)
        retryCountRef.current += 1
        const delay = Math.min(3000 * retryCountRef.current, 10000)
        retryTimerRef.current = setTimeout(() => {
          hls.destroy()
          hlsRef.current = null
          // useEffect yeniden tetiklensin diye state güncelle
          setState('loading')
          retryTimerRef.current = setTimeout(() => {
            const newHls = new Hls({
              enableWorker: true,
              lowLatencyMode: false,
              startLevel: -1,
              liveSyncDurationCount: 2,
              liveMaxLatencyDurationCount: 4,
              backBufferLength: 10,
              maxBufferLength: 10,
              maxMaxBufferLength: 20,
              maxBufferHole: 0.5,
              highBufferWatchdogPeriod: 2,
              nudgeMaxRetry: 5,
              manifestLoadingTimeOut: 30000,
              manifestLoadingMaxRetry: 10,
              manifestLoadingRetryDelay: 2000,
              levelLoadingTimeOut: 30000,
              levelLoadingMaxRetry: 10,
              fragLoadingTimeOut: 30000,
              fragLoadingMaxRetry: 10,
              fragLoadingRetryDelay: 2000,
            })
            hlsRef.current = newHls
            newHls.loadSource(hlsUrl)
            newHls.attachMedia(video)
            newHls.on(Hls.Events.MANIFEST_PARSED, () => {
              setState('playing')
              if (autoPlay) video.play().catch(() => {})
              retryCountRef.current = 0
            })
          }, 100)
        }, delay)
      } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
        hls.recoverMediaError()
      } else {
        setState('error')
        setErrorMsg('Yayın bağlantısı kesildi.')
        onEnded?.()
      }
    })

    video.onended = () => {
      setState('ended')
      onEnded?.()
    }

    return () => {
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current)
      hls.destroy()
      hlsRef.current = null
    }
  }, [hlsUrl])

  return (
    <div className={`relative bg-black overflow-hidden ${className}`}>
      <video
        ref={videoRef}
        autoPlay={autoPlay}
        muted={muted}
        playsInline
        className="w-full h-full object-cover"
      />

      {/* Yükleniyor (Gereksinim 4.6) */}
      {state === 'loading' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80">
          <Loader2 size={32} className="text-purple-400 animate-spin mb-3" />
          <p className="text-sm text-white/60">{t('stream.loading')}</p>
        </div>
      )}

      {/* Hata durumu */}
      {state === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80">
          <WifiOff size={32} className="text-red-400 mb-3" />
          <p className="text-sm text-white/80 font-bold mb-1">{t('stream.connectionError')}</p>
          <p className="text-xs text-white/40">{errorMsg}</p>
        </div>
      )}

      {/* Yayın sona erdi (Gereksinim 11.5) */}
      {state === 'ended' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80">
          <Radio size={32} className="text-white/30 mb-3" />
          <p className="text-sm text-white/60">{t('stream.ended')}</p>
        </div>
      )}
    </div>
  )
}

export default HLSPlayer
