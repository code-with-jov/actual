import * as monthUtils from 'loot-core/shared/months';

import { useSyncedPref } from '@desktop-client/hooks/useSyncedPref';

export function useTogglePayPeriods(): {
  payPeriodsActive: boolean;
  togglePayPeriods: () => void;
} {
  const [showPayPeriods, setShowPayPeriods] = useSyncedPref('showPayPeriods');
  const [payPeriodFrequency, setPayPeriodFrequency] =
    useSyncedPref('payPeriodFrequency');
  const [payPeriodStartDate, setPayPeriodStartDate] =
    useSyncedPref('payPeriodStartDate');

  const payPeriodsActive = showPayPeriods === 'true';

  const togglePayPeriods = () => {
    if (!payPeriodsActive) {
      if (!payPeriodStartDate) {
        setPayPeriodStartDate(`${monthUtils.currentMonth()}-01`);
      }
      if (!payPeriodFrequency) {
        setPayPeriodFrequency('monthly');
      }
      setShowPayPeriods('true');
    } else {
      setShowPayPeriods('false');
    }
  };

  return { payPeriodsActive, togglePayPeriods };
}
