## MODIFIED Requirements

### Requirement: Internal budget components must consume PayPeriodConfig from context

Any budget component that calls `months.ts` navigation or formatting functions (`subMonths`, `addMonths`, `prevMonth`, `nextMonth`, `format`, etc.) with values that may be pay period IDs SHALL obtain `PayPeriodConfig` via `usePayPeriodConfig()` or from modal options and pass it to those calls. Components MUST NOT call these functions with a pay period ID and no config.

This requirement extends to modal components opened from the budget page. When `BudgetPage.tsx` dispatches `envelope-budget-month-menu` or `envelope-budget-summary` modals, it SHALL include `payPeriodConfig` in the modal options so the modal components can format pay period months correctly.

#### Scenario: BudgetSummaries uses config when computing surrounding periods

- **WHEN** pay periods are enabled and `BudgetSummaries` computes the period immediately before and after the visible range
- **THEN** it calls `subMonths` and `addMonths` with the `PayPeriodConfig` obtained from context, producing valid adjacent period IDs

#### Scenario: No crash when config is absent (calendar months)

- **WHEN** pay periods are disabled and `BudgetSummaries` computes surrounding months
- **THEN** it calls `subMonths` and `addMonths` without a config (or with `null`/`undefined`), and standard calendar-month behavior is used

#### Scenario: EnvelopeBudgetMonthMenuModal displays pay period heading without crashing

- **WHEN** pay periods are enabled and the user opens the month menu modal for a pay period month (e.g., `2026-17`)
- **THEN** the modal heading displays the period's short date-range label (e.g., `Mar 9 - Mar 22`) using `getPayPeriodLabel`
- **AND** no error boundary is triggered

#### Scenario: EnvelopeBudgetSummaryModal renders without crashing for pay period month

- **WHEN** pay periods are enabled and the user opens the budget summary modal for a pay period month
- **THEN** the modal renders with heading "Budget Summary" and `prevMonth` is resolved correctly using the supplied `payPeriodConfig`
- **AND** no error boundary is triggered

---

## ADDED Requirements

### Requirement: Budget page menu closes after toggling pay periods

When the user selects "Enable pay period budgeting" or "Disable pay period budgeting" from the mobile budget page menu, the menu modal SHALL close automatically after the preference is toggled.

#### Scenario: Menu closes after enabling pay periods

- **WHEN** the user opens the budget page menu and taps "Enable pay period budgeting"
- **THEN** pay periods are enabled AND the budget page menu modal is dismissed

#### Scenario: Menu closes after disabling pay periods

- **WHEN** the user opens the budget page menu and taps "Disable pay period budgeting"
- **THEN** pay periods are disabled AND the budget page menu modal is dismissed

### Requirement: MonthSelector handles pay period ID during disable transition

During the render cycle immediately after pay periods are disabled (before `startMonth` resets to a calendar month ID), the `MonthSelector` component SHALL NOT throw when computing the period label. It SHALL render safely (e.g., with an empty label) and resolve to the correct calendar month label on the next render once `startMonth` is updated.

#### Scenario: No crash when startMonth is stale pay period ID after disabling

- **WHEN** pay periods are disabled and `startMonth` still holds a pay period ID for one render cycle
- **THEN** `MonthSelector` renders without throwing
- **AND** the heading does not display a pay period date-range pattern (e.g., `Mar 9 - Mar 22`)
