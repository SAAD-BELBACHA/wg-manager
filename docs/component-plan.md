# Zofri Component Plan

## Phase 1: Foundation + Dashboard

- `Screen`: shared safe-area scroll shell with warm app background.
- `AppText`: shared text scale for title, headings, body, small and tiny labels.
- `HeroCard`: gradient card for the main WG status/pulse moment.
- `QuickAction`: compact icon action using FontAwesome and haptic feedback.
- `MemberAvatar` / `AvatarGroup`: social WG presence without exposing extra data.
- `StatusPill`: small state labels for dates, status and lightweight feedback.
- `SectionHeader`: compact section titles with optional context copy.

## Dashboard Composition

- Greeting + household status.
- WG Pulse hero with task, shopping and member counters.
- Quick actions for tasks, expenses, shopping and calendar.
- Featured task card using the existing dashboard response.
- Finance and shopping check cards using existing debt/count data.
- Lightweight WG activity feed derived from safe dashboard data.

## Later Migration Targets

- `TaskCard`: richer task rows with avatar, due state and trust points.
- `BalanceCard`: shared finance summary for expenses and dashboard.
- `ShoppingItem`: touch-friendly grocery row with completion state.
- `ProgressRing`: compact trust/task progress visualization.
- `EmptyState`: friendly empty screens for lists and workflow pauses.
- `ZofriHeader`: reusable top bar for secondary screens.

Business logic, API contracts and auth flow stay unchanged while screens migrate one by one.
