import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LLMProvider, LLMProviderConfig } from './llm-provider.interface';
import { ClaudeProvider } from './claude-provider';
import { ChatGPTProvider } from './chatgpt-provider';
import { GeminiProvider } from './gemini-provider';

export type LLMProviderType = 'claude' | 'chatgpt' | 'gemini';

@Injectable()
export class LLMProviderFactory {
  private readonly logger = new Logger(LLMProviderFactory.name);
  private providers: Map<LLMProviderType, LLMProvider> = new Map();
  private initialized = false;

  constructor(private configService: ConfigService) {}

  async initialize(): Promise<void> {
    if (this.initialized) return;

    const providers: Array<{ type: LLMProviderType; provider: LLMProvider; envKey: string }> = [
      { type: 'claude', provider: new ClaudeProvider(), envKey: 'ANTHROPIC_API_KEY' },
      { type: 'chatgpt', provider: new ChatGPTProvider(), envKey: 'OPENAI_API_KEY' },
      { type: 'gemini', provider: new GeminiProvider(), envKey: 'GEMINI_API_KEY' },
    ];

    for (const { type, provider, envKey } of providers) {
      const apiKey = this.configService.get<string>(envKey);
      if (apiKey) {
        try {
          await provider.initialize({ apiKey });
          this.providers.set(type, provider);
          this.logger.log(`${provider.name} provider initialized successfully`);
        } catch (error) {
          this.logger.warn(`Failed to initialize ${provider.name} provider: ${error.message}`);
        }
      } else {
        this.logger.warn(`${provider.name} API key not found (${envKey})`);
      }
    }

    this.initialized = true;
  }

  async getProvider(type: LLMProviderType): Promise<LLMProvider> {
    if (!this.initialized) {
      await this.initialize();
    }

    const provider = this.providers.get(type);
    if (!provider) {
      throw new Error(`LLM provider '${type}' not available`);
    }

    return provider;
  }

  getAvailableProviders(): Array<{ type: LLMProviderType; name: string; models: string[] }> {
    const available = [];
    
    for (const [type, provider] of this.providers.entries()) {
      if (provider.isAvailable()) {
        available.push({
          type,
          name: provider.name,
          models: provider.getSupportedModels(),
        });
      }
    }

    return available;
  }

  isProviderAvailable(type: LLMProviderType): boolean {
    const provider = this.providers.get(type);
    return provider ? provider.isAvailable() : false;
  }
}