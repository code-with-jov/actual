## Context

Pay periods use the `getPayPeriodLabel(monthId, config, short)` function in `pay-periods.ts`. Currently:

- **Short** (`short=true`): Returns `PP ${periodNumber}` — computed from the raw ID offset alone, no period lookup required.
- **Long** (`short=false`): Calls `generatePayPeriods(year, config)` to find the period's start/end dates, then returns `Pay Period ${N} (MMM d – MMM d)`.

The MonthPicker uses the short format; BudgetSummary uses the long format. Both formats need to change to be more user-friendly.

## Goals / Non-Goals

**Goals:**

- MonthPicker label → `{monthLetter}{withinMonthCount}` (e.g., `J1`, `J2`, `F1`)
- BudgetSummary label → `{startDate} - {endDate} (PP{globalN})` (e.g., `Jan 5 - Jan 18 (PP1)`)
- Localisation-safe: month letter derived from the locale's month name first character

**Non-Goals:**

- Changing any data model or period ID format
- Reworking navigation architecture — only threading `payPeriodConfig` through existing call sites where pay period IDs are passed to utility functions that require it
- Disambiguating months that share a first letter (J=Jan/Jun/Jul, M=Mar/May, A=Apr/Aug) — accepted trade-off in favour of compactness; sequential context in the picker makes this workable
- Supporting a separate "per-month count" in the BudgetSummary (it shows the global number)

## Decisions

### D1: Short format requires a `generatePayPeriods` lookup (previously did not)

**Decision**: The new short format (`J1`) requires knowing the period's actual start date to derive the month letter and its position among sibling periods in that calendar month. This means calling `generatePayPeriods` even for the short label.

**Rationale**: `generatePayPeriods` is already memoized (`memoizeOne`), so a warm call within the same render cycle is essentially free. The alternative — encoding month metadata into the period ID — would be a breaking change to the data model.

**Alternative considered**: Store a pre-computed `withinMonthCount` on the `PayPeriod` struct. Rejected: adds complexity to the type for a display-only concern.

### D2: Function signature — boolean `short` replaced by string `format`

**Decision**: Change the third parameter from `short: boolean` to `format: 'picker' | 'short' | 'summary'` (default `'summary'`). The `'short'` format is for mobile surfaces (see D6).

**Rationale**: Two formats already felt like a stretch for a boolean; a third format would make `short=true, summary=false` unreadable. Named formats are self-documenting and extensible.

**Migration**: The two call sites (MonthPicker: `short=true` → `format='picker'`; BudgetSummary: `short=false` → `format='summary'`) are the only consumers. No public API change.

### D3: Month letter derived from locale's `MMM` abbreviation first character

**Decision**: Derive the single-letter month identifier as `d.format(startDate, 'MMM', { locale })[0]`.

**Rationale**: Using the locale-aware three-letter abbreviation's first character means the label is at least consistent with the locale rather than hard-coded English. Two-letter disambiguation (e.g., `Ja`/`Jn`/`Jl`) was considered but rejected because clean two-letter codes don't exist universally across locales.

**Caveat**: Locale is not currently passed to `getPayPeriodLabel`. The function will need a `locale?` parameter added. Call sites already have locale available.

### D4: `withinMonthCount` computed by grouping all periods by start-month

**Decision**: After `generatePayPeriods`, group periods by `startDate` calendar month, then find the index of the target period within its group.

```
allPeriods
  .filter(p => sameCalendarMonth(p.startDate, targetPeriod.startDate))
  .findIndex(p => p.monthId === targetMonthId) + 1
```

**Rationale**: Simple, correct, and the memoized `generatePayPeriods` makes the full scan cheap.

### D5: BudgetSummary date format matches existing long-format style

**Decision**: Use `MMM d` (e.g., `Jan 5`) with a hyphen-space separator: `Jan 5 - Jan 18 (PP1)`.

**Rationale**: Matches the user's stated example. The existing long format uses an en-dash (–); the new format uses a plain hyphen for simplicity and better keyboard accessibility in copy-paste scenarios.

### D6: Mobile uses `'short'` format — date range only, no `(PPX)` suffix

**Decision**: Add a `'short'` branch to `getPayPeriodLabel` that returns `${formatDate(startDate)} - ${formatDate(endDate)}` with no `(PP${periodNumber})` suffix. Switch all three mobile call sites (`BudgetPage.tsx` category group rows, `BudgetPage.tsx` `MonthSelector` header, `CategoryPage.tsx` header) from `'summary'` to `'short'`. Desktop call sites remain on `'summary'` or `'picker'`.

