import React, { useEffect, useRef, useState } from 'react'
import { Loader2, WifiOff, Radio } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { WHEPClient } from '../services/whepClient'

interface WebRTCPlayerProps {
  streamKey: string
  className?: string
  onEnded?: () => void
  muted?: boolean
  /** WHEP başarısız olursa HLS fallback URL */
  hlsFallbackUrl?: string
}

type PlayerState = 'loading' | 'playing' | 'error'

const WebRTCPlayer: React.FC<WebRTCPlayerProps> = ({
  streamKey,
  className = '',
  onEnded,
  muted = false,
}) => {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null)
  const clientRef = useRef<WHEPClient | null>(null)
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const retryCountRef = useRef(0)
  const [state, setState] = useState<PlayerState>('loading')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    if (!streamKey) return
    setState('loading')
    setErrorMsg(null)
    retryCountRef.current = 0

    const connect = async () => {
      try {
        const client = new WHEPClient()
        clientRef.current = client

        client.onTrack((stream) => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream
            videoRef.current.play().catch(() => {})
            setState('playing')
            retryCountRef.current = 0
          }
        })

        client.onStateChange((state) => {
          if (state === 'disconnected' || state === 'failed') {
            // Yayın bitti veya bağlantı koptu — yeniden dene
            retry()
          }
        })

        await client.connect(streamKey)
      } catch {
        retry()
      }
    }

    const retry = () => {
      clientRef.current?.disconnect()
      clientRef.current = null
      retryCountRef.current += 1

      if (retryCountRef.current > 60) {
        // 5 dakika sonra vazgeç
        setState('error')
        setErrorMsg(t('video.connectionError'));
        onEnded?.()
        return
      }

      const delay = retryCountRef.current < 5 ? 3000 : 8000
      retryRef.current = setTimeout(connect, delay)
    }

    connect()

    return () => {
      if (retryRef.current) clearTimeout(retryRef.current)
      clientRef.current?.disconnect()
      clientRef.current = null
    }
  }, [streamKey])

  return (
    <div className={`relative bg-black overflow-hidden ${className}`}>
      <video
        ref={videoRef}
        muted={muted}
        playsInline
        autoPlay
        className="w-full h-full object-contain bg-black"
      />

      {state === 'loading' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80">
          <Loader2 size={32} className="text-purple-400 animate-spin mb-3" />
          <p className="text-sm text-white/60">{t('live.reconnecting')}</p>
        </div>
      )}

      {state === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80">
          <WifiOff size={32} className="text-red-400 mb-3" />
          <p className="text-sm text-white/80 font-bold mb-1">{t('video.connectionError')}</p>
          <p className="text-xs text-white/40">{errorMsg}</p>
        </div>
      )}
    </div>
  )
}

export default WebRTCPlayer
