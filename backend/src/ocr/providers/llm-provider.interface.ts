export interface LLMProviderConfig {
  apiKey: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface LLMResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface LLMProvider {
  name: string;
  
  initialize(config: LLMProviderConfig): Promise<void>;
  
  processImage(
    imageBase64: string,
    prompt: string,
    systemPrompt?: string
  ): Promise<LLMResponse>;
  
  isAvailable(): boolean;
  
  getSupportedModels(): string[];
}