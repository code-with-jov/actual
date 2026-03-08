## Context

Actual Budget's data model is built around `YYYY-MM` month strings as the fundamental budget unit. These strings drive spreadsheet sheet names (`budget202401`), transaction-to-budget routing, date range SQL queries, and all navigation in the UI. The `months.ts` module is the single source of shared date/month logic used by both frontend and backend.

The previous pay period attempt used a module-level singleton for config, which was error-prone (race conditions, hard-to-test implicit global state) and accumulated cache invalidation bugs. This design makes config explicit throughout.

The critical technical constraint: `_parse('2024-13')` in the current implementation silently returns `new Date(2024, 12, 1)` = January 1, 2025 — because JavaScript's `Date` constructor wraps month 12 (zero-indexed) to the next year. Any `months.ts` function that calls `_parse` on a pay period ID will produce incorrect results without fix.

## Goals / Non-Goals

**Goals:**
- Pay periods as first-class budget units with correct transaction routing, spreadsheet sheets, and navigation
- Zero schema changes; no migration path required
- Backward-compatible `months.ts` API — all existing callers work unchanged
- Explicit, predictable config threading (no module-level singleton)
- Desktop UI for configuring and viewing pay periods
- Architecture extensible to mobile and tracking budget in follow-on work

**Non-Goals:**
- Mobile UI (v1)
- Schedule/template integration with pay periods (v1)
- `semimonthly` frequency (deferred; math complexity not justified yet)
- Multi-budget pay period configs (one config per budget file)

## Decisions

### D1: ID Format — `YYYY-MM` with MM = 13–99

**Decision**: Reuse the existing `YYYY-MM` string format. Pay periods use `MM` values 13–99 (87 slots, sufficient for weekly = 52 max).

**Rationale**: `sheetForMonth('2024-13')` already produces a valid, collision-free sheet name (`budget202413`). No database schema changes. IDs are lexicographically sortable. Existing code that never receives a pay period ID is completely unaffected.

**Alternative considered**: A new prefix format like `PP-2024-01`. Rejected because it breaks the uniform `YYYY-MM` contract assumed throughout the codebase (comparisons, range generation, DB storage).

**Alternative considered**: Separate `zero_pay_budgets` table. Rejected because it requires schema migration and duplicates all the budget engine logic.

### D2: Year-Based Period Numbering

**Decision**: `YYYY-13` is always the 1st pay period of year YYYY. The user's `startDate` is a reference point for the cadence, not the origin of numbering. The system projects the cadence backward to find the first period that starts in January, which becomes `YYYY-13`.

**Rationale**: Deterministic. Changing the start date after configuration doesn't renumber all existing budget data. A biweekly user whose paycheck falls on September 26 still gets `2024-13` through `2024-38` as their 26 periods.

**Alternative considered**: `YYYY-13` = the first period after the user's start date. Rejected because retroactively re-indexing existing budget sheets when start date changes would corrupt historical data.

### D3: Explicit Config Passing (No Module Singleton)

**Decision**: `PayPeriodConfig` is passed explicitly at every boundary:
- **Frontend**: React context (`PayPeriodContext`) provided at `BudgetPage`, consumed via `usePayPeriodConfig()` hook.
- **Backend**: Config loaded from synced prefs at budget-open time (`loadPayPeriodConfig()`); passed as a parameter through `createAllBudgets → createBudget → createCategory` and `handleTransactionChange`.

The `months.ts` utility functions accept an **optional** `config?: PayPeriodConfig` parameter. When absent, existing calendar-month behavior is unchanged. When present and a pay period ID is detected, period-aware logic runs.

**Rationale**: Module singletons are hard to test (tests must reset shared state), create race conditions in server environments handling multiple budget files, and were the source of the cache invalidation bugs in the previous implementation. React context is the idiomatic React pattern; explicit server parameters are the idiomatic server pattern.

**Alternative considered**: Keep singleton but add explicit reset. Rejected because it preserves the hidden-state problem even if tests get cleanup hooks.

**Trade-off**: A few more function parameters. Accepted — clarity and correctness outweigh brevity.

### D4: `_parse` Fix — Period IDs Resolve to Period Start Date

**Decision**: `_parse(id, config?)` — when `id` is a pay period ID (MM ≥ 13) and `config` is provided, return the actual start date of that period by looking it up in `generatePayPeriods(year, config)`. When `config` is absent and the ID is a pay period, throw a clear error rather than silently returning a wrong date.

