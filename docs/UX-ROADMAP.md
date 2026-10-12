# NEON UX Architecture & Roadmap

## Product model
Одна учётная запись → организация/рабочее пространство → продуктовые пространства → проекты → инструменты. Права и тариф проверяются на сервере; UI только отображает доступ. Не дублировать независимые аккаунты на каждый продукт.

## Navigation
### Global shell
- Brand and workspace switcher
- Search / command palette
- Notifications and help
- Product navigation
- Account, team, usage quota
- Breadcrumbs and responsive mobile navigation

### Product spaces
1. **Ad Intelligence** — discovery, search, filters, creative preview, ad detail, competitor collections, saved searches, parsing jobs, detection coverage and export.
2. **Ad Automation** — account connections, campaign wizard, goals and tracking, audience/geo, creatives, budget/bidding, validation, launch confirmation, campaign list, campaign detail, change history and reports.
3. **SEO Intelligence** — site projects, crawl status, technical audit, keyword research, positions, competitors, backlinks, recommendations, issue details and scheduled reports.
4. **Website Builder** — sites, templates, page editor, block library, global styles, responsive preview, forms/widgets, integrations, domain/publishing, SEO settings and version history.
5. **Analytics** — cross-channel overview, spend/leads/CPL/CPA/ROAS, date range, attribution, source breakdown, dashboards, report builder and exports.
6. **Projects** — cross-product project list, owners, status, tags and recent activity.
7. **Integrations** — provider directory, connection flow, scopes/permissions, health status, reconnect and disconnect confirmation.
8. **Billing & limits** — plan, product entitlements, usage meters, limits, invoices, payment method and upgrade comparison.
9. **Settings** — profile, organization, members, roles, security, sessions, API keys, notifications and audit log.

## Design tokens
- Background: #0B0D10
- Surface 1: #111419
- Surface 2: #15191F
- Surface 3: #1B2028
- Border: #252B34
- Primary text: #EDF1F6
- Secondary text: #818B99
- Primary accent: neon green #39FF88
- Secondary accent: violet #A78BFA
- Product accents: Ads #39FF88, Automation #42D9FF, SEO #A78BFA, Builder #FFB454, Analytics #65E6A5
- Use neon sparingly for primary actions, focus, active states and positive statuses. Never communicate state using color alone.

## Component inventory to complete
Buttons (primary, secondary, quiet, destructive, loading, disabled); text inputs; search; selects; comboboxes; checkboxes; radios; toggles; date range; tabs; breadcrumbs; tooltips; badges; status indicators; KPI cards; charts; sortable tables; pagination; empty/loading/error states; banners; toasts; dialogs; drawers; command palette; file upload; creative cards; media preview; stepper; confirmation dialogs; responsive navigation; accessible focus states.

## Required interaction states
- Initial/loading, success, partial failure, network failure, empty state, no search results, permission denied, quota reached, integration expired, unsaved changes, destructive action confirmation, disabled plan feature.
- Every button must have a real prototype action or be explicitly marked as a non-functional placeholder.
- Use inline validation and preserve form input after errors.
- Campaign launches, publish, disconnect and delete must have a review/confirmation step.
- Tables need keyboard navigation, visible sort/filter state and a mobile overflow strategy.

## MVP implementation sequence
1. Approve shell, typography, palette, density and component tokens.
2. Finalize Ad Intelligence flow first: search → results → creative details → save/export.
3. Finalize Ad Automation: connect accounts → campaign wizard → review → launch → reporting.
4. Build shared components and empty/error/loading states.
5. Design SEO and website-builder flows, including the page editor separately due to its complexity.
6. Add team, billing, integrations, analytics and settings.
7. Validate responsive behavior, keyboard accessibility, contrast, loading and error cases.
8. Connect backend APIs and permissions; replace all demo metrics with sourced values.

## Data integrity
All figures in the initial prototype are mock data and must be visibly labeled as such. No fake connected-account status or successful live campaign launch should be shown in production.