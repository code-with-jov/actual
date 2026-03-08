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
- Changing any data model, period ID format, or navigation logic
- Disambiguating months that share a first letter (J=Jan/Jun/Jul, M=Mar/May, A=Apr/Aug) — accepted trade-off in favour of compactness; sequential context in the picker makes this workable
- Supporting a separate "per-month count" in the BudgetSummary (it shows the global number)

## Decisions

### D1: Short format requires a `generatePayPeriods` lookup (previously did not)

**Decision**: The new short format (`J1`) requires knowing the period's actual start date to derive the month letter and its position among sibling periods in that calendar month. This means calling `generatePayPeriods` even for the short label.

**Rationale**: `generatePayPeriods` is already memoized (`memoizeOne`), so a warm call within the same render cycle is essentially free. The alternative — encoding month metadata into the period ID — would be a breaking change to the data model.

**Alternative considered**: Store a pre-computed `withinMonthCount` on the `PayPeriod` struct. Rejected: adds complexity to the type for a display-only concern.

### D2: Function signature — boolean `short` replaced by string `format`

**Decision**: Change the third parameter from `short: boolean` to `format: 'picker' | 'summary'` (default `'summary'`).

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

## Risks / Trade-offs

- **J/M/A ambiguity in MonthPicker**: Periods starting in January, June, and July all get label prefix `J`. Within sequential navigation this is workable (users know where in the year they are), but a picker rendered in isolation (e.g., a tooltip) may be confusing. → Accepted; can revisit with two-letter prefix if user feedback warrants it.

- **Short-format performance regression (negligible)**: Short labels now call `generatePayPeriods`; previously they did not. The function is memoized so this is a warm-cache lookup after the first call. → No action needed.

- **Locale parameter addition**: Adding `locale?` to `getPayPeriodLabel` is a minor API surface change. All internal call sites are under our control. → Low risk.

## Migration Plan

Pure display change — no data migration or feature flag needed. Deploy directly; existing period IDs and preferences are unaffected.