**Rationale**: Silent corruption (`2024-13` → Jan 2025) is worse than a loud error. Any caller that passes a pay period ID to `_parse` must have the config available — if they don't, it's a programming error that should surface immediately.

**Implementation**: `generatePayPeriods` is memoized (cache key: year + frequency + startDate), so the lookup is O(1) amortized.

### D5: The Presence Rule

**Decision**: Only `currentMonth(config)` and `monthFromDate(date, config)` check `config.enabled` to decide whether to generate a period ID. All other functions that receive a period ID trust it as valid and only verify `config !== null` (fail-fast), never re-check `config.enabled`.

**Rationale**: Eliminates redundant checks throughout the codebase. If a pay period ID exists, it was generated by code that already verified `enabled`. Re-checking introduces inconsistency risk (what if the check disagrees?).

### D6: `getBudgetRange` Buffer Strategy for Pay Periods

**Decision**: When pay periods are enabled, `getBudgetRange` generates a range of period IDs rather than calendar month IDs. Buffer heuristic: 3 "periods" before earliest and 12 "periods" after current, where "periods" matches the frequency (3 biweekly periods ≈ 6 weeks, not 3 months). The range enumerator (`rangeInclusive` equivalent for periods) uses `generatePayPeriodRange`.

**Rationale**: The current month-based buffer (3 months before, 12 months after) is semantic — "have some history, have a year of future". We preserve the semantic intent rather than the literal count.

### D7: Transaction Routing at Year Boundaries

**Decision**: `handleTransactionChange` uses the transaction's actual date to determine the period ID via `monthFromDate(date, config)`. A transaction dated January 3, 2025 that falls in the last biweekly period of 2024 (which spans Dec 27 – Jan 9) gets routed to `2024-38` (the last period of 2024), not `2025-13`.

**Rationale**: Period ownership is determined by date containment, not the calendar year of the date. `getPayPeriodFromDate` handles this correctly by checking actual period boundaries.

**Risk**: A period spanning a year boundary has its sheet in the prior year (`2024-38`) but contains transactions dated in the new year. Reports and queries filtering by "year" of the month ID need to be aware of this. Documented as a known limitation.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Year-boundary transactions in prior-year sheets | Document clearly; report queries should filter by date range not sheet year |
| `generatePayPeriods` called repeatedly with different configs clears memoization cache | Memoize on (year, frequency, startDate) tuple; config changes are infrequent |
| `monthly` frequency edge case: period boundaries depend on start date, not calendar | `generatePayPeriods` for monthly uses date arithmetic from startDate, not `startOfMonth` |
| Weekly periods: 52–53 periods/year; must not exceed 99 (limit of ID space) | 53 × weekly = max 53 periods; far below 87 slot limit. Add assertion in generator. |
| Switching frequency after having pay period budget data orphans old sheets | v1: warn user that switching frequency resets pay period budget data; treat as intentional action |
| Existing code that does `monthUtils.isBefore('2024-13', '2024-12')` — period IDs parse incorrectly without config | `isBefore` with period IDs must require config; add config param. Lint rule or type enforcement TBD. |

## Migration Plan

No database migration required. Feature is gated behind `payPeriodsEnabled` feature flag. Enabling the feature for a user:
1. User enables flag in Labs/Settings
2. User configures frequency + start date in new Settings section
3. `showPayPeriods: 'true'` is saved to synced prefs
4. On next budget load, `createAllBudgets` generates pay period sheets alongside existing calendar month sheets
5. Budget UI switches to period view

**Rollback**: Set `showPayPeriods: 'false'`. Calendar month sheets still exist and are unmodified. Pay period sheets remain in the spreadsheet but are ignored. No data loss.

## Open Questions

- **Q1**: Should switching pay frequency (e.g., biweekly → weekly) automatically archive old period sheets or simply leave them orphaned? Decision needed before Settings UI implementation.
- **Q2**: The `monthly` frequency produces periods whose boundaries don't align with calendar months. Should `nameForMonth` for a monthly pay period show "Pay Period 1 (Jan 15 – Feb 14)" or just "PP 1"? UX decision.
- **Q3**: Should `rangeInclusive` with mixed calendar+period IDs (e.g., start=`2024-11`, end=`2024-15`) be supported or explicitly rejected? Current plan: reject with a clear error.
