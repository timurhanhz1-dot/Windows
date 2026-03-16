export interface NatureBotChatOptions {
  temperature?: number;
  maxTokens?: number;
  systemPromptOverride?: string;
}

export class NatureBotService {
  private apiKey: string;
  private model = 'llama-3.3-70b-versatile';
  private proxyUrl = 'https://us-central1-lisa-518f0.cloudfunctions.net/groqProxy';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async chat(
    prompt: string,
    history: { role: string; content: string }[] = [],
    options: NatureBotChatOptions = {},
  ) {
    try {
      const systemPrompt =
        options.systemPromptOverride ||
        "Sen Nature.co ekosisteminin koruyucusu ve yapay zekası olan NatureBot'sun. Son derece zeki, doğa ile teknolojiyi harmanlayan, bilge ve yardımsever bir karaktersin. Yanıtların hem teknik olarak kusursuz hem de doğanın bilgeliğini yansıtmalı. Kullanıcılara 'Tohum' veya 'Ekosistem Üyesi' olarak hitap edebilirsin. Türkçe konuş.";

      const messages = [
        {
          role: 'system',
          content: systemPrompt,
        },
        ...history,
        { role: 'user', content: prompt },
      ];

      const response = await fetch(this.proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          max_tokens: options.maxTokens ?? 1024,
          temperature: options.temperature ?? 0.7,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message || 'Groq API hatası');
      }

      const data = await response.json();
      return { content: data.choices[0]?.message?.content || 'Üzgünüm, bir hata oluştu.' };
    } catch (error) {
      console.error('NatureBot Chat Error:', error);
      throw error;
    }
  }

  async analyzeImage(imageBuffer: string, prompt: string) {
    // Groq vision için llama-3.2-11b-vision-preview kullan
    try {
      const base64Data = imageBuffer.split(',')[1];
      const mimeType = imageBuffer.split(',')[0].split(':')[1].split(';')[0];

      const response = await fetch(this.proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'llama-3.2-11b-vision-preview',
          messages: [
            {
              role: 'user',
              content: [
                { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64Data}` } },
                { type: 'text', text: prompt }
              ]
            }
          ],
          max_tokens: 1024,
        })
      });

      if (!response.ok) throw new Error('Görsel analiz hatası');
      const data = await response.json();
      return { content: data.choices[0]?.message?.content || 'Resmi analiz edemedim.' };
    } catch (error) {
      console.error('NatureBot Image Analysis Error:', error);
      throw error;
    }
  }

  async speak(_text: string) {
    // Groq TTS henüz yok, sessiz geç
    console.log('TTS: Groq TTS desteği yok, atlanıyor.');
  }
}
