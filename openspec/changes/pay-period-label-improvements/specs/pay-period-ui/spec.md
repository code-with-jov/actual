## MODIFIED Requirements

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

### Requirement: Mobile MonthSelector navigation with pay periods active

When pay periods are enabled, the `MonthSelector` component in the mobile budget page SHALL behave correctly across all navigation interactions. The component receives `payPeriodConfig` and must propagate it to any `monthUtils` functions that operate on period IDs.

#### Navigation arrow state

- The **Previous arrow** SHALL be disabled when `startMonth` equals `monthBounds.start`.
- The **Next arrow** SHALL be disabled when `startMonth` is the last available period in `monthBounds`; this boundary SHALL be computed by calling `monthUtils.subMonths(monthBounds.end, 1, payPeriodConfig)` so that pay period IDs are resolved correctly.
- When enabled, each arrow SHALL navigate by exactly one pay period.

#### Scenario: Next arrow disabled at upper bound

- **GIVEN** pay periods are active and `startMonth` equals the last period in `monthBounds`
- **THEN** the Next arrow is disabled

#### Scenario: Next arrow enabled within bounds

- **GIVEN** pay periods are active and `startMonth` is before the last period in `monthBounds`
- **THEN** the Next arrow is enabled and tapping it advances the view by one pay period

#### Scenario: Previous arrow disabled at lower bound

- **GIVEN** pay periods are active and `startMonth` equals `monthBounds.start`
- **THEN** the Previous arrow is disabled

#### Today button

- The **Today** button SHALL be hidden when `startMonth` equals the current pay period.
- The **Today** button SHALL be visible when `startMonth` differs from the current pay period.
- Tapping Today SHALL navigate `startMonth` back to the current pay period and hide the button.

#### Scenario: Today button hidden on current period

- **GIVEN** pay periods are active and the budget is showing the current pay period
- **THEN** the Today button is not visible

#### Scenario: Today button visible and functional after navigation

- **GIVEN** pay periods are active and the user has navigated away from the current period
- **THEN** the Today button is visible
- **WHEN** the user taps Today
- **THEN** the view returns to the current pay period and the Today button is hidden again

#### Period label interaction

- Tapping the period label (the center button in `MonthSelector`) SHALL open the month menu modal.
- The modal heading SHALL display the short-format date range (`MMM d - MMM d`) for the current pay period.

#### Scenario: Tapping the period label opens the month menu modal

- **GIVEN** pay periods are active
- **WHEN** the user taps the period label in the `MonthSelector` header
- **THEN** a modal opens whose heading matches the short-format label of the current pay period

---

### Requirement: Mobile spent-cell navigation with pay periods active

When pay periods are enabled, tapping a spent cell on the mobile budget page SHALL navigate to the transactions view filtered to that pay period. The Back button on the transactions view SHALL return the user to the budget page.

#### Scenario: Tapping spent cell navigates to transactions

- **GIVEN** pay periods are active
- **WHEN** the user taps a spent amount cell for a category
- **THEN** the transactions view is shown, filtered to that category and pay period

#### Scenario: Back from transactions returns to budget

- **GIVEN** the user navigated to the transactions view from a spent cell
- **WHEN** the user taps Back
- **THEN** the mobile budget page is shown
