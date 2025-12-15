import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { calculateSEOScore, generateSlug, calculateReadingTime } from '@/services/useBlog';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => ({
          data: [],
          error: null,
        })),
        eq: vi.fn(() => ({
          single: vi.fn(() => ({
            data: null,
            error: null,
          })),
        })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => ({
            data: { id: 'test-id' },
            error: null,
          })),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          data: null,
          error: null,
        })),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => ({
          data: null,
          error: null,
        })),
      })),
    })),
    functions: {
      invoke: vi.fn(() => ({
        data: { success: true },
        error: null,
      })),
    },
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(() => ({
          data: { path: 'test.png' },
          error: null,
        })),
        getPublicUrl: vi.fn(() => ({
          data: { publicUrl: 'https://example.com/test.png' },
        })),
      })),
    },
  },
}));

describe('useBlog utilities', () => {
  describe('generateSlug', () => {
    it('should convert title to lowercase slug', () => {
      expect(generateSlug('Hello World')).toBe('hello-world');
    });

    it('should replace special characters with hyphens', () => {
      expect(generateSlug('Hello, World! How are you?')).toBe('hello-world-how-are-you');
    });

    it('should remove leading and trailing hyphens', () => {
      expect(generateSlug('  Hello World  ')).toBe('hello-world');
    });

    it('should handle multiple spaces and special chars', () => {
      expect(generateSlug('The   Best   HR   Software!!!')).toBe('the-best-hr-software');
    });

    it('should handle numbers', () => {
      expect(generateSlug('Top 10 HR Tips for 2024')).toBe('top-10-hr-tips-for-2024');
    });
  });

  describe('calculateReadingTime', () => {
    it('should calculate reading time for short content', () => {
      const content = 'This is a short blog post with just a few words.';
      expect(calculateReadingTime(content)).toBe(1);
    });

    it('should calculate reading time for longer content', () => {
      // 400 words at 200 wpm = 2 minutes
      const content = Array(400).fill('word').join(' ');
      expect(calculateReadingTime(content)).toBe(2);
    });

    it('should return minimum 1 minute for very short content', () => {
      expect(calculateReadingTime('Hello')).toBe(1);
    });

    it('should handle empty content', () => {
      expect(calculateReadingTime('')).toBe(1);
    });

    it('should strip HTML tags before counting', () => {
      const content = '<p>This is <strong>bold</strong> and <em>italic</em> text.</p>';
      expect(calculateReadingTime(content)).toBe(1);
    });
  });

  describe('calculateSEOScore', () => {
    const basePost = {
      title: 'Best HR Software for Small Business in 2024',
      content: '<p>HR software helps businesses manage their employees.</p>',
      meta_description: 'Discover the best HR software for small business.',
      focus_keyword: 'HR software',
    };

    it('should give high score for well-optimized post', () => {
      const post = {
        ...basePost,
        content: `
          <h2>Why HR Software Matters</h2>
          <p>HR software is essential for modern businesses. The best HR software helps streamline operations and improve employee satisfaction.</p>
          <h2>Top HR Software Features</h2>
          <p>When choosing HR software, look for these features. Good HR software should include attendance tracking, leave management, and performance reviews.</p>
          <h3>Benefits of HR Software</h3>
          <p>Implementing HR software can transform your business. HR software reduces manual work and increases efficiency.</p>
          ${Array(100).fill('Content words for length. ').join('')}
        `,
      };
      const score = calculateSEOScore(post);
      expect(score).toBeGreaterThan(70);
    });

    it('should penalize missing focus keyword in title', () => {
      const postWithKeyword = { ...basePost };
      const postWithoutKeyword = { ...basePost, title: 'Software Guide for Businesses' };
      
      const scoreWith = calculateSEOScore(postWithKeyword);
      const scoreWithout = calculateSEOScore(postWithoutKeyword);
      
      expect(scoreWith).toBeGreaterThan(scoreWithout);
    });

    it('should penalize missing meta description', () => {
      const postWithMeta = { ...basePost };
      const postWithoutMeta = { ...basePost, meta_description: '' };
      
      const scoreWith = calculateSEOScore(postWithMeta);
      const scoreWithout = calculateSEOScore(postWithoutMeta);
      
      expect(scoreWith).toBeGreaterThan(scoreWithout);
    });

    it('should penalize very short content', () => {
      const longPost = { 
        ...basePost, 
        content: Array(600).fill('word ').join('') 
      };
      const shortPost = { 
        ...basePost, 
        content: 'Very short content.' 
      };
      
      const longScore = calculateSEOScore(longPost);
      const shortScore = calculateSEOScore(shortPost);
      
      expect(longScore).toBeGreaterThan(shortScore);
    });

    it('should reward presence of H2 headings', () => {
      const postWithH2 = { 
        ...basePost, 
        content: '<h2>Section One</h2><p>Content</p><h2>Section Two</h2><p>More content</p>' 
      };
      const postWithoutH2 = { 
        ...basePost, 
        content: '<p>Content without headings</p>' 
      };
      
      const scoreWith = calculateSEOScore(postWithH2);
      const scoreWithout = calculateSEOScore(postWithoutH2);
      
      expect(scoreWith).toBeGreaterThan(scoreWithout);
    });

    it('should handle missing focus keyword gracefully', () => {
      const postNoKeyword = { ...basePost, focus_keyword: '' };
      const score = calculateSEOScore(postNoKeyword);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should cap score at 100', () => {
      const perfectPost = {
        title: 'Complete HR Software Guide - Best HR Software for 2024',
        content: `
          <h2>HR Software Introduction</h2>
          <p>HR software is the cornerstone of modern business. Let's explore HR software options.</p>
          <h2>Benefits of HR Software</h2>
          <p>The benefits of HR software include efficiency and accuracy. HR software saves time.</p>
          <h3>HR Software Features</h3>
          <p>Key HR software features include leave tracking. Modern HR software also offers KPI management.</p>
          <a href="/features">Learn more about our HR software</a>
          <img src="image.jpg" alt="HR software dashboard showing employee data" />
          ${Array(200).fill('More content about HR software and best practices. ').join('')}
        `,
        meta_description: 'Comprehensive guide to choosing the best HR software for your small business. Learn about HR software features.',
        focus_keyword: 'HR software',
      };
      const score = calculateSEOScore(perfectPost);
      expect(score).toBeLessThanOrEqual(100);
    });
  });
});
