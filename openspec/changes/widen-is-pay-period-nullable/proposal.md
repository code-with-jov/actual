## Why

`isPayPeriod(id: string)` crashes with a `TypeError` when passed `undefined` — which happens on fresh sessions where `useLocalPref('budget.startMonth')` has no stored value. The function calls `id.slice(5, 7)` unconditionally, and `undefined.slice` throws. Widening the type signature to accept `string | undefined | null` and returning `false` early eliminates this crash and prevents the whole class of similar bugs at future call sites.

## What Changes

- Widen `isPayPeriod` parameter type from `string` to `string | undefined | null`
- Add an early `if (id == null) return false` guard at the top of the function
- Remove the defensive `String(month)` coercions in `months.ts` that worked around the narrow type (now callers can pass the value directly)
- Fix the immediate crash site in `budget/index.tsx` line 70 where `startMonthPref` (possibly `undefined`) was passed directly to `isPayPeriod`

## Capabilities

### New Capabilities

- None

### Modified Capabilities

- `pay-period-engine`: `isPayPeriod` now accepts `string | undefined | null` — callers no longer need to pre-validate or coerce the argument; the function returns `false` for non-string inputs.

## Impact

- `packages/loot-core/src/shared/pay-periods.ts` — function signature and guard
- `packages/loot-core/src/shared/months.ts` — remove `String()` coercions where no longer needed
- `packages/desktop-client/src/components/budget/index.tsx` — the crash site at line 70
- Unit tests in `pay-periods.test.ts` — add `undefined` / `null` cases
