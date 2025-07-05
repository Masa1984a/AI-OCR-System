import { LLMProvider, LLMProviderConfig, LLMResponse } from './llm-provider.interface';
import { Logger } from '@nestjs/common';

export abstract class BaseLLMProvider implements LLMProvider {
  protected logger: Logger;
  protected config: LLMProviderConfig;
  protected initialized = false;

  constructor(public readonly name: string) {
    this.logger = new Logger(this.constructor.name);
  }

  async initialize(config: LLMProviderConfig): Promise<void> {
    this.config = config;
    this.initialized = true;
    this.logger.log(`${this.name} provider initialized`);
  }

  abstract processImage(
    imageBase64: string,
    prompt: string,
    systemPrompt?: string
  ): Promise<LLMResponse>;

  abstract getSupportedModels(): string[];

  isAvailable(): boolean {
    return this.initialized && !!this.config?.apiKey;
  }

  protected validateConfig(): void {
    if (!this.initialized || !this.config?.apiKey) {
      throw new Error(`${this.name} provider not properly initialized`);
    }
  }
}