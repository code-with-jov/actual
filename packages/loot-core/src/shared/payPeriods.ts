import * as d from 'date-fns';

import { type PayPeriodConfig, type PayPeriodFrequency } from '../types/prefs';
import * as monthUtils from './months';

export interface PayPeriod {
  id: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  amount: number;
  source: string;
  isActive: boolean;
}

export interface PayPeriodCalculation {
  currentPeriod: PayPeriod | null;
  nextPeriod: PayPeriod | null;
  previousPeriod: PayPeriod | null;
  upcomingPeriods: PayPeriod[];
  historicalPeriods: PayPeriod[];
}

/**
 * Calculate the next pay period date based on frequency and start date
 */
export function calculateNextPayPeriod(
  startDate: string,
  frequency: PayPeriodFrequency,
): string {
  const date = monthUtils.parseDate(startDate);
  
  switch (frequency) {
    case 'weekly':
      return monthUtils.format(monthUtils.addWeeks(date, 1), 'yyyy-MM-dd');
    case 'bi-weekly':
      return monthUtils.format(monthUtils.addWeeks(date, 2), 'yyyy-MM-dd');
    case 'semi-monthly':
      // Semi-monthly is typically 15th and last day of month
      const day = date.getDate();
      if (day <= 15) {
        // Next period is last day of current month
        const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
        return monthUtils.format(lastDay, 'yyyy-MM-dd');
      } else {
        // Next period is 15th of next month
        const nextMonth = new Date(date.getFullYear(), date.getMonth() + 1, 15);
        return monthUtils.format(nextMonth, 'yyyy-MM-dd');
      }
    case 'monthly':
      return monthUtils.format(monthUtils.addMonths(date, 1), 'yyyy-MM-dd');
    case 'custom':
      // For custom, assume monthly as fallback
      return monthUtils.format(monthUtils.addMonths(date, 1), 'yyyy-MM-dd');
    default:
      return monthUtils.format(monthUtils.addWeeks(date, 2), 'yyyy-MM-dd');
  }
}

/**
 * Calculate the previous pay period date based on frequency and start date
 */
export function calculatePreviousPayPeriod(
  startDate: string,
  frequency: PayPeriodFrequency,
): string {
  const date = monthUtils.parseDate(startDate);
  
  switch (frequency) {
    case 'weekly':
      return monthUtils.format(monthUtils.subWeeks(date, 1), 'yyyy-MM-dd');
    case 'bi-weekly':
      return monthUtils.format(monthUtils.subWeeks(date, 2), 'yyyy-MM-dd');
    case 'semi-monthly':
      // Semi-monthly is typically 15th and last day of month
      const day = date.getDate();
      if (day > 15) {
        // Previous period is 15th of current month
        const fifteenth = new Date(date.getFullYear(), date.getMonth(), 15);
        return monthUtils.format(fifteenth, 'yyyy-MM-dd');
      } else {
        // Previous period is last day of previous month
        const lastDayPrevMonth = new Date(date.getFullYear(), date.getMonth(), 0);
        return monthUtils.format(lastDayPrevMonth, 'yyyy-MM-dd');
      }
    case 'monthly':
      return monthUtils.format(monthUtils.subMonths(date, 1), 'yyyy-MM-dd');
    case 'custom':
      // For custom, assume monthly as fallback
      return monthUtils.format(monthUtils.subMonths(date, 1), 'yyyy-MM-dd');
    default:
      return monthUtils.format(monthUtils.subWeeks(date, 2), 'yyyy-MM-dd');
  }
}

/**
 * Calculate the end date of a pay period (day before next pay period)
 */
export function calculatePayPeriodEndDate(
  startDate: string,
  frequency: PayPeriodFrequency,
): string {
  const nextPeriodStart = calculateNextPayPeriod(startDate, frequency);
  const nextPeriodDate = monthUtils.parseDate(nextPeriodStart);
  const endDate = monthUtils.subDays(nextPeriodDate, 1);
  return monthUtils.format(endDate, 'yyyy-MM-dd');
}

/**
 * Generate a series of pay periods from a start date
 */
