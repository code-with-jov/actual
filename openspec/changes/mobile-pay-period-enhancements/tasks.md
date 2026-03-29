## 1. `pay-periods.ts` — Add `'short'` format

- [ ] 1.1 Update the `format` parameter type from `'picker' | 'summary'` to `'picker' | 'short' | 'summary'`
- [ ] 1.2 Update the JSDoc comment to document the `'short'` format: `'{startDate} - {endDate}'` — e.g. `'Jan 5 - Jan 18'`
- [ ] 1.3 Add a `'short'` branch before the existing `// 'summary' format` block that returns `${formatDate(startDate)} - ${formatDate(endDate)}` (no `(PP${periodNumber})` suffix)

---

## 2. Mobile call sites — switch to `'short'`

- [ ] 2.1 In `BudgetPage.tsx` (category group row label): change `'summary'` → `'short'`
- [ ] 2.2 In `BudgetPage.tsx` `MonthSelector` (header label): change `'summary'` → `'short'`
- [ ] 2.3 In `CategoryPage.tsx` (category page header): change `'summary'` → `'short'`

---

## 3. Verification

- [ ] 3.1 Run `yarn typecheck` — ensure the new format literal is accepted at all call sites
- [ ] 3.2 Run `yarn lint:fix`
- [ ] 3.3 Update any existing mobile Playwright test assertions that match `/PP\d+/` in heading text — the heading no longer includes the period number
