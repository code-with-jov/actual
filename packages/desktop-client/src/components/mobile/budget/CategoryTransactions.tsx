import React, { useCallback, useMemo, useState } from 'react';

import * as monthUtils from 'loot-core/shared/months';
import { isPayPeriod } from 'loot-core/shared/pay-periods';
import { q } from 'loot-core/shared/query';
import { isPreviewId } from 'loot-core/shared/transactions';
import type { CategoryEntity, TransactionEntity } from 'loot-core/types/models';
import type { PayPeriodConfig } from 'loot-core/types/prefs';

import { usePayPeriodConfig } from '@desktop-client/components/budget/PayPeriodContext';
import { TransactionListWithBalances } from '@desktop-client/components/mobile/transactions/TransactionListWithBalances';
import { SchedulesProvider } from '@desktop-client/hooks/useCachedSchedules';
import { useCategoryPreviewTransactions } from '@desktop-client/hooks/useCategoryPreviewTransactions';
import { useDateFormat } from '@desktop-client/hooks/useDateFormat';
import { useNavigate } from '@desktop-client/hooks/useNavigate';
import { useTransactions } from '@desktop-client/hooks/useTransactions';
import { useTransactionsSearch } from '@desktop-client/hooks/useTransactionsSearch';
import * as bindings from '@desktop-client/spreadsheet/bindings';

type CategoryTransactionsProps = {
  category: CategoryEntity;
  month: string;
};

export function CategoryTransactions({
  category,
  month,
}: CategoryTransactionsProps) {
  const schedulesQuery = useMemo(() => q('schedules').select('*'), []);

  return (
    <SchedulesProvider query={schedulesQuery}>
      <TransactionListWithPreviews category={category} month={month} />
    </SchedulesProvider>
  );
}

type TransactionListWithPreviewsProps = {
  category: CategoryEntity;
  month: string;
};

function TransactionListWithPreviews({
  category,
  month,
}: TransactionListWithPreviewsProps) {
  const navigate = useNavigate();
  const payPeriodConfig = usePayPeriodConfig();

  const baseTransactionsQuery = useCallback(
    () =>
      q('transactions')
        .options({ splits: 'inline' })
        .filter(getCategoryMonthFilter(category, month, payPeriodConfig))
        .select('*'),
    [category, month, payPeriodConfig],
  );

  const [transactionsQuery, setTransactionsQuery] = useState(
    baseTransactionsQuery(),
  );
  const {
    transactions,
    isPending: isTransactionsLoading,
    isFetchingNextPage: isLoadingMoreTransactions,
    fetchNextPage: fetchMoreTransactions,
  } = useTransactions({
    query: transactionsQuery,
  });

  const dateFormat = useDateFormat() || 'MM/dd/yyyy';

  const { isSearching, search: onSearch } = useTransactionsSearch({
    updateQuery: setTransactionsQuery,
    resetQuery: () => setTransactionsQuery(baseTransactionsQuery()),
    dateFormat,
  });

  const onOpenTransaction = useCallback(
    (transaction: TransactionEntity) => {
      // details of how the native app used to handle preview transactions here can be found at commit 05e58279
      if (!isPreviewId(transaction.id)) {
        void navigate(`/transactions/${transaction.id}`);
      }
    },
    [navigate],
  );

  const balance = bindings.categoryBalance(category.id, month);
  const balanceCleared = bindings.categoryBalanceCleared(category.id, month);
  const balanceUncleared = bindings.categoryBalanceUncleared(
    category.id,
    month,
  );

  const { previewTransactions, isLoading: isPreviewTransactionsLoading } =
    useCategoryPreviewTransactions({
      categoryId: category.id,
      month,
    });

  const transactionsToDisplay = !isSearching
    ? previewTransactions.concat(transactions)
    : transactions;

  return (
    <TransactionListWithBalances
      isLoading={
        isSearching
          ? isTransactionsLoading
          : isTransactionsLoading || isPreviewTransactionsLoading
      }
      transactions={transactionsToDisplay}
      balance={balance}
      balanceCleared={balanceCleared}
      balanceUncleared={balanceUncleared}
      searchPlaceholder={`Search ${category.name}`}
      onSearch={onSearch}
      isLoadingMore={isLoadingMoreTransactions}
      onLoadMore={fetchMoreTransactions}
      onOpenTransaction={onOpenTransaction}
    />
  );
}

function getCategoryMonthFilter(
  category: CategoryEntity,
  month: string,
  config?: PayPeriodConfig,
) {
  if (isPayPeriod(month) && config?.enabled) {
    const { start, end } = monthUtils.bounds(month, config);
    const toDateStr = (n: number) => {
      const s = String(n);
      return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
    };
    return {
      category: category.id,
      date: { $gte: toDateStr(start), $lte: toDateStr(end) },
    };
  }
  return {
    category: category.id,
    date: { $transform: '$month', $eq: month },
  };
}
