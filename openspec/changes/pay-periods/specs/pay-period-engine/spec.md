## ADDED Requirements

### Requirement: Pay period ID format
Pay period IDs SHALL use the `YYYY-MM` format with `MM` values from `13` to `99` inclusive. Calendar month IDs use `01`–`12`; pay period IDs use `13`–`99`. The `isPayPeriod(id)` function SHALL return `true` if and only if the numeric value of the `MM` segment is ≥ 13.

#### Scenario: Identify a pay period ID
- **WHEN** `isPayPeriod('2024-13')` is called
- **THEN** it returns `true`

#### Scenario: Identify a calendar month ID
- **WHEN** `isPayPeriod('2024-12')` is called
- **THEN** it returns `false`

#### Scenario: Boundary value — MM = 13
- **WHEN** `isPayPeriod('2024-13')` is called
- **THEN** it returns `true`

#### Scenario: Boundary value — MM = 99
- **WHEN** `isPayPeriod('2024-99')` is called
- **THEN** it returns `true`

---

### Requirement: Year-based period numbering
`YYYY-13` SHALL always represent the first pay period of year YYYY, regardless of the user's configured start date. The start date is a reference point for the cadence. The system SHALL project the cadence backward from the start date to find the earliest period whose start date falls within January of the given year; that period becomes `YYYY-13`. Subsequent periods are numbered sequentially: `YYYY-14`, `YYYY-15`, etc.

#### Scenario: First period of year is always -13
- **WHEN** pay periods are generated for any year with any supported frequency
- **THEN** the first period of that year has `monthId` ending in `-13`

#### Scenario: Biweekly periods — 26 periods per year
- **WHEN** `generatePayPeriods(2024, { payFrequency: 'biweekly', startDate: '2024-09-26' })` is called
- **THEN** the result contains exactly 26 periods with `monthId` values `2024-13` through `2024-38`

#### Scenario: Weekly periods — 52 or 53 periods per year
- **WHEN** `generatePayPeriods(2024, { payFrequency: 'weekly', startDate: '2024-01-05' })` is called
- **THEN** the result contains 52 or 53 periods, with the first having `monthId` `2024-13` and the last having `monthId` ≤ `2024-64`

#### Scenario: Monthly periods — periods aligned to start date
- **WHEN** `generatePayPeriods(2024, { payFrequency: 'monthly', startDate: '2024-01-15' })` is called
- **THEN** the result contains 12 periods, with period `2024-13` starting on January 15 and period `2024-14` starting on February 15

---

### Requirement: Period count does not exceed ID space
The system SHALL assert that the total number of generated periods for a year does not exceed 87 (the available ID slots `13`–`99`). If this assertion fails, `generatePayPeriods` SHALL throw an error.

#### Scenario: Weekly 53-week year within limit
- **WHEN** a year has 53 ISO weeks and frequency is `weekly`
- **THEN** `generatePayPeriods` succeeds and returns 53 periods (well below 87)

---

### Requirement: `generatePayPeriods` is memoized
`generatePayPeriods(year, config)` SHALL be memoized. The cache key SHALL be derived from the combination of `year`, `config.payFrequency`, and `config.startDate`. The cache SHALL invalidate when any of these values change.

#### Scenario: Same arguments return the same array reference
- **WHEN** `generatePayPeriods(2024, config)` is called twice with identical arguments
- **THEN** both calls return the same array reference (no recomputation)

#### Scenario: Different frequency invalidates cache
- **WHEN** `generatePayPeriods(2024, configA)` is called, then `generatePayPeriods(2024, configB)` with a different `payFrequency`
- **THEN** both calls return distinct arrays

---

### Requirement: Date-to-period mapping
`getPayPeriodFromDate(date, config)` SHALL return the `monthId` of the pay period that contains the given date. A date is "contained" in a period if it falls on or after the period's start date and on or before the period's end date.

#### Scenario: Date in the middle of a period
- **WHEN** a biweekly period runs Jan 5–18 and `getPayPeriodFromDate(new Date('2024-01-10'), config)` is called
- **THEN** it returns `'2024-13'`

#### Scenario: Date on period start boundary
- **WHEN** the first period starts January 5 and `getPayPeriodFromDate(new Date('2024-01-05'), config)` is called
- **THEN** it returns `'2024-13'`

#### Scenario: Date on period end boundary
- **WHEN** the first biweekly period ends January 18 and `getPayPeriodFromDate(new Date('2024-01-18'), config)` is called
- **THEN** it returns `'2024-13'`

#### Scenario: Date spanning year boundary falls in prior year's last period
- **WHEN** the last biweekly period of 2024 runs December 27 – January 9, 2025, and `getPayPeriodFromDate(new Date('2025-01-03'), config)` is called
- **THEN** it returns the last period ID of 2024 (e.g., `'2024-38'`), not a 2025 period ID

---

