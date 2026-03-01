## Why

Users are paid on schedules that don't align with calendar months — weekly, biweekly, or on specific dates — making month-based budgeting disconnected from their actual financial reality. Pay Periods brings the budget unit in line with the paycheck, so users can plan, track, and carry over funds within the period they actually have money to spend.

## What Changes

- **New**: Pay period ID system (`YYYY-13` through `YYYY-99`) extends the existing `YYYY-MM` month string format to represent discrete pay periods as first-class budget units — no database schema changes required.
- **New**: `pay-periods.ts` shared module containing period generation, date-to-period mapping, and navigation algorithms.
- **Modified**: `months.ts` key utility functions (`currentMonth`, `monthFromDate`, `bounds`, `prevMonth`, `nextMonth`, `addMonths`, `rangeInclusive`) extended with optional `PayPeriodConfig` parameter to dispatch to period-aware logic when a pay period ID is detected.
- **New**: `PayPeriodContext` React context provided at `BudgetPage` level; child components consume via `usePayPeriodConfig()` hook — explicit config passing, no module-level singleton.
- **New**: Backend config loading at budget-open time from synced prefs; config passed explicitly through the budget creation and transaction-routing call chain.
- **New**: Three synced preferences: `showPayPeriods`, `payPeriodFrequency`, `payPeriodStartDate`.
- **New**: `payPeriodsEnabled` feature flag gating the feature in production.
- **New**: Settings UI section for configuring pay period frequency and reference start date.
- **Out of scope for v1**: Mobile UI, schedule template integration with pay periods.

## Capabilities

### New Capabilities

- `pay-period-engine`: Core shared logic — ID system, period generation, date↔period mapping, navigation. The `YYYY-13..99` format, year-based numbering, `_parse` corruption fix, and the Presence Rule all live here.
- `pay-period-budget-integration`: Server-side budget engine changes — `createBudget`, `createAllBudgets`, `getBudgetRange`, and `handleTransactionChange` made pay-period-aware using explicit config passing.
- `pay-period-ui`: Desktop budget UI — `PayPeriodContext`, `usePayPeriodConfig` hook, budget page integration, settings configuration screen. Desktop-only for v1.

### Modified Capabilities

<!-- No existing capability specs exist yet; no delta specs needed. -->

## Impact

- **`loot-core/src/shared/months.ts`**: Signature changes to key functions (optional config param). Backward-compatible — all callers without pay periods work unchanged.
- **`loot-core/src/shared/pay-periods.ts`**: New file.
- **`loot-core/src/types/prefs.ts`**: New `FeatureFlag` and `SyncedPrefs` entries.
- **`loot-core/src/server/budget/base.ts`**: `createBudget`, `createAllBudgets`, `getBudgetRange`, `handleTransactionChange` — config threading.
- **`loot-core/src/server/budget/envelope.ts`**: Receives period-aware month IDs; `bounds` calls already go through `monthUtils`.
- **`packages/desktop-client/src/components/budget/index.tsx`**: Context provider, pref reading.
- **`packages/desktop-client/src/components/settings/`**: New pay period settings section.
- **No database migrations required.**
