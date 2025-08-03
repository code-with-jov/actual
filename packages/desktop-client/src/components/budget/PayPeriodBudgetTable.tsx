// @ts-strict-ignore
import React, {
  type ComponentPropsWithoutRef,
  type KeyboardEvent,
  useMemo,
  useState,
} from 'react';

import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { q } from 'loot-core/shared/query';
import {
  type CategoryEntity,
  type CategoryGroupEntity,
} from 'loot-core/types/models';
import { type PayPeriod } from 'loot-core/shared/payPeriods';

import { BudgetCategories } from './BudgetCategories';
import { BudgetSummaries } from './BudgetSummaries';
import { BudgetTotals } from './BudgetTotals';
import { type MonthBounds, MonthsProvider } from './MonthsContext';
import { PayPeriodSummary } from './PayPeriodSummary';
import {
  findSortDown,
  findSortUp,
  getScrollbarWidth,
  separateGroups,
} from './util';

import { type DropPosition } from '@desktop-client/components/sort';
import { SchedulesProvider } from '@desktop-client/hooks/useCachedSchedules';
import { useCategories } from '@desktop-client/hooks/useCategories';
import { useGlobalPref } from '@desktop-client/hooks/useGlobalPref';
import { useLocalPref } from '@desktop-client/hooks/useLocalPref';

type PayPeriodBudgetTableProps = {
  type: string;
  startPeriod: PayPeriod;
  numPeriods: number;
  dataComponents: {
    SummaryComponent: ComponentPropsWithoutRef<
      typeof BudgetSummaries
    >['SummaryComponent'];
    BudgetTotalsComponent: ComponentPropsWithoutRef<
      typeof BudgetTotals
    >['MonthComponent'];
  };
  onSaveCategory: (category: CategoryEntity) => void;
  onDeleteCategory: (id: CategoryEntity['id']) => void;
  onSaveGroup: (group: CategoryGroupEntity) => void;
  onDeleteGroup: (id: CategoryGroupEntity['id']) => void;
  onApplyBudgetTemplatesInGroup: (groupId: CategoryGroupEntity['id']) => void;
  onReorderCategory: (params: {
    id: CategoryEntity['id'];
    groupId?: CategoryGroupEntity['id'];
    targetId: CategoryEntity['id'] | null;
  }) => void;
  onReorderGroup: (params: {
    id: CategoryGroupEntity['id'];
    targetId: CategoryEntity['id'] | null;
  }) => void;
  onShowActivity: (id: CategoryEntity['id'], period?: PayPeriod) => void;
  onBudgetAction: (period: PayPeriod, type: string, args: unknown) => void;
};