### Requirement: Current period identification
`getCurrentPayPeriod(date, config)` SHALL return the `monthId` of the pay period that contains the given date, equivalent to `getPayPeriodFromDate(date, config)`.

#### Scenario: Returns correct period for today
- **WHEN** today's date falls within a known biweekly period
- **THEN** `getCurrentPayPeriod(new Date(), config)` returns the `monthId` of that period

---

### Requirement: Period navigation
`nextPayPeriod(monthId)`, `prevPayPeriod(monthId)`, and `addPayPeriods(monthId, n)` SHALL navigate between period IDs by incrementing or decrementing the numeric `MM` segment, wrapping across year boundaries correctly.

#### Scenario: Next period within a year
- **WHEN** `nextPayPeriod('2024-15')` is called
- **THEN** it returns `'2024-16'`

#### Scenario: Next period at year boundary (biweekly — last period is -38)
- **WHEN** `nextPayPeriod('2024-38')` is called with biweekly config
- **THEN** it returns `'2025-13'`

#### Scenario: Previous period within a year
- **WHEN** `prevPayPeriod('2024-16')` is called
- **THEN** it returns `'2024-15'`

#### Scenario: Previous period at year boundary
- **WHEN** `prevPayPeriod('2025-13')` is called with biweekly config
- **THEN** it returns `'2024-38'`

#### Scenario: addPayPeriods with positive n
- **WHEN** `addPayPeriods('2024-13', 3)` is called
- **THEN** it returns `'2024-16'`

#### Scenario: addPayPeriods crossing year boundary
- **WHEN** `addPayPeriods('2024-36', 5)` is called with biweekly config (26 periods/year)
- **THEN** it returns `'2025-15'`

---

### Requirement: `_parse` fails fast for pay period IDs without config
When `_parse` is called with a pay period ID (MM ≥ 13) and no `config` is provided, it SHALL throw a descriptive error rather than silently returning a corrupted date.

#### Scenario: `_parse` with pay period ID and no config throws
- **WHEN** `_parse('2024-13')` is called without a config parameter
- **THEN** it throws an error with a message indicating that a pay period config is required

#### Scenario: `_parse` with pay period ID and config returns period start date
- **WHEN** `_parse('2024-13', config)` is called and period `2024-13` starts on `2024-01-05`
- **THEN** it returns a `Date` object representing January 5, 2024

#### Scenario: `_parse` with calendar month ID is unchanged
- **WHEN** `_parse('2024-03')` is called (no config needed)
- **THEN** it returns a `Date` object representing March 1, 2024

---

### Requirement: `months.ts` functions accept optional pay period config
The following `months.ts` functions SHALL accept an optional `config?: PayPeriodConfig` parameter. When a pay period ID is detected in the input AND `config` is provided, the function SHALL use period-aware logic. When `config` is absent and a pay period ID is detected, the function SHALL throw a descriptive error.

Affected functions: `bounds`, `prevMonth`, `nextMonth`, `addMonths`, `monthFromDate`, `currentMonth`, `rangeInclusive`, `nameForMonth`, `isBefore`, `isAfter`.

#### Scenario: `bounds` returns correct date range for a pay period
- **WHEN** `bounds('2024-13', config)` is called and period `2024-13` runs Jan 5–18
- **THEN** it returns `{ start: 20240105, end: 20240118 }`

#### Scenario: `bounds` for calendar month is unchanged
- **WHEN** `bounds('2024-03')` is called with no config
- **THEN** it returns `{ start: 20240301, end: 20240331 }`

#### Scenario: `prevMonth` navigates to prior pay period
- **WHEN** `prevMonth('2024-15', config)` is called
- **THEN** it returns `'2024-14'`

#### Scenario: `nextMonth` navigates to next pay period
- **WHEN** `nextMonth('2024-15', config)` is called
- **THEN** it returns `'2024-16'`

#### Scenario: `monthFromDate` returns period ID when enabled
- **WHEN** `config.enabled` is `true` and `monthFromDate('2024-01-10', config)` is called
- **THEN** it returns the period ID containing January 10

#### Scenario: `monthFromDate` returns calendar month when disabled
- **WHEN** `config.enabled` is `false` and `monthFromDate('2024-01-10', config)` is called
- **THEN** it returns `'2024-01'`

#### Scenario: `currentMonth` returns period ID when enabled
- **WHEN** `config.enabled` is `true` and `currentMonth(config)` is called
- **THEN** it returns the period ID containing today's date

#### Scenario: `rangeInclusive` enumerates period IDs between two period IDs
- **WHEN** `rangeInclusive('2024-13', '2024-16', config)` is called with biweekly config
- **THEN** it returns `['2024-13', '2024-14', '2024-15', '2024-16']`

#### Scenario: Mixed calendar and period IDs in `rangeInclusive` throws
- **WHEN** `rangeInclusive('2024-11', '2024-15', config)` is called (mixing calendar and period IDs)
- **THEN** it throws an error
