import React, { useState, useEffect } from 'react'
import { Users, Radio } from 'lucide-react'
import { db } from '../firebase'
import { ref, onValue } from 'firebase/database'
import { parseMetadata, type StreamMetadata } from '../services/liveStreamingService'

interface StreamListProps {
  currentUserId: string
  selectedStreamId: string | null
  onSelectStream: (stream: StreamMetadata) => void
  theme?: any
}

/**
 * Aktif yayınları listeleyen bileşen.
 * Gereksinim 5.5, 7.3, 7.4
 */
const StreamList: React.FC<StreamListProps> = ({
  currentUserId,
  selectedStreamId,
  onSelectStream,
  theme,
}) => {
  const [streams, setStreams] = useState<StreamMetadata[]>([])
  const [viewerCounts, setViewerCounts] = useState<Record<string, number>>({})

  // Aktif yayınları gerçek zamanlı dinle (Gereksinim 5.5)
  useEffect(() => {
    const streamsRef = ref(db, 'live_streams')
    const unsub = onValue(streamsRef, snap => {
      const data = snap.val()
      if (!data) { setStreams([]); return }
      const list: StreamMetadata[] = Object.values(data)
        .map(v => parseMetadata(v))
        .filter((s): s is StreamMetadata => s !== null && s.status === 'live')
        .sort((a, b) => (b.started_at || 0) - (a.started_at || 0))
      setStreams(list)
    })
    return () => unsub()
  }, [])

  // Her yayın için izleyici sayısını dinle (Gereksinim 7.3)
  useEffect(() => {
    if (streams.length === 0) return
    const unsubs = streams.map(stream => {
      const viewersRef = ref(db, `stream_viewers/${stream.uid}`)
      return onValue(viewersRef, snap => {
        setViewerCounts(prev => ({ ...prev, [stream.uid]: snap.val() ? Object.keys(snap.val()).length : 0 }))
      })
    })
    return () => unsubs.forEach(u => u())
  }, [streams.map(s => s.uid).join(',')])

  if (streams.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center px-4">
        <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/8 flex items-center justify-center mb-3">
          <Radio size={22} className="text-white/20" />
        </div>
        <p className="text-sm font-bold text-white/40">Aktif yayın yok</p>
        <p className="text-xs text-white/20 mt-1">İlk yayını sen başlat!</p>
      </div>
    )
  }

  return (
    <div className="space-y-2 p-3">
      {streams.map(stream => {
        const isSelected = selectedStreamId === stream.uid
        // Yayıncı kendi izleyici listesinde görünmez (Gereksinim 7.4)
        const viewerCount = viewerCounts[stream.uid] ?? 0

        return (
          <button
            key={stream.uid}
            onClick={() => onSelectStream(stream)}
            className={`w-full text-left p-3 rounded-xl border transition-all ${
              isSelected
                ? 'bg-purple-500/15 border-purple-500/30'
                : 'bg-white/3 border-white/8 hover:bg-white/5 hover:border-white/15'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
                  <span className="text-[10px] font-black text-red-400 uppercase tracking-widest">Canlı</span>
                  <span className="text-[10px] text-white/30 bg-white/5 px-1.5 py-0.5 rounded-md">
                    {stream.category}
                  </span>
                </div>
                <p className="text-xs font-bold text-white truncate">{stream.title}</p>
                <p className="text-[10px] text-white/40 mt-0.5">{stream.username}</p>
              </div>
              <div className="flex items-center gap-1 text-white/40 flex-shrink-0">
                <Users size={11} />
                <span className="text-[10px] font-bold">{viewerCount.toLocaleString('tr-TR')}</span>
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}

export default StreamList
