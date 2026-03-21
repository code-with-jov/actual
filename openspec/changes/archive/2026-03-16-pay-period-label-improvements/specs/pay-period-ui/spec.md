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
