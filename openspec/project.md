# Project Context

## Purpose
Actual is a **local-first personal finance tool** that is 100% free and open-source. It enables users to manage their budgets, track transactions, and sync data across devices using CRDT-based synchronization. The application follows envelope budgeting principles and prioritizes offline-first operation with optional cloud sync.

## Tech Stack

### Frontend
- **Language**: TypeScript 5.9.3 with strict mode
- **UI Framework**: React 19.2.0
- **Build Tool**: Vite 7.2.2
- **Bundler**: SWC 1.15.2 (fast transpilation)
- **State Management**: Redux Toolkit 2.10.1
- **Styling**: SASS/SCSS 1.94.0, Emotion CSS 11.13.5
- **Component Library**: React Aria Components 1.13.0 (accessibility-first)
- **Routing**: React Router 7.9.6
- **Internationalization**: i18next 25.6.2
- **Data Visualization**: Recharts 3.4.1
- **Spreadsheet Engine**: HyperFormula 3.1.0
- **Date Utilities**: date-fns 4.1.0

### Backend
- **Runtime**: Node.js 22+
- **Server Framework**: Express 5.1.0
- **Database**: SQLite (better-sqlite3 12.4.1 for Node, SQL.js + Absurd SQL for browser)
- **Authentication**: OpenID Client 5.7.1, bcrypt 6.0.0, JWT
- **Sync Layer**: Custom CRDT implementation (@actual-app/crdt)
- **Banking Integration**: Nordigen Node 1.4.1, Pluggy SDK 0.79.0
- **Logging**: winston 3.18.3

### Desktop
- **Framework**: Electron 38.3.0
- **Builder**: electron-builder 26.0.12

### Development Tools
- **Package Manager**: Yarn 4.10.3 (workspaces)
- **Task Orchestration**: Lage 2.14.15 (monorepo task runner)
- **Testing**: Vitest 4.0.9 (unit), Playwright 1.56.1 (E2E)
- **Linting**: ESLint 9.39.1 (flat config)
- **Formatting**: Prettier 3.6.2
- **Git Hooks**: Husky 9.1.7 + lint-staged 16.2.6

## Project Conventions

### Code Style

#### TypeScript Guidelines
- ✅ **Prefer `type` over `interface`** for type definitions
- ✅ **Use `satisfies` operator** for type narrowing
- ✅ **Inline type imports**: `import { type MyType } from './types'`
- ❌ **Avoid `enum`** - use objects or maps instead
- ❌ **Avoid `any` or `unknown`** - be explicit with types
- ❌ **Avoid type assertions** (`as`, `!`) unless absolutely necessary
- ❌ **Don't use `React.FC` or `React.FunctionComponent`**

#### React Patterns
- ✅ **Functional components only** (no class components)
- ✅ **Use custom hooks** from `src/hooks`:
  - `useNavigate()` instead of react-router's hook
  - `useDispatch()`, `useSelector()`, `useStore()` instead of react-redux
- ✅ **Use `<Link>` instead of `<a>` tags** for navigation
- ✅ **Declarative JSX** with minimal curly braces
- ❌ **Don't create nested component definitions**
- ❌ **Don't use console.* directly** - use logger instead

#### Naming Conventions
- **Components**: PascalCase (`MyComponent`)
- **Functions/Variables**: camelCase (`getFormattedDate`)
- **Booleans**: Auxiliary verbs (`isLoaded`, `hasError`, `canDelete`)
- **Constants**: UPPER_SNAKE_CASE
- **Files**: Match export name (`MyComponent.tsx`)
- **Folders**: kebab-case for multi-word names

#### Import Order (Enforced by ESLint)
1. React imports
2. Built-in Node.js modules
3. External packages
4. Actual packages (`loot-core`, `@actual-app/*`)
5. Parent imports (`../`)
6. Sibling imports (`./`)
7. Index imports (`.`)

Newlines required between each group.

#### Prettier Configuration
- Single quotes
- Trailing commas (all)
- Arrow parens: avoid (single params without parens)

#### Custom ESLint Rules
- `no-untranslated-strings`: Enforces i18n usage (error)
- `prefer-trans-over-t`: Prefers Trans component over t() (error)
- `prefer-logger-over-console`: Enforces logger usage (error)
- `prefer-if-statement`: Prefers explicit if statements (warn)

### Architecture Patterns

#### Monorepo Structure
Yarn 4 workspaces with 12 packages:
- `loot-core` - Core business logic (platform-agnostic)
- `desktop-client` - React UI (@actual-app/web)
- `desktop-electron` - Electron wrapper
- `sync-server` - Express sync server
- `api` - Node.js API
- `component-library` - Reusable UI components
- `crdt` - CRDT sync layer
- `plugins-service` - Plugin service worker
- `eslint-plugin-actual` - Custom ESLint rules

