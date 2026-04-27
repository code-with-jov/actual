## Context

The pay period feature is functional but was built rapidly across multiple branches and merges. A four-dimensional code review (security, architecture, tech debt, integration) identified 12 distinct issues ranging from high-severity SQL injection risks to low-severity test coverage gaps. This change addresses the actionable items without altering feature behavior.

## Goals / Non-Goals

**Goals:**

- Eliminate SQL injection vectors in budget sheet creation
- Add server-side validation for all pay period configuration values
- Prevent unbounded loops from malformed configuration
- Fix untranslated UI strings for non-English locales
- Consolidate duplicated config construction into a single hook
- Wire the existing `resolveStartMonth()` function to prevent stale preference bugs
- Improve memoization strategy for cross-year navigation
- Add defensive guards to month utility functions that assume MM is 01-12
- Add missing edge case tests

**Non-Goals:**

- Changing pay period feature behavior or UX
- Adding a migration path for toggling pay periods (documented as known limitation)
- Refactoring E2E tests to eliminate flakiness (tracked separately)
- Optimizing `addPayPeriods` O(n) loop (acceptable for realistic inputs)

## Decisions

### 1. Parameterize SQL via `?` placeholders, not template literals

**File:** `packages/loot-core/src/server/budget/base.ts:77-90`

**Rationale:** The existing `createCategory` function uses `${start}`, `${end}`, and `'${cat.id}'` via string interpolation in a raw SQL query. Although `start`/`end` are integers (providing accidental protection), this violates secure coding practices. The `cat.id` is a UUID string that should never be interpolated.

**Change:** Replace the interpolated SQL with parameterized query using `?` placeholders and pass `[start, end, cat.id]` as the parameter array. This is consistent with how `db.runQuery` already supports parameterized queries elsewhere in the codebase.

### 2. Validate pay period config at the server preference layer

**File:** `packages/loot-core/src/server/preferences/app.ts:50-65`

**Rationale:** The UI validates input via `<input type="date">` and checkbox state, but synced preferences bypass UI validation. A malformed `startDate` (empty string, non-date) causes `new Date(NaN, NaN, NaN)` which propagates silently through date-fns arithmetic.

**Change:** In `loadPayPeriodConfig()`:
- Validate `startDate` matches `/^\d{4}-\d{2}-\d{2}$/` — if invalid, set `enabled = false` regardless of the `showPayPeriods` pref
- Validate `payFrequency` is one of `['weekly', 'biweekly', 'monthly']` — default to `'monthly'` if invalid
- Log a warning via the project logger when validation fails

### 3. Add iteration guards to `_generatePayPeriods` while loops

**File:** `packages/loot-core/src/shared/pay-periods.ts:36-128`

**Rationale:** The biweekly and weekly code paths have `while` loops that walk a cursor forward/backward. If `refDate` is an Invalid Date (from bad config), `d.differenceInDays(jan1, invalidDate)` returns `NaN`, and subsequent comparisons always fail, creating potential for stuck loops.

**Change:**
- Add an early return at the top of `_generatePayPeriods`: if `isNaN(refDate.getTime())`, return an empty array
- Add a `MAX_ITERATIONS = 1000` guard to each while loop (break + warning if exceeded)
- This is defense-in-depth alongside Decision 2's config validation

### 4. Extract `usePayPeriodConfigFromPrefs()` hook

**New file:** `packages/desktop-client/src/hooks/usePayPeriodConfigFromPrefs.ts`

**Rationale:** The identical pattern (read 3 synced prefs + feature flag → build `PayPeriodConfig` object) is duplicated in 3 components. Changes to the config shape require updating all 3. A shared hook eliminates this DRY violation.

**Change:** Create a new hook that encapsulates:
```typescript
export function usePayPeriodConfigFromPrefs(): PayPeriodConfig {
  const isPayPeriodsEnabled = useFeatureFlag('payPeriodsEnabled');
  const [showPayPeriods] = useSyncedPref('showPayPeriods');
  const [payPeriodFrequency] = useSyncedPref('payPeriodFrequency');
  const [payPeriodStartDate] = useSyncedPref('payPeriodStartDate');
  return useMemo(() => ({
    enabled: isPayPeriodsEnabled && showPayPeriods === 'true',
    payFrequency: (payPeriodFrequency as 'weekly' | 'biweekly' | 'monthly') ?? 'monthly',
    startDate: payPeriodStartDate ?? '',
  }), [isPayPeriodsEnabled, showPayPeriods, payPeriodFrequency, payPeriodStartDate]);
}
```

Replace inline construction in `budget/index.tsx`, `mobile/budget/BudgetPage.tsx`, and `mobile/budget/CategoryPage.tsx`.

### 5. Wire `resolveStartMonth()` at budget page startup

**Files:** `budget/index.tsx:68`, `mobile/budget/BudgetPage.tsx:112`

**Rationale:** `resolveStartMonth()` exists in `months.ts` but is never called. When a user enables pay periods, navigates (storing e.g. `2024-15` as `budget.startMonth`), then disables pay periods, the stored value is an invalid calendar month. The budget page silently uses it.

**Change:** Replace `const startMonth = startMonthPref || currentMonth` with:
```typescript
const startMonth = monthUtils.resolveStartMonth(startMonthPref, payPeriodConfig, currentMonth) || currentMonth;
```

### 6. Replace `memoizeOne` with multi-slot cache

**File:** `packages/loot-core/src/shared/pay-periods.ts:156`

**Rationale:** `memoizeOne` caches only the most recent call. Cross-year navigation (Dec 2024 ↔ Jan 2025) alternates `generatePayPeriods(2024, config)` and `generatePayPeriods(2025, config)`, thrashing the single cache slot every navigation click.

**Change:** Replace with a simple `Map<string, PayPeriod[]>` keyed by `${year}-${config.payFrequency}-${config.startDate}`. Clear the map when config changes (detected by comparing frequency + startDate). Cap map size at 5 entries (LRU eviction) to prevent unbounded growth.

### 7. Guard calendar-only functions in `months.ts`

**File:** `packages/loot-core/src/shared/months.ts`

**Rationale:** `getMonthIndex()`, `getYearStart()`, `getYearEnd()` assume MM is 01-12. Pay period IDs (MM ≥ 13) would return silently wrong results. These are public exports.

**Change:** Add `isPayPeriod()` check at the top of each function. If a pay period ID is passed, throw an error with a descriptive message (consistent with `_parse()` behavior). This makes the failure explicit rather than silent.

### 8. Translate frequency option labels

**File:** `packages/desktop-client/src/components/settings/PayPeriodSettings.tsx:15-19`

**Change:** Wrap display labels in `t()`:
```typescript
const FREQUENCY_OPTIONS: [string, string][] = [
  ['weekly', t('Weekly')],
  ['biweekly', t('Biweekly (every 2 weeks)')],
  ['monthly', t('Monthly')],
];
```

Move the array inside the component function so `t()` is available (or use `useMemo` with `t` dependency).

## Risks / Trade-offs

- **[Risk] SQL parameter change could affect query plan** → SQLite handles parameterized integers identically to interpolated ones. No performance impact.
- **[Risk] Throwing in `getMonthIndex()` could break callers** → Grep confirms no current callers pass pay period IDs. The throw is a safety net for future misuse.
- **[Trade-off] Config validation disables pay periods on bad input** → This is intentional fail-safe behavior. Users see calendar months rather than crashes. A warning log helps debugging.
- **[Trade-off] Multi-slot cache is slightly more complex than memoizeOne** → Bounded to 5 entries with simple key. Complexity is minimal and the performance benefit on year-boundary navigation is immediate.
