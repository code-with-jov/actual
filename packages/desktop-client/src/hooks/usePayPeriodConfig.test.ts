import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { usePayPeriodConfig } from './usePayPeriodConfig';
import { useSyncedPref } from './useSyncedPref';

// Mock the useSyncedPref hook
vi.mock('./useSyncedPref', () => ({
  useSyncedPref: vi.fn(),
}));

describe('usePayPeriodConfig', () => {
  it('should return default config when no data is provided', () => {
    const mockUseSyncedPref = vi.mocked(useSyncedPref);
    mockUseSyncedPref
      .mockReturnValueOnce(['', vi.fn()]) // configJson
      .mockReturnValueOnce(['false', vi.fn()]); // enabled

    const { result } = renderHook(() => usePayPeriodConfig());

    expect(result.current.config).toEqual({
      enabled: false,
      payPeriods: [],
    });
    expect(result.current.enabled).toBe(false);
  });

  it('should parse valid JSON config', () => {
    const mockConfig = {
      enabled: true,
      payPeriods: [
        {
          id: '1',
          frequency: 'bi-weekly' as const,
          startDate: '2024-01-01',
          amount: 2000,
          source: 'Job 1',
          isActive: true,
        },
      ],
    };

    const mockUseSyncedPref = vi.mocked(useSyncedPref);
    mockUseSyncedPref
      .mockReturnValueOnce([JSON.stringify(mockConfig), vi.fn()]) // configJson
      .mockReturnValueOnce(['true', vi.fn()]); // enabled

    const { result } = renderHook(() => usePayPeriodConfig());

    expect(result.current.config).toEqual(mockConfig);
    expect(result.current.enabled).toBe(true);
  });

  it('should handle invalid JSON gracefully', () => {
    const mockUseSyncedPref = vi.mocked(useSyncedPref);
    mockUseSyncedPref
      .mockReturnValueOnce(['invalid json', vi.fn()]) // configJson
      .mockReturnValueOnce(['true', vi.fn()]); // enabled

    const { result } = renderHook(() => usePayPeriodConfig());

    expect(result.current.config).toEqual({
      enabled: false,
      payPeriods: [],
    });
    expect(result.current.enabled).toBe(true);
  });
}); 