import React from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Input } from '@actual-app/components/input';
import { Select } from '@actual-app/components/select';
import { Text } from '@actual-app/components/text';
import { View } from '@actual-app/components/view';

import { Column, Setting } from './UI';

import { useFeatureFlag } from '@desktop-client/hooks/useFeatureFlag';
import { usePayPeriodConfig } from '@desktop-client/hooks/usePayPeriodConfig';

export function PayPeriodSettings() {
  const enabledByFlag = useFeatureFlag('payPeriodsEnabled');
  const { t } = useTranslation();

  const { 
    config, 
    setFrequency, 
    setStartDate, 
    isLoading, 
    error 
  } = usePayPeriodConfig();
  
  const frequency = config?.payFrequency || 'monthly';
  const startDate = config?.startDate || '';

  const frequencyOptions: [string, string][] = [
    ['weekly', t('Weekly')],
    ['biweekly', t('Biweekly')],
    ['monthly', t('Monthly')],
  ];

  return (
    <Setting
      primaryAction={
        <View style={{ display: 'flex', flexDirection: 'column', gap: '1em' }}>
          {error && (
            <Text style={{ color: 'red', fontSize: '14px' }}>
              Error: {error}
            </Text>
          )}
          <View style={{ display: 'flex', flexDirection: 'row', gap: '1.5em' }}>
            <Column title={t('Frequency')}>
              <Select
                value={frequency}
                onChange={value => setFrequency(value as any)}
                options={frequencyOptions}
                disabled={!enabledByFlag || isLoading}
              />
            </Column>

            <Column title={t('Start Date')}>
              <Input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                disabled={!enabledByFlag || isLoading}
              />
            </Column>
          </View>
          {isLoading && (
            <Text style={{ fontSize: '12px', color: '#666' }}>
              {t('Saving...')}
            </Text>
          )}
        </View>
      }
    >
      <Text>
        <Trans>
          <strong>Pay period settings.</strong> Configure how pay periods are
          generated and displayed.
        </Trans>
      </Text>
    </Setting>
  );
}