export function generatePayPeriods(
  config: PayPeriodConfig,
  count: number = 12,
): PayPeriod[] {
  const periods: PayPeriod[] = [];
  let currentDate = config.startDate;
  
  for (let i = 0; i < count; i++) {
    const endDate = calculatePayPeriodEndDate(currentDate, config.frequency);
    
    periods.push({
      id: `${config.id}-${i}`,
      startDate: currentDate,
      endDate,
      amount: config.amount,
      source: config.source,
      isActive: config.isActive,
    });
    
    currentDate = calculateNextPayPeriod(currentDate, config.frequency);
  }
  
  return periods;
}

/**
 * Find the current pay period based on today's date
 */
export function findCurrentPayPeriod(
  config: PayPeriodConfig,
  today: string = monthUtils.currentDay(),
): PayPeriod | null {
  const periods = generatePayPeriods(config, 24); // Generate 2 years worth
  const todayDate = monthUtils.parseDate(today);
  
  return periods.find(period => {
    const startDate = monthUtils.parseDate(period.startDate);
    const endDate = monthUtils.parseDate(period.endDate);
    return todayDate >= startDate && todayDate <= endDate;
  }) || null;
}

/**
 * Calculate all pay period information for a given configuration
 */
export function calculatePayPeriods(
  configs: PayPeriodConfig[],
  today: string = monthUtils.currentDay(),
): PayPeriodCalculation {
  const allPeriods: PayPeriod[] = [];
  
  // Generate periods for each config
  configs.forEach(config => {
    if (config.isActive) {
      allPeriods.push(...generatePayPeriods(config, 24));
    }
  });
  
  // Sort periods by start date
  allPeriods.sort((a, b) => a.startDate.localeCompare(b.startDate));
  
  const todayDate = monthUtils.parseDate(today);
  
  // Find current period
  const currentPeriod = allPeriods.find(period => {
    const startDate = monthUtils.parseDate(period.startDate);
    const endDate = monthUtils.parseDate(period.endDate);
    return todayDate >= startDate && todayDate <= endDate;
  }) || null;
  
  // Find next period
  const nextPeriod = allPeriods.find(period => {
    const startDate = monthUtils.parseDate(period.startDate);
    return startDate > todayDate;
  }) || null;
  
  // Find previous period
  const previousPeriod = allPeriods
    .filter(period => {
      const endDate = monthUtils.parseDate(period.endDate);
      return endDate < todayDate;
    })
    .pop() || null;
  
  // Get upcoming periods (next 6)
  const upcomingPeriods = allPeriods
    .filter(period => {
      const startDate = monthUtils.parseDate(period.startDate);
      return startDate > todayDate;
    })
    .slice(0, 6);
  
  // Get historical periods (last 6)
  const historicalPeriods = allPeriods
    .filter(period => {
      const endDate = monthUtils.parseDate(period.endDate);
      return endDate < todayDate;
    })
    .slice(-6);
  
  return {
    currentPeriod,
    nextPeriod,
    previousPeriod,
    upcomingPeriods,
    historicalPeriods,
  };
}

/**
 * Calculate total income for a given date range
 */
export function calculateIncomeForRange(
  configs: PayPeriodConfig[],
  startDate: string,
  endDate: string,
): number {
  const start = monthUtils.parseDate(startDate);
  const end = monthUtils.parseDate(endDate);
  let totalIncome = 0;
  
  configs.forEach(config => {
    if (!config.isActive) return;
    
    let currentDate = config.startDate;
    let currentDateObj = monthUtils.parseDate(currentDate);
    
    // Generate periods until we exceed the end date
    while (currentDateObj <= end) {
      const periodEnd = calculatePayPeriodEndDate(currentDate, config.frequency);
      const periodEndObj = monthUtils.parseDate(periodEnd);
      
      // Check if this period overlaps with our range
      if (periodEndObj >= start && currentDateObj <= end) {
        totalIncome += config.amount;
      }
      
      currentDate = calculateNextPayPeriod(currentDate, config.frequency);
      currentDateObj = monthUtils.parseDate(currentDate);
    }
  });
  
  return totalIncome;
} 