**Rationale**: The mobile header bar has a logo button on the left and a calendar button on the right, leaving only the center strip for the title. The `(PP1)` suffix causes the label to overflow or truncate on small screens. The period number is supplemental — users already know they're in pay period mode — so omitting it on mobile is a clean trade-off. A dedicated `'short'` format is expressive and avoids mobile-specific string manipulation at call sites.

**Alternative considered**: String-manipulate the summary label at call sites (`label.replace(/\s+\(PP\d+\)$/, '')`). Rejected — fragile, locale-dependent, and leaks format knowledge into every mobile component.

**Why `'short'` fits here**: D2 already extended the format parameter from `boolean` to named literals. Adding `'short'` as a third option is a natural extension with no breaking change — all existing call sites pass an explicit format.

### D7: `MonthSelector` navigation bounds must propagate `payPeriodConfig` to `subMonths`

**Decision**: `MonthSelector.nextEnabled` is computed as `month < monthUtils.subMonths(monthBounds.end, 1)`. When pay periods are enabled, `monthBounds.end` is a pay period ID (e.g., `2026-30`). `subMonths` accepts an optional `config?: PayPeriodConfig` parameter — without it, `_parse` throws when given a pay period ID. The fix is to pass `payPeriodConfig` as the third argument.

**Root cause**: The original Non-Goal "no navigation logic changes" was too broad. `monthBounds` is populated by `get-budget-bounds`, which returns pay period IDs when pay periods are active. Any `monthUtils` call that receives a value from `monthBounds` must thread `payPeriodConfig` through.

**Rationale**: `subMonths` already has the optional parameter; this is a one-argument fix at the call site, not a rework of navigation logic. `prevEnabled` (`month > monthBounds.start`) uses a direct string comparison, which is safe because all pay period IDs are zero-padded two-digit suffixes starting at `13`, preserving lexicographic order.

### D8: `resolveMonthToDateFilter` lives in `pay-periods.ts`, not a query utility module

**Decision**: Add `resolveMonthToDateFilter(month, config?)` to `loot-core/src/shared/pay-periods.ts` alongside `isPayPeriod` and `generatePayPeriods`, rather than in a separate query utility.

**Rationale**: The function's primary job is resolving a pay period ID to its date range — knowledge that already lives in `pay-periods.ts`. Keeping it there maintains a one-directional dependency: pay period logic knows about query filter shapes, but query callers remain agnostic and just receive a filter object.

**Alternative considered**: A separate `month-filters.ts` utility. Rejected — unnecessary indirection for a single function that depends entirely on pay period logic already in `pay-periods.ts`.

**Fallback behaviour**: When `isPayPeriod(month)` is true but no `config` is provided, the function falls back to `{ $transform: '$month', $eq: month }`. This produces an empty result rather than a crash — safe and observable in development.

### D9: `isCurrentPeriod` added to `pay-periods.ts`; `monthUtils.isCurrentMonth` left unchanged

**Decision**: Add `isCurrentPeriod(month, config?)` to `pay-periods.ts` and replace the three `monthUtils.isCurrentMonth(month)` calls in budget table components at their call sites. Do not modify `monthUtils.isCurrentMonth`.

**Rationale**: `monthUtils.isCurrentMonth` is a general utility used broadly with no pay period knowledge. Adding `config?` there would create a dependency from `months.ts` into `pay-periods.ts` (circular risk given `pay-periods.ts` already imports from `months.ts`) and would widen the API of a high-reuse function for a niche concern. Replacing at call sites is surgical and keeps modules cleanly separated.

**Alternative considered**: Overload `monthUtils.isCurrentMonth(month, config?)`. Rejected — circular import risk and pollutes a general utility with pay period specifics.

**Threading strategy**: `payPeriodConfig` is added to `BudgetTableProps` and threaded to `BudgetTableHeader`, `BudgetGroups` → `ExpenseGroupList` → `ExpenseGroupListItem` → `ExpenseGroupHeader`, and `ExpenseCategoryList` → `ExpenseCategoryListItem`. This is 2–3 hops per path; acceptable given the object is already computed in `BudgetPage` and the components are co-located.

## Risks / Trade-offs

- **J/M/A ambiguity in MonthPicker**: Periods starting in January, June, and July all get label prefix `J`. Within sequential navigation this is workable (users know where in the year they are), but a picker rendered in isolation (e.g., a tooltip) may be confusing. → Accepted; can revisit with two-letter prefix if user feedback warrants it.

- **Short-format performance regression (negligible)**: Short labels now call `generatePayPeriods`; previously they did not. The function is memoized so this is a warm-cache lookup after the first call. → No action needed.

- **Locale parameter addition**: Adding `locale?` to `getPayPeriodLabel` is a minor API surface change. All internal call sites are under our control. → Low risk.

## Migration Plan

Pure display change — no data migration or feature flag needed. Deploy directly; existing period IDs and preferences are unaffected.
