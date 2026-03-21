# Spec: Pay Period UI

## Purpose

Defines the user-facing pay period experience in the budget page: the React context/hook that propagates pay period config, period-aware navigation, display name formatting, settings configuration, column layout, component-level config consumption, drill-through filtering, and summary totals scoped to pay period boundaries.

---

## Requirements

### Requirement: Pay period context provider

The `BudgetPage` component SHALL read `showPayPeriods`, `payPeriodFrequency`, and `payPeriodStartDate` from synced preferences and provide a `PayPeriodContext` containing the resolved `PayPeriodConfig` (or `undefined` when disabled/unconfigured) to all child budget components. Child components SHALL consume this via a `usePayPeriodConfig()` hook.

#### Scenario: Context is provided when pay periods are enabled

- **WHEN** `showPayPeriods` is `'true'` and frequency and start date are configured
- **THEN** `usePayPeriodConfig()` returns a `PayPeriodConfig` with `enabled: true` in any child budget component

#### Scenario: Context is undefined when pay periods are disabled

- **WHEN** `showPayPeriods` is `'false'` or the feature flag is off
- **THEN** `usePayPeriodConfig()` returns `undefined`

#### Scenario: Context updates when preferences change

- **WHEN** the user changes `payPeriodFrequency` in settings and saves
- **THEN** `usePayPeriodConfig()` returns the updated config without a page reload

---

### Requirement: Budget page navigates by pay period

When pay periods are enabled, the budget page's month navigation (previous/next arrow buttons and the month/period picker) SHALL navigate by pay period IDs instead of calendar months. The `startMonth` local preference SHALL store a pay period ID when in pay period mode.

#### Scenario: Next arrow advances to the next pay period

- **WHEN** pay periods are enabled and the user clicks the next period arrow
- **THEN** the displayed period advances to the next period ID (e.g., `2024-14` → `2024-15`)

#### Scenario: Previous arrow retreats to the prior pay period

- **WHEN** pay periods are enabled and the user clicks the previous period arrow
- **THEN** the displayed period retreats by one period ID

#### Scenario: "Today" / "Current period" button navigates to current pay period

- **WHEN** pay periods are enabled and the user clicks the "today" navigation button
- **THEN** the view jumps to the pay period containing today's date

---

### Requirement: Pay period display names

When a pay period ID is displayed in the budget UI, it SHALL be formatted as a human-readable label. The system SHALL support two formats:

- **Picker format** (MonthPicker): `{monthLetter}{withinMonthCount}` — the first character of the start month's locale-aware three-letter abbreviation, followed by the 1-based count of pay periods whose start date falls within that same calendar month. Examples: `J1`, `J2`, `F1`, `D2`.
- **Summary format** (BudgetSummary): `{startDate} - {endDate} (PP{globalN})` — the period's actual date range using `MMM d` formatting, followed by the global 1-based period index in parentheses. Examples: `Jan 5 - Jan 18 (PP1)`, `Jan 19 - Feb 1 (PP2)`.

The `getPayPeriodLabel` function SHALL accept a `format` parameter of type `'picker' | 'summary'` (replacing the previous `short: boolean`). Both formats SHALL call `generatePayPeriods` to resolve actual dates. An optional `locale` parameter SHALL be accepted and forwarded to date formatting for localisation-safe month letters.

The within-month count for the picker format is determined by: taking all periods whose start date falls in the same calendar month as the target period, sorted by start date, and finding the target period's 1-based position in that sequence.

#### Scenario: Picker label for first period of January

- **WHEN** a biweekly period whose start date is in January is the first to start in January of that year
- **THEN** its picker label is `J1`

#### Scenario: Picker label for second period of January

- **WHEN** a biweekly period whose start date is in January is the second to start in January of that year
- **THEN** its picker label is `J2`

#### Scenario: Picker label for first period of February

- **WHEN** a period's start date is in February and it is the first period to start in February
- **THEN** its picker label is `F1`

#### Scenario: Picker label uses start month even when period spans two calendar months

- **WHEN** a period starts on Jan 28 and ends on Feb 10
- **THEN** its picker label is based on January (e.g., `J3`) not February

#### Scenario: Summary label for a period within a single month

- **WHEN** period `2024-13` covers Jan 5–18 and is the 1st period of the year
- **THEN** its summary label is `Jan 5 - Jan 18 (PP1)`

#### Scenario: Summary label for a period spanning two months

- **WHEN** a period covers Jan 19–Feb 1 and is the 2nd period of the year
- **THEN** its summary label is `Jan 19 - Feb 1 (PP2)`

#### Scenario: Calendar month labels are unchanged when pay periods are disabled

- **WHEN** pay periods are disabled
- **THEN** month labels display as before (e.g., `January 2024`)

---

### Requirement: Pay period settings configuration

A settings section SHALL be added to the budget settings (desktop) allowing the user to:

