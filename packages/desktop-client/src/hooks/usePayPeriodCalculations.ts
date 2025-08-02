import { useMemo } from 'react';

import {
  type PayPeriodCalculation,
  calculatePayPeriods,
  calculateIncomeForRange,
} from 'loot-core/shared/payPeriods';

import { usePayPeriodConfig } from './usePayPeriodConfig';

export function usePayPeriodCalculations(
  today?: string,
): PayPeriodCalculation & {
  totalIncomeForMonth: (month: string) => number;
  totalIncomeForRange: (startDate: string, endDate: string) => number;
} {
  const { config } = usePayPeriodConfig();
  
  const calculations = useMemo(() => {
    return calculatePayPeriods(config.payPeriods, today);
  }, [config.payPeriods, today]);

  const totalIncomeForMonth = useMemo(() => {
    return (month: string) => {
      // Convert month (YYYY-MM) to date range
      const startDate = `${month}-01`;
      const endDate = `${month}-31`; // This will be adjusted by the calculation
      return calculateIncomeForRange(config.payPeriods, startDate, endDate);
    };
  }, [config.payPeriods]);

  const totalIncomeForRange = useMemo(() => {
    return (startDate: string, endDate: string) => {
      return calculateIncomeForRange(config.payPeriods, startDate, endDate);
    };
  }, [config.payPeriods]);

  return {
    ...calculations,
    totalIncomeForMonth,
    totalIncomeForRange,
  };
} 