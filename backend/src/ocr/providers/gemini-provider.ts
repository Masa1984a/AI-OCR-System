import { BaseLLMProvider } from './base-llm-provider';
import { LLMProviderConfig, LLMResponse } from './llm-provider.interface';
import { GoogleGenerativeAI } from '@google/generative-ai';

export class GeminiProvider extends BaseLLMProvider {
  private client: GoogleGenerativeAI;

  constructor() {
    super('Gemini');
  }

  async initialize(config: LLMProviderConfig): Promise<void> {
    await super.initialize(config);
    this.client = new GoogleGenerativeAI(config.apiKey);
  }

  async processImage(
    imageBase64: string,
    prompt: string,
    systemPrompt?: string
  ): Promise<LLMResponse> {
    this.validateConfig();

    try {
      const model = this.client.getGenerativeModel({
        model: this.config.model || 'gemini-2.0-flash-exp',
        generationConfig: {
          temperature: this.config.temperature ?? 0,
          maxOutputTokens: this.config.maxTokens || 4000,
        },
      });

      const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt;

      const result = await model.generateContent([
        {
          inlineData: {
            mimeType: 'image/png',
            data: imageBase64,
          },
        },
        fullPrompt,
      ]);

      const response = await result.response;
      const content = response.text();

      return {
        content,
        usage: response.usageMetadata ? {
          promptTokens: response.usageMetadata.promptTokenCount || 0,
          completionTokens: response.usageMetadata.candidatesTokenCount || 0,
          totalTokens: response.usageMetadata.totalTokenCount || 0,
        } : undefined,
      };
    } catch (error) {
      this.logger.error('Gemini API error:', error);
      throw new Error(`Gemini API error: ${error.message}`);
    }
  }

  getSupportedModels(): string[] {
    return [
      'gemini-2.0-flash-exp',
      'gemini-1.5-flash',
      'gemini-1.5-flash-8b',
      'gemini-1.5-pro',
      'gemini-pro-vision',
    ];
  }
}