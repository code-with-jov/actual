import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { type Locale } from 'date-fns';
import * as locales from 'date-fns/locale';
import { MemoryRouter } from 'react-router';

import { PayPeriodPicker } from './PayPeriodPicker';

import { usePayPeriodCalculations } from '@desktop-client/hooks/usePayPeriodCalculations';
import { useLocale } from '@desktop-client/hooks/useLocale';

vi.mock('@desktop-client/hooks/usePayPeriodCalculations');
vi.mock('@desktop-client/hooks/useLocale');

const mockUsePayPeriodCalculations = vi.mocked(usePayPeriodCalculations);
const mockUseLocale = vi.mocked(useLocale);

describe('PayPeriodPicker', () => {
  beforeEach(() => {
    mockUseLocale.mockReturnValue(locales.enUS);
  });
  const mockPeriod = {
    id: 'test-period-1',
    startDate: '2024-01-01',
    endDate: '2024-01-15',
    amount: 2000,
    source: 'Job 1',
    isActive: true,
  };

  it('should render pay period picker with current period', () => {
    mockUsePayPeriodCalculations.mockReturnValue({
      currentPeriod: mockPeriod,
      nextPeriod: {
        id: 'test-period-2',
        startDate: '2024-01-16',
        endDate: '2024-01-31',
        amount: 2000,
        source: 'Job 1',
        isActive: true,
      },
      previousPeriod: null,
      upcomingPeriods: [],
      historicalPeriods: [],
      totalIncomeForMonth: vi.fn(),
      totalIncomeForRange: vi.fn(),
    });

    render(
      <PayPeriodPicker
        startPeriod={mockPeriod}
        numDisplayed={1}
        style={{}}
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getByTitle('Current Pay Period')).toBeInTheDocument();
    expect(screen.getByTitle('Previous pay period')).toBeInTheDocument();
    expect(screen.getByTitle('Next pay period')).toBeInTheDocument();
  });

  it('should handle no pay periods gracefully', () => {
    mockUsePayPeriodCalculations.mockReturnValue({
      currentPeriod: null,
      nextPeriod: null,
      previousPeriod: null,
      upcomingPeriods: [],
      historicalPeriods: [],
      totalIncomeForMonth: vi.fn(),
      totalIncomeForRange: vi.fn(),
    });

    render(
      <PayPeriodPicker
        startPeriod={mockPeriod}
        numDisplayed={1}
        style={{}}
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getByTitle('Current Pay Period')).toBeInTheDocument();
  });
}); 