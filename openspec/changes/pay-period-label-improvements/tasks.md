## 1. Update `getPayPeriodLabel` function signature and picker format

- [x] 1.1 Change the third parameter of `getPayPeriodLabel` from `short: boolean` to `format: 'picker' | 'summary'` and add an optional `locale?` parameter
- [x] 1.2 Implement the `'picker'` format branch: call `generatePayPeriods`, group periods by start-date calendar month, find the target period's 1-based position within its month group, and return `{monthLetter}{withinMonthCount}` (e.g., `J1`)
- [x] 1.3 Derive the month letter as the first character of the start month's locale-aware `MMM` abbreviation via `date-fns`

## 2. Update `getPayPeriodLabel` summary format

- [x] 2.1 Implement the `'summary'` format branch: format start/end dates as `MMM d`, and return `{startDate} - {endDate} (PP{globalN})` (e.g., `Jan 5 - Jan 18 (PP1)`)
- [x] 2.2 Remove the now-unused `Pay Period ${periodNumber} (…)` long-format string

## 3. Update call sites

- [x] 3.1 Update `MonthPicker.tsx`: pass `format='picker'` (and `locale`) to `getPayPeriodLabel` instead of `short=true`
- [x] 3.2 Update both `BudgetSummary.tsx` files (envelope and tracking): pass `format='summary'` instead of `short=false`

## 4. Update unit tests

- [x] 4.1 Update `pay-periods.test.ts` label assertions to expect new formats (`J1`, `Jan 5 - Jan 18 (PP1)`, etc.)
- [x] 4.2 Add unit test cases for: within-month count increments correctly, cross-month period uses start month, monthly frequency (one period per month → always `{L}1`)

## 5. Update E2E tests

- [x] 5.1 Update `pay-periods.test.ts` E2E assertions for MonthPicker column headers (expect `J1` style labels)
- [x] 5.2 Update BudgetSummary E2E assertions to expect date-range format (e.g., `Jan 5 - Jan 18 (PP1)`)
