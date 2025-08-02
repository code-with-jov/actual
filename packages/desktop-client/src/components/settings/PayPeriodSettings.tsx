import React, { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { Input } from '@actual-app/components/input';
import { Select } from '@actual-app/components/select';
import { Text } from '@actual-app/components/text';
import { View } from '@actual-app/components/view';
import { theme } from '@actual-app/components/theme';

import { type PayPeriodConfig, type PayPeriodFrequency } from 'loot-core/types/prefs';

import { Setting } from './UI';

import { FormField, FormLabel } from '@desktop-client/components/forms';
import { useFeatureFlag } from '@desktop-client/hooks/useFeatureFlag';
import { usePayPeriodConfig } from '@desktop-client/hooks/usePayPeriodConfig';

const PAY_PERIOD_FREQUENCIES: [PayPeriodFrequency, string][] = [
  ['weekly', 'Weekly'],
  ['bi-weekly', 'Bi-weekly'],
  ['semi-monthly', 'Semi-monthly'],
  ['monthly', 'Monthly'],
  ['custom', 'Custom'],
];

export function PayPeriodSettings() {
  const { t } = useTranslation();
  const isEnabled = useFeatureFlag('payPeriodBudgeting');
  const { config, updateConfig } = usePayPeriodConfig();
  const [isExpanded, setIsExpanded] = useState(false);

  if (!isEnabled) {
    return null;
  }

  const addPayPeriod = () => {
    const newPayPeriod: PayPeriodConfig = {
      id: Date.now().toString(),
      frequency: 'bi-weekly',
      startDate: new Date().toISOString().split('T')[0],
      amount: 0,
      source: '',
      isActive: true,
    };

    updateConfig({
      ...config,
      payPeriods: [...config.payPeriods, newPayPeriod],
    });
  };

  const updatePayPeriod = (id: string, updates: Partial<PayPeriodConfig>) => {
    updateConfig({
      ...config,
      payPeriods: config.payPeriods.map(period =>
        period.id === id ? { ...period, ...updates } : period,
      ),
    });
  };

  const removePayPeriod = (id: string) => {
    updateConfig({
      ...config,
      payPeriods: config.payPeriods.filter(period => period.id !== id),
    });
  };

  return (
    <Setting
      primaryAction={
        <Button
          variant="normal"
          onPress={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? (
            <Trans>Hide Pay Period Settings</Trans>
          ) : (
            <Trans>Configure Pay Periods</Trans>
          )}
        </Button>
      }
    >
      <Text>
        <Trans>
          <strong>Pay Period Budgeting</strong> allows you to budget based on your
          actual pay schedule instead of monthly periods. This helps you plan with
          the money you actually have available.
        </Trans>
      </Text>

      {isExpanded && (
        <View style={{ marginTop: 15, gap: 15 }}>
          <Text style={{ fontSize: 14, fontWeight: 500 }}>
            <Trans>Pay Periods</Trans>
          </Text>

          {config.payPeriods.map((period, index) => (
            <View
              key={period.id}
              style={{
                padding: 15,
                border: `1px solid ${theme.pillBorderDark}`,
                borderRadius: 4,
                backgroundColor: theme.pillBackgroundLight,
                gap: 10,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontWeight: 500 }}>
                  <Trans>Pay Period {index + 1}</Trans>
                </Text>
                <Button
                  variant="bare"
                  onPress={() => removePayPeriod(period.id)}
                  style={{ color: theme.errorText }}
                >
                  <Trans>Remove</Trans>
                </Button>
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <FormField style={{ flex: 1 }}>
                  <FormLabel title={t('Source')} />
                  <Input
                    value={period.source}
                    onChangeValue={value => updatePayPeriod(period.id, { source: value })}
                    placeholder={t('e.g., Job 1, Freelance')}
                  />
                </FormField>

                <FormField style={{ flex: 1 }}>
                  <FormLabel title={t('Frequency')} />
                  <Select
                    options={PAY_PERIOD_FREQUENCIES}
                    value={period.frequency}
                    onChange={value => updatePayPeriod(period.id, { frequency: value })}
                  />
                </FormField>
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <FormField style={{ flex: 1 }}>
                  <FormLabel title={t('Start Date')} />
                  <Input
                    type="date"
                    value={period.startDate}
                    onChangeValue={value => updatePayPeriod(period.id, { startDate: value })}
                  />
                </FormField>

                <FormField style={{ flex: 1 }}>
                  <FormLabel title={t('Amount')} />
                  <Input
                    type="number"
                    value={period.amount.toString()}
                    onChangeValue={value => updatePayPeriod(period.id, { amount: parseFloat(value) || 0 })}
                    placeholder="0.00"
                  />
                </FormField>
              </View>
            </View>
          ))}

          <Button variant="normal" onPress={addPayPeriod}>
            <Trans>Add Pay Period</Trans>
          </Button>

          {config.payPeriods.length === 0 && (
            <Text style={{ color: theme.pageTextLight, fontStyle: 'italic' }}>
              <Trans>No pay periods configured. Add your first pay period to get started.</Trans>
            </Text>
          )}
        </View>
      )}
    </Setting>
  );
} 