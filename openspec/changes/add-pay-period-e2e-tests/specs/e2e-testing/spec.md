# E2E Testing Capability

## ADDED Requirements

### Requirement: Mobile Pay Period E2E Test Coverage
The test suite SHALL provide comprehensive end-to-end test coverage for pay period functionality in mobile budget scenarios.

#### Scenario: Enable pay periods through settings
**Given** a user is on the mobile settings page
**When** the user enables the pay periods feature flag
**And** configures a pay frequency (weekly, biweekly, semimonthly, or monthly)
**And** sets a start date
**Then** the budget page displays pay periods instead of calendar months
**And** the period selector shows pay period labels

#### Scenario: Navigate between pay periods
**Given** pay periods are enabled in mobile budget
**And** the user is viewing a pay period
**When** the user clicks the next period arrow
**Then** the budget view advances to the next pay period
**And** the period label updates accordingly
**When** the user clicks the previous period arrow
**Then** the budget view returns to the previous pay period

#### Scenario: Verify weekly pay period boundaries
**Given** pay periods are configured with weekly frequency
**And** a start date is set
**When** the user views a pay period
**Then** the pay period spans exactly 7 days
**And** the start date aligns with the configured weekly pattern
**And** the period label indicates "Pay Period N"

#### Scenario: Verify biweekly pay period boundaries
**Given** pay periods are configured with biweekly frequency
**And** a start date is set
**When** the user views a pay period
**Then** the pay period spans exactly 14 days
**And** the start date aligns with the configured biweekly pattern
**And** periods alternate consistently throughout the year

#### Scenario: Verify semimonthly pay period boundaries
**Given** pay periods are configured with semimonthly frequency
**When** the user views the first period of a month
**Then** the pay period spans from the 1st to the 15th
**When** the user views the second period of a month
**Then** the pay period spans from the 16th to the end of month

#### Scenario: Verify monthly pay period boundaries
**Given** pay periods are configured with monthly frequency
**And** a start date is set
**When** the user views a pay period
**Then** the pay period spans one full calendar month
**And** the period starts on the configured day of month

#### Scenario: Budget within a pay period
**Given** the user is viewing a pay period in mobile budget
**When** the user sets a budget amount for a category
**Then** the budgeted amount is saved for that pay period
**And** the amount persists when navigating to other periods and back
**When** transactions are added within the pay period date range
**Then** the "Spent" value updates to reflect the transactions
**And** the "Balance" calculates as budgeted minus spent

#### Scenario: Navigate across year boundary
**Given** the user is viewing the last pay period of a year
**When** the user navigates to the next pay period
**Then** the budget view shows the first pay period of the next year
**And** the pay period calculations continue seamlessly across years

#### Scenario: Switch pay frequency
**Given** pay periods are enabled with one frequency
**When** the user changes to a different pay frequency in settings
**And** returns to the budget page
**Then** the budget view updates to show periods in the new frequency
**And** existing budget data is preserved
**And** the period labels and boundaries reflect the new frequency

#### Scenario: Disable pay periods
**Given** pay periods are currently enabled
**When** the user disables the pay periods feature flag
**And** returns to the budget page
**Then** the budget view reverts to calendar month display
**And** the month selector shows standard month/year format
**And** existing budget data remains accessible

#### Scenario: Pay period summary modal
**Given** the user is viewing a pay period budget
**When** the user opens the budget summary
**Then** the summary displays the pay period date range
**And** shows totals for income, budgeted, and spent within that period
**And** displays the "To Budget" amount for the pay period

#### Scenario: Budget actions in pay period context
**Given** the user is viewing a pay period
**When** the user applies "Copy last period" action
**Then** budget amounts copy from the previous pay period
**When** the user applies "Set to 3 month average" action
**Then** budget amounts calculate based on the previous 3 pay periods

#### Scenario: Overspending banner in pay period
**Given** the user has overspent categories in the current pay period
**When** viewing the pay period budget page
**Then** the overspending banner displays
**And** shows the count of overspent categories
**And** shows the total overspent amount for the pay period
**And** the "Cover" action uses pay period context

#### Scenario: Current pay period navigation
**Given** the user is viewing a past or future pay period
**When** the user clicks the "Today" button
**Then** the budget view navigates to the current pay period
**And** highlights that it is the current period

### Requirement: Pay Period Page Model Support
The mobile budget page model SHALL provide methods for interacting with pay period features.

#### Scenario: Configure pay period settings
**Given** a page model for mobile settings
**When** test code calls methods to enable pay periods
**Then** the page model navigates to experimental settings
**And** enables the pay periods feature flag
**And** sets the pay frequency
**And** sets the start date
**And** saves the configuration

#### Scenario: Navigate pay periods via page model
**Given** a page model for mobile budget
**When** test code calls `goToNextPayPeriod()`
**Then** the page model clicks the next period arrow
**And** waits for the budget view to update
**When** test code calls `goToPreviousPayPeriod()`
**Then** the page model clicks the previous period arrow
**And** waits for the budget view to update

#### Scenario: Read pay period information
**Given** a page model for mobile budget displaying a pay period
**When** test code calls `getCurrentPeriodLabel()`
**Then** the page model returns the displayed period label
**When** test code calls `getCurrentPeriodDateRange()`
**Then** the page model returns the start and end dates

### Requirement: Test Data and Fixtures
E2E tests SHALL use consistent test data and fixtures for pay period scenarios.

#### Scenario: Test data with pay period transactions
**Given** E2E test fixtures include transactions
**When** pay period tests run
**Then** transactions are distributed across multiple pay periods
**And** some pay periods have budgeted amounts
**And** some pay periods have spending
**And** test data covers edge cases like year boundaries

#### Scenario: Deterministic date handling
**Given** E2E tests use global.IS_TESTING flag
**When** pay period tests execute
**Then** the current date is deterministic for testing
**And** "current period" calculations are reproducible
**And** tests produce consistent results across runs