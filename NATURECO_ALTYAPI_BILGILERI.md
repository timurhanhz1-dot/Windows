# Nature.co — Altyapı Bilgileri
> Bu dosyayı güvenli bir yerde sakla. Şifreler ve erişim bilgileri içerir.

---

## Firebase

- Proje ID: `lisa-518f0`
- Hosting URL: `https://lisa-518f0.web.app`
- Console: `https://console.firebase.google.com/project/lisa-518f0/overview`
- Database URL: `https://lisa-518f0-default-rtdb.firebaseio.com`
- Deploy komutu: `cd ~/Downloads/natureco_improvements && rm -rf dist && npm run build && firebase deploy --only hosting`
- Database rules deploy: `firebase deploy --only database`

---

## Kullanıcı Bilgileri

- Admin UID: `GX3iKbEUVfOmMplltZdcOv0X4C32`
- Backoffice rolü: `backoffice_role: "super_admin"` (Firebase Console'dan manuel eklendi)
- Admin panel: `/admin`
- Backoffice panel: `/backoffice`

---

## Google Cloud — Media Server

- Proje adı: `My First Project`
- Console: `https://console.cloud.google.com`
- VM adı: `natureco-stream`
- Bölge: `europe-west3-a (Frankfurt)`
- External IP: `34.107.65.231`
- Makine tipi: `e2-medium (2 vCPU, 4GB RAM)`
- OS: `Ubuntu 22.04 LTS`
- Aylık tahmini maliyet: ~$32 ($300 kredi ile ~9 ay ücretsiz)
- SSH: Google Cloud Console → Compute Engine → VM instances → SSH butonu

---

## SRS Media Server

- Yönetim paneli: `http://34.107.65.231:8080`
- RTMP URL (OBS için): `rtmp://34.107.65.231/live`
- HLS URL: `http://34.107.65.231:8080/live/{streamKey}.m3u8`
- Stream Key formatı: kullanıcının Firebase UID'si
- Maksimum izleyici: 10.000+
- Docker container adı: `srs`
- SRS yeniden başlatma: `sudo docker restart srs`
- SRS log görme: `sudo docker logs srs`

---

## OBS Ayarları (Yayıncılar için)

- Servis: Custom
- Server: `rtmp://34.107.65.231/live`
- Stream Key: (kullanıcının kendi Firebase UID'si — uygulama içinde gösterilir)

---

## Açık Portlar

| Port | Protokol | Kullanım |
|------|----------|----------|
| 1935 | TCP | RTMP (OBS stream girişi) |
| 8080 | TCP | HLS (izleyici çıkışı) |
| 1985 | TCP | SRS API |
| 80   | TCP | HTTP |
| 443  | TCP | HTTPS |

---

## Proje Dosya Yolu

- Kaynak kod: `~/Downloads/natureco_improvements`
- Ana bileşenler:
  - `src/components/LiveSection.tsx` — Canlı yayın
  - `src/components/ChatArea.tsx` — Sohbet
  - `src/App.tsx` — Ana uygulama
  - `src/firebase.ts` — Firebase config
  - `src/services/firebaseService.ts` — Firebase servisleri
  - `database.rules.json` — Database güvenlik kuralları
  - `.env` — Environment variables

---

## Environment Variables (.env)

```
VITE_SRS_RTMP_URL=rtmp://34.107.65.231/live
VITE_SRS_HLS_URL=http://34.107.65.231:8080/live/
```

---

## Sunucu Bakım Komutları

```bash
# SSH bağlantısı (Google Cloud Console üzerinden)
# Compute Engine → VM instances → natureco-stream → SSH

# SRS durumu kontrol
sudo docker ps

# SRS yeniden başlat
sudo docker restart srs

# SRS logları
sudo docker logs srs --tail 50

# Sunucu yeniden başlat
sudo reboot
```

---

## Notlar

- Google Cloud $300 kredi 90 gün geçerli, sonrasında ücretli plana geçmek gerekebilir
- SRS container `--restart=always` ile kuruldu, sunucu yeniden başlasa bile otomatik başlar
- Firebase Free Spark planı kullanılıyor, büyüyünce Blaze planına geçilmeli
- Backoffice sadece `backoffice_role` olan kullanıcılara açık

---

*Oluşturulma tarihi: 14 Mart 2026*