export function PayPeriodBudgetTable(props: PayPeriodBudgetTableProps) {
  const {
    type,
    startPeriod,
    numPeriods,
    dataComponents,
    onSaveCategory,
    onDeleteCategory,
    onSaveGroup,
    onDeleteGroup,
    onApplyBudgetTemplatesInGroup,
    onReorderCategory,
    onReorderGroup,
    onShowActivity,
    onBudgetAction,
  } = props;

  const { grouped: categoryGroups = [] } = useCategories();
  const [collapsedGroupIds = [], setCollapsedGroupIdsPref] =
    useLocalPref('budget.collapsed');
  const [showHiddenCategories, setShowHiddenCategoriesPef] = useLocalPref(
    'budget.showHiddenCategories',
  );
  const [categoryExpandedStatePref] = useGlobalPref('categoryExpandedState');
  const categoryExpandedState = categoryExpandedStatePref ?? 0;
  const [editing, setEditing] = useState<{ id: string; cell: string } | null>(
    null,
  );

  const onEditPeriod = (id: string, period: PayPeriod) => {
    setEditing(id ? { id, cell: period.id } : null);
  };

  const onEditName = (id: string) => {
    setEditing(id ? { id, cell: 'name' } : null);
  };

  const _onReorderCategory = (
    id: string,
    dropPos: DropPosition,
    targetId: string,
  ) => {
    const isGroup = !!categoryGroups.find(g => g.id === targetId);

    if (isGroup) {
      const { targetId: groupId } = findSortUp(
        categoryGroups,
        dropPos,
        targetId,
      );
      const group = categoryGroups.find(g => g.id === groupId);

      if (group) {
        const { categories = [] } = group;
        onReorderCategory({
          id,
          groupId: group.id,
          targetId:
            categories.length === 0 || dropPos === 'top'
              ? null
              : categories[0].id,
        });
      }
    } else {
      const { targetId: categoryId } = findSortDown(
        categoryGroups,
        dropPos,
        targetId,
      );
      onReorderCategory({
        id,
        targetId: categoryId,
      });
    }
  };

  const _onReorderGroup = (
    id: string,
    dropPos: DropPosition,
    targetId: string,
  ) => {
    const { targetId: groupId } = findSortUp(
      categoryGroups,
      dropPos,
      targetId,
    );
    onReorderGroup({
      id,
      targetId: groupId,
    });
  };

  const moveVertically = (dir: 1 | -1) => {
    const flattened = categoryGroups.reduce(
      (all, group) => {
        if (collapsedGroupIds.includes(group.id)) {
          return all.concat({ id: group.id, isGroup: true });
        }
        return all.concat([
          { id: group.id, isGroup: true },
          ...(group?.categories || []),
        ]);
      },
      [] as Array<
        { id: CategoryGroupEntity['id']; isGroup: boolean } | CategoryEntity
      >,
    );

    if (editing) {
      const idx = flattened.findIndex(item => item.id === editing.id);
      let nextIdx = idx + dir;

      while (nextIdx >= 0 && nextIdx < flattened.length) {
        const next = flattened[nextIdx];

        if ('isGroup' in next && next.isGroup) {
          nextIdx += dir;
          continue;
        } else if (
          type === 'tracking' ||
          ('is_income' in next && !next.is_income)
        ) {
          onEditPeriod(next.id, startPeriod);
          return;
        } else {
          break;
        }
      }
    }
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (!editing) {
      return null;
    }

    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      moveVertically(e.shiftKey ? -1 : 1);
    }
  };

  const onCollapse = (collapsedIds: string[]) => {
    setCollapsedGroupIdsPref(collapsedIds);
  };

  const onToggleHiddenCategories = () => {
    setShowHiddenCategoriesPef(!showHiddenCategories);
  };

  const toggleHiddenCategories = () => {
    onToggleHiddenCategories();
  };

  const expandAllCategories = () => {
    onCollapse([]);
  };

  const collapseAllCategories = () => {
    onCollapse(categoryGroups.map(g => g.id));
  };

  const schedulesQuery = useMemo(() => q('schedules').select('*'), []);

  return (
    <View
      data-testid="pay-period-budget-table"
      style={{
        flex: 1,
        ...(styles.lightScrollbar && {
          '& ::-webkit-scrollbar': {
            backgroundColor: 'transparent',
          },
          '& ::-webkit-scrollbar-thumb:vertical': {
            backgroundColor: theme.tableHeaderBackground,
          },
        }),
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          overflow: 'hidden',
          flexShrink: 0,
          // This is necessary to align with the table because the
          // table has this padding to allow the shadow to show
          paddingLeft: 5,
          paddingRight: 5 + getScrollbarWidth(),
        }}
      >
        <View style={{ width: 200 + 100 * categoryExpandedState }} />
        {/* For pay periods, we'll use a simplified summary that shows the current period */}
        <View style={{ flex: 1, padding: 10 }}>
          <PayPeriodSummary period={startPeriod} />
        </View>
      </View>

      <BudgetTotals
        MonthComponent={dataComponents.BudgetTotalsComponent}
        toggleHiddenCategories={toggleHiddenCategories}
        expandAllCategories={expandAllCategories}
        collapseAllCategories={collapseAllCategories}
      />
      <View
        style={{
          overflowY: 'scroll',
          overflowAnchor: 'none',
          flex: 1,
          paddingLeft: 5,
          paddingRight: 5,
        }}
      >
        <View
          style={{
            flexShrink: 0,
          }}
          onKeyDown={onKeyDown}
        >
          <SchedulesProvider query={schedulesQuery}>
            <BudgetCategories
              // @ts-expect-error Fix when migrating BudgetCategories to ts
              categoryGroups={categoryGroups}
              editingCell={editing}
              dataComponents={dataComponents}
              onEditMonth={onEditPeriod}
              onEditName={onEditName}
              onSaveCategory={onSaveCategory}
              onSaveGroup={onSaveGroup}
              onDeleteCategory={onDeleteCategory}
              onDeleteGroup={onDeleteGroup}
              onReorderCategory={_onReorderCategory}
              onReorderGroup={_onReorderGroup}
              onBudgetAction={onBudgetAction}
              onShowActivity={onShowActivity}
              onApplyBudgetTemplatesInGroup={onApplyBudgetTemplatesInGroup}
            />
          </SchedulesProvider>
        </View>
      </View>
    </View>
  );
} 