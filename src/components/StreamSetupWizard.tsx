import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  Video, Monitor, Mic, MicOff, AlertTriangle, Copy, Check,
  ExternalLink, Radio, Settings2, X
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { SRS_RTMP_URL } from '../services/srsConstants'
import type { StreamMetadata } from '../services/liveStreamingService'

// ─── Tipler ──────────────────────────────────────────────────────────────────

type SetupStep = 'method_select' | 'permission' | 'configure' | 'obs_setup' | 'preview'
type StreamMode = 'browser_camera' | 'browser_screen' | 'browser_screen_cam' | 'obs'
type Quality = '360p' | '720p' | '1080p'

interface WizardConfig {
  mode: StreamMode
  title: string
  category: string
  quality: Quality
  cameraId: string
  micId: string
}

interface StreamSetupWizardProps {
  userId: string
  username: string
  onStart: (config: WizardConfig, stream: MediaStream | null) => Promise<void>
  onCancel: () => void
  theme?: any
}

const CATEGORY_KEYS = ['general', 'gaming', 'music', 'software', 'art', 'talk', 'education', 'sports'] as const
const MAX_TITLE_LENGTH = 100

// ─── Bileşen ─────────────────────────────────────────────────────────────────

/**
 * Yayın kurulum sihirbazı.
 * Gereksinim 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 5.7, 8.1
 */
