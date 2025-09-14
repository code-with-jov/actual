// @ts-strict-ignore
import { useCallback } from 'react';

import { type PayPeriodConfig } from 'loot-core/shared/pay-periods';
import { usePayPeriodConfigContext } from '@desktop-client/contexts/PayPeriodConfigContext';

export interface UsePayPeriodConfigResult {
  config: PayPeriodConfig | null;
  isEnabled: boolean;
  isLoading: boolean;
  error: string | null;
  updateConfig: (updates: Partial<PayPeriodConfig>) => void;
  setEnabled: (enabled: boolean) => void;
  setFrequency: (frequency: PayPeriodConfig['payFrequency']) => void;
  setStartDate: (startDate: string) => void;
}

/**
 * Hook for accessing and managing pay period configuration.
 * 
 * @returns PayPeriodConfigResult with config state and update methods
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { config, isEnabled, setEnabled, setFrequency } = usePayPeriodConfig();
 *   
 *   return (
 *     <div>
 *       <input 
 *         type="checkbox" 
 *         checked={isEnabled} 
 *         onChange={(e) => setEnabled(e.target.checked)} 
 *       />
 *       <select 
 *         value={config?.payFrequency || 'monthly'} 
 *         onChange={(e) => setFrequency(e.target.value)}
 *       >
 *         <option value="weekly">Weekly</option>
 *         <option value="biweekly">Biweekly</option>
 *         <option value="monthly">Monthly</option>
 *       </select>
 *     </div>
 *   );
 * }
 * ```
 */
export function usePayPeriodConfig(): UsePayPeriodConfigResult {
  const context = usePayPeriodConfigContext();
  
  return {
    config: context.config,
    isEnabled: context.isEnabled,
    isLoading: context.isLoading,
    error: context.error,
    updateConfig: context.updateConfig,
    setEnabled: context.setEnabled,
    setFrequency: context.setFrequency,
    setStartDate: context.setStartDate,
  };
}

/**
 * Hook for checking if pay periods are enabled without subscribing to config changes.
 * Useful for conditional rendering or feature gates.
 * 
 * @returns boolean indicating if pay periods are enabled
 */
export function usePayPeriodEnabled(): boolean {
  const { isEnabled } = usePayPeriodConfig();
  return isEnabled;
}

/**
 * Hook for getting the current pay period configuration without update methods.
 * Useful when you only need to read the config.
 * 
 * @returns PayPeriodConfig | null
 */
export function usePayPeriodConfigValue(): PayPeriodConfig | null {
  const { config } = usePayPeriodConfig();
  return config;
}
