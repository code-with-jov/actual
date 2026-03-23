## MODIFIED Requirements

### Requirement: Pay period ID format

Pay period IDs SHALL use the `YYYY-MM` format with `MM` values from `13` to `99` inclusive. Calendar month IDs use `01`–`12`; pay period IDs use `13`–`99`. The `isPayPeriod(id)` function SHALL accept `string | undefined | null` and SHALL return `true` if and only if the numeric value of the `MM` segment is ≥ 13. It SHALL return `false` for `undefined`, `null`, or any value that is not a valid `YYYY-MM` string.

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

#### Scenario: undefined input

- **WHEN** `isPayPeriod(undefined)` is called
- **THEN** it returns `false` without throwing

#### Scenario: null input

- **WHEN** `isPayPeriod(null)` is called
- **THEN** it returns `false` without throwing
