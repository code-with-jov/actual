## Context

`isPayPeriod(id: string)` is a hot-path utility called across ~20 sites in both `loot-core` and `desktop-client`. Its current implementation does `id.slice(5, 7)` unconditionally, which crashes when `id` is `undefined`. The root crash site is `budget/index.tsx` line 70, where `useLocalPref('budget.startMonth')` returns `string | undefined` and is fed directly to `isPayPeriod`. The file has `// @ts-strict-ignore` so TypeScript cannot catch this mismatch.

A secondary pattern exists in `months.ts`: several callers coerce with `String(month)` before calling `isPayPeriod` — a workaround that technically avoids a crash (`String(undefined)` → `"undefined"` → `NaN >= 13` → `false`) but only by accident.

## Goals / Non-Goals

**Goals:**
- Eliminate the `TypeError: Cannot read properties of undefined (reading 'slice')` crash in the Budget component
- Make `isPayPeriod` safe to call with any value that could plausibly reach it
- Remove the defensive `String()` coercions in `months.ts` that existed to paper over the narrow type
- Add test coverage for `undefined` / `null` inputs

**Non-Goals:**
- Changing the semantics of `isPayPeriod` for valid `string` inputs
- Refactoring `// @ts-strict-ignore` out of `budget/index.tsx` (separate concern)
- Touching call sites that already receive a guaranteed `string` (no cleanup needed there)

## Decisions

### Widen the parameter type at the function, not at each call site

**Decision**: Change `isPayPeriod(id: string)` to `isPayPeriod(id: string | undefined | null): boolean` with an early-return guard.

**Rationale**: There are ~20 call sites. Guarding only the one crash site leaves all future callers vulnerable to the same bug. The semantic meaning of `isPayPeriod` makes `false` the obviously correct return for `undefined` / `null` — neither is a pay period ID. Widening the type encodes this at the source of truth.

**Alternative considered**: Guard only `index.tsx:70` with `startMonthPref != null && isPayPeriod(startMonthPref)`. Rejected because it's a band-aid; the next `useLocalPref` value passed to `isPayPeriod` somewhere else will hit the same crash.

### Remove `String(month)` coercions in `months.ts`

**Decision**: Where `months.ts` calls `isPayPeriod(String(month))` and `month` is typed `string | number`, remove the `String()` wrapper now that `isPayPeriod` can handle `undefined` / `null`. The coercions were defensive workarounds, not intentional design.

**Rationale**: Cleaner call sites, no behavior change (a `number` coerced to string still produces a non-pay-period ID, same result as before).

## Risks / Trade-offs

- [Risk] Widening the type could allow callers to pass garbage values they shouldn't have → Mitigation: The function has always been a pure predicate; returning `false` for non-string inputs is semantically correct and safe. No downstream code branches on `isPayPeriod` returning `true` for `undefined`.
- [Risk] Removing `String()` coercions changes how numeric months flow → Mitigation: `isPayPeriod(42)` would now be caught by TypeScript (number is not `string | undefined | null`). Those call sites pass `String(month)` explicitly, so after removal they'd need to stay as-is OR TypeScript would flag them — a good outcome either way. Only remove coercions where TS confirms the underlying type is already `string | undefined | null`.
