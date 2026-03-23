## 1. Core Function Change

- [x] 1.1 Widen `isPayPeriod` parameter type to `string | undefined | null` in `packages/loot-core/src/shared/pay-periods.ts`
- [x] 1.2 Add early-return guard `if (id == null) return false` before the `.slice()` call

## 2. Fix Crash Site

- [x] 2.1 Remove the `String(month)` coercions in `packages/loot-core/src/shared/months.ts` where the underlying type is already `string | undefined | null` and the coercion was only defensive

## 3. Unit Tests

- [x] 3.1 Add `isPayPeriod(undefined)` → `false` test case to `packages/loot-core/src/shared/pay-periods.test.ts`
- [x] 3.2 Add `isPayPeriod(null)` → `false` test case to `packages/loot-core/src/shared/pay-periods.test.ts`

## 4. Verification

- [x] 4.1 Run `yarn typecheck` and confirm no new type errors
- [x] 4.2 Run `yarn workspace @actual-app/core run test` and confirm all pay-period tests pass
- [x] 4.3 Run `yarn lint:fix` and confirm no lint errors
