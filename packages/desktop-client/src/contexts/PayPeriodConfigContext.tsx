// @ts-strict-ignore
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

import { type PayPeriodConfig } from 'loot-core/shared/pay-periods';
import { useFeatureFlag } from '@desktop-client/hooks/useFeatureFlag';
import { useSyncedPref } from '@desktop-client/hooks/useSyncedPref';

interface PayPeriodConfigContextValue {
  config: PayPeriodConfig | null;
  isEnabled: boolean;
  isLoading: boolean;
  error: string | null;
  updateConfig: (updates: Partial<PayPeriodConfig>) => void;
  setEnabled: (enabled: boolean) => void;
  setFrequency: (frequency: PayPeriodConfig['payFrequency']) => void;
  setStartDate: (startDate: string) => void;
}

const PayPeriodConfigContext = createContext<PayPeriodConfigContextValue | undefined>(undefined);

interface PayPeriodConfigProviderProps {
  children: React.ReactNode;
}

export function PayPeriodConfigProvider({ children }: PayPeriodConfigProviderProps) {
  const payPeriodsEnabled = useFeatureFlag('payPeriodsEnabled');
  const [showPayPeriods, setShowPayPeriods] = useSyncedPref('showPayPeriods');
  const [payPeriodFrequency, setPayPeriodFrequency] = useSyncedPref('payPeriodFrequency');
  const [payPeriodStartDate, setPayPeriodStartDate] = useSyncedPref('payPeriodStartDate');
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Build the effective config
  const config: PayPeriodConfig | null = React.useMemo(() => {
    if (!payPeriodsEnabled || String(showPayPeriods) !== 'true') {
      return null;
    }

    return {
      enabled: true,
      payFrequency: (payPeriodFrequency as PayPeriodConfig['payFrequency']) || 'monthly',
      startDate: payPeriodStartDate || new Date().toISOString().split('T')[0],
    };
  }, [payPeriodsEnabled, showPayPeriods, payPeriodFrequency, payPeriodStartDate]);

  const isEnabled = config?.enabled === true;

  const updateConfig = useCallback((updates: Partial<PayPeriodConfig>) => {
    setIsLoading(true);
    setError(null);
    
    try {
      if (updates.enabled !== undefined) {
        setShowPayPeriods(updates.enabled ? 'true' : 'false');
      }
      if (updates.payFrequency !== undefined) {
        setPayPeriodFrequency(updates.payFrequency);
      }
      if (updates.startDate !== undefined) {
        setPayPeriodStartDate(updates.startDate);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update pay period config');
    } finally {
      setIsLoading(false);
    }
  }, [setShowPayPeriods, setPayPeriodFrequency, setPayPeriodStartDate]);

  const setEnabled = useCallback((enabled: boolean) => {
    updateConfig({ enabled });
  }, [updateConfig]);

  const setFrequency = useCallback((frequency: PayPeriodConfig['payFrequency']) => {
    updateConfig({ payFrequency: frequency });
  }, [updateConfig]);

  const setStartDate = useCallback((startDate: string) => {
    updateConfig({ startDate });
  }, [updateConfig]);

  const contextValue: PayPeriodConfigContextValue = {
    config,
    isEnabled,
    isLoading,
    error,
    updateConfig,
    setEnabled,
    setFrequency,
    setStartDate,
  };

  return (
    <PayPeriodConfigContext.Provider value={contextValue}>
      {children}
    </PayPeriodConfigContext.Provider>
  );
}

export function usePayPeriodConfigContext(): PayPeriodConfigContextValue {
  const context = useContext(PayPeriodConfigContext);
  if (context === undefined) {
    throw new Error('usePayPeriodConfigContext must be used within a PayPeriodConfigProvider');
  }
  return context;
}
