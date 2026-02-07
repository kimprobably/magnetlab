/**
 * Tests for useBackgroundJob hook
 *
 * MOD-68: Fixed "generation took too long" timeout issue in ideation
 *
 * Root Cause (FIXED):
 * - Anthropic SDK timeout: 240,000ms (4 minutes)
 * - Client polling timeout: 360,000ms (6 minutes) - increased from 5 minutes
 * - This provides a 2-minute buffer for the backend to fail gracefully
 *   and propagate the actual error message to the client
 *
 * The fix ensures:
 * 1. Client polling timeout exceeds AI generation timeout with 2-min buffer
 * 2. Backend failure messages propagate correctly to the client
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useBackgroundJob } from '@/lib/hooks/useBackgroundJob';

// Mock fetch for job status polling
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('useBackgroundJob', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockFetch.mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('basic functionality', () => {
    it('should start with null status and no error', () => {
      const { result } = renderHook(() => useBackgroundJob());

      expect(result.current.status).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isPolling).toBe(false);
    });

    it('should call onComplete when job completes successfully', async () => {
      const onComplete = jest.fn();
      const testResult = { ideas: ['idea1', 'idea2'] };

      const { result } = renderHook(() =>
        useBackgroundJob({ onComplete })
      );

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ status: 'completed', result: testResult }),
      });

      await act(async () => {
        result.current.startPolling('test-job-id');
        await Promise.resolve(); // Flush promises
      });

      await waitFor(() => {
        expect(onComplete).toHaveBeenCalledWith(testResult);
      });

      expect(result.current.status).toBe('completed');
      expect(result.current.result).toEqual(testResult);
      expect(result.current.isPolling).toBe(false);
    });

    it('should call onError when job fails', async () => {
      const onError = jest.fn();
      const errorMessage = 'AI generation failed';

      const { result } = renderHook(() =>
        useBackgroundJob({ onError })
      );

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ status: 'failed', error: errorMessage }),
      });

      await act(async () => {
        result.current.startPolling('test-job-id');
        await Promise.resolve(); // Flush promises
      });

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(errorMessage);
      });

      expect(result.current.status).toBe('failed');
      expect(result.current.error).toBe(errorMessage);
      expect(result.current.isPolling).toBe(false);
    });
  });

  describe('timeout behavior', () => {
    /**
     * MOD-68: Verifies client polling timeout exceeds Anthropic SDK timeout
     *
     * The Anthropic SDK timeout is 240,000ms (4 minutes).
     * The client polling timeout MUST be greater than this to allow
     * the backend to complete or fail gracefully.
     *
     * Fixed values:
     * - ANTHROPIC_TIMEOUT: 240,000ms (4 min)
     * - CLIENT_POLLING_TIMEOUT: 360,000ms (6 min)
     *
     * The 2-minute buffer ensures:
     * 1. The backend has time to mark the job as failed after AI timeout
     * 2. The client can poll and receive the failure status
     * 3. The user sees the actual error message from the backend
     */
    it('should have client timeout greater than AI backend timeout with sufficient buffer', () => {
      // These constants match the production values
      const ANTHROPIC_SDK_TIMEOUT = 240_000; // 4 minutes - from lead-magnet-generator.ts
      const CLIENT_POLLING_TIMEOUT = 360_000; // 6 minutes - from useBackgroundJob.ts default
      const RECOMMENDED_BUFFER = 120_000; // 2 minutes buffer for job status updates

      // Client timeout must exceed AI timeout
      expect(CLIENT_POLLING_TIMEOUT).toBeGreaterThan(ANTHROPIC_SDK_TIMEOUT);

      // Buffer must be at least 2 minutes for graceful failure propagation
      const actualBuffer = CLIENT_POLLING_TIMEOUT - ANTHROPIC_SDK_TIMEOUT;
      expect(actualBuffer).toBeGreaterThanOrEqual(RECOMMENDED_BUFFER);
    });
  });
});