const StreamSetupWizard: React.FC<StreamSetupWizardProps> = ({
  userId,
  username,
  onStart,
  onCancel,
  theme,
}) => {
  const { t } = useTranslation()
  const [step, setStep] = useState<SetupStep>('method_select')
  const [config, setConfig] = useState<WizardConfig>({
    mode: 'browser_camera',
    title: '',
    category: t('stream.categories.general'),
    quality: '720p',
    cameraId: '',
    micId: '',
  })

  // Cihazlar
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([])
  const [mics, setMics] = useState<MediaDeviceInfo[]>([])
  const [permState, setPermState] = useState<'idle' | 'requesting' | 'granted' | 'denied'>('idle')
  const [permError, setPermError] = useState<string | null>(null)

  // Preview
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null)
  const previewRef = useRef<HTMLVideoElement>(null)

  // OBS kopyalama
  const [copiedRtmp, setCopiedRtmp] = useState(false)
  const [copiedKey, setCopiedKey] = useState(false)

  // Loading
  const [starting, setStarting] = useState(false)

  // Cihaz listesini güncelle
  const refreshDevices = useCallback(async () => {
    const devices = await navigator.mediaDevices.enumerateDevices()
    const cams = devices.filter(d => d.kind === 'videoinput')
    const micsArr = devices.filter(d => d.kind === 'audioinput')
    setCameras(cams)
    setMics(micsArr)
    if (!config.cameraId && cams[0]) setConfig(c => ({ ...c, cameraId: cams[0].deviceId }))
    if (!config.micId && micsArr[0]) setConfig(c => ({ ...c, micId: micsArr[0].deviceId }))
  }, [config.cameraId, config.micId])

  // İzin iste (Gereksinim 1.2)
  const requestPermissions = async () => {
    setPermState('requesting')
    setPermError(null)
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      s.getTracks().forEach(t => t.stop())
      setPermState('granted')
      await refreshDevices()
      setStep('configure')
    } catch (err: any) {
      setPermState('denied')
      if (err.name === 'NotAllowedError') {
        setPermError('Kamera/mikrofon izni reddedildi. Tarayıcı ayarlarından izin ver.')
      } else if (err.name === 'NotFoundError') {
        setPermError('Kamera veya mikrofon bulunamadı.')
      } else {
        setPermError('Cihaz erişim hatası: ' + err.message)
      }
    }
  }

  // Preview stream başlat
  useEffect(() => {
    if (step !== 'preview') {
      previewStream?.getTracks().forEach(t => t.stop())
      setPreviewStream(null)
      return
    }
    const start = async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          video: config.cameraId ? { deviceId: { exact: config.cameraId } } : true,
          audio: config.micId ? { deviceId: { exact: config.micId } } : true,
        })
        setPreviewStream(s)
      } catch {}
    }
    start()
    return () => { previewStream?.getTracks().forEach(t => t.stop()) }
  }, [step])

  useEffect(() => {
    if (previewRef.current && previewStream) {
      previewRef.current.srcObject = previewStream
    }
  }, [previewStream])

  // Kopyalama yardımcısı
  const copyToClipboard = (text: string, type: 'rtmp' | 'key') => {
    navigator.clipboard.writeText(text).then(() => {
      if (type === 'rtmp') { setCopiedRtmp(true); setTimeout(() => setCopiedRtmp(false), 2000) }
      else { setCopiedKey(true); setTimeout(() => setCopiedKey(false), 2000) }
    })
  }

  // Yayını başlat
  const handleStart = async () => {
    if (!config.title.trim()) return
    setStarting(true)
    try {
      await onStart(config, previewStream)
    } catch (err: any) {
      alert('Yayın başlatılamadı: ' + err.message)
      setStarting(false)
    }
  }

  // ── ADIM: method_select ──────────────────────────────────────────────────
  if (step === 'method_select') {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#070a0d] p-8">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mx-auto mb-4">
              <Radio size={28} className="text-purple-400" />
            </div>
            <h2 className="text-xl font-black text-white mb-2">{t('stream.startTitle')}</h2>
            <p className="text-sm text-white/40">{t('stream.startSubtitle')}</p>
          </div>

          <div className="space-y-3">
            {/* Tarayıcı modu */}
            <button
              onClick={() => { setConfig(c => ({ ...c, mode: 'browser_camera' })); setStep('permission') }}
              className="w-full flex items-center gap-4 p-4 bg-white/3 border border-white/8 rounded-2xl hover:bg-purple-500/10 hover:border-purple-500/20 transition-all text-left"
            >
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center flex-shrink-0">
                <Video size={22} className="text-purple-400" />
              </div>
              <div>
                <p className="text-sm font-black text-white">{t('stream.browserStream')}</p>
                <p className="text-xs text-white/40 mt-0.5">{t('stream.browserStreamDesc')}</p>
              </div>
            </button>

            {/* OBS modu */}
            <button
              onClick={() => { setConfig(c => ({ ...c, mode: 'obs' })); setStep('obs_setup') }}
              className="w-full flex items-center gap-4 p-4 bg-white/3 border border-white/8 rounded-2xl hover:bg-emerald-500/10 hover:border-emerald-500/20 transition-all text-left"
            >
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                <Monitor size={22} className="text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-black text-white">{t('stream.obsStream')}</p>
                <p className="text-xs text-white/40 mt-0.5">{t('stream.obsStreamDesc')}</p>
              </div>
            </button>
          </div>

          <button onClick={onCancel} className="w-full mt-4 py-2.5 text-white/30 text-sm hover:text-white transition-all">
            {t('common.cancel')}
          </button>
        </div>
      </div>
    )
  }

  // ── ADIM: permission ─────────────────────────────────────────────────────
  if (step === 'permission') {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#070a0d] p-8">
        <div className="max-w-sm w-full text-center">
          <div className="w-20 h-20 rounded-3xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mx-auto mb-5">
            {permState === 'denied' ? <AlertTriangle size={32} className="text-red-400" /> : <Mic size={32} className="text-purple-400" />}
          </div>
          <h3 className="text-lg font-black text-white mb-2">
            {permState === 'denied' ? t('stream.permissionDeniedTitle') : permState === 'requesting' ? t('stream.permissionWaiting') : t('stream.permissionTitle')}
          </h3>
          <p className="text-sm text-white/40 mb-4">
            {permState === 'denied'
              ? t('stream.permissionDeniedDesc')
              : t('stream.permissionDesc')}
          </p>
          {permError && <p className="text-xs text-red-400 mb-4 px-4">{permError}</p>}
          <div className="flex flex-col gap-2">
            <button
              onClick={requestPermissions}
              disabled={permState === 'requesting'}
              className="px-6 py-3 bg-purple-500 text-white rounded-xl font-bold text-sm hover:bg-purple-400 disabled:opacity-50 transition-all"
            >
              {permState === 'requesting' ? `⏳ ${t('stream.waiting')}` : `🎙️ ${t('stream.allowPermission')}`}
            </button>
            <button onClick={() => setStep('method_select')} className="px-6 py-2 text-white/30 text-sm hover:text-white transition-all">
              {t('common.back')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── ADIM: obs_setup ──────────────────────────────────────────────────────
  if (step === 'obs_setup') {
    return (
      <div className="flex-1 overflow-y-auto p-6 bg-[#070a0d]">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => setStep('method_select')} className="text-white/30 hover:text-white transition-all">
              <X size={18} />
            </button>
            <div>
              <h2 className="text-lg font-black text-white">{t('stream.obsSetupTitle')}</h2>
              <p className="text-xs text-white/40">{t('stream.obsSetupDesc')}</p>
            </div>
          </div>

          {/* Başlık ve kategori */}
          <div className="p-4 bg-white/3 border border-white/8 rounded-2xl space-y-3 mb-4">
            <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">{t('stream.streamInfo')}</p>
            <div>
              <label htmlFor="obs-stream-title" className="text-xs text-white/50 block mb-1">{t('stream.titleLabel')}</label>
              <input
                id="obs-stream-title"
                name="obs-stream-title"
                value={config.title}
                onChange={e => setConfig(c => ({ ...c, title: e.target.value.slice(0, MAX_TITLE_LENGTH) }))}
                placeholder={t('stream.titlePlaceholder')}
                className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500/50"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORY_KEYS.map(key => (
                <button key={key} onClick={() => setConfig(c => ({ ...c, category: t(`stream.categories.${key}`) }))}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${config.category === t(`stream.categories.${key}`) ? 'bg-purple-500/30 border border-purple-500/40 text-purple-300' : 'bg-white/5 border border-white/8 text-white/40 hover:text-white'}`}>
                  {t(`stream.categories.${key}`)}
                </button>
              ))}
            </div>
          </div>

          {/* OBS bağlantı bilgileri (Gereksinim 2.1, 2.2) */}
          <div className="p-4 bg-emerald-500/5 border border-emerald-500/15 rounded-2xl space-y-3 mb-4">
            <p className="text-[10px] font-black text-emerald-400/80 uppercase tracking-widest">{t('stream.obsSettings')}</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between bg-black/30 rounded-xl px-3 py-2.5">
                <div>
                  <p className="text-[10px] text-white/40 mb-0.5">RTMP URL</p>
                  <p className="text-xs text-emerald-400 font-mono">{SRS_RTMP_URL}</p>
                </div>
                <button onClick={() => copyToClipboard(SRS_RTMP_URL, 'rtmp')}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-all text-white/40 hover:text-white">
                  {copiedRtmp ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                </button>
              </div>
              <div className="flex items-center justify-between bg-black/30 rounded-xl px-3 py-2.5">
                <div>
                  <p className="text-[10px] text-white/40 mb-0.5">Stream Key</p>
                  <p className="text-xs text-emerald-400 font-mono">{userId}</p>
                </div>
                <button onClick={() => copyToClipboard(userId, 'key')}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-all text-white/40 hover:text-white">
                  {copiedKey ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                </button>
              </div>
            </div>
            <p className="text-[10px] text-white/30">
              {t('stream.obsNote')}
            </p>
          </div>

          {/* OBS indirme linki (Gereksinim 2.2) */}
          <a
            href="https://obsproject.com/download"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between w-full p-3 bg-white/3 border border-white/8 rounded-xl hover:bg-white/5 transition-all mb-4"
          >
            <span className="text-xs text-white/60">{t('stream.obsDownload')}</span>
            <ExternalLink size={13} className="text-white/30" />
          </a>

          <button
            onClick={handleStart}
            disabled={!config.title.trim() || starting}
            className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white rounded-xl text-sm font-black hover:from-emerald-500 hover:to-emerald-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            {starting ? `⏳ ${t('stream.starting')}` : `📡 ${t('stream.saveObs')}`}
          </button>
        </div>
      </div>
    )
  }

  // ── ADIM: configure ──────────────────────────────────────────────────────
  if (step === 'configure') {
    return (
      <div className="flex-1 overflow-y-auto p-6 bg-[#070a0d]">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => setStep('method_select')} className="text-white/30 hover:text-white transition-all">
              <X size={18} />
            </button>
            <div>
              <h2 className="text-lg font-black text-white">{t('stream.configureTitle')}</h2>
              <p className="text-xs text-white/40">{t('stream.configureDesc')}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Sol */}
            <div className="space-y-4">
              {/* Başlık & Kategori */}
              <div className="p-4 bg-white/3 border border-white/8 rounded-2xl space-y-3">
                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">{t('stream.streamInfoSection')}</p>
                <div>
                  <label htmlFor="stream-title" className="text-xs text-white/50 block mb-1">{t('stream.titleMax', { max: MAX_TITLE_LENGTH })}</label>
                  <input
                    id="stream-title"
                    name="stream-title"
                    value={config.title}
                    onChange={e => setConfig(c => ({ ...c, title: e.target.value.slice(0, MAX_TITLE_LENGTH) }))}
                    placeholder={t('stream.titleConfigPlaceholder')}
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500/50"
                  />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {CATEGORY_KEYS.map(key => (
                    <button key={key} onClick={() => setConfig(c => ({ ...c, category: t(`stream.categories.${key}`) }))}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${config.category === t(`stream.categories.${key}`) ? 'bg-purple-500/30 border border-purple-500/40 text-purple-300' : 'bg-white/5 border border-white/8 text-white/40 hover:text-white'}`}>
                      {t(`stream.categories.${key}`)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Yayın türü */}
              <div className="p-4 bg-white/3 border border-white/8 rounded-2xl space-y-3">
                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">{t('stream.streamType')}</p>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { id: 'browser_camera', icon: <Video size={16} />, label: t('stream.camera') },
                    { id: 'browser_screen', icon: <Monitor size={16} />, label: t('stream.screen') },
                    { id: 'browser_screen_cam', icon: <Settings2 size={16} />, label: t('stream.screenCamera') },
                  ] as const).map(opt => (
                    <button key={opt.id} onClick={() => setConfig(c => ({ ...c, mode: opt.id }))}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border transition-all text-left ${config.mode === opt.id ? 'bg-purple-500/15 border-purple-500/30 text-purple-300' : 'bg-white/3 border-white/8 text-white/40 hover:text-white'}`}>
                      {opt.icon}
                      <span className="text-xs font-bold">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Kalite */}
              <div className="p-4 bg-white/3 border border-white/8 rounded-2xl space-y-3">
                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">{t('stream.videoQuality')}</p>
                <div className="grid grid-cols-3 gap-2">
                  {(['360p', '720p', '1080p'] as Quality[]).map(q => (
                    <button key={q} onClick={() => setConfig(c => ({ ...c, quality: q }))}
                      className={`py-2 rounded-xl border text-xs font-black transition-all ${config.quality === q ? 'bg-purple-500/15 border-purple-500/30 text-purple-300' : 'bg-white/3 border-white/8 text-white/40 hover:text-white'}`}>
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Sağ */}
            <div className="space-y-4">
              {/* Cihaz seçimi (Gereksinim 8.1) */}
              <div className="p-4 bg-white/3 border border-white/8 rounded-2xl space-y-3">
                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">{t('stream.devices')}</p>
                <div>
                  <label htmlFor="camera-select" className="text-xs text-white/50 block mb-1">{t('stream.cameraLabel')}</label>
                  <select id="camera-select" name="camera-select" value={config.cameraId} onChange={e => setConfig(c => ({ ...c, cameraId: e.target.value }))}
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none">
                    {cameras.map(d => <option key={d.deviceId} value={d.deviceId}>{d.label || `Kamera ${d.deviceId.slice(0, 8)}`}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="mic-select" className="text-xs text-white/50 block mb-1">{t('stream.micLabel')}</label>
                  <select id="mic-select" name="mic-select" value={config.micId} onChange={e => setConfig(c => ({ ...c, micId: e.target.value }))}
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none">
                    {mics.map(d => <option key={d.deviceId} value={d.deviceId}>{d.label || `Mikrofon ${d.deviceId.slice(0, 8)}`}</option>)}
                  </select>
                </div>
              </div>

              <button
                onClick={() => setStep('preview')}
                disabled={!config.title.trim()}
                className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-purple-500 text-white rounded-xl text-sm font-black hover:from-purple-500 hover:to-purple-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                {t('stream.toPreview')}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── ADIM: preview ────────────────────────────────────────────────────────
  return (
    <div className="flex-1 overflow-y-auto p-6 bg-[#070a0d]">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setStep('configure')} className="text-white/30 hover:text-white transition-all">
            <X size={18} />
          </button>
          <div>
            <h2 className="text-lg font-black text-white">{t('stream.previewTitle')}</h2>
            <p className="text-xs text-white/40">{t('stream.previewDesc')}</p>
          </div>
        </div>

        {/* Kamera önizleme (Gereksinim 1.5) */}
        <div className="aspect-video bg-black rounded-2xl overflow-hidden mb-4 relative">
          <video ref={previewRef} autoPlay muted playsInline className="w-full h-full object-cover" />
          {!previewStream && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Video size={32} className="text-white/20" />
            </div>
          )}
        </div>

        {/* Özet */}
        <div className="p-4 bg-white/3 border border-white/8 rounded-2xl space-y-2 mb-4">
          <div className="flex justify-between text-xs">
            <span className="text-white/40">{t('stream.summaryTitle')}</span>
            <span className="text-white font-bold truncate max-w-[200px]">{config.title}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-white/40">{t('stream.summaryCategory')}</span>
            <span className="text-white">{config.category}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-white/40">{t('stream.summaryQuality')}</span>
            <span className="text-white">{config.quality}</span>
          </div>
        </div>

        {/* Yayına geç (Gereksinim 1.6) */}
        <button
          onClick={handleStart}
          disabled={starting}
          className="w-full py-4 bg-gradient-to-r from-red-600 to-red-500 text-white rounded-xl text-sm font-black hover:from-red-500 hover:to-red-400 disabled:opacity-50 transition-all shadow-lg shadow-red-500/20"
        >
          {starting ? `⏳ ${t('stream.starting')}` : `🔴 ${t('stream.goLive')}`}
        </button>
      </div>
    </div>
  )
}

export default StreamSetupWizard
