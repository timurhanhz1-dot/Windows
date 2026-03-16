# 🌿 Nature.co - Ekosistemin Merkezi

Modern, AI destekli sosyal platform ve topluluk merkezi.

## ✨ Özellikler

### 🤖 AI Özellikleri
- **NatureBot** - Akıllı asistan (Groq Llama 3.3)
- **Kullanıcı Memory Profili** - Kişiselleştirilmiş deneyim
- **Topluluk Zekası** - Trend analizi ve içerik önerileri
- **Yönetim AI'sı** - Otomatik moderasyon ve analiz

### 💬 Sosyal Özellikler
- Gerçek zamanlı sohbet kanalları
- Direct Messaging (DM)
- Sesli arama ve odalar
- Forum ve tartışma platformu
- Lonca sistemi
- Canlı yayın

### 🎮 Eğlence
- Oyun bölümü
- Robot House
- Etkileşimli NatureBot maskotu

### 📱 Modern Teknoloji
- **React 19** + **TypeScript**
- **TailwindCSS** + **Motion** animasyonlar
- **Firebase** (Auth, Database, Storage)
- **PWA** desteği (iOS/Android)

## 🚀 Hızlı Başlangıç

### Gereksinimler
- Node.js 18+
- npm veya yarn

### Kurulum

1. **Projeyi klonlayın**
```bash
git clone <repository-url>
cd natureco_unified
```

2. **Environment dosyasını oluşturun**
```bash
cp .env.example .env
```

3. **API key'leri yapılandırın**
```env
# .env dosyası
GROQ_API_KEY=your_groq_api_key_here
FIREBASE_CONFIG=your_firebase_config_here
GEMINI_API_KEY=your_gemini_api_key_here
```

4. **Bağımlılıkları kurun**
```bash
npm install
```

5. **Geliştirme sunucusunu başlatın**
```bash
npm run dev
```

6. **Tarayıcıda açın**
```
http://localhost:5173
```

## 📁 Proje Yapısı

```
src/
├── components/          # React bileşenleri
│   ├── ChatArea.tsx    # Sohbet alanı
│   ├── NatureBot*.tsx  # AI bileşenleri
│   └── ...
├── services/           # Servis katmanı
│   ├── aiService.ts    # Ana AI servisi
│   ├── firebaseService.ts
│   └── ...
├── hooks/              # Custom hooks
├── types/              # TypeScript tipleri
├── constants/          # Sabitler
└── utils/              # Yardımcı fonksiyonlar
```

## 🧪 Test

```bash
# Testleri çalıştır
npm test

# Coverage raporu
npm run test:coverage

# E2E testler
npm run test:e2e
```

## 📦 Build

```bash
# Development build
npm run build

# Production build
npm run build:prod

# Preview
npm run preview
```

## 🔧 Development

### Mevcut Script'ler
- `npm run dev` - Geliştirme sunucusu
- `npm run build` - Build
- `npm run preview` - Preview
- `npm run lint` - TypeScript kontrolü
- `npm run clean` - Temizlik

### Environment Variables
```env
VITE_GROQ_API_KEY=your_key
VITE_FIREBASE_API_KEY=your_key
VITE_GEMINI_API_KEY=your_key
```

## 🚀 Deployment

### Vercel
```bash
npm install -g vercel
vercel --prod
```

### Docker
```bash
docker build -t natureco .
docker run -p 3000:3000 natureco
```

## 🤝 Katkıda Bulunma

1. Fork yapın
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit yapın (`git commit -m 'Add amazing feature'`)
4. Push yapın (`git push origin feature/amazing-feature`)
5. Pull Request açın

## 📝 TODO

- [x] README dokümantasyonu
- [ ] Test altyapısı
- [ ] Docker konfigürasyonu
- [ ] CI/CD pipeline
- [ ] Performance optimizasyonu
- [ ] Accessibility iyileştirmeleri

## 📄 Lisans

Bu proje MIT lisansı altında dağıtılmaktadır.

## 🆘 Destek

Sorunlar için:
- [GitHub Issues](https://github.com/your-repo/issues)
- [Discord Sunucusu](https://discord.gg/your-server)

---

**Nature.co** - Ekosisteminize hoş geldiniz! 🌱
