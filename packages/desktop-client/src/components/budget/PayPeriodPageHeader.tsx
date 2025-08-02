// @ts-strict-ignore
import React, { type ComponentProps, memo } from 'react';

import { View } from '@actual-app/components/view';

import { PayPeriodPicker } from './PayPeriodPicker';
import { getScrollbarWidth } from './util';

import { useGlobalPref } from '@desktop-client/hooks/useGlobalPref';
import { type PayPeriod } from 'loot-core/shared/payPeriods';

type PayPeriodPageHeaderProps = {
  startPeriod: PayPeriod;
  onPeriodSelect: (period: PayPeriod) => void;
  numPeriods: number;
};

export const PayPeriodPageHeader = memo<PayPeriodPageHeaderProps>(
  ({ startPeriod, onPeriodSelect, numPeriods }) => {
    const [categoryExpandedStatePref] = useGlobalPref('categoryExpandedState');
    const categoryExpandedState = categoryExpandedStatePref ?? 0;
    const offsetMultiplePeriods = numPeriods === 1 ? 4 : 0;

    return (
      <View
        style={{
          marginLeft:
            200 + 100 * categoryExpandedState + 5 - offsetMultiplePeriods,
          flexShrink: 0,
        }}
      >
        <View
          style={{
            marginRight: 5 + getScrollbarWidth() - offsetMultiplePeriods,
          }}
        >
          <PayPeriodPicker
            startPeriod={startPeriod}
            numDisplayed={numPeriods}
            style={{ paddingTop: 5 }}
            onSelect={period => onPeriodSelect(period)}
          />
        </View>
      </View>
    );
  },
);

PayPeriodPageHeader.displayName = 'PayPeriodPageHeader'; 