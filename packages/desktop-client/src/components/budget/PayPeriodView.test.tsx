import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { PayPeriodView } from './PayPeriodView';

import { usePayPeriodConfig } from '@desktop-client/hooks/usePayPeriodConfig';
import { usePayPeriodCalculations } from '@desktop-client/hooks/usePayPeriodCalculations';

vi.mock('@desktop-client/hooks/usePayPeriodConfig');
vi.mock('@desktop-client/hooks/usePayPeriodCalculations');

const mockUsePayPeriodConfig = vi.mocked(usePayPeriodConfig);
const mockUsePayPeriodCalculations = vi.mocked(usePayPeriodCalculations);

describe('PayPeriodView', () => {
  it('should show no pay periods message when no pay periods are configured', () => {
    mockUsePayPeriodConfig.mockReturnValue({
      config: {
        enabled: false,
        payPeriods: [],
      },
      enabled: false,
      updateConfig: vi.fn(),
      setEnabled: vi.fn(),
    });

    mockUsePayPeriodCalculations.mockReturnValue({
      currentPeriod: null,
      nextPeriod: null,
      previousPeriod: null,
      upcomingPeriods: [],
      historicalPeriods: [],
      totalIncomeForMonth: vi.fn(),
      totalIncomeForRange: vi.fn(),
    });

    render(<PayPeriodView />);

    expect(screen.getByText('No Pay Periods Configured')).toBeInTheDocument();
    expect(screen.getByText(/To use pay period budgeting/)).toBeInTheDocument();
  });

  it('should show pay period overview when pay periods are configured', () => {
    mockUsePayPeriodConfig.mockReturnValue({
      config: {
        enabled: true,
        payPeriods: [
          {
            id: '1',
            frequency: 'bi-weekly',
            startDate: '2024-01-01',
            amount: 2000,
            source: 'Job 1',
            isActive: true,
          },
        ],
      },
      enabled: true,
      updateConfig: vi.fn(),
      setEnabled: vi.fn(),
    });

    mockUsePayPeriodCalculations.mockReturnValue({
      currentPeriod: {
        id: '1-0',
        startDate: '2024-01-01',
        endDate: '2024-01-14',
        amount: 2000,
        source: 'Job 1',
        isActive: true,
      },
      nextPeriod: {
        id: '1-1',
        startDate: '2024-01-15',
        endDate: '2024-01-28',
        amount: 2000,
        source: 'Job 1',
        isActive: true,
      },
      previousPeriod: null,
      upcomingPeriods: [
        {
          id: '1-1',
          startDate: '2024-01-15',
          endDate: '2024-01-28',
          amount: 2000,
          source: 'Job 1',
          isActive: true,
        },
      ],
      historicalPeriods: [],
      totalIncomeForMonth: vi.fn(),
      totalIncomeForRange: vi.fn(),
    });

    render(<PayPeriodView />);

    expect(screen.getByText('Pay Period Overview')).toBeInTheDocument();
    expect(screen.getByText('Current Pay Period')).toBeInTheDocument();
    expect(screen.getByText('Next Pay Period')).toBeInTheDocument();
    expect(screen.getByText('Upcoming Pay Periods')).toBeInTheDocument();
    expect(screen.getByText('Pay Period Configuration')).toBeInTheDocument();
  });
}); 