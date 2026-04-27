## Context

The pay period engine (`pay-periods.ts`, `months.ts`) and the desktop budget page are fully implemented and tested. The mobile budget page (`mobile/budget/BudgetPage.tsx`) and the mobile category drill-through (`CategoryPage.tsx`, `CategoryTransactions.tsx`) were never updated to be pay-period-aware. This change brings them in line with the desktop pattern without touching the engine.

`CategoryPage` is a **separate React route** (served via `/categories/:id?month=...`), not a child of `BudgetPage`. This means it cannot consume `PayPeriodProvider` from `BudgetPage` and must set up its own provider.

## Goals / Non-Goals

**Goals:**

- `BudgetPage`: construct `PayPeriodConfig` from prefs, wrap in `PayPeriodProvider`, fix all `monthUtils` calls to pass config
- `MonthSelector`: correct prev/next disabled state and period label for pay periods
- `CategoryPage`: construct `PayPeriodConfig`, wrap in `PayPeriodProvider`, fix header label
- `CategoryTransactions`: date-range filter for pay period drill-through

**Non-Goals:**

- Mobile settings UI for configuring pay periods
- Changes to the pay period engine, spreadsheet bindings, or `BudgetTable`

---

## Decisions

### D1: Follow the desktop `PayPeriodProvider` pattern in both `BudgetPage` and `CategoryPage`

**Decision**: Both `BudgetPage` and `CategoryPage` independently read the three synced prefs (`showPayPeriods`, `payPeriodFrequency`, `payPeriodStartDate`), build a `PayPeriodConfig` via `useMemo`, and wrap their subtrees in `PayPeriodProvider`.

**Rationale**: `CategoryPage` is a separate React route tree. It cannot share the provider from `BudgetPage`. Duplicating the three-pref read and the `useMemo` is preferable to introducing a shared hook for what is a straightforward, three-line setup. The desktop `index.tsx` already establishes this as the canonical pattern.

**Alternative considered**: A `usePayPeriodConfigFromPrefs()` custom hook. Rejected for now — the inline setup is simple enough, and the hook would not be reused elsewhere at this stage.

### D2: `CategoryTransactions` uses `usePayPeriodConfig()` from context