#### Local-First Architecture
- **Offline-first**: All data stored locally in SQLite/IndexedDB
- **CRDT Synchronization**: Conflict-free data sync across devices
- **Platform Abstraction**: Conditional exports for web/electron/node
- **Optional Cloud Sync**: Self-hosted sync server for multi-device support

#### State Management
- **Redux Toolkit** for global application state
- Exported from `loot-core/client/redux`
- Custom hooks enforce proper usage patterns

#### Data Layer
- **AQL** (Actual Query Language): Custom query system
- **Database**: SQLite with migrations
- **Server Module**: Accounts, budgets, transactions, payees, schedules
- **Rules Engine**: Transaction automation
- **Spreadsheet Calculations**: HyperFormula integration

#### Component Architecture
- React functional components with TypeScript
- Feature-based organization (accounts, budget, reports, schedules)
- Reusable component library with 375+ SVG icons
- React Aria for accessibility
- Emotion CSS for styling with design tokens

### Testing Strategy

#### Unit Testing (Vitest)
- **Framework**: Vitest 4.0.9 (Vite-native, faster than Jest)
- **Globals**: `describe`, `it`, `expect`, `beforeEach` enabled by default
- **Platform-Specific**: Separate configs for Node and Web tests
- **Test Files**: `*.test.ts`, `*.test.tsx`, `*.spec.js`
- **Mocking**: Extensive mock infrastructure in `/src/mocks/`
- **Command**: `yarn test` (via lage for parallel execution)
- **Watch Mode**: `yarn workspace loot-core run test path/to/file.test.ts`

#### E2E Testing (Playwright)
- **Framework**: Playwright 1.56.1
- **Browser**: Chromium
- **Commands**:
  - `yarn e2e` - Browser E2E tests
  - `yarn e2e:desktop` - Electron E2E tests
  - `yarn vrt` - Visual regression tests
  - `yarn vrt:docker` - VRT in Docker container

#### Best Practices
- Minimize mocked dependencies, prefer real implementations
- Use descriptive test names
- Test files excluded from linting rules
- Separation by platform (node/web tests)

### Git Workflow

#### Branch Strategy
- **Main Branch**: `master`
- **Feature Branches**: Create from `master`
- **PR Target**: `master`

#### Pre-Commit Hooks
- **Husky + lint-staged** run on staged files:
  - ESLint auto-fix
  - Prettier auto-format
- Files: `*.{js,mjs,jsx,ts,tsx,md,json,yml}`

#### Development Commands
- `yarn start` - Browser development server
- `yarn start:desktop` - Desktop app development
- `yarn typecheck` - TypeScript checking
- `yarn lint:fix` - ESLint + Prettier auto-fix
- `yarn test` - Run all tests

## Domain Context

### Personal Finance & Budgeting
- **Envelope Budgeting**: Allocate money to categories (envelopes)
- **Accounts**: Bank accounts, credit cards, investment accounts
- **Transactions**: Income, expenses, transfers
- **Payees**: Merchants and people you pay/receive from
- **Schedules**: Recurring transactions
- **Rules Engine**: Automated transaction categorization
- **Reports**: Spending trends, net worth, cash flow
- **Goals**: Savings goals with progress tracking

### Banking Integration
- **Open Banking**: Nordigen integration for European banks
- **Pluggy**: Banking integration for other regions
- **Manual Entry**: Support for manual transaction entry
- **Import Formats**: OFX, QFX, QIF file imports

### Data Synchronization
- **CRDT**: Conflict-free replicated data types for sync
- **End-to-End Encryption**: Optional E2E encryption for sync
- **Self-Hosted**: Users can run their own sync server
- **Multi-Device**: Sync across web, desktop, and mobile

## Important Constraints

### Technical Constraints
- **Node Version**: Requires Node.js 22+
- **Browser Support**: Electron >= 35.0, modern browsers (see browserslist)
- **SQLite Dependency**: Core database engine
- **Local Storage**: Requires filesystem/IndexedDB access
- **Memory**: Large budgets may require significant memory

### Platform Requirements
- **Web**: Modern browser with IndexedDB support
- **Desktop**: Electron app for Windows, Mac, Linux
- **Server**: Optional sync server requires Node.js environment

### Privacy & Security
- **Local-First**: Data stored locally by default
- **Self-Hosted**: Sync server can be self-hosted
- **Open Source**: MIT license, no vendor lock-in
- **E2E Encryption**: Optional encryption for sync

## External Dependencies

### Banking Services
- **Nordigen** (GoCardless): European open banking API
- **Pluggy**: Banking integration platform
- Manual import via OFX/QFX/QIF files

### Development Services
- **Weblate**: Crowdsourced translation management
- **GitHub Actions**: CI/CD pipeline
- **Netlify**: Documentation hosting

### Optional Services
- **PikaPods**: One-click deployment platform
- **Fly.io**: Managed hosting option
- **Docker Hub**: Container images for self-hosting
