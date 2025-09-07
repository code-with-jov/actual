## Actual Budget: Budget UI → State → Backend → DB flow

### Scope
- Components: `packages/desktop-client/src/components/budget/envelope/*`
- Budget page orchestrator: `packages/desktop-client/src/components/budget/index.tsx`
- Shared date utils: `packages/loot-core/src/shared/months.ts`
- Server API surface: `packages/loot-core/src/server/api.ts`, `packages/loot-core/src/server/budget/app.ts`, `packages/loot-core/src/server/budget/actions.ts`
- AQL schema/tables: `packages/loot-core/src/server/aql/schema/index.ts`, SQL init `packages/loot-core/src/server/sql/init.sql`

### 1) Control flow map (UI → State/Hooks → Backend → DB)

- UI components (Envelope budget)
  - `EnvelopeBudgetComponents.tsx`
    - Renders per-group and per-category monthly cells using spreadsheet bindings from `@desktop-client/spreadsheet/bindings` (`envelopeBudget.*`).
    - On user actions (edit budgeted cell, open menus), invokes `onBudgetAction(month, type, args)` and `onShowActivity(categoryId, month)` passed from `budget/index.tsx`.
  - `EnvelopeBudgetContext.tsx`
    - Provides `currentMonth` via `months.currentMonth()` and delegates `onBudgetAction`, `onToggleSummaryCollapse` down the tree.

- Budget page orchestrator
  - `components/budget/index.tsx`
    - Calculates `startMonth` and bounds via `send('get-budget-bounds')` and prewarms spreadsheet cache.
    - Wires handlers:
      - `onBudgetAction(month, type, args)` → dispatches `applyBudgetAction` (redux thunk) from `budgetSlice`.
      - `onShowActivity(categoryId, month)` → navigates to `/accounts` with transaction filters for the category and month.
    - Wraps content with `EnvelopeBudgetProvider` and `SheetNameProvider(name=sheetForMonth(startMonth))`.

- State management (Redux Thunks)
  - `budget/budgetSlice.ts`
    - `applyBudgetAction` switches on `type` and calls `send(...)` for corresponding server handlers, e.g.:
      - `budget-amount` → `send('budget/budget-amount', { month, category, amount })`
      - `set-zero`, `set-3-avg`, `set-6-avg`, `set-12-avg`, `set-n-month-avg` …
      - Movement ops: `transfer-available`, `transfer-category`, `cover-overspending`, `cover-overbudgeted` …
      - Carryover ops: `set-carryover`, `reset-income-carryover`
      - Hold ops: `hold-for-next-month`, `reset-hold`

- Backend API (renderer → server)
  - `loot-core/platform/client/fetch.send(channel, payload)` routes to server `handlers` installed in `server/api.ts` and `server/budget/app.ts`.
  - `server/budget/app.ts` registers methods mapping to action implementations in `server/budget/actions.ts` (all wrapped `mutator(undoable(...))`).

- Server actions and DB persistence
  - `server/budget/actions.ts`
    - Resolves budget type table via `getBudgetTable()`:
      - Envelope (zero-based): `zero_budgets`
      - Tracking (reflect): `reflect_budgets`
    - Core writes:
      - `setBudget({ category, month, amount })` → UPSERT into `zero_budgets`/`reflect_budgets` (id=`YYYYMM-category`, month=`YYYYMM` int)
      - `setCategoryCarryover({ startMonth, category, flag })` → `carryover` flag persisted across months via `setCarryover`
      - `setBuffer(month, amount)` → `zero_budget_months.buffered`
      - Movement helpers also write notes into `notes` and adjust budgets across categories
    - Reads spreadsheet values via `sheet.getCell` using `sheetForMonth(month)` to compute rollups (spent, leftover, to‑budget), then applies DB writes accordingly.

- Database tables (relevant excerpts)
  - `transactions` (SQL: `server/sql/init.sql`)
  - `zero_budgets`, `reflect_budgets` (AQL schema), persisted by actions (id, month int, category id, amount, carryover, goal, long_goal)
  - `zero_budget_months` (buffered amount/hold)
  - `notes` (movement notes for audit trail)

### 2) Interaction between envelope components and transactions

- Budget → Transactions navigation
  - From `EnvelopeBudgetComponents.ExpenseCategoryMonth`, clicking “Spent” or Income cell triggers `onShowActivity(categoryId, month)`.
  - `budget/index.tsx` builds `filterConditions` for the `transactions` view: `[ { field: 'category', op: 'is', value: categoryId, type: 'id' }, { field: 'date', op: 'is', value: month, options: { month: true }, type: 'date' } ]` and navigates to `/accounts`.
  - Account view loads and filters transactions via AQL (`api/transactions-get` or the Account component query pipeline), reading from `transactions` table/views.

