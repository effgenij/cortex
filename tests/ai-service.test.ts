import { describe, it, expect } from 'vitest';
import type { AIService, VideoSummary } from '@/core/ai/types';

describe('AIService interface', () => {
  it('defines required methods', () => {
    const methods: (keyof AIService)[] = ['name', 'summarize', 'chat', 'reviewPR'];

    const mockService: AIService = {
      name: 'test',
      summarize: async () => ({
        title: 'Test',
        keyPoints: [],
        timestamps: [],
      }),
      chat: async () => ({ message: 'ok' }),
      reviewPR: async () => ({
        summary: 'lgtm',
        issues: [],
        suggestions: [],
      }),
    };

    for (const method of methods) {
      expect(mockService[method]).toBeDefined();
    }
  });

  it('VideoSummary has correct shape', () => {
    const summary: VideoSummary = {
      title: 'Introduction',
      keyPoints: ['Point 1', 'Point 2'],
      timestamps: [{ time: '00:30', label: 'Start' }],
      practicePrompt: 'Build a counter',
    };

    expect(typeof summary.title).toBe('string');
    expect(Array.isArray(summary.keyPoints)).toBe(true);
    expect(Array.isArray(summary.timestamps)).toBe(true);
  });
});
