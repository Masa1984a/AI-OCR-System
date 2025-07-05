import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { LLMProviderFactory } from './llm-provider.factory';

describe('LLMProviderFactory', () => {
  let factory: LLMProviderFactory;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LLMProviderFactory,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config = {
                ANTHROPIC_API_KEY: 'test-claude-key',
                OPENAI_API_KEY: 'test-openai-key',
                GEMINI_API_KEY: 'test-gemini-key',
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    factory = module.get<LLMProviderFactory>(LLMProviderFactory);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(factory).toBeDefined();
  });

  it('should initialize providers with API keys', async () => {
    await factory.initialize();
    const availableProviders = factory.getAvailableProviders();
    
    expect(availableProviders).toHaveLength(3);
    expect(availableProviders.map(p => p.type)).toEqual(
      expect.arrayContaining(['claude', 'chatgpt', 'gemini'])
    );
  });

  it('should get specific provider', async () => {
    await factory.initialize();
    const claudeProvider = await factory.getProvider('claude');
    
    expect(claudeProvider).toBeDefined();
    expect(claudeProvider.name).toBe('Claude');
  });

  it('should throw error for unavailable provider', async () => {
    await factory.initialize();
    
    await expect(factory.getProvider('unknown' as any)).rejects.toThrow(
      "LLM provider 'unknown' not available"
    );
  });

  it('should check provider availability', async () => {
    await factory.initialize();
    
    expect(factory.isProviderAvailable('claude')).toBe(true);
    expect(factory.isProviderAvailable('unknown' as any)).toBe(false);
  });
});