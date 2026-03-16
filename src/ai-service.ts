import express from 'express';
import Redis from 'ioredis';
import { spawn } from 'child_process';
import path from 'path';

interface AIRequest {
  type: 'chat' | 'analyze' | 'moderate' | 'recommend' | 'translate';
  input: string;
  userId?: string;
  context?: any;
}

interface AIResponse {
  success: boolean;
  data?: any;
  error?: string;
  processingTime: number;
}

class AIService {
  private app: express.Application;
  private redis: Redis;
  private port: number;
  private gpuEnabled: boolean;

  constructor(port: number = 5000) {
    this.app = express();
    this.port = port;
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    this.gpuEnabled = process.env.GPU_ENABLED === 'true';
    
    this.setupMiddleware();
    this.setupRoutes();
    this.setupCache();
  }

  private setupMiddleware() {
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));
    
    // Rate limiting
    const rateLimitMap = new Map();
    this.app.use((req, res, next) => {
      const clientId = req.ip || req.headers['x-forwarded-for'] || 'unknown';
      const now = Date.now();
      const requests = rateLimitMap.get(clientId) || [];
      
      // Clean old requests (older than 1 minute)
      const validRequests = requests.filter((time: number) => now - time < 60000);
      
      if (validRequests.length >= 100) { // 100 requests per minute
        return res.status(429).json({ error: 'Rate limit exceeded' });
      }
      
      validRequests.push(now);
      rateLimitMap.set(clientId, validRequests);
      next();
    });
  }

  private setupRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({ 
        status: 'healthy', 
        gpu: this.gpuEnabled,
        timestamp: Date.now() 
      });
    });

    // AI Chat
    this.app.post('/api/chat', async (req, res) => {
      const startTime = Date.now();
      try {
        const response = await this.handleChat(req.body);
        res.json({
          ...response,
          processingTime: Date.now() - startTime
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message,
          processingTime: Date.now() - startTime
        });
      }
    });

    // Content Analysis
    this.app.post('/api/analyze', async (req, res) => {
      const startTime = Date.now();
      try {
        const response = await this.analyzeContent(req.body);
        res.json({
          ...response,
          processingTime: Date.now() - startTime
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message,
          processingTime: Date.now() - startTime
        });
      }
    });

    // Content Moderation
    this.app.post('/api/moderate', async (req, res) => {
      const startTime = Date.now();
      try {
        const response = await this.moderateContent(req.body);
        res.json({
          ...response,
          processingTime: Date.now() - startTime
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message,
          processingTime: Date.now() - startTime
        });
      }
    });

    // Recommendations
    this.app.post('/api/recommend', async (req, res) => {
      const startTime = Date.now();
      try {
        const response = await this.generateRecommendations(req.body);
        res.json({
          ...response,
          processingTime: Date.now() - startTime
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message,
          processingTime: Date.now() - startTime
        });
      }
    });

    // Translation
    this.app.post('/api/translate', async (req, res) => {
      const startTime = Date.now();
      try {
        const response = await this.translateContent(req.body);
        res.json({
          ...response,
          processingTime: Date.now() - startTime
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message,
          processingTime: Date.now() - startTime
        });
      }
    });

    // AI Transcription
    this.app.post('/api/ai/transcribe', async (req, res) => {
      const startTime = Date.now();
      try {
        const response = await this.transcribeAudio(req.body);
        res.json({
          ...response,
          processingTime: Date.now() - startTime
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message,
          processingTime: Date.now() - startTime
        });
      }
    });

    // AI Health Check
    this.app.get('/api/ai/health', (req, res) => {
      res.json({
        status: 'healthy',
        services: {
          transcription: true,
          gpu: this.gpuEnabled
        },
        timestamp: Date.now()
      });
    });

    // Batch processing
    this.app.post('/api/batch', async (req, res) => {
      const startTime = Date.now();
      try {
        const requests = req.body.requests;
        const responses = await Promise.all(
          requests.map((request: AIRequest) => this.processRequest(request))
        );
        res.json({
          success: true,
          data: responses,
          processingTime: Date.now() - startTime
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message,
          processingTime: Date.now() - startTime
        });
      }
    });
  }

  private setupCache() {
    // Cache AI responses for 5 minutes
    this.app.use('/api/', async (req, res, next) => {
      if (req.method === 'GET') return next();
      
      const cacheKey = `ai_cache:${JSON.stringify(req.body)}`;
      const cached = await this.redis.get(cacheKey);
      
      if (cached) {
        const data = JSON.parse(cached);
        if (Date.now() - data.timestamp < 300000) { // 5 minutes
          return res.json({
            ...data.response,
            cached: true
          });
        }
      }
      
      next();
    });
  }

  private async handleChat(request: AIRequest): Promise<AIResponse> {
    // Simulate AI chat processing
    const responses = [
      "Bu harika bir fikir! Detayları paylaşabilir misin?",
      "Bu konuyu daha iyi anlamak için örnekler verebilir misin?",
      "İlginç bir bakış açısı! Başka neler düşündün?",
      "Bu konuda daha fazla bilgi almak isterim.",
      "Bu konuyu farklı bir perspektiften değerlendirelim."
    ];

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));

    return {
      success: true,
      data: {
        response: responses[Math.floor(Math.random() * responses.length)],
        confidence: Math.random() * 0.3 + 0.7,
        suggestions: [
          "Devam et",
          "Başla sor",
          "Örnek ver"
        ]
      }
    };
  }

  private async analyzeContent(request: AIRequest): Promise<AIResponse> {
    const content = request.input;
    
    // Simulate content analysis
    const analysis = {
      sentiment: Math.random() > 0.5 ? 'positive' : 'neutral',
      emotion: ['happy', 'excited', 'curious', 'thoughtful'][Math.floor(Math.random() * 4)],
      topics: this.extractTopics(content),
      language: 'tr',
      complexity: Math.floor(Math.random() * 5) + 1,
      readability: Math.random() * 0.4 + 0.6
    };

    return {
      success: true,
      data: analysis
    };
  }

  private async moderateContent(request: AIRequest): Promise<AIResponse> {
    const content = request.input;
    
    // Simulate moderation
    const moderation = {
      approved: Math.random() > 0.1, // 90% approval rate
      flags: [],
      confidence: Math.random() * 0.3 + 0.7,
      categories: {
        spam: Math.random() < 0.05,
        inappropriate: Math.random() < 0.02,
        violence: Math.random() < 0.01,
        harassment: Math.random() < 0.03
      }
    };

    return {
      success: true,
      data: moderation
    };
  }

  private async generateRecommendations(request: AIRequest): Promise<AIResponse> {
    const recommendations = [
      "Bu konuyla ilgili daha fazla içerik keşfet",
      "Benzer ilgi alanlarına sahip kullanıcılarla bağlantı kur",
      "İlgili etkinliklere katılmayı düşün",
      "Bu konuda uzmanlaşmış topluluklara katıl",
      "İlgili kaynakları ve araçları incele"
    ];

    return {
      success: true,
      data: {
        recommendations: recommendations.slice(0, Math.floor(Math.random() * 3) + 2),
        confidence: Math.random() * 0.3 + 0.7
      }
    };
  }

  private async translateContent(request: AIRequest): Promise<AIResponse> {
    const translations = {
      'en': 'This is a translated text in English',
      'de': 'Dies ist ein übersetzter Text auf Deutsch',
      'fr': 'Ceci est un texte traduit en français',
      'es': 'Este es un texto traducido al español',
      'it': 'Questo è un testo tradotto in italiano'
    };

    const targetLang = request.context?.targetLang || 'en';
    
    return {
      success: true,
      data: {
        translatedText: translations[targetLang as keyof typeof translations] || 'Translation not available',
        sourceLang: 'tr',
        targetLang,
        confidence: Math.random() * 0.2 + 0.8
      }
    };
  }

  private async transcribeAudio(request: any): Promise<AIResponse> {
    // Simulate audio transcription processing
    const { audio, language = 'tr', format = 'pcm16', sampleRate = 16000 } = request;
    
    // Simulate processing time based on audio length
    const processingTime = Math.random() * 1000 + 500;
    await new Promise(resolve => setTimeout(resolve, processingTime));
    
    // Mock transcription responses in Turkish
    const mockTranscriptions = [
      "Merhaba, bugün nasılsınız?",
      "Bu toplantıda önemli konuları ele alacağız.",
      "Proje hakkında konuşmak istiyorum.",
      "Sizce bu konuda ne yapmalıyız?",
      "Çok güzel bir fikir, devam edelim.",
      "Bu konuyu daha detaylı incelemek gerekiyor.",
      "Harika bir sunum oldu, teşekkürler.",
      "Sorularınızı alabilir miyim?",
      "Bir sonraki adımımız ne olmalı?",
      "Bu konuda hemfikiriz sanırım."
    ];
    
    // Simulate confidence based on audio quality
    const confidence = Math.random() * 0.4 + 0.6; // 0.6 to 1.0
    
    // Select random transcription
    const text = mockTranscriptions[Math.floor(Math.random() * mockTranscriptions.length)];
    
    return {
      success: true,
      data: {
        text,
        confidence,
        language: language,
        timestamp: Date.now(),
        duration: Math.floor(processingTime),
        format,
        sampleRate
      }
    };
  }

  private async processRequest(request: AIRequest): Promise<AIResponse> {
    switch (request.type) {
      case 'chat':
        return await this.handleChat(request);
      case 'analyze':
        return await this.analyzeContent(request);
      case 'moderate':
        return await this.moderateContent(request);
      case 'recommend':
        return await this.generateRecommendations(request);
      case 'translate':
        return await this.translateContent(request);
      default:
        throw new Error(`Unknown request type: ${request.type}`);
    }
  }

  private extractTopics(content: string): string[] {
    const topics = ['teknoloji', 'sanat', 'müzik', 'spor', 'eğitim', 'eğlence', 'bilim', 'iş'];
    return topics.filter(topic => content.toLowerCase().includes(topic));
  }

  public start() {
    this.app.listen(this.port, () => {
      console.log(`AI Service running on port ${this.port}`);
      console.log(`GPU Enabled: ${this.gpuEnabled}`);
    });
  }
}

// Start service
const aiService = new AIService(parseInt(process.env.AI_PORT || '5000'));
aiService.start();

export default aiService;