- Transactions influence budgets
  - Budget computations use spreadsheet cells (sum, leftover) that are derived from `transactions` via the sheet engine (`server/sheet.ts` loads budgets and amounts into spreadsheet). Editing budgets triggers writes; transactions impact computed fields used by average and movement actions.

### 3) Role of `months.ts`

- Provides normalized month ids and ranges:
  - `monthFromDate`, `currentMonth`, `nextMonth`, `prevMonth`, `range`, `rangeInclusive`.
  - Helpers for indexes and composed ids: `sheetForMonth(month)` → `'budget' + YYYYMM` used by sheet engine and server actions to access cells.
  - Consistency: UI and server both use `months.ts` for formatting and progression, ensuring alignment when reading/writing monthly data and computing averages/rollovers.

### 4) UML diagram (components, APIs, DB; read/write directions)

```mermaid
flowchart TB
  subgraph UI[Desktop Client UI]
    EBC[EnvelopeBudgetComponents.tsx]
    EBP[EnvelopeBudgetProvider]
    BIDX[budget/index.tsx]
  end

  subgraph State[Redux/Client State]
    SLICE[budgetSlice.applyBudgetAction]
  end

  subgraph IPC[IPC/API]
    SEND[send('budget/...')]
  end

  subgraph Server[loot-core server]
    API[server/api.ts handlers]
    BAPP[server/budget/app.ts routes]
    ACT[server/budget/actions.ts]
    SHEET[server/sheet.ts]
  end

  subgraph DB[(SQLite DB)]
    ZB[[zero_budgets]]
    RB[[reflect_budgets]]
    ZBM[[zero_budget_months]]
    TX[[transactions]]
    NOTES[[notes]]
  end

  subgraph Shared[Shared Utils]
    MONTHS[shared/months.ts]
  end

  EBC -- onBudgetAction(month,type,args) --> BIDX
  EBC -- onShowActivity(category,month) --> BIDX
  EBP -- currentMonth() --> MONTHS

  BIDX -- dispatch --> SLICE
  SLICE -- send(channel,payload) --> SEND
  SEND --> API
  API -- routes --> BAPP
  BAPP -- calls --> ACT

  ACT -- read/write --> ZB
  ACT -- read/write --> RB
  ACT -- read/write --> ZBM
  ACT -- write movement notes --> NOTES
  ACT -- uses sheetForMonth --> MONTHS
  ACT -- read computed cells --> SHEET

  SHEET -- derives sums from --> TX

  BIDX -- navigate with filters --> TX
```

Legend:
- UI → State: user interactions trigger Redux thunk.
- State → IPC → Server: thunk issues `send('budget/...')` calls to server handlers.
- Server → DB: actions persist to `zero_budgets`/`reflect_budgets`, `zero_budget_months`, and update `notes`; spreadsheet reads reflect `transactions`.

### 5) File relationships and key methods

- `EnvelopeBudgetComponents.tsx`
  - Reads values via spreadsheet bindings: `envelopeBudget.catBudgeted(id)`, `catSumAmount`, `catBalance`, `catCarryover`, `catGoal`, `catLongGoal`, group totals, etc.
  - Writes via `onBudgetAction('budget-amount' | movement/carryover/template ops)`.

- `budget/index.tsx`
  - `onBudgetAction` → `applyBudgetAction` thunk.
  - `onShowActivity` → builds filters and navigates to accounts/transactions view.
  - Initializes months and sheet cache using `months.ts` helpers and `prewarmAllMonths/prewarmMonth`.

- `budgetSlice.applyBudgetAction`
  - Maps UI intents to server endpoints under `budget/*` or notification-producing template checks.

- `server/budget/actions.ts`
  - `setBudget`, `setNMonthAvg`, `copyPreviousMonth`, `transferCategory`, `coverOverspending`, `holdForNextMonth`, `setCategoryCarryover`, etc.
  - Persists to `zero_budgets`/`reflect_budgets`, `zero_budget_months`, and `notes`.
  - Uses `sheetForMonth(month)` and cell ids to compute necessary values before writing.

- DB schema (AQL/SQL)
  - `transactions` full schema in `init.sql` and AQL mapping in `aql/schema/index.ts` (views `v_transactions*`).
  - Budgets tables declared in AQL schema; actions perform actual inserts/updates.

### Data flow details (reads/writes)

- Reads
  - UI reads via spreadsheet bindings (computed values), not direct DB.
  - Server actions read spreadsheet cell values to compute safe movements/averages.
  - Transactions queried by accounts UI via AQL queries/views.

- Writes
  - Budget amount edits → `setBudget` UPSERT into `zero_budgets|reflect_budgets`.
  - Hold/Buffer → `zero_budget_months.buffered`.
  - Carryover flags → `zero_budgets|reflect_budgets.carryover` across month range.
  - Movements (transfer/cover) adjust multiple budget rows and log to `notes`.

---

Last updated: autogenerated mapping of current code behavior.

