import { useCallback, useMemo } from 'react';

import { type PayPeriodBudgetingConfig } from 'loot-core/types/prefs';

import { useSyncedPref } from './useSyncedPref';

export function usePayPeriodConfig() {
  const [configJson, setConfigJson] = useSyncedPref('payPeriodBudgetingConfig');
  const [enabledPref, setEnabledPref] = useSyncedPref('payPeriodBudgetingEnabled');

  const config: PayPeriodBudgetingConfig = useMemo(() => {
    if (!configJson) {
      return {
        enabled: false,
        payPeriods: [],
      };
    }

    try {
      return JSON.parse(configJson);
    } catch (error) {
      console.error('Failed to parse pay period config:', error);
      return {
        enabled: false,
        payPeriods: [],
      };
    }
  }, [configJson]);

  const updateConfig = useCallback(
    (newConfig: PayPeriodBudgetingConfig) => {
      setConfigJson(JSON.stringify(newConfig));
    },
    [setConfigJson],
  );

  const setEnabled = useCallback(
    (enabled: boolean) => {
      setEnabledPref(enabled ? 'true' : 'false');
      if (!enabled) {
        // Clear config when disabling
        setConfigJson('');
      }
    },
    [setEnabledPref, setConfigJson],
  );

  return {
    config,
    enabled: enabledPref === 'true',
    updateConfig,
    setEnabled,
  };
} 