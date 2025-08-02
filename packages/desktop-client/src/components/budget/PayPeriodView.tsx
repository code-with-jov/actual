import React from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Card } from '@actual-app/components/card';
import { Text } from '@actual-app/components/text';
import { View } from '@actual-app/components/view';
import { theme } from '@actual-app/components/theme';

import { usePayPeriodCalculations } from '@desktop-client/hooks/usePayPeriodCalculations';
import { usePayPeriodConfig } from '@desktop-client/hooks/usePayPeriodConfig';

export function PayPeriodView() {
  const { t } = useTranslation();
  const { config } = usePayPeriodConfig();
  const calculations = usePayPeriodCalculations();

  if (!config.payPeriods.length) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20,
        }}
      >
        <Card
          style={{
            padding: 20,
            maxWidth: 400,
            textAlign: 'center',
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: 500, marginBottom: 10 }}>
            {t('No Pay Periods Configured')}
          </Text>
          <Text style={{ color: theme.pageTextLight }}>
            {t('To use pay period budgeting, you need to configure your pay periods in Settings. This will allow you to budget based on your actual pay schedule instead of monthly periods.')}
          </Text>
        </Card>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <View style={{ marginBottom: 20 }}>
        <Text style={{ fontSize: 18, fontWeight: 600, marginBottom: 10 }}>
          {t('Pay Period Overview')}
        </Text>
        
        {calculations.currentPeriod && (
          <Card style={{ padding: 15, marginBottom: 15 }}>
            <Text style={{ fontSize: 14, fontWeight: 500, marginBottom: 8 }}>
              {t('Current Pay Period')}
            </Text>
            <Text>
              {calculations.currentPeriod.startDate} - {calculations.currentPeriod.endDate}
            </Text>
            <Text style={{ color: theme.pageTextLight }}>
              {calculations.currentPeriod.source}: ${calculations.currentPeriod.amount}
            </Text>
          </Card>
        )}

        {calculations.nextPeriod && (
          <Card style={{ padding: 15, marginBottom: 15 }}>
            <Text style={{ fontSize: 14, fontWeight: 500, marginBottom: 8 }}>
              {t('Next Pay Period')}
            </Text>
            <Text>
              {calculations.nextPeriod.startDate} - {calculations.nextPeriod.endDate}
            </Text>
            <Text style={{ color: theme.pageTextLight }}>
              {calculations.nextPeriod.source}: ${calculations.nextPeriod.amount}
            </Text>
          </Card>
        )}

        {calculations.upcomingPeriods.length > 0 && (
          <Card style={{ padding: 15 }}>
            <Text style={{ fontSize: 14, fontWeight: 500, marginBottom: 8 }}>
              {t('Upcoming Pay Periods')}
            </Text>
            {calculations.upcomingPeriods.slice(0, 3).map((period, index) => (
              <View key={period.id} style={{ marginBottom: 8 }}>
                <Text>
                  {period.startDate} - {period.endDate}
                </Text>
                <Text style={{ color: theme.pageTextLight }}>
                  {period.source}: ${period.amount}
                </Text>
              </View>
            ))}
          </Card>
        )}
      </View>

      <View>
        <Text style={{ fontSize: 16, fontWeight: 600, marginBottom: 10 }}>
          {t('Pay Period Configuration')}
        </Text>
        {config.payPeriods.map((period, index) => (
          <Card key={period.id} style={{ padding: 15, marginBottom: 10 }}>
            <Text style={{ fontSize: 14, fontWeight: 500, marginBottom: 5 }}>
              {period.source || `Pay Period ${index + 1}`}
            </Text>
            <Text style={{ color: theme.pageTextLight }}>
              {period.frequency} • ${period.amount} • {period.startDate}
            </Text>
          </Card>
        ))}
      </View>
    </View>
  );
} 