**Decision**: `CategoryTransactions` calls `usePayPeriodConfig()` from `PayPeriodContext` (provided by `CategoryPage`'s wrapping `PayPeriodProvider`). No prop threading needed.

**Rationale**: Consistent with how all desktop components consume config. The context is available because `CategoryPage` wraps its subtree.

### D3: `getCategoryMonthFilter` detects pay period IDs via `isPayPeriod()` and switches to date-range filter

**Decision**: When `isPayPeriod(month)` is true and a config is available, compute the period's date range via `monthUtils.bounds(month, config)`, convert the YYYYMMDD integers to `yyyy-MM-dd` strings, and return:

```
{
  category: category.id,
  date: { $gte: startDateStr, $lte: endDateStr },
}
```

When `isPayPeriod(month)` is false (or no config), keep the existing:

```
{
  category: category.id,
  date: { $transform: '$month', $eq: month },
}
```

**Rationale**: Matches the exact pattern used in the desktop `onShowActivity` (see `index.tsx:156–168`). The `$gte`/`$lte` operators work on the `date` field (stored as YYYYMMDD integers) in the query engine.

**YYYYMMDD-to-string conversion**: `const s = String(n); return \`${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}\`` — same helper as in`index.tsx`.

### D4: `MonthSelector` receives `payPeriodConfig` as a prop

**Decision**: Pass `payPeriodConfig` from `BudgetPage` down to `MonthSelector` as a prop rather than having `MonthSelector` call `usePayPeriodConfig()` from context.

**Rationale**: `MonthSelector` is a private sub-component of `BudgetPage` (defined in the same file, not exported). Prop threading over one level is simpler than adding a context dependency to a local component. If `MonthSelector` is ever extracted, this is an easy change.

### D5: `MonthSelector` period label uses `getPayPeriodLabel(..., 'summary', locale)`

**Decision**: When the displayed `month` is a pay period ID (detected via `isPayPeriod(month)`), render the label via `getPayPeriodLabel(month, config, 'summary', locale)` (e.g., `"Jan 5 - Jan 18 (PP1)"`). For calendar months, keep the existing `monthUtils.format(month, "MMMM ''yy", locale)`.

**Rationale**: The mobile `MonthSelector` shows one period at a time in a large center button — the 'summary' format is the most informative and legible at that size. The compact 'picker' format (`"J1"`) is designed for the desktop's dense scrolling month picker, not for a single-period label.

### D6: `MonthSelector` prev/next bounds use period start-date comparison against calendar bounds integers

**Decision**: When pay periods are enabled, compute `prevEnabled` and `nextEnabled` by comparing the **adjacent period's start date** (an integer from `monthUtils.bounds(adjacentPeriodId, config).start`) against the **first day of `monthBounds.start`** and the **last day of `monthBounds.end`** respectively (derived from `monthUtils.bounds(calendarMonthId).start/.end`).

```
// prevEnabled
const prevPeriodId = monthUtils.prevMonth(month, config);
const prevPeriodStart = monthUtils.bounds(prevPeriodId, config).start;
const calendarBoundsStart = monthUtils.bounds(monthBounds.start).start;
prevEnabled = prevPeriodStart >= calendarBoundsStart;

// nextEnabled
const nextPeriodId = monthUtils.nextMonth(month, config);
const nextPeriodStart = monthUtils.bounds(nextPeriodId, config).start;
const calendarBoundsEnd = monthUtils.bounds(monthBounds.end).end;
nextEnabled = nextPeriodStart <= calendarBoundsEnd;
```

For calendar months, keep the existing string comparison logic unchanged.

**Rationale**: Lexicographic string comparison between pay period IDs (`"2024-13"`) and calendar month IDs (`"2024-12"`) is incorrect — `"13" > "12"` alphabetically, so the upper bound check (`month < monthBounds.end`) always returns false when pay periods are active. Using integer date comparison against the YYYYMMDD bounds returned by `monthUtils.bounds()` gives accurate results regardless of whether the period spans a year boundary.

### D7: `CategoryPage` header label uses `getPayPeriodLabel(..., 'summary', locale)` for pay period IDs

**Decision**: Apply the same branch as D5 in `CategoryPage`'s header title:

```typescript
const periodLabel =
  isPayPeriod(month) && payPeriodConfig?.enabled
    ? getPayPeriodLabel(month, payPeriodConfig, 'summary', datefnsLocale)
    : monthUtils.format(month, "MMMM ''yy", locale);
```

**Rationale**: Prevents `monthUtils.format` from receiving a pay period ID (which would produce garbage output) and gives users a readable date-range label matching what the mobile budget header shows.

---

## Risks / Trade-offs

- **Duplicate pref reads**: Both `BudgetPage` and `CategoryPage` read the same three prefs. This is minor — `useSyncedPref` is lightweight and consistent across the codebase.
- **`MonthSelector` bounds complexity**: The D6 date-integer comparison is more code than the original one-liner. The complexity is localized to `MonthSelector` and is well-commented.
- **`CategoryPage` receives a `datefnsLocale` object**: `getPayPeriodLabel` accepts a `date-fns` `Locale` object for month abbreviations. `CategoryPage` currently uses the `locale` string from `useLocale()`. The correct `date-fns` locale must be sourced — follow the same pattern as `MonthPicker.tsx` which calls `useLocale()` and passes the result to date-fns format calls (the hook returns the date-fns locale object, not just a string).

## Migration Plan

Pure UI change — no data migration, feature flags, or backwards-compatibility concerns beyond what already exists (the `payPeriodsEnabled` feature flag gates the config's `enabled` field in both `BudgetPage` and `CategoryPage`, same as the desktop).
