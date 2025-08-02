// @ts-strict-ignore
import React from 'react';
import { useTranslation } from 'react-i18next';

import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import * as monthUtils from 'loot-core/shared/months';
import { type PayPeriod } from 'loot-core/shared/payPeriods';

import { useLocale } from '@desktop-client/hooks/useLocale';

type PayPeriodSummaryProps = {
  period: PayPeriod;
};

export function PayPeriodSummary({ period }: PayPeriodSummaryProps) {
  const { t } = useTranslation();
  const locale = useLocale();

  const formatPeriodLabel = (period: PayPeriod) => {
    const startDate = monthUtils.parseDate(period.startDate);
    const endDate = monthUtils.parseDate(period.endDate);
    
    // If it's the same month, show "Jan 1-15"
    if (startDate.getMonth() === endDate.getMonth()) {
      const monthName = monthUtils.format(period.startDate, 'MMM', locale);
      const startDay = startDate.getDate();
      const endDay = endDate.getDate();
      return `${monthName} ${startDay}-${endDay}`;
    }
    
    // If it spans months, show "Jan 15-Jan 31"
    const startMonth = monthUtils.format(period.startDate, 'MMM', locale);
    const endMonth = monthUtils.format(period.endDate, 'MMM', locale);
    const startDay = startDate.getDate();
    const endDay = endDate.getDate();
    return `${startMonth} ${startDay}-${endMonth} ${endDay}`;
  };

  const isCurrentPeriod = () => {
    const today = monthUtils.currentDay();
    const todayDate = monthUtils.parseDate(today);
    const startDate = monthUtils.parseDate(period.startDate);
    const endDate = monthUtils.parseDate(period.endDate);
    return todayDate >= startDate && todayDate <= endDate;
  };

  return (
    <View
      data-testid="pay-period-summary"
      style={{
        backgroundColor: isCurrentPeriod()
          ? theme.budgetCurrentMonth
          : theme.budgetOtherMonth,
        boxShadow: styles.cardShadow,
        borderRadius: 6,
        marginLeft: 0,
        marginRight: 0,
        marginTop: 5,
        flex: 1,
        cursor: 'default',
        marginBottom: 5,
        overflow: 'hidden',
        padding: 15,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 10,
        }}
      >
        <Text
          style={{
            fontSize: 16,
            fontWeight: 600,
            color: theme.pageText,
          }}
        >
          {formatPeriodLabel(period)}
        </Text>
        <Text
          style={{
            fontSize: 14,
            color: theme.pageTextLight,
          }}
        >
          {period.source}
        </Text>
      </View>

      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: 10,
          backgroundColor: theme.tableRowHeaderBackground,
          borderRadius: 4,
        }}
      >
        <Text
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: theme.pageText,
          }}
        >
          {t('Pay Period Income')}
        </Text>
        <Text
          style={{
            fontSize: 16,
            fontWeight: 600,
            color: theme.pageText,
          }}
        >
          ${period.amount}
        </Text>
      </View>

      {isCurrentPeriod() && (
        <View
          style={{
            marginTop: 10,
            padding: 8,
            backgroundColor: theme.noticeBackground,
            borderRadius: 4,
            border: `1px solid ${theme.noticeBorder}`,
          }}
        >
          <Text
            style={{
              fontSize: 12,
              color: theme.noticeText,
              textAlign: 'center',
            }}
          >
            {t('Current Pay Period')}
          </Text>
        </View>
      )}
    </View>
  );
} 