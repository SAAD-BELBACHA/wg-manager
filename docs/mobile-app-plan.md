# Mobile App Plan

## Phase 1: Mobile Foundation
- Expo + React Native + TypeScript in `/mobile`.
- Expo Router for auth stack and bottom tabs.
- Central design system: colors, spacing, radii, shadows, typography, reusable controls.
- Secure token storage with `expo-secure-store`.
- API client targeting `/api/v1`.
- Auth flow: welcome, register, login, restore session, logout.
- WG setup flow: create or join.
- Dashboard flow with WG summary and task preview.
- Tasks flow with list, add, and complete action.

## Phase 1 Vertical Slice
1. Register a user.
2. Login or restore token.
3. Create or join a WG.
4. Open dashboard.
5. Fetch tasks.
6. Create a task.
7. Mark a task done.

## Phase 2: Core Shared Living
- Rich task fields, fairness explanation, task swaps.
- Expenses, payments, categories, receipt upload.
- Shopping list with edit/delete/toggle/search/filter.
- Notifications and in-app notification center.

## Phase 3: Household Collaboration
- Calendar and absences.
- Rules and acceptance.
- Polls.
- Mood checks.
- Conflict assistant shell.
- i18n for German, English, Arabic, French.

## Phase 4: Trust Profile
- Trust events, score snapshots, score screen, disputes, audit log, private share links.

## Phase 5: Advanced App Readiness
- Push notifications.
- Receipt OCR.
- Offline queue and conflict resolution.
- Development builds, TestFlight, Play Internal Testing.
- Store assets and privacy/legal pages.
