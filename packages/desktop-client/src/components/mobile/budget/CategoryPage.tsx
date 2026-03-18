import React, { Fragment, useMemo } from 'react';
import { Trans } from 'react-i18next';
import { useParams, useSearchParams } from 'react-router';

import { TextOneLine } from '@actual-app/components/text-one-line';
import { View } from '@actual-app/components/view';

import * as monthUtils from 'loot-core/shared/months';
import { getPayPeriodLabel, isPayPeriod } from 'loot-core/shared/pay-periods';

import { CategoryTransactions } from './CategoryTransactions';
import { UncategorizedTransactions } from './UncategorizedTransactions';

import { PayPeriodProvider } from '@desktop-client/components/budget/PayPeriodContext';
import { MobileBackButton } from '@desktop-client/components/mobile/MobileBackButton';
import { AddTransactionButton } from '@desktop-client/components/mobile/transactions/AddTransactionButton';
import { MobilePageHeader, Page } from '@desktop-client/components/Page';
import { useCategory } from '@desktop-client/hooks/useCategory';
import { useFeatureFlag } from '@desktop-client/hooks/useFeatureFlag';
import { useLocale } from '@desktop-client/hooks/useLocale';
import { useSyncedPref } from '@desktop-client/hooks/useSyncedPref';

export function CategoryPage() {
  const locale = useLocale();
  const [_numberFormat] = useSyncedPref('numberFormat');
  const numberFormat = _numberFormat || 'comma-dot';
  const [hideFraction] = useSyncedPref('hideFraction');

  const isPayPeriodsEnabled = useFeatureFlag('payPeriodsEnabled');
  const [showPayPeriods] = useSyncedPref('showPayPeriods');
  const [payPeriodFrequency] = useSyncedPref('payPeriodFrequency');
  const [payPeriodStartDate] = useSyncedPref('payPeriodStartDate');
  const payPeriodConfig = useMemo(
    () => ({
      enabled: isPayPeriodsEnabled && showPayPeriods === 'true',
      payFrequency:
        (payPeriodFrequency as 'weekly' | 'biweekly' | 'monthly') ?? 'monthly',
      startDate: payPeriodStartDate ?? '',
    }),
    [
      isPayPeriodsEnabled,
      showPayPeriods,
      payPeriodFrequency,
      payPeriodStartDate,
    ],
  );

  const { id: categoryIdParam } = useParams();
  const [searchParams] = useSearchParams();
  const month =
    searchParams.get('month') || monthUtils.currentMonth(payPeriodConfig);
  const { data: category } = useCategory(categoryIdParam);

  const periodLabel =
    isPayPeriod(month) && payPeriodConfig.enabled
      ? getPayPeriodLabel(month, payPeriodConfig, 'summary', locale)
      : monthUtils.format(month, "MMMM ''yy", locale);

  return (
    <PayPeriodProvider
      config={payPeriodConfig.enabled ? payPeriodConfig : undefined}
    >
      <Page
        header={
          <MobilePageHeader
            title={
              category ? (
                <View>
                  <TextOneLine>{category.name}</TextOneLine>
                  <TextOneLine>({periodLabel})</TextOneLine>
                </View>
              ) : (
                <TextOneLine>
                  <Trans>Uncategorized</Trans>
                </TextOneLine>
              )
            }
            leftContent={<MobileBackButton />}
            rightContent={<AddTransactionButton categoryId={category?.id} />}
          />
        }
        padding={0}
      >
        {/* This key forces the whole table rerender when the number format changes */}
        <Fragment key={numberFormat + hideFraction}>
          {category ? (
            <CategoryTransactions category={category} month={month} />
          ) : (
            <UncategorizedTransactions />
          )}
        </Fragment>
      </Page>
    </PayPeriodProvider>
  );
}
