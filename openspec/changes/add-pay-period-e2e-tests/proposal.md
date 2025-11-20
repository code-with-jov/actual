# Add Pay Period E2E Tests

## Summary
Add comprehensive end-to-end tests for pay period functionality in mobile budget scenarios using Playwright. This ensures pay period features work correctly across different pay frequencies (weekly, biweekly, semimonthly, monthly) in the mobile budget interface.

## Motivation
Pay periods are a critical feature for users who budget based on their pay schedule rather than calendar months. Currently, the pay period functionality lacks dedicated E2E test coverage for mobile scenarios, which creates risk for regressions and limits confidence when modifying pay period-related code.

### Problems Addressed
1. **Lack of test coverage**: Pay period features are not tested end-to-end in mobile scenarios
2. **Regression risk**: Changes to pay period logic or mobile budget UI could break functionality without detection
3. **Feature validation**: No automated validation that pay periods display correctly and allow proper navigation in mobile budget views
4. **User confidence**: Users rely on pay periods for accurate budgeting aligned with their pay schedule

## Scope

### In Scope
- E2E tests for enabling/disabling pay periods in mobile settings
- Tests for all pay frequencies: weekly, biweekly, semimonthly, monthly
- Navigation tests: moving between pay periods in mobile budget view
- Display tests: verifying pay period labels, dates, and boundaries
- Budget interaction tests: budgeting amounts within pay periods
- Pay period summary modal tests
- Integration with existing mobile budget workflows

### Out of Scope
- Desktop pay period E2E tests (separate effort)
- Unit tests for pay period utilities (already exist)
- Changes to pay period functionality (this is testing only)
- Performance testing
- Visual regression testing beyond standard Playwright screenshots

## Impact Assessment

### User Impact
- **Positive**: Improved reliability of pay period features
- **Risk**: None - these are test additions only

### System Impact
- **Test suite**: Adds approximately 8-12 new E2E test cases
- **CI/CD**: Increases E2E test execution time by ~2-3 minutes
- **Maintenance**: New tests require maintenance when pay period UI changes

### Breaking Changes
None - this change only adds tests

## Dependencies
- Existing pay period implementation in `loot-core/shared/pay-periods.ts`
- Mobile budget page implementation
- Playwright test infrastructure
- Mobile page models for budget interactions

## Alternatives Considered

### Alternative 1: Manual Testing Only
- **Pros**: No development effort, no CI time increase
- **Cons**: Error-prone, not repeatable, slows down releases, doesn't scale
- **Decision**: Rejected - automated testing is essential for feature reliability

### Alternative 2: Unit Tests Only
- **Pros**: Faster execution, simpler to write
- **Cons**: Doesn't test user workflows, misses integration issues, doesn't validate UI
- **Decision**: Rejected - E2E tests are needed to validate complete user journeys

### Alternative 3: Desktop E2E Tests Only
- **Pros**: Desktop has more screen space, potentially simpler interactions
- **Cons**: Doesn't cover mobile-specific UI/UX, mobile is increasingly important
- **Decision**: Rejected - mobile tests are specifically needed for mobile budget workflows

## Success Criteria
1. ✅ All pay frequency types (weekly, biweekly, semimonthly, monthly) have E2E test coverage
2. ✅ Tests cover enabling/disabling pay periods through settings
3. ✅ Tests validate pay period navigation (prev/next period)
4. ✅ Tests verify pay period labels and date ranges display correctly
5. ✅ Tests confirm budget amounts can be set and retrieved within pay periods
6. ✅ All new tests pass consistently in CI
7. ✅ Tests follow existing mobile E2E test patterns and conventions
8. ✅ Page models are extended to support pay period interactions

## Timeline
- Test implementation: 1 development session
- Review and refinement: 1 iteration
- Total: Can be completed in single PR

## Notes
- Tests should use existing test data and fixtures where possible
- Follow patterns established in `budget.mobile.test.ts`
- Leverage existing page models (`mobile-budget-page.ts`)
- Tests must work with the global.IS_TESTING hack for date mocking
- Consider edge cases: year boundaries, period rollovers, setting changes
