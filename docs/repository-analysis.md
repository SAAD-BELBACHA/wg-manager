# Zofri / WG Manager Repository Analysis

## Current Architecture
- Single Flask application in `app.py`.
- SQLAlchemy models live in the same file as routes and helpers.
- Server-rendered web UI uses Jinja templates in `templates/`.
- Static assets live in `static/`.
- SQLite database lives in `instance/wg_app.db`.
- Docker support exists through `Dockerfile` and `docker-compose.yml`.
- PWA support exists through `static/manifest.webmanifest`, `static/sw.js`, icons, and base template tags.

## Working Features
- Web registration, login, logout, and session auth.
- WG creation and WG joining with invite code.
- Dashboard with WG summary, member data, tasks, shopping count, recent expenses, and debts.
- Cleaning tasks: list, add, toggle done, delete, rotate assignments.
- Shopping list: list, add, toggle done, delete, clear done.
- Finance: add expenses, split equally, delete expenses, calculate debts.
- Feed: text posts, image/audio upload, delete own posts.
- JWT API for auth, WG setup/info, dashboard, tasks, shopping, finance, and feed.

## Models
- `User`
- `WG`
- `WGMembership`
- `CleaningTask`
- `ShoppingItem`
- `Expense`
- `ExpenseSplit`
- `FeedPost`

## Web Routes
- `/`, `/register`, `/login`, `/logout`
- `/wg/setup`
- `/dashboard`
- `/tasks`, `/tasks/add`, `/tasks/<id>/toggle`, `/tasks/<id>/delete`, `/tasks/rotate`
- `/shopping`, `/shopping/add`, `/shopping/<id>/toggle`, `/shopping/<id>/delete`, `/shopping/clear-done`
- `/finance`, `/finance/add`, `/finance/<id>/delete`
- `/feed`, `/feed/post`, `/feed/<id>/delete`
- `/uploads/<filename>`, `/sw.js`

## Existing API
- Current API prefix: `/api`
- Versioned alias added for mobile: `/api/v1`
- Auth: register, login, me
- WG: create, join, info
- Dashboard: summary
- Tasks: list, create, toggle, delete, rotate
- Shopping: list, create, toggle, delete, clear done
- Finance: list, create, delete
- Feed: list, create multipart post, delete

## Auth And Permissions
- Web auth uses Flask-Login session cookies.
- API auth uses JWT bearer tokens.
- Current API checks membership by loading the current user's WG and comparing object `wg_id`.
- Existing API does not yet support roles, refresh tokens, rate limiting, or centralized error envelopes.

## Missing Product Areas
- Database migrations and a proper app package split.
- Versioned API module structure.
- Roles and admin permissions.
- Invitations with expiry/deactivation/link/QR.
- Availability, absences, preferences, task swaps, task completions, comments, checklist, task audit log.
- Payments, partial payments, expense categories, receipt uploads/OCR.
- Calendar events, rules, rule acceptance, polls, mood checks, conflicts.
- Notifications, push devices, trust profile events, disputes, score snapshots, share links.
- OpenAPI documentation, pagination/filter/sort, rate limits, and unified error responses.

## Migration Direction
- Keep current root Flask app working for now.
- Introduce `/mobile` as a separate Expo app.
- Add `/docs` for architecture, API gaps, and implementation phases.
- Later backend cleanup should move Flask code into `/backend` with blueprints, migrations, tests, and config files.
