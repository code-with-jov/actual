## Context

Three mobile pay-period E2E tests are failing because:

1. `EnvelopeBudgetMonthMenuModal` and `EnvelopeBudgetSummaryModal` call `monthUtils.format()` / `monthUtils.prevMonth()` with a pay period ID but no `PayPeriodConfig`. `_parse` throws, React's error boundary shows "Fatal Error".
2. `BudgetPageMenuModal` does not close after `onTogglePayPeriods` is invoked, leaving a second `<h1>` in the DOM and causing a Playwright strict-mode violation.
3. `MonthSelector` in `BudgetPage.tsx` calls `monthUtils.format(startMonth, ...)` during the one render cycle after `payPeriodConfig` is set to `undefined` (disabled) but before `startMonth` is updated to a calendar month ID.

The existing `pay-period-ui` spec already requires that components MUST NOT call `months.ts` functions with a pay period ID and no config (Requirement: Internal budget components must consume PayPeriodConfig from context), but the modal components and MonthSelector guard were not updated.

## Goals / Non-Goals

**Goals:**
- Stop the three failing tests by fixing the four crash/violation sites.
- Pass `PayPeriodConfig` into the two envelope modals so they can format pay period months correctly.
- Close `BudgetPageMenuModal` after toggling pay periods.
- Guard `MonthSelector`'s `periodLabel` computation against a stale pay period ID during the disable transition.

**Non-Goals:**
- Refactoring how pay period config is managed globally.
- Changing modal designs or adding new UI.
- Fixing the same class of bug in `TrackingBudgetMonthMenuModal` (tracking mode does not support pay periods).

## Decisions

### Decision 1: Propagate `payPeriodConfig` via modal options (not context)

Modals are opened from `BudgetPage.tsx` via Redux `pushModal`, decoupled from the component tree. They cannot reliably read `PayPeriodConfig` from the `PayPeriodProvider` context because they mount in a portal outside that tree. The cleanest solution is to pass `payPeriodConfig` as an optional field in the modal options at dispatch time.

**Alternative considered:** Read config from synced prefs inside each modal. Rejected — duplicates the same derivation logic already centralised in `BudgetPage.tsx`, and creates a second source of truth.

### Decision 2: `BudgetPageMenuModal` wraps `onTogglePayPeriods` to also call `state.close()`

The modal renders with a render-prop `({ state }) => ...`. The simplest fix is to wrap the passed `onTogglePayPeriods` callback inline so `state.close()` is called immediately after. This requires no changes to `BudgetPageMenu`'s prop types.

**Alternative considered:** Have `togglePayPeriods` in `useTogglePayPeriods` dispatch a close-modal action. Rejected — that hook should not know about modal state.

### Decision 3: MonthSelector returns `''` as `periodLabel` when `month` is a pay period ID but `payPeriodConfig` is `undefined`

During the single render cycle after pay periods are disabled but before `startMonth` resets to a calendar month, falling back to an empty string prevents the crash. The heading will flicker briefly (≈1 frame) before `onPayPeriodConfigChange` sets the correct calendar month. The test only asserts `not.toHaveText(pay-period-pattern)`, so an empty string passes.

**Alternative considered:** Delay the `payPeriodConfig` update until `startMonth` has been reset. Too complex — would require synchronised state updates across an async effect boundary.

### Decision 4: `EnvelopeBudgetSummaryModal` resolves previous-period calendar date via `prevMonth(month, config)`

`prevMonth` already accepts an optional `PayPeriodConfig`; when provided and `month` is a pay period ID, it delegates to `prevPayPeriod`. The returned previous period ID is then resolved to its start date via `monthUtils.bounds(prevPeriodId, config).start` before calling `formatMonth` with `'MMM'`, yielding a calendar-month abbreviation without crashing.

**Alternative considered:** Pass a pre-formatted `prevMonthName` string in modal options. Rejected — unnecessarily duplicates formatting logic outside the modal; passing config is cleaner.

## Risks / Trade-offs

- **One-frame flicker on pay-period disable** → The `periodLabel` will be `''` for one render after disabling. Acceptable; the state corrects itself immediately via the existing `onPayPeriodConfigChange` effect.
- **`modalsSlice.ts` type change** → Adding `payPeriodConfig?: PayPeriodConfig` is additive and optional; existing callers are unaffected.
