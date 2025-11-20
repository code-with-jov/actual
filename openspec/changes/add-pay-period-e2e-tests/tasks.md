# Tasks

## Test Infrastructure Setup
- [ ] Review existing mobile budget E2E test structure in `budget.mobile.test.ts`
- [ ] Identify page model methods needed for pay period interactions
- [ ] Extend `MobileBudgetPage` page model with pay period-specific methods if needed
- [ ] Extend `SettingsPage` page model with pay period configuration methods

## Test File Creation
- [ ] Create `pay-periods.mobile.test.ts` in `packages/desktop-client/e2e/`
- [ ] Set up test describe blocks for different pay frequencies
- [ ] Configure viewport for mobile testing (350x600)
- [ ] Set up beforeEach/afterEach hooks following existing patterns

## Pay Period Settings Tests
- [ ] Test: Enable pay periods feature flag in settings
- [ ] Test: Configure weekly pay period with start date
- [ ] Test: Configure biweekly pay period with start date
- [ ] Test: Configure semimonthly pay period
- [ ] Test: Configure monthly pay period
- [ ] Test: Disable pay periods and verify return to calendar months

## Pay Period Navigation Tests
- [ ] Test: Navigate to next pay period using navigation arrows
- [ ] Test: Navigate to previous pay period using navigation arrows
- [ ] Test: Verify navigation boundaries (earliest/latest periods)
- [ ] Test: Navigate to current pay period using "Today" button
- [ ] Test: Verify month selector displays pay period label instead of calendar month

## Pay Period Display Tests
- [ ] Test: Verify pay period label format (e.g., "Pay Period 1")
- [ ] Test: Verify pay period date range displayed correctly
- [ ] Test: Verify weekly pay period spans 7 days
- [ ] Test: Verify biweekly pay period spans 14 days
- [ ] Test: Verify semimonthly pay period spans 1st-15th and 16th-end
- [ ] Test: Verify monthly pay period spans full calendar month
- [ ] Test: Verify pay period year rollover (period 26 → period 1)

## Budget Interaction Tests
- [ ] Test: Set budget amount for category in pay period
- [ ] Test: Verify budget amount persists across pay period navigation
- [ ] Test: Add transaction within pay period date range
- [ ] Test: Verify "Spent" updates correctly for pay period
- [ ] Test: Verify "Balance" calculation for pay period
- [ ] Test: Test budget actions (copy last period, set to average) with pay periods

## Pay Period Summary Tests
- [ ] Test: Open budget summary modal for pay period
- [ ] Test: Verify summary shows pay period date range
- [ ] Test: Verify summary shows correct totals for pay period
- [ ] Test: Verify "To Budget" amount in pay period context

## Edge Case Tests
- [ ] Test: Switch pay frequency and verify periods update
- [ ] Test: Change start date and verify period boundaries recalculate
- [ ] Test: Verify behavior when navigating across year boundary
- [ ] Test: Verify pay period with leap year (Feb 29)
- [ ] Test: Test with very old dates (e.g., 2020) and future dates (e.g., 2026)

## Integration Tests
- [ ] Test: Overspending banner displays correctly in pay period
- [ ] Test: Overbudgeted banner displays correctly in pay period
- [ ] Test: Uncategorized transactions banner works with pay periods
- [ ] Test: Category menu actions work within pay period context
- [ ] Test: Budget notes work with pay period IDs

## Validation and Cleanup
- [ ] Run all new tests locally and verify they pass
- [ ] Verify tests pass in both Envelope and Tracking budget types
- [ ] Add snapshot tests for visual verification where appropriate
- [ ] Ensure tests clean up properly (no state leakage)
- [ ] Run full E2E suite to verify no regressions
- [ ] Update test documentation if needed
- [ ] Review test coverage report for pay period code paths

## Dependencies
- All tasks depend on existing pay period implementation
- Page model extensions must be completed before interaction tests
- Settings tests should be completed before navigation/display tests
