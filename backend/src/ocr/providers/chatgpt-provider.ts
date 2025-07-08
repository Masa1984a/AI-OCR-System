import { BaseLLMProvider } from './base-llm-provider';
import { LLMProviderConfig, LLMResponse } from './llm-provider.interface';
import OpenAI from 'openai';

export class ChatGPTProvider extends BaseLLMProvider {
  private client: OpenAI;

  constructor() {
    super('ChatGPT');
  }

  async initialize(config: LLMProviderConfig): Promise<void> {
    await super.initialize(config);
    this.client = new OpenAI({
      apiKey: config.apiKey,
    });
  }

  async processImage(
    imageBase64: string,
    prompt: string,
    systemPrompt?: string
  ): Promise<LLMResponse> {
    this.validateConfig();

    try {
      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];
      
      if (systemPrompt) {
        messages.push({
          role: 'system',
          content: systemPrompt,
        });
      }

      messages.push({
        role: 'user',
        content: [
          {
            type: 'text',
            text: prompt,
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:image/png;base64,${imageBase64}`,
              detail: 'high',
            },
          },
        ],
      });

      const response = await this.client.chat.completions.create({
        model: this.config.model || 'gpt-4o',
        messages,
        max_tokens: this.config.maxTokens || 4000,
        temperature: this.config.temperature ?? 0,
        response_format: { type: 'text' },
      });

      const content = response.choices[0]?.message?.content || '';

      return {
        content,
        usage: response.usage ? {
          promptTokens: response.usage.prompt_tokens,
          completionTokens: response.usage.completion_tokens,
          totalTokens: response.usage.total_tokens,
        } : undefined,
      };
    } catch (error) {
      this.logger.error('ChatGPT API error:', error);
      throw new Error(`ChatGPT API error: ${error.message}`);
    }
  }

  getSupportedModels(): string[] {
    return [
      'gpt-4o',
      'gpt-4o-mini',
      'gpt-4-turbo',
      'gpt-4-turbo-preview',
      'gpt-4-vision-preview',
      'gpt-4',
    ];
  }
}