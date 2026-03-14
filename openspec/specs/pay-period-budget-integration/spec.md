# Spec: Pay Period Budget Integration

## Purpose

Defines how pay periods integrate with the budget engine: configuration loading, spreadsheet sheet creation, transaction routing, data preservation, synced preferences, and the feature flag controlling rollout.

---

## Requirements

### Requirement: Pay period config loading at budget open
When a budget file is opened, the server SHALL load the pay period configuration from synced preferences (`showPayPeriods`, `payPeriodFrequency`, `payPeriodStartDate`) and make it available for the request lifecycle. The config SHALL be treated as immutable for a given request; it is reloaded when preferences are saved.

#### Scenario: Config loaded when budget opens
- **WHEN** a budget file is opened and `showPayPeriods` is `'true'` in synced prefs
- **THEN** `loadPayPeriodConfig()` returns a `PayPeriodConfig` with `enabled: true`

#### Scenario: Config returns disabled when pref is absent
- **WHEN** `showPayPeriods` is not set in synced prefs
- **THEN** `loadPayPeriodConfig()` returns a config with `enabled: false`

#### Scenario: Config is reloaded after preference save
- **WHEN** `payPeriodFrequency` is saved via `preferences/save`
- **THEN** subsequent calls to budget operations use the updated frequency

---

### Requirement: Pay period sheets created in budget engine
When pay periods are enabled, `createBudget(months, config)` SHALL create spreadsheet sheets for pay period IDs using the `YYYY-MM` format (MM = 13–99) in the same way calendar month sheets are created. Each pay period sheet SHALL use `sheetForMonth(periodId)` for its name and `bounds(periodId, config)` for its transaction date range.

#### Scenario: Pay period sheet is created with correct name
- **WHEN** `createBudget(['2024-13'], config)` is called
- **THEN** a spreadsheet sheet named `budget202413` is created

#### Scenario: Pay period sheet uses correct date bounds in SQL query
- **WHEN** period `2024-13` runs January 5–18 and `createBudget(['2024-13'], config)` is called
- **THEN** the `sum-amount-<category>` dynamic cell queries transactions with `date >= 20240105 AND date <= 20240118`

#### Scenario: Calendar month sheets are unaffected when pay periods are enabled
- **WHEN** pay periods are enabled and `createBudget(['2024-01'], config)` is called
- **THEN** a sheet named `budget202401` is created with the standard calendar month bounds

---

### Requirement: `createAllBudgets` generates pay period range
When pay periods are enabled, `createAllBudgets(config)` SHALL generate a range of pay period IDs (not calendar month IDs) covering the same semantic window: from 3 periods before the earliest transaction up to 12 periods ahead of the current period.

#### Scenario: Range uses period IDs when enabled
- **WHEN** pay periods are enabled and the budget has transactions
- **THEN** `createAllBudgets` generates and creates sheets for period IDs (MM ≥ 13)

#### Scenario: Range falls back to calendar months when disabled
- **WHEN** `config.enabled` is `false`
- **THEN** `createAllBudgets` generates calendar month IDs as before

---

### Requirement: Transaction routing to correct pay period sheet
When pay periods are enabled, `handleTransactionChange` SHALL route each transaction to the pay period sheet containing the transaction's date, determined by `monthFromDate(transaction.date, config)`. A transaction dated in January 2025 that falls within a 2024 pay period (year-boundary case) SHALL be routed to the `2024-XX` sheet, not a `2025-XX` sheet.

#### Scenario: Transaction routes to its containing period
- **WHEN** a transaction is dated `2024-01-10` and period `2024-13` covers Jan 5–18
- **THEN** the recompute call targets sheet `budget202413`

#### Scenario: Year-boundary transaction routes to prior year's last period
- **WHEN** a transaction is dated `2025-01-03` and the last biweekly period of 2024 covers Dec 27 – Jan 9
- **THEN** the recompute call targets the `2024-XX` period sheet, not any `2025-XX` sheet

#### Scenario: Calendar month routing is unchanged when pay periods disabled
- **WHEN** `config.enabled` is `false` and a transaction is dated `2024-03-15`
- **THEN** the recompute call targets sheet `budget202403`

---

### Requirement: Budget data preserved when pay periods disabled
When `showPayPeriods` is set to `'false'`, the system SHALL continue to display and use calendar month budget data unchanged. Pay period spreadsheet sheets SHALL remain in the file but SHALL NOT be loaded or displayed.

#### Scenario: Disabling pay periods falls back to calendar view
- **WHEN** `showPayPeriods` is set to `'false'` after pay periods were used
- **THEN** the budget UI shows calendar months and calendar month data is intact

#### Scenario: Re-enabling pay periods restores period sheets
- **WHEN** `showPayPeriods` is re-set to `'true'`
- **THEN** previously created period sheets are still present and reflect correct balances

---

### Requirement: Pay period synced preferences
The following synced preference keys SHALL be added to `SyncedPrefs`:
- `showPayPeriods` — `'true'` | `'false'` — enables/disables the pay period view
- `payPeriodFrequency` — `'weekly'` | `'biweekly'` | `'monthly'` — the pay cadence
- `payPeriodStartDate` — `string` (YYYY-MM-DD) — a reference date establishing the cadence

These preferences SHALL sync across devices as part of the standard synced preference mechanism.

#### Scenario: Saving pay period frequency persists and syncs
- **WHEN** `payPeriodFrequency` is saved via `preferences/save`
- **THEN** the value is stored in the `preferences` table and syncs to other devices

#### Scenario: Missing frequency defaults gracefully
- **WHEN** `payPeriodFrequency` is absent from prefs and pay periods are enabled
- **THEN** the system defaults to `'monthly'` or surfaces a configuration prompt (not a runtime error)

---

### Requirement: `payPeriodsEnabled` feature flag
A feature flag `payPeriodsEnabled` SHALL be added to the `FeatureFlag` type. The pay periods UI and pay-period-aware budget routing SHALL only activate when this flag is `true` AND `showPayPeriods` is `'true'`. The flag allows staged rollout before general availability.

#### Scenario: Feature hidden when flag is off
- **WHEN** `payPeriodsEnabled` feature flag is `false`
- **THEN** no pay period UI is visible and budget operates in standard calendar month mode

#### Scenario: Feature available when flag is on
- **WHEN** `payPeriodsEnabled` is `true` and `showPayPeriods` is `'true'`
- **THEN** the budget operates in pay period mode
