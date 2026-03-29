## Context

Pay period labels are rendered in three places on mobile: the `MonthSelector` heading in `BudgetPage.tsx`, the category group row labels in `BudgetPage.tsx`, and the category page header in `CategoryPage.tsx`. All three currently call `getPayPeriodLabel(period, 'summary')`, which produces `Jan 5 - Jan 18 (PP1)`. The `(PPX)` suffix pushes the label past the available width in the mobile header bar.

This is a standalone change — no dependency on `budget-pay-period-toggle` or any other in-flight work.

---

## Goals / Non-Goals

**Goals:**

- Add `'short'` format to `getPayPeriodLabel` returning just the date range
- Switch all three mobile call sites to `'short'`

**Non-Goals:**

- Desktop label changes
- Mobile engine reconnection or toggle wiring
- Pay period engine changes beyond the new format

---

## Decisions

### D8: Mobile uses `'short'` label format — no `(PPX)` suffix

**Decision**: Add a `'short'` branch to `getPayPeriodLabel` in `pay-periods.ts` that returns `${formatDate(startDate)} - ${formatDate(endDate)}` with no `(PP${periodNumber})` suffix. Update the `format` parameter union type from `'picker' | 'summary'` to `'picker' | 'short' | 'summary'`. Switch all three mobile call sites from `'summary'` to `'short'`. Desktop call sites remain on `'summary'`.

**Rationale**: The mobile header bar has a logo button on the left and a calendar button on the right, leaving only the center strip for the title. The `(PP1)` suffix causes the label to overflow or truncate on small screens. The period number is supplemental information — users already know they're in pay period mode — so omitting it on mobile is a clean trade-off. A dedicated `'short'` format keeps the function expressive and avoids mobile-specific string manipulation at call sites.

**Alternative considered**: String-manipulate the summary label at call sites (e.g., `label.replace(/\s+\(PP\d+\)$/, '')`). Rejected — fragile, locale-dependent, and leaks knowledge of the format string into every mobile component.

---

## Risks / Trade-offs

- Power users who track period numbers lose that at a glance on mobile. They can still see it on desktop or in Settings. The UX gain (no truncation) outweighs the loss.
- Any existing mobile Playwright test asserting on `/PP\d+/` in heading text will need updating — the heading will no longer contain the period number.

## Migration Plan

Pure UI change. No data migration. Standalone — can be applied before or after `budget-pay-period-toggle`.
