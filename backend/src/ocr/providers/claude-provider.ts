import { BaseLLMProvider } from './base-llm-provider';
import { LLMProviderConfig, LLMResponse } from './llm-provider.interface';
import Anthropic from '@anthropic-ai/sdk';

export class ClaudeProvider extends BaseLLMProvider {
  private client: Anthropic;

  constructor() {
    super('Claude');
  }

  async initialize(config: LLMProviderConfig): Promise<void> {
    await super.initialize(config);
    this.client = new Anthropic({
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
      const messages: Anthropic.MessageParam[] = [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/png',
                data: imageBase64,
              },
            },
            {
              type: 'text',
              text: prompt,
            },
          ],
        },
      ];

      const response = await this.client.messages.create({
        model: this.config.model || 'claude-3-5-sonnet-20241022',
        max_tokens: this.config.maxTokens || 4000,
        temperature: this.config.temperature ?? 0,
        messages,
        ...(systemPrompt && { system: systemPrompt }),
      });

      const content = response.content
        .filter((c) => c.type === 'text')
        .map((c) => (c as Anthropic.TextBlock).text)
        .join('');

      return {
        content,
        usage: {
          promptTokens: response.usage.input_tokens,
          completionTokens: response.usage.output_tokens,
          totalTokens: response.usage.input_tokens + response.usage.output_tokens,
        },
      };
    } catch (error) {
      this.logger.error('Claude API error:', error);
      throw new Error(`Claude API error: ${error.message}`);
    }
  }

  getSupportedModels(): string[] {
    return [
      'claude-3-5-sonnet-20241022',
      'claude-3-5-haiku-20241022',
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307',
      'claude-4-sonnet-20250514',
    ];
  }
}