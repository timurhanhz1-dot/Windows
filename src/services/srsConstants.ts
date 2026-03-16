// SRS Media Server bağlantı sabitleri
// RTMP: SSL desteklemez, doğrudan IP:port kullanılır (OBS bağlantısı için)
export const SRS_RTMP_URL = 'rtmp://34.107.65.231/live'
// HLS ve WHIP: Nginx reverse proxy üzerinden HTTPS (Mixed Content engelini aşmak için)
export const SRS_HLS_BASE = import.meta.env.VITE_SRS_HLS_BASE || 'https://stream.natureco.me/live/'
export const WHIP_ENDPOINT = import.meta.env.VITE_SRS_WHIP_ENDPOINT || 'https://stream.natureco.me/rtc/v1/whip/'
// WHEP: İzleyici WebRTC bağlantısı için
export const WHEP_ENDPOINT = import.meta.env.VITE_SRS_WHEP_ENDPOINT || 'https://stream.natureco.me/rtc/v1/whep/'
