// @ts-strict-ignore
import React, { type ComponentProps, memo } from 'react';

import { View } from '@actual-app/components/view';

import { MonthPicker } from './MonthPicker';
import { getScrollbarWidth } from './util';

import { useFeatureFlag } from '@desktop-client/hooks/useFeatureFlag';
import { useGlobalPref } from '@desktop-client/hooks/useGlobalPref';
import { usePayPeriodConfig } from '@desktop-client/hooks/usePayPeriodConfig';

type BudgetPageHeaderProps = {
  startMonth: string;
  onMonthSelect: (month: string) => void;
  numMonths: number;
  monthBounds: ComponentProps<typeof MonthPicker>['monthBounds'];
};

export const BudgetPageHeader = memo<BudgetPageHeaderProps>(
  ({ startMonth, onMonthSelect, numMonths, monthBounds }) => {
    const [categoryExpandedStatePref] = useGlobalPref('categoryExpandedState');
    const categoryExpandedState = categoryExpandedStatePref ?? 0;
    const offsetMultipleMonths = numMonths === 1 ? 4 : 0;
    const payPeriodFeatureFlagEnabled = useFeatureFlag('payPeriodsEnabled');
    const { isEnabled: payPeriodViewEnabled, setEnabled: setPayPeriodViewEnabled, isLoading } = usePayPeriodConfig();

    return (
      <View
        style={{
          marginLeft:
            200 + 100 * categoryExpandedState + 5 - offsetMultipleMonths,
          flexShrink: 0,
        }}
      >
        {payPeriodFeatureFlagEnabled && (
          <View style={{ alignItems: 'center', marginBottom: 5 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input
                type="checkbox"
                checked={payPeriodViewEnabled}
                onChange={e => setPayPeriodViewEnabled(e.target.checked)}
                disabled={isLoading}
              />
              <span>Show pay periods</span>
              {isLoading && <span style={{ fontSize: '12px', color: '#666' }}>(Loading...)</span>}
            </label>
          </View>
        )}
        <View
          style={{
            marginRight: 5 + getScrollbarWidth() - offsetMultipleMonths,
          }}
        >
          <MonthPicker
            startMonth={startMonth}
            numDisplayed={numMonths}
            monthBounds={monthBounds}
            style={{ paddingTop: 5 }}
            onSelect={month => onMonthSelect(month)}
          />
        </View>
      </View>
    );
  },
);

BudgetPageHeader.displayName = 'BudgetPageHeader';
