# API Gap Analysis

## Implemented Now
- `/api/v1/auth/register`
- `/api/v1/auth/login`
- `/api/v1/auth/me`
- `/api/v1/wg/create`
- `/api/v1/wg/join`
- `/api/v1/wg/info`
- `/api/v1/dashboard`
- `/api/v1/tasks`
- `/api/v1/tasks/<id>/toggle`
- `/api/v1/tasks/<id>`
- `/api/v1/tasks/rotate`
- `/api/v1/shopping`
- `/api/v1/finance`
- `/api/v1/feed`
- `/api/v1/calendar-events`
- `/api/v1/rules`
- `/api/v1/polls`
- `/api/v1/mood-checks`
- `/api/v1/conflicts`
- `/api/v1/notifications`
- `/api/v1/trust-profile`

## High Priority Gaps
- Refresh tokens and token revocation.
- Unified error envelope: `{ "error": { "code": "...", "message": "..." } }`.
- Password reset endpoint.
- Roles and permissions.
- Invitations with expiry, share links, QR payloads, and disabled state.
- Task updates, task comments, checklists, completion proof, swaps, and fairness metadata.
- Expense shares beyond equal split, payment confirmation, partial payments.
- Pagination, filtering, sorting, and OpenAPI documentation.
- Rate limiting for auth and invitation endpoints.
 - Production push notification delivery and device registration.
 - OCR provider integration for receipt scanning.
 - Offline sync queue and conflict resolution.

## Product Gaps
- Calendar events.
- Household rules and acceptance.
- Polls and votes.
- Mood checks with anonymity threshold.
- Conflict reports and resolution suggestions.
- Notifications and push devices.
- Trust events, score snapshots, disputes, and share links.
- Audit log.

## Security Gaps
- Object-level checks exist in several endpoints but are duplicated and not centralized.
- No role model yet.
- No rate limiting.
- Upload validation exists by extension only.
- API keys/secrets need production environment management.
