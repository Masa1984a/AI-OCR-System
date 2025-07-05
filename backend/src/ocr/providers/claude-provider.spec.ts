import { ClaudeProvider } from './claude-provider';

// Mock Anthropic SDK
jest.mock('@anthropic-ai/sdk', () => {
  return jest.fn().mockImplementation(() => ({
    messages: {
      create: jest.fn(),
    },
  }));
});

describe('ClaudeProvider', () => {
  let provider: ClaudeProvider;

  beforeEach(() => {
    provider = new ClaudeProvider();
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
    expect(provider.name).toBe('Claude');
  });

  it('should initialize with config', async () => {
    const config = {
      apiKey: 'test-api-key',
      model: 'claude-3-5-sonnet-20241022',
    };

    await provider.initialize(config);
    
    expect(provider.isAvailable()).toBe(true);
  });

  it('should return supported models', () => {
    const models = provider.getSupportedModels();
    
    expect(models).toContain('claude-3-5-sonnet-20241022');
    expect(models).toContain('claude-4-sonnet-20250514');
    expect(models.length).toBeGreaterThan(0);
  });

  it('should throw error when not initialized', async () => {
    await expect(provider.processImage('image', 'prompt')).rejects.toThrow(
      'Claude provider not properly initialized'
    );
  });
});