1. Toggle pay periods on/off (`showPayPeriods`)
2. Select pay frequency: `Weekly`, `Biweekly`, or `Monthly`
3. Select a reference start date (`payPeriodStartDate`) via a date picker

Changes SHALL be saved to synced preferences immediately on confirmation.

#### Scenario: User enables pay periods

- **WHEN** user opens Budget Settings, enables pay periods, selects Biweekly, picks a start date, and saves
- **THEN** `showPayPeriods`, `payPeriodFrequency`, and `payPeriodStartDate` are saved to synced prefs

#### Scenario: Frequency selector shows three options

- **WHEN** the pay period settings section is visible
- **THEN** the frequency control shows exactly `Weekly`, `Biweekly`, and `Monthly` options

#### Scenario: Start date is required before enabling

- **WHEN** user attempts to enable pay periods without selecting a start date
- **THEN** an error or prompt prevents saving and explains that a start date is required

#### Scenario: Settings hidden when feature flag is off

- **WHEN** `payPeriodsEnabled` feature flag is `false`
- **THEN** the pay period settings section is not visible in budget settings

---

### Requirement: Budget page shows correct period count columns

The budget page's column layout SHALL display the correct number of period columns based on the `maxMonths` global preference. When pay periods are enabled, each column represents one pay period (not one calendar month). The columns SHALL cover consecutive period IDs starting from `startMonth`.

#### Scenario: Single period column displayed

- **WHEN** `maxMonths` is 1 and pay periods are enabled
- **THEN** one column is shown for the current pay period

#### Scenario: Multiple period columns displayed

- **WHEN** `maxMonths` is 3 and pay periods are enabled
- **THEN** three consecutive period columns are shown

---

### Requirement: Internal budget components must consume PayPeriodConfig from context

Any budget component that calls `months.ts` navigation functions (`subMonths`, `addMonths`, `prevMonth`, `nextMonth`, etc.) with values that may be pay period IDs SHALL obtain `PayPeriodConfig` via `usePayPeriodConfig()` and pass it to those calls. Components MUST NOT call these functions with a pay period ID and no config.

#### Scenario: BudgetSummaries uses config when computing surrounding periods

- **WHEN** pay periods are enabled and `BudgetSummaries` computes the period immediately before and after the visible range
- **THEN** it calls `subMonths` and `addMonths` with the `PayPeriodConfig` obtained from context, producing valid adjacent period IDs

#### Scenario: No crash when config is absent (calendar months)

- **WHEN** pay periods are disabled and `BudgetSummaries` computes surrounding months
- **THEN** it calls `subMonths` and `addMonths` without a config (or with `null`/`undefined`), and standard calendar-month behavior is used

---

### Requirement: Drill-through to transactions uses date-range filter for pay periods

When the user clicks a budget cell amount (Spent, Income, etc.) while in pay period mode, the transaction list filter SHALL use a date-range condition covering the period's actual start and end dates, NOT a month-equality condition containing the pay period ID. This ensures:

1. The filter query finds the correct transactions (period boundaries, not calendar month).
2. The filter display layer (`Value.tsx`, `subfieldFromFilter`) never receives a pay period ID — it only sees `yyyy-MM-dd` date strings it already understands.

The date range SHALL be derived from `bounds(periodId, config)` converted to `yyyy-MM-dd` strings and expressed as two conditions: `{ field: 'date', op: 'gte', value: startDate }` and `{ field: 'date', op: 'lte', value: endDate }`. When pay periods are disabled, the existing `{ field: 'date', op: 'is', value: month, options: { month: true } }` condition is used unchanged.

#### Scenario: Clicking Spent on a pay period navigates to correctly filtered transactions

- **WHEN** pay periods are enabled and the user clicks "Spent" for a category in period `2024-13` (Jan 5–18)
- **THEN** the transaction list is filtered with `date >= '2024-01-05' AND date <= '2024-01-18'`
- **AND** no pay period ID string is passed to `Value.tsx` or `subfieldFromFilter`

#### Scenario: Clicking Spent in calendar month mode is unchanged

- **WHEN** pay periods are disabled and the user clicks "Spent" for a category in month `2024-01`
- **THEN** the transaction list is filtered with the existing `{ op: 'is', value: '2024-01', options: { month: true } }` condition

---

### Requirement: Budget summary totals scoped to pay period

The budget summary (income budgeted, spent, to-budget/overspent) shown in the period header SHALL reflect totals for the selected pay period's date range only, not the full calendar month.

#### Scenario: Spent total reflects period date range

- **WHEN** a biweekly period runs Jan 5–18 and transactions exist on Jan 3, Jan 8, and Jan 20
- **THEN** the period's "Spent" total includes only the Jan 8 transaction

#### Scenario: Switching to calendar month view shows full month totals

- **WHEN** pay periods are disabled
- **THEN** the budget summary reflects the full calendar month as before
