# Software Requirements Specification (SRS)
## Tour & Travel Agency Management System

| Field | Value |
|---|---|
| **Project owner** | ASK Digital Technologies, Bahir Dar, Ethiopia |
| **Document version** | v2.0 (expanded from v1.0 source specification) |
| **Source document** | `ASK_TaskFullstack_Dev.pdf` (Software Requirements Specification & System Architecture v1.0) |
| **Target deadline** | 14/02/2019 EC (Ethiopian calendar, read as DD/MM/YYYY, approximately 24 Oct 2026) |
| **Stack (mandatory)** | React.js (SPA) · NestJS (REST + WebSocket) · PostgreSQL · Netlify (frontend) |
| **Document status** | Ready for implementation review |

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Overall Description](#2-overall-description)
3. [Delivery Phases Overview](#3-delivery-phases-overview)
4. [Phase 0: Foundations, Tooling and Design System](#phase-0-foundations-tooling-and-design-system)
5. [Phase 1: Authentication, Attribute-Based Authorization, User Management](#phase-1-authentication-attribute-based-authorization-user-management)
6. [Phase 2: Destination Catalog and Pricing Engine](#phase-2-destination-catalog-and-pricing-engine)
7. [Phase 3: Agents, Referrals and Client Onboarding](#phase-3-agents-referrals-and-client-onboarding)
8. [Phase 4: Booking Workflow, Commission and Cancellation](#phase-4-booking-workflow-commission-and-cancellation)
9. [Phase 5: Notifications and Real-Time Chat](#phase-5-notifications-and-real-time-chat)
10. [Phase 6: Dashboards, Reporting and Export](#phase-6-dashboards-reporting-and-export)
11. [Phase 7: Security Hardening, Rate Limiting, Caching, API Docs](#phase-7-security-hardening-rate-limiting-caching-api-docs)
12. [Phase 8: Testing, Deployment and Handover](#phase-8-testing-deployment-and-handover)
13. [Cross-Cutting Specifications](#13-cross-cutting-specifications)
14. [Data Model (PostgreSQL)](#14-data-model-postgresql)
15. [API Specification Summary](#15-api-specification-summary)
16. [Open Questions and Assumptions](#16-open-questions-and-assumptions)
17. [Risks](#17-risks)
18. [Requirements Traceability Matrix](#18-requirements-traceability-matrix)

---

# 1. Introduction

## 1.1 Purpose
This document defines the functional, non-functional, security, data, and delivery requirements for the **Tour & Travel Agency Management System**. It is written for developers, designers, testers, and the project owner, and is organised by **delivery phase** so that each phase can be planned, built, reviewed, and accepted independently.

## 1.2 Scope
The system is a web platform that lets:

- **System Owner** manage managers, destinations, pricing, and consolidated reports.
- **Agency Manager** manage agents, moderate booking requests, monitor sales, and export reports.
- **Travel Agent** register clients through a unique referral code, track the client pipeline, earn a 10% commission, and chat with managers.
- **Client / Traveler** browse destinations publicly, request bookings, cancel with a 2% penalty, and chat with support.

**Out of scope for v1:** native mobile apps, multi-currency conversion, multi-tenant (multiple agencies) support, loyalty programs, third-party inventory (flights/hotels) integration.

## 1.3 Definitions

| Term | Meaning |
|---|---|
| **RBAC** | Role-Based Access Control: users hold roles, roles hold permissions |
| **ABAC** | Attribute-Based Access Control: decisions also consider attributes (resource owner, status, scope) |
| **Permission** | A value of the `Permission` enum (e.g. `BOOKING_APPROVE`) |
| **Scope** | A value of the `PermissionScope` enum: `ANY`, `OWN`, `ASSIGNED`, `TEAM` |
| **Referral code** | Unique code generated per agent, used to attach a client to that agent |
| **Booking** | A client's request to take a tour; goes through a status lifecycle |
| **Wallet** | An agent's commission balance, backed by an immutable ledger |
| **EC** | Ethiopian Calendar |

## 1.4 Key Design Decisions (summary)

1. **Authorization is attribute-based and enum-driven.** Permissions are a closed, typed enum (the vocabulary). Which role gets which permission, and at which scope, is stored in the database and editable at runtime. This satisfies the source requirement that roles and permissions must not be hardcoded in application logic (see section 5.3 for the reconciliation).
2. **Security is enforced in depth**: frontend guards are a usability layer only; the backend is the sole authority.
3. **Money is stored as integer minor units** (santim) or `NUMERIC(14,2)`, never floating point.
4. **Every financial and status change is auditable** (ledger plus audit log).
5. **Swagger/OpenAPI and caching are optional** and delivered in Phase 7 behind feature flags.

---

# 2. Overall Description

## 2.1 System Context

```
 ┌────────────────────┐  HTTPS / WSS   ┌──────────────────────────────┐
 │ React SPA (Netlify)│ ─────────────► │ NestJS API (container host)  │
 │ Public + Dashboards│                │  • Auth + ABAC guards         │
 └────────────────────┘                │  • Throttler / rate limit     │
                                       │  • REST + WebSocket gateway   │
                                       │  • PDF / XLSX generators      │
                                       └──────┬───────────┬───────────┘
                                              │ TLS       │
                                   ┌──────────▼──┐   ┌────▼─────────────┐
                                   │ PostgreSQL  │   │ Redis (optional) │
                                   └─────────────┘   │ cache + throttle │
                                                     └──────────────────┘
                              External: Email/SMTP · Push · Payment gateway
```

## 2.2 User Classes

| Role | Description | Typical volume |
|---|---|---|
| System Owner | Executive authority; usually one account | 1 to 3 |
| Agency Manager | Operations; moderates bookings, manages agents | 1 to 20 |
| Travel Agent | Sales partner; referral-based | 10 to 500 |
| Client | End consumer; public catalog plus bookings | 1,000s |
| Guest (unauthenticated) | Browses public catalog only | Public |

## 2.3 Operating Environment
- **Frontend:** modern evergreen browsers (last 2 versions of Chrome, Edge, Firefox, Safari); mobile-first responsive down to 360 px width.
- **Backend:** Node.js LTS, containerised (Docker), TLS-terminated behind a reverse proxy.
- **Database:** PostgreSQL 15+, TLS connection required.
- **Connectivity assumption:** users may be on slow or intermittent mobile networks (see NFR-PERF).

## 2.4 Constraints
- Mandatory stack: React.js, NestJS, PostgreSQL, Netlify for the frontend.
- Netlify hosts static assets only; **the NestJS API and WebSocket gateway cannot run on Netlify** and must be hosted separately.
- All roles and permissions must be database-driven (no hardcoded role checks such as `if (role === 'MANAGER')`).

## 2.5 Assumptions
See [section 16](#16-open-questions-and-assumptions).

---

# 3. Delivery Phases Overview

| Phase | Name | Main outcome | Depends on |
|---|---|---|---|
| 0 | Foundations, tooling, design system | Repos, CI, environments, design tokens, base UI kit | None |
| 1 | Auth, ABAC authorization, users | Secure login, dynamic permissions, manager assignment | 0 |
| 2 | Destination catalog and pricing | Owner CRUD, seasonal pricing, public catalog | 1 |
| 3 | Agents, referrals, onboarding | Agent lifecycle, referral codes, client registration, alerts | 1 |
| 4 | Booking, commission, cancellation | Full booking state machine, wallet ledger, 2% penalty | 2, 3 |
| 5 | Notifications and chat | In-app/push/email notifications, real-time messaging | 3, 4 |
| 6 | Dashboards, reporting, export | Role dashboards, search/sort/filter, XLSX and PDF export | 4 |
| 7 | Security hardening, rate limit, caching, API docs | Pen-test fixes, throttling tiers, Redis cache, Swagger | 1 to 6 |
| 8 | Testing, deployment, handover | UAT sign-off, production release, documentation | All |

**Suggested effort model (relative):** P0 8%, P1 14%, P2 10%, P3 10%, P4 16%, P5 12%, P6 10%, P7 10%, P8 10%.

**Deadline note:** the source specification gives 14/02/2019 EC. If this reads as Tikimt 14, 2019 EC, that is roughly five days from today (19 Oct 2026). If that date is correct, scope must be cut to a **Minimum Viable Release** (see [section 16.3](#163-minimum-viable-release-if-the-deadline-is-fixed)). Please confirm the date format.

**Definition of Done (applies to every phase):**
- Code reviewed and merged; lint and type checks green.
- Unit and integration tests for new logic pass; coverage targets in section 13.8 met.
- Permissions for new endpoints registered in the `Permission` enum and seeded.
- No high/critical findings from dependency audit or static analysis.
- Acceptance criteria of the phase demonstrated on a staging environment.

---

# Phase 0: Foundations, Tooling and Design System

## 0.1 Goals
Establish a reproducible engineering baseline and the visual identity so later phases move quickly and consistently.

## 0.2 Repository and Tooling

| ID | Requirement |
|---|---|
| P0-R1 | Monorepo or two repos (`web`, `api`) with consistent TypeScript config, ESLint, Prettier, Husky pre-commit hooks, and Conventional Commits. |
| P0-R2 | Frontend: React 18+ with Vite, TypeScript, React Router, TanStack Query, a form library (React Hook Form) with schema validation (Zod). |
| P0-R3 | Backend: NestJS with TypeScript strict mode, TypeORM or Prisma (one chosen and used consistently), `class-validator` DTOs, `ConfigModule` with validated env schema. |
| P0-R4 | Environments: `local`, `staging`, `production`. Secrets only via environment variables or a secret manager; **never committed**. `.env.example` maintained. |
| P0-R5 | CI pipeline (GitHub Actions or equivalent): install, lint, type-check, test, build, dependency audit, container build. |
| P0-R6 | Database migrations are versioned and run in CI/CD; schema is never changed manually. |
| P0-R7 | Structured logging (JSON), correlation ID per request, health endpoints (`/health/live`, `/health/ready`). |

## 0.3 Design System (professional, hand-crafted look)

The interface must look **designed by a person for this brand**, not generated from a template or a default component kit. The design process is part of the deliverable.

### 0.3.1 Process requirements
| ID | Requirement |
|---|---|
| P0-D1 | Produce a short **design brief**: audience, brand personality, 3 reference moodboards, anti-references (what we avoid). |
| P0-D2 | Produce low-fidelity wireframes for every key screen, then high-fidelity mockups (Figma or equivalent) for review **before** frontend implementation of that screen. |
| P0-D3 | Define **design tokens** (color, type, spacing, radius, elevation, motion) in one source and export them to CSS variables. No hardcoded hex values in components. |
| P0-D4 | Build a documented **component library** (Storybook or equivalent) covering buttons, inputs, selects, tables, cards, modals, toasts, tabs, badges, empty states, skeleton loaders, and chat bubbles. |

### 0.3.2 Visual direction
- **Identity:** warm, trustworthy, travel-forward; rooted in Ethiopian geography and culture without clichés. Use real, high-quality photography of destinations (licensed or commissioned), not generic stock collages.
- **Color:** a restrained palette of one primary, one accent, and a neutral scale with defined semantic colors (success, warning, danger, info). Avoid default framework blue and avoid gradient-heavy "AI template" aesthetics. All text/background pairs must meet **WCAG 2.1 AA** contrast (4.5:1 body, 3:1 large).
- **Typography:** one expressive display face for headings and one highly legible text face; a Ge'ez-capable fallback (e.g. Noto Sans Ethiopic) so Amharic renders correctly. Define a modular type scale and line-height rules.
- **Layout:** 12-column grid, 8 px spacing system, generous whitespace, consistent alignment; visible hierarchy on every screen.
- **Imagery:** destination galleries use responsive, lazy-loaded images with fixed aspect ratios to avoid layout shift.
- **Iconography:** one consistent icon family; no mixing of styles.
- **Motion:** purposeful and subtle (150 to 250 ms), respects `prefers-reduced-motion`.
- **Dashboards:** data-dense but calm; tables with sticky headers, column sorting, clear filters; charts with labelled axes and accessible colors.
- **Details that signal craft:** consistent empty states, thoughtful error messages, skeleton loading, favicon/app icons, branded email templates, print-friendly PDF reports.

### 0.3.3 Accessibility and responsiveness
- Keyboard-navigable, visible focus rings, semantic HTML, ARIA only where needed, form errors announced to screen readers.
- Breakpoints: 360 / 768 / 1024 / 1280 / 1536. Mobile-first.
- Optional: i18n scaffolding (English now, Amharic ready) using a library such as `react-i18next`; all user-facing strings externalised from day one.

## 0.4 Deliverables
Repos with CI, environment configs, design brief, wireframes, token file, Storybook with core components, empty application shell (public layout and dashboard layout).

## 0.5 Acceptance Criteria
- A new developer can clone, run `docker compose up` plus one script, and have the app running locally.
- CI passes on a sample PR; build artifacts produced.
- Design tokens drive at least the base components; design review signed off by the project owner.

---

# Phase 1: Authentication, Attribute-Based Authorization, User Management

## 1.1 Goals
Deliver secure identity and a **dynamic, attribute-based, enum-driven authorization engine** used by every later feature, plus owner-controlled manager lifecycle.

## 1.2 Authentication Requirements

| ID | Requirement |
|---|---|
| FR-AUTH-01 | Email plus password login for all roles. Passwords hashed with **Argon2id** (bcrypt cost ≥ 12 acceptable fallback). |
| FR-AUTH-02 | Password policy: min 10 characters, checked against a common-password list; no composition theatre, but length and breach-list checks enforced. |
| FR-AUTH-03 | Token model: short-lived **access token** (JWT, 10 to 15 min) plus rotating **refresh token** (7 to 30 days). Refresh tokens are stored hashed server-side, bound to device/session, and **revoked on reuse detection**. |
| FR-AUTH-04 | Refresh token delivered as `HttpOnly; Secure; SameSite` cookie. Access token held **in memory only** on the frontend (never `localStorage`). |
| FR-AUTH-05 | Logout revokes the current session; "log out of all devices" revokes all sessions. |
| FR-AUTH-06 | Email verification for client self-registration; password reset via single-use, time-limited (30 min) token sent by email; token stored hashed. |
| FR-AUTH-07 | Account lockout / progressive delay after repeated failed logins (e.g. 5 failures per 15 min per account and per IP) with generic error messages that do not reveal whether an email exists. |
| FR-AUTH-08 | Optional (recommended for Owner and Manager): TOTP-based two-factor authentication. |
| FR-AUTH-09 | Users with status `SUSPENDED` or `REVOKED` cannot authenticate and their active sessions are invalidated immediately. |
| FR-AUTH-10 | All auth events (login success/failure, password change, reset, token reuse) written to the audit log. |

## 1.3 Authorization: Attribute-Based, Enum-Driven

### 1.3.1 Model
Authorization combines four kinds of attributes:

1. **Subject attributes:** user id, role(s), status, referral code (agents).
2. **Action attribute:** a value of the `Permission` enum.
3. **Resource attributes:** owner id, assigned agent id, booking status, destination status.
4. **Scope attribute:** a value of the `PermissionScope` enum describing how far the permission reaches.

A decision is: `ALLOW` if the subject holds the permission with a scope whose attribute condition is satisfied by the resource; otherwise `DENY`. Default is **deny**.

### 1.3.2 The `Permission` enum (authoritative vocabulary)

```ts
export enum Permission {
  // Users and roles
  MANAGER_CREATE = 'MANAGER_CREATE',
  MANAGER_ASSIGN = 'MANAGER_ASSIGN',
  MANAGER_SUSPEND = 'MANAGER_SUSPEND',
  MANAGER_REVOKE = 'MANAGER_REVOKE',
  ROLE_READ = 'ROLE_READ',
  ROLE_MANAGE = 'ROLE_MANAGE',
  USER_READ = 'USER_READ',

  // Destinations and pricing
  DESTINATION_READ_PUBLIC = 'DESTINATION_READ_PUBLIC',
  DESTINATION_CREATE = 'DESTINATION_CREATE',
  DESTINATION_UPDATE = 'DESTINATION_UPDATE',
  DESTINATION_DELETE = 'DESTINATION_DELETE',      // soft delete / cancel listing
  PRICING_MANAGE = 'PRICING_MANAGE',

  // Agents
  AGENT_CREATE = 'AGENT_CREATE',
  AGENT_READ = 'AGENT_READ',
  AGENT_UPDATE = 'AGENT_UPDATE',
  AGENT_DEACTIVATE = 'AGENT_DEACTIVATE',
  AGENT_PERFORMANCE_READ = 'AGENT_PERFORMANCE_READ',

  // Clients
  CLIENT_REGISTER = 'CLIENT_REGISTER',
  CLIENT_READ = 'CLIENT_READ',

  // Bookings
  BOOKING_CREATE = 'BOOKING_CREATE',
  BOOKING_READ = 'BOOKING_READ',
  BOOKING_APPROVE = 'BOOKING_APPROVE',
  BOOKING_REJECT = 'BOOKING_REJECT',
  BOOKING_COMMENT = 'BOOKING_COMMENT',
  BOOKING_CANCEL = 'BOOKING_CANCEL',
  BOOKING_COMPLETE = 'BOOKING_COMPLETE',

  // Money
  WALLET_READ = 'WALLET_READ',
  COMMISSION_PAYOUT_PROCESS = 'COMMISSION_PAYOUT_PROCESS',

  // Reports
  REPORT_READ = 'REPORT_READ',
  REPORT_EXPORT = 'REPORT_EXPORT',
  DASHBOARD_READ = 'DASHBOARD_READ',

  // Communication
  NOTIFICATION_READ = 'NOTIFICATION_READ',
  CHAT_USE = 'CHAT_USE',
  CHAT_MODERATE = 'CHAT_MODERATE',

  // Audit
  AUDIT_READ = 'AUDIT_READ',
}

export enum PermissionScope {
  ANY = 'ANY',           // all resources of the type
  OWN = 'OWN',           // resource.ownerId === subject.id
  ASSIGNED = 'ASSIGNED', // resource.agentId === subject.agentId / chat participant
  TEAM = 'TEAM',         // resources of agents managed by the subject
}
```

### 1.3.3 Dynamic mapping (database-driven)
The enum is the **closed vocabulary** used in code (`@RequirePermission(Permission.BOOKING_APPROVE)`). The **assignment** of permissions to roles, and the scope of each assignment, is stored in the database and editable by the Owner at runtime. Adding a new role or changing what a role may do requires **no code deployment**.

Reconciliation with the source specification: the source requires that "roles and permissions must not be hardcoded in application logic". Endpoint-to-permission binding uses the enum as a stable key; **who holds which permission is data, not code.** A startup check verifies that every enum value exists in the `permissions` table and every guarded route references a valid enum value; mismatches fail the build/boot.

### 1.3.4 Enforcement points

| Layer | Mechanism |
|---|---|
| Backend route | `PermissionsGuard` reads `@RequirePermission()` metadata, loads the subject's effective permissions (cached per request or short TTL), evaluates scope. |
| Backend resource | Policy handlers (`BookingPolicy`, `ChatPolicy`, ...) evaluate resource attributes for `OWN`, `ASSIGNED`, `TEAM`. |
| Data query | Scope also applied as a **query filter** (e.g. agent list only returns that agent's clients) so lists cannot leak. |
| Frontend | The `/auth/me` response includes the effective permission set; route guards and `<Can permission="BOOKING_APPROVE">` components hide UI. **This is cosmetic; the backend always re-checks.** |
| Real-time | WebSocket gateway authenticates the handshake and authorizes every event with the same engine. |

### 1.3.5 Default role-permission matrix (seed data; editable at runtime)

Legend: **A** = ANY, **O** = OWN, **S** = ASSIGNED, **T** = TEAM, **-** = none

| Permission | Owner | Manager | Agent | Client | Guest |
|---|---|---|---|---|---|
| MANAGER_CREATE / ASSIGN / SUSPEND / REVOKE | A | - | - | - | - |
| ROLE_READ / ROLE_MANAGE | A | - | - | - | - |
| USER_READ | A | T | O | O | - |
| DESTINATION_READ_PUBLIC | A | A | A | A | A |
| DESTINATION_CREATE / UPDATE / DELETE | A | - | - | - | - |
| PRICING_MANAGE | A | - | - | - | - |
| AGENT_CREATE / UPDATE / DEACTIVATE | - | A | - | - | - |
| AGENT_READ | A | A | O | - | - |
| AGENT_PERFORMANCE_READ | A | A | O | - | - |
| CLIENT_REGISTER | - | A | O | O (self sign-up) | O (self sign-up) |
| CLIENT_READ | A | A | S | O | - |
| BOOKING_CREATE | - | - | S (on behalf, optional) | O | - |
| BOOKING_READ | A | A | S | O | - |
| BOOKING_APPROVE / REJECT / COMMENT | - | A | - | - | - |
| BOOKING_CANCEL | - | A (with reason) | - | O | - |
| BOOKING_COMPLETE | - | A | - | - | - |
| WALLET_READ | A | A | O | - | - |
| COMMISSION_PAYOUT_PROCESS | - | A | - | - | - |
| REPORT_READ / REPORT_EXPORT | A | A | - | - | - |
| DASHBOARD_READ | A | A | O | O | - |
| NOTIFICATION_READ | A | A | O | O | - |
| CHAT_USE | - | A | S | S | - |
| CHAT_MODERATE | A | A | - | - | - |
| AUDIT_READ | A | - | - | - | - |

> Note: the source gives Owner "consolidated" reporting and Manager operational control. The Owner is granted read-level `A` on operational data; approval actions remain with Managers by default. The Owner can change this at runtime.

### 1.3.6 Authorization requirements

| ID | Requirement |
|---|---|
| FR-AUTHZ-01 | All permissions are values of the `Permission` enum; free-text permission strings are rejected by validation. |
| FR-AUTHZ-02 | Role-to-permission-to-scope mappings are stored in PostgreSQL and manageable via Owner-only admin screens/endpoints. |
| FR-AUTHZ-03 | Every non-public endpoint is guarded; a global default-deny guard rejects any route lacking explicit permission metadata. |
| FR-AUTHZ-04 | Changes to role mappings take effect within 60 seconds (cache invalidation on change) and are recorded in the audit log with before/after values. |
| FR-AUTHZ-05 | The Owner role's `ROLE_MANAGE` permission cannot be removed from the last remaining Owner (lock-out protection). |
| FR-AUTHZ-06 | Resource-level checks (ownership, assignment, team) are unit-tested with allow and deny cases for each policy. |
| FR-AUTHZ-07 | Authorization failures return `403` without revealing resource existence where that would leak data (use `404` for non-owned resources). |

## 1.4 User and Manager Management

| ID | Requirement |
|---|---|
| FR-USR-01 | Owner can **create** a Manager account (name, email, phone, temporary credential or invite link). |
| FR-USR-02 | Owner can **assign** a Manager role/permission profile, **suspend** (reversible), or **revoke** (permanent) a Manager. |
| FR-USR-03 | Invite flow: single-use invite token (48 h) forces password setup on first login. |
| FR-USR-04 | Suspending or revoking terminates all sessions of that user immediately. |
| FR-USR-05 | User list with search, sort, filter by role and status; pagination (cursor or offset, max page size 100). |
| FR-USR-06 | Users can view and edit their own profile (name, phone, avatar) and change password with current-password confirmation. |

## 1.5 Deliverables
Auth module, session store, `Permission`/`PermissionScope` enums, guards and policies, seed migration for roles and permissions, admin UI for roles and managers, frontend auth shell with permission-aware routing.

## 1.6 Acceptance Criteria
- A Manager with no `BOOKING_APPROVE` mapping receives `403` on approve; after the Owner grants it in the UI, access works within 60 s without redeploying.
- Reusing a rotated refresh token revokes the session family.
- An Agent cannot read another agent's clients by any endpoint or query parameter manipulation.
- Suspended Manager is logged out on the next request.

---

# Phase 2: Destination Catalog and Pricing Engine

## 2.1 Goals
Owner-managed catalog with seasonal pricing, and a fast, searchable public catalog.

## 2.2 Owner Functional Requirements

| ID | Requirement |
|---|---|
| FR-DST-01 | Create a destination: title, slug, region, short and long description, itinerary (ordered day-by-day items), inclusions/exclusions, duration, capacity (optional), gallery images (min 1, max 12), base price, status. |
| FR-DST-02 | Update any destination field; edits are versioned in the audit log. |
| FR-DST-03 | **Soft delete / cancel listing**: status transitions `DRAFT → ACTIVE → INACTIVE/CANCELLED`; records are never physically deleted if bookings reference them. |
| FR-DST-04 | Cancelling a destination with open bookings requires confirmation and triggers notifications to affected clients and managers (handled via Phase 5). |
| FR-DST-05 | Image upload: allowed types JPEG/PNG/WebP, max 5 MB each, server-side type sniffing (not extension only), re-encoding, EXIF stripping, generated responsive sizes, stored in object storage (e.g. S3-compatible) with private upload and public CDN read. |

## 2.3 Pricing Engine

| ID | Requirement |
|---|---|
| FR-PRC-01 | Each destination has a **base price** (ETB). |
| FR-PRC-02 | Seasonal rate rules: `{destination_id, name, start_date, end_date, adjustment_type (PERCENT / FIXED_AMOUNT / OVERRIDE), value, priority}`. |
| FR-PRC-03 | Effective price for a travel date = base price adjusted by the highest-priority matching rule. Overlapping rules with equal priority are rejected at creation. |
| FR-PRC-04 | Price changes **never alter existing bookings**: a booking stores a **price snapshot** (`unit_price`, `total_price`, applied rule id) at creation. |
| FR-PRC-05 | Price must be ≥ 0; max precision 2 decimals; validated server-side. |
| FR-PRC-06 | Optional: group size multiplier (`total = effective_price × travelers`). Travelers count is part of the booking (see Phase 4). |

## 2.4 Public Catalog (Client and Guest)

| ID | Requirement |
|---|---|
| FR-CAT-01 | Public listing of `ACTIVE` destinations with title, cover image, region, "from" price, duration, popularity indicator. |
| FR-CAT-02 | Detail page: full itinerary, gallery, pricing (including seasonal periods), inclusions, and a booking call-to-action (login required to book). |
| FR-CAT-03 | **Search** (title, region, keywords), **filter** (region, price range, duration, season), **sort** (price asc/desc, popularity, newest). |
| FR-CAT-04 | **Popularity** = number of approved/completed bookings in a rolling window (default 90 days), recalculated by a scheduled job. |
| FR-CAT-05 | Pagination, shareable filter URLs (query string state), SEO-friendly slugs, `<title>` and Open Graph tags per destination. |
| FR-CAT-06 | Catalog endpoints are public but rate-limited and cache-friendly (ETag/Cache-Control; optional Redis cache in Phase 7). |

## 2.5 Deliverables
Destination module, pricing module, media pipeline, Owner catalog UI, public catalog UI with filters, seed data.

## 2.6 Acceptance Criteria
- Owner creates a destination with a seasonal rule and sees the correct effective price for dates inside and outside the rule.
- Soft-deleted destination disappears from the public catalog but remains visible in historical bookings and reports.
- Changing a price does not change totals of existing bookings.
- Catalog list responds under 500 ms p95 with 1,000 destinations on staging.

---

# Phase 3: Agents, Referrals and Client Onboarding

## 3.1 Goals
Agent lifecycle, referral-based client registration, and real-time awareness of new clients.

## 3.2 Agent Lifecycle (Manager)

| ID | Requirement |
|---|---|
| FR-AGT-01 | Manager can **register** an agent (name, email, phone, national/ID reference optional, payout details) and the system **auto-generates a unique referral code**. |
| FR-AGT-02 | Referral code: 8 to 10 chars, uppercase alphanumeric excluding ambiguous characters (`0/O`, `1/I/L`), cryptographically random, unique (DB `UNIQUE` constraint), case-insensitive on input. |
| FR-AGT-03 | Manager can edit agent profile and **assign** the agent to themselves/team (supports `TEAM` scope). |
| FR-AGT-04 | **Deactivate** agent (reversible): agent cannot log in or earn new commissions; existing clients remain attached; pending commissions remain payable. |
| FR-AGT-05 | Referral code can be **rotated** by a Manager (old code stops accepting new registrations but historical attribution is preserved). |
| FR-AGT-06 | Agent list: search, filter by status/team, sort by registration date/performance. |

## 3.3 Client Registration

| ID | Requirement |
|---|---|
| FR-CLI-01 | **Self-registration:** a client signs up with name, email, phone, password, and an **optional referral code**. Valid code attaches the client to that agent permanently (immutable except by Manager override with audit entry). |
| FR-CLI-02 | **Agent-assisted registration:** an Agent registers a client with the client's details; the system sends an invite/verification email so the client sets a password. The client is tagged with the agent's id automatically. |
| FR-CLI-03 | Invalid or deactivated referral code shows a clear message; registration still possible without a code if the client chooses. |
| FR-CLI-04 | Duplicate detection on email and phone (normalised to E.164, Ethiopian `+251` default); duplicate returns a safe generic message. |
| FR-CLI-05 | Client onboarding states: `PENDING_VERIFICATION`, `ACTIVE`, `BLOCKED`. |
| FR-CLI-06 | Clients can view and edit their own profile and see their assigned agent (name and contact only). |

## 3.4 Onboarding Alerts (Manager)

| ID | Requirement |
|---|---|
| FR-ALR-01 | On new client registration, all Managers with the relevant scope receive a **real-time in-app notification** (WebSocket) and a persisted notification record. Optional email/push per user preference. |
| FR-ALR-02 | Notification content: client name, registration time, source (self / agent name / referral code). |
| FR-ALR-03 | If the Manager is offline, the alert is persisted and shown with an unread badge on next login. |

## 3.5 Agent Pipeline Dashboard (initial version)
Agents see **Daily Registered**, **Pending Approval**, and **Rejected** counts and a list of their clients (completed fully in Phase 4/6 once bookings exist).

## 3.6 Acceptance Criteria
- Two agents can never share a referral code (verified by concurrency test creating 1,000 agents).
- Client registering with Agent A's code appears only in Agent A's list; Agent B cannot access them.
- Manager receives a live notification within 2 seconds of client registration.
- Deactivated agent cannot log in; their code rejects new sign-ups with a clear message.

---

# Phase 4: Booking Workflow, Commission and Cancellation

## 4.1 Goals
The core transactional flow: request, moderation, commission credit, cancellation with penalty, and a trustworthy financial ledger.

## 4.2 Booking Lifecycle

### 4.2.1 State machine

```
                    ┌──────────────► REJECTED (terminal)
                    │  (Manager)
 [Client submits] → PENDING ──────► APPROVED ───► COMPLETED (terminal)
                    │  (Manager)       │  (Manager, after trip)
                    │                  │
                    └──► CANCELLED ◄───┘   (Client, or Manager with reason)
                         (terminal)
```

| From | To | Actor | Permission | Rules |
|---|---|---|---|---|
| (new) | PENDING | Client (or Agent on behalf) | `BOOKING_CREATE` | Destination must be `ACTIVE`; travel date in future; travelers ≥ 1; price snapshot taken. |
| PENDING | APPROVED | Manager | `BOOKING_APPROVE` | Optional comment; triggers commission (4.3) and notifications. |
| PENDING | REJECTED | Manager | `BOOKING_REJECT` | Comment/reason **required**. |
| PENDING / APPROVED | CANCELLED | Client | `BOOKING_CANCEL` (OWN) | Only before fulfillment; applies 2% penalty (4.4). |
| APPROVED | COMPLETED | Manager | `BOOKING_COMPLETE` | Only on/after travel end date; finalises commission eligibility if configured (see 16). |

Illegal transitions return `409 Conflict`. Every transition is written to `booking_status_history` (who, when, from, to, comment). Transitions are executed in a **database transaction with row-level locking** (`SELECT ... FOR UPDATE`) to prevent double approval or double refund.

### 4.2.2 Requirements

| ID | Requirement |
|---|---|
| FR-BKG-01 | Client submits a booking: destination, travel date, number of travelers, contact notes. System computes `total_price` from the effective price (Phase 2) and stores a snapshot. |
| FR-BKG-02 | Client sees booking list and detail with status timeline and Manager comments. |
| FR-BKG-03 | Manager sees a moderation queue of `PENDING` requests with search, filter (destination, agent, date, status), sort. |
| FR-BKG-04 | Manager can **Approve**, **Reject**, or attach **Comments** (visible to the client and the referring agent). |
| FR-BKG-05 | Client receives instant status notifications on approval, rejection, and availability changes (Phase 5). |
| FR-BKG-06 | Idempotency: booking creation accepts an `Idempotency-Key` header to prevent duplicates on retry. |
| FR-BKG-07 | Capacity check (if destination capacity is set): approval fails with a clear message if remaining capacity for that date is insufficient. |

## 4.3 Agent Commission

| ID | Requirement |
|---|---|
| FR-COM-01 | **Formula:** `commission = total_booking_amount × 0.10`, rounded to 2 decimals using banker's rounding or round-half-up (one rule, documented and tested). The rate is stored in a configuration table (default `0.10`) so it can change without code edits; each commission row stores the rate used. |
| FR-COM-02 | On **approval** of a booking whose client has a referring agent, the system **credits the agent wallet** within the same DB transaction as the status change (all-or-nothing) and triggers a notification. |
| FR-COM-03 | Wallet is backed by an **append-only ledger** (`wallet_transactions`): `COMMISSION_CREDIT`, `COMMISSION_REVERSAL`, `PAYOUT`. `wallet_balance` is derived/verified against the ledger by a nightly reconciliation job. |
| FR-COM-04 | If an approved booking is later cancelled, the commission is **reversed** (ledger entry); if already paid out, the reversal creates a negative balance carried against future commissions. |
| FR-COM-05 | **Payout processing:** Manager marks commission payout as paid (amount, method, reference). A `PAYOUT` ledger entry is written and the agent gets an **instant notification**. |
| FR-COM-06 | Agent can view wallet balance, ledger history, and pending/paid commissions with filters. |
| FR-COM-07 | A booking cannot generate commission twice (unique constraint on `booking_id` + type). |

## 4.4 Cancellation and Refund Policy

| ID | Requirement |
|---|---|
| FR-CAN-01 | Client can self-cancel a booking in `PENDING` or `APPROVED` status **before fulfillment** (before the travel start date, and not `COMPLETED`). |
| FR-CAN-02 | **Formulas:** `penalty = total_amount × 0.02`; `refund = total_amount × 0.98` (equivalently `total_amount − penalty`). Penalty and refund rounded to 2 decimals with the rule in FR-COM-01, ensuring `penalty + refund == total_amount` exactly (compute penalty, derive refund by subtraction). |
| FR-CAN-03 | The booking stores `penalty_fee` and `refund_amount`; the status becomes `CANCELLED`. |
| FR-CAN-04 | The system processes the refund (via payment gateway or marks it for manual refund, per section 16) and **notifies the Manager**; the client receives a confirmation including the exact amounts. |
| FR-CAN-05 | Cancelling a `PENDING` booking where no payment was taken results in no refund and no penalty only if the business confirms this (see open question OQ-4); default behavior follows the source rule (2% applies to total amount). |
| FR-CAN-06 | The cancellation confirmation dialog shows penalty and refund **before** the client confirms. |
| FR-CAN-07 | Cancellation is idempotent: repeated requests do not double-refund. |

## 4.5 Payments (integration boundary)
The source diagram lists "Payment Gateways" as an external service. v1 requirement:

| ID | Requirement |
|---|---|
| FR-PAY-01 | Define a `PaymentProvider` interface (`createCharge`, `verifyWebhook`, `refund`) so a gateway (for Ethiopia, e.g. Chapa, Telebirr, or a bank gateway) can be plugged in without refactoring. |
| FR-PAY-02 | Payment webhooks verified by signature, processed idempotently, replay-protected. |
| FR-PAY-03 | If no gateway is selected for v1, payments are recorded manually by Managers (`payments` table with method, reference, amount) and the interface stays unimplemented behind a feature flag. |
| FR-PAY-04 | Card/account data is **never stored** by our system. |

## 4.6 Acceptance Criteria
- Approving a booking of 10,000.00 ETB with a referring agent credits exactly 1,000.00 ETB; double-clicking Approve or concurrent approvals credit once.
- Cancelling a 10,000.00 booking yields penalty 200.00, refund 9,800.00; Manager notified.
- Illegal transitions (e.g. Rejected → Approved) return `409`.
- Wallet balance equals the sum of the ledger after a randomised 10,000-operation test.

---

# Phase 5: Notifications and Real-Time Chat

## 5.1 Goals
Reliable, multi-channel notifications and a secure, real-time support chat.

## 5.2 Notification System

| ID | Requirement |
|---|---|
| FR-NOT-01 | Central `NotificationService` with channels: **in-app** (persisted + real-time via WebSocket), **email**, and optional **web push**. |
| FR-NOT-02 | Event catalog (minimum): `CLIENT_REGISTERED`, `BOOKING_CREATED`, `BOOKING_APPROVED`, `BOOKING_REJECTED`, `BOOKING_COMMENTED`, `BOOKING_CANCELLED` (to Manager), `AVAILABILITY_CHANGED`, `COMMISSION_CREDITED`, `COMMISSION_PAID`, `DESTINATION_CANCELLED`, `CHAT_MESSAGE` (if offline), `ACCOUNT_SUSPENDED`. |
| FR-NOT-03 | Each notification: id, recipient, type, title, body, reference (type + id), `read_at`, `created_at`. Users can mark read/unread, mark all read, and delete. |
| FR-NOT-04 | User preferences per event and channel; critical events (security, financial) cannot be fully disabled. |
| FR-NOT-05 | Delivery via a **queue** (e.g. BullMQ on Redis) with retries, exponential backoff, and dead-letter handling so API requests never block on email delivery. |
| FR-NOT-06 | Email templates are branded, localisable, and tested; no sensitive data (passwords, tokens in clear text beyond single-use links) in email bodies. |
| FR-NOT-07 | Notification list endpoint paginated; unread count endpoint is cheap (indexed). |

## 5.3 Real-Time Chat

| ID | Requirement |
|---|---|
| FR-CHT-01 | **Agent ↔ Manager** channel for dispute resolution and guidance; **Client ↔ Agent/Manager** live support widget. |
| FR-CHT-02 | Conversation model: `conversations` (type, participants), `messages` (sender, body, attachments optional, `created_at`, `read_at`). |
| FR-CHT-03 | Transport: Socket.IO (or native WebSocket) over **WSS**; handshake authenticated with the access token; each event authorized with the ABAC engine (`CHAT_USE` with `ASSIGNED` scope = conversation participant). |
| FR-CHT-04 | Features: typing indicator, delivery/read receipts, presence (online/offline), message history with pagination, unread badges, auto-reconnect with backoff, and message de-duplication by client-generated id. |
| FR-CHT-05 | Client routing: a client is chat-linked to their referring agent; if none or agent is unavailable, the conversation routes to the Manager queue. |
| FR-CHT-06 | Message limits: max 2,000 characters; attachments (optional) limited to images/PDF ≤ 5 MB with malware-safe handling. |
| FR-CHT-07 | **XSS-safe rendering:** messages treated as plain text, escaped on output; links sanitised; no raw HTML. |
| FR-CHT-08 | Chat transcripts are retained per policy (default 12 months) and are accessible to moderators with `CHAT_MODERATE` for dispute resolution; access is audit-logged. |
| FR-CHT-09 | Per-connection **message rate limit** (see Phase 7) to stop flooding. |
| FR-CHT-10 | Horizontal scaling: WebSocket gateway uses a Redis adapter so events propagate across multiple API instances. |

## 5.4 Acceptance Criteria
- Approving a booking delivers an in-app notification to the client within 2 s (online) and an email within 60 s.
- A user not in a conversation cannot join its room or fetch its history (tested with forged ids).
- Killing and restoring network on the client resumes chat without duplicate or lost messages.
- Sending 100 messages per second from one connection is throttled.

---

# Phase 6: Dashboards, Reporting and Export

## 6.1 Goals
Role-specific dashboards and robust reporting with search, sort, filter, and Excel/PDF export.

## 6.2 Dashboards

| Role | Widgets |
|---|---|
| **Owner** | Daily/weekly/monthly revenue, bookings by status, top destinations, agent leaderboard, cancellations and penalties collected, commission liability, manager activity. |
| **Manager** | Daily sales, booking counts by status, pending queue size and age, per-agent performance (bookings, conversion rate, commission), new clients today. |
| **Agent** | **Daily Registered**, **Pending Approval**, **Rejected** counts (real-time), wallet balance, recent commissions, client list. |
| **Client** | Upcoming trips, booking statuses, cancellation history, recommended destinations. |

| ID | Requirement |
|---|---|
| FR-DSH-01 | Dashboard numbers are computed on the server with scope-aware queries (agents see only their own data). |
| FR-DSH-02 | Date-range selector (today, 7 d, 30 d, custom); timezone is `Africa/Addis_Ababa` by default. |
| FR-DSH-03 | Optional Ethiopian-calendar date display toggle (display layer only; storage remains UTC ISO-8601). |
| FR-DSH-04 | Heavy aggregates use database indexes and, if needed, materialised views refreshed on schedule; dashboards load under 2 s p95. |

## 6.3 Reports

| ID | Requirement |
|---|---|
| FR-RPT-01 | **Owner:** consolidated daily business operational report: bookings, revenue, penalties, commissions credited/paid, new clients, destination performance. |
| FR-RPT-02 | **Manager:** report across all bookings and agents; booking-level detail. |
| FR-RPT-03 | **Search, filter, sort** on all report tables: free-text search; filters (date range, status, destination, agent, region, price range); multi-column sort; saved filter presets (optional). |
| FR-RPT-04 | **Export to Excel (.xlsx)** and **PDF** with the current filters applied; exports respect the user's scope and permission `REPORT_EXPORT`. |
| FR-RPT-05 | Excel export: typed columns (numbers as numbers, dates as dates), header row, frozen header, auto-width, totals row, one sheet per logical section. |
| FR-RPT-06 | PDF export: branded header/footer, page numbers, generation timestamp and generating user, print-friendly tables, A4. Amharic text must render correctly (embedded Ge'ez-capable font). |
| FR-RPT-07 | **Formula-injection protection** for Excel/CSV: cell values beginning with `=`, `+`, `-`, `@` are neutralised. |
| FR-RPT-08 | Large exports (> 5,000 rows) are generated **asynchronously** by a background job; user is notified with a time-limited, authenticated download link. Synchronous exports have a hard row cap. |
| FR-RPT-09 | Every export is audit-logged (who, filters, row count, time). |

## 6.4 Acceptance Criteria
- Agent dashboard counts match direct DB queries for the same period (reconciliation test).
- Exported XLSX opens in Excel with numeric columns summable; PDF opens with correct pagination and fonts.
- A user lacking `REPORT_EXPORT` receives `403` even if the UI button is forced visible.
- Export containing a cell `=HYPERLINK(...)` is neutralised.

---

# Phase 7: Security Hardening, Rate Limiting, Caching, API Docs

## 7.1 Goals
Raise the system to a hardened production posture. Security items marked **Mandatory** are required for release; caching and Swagger are **Optional**.

## 7.2 Backend Security (Mandatory)

| ID | Requirement |
|---|---|
| SEC-B01 | **Transport:** HTTPS/WSS only; HSTS (`max-age ≥ 1 year`, `includeSubDomains`); TLS 1.2+; DB connection over TLS with certificate verification. |
| SEC-B02 | **Security headers** via Helmet: `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `Cross-Origin-Opener-Policy`, `X-Frame-Options`/`frame-ancestors`; `X-Powered-By` disabled. |
| SEC-B03 | **CORS:** explicit allow-list of the production and staging Netlify origins; `credentials: true` only for those; no wildcard. |
| SEC-B04 | **Input validation:** global `ValidationPipe` with `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`; DTO limits on string length, array size, numeric range; reject unknown fields. |
| SEC-B05 | **SQL injection:** parameterised queries only via ORM; raw SQL forbidden unless parameterised and reviewed; DB user has least privilege (no DDL at runtime). |
| SEC-B06 | **Mass assignment / over-posting** prevented via DTOs; response DTOs/serializers strip sensitive fields (`password_hash`, tokens). |
| SEC-B07 | **Broken access control (OWASP A01):** default-deny guard, scope filters on queries, IDOR tests for every resource endpoint (UUIDs are not authorization). |
| SEC-B08 | **CSRF:** because refresh uses a cookie, refresh/logout endpoints require a CSRF defence (SameSite plus double-submit token or custom header check + Origin validation). Access-token endpoints use `Authorization: Bearer` and are not CSRF-prone. |
| SEC-B09 | **Secrets management:** no secrets in repo or images; rotated on schedule; JWT signing keys support rotation (`kid`). |
| SEC-B10 | **File uploads:** MIME sniffing, size limits, randomised storage names, no execution, antivirus scan hook for attachments, private bucket with signed URLs where needed. |
| SEC-B11 | **Error handling:** global exception filter returns generic messages; stack traces and SQL errors never leak; correlation ID returned. |
| SEC-B12 | **Audit log** (append-only): authentication events, permission changes, status transitions, financial entries, exports, role/manager changes; includes actor, IP, user agent, before/after. |
| SEC-B13 | **Logging hygiene:** never log passwords, tokens, full card data, or raw PII beyond need; log redaction rules. |
| SEC-B14 | **Dependency security:** `npm audit`/Dependabot (or Renovate) in CI, lockfile committed, pinned versions, blocked on high/critical. |
| SEC-B15 | **SSRF / outbound calls:** any URL fetched server-side is allow-listed. |
| SEC-B16 | **Request size limits:** JSON body ≤ 1 MB (uploads handled separately), request timeouts, pagination caps. |
| SEC-B17 | **Business-logic abuse:** idempotency keys on booking/cancel/payout; unique constraints for commission and refund; transactional locking (Phase 4). |
| SEC-B18 | **Account enumeration** prevented on login, register, and password reset responses and timing (constant-time comparison). |
| SEC-B19 | **Data protection:** encryption at rest (managed DB/volume), field-level encryption for sensitive payout details, backups encrypted. |
| SEC-B20 | **Privacy:** PII minimisation, data retention policy, account deletion/anonymisation process aligned with applicable Ethiopian data protection requirements. |

## 7.3 Rate Limiting and Abuse Prevention (Mandatory)

**Implementation:** `@nestjs/throttler` with a **Redis-backed storage** (so limits are shared across instances), plus an edge limiter (reverse proxy / CDN / WAF) as the first line of defence. Keys combine **IP + user id (when authenticated)**. Responses use `429 Too Many Requests` with `Retry-After` and standard `RateLimit-*` headers. Limits are configuration values (env/config table), not constants.

| Tier | Applies to | Suggested default | Notes |
|---|---|---|---|
| **Global** | All API routes | 120 req/min per IP | Baseline protection |
| **Authenticated** | Logged-in users | 300 req/min per user | Higher than anonymous |
| **Auth-sensitive** | `/auth/login`, `/auth/refresh` | 5 to 10 per 15 min per IP **and** per account | Plus progressive delay and lockout |
| **Credential flows** | register, forgot-password, resend verification, invite accept | 3 to 5 per hour per IP/email | Prevents email bombing |
| **Public catalog** | `GET /destinations*` | 60 req/min per IP | Cache-friendly |
| **Write-heavy** | create booking, cancel, comments | 20 per min per user | Per-endpoint overrides |
| **Exports** | report exports | 5 per 10 min per user, max 2 concurrent | Expensive operation |
| **Uploads** | image/attachment upload | 10 per 10 min per user | Plus size caps |
| **Chat (WS)** | per-connection messages | 20 msgs / 10 s, max 5 connections per user | Disconnect on repeated violation |
| **Webhooks** | payment webhooks | Signature-verified; separate allow-list/limit | Never block legitimate retries blindly |

| ID | Requirement |
|---|---|
| RL-01 | All tiers above are implemented and configurable; whitelisting of health checks and trusted internal IPs. |
| RL-02 | Behind a proxy, the real client IP is derived through a **trusted proxy** configuration (`trust proxy`), preventing spoofing via `X-Forwarded-For`. |
| RL-03 | Repeated violations trigger **temporary bans** (escalating: 1 min, 15 min, 1 h) and are logged and alerted. |
| RL-04 | Optional CAPTCHA (e.g. Turnstile/hCaptcha) on register, login-after-failures, and forgot-password. |
| RL-05 | Database and query protection: statement timeout, connection pool limits, max page size 100, no unbounded exports/queries, slow-query logging. |
| RL-06 | Load test demonstrates that a single abusive IP cannot degrade p95 latency for other users. |

## 7.4 Frontend Security (Mandatory)

| ID | Requirement |
|---|---|
| SEC-F01 | **No tokens in `localStorage`/`sessionStorage`.** Access token in memory; refresh via HttpOnly cookie. Silent refresh on app load and before expiry. |
| SEC-F02 | **Content Security Policy** set through Netlify `_headers` / `netlify.toml`: `default-src 'self'`; scripts limited to self (no `unsafe-inline`/`unsafe-eval`, use nonces/hashes if needed); `connect-src` limited to the API and WSS origin; `img-src` limited to the CDN; `frame-ancestors 'none'`; `object-src 'none'`; `base-uri 'self'`; `form-action 'self'`. |
| SEC-F03 | Additional headers: `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (disable camera/mic/geolocation unless used), `Cross-Origin-Opener-Policy`. |
| SEC-F04 | **XSS defence:** never use `dangerouslySetInnerHTML` with user data; if rich text is unavoidable, sanitise with DOMPurify; escape chat/itinerary content; sanitise URLs (`http/https/mailto/tel` only). |
| SEC-F05 | **Route guards** and permission-aware UI (`<Can>`); unauthorised routes redirect; sensitive routes lazy-loaded so their code is not shipped to unauthorised roles where practical. UI checks are **never** relied upon for security. |
| SEC-F06 | **Form hardening:** client-side validation (Zod) mirrors server rules for UX only; disable submit while pending; prevent double submit; autocomplete attributes correct (`current-password`, `new-password`). |
| SEC-F07 | **Session handling:** idle timeout warning, automatic logout on refresh failure, cross-tab logout (BroadcastChannel/storage event without storing tokens). |
| SEC-F08 | **Dependency and supply-chain:** lockfile, `npm audit` in CI, minimal dependencies, Subresource Integrity for any third-party script (avoid third-party scripts where possible), no inline analytics without review. |
| SEC-F09 | **Build hygiene:** source maps not publicly served in production (or uploaded privately to error tracker); no secrets in the bundle (only public config such as `VITE_API_URL`). |
| SEC-F10 | **Error boundaries** that show generic messages; no stack traces; error tracking (e.g. Sentry) with PII scrubbing. |
| SEC-F11 | **Open redirect protection:** post-login redirects validated against an allow-list of in-app paths. |
| SEC-F12 | **Clickjacking:** `frame-ancestors 'none'`. **Tabnabbing:** `rel="noopener noreferrer"` on external links. |
| SEC-F13 | **Sensitive data display:** mask payout details, never prefill passwords, clear sensitive state on logout. |
| SEC-F14 | **Cross-origin cookie strategy (Netlify + separate API):** preferred approach is a **same-site custom domain setup** (`app.example.com` for the SPA, `api.example.com` for the API) so cookies are first-party. If cross-site is unavoidable, use `SameSite=None; Secure` plus CSRF defence (SEC-B08). Netlify proxy rewrites must not be used for WebSockets. |

## 7.5 Security Verification
- Threat model (STRIDE) document for auth, booking, wallet, chat, and export flows.
- OWASP ASVS Level 2 checklist completed; OWASP Top 10 mapped to controls.
- Automated: SAST, dependency scan, secret scan in CI; DAST baseline scan (OWASP ZAP) against staging.
- Manual or third-party penetration test before go-live; all high/critical findings fixed, medium tracked.

## 7.6 Caching (Optional)

Delivered behind feature flag `CACHE_ENABLED`; the system must function correctly with it **off**.

| ID | Requirement |
|---|---|
| CAC-01 | **HTTP caching** for public catalog: `ETag`/`Last-Modified`, `Cache-Control: public, max-age=60, stale-while-revalidate=300`; user-specific responses use `private, no-store`. |
| CAC-02 | **Redis cache** (cache-aside) for: public destination list/detail (TTL 60 to 300 s), effective-price lookups, permission sets per role (TTL 60 s), popularity scores, dashboard aggregates (TTL 30 to 120 s per scope key). |
| CAC-03 | **Invalidation:** destination/pricing/role-mapping changes publish invalidation events; keys are namespaced and versioned (`dest:v3:list:{hash}`). |
| CAC-04 | **Never cache** authorization decisions beyond the stated TTL, financial balances, or any response containing another user's data under a shared key. Cache keys for scoped data include the scope identity. |
| CAC-05 | Cache stampede protection (lock or jittered TTL); graceful fallback to DB if Redis is down. |
| CAC-06 | Frontend caching via TanStack Query with sensible `staleTime`; static assets hashed and served with long-lived immutable cache headers on Netlify. |

## 7.7 API Documentation: Swagger/OpenAPI (Optional)

| ID | Requirement |
|---|---|
| DOC-01 | `@nestjs/swagger` generates OpenAPI 3 from DTOs/decorators; every endpoint documents request/response schemas, error codes, auth requirement, and the required `Permission` enum value (custom `x-required-permission` extension). |
| DOC-02 | **Disabled in production** by default or protected behind authentication/IP allow-list; enabled on `local` and `staging`. |
| DOC-03 | Exported `openapi.json` is committed/published as a build artifact and can generate the frontend API client types. |

## 7.8 Acceptance Criteria
- Automated test hammering `/auth/login` is throttled after the configured threshold across two API instances (shared Redis).
- Security headers score A or better on a header-scanner against the Netlify site; CSP produces no violations in normal flows.
- ZAP baseline scan has no high findings; penetration test report attached with remediation status.
- With caching toggled off, all functional tests still pass.

---

# Phase 8: Testing, Deployment and Handover

## 8.1 Testing Strategy

| Level | Scope | Tooling (suggested) | Target |
|---|---|---|---|
| Unit | Services, policies, pricing, commission/penalty math, state machine | Jest | ≥ 80% on business logic; 100% branch coverage on money math and policies |
| Integration | Controllers + DB (Testcontainers/Postgres), guards, migrations | Jest + Supertest | All endpoints, including deny paths |
| E2E (API) | Full flows: register → book → approve → commission → cancel | Supertest | All critical paths |
| E2E (UI) | Role journeys in a real browser | Playwright or Cypress | One journey per role plus cross-role flow |
| Security | IDOR matrix, authz bypass, rate-limit, XSS payloads, CSRF | Custom + ZAP | No high findings |
| Performance | Catalog, booking, dashboards, chat | k6 / Artillery | p95 targets in 13.1 |
| Accessibility | Key screens | axe, manual keyboard/screen-reader pass | WCAG 2.1 AA |
| UAT | Real users per role on staging | Test scripts | Signed acceptance |

**Mandatory financial test cases:** commission = 10% exactly; penalty = 2%, refund = 98%, `penalty + refund = total`; rounding edge cases (e.g. 0.01, 33.33, 99,999.99 ETB); concurrent approval; concurrent cancellation; reversal after cancellation; wallet equals ledger.

## 8.2 Deployment

### 8.2.1 Frontend (Netlify)
- Build: `npm run build`; publish directory `dist` (or `build`).
- `netlify.toml` must include:

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[[headers]]
  for = "/*"
  [headers.values]
    Strict-Transport-Security = "max-age=31536000; includeSubDomains; preload"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Permissions-Policy = "camera=(), microphone=(), geolocation=()"
    Content-Security-Policy = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: https://cdn.example.com; connect-src 'self' https://api.example.com wss://api.example.com; frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'"

[[headers]]
  for = "/assets/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
```
(Domains are placeholders; adjust the CSP if a font or map provider is added.)

- Deploy previews for PRs point to the **staging** API only. Production deploys require manual approval.

### 8.2.2 Backend
- Dockerised NestJS (multi-stage build, non-root user, read-only filesystem where possible, healthchecks).
- Hosted on container infrastructure (e.g. a managed container platform or VPS with Docker/Kubernetes) behind a TLS-terminating reverse proxy (Nginx/Caddy/cloud LB) with WebSocket upgrade support and sticky sessions or Redis adapter.
- PostgreSQL: managed instance preferred, TLS enforced, private network access only, automated daily backups with point-in-time recovery, tested restore procedure.
- Redis (rate limiting, queue, optional cache): password-protected, private network.
- Migrations run as a release step before the new app version receives traffic; backward-compatible migrations (expand/contract) for zero-downtime.
- Observability: centralised logs, metrics (request rate, latency, error rate, queue depth), uptime monitoring, alerts (5xx spike, auth failure spike, throttle spike, DB connections, disk).

### 8.2.3 Environments and release flow
`feature branch → PR (CI + preview) → staging (auto) → UAT → production (manual approve) → post-deploy smoke test`. Rollback plan documented for both frontend (Netlify previous deploy) and backend (previous image + migration compatibility).

## 8.3 Handover Deliverables
- Source code with README (setup, scripts, architecture).
- Architecture and ERD diagrams, final OpenAPI file, permission matrix export.
- Operations runbook: deploy, rollback, backup/restore, rotate secrets, add a role/permission, handle a rate-limit incident.
- Security documentation: threat model, pen-test report, residual risks.
- User guides per role (Owner, Manager, Agent, Client) and a short training session.
- Seed/admin bootstrap procedure (first Owner creation through a one-time secured CLI command, not a public endpoint).

## 8.4 Final Acceptance Criteria
- All phase acceptance criteria met; UAT sign-off by the project owner.
- No open high/critical defects or vulnerabilities.
- Production smoke test passes; monitoring and backups verified.
- Documentation and handover complete.

---

# 13. Cross-Cutting Specifications

## 13.1 Performance (NFR-PERF)
| Metric | Target |
|---|---|
| API p95 latency (reads) | < 400 ms; (writes) < 800 ms under nominal load |
| Public catalog page (Largest Contentful Paint) | < 2.5 s on 4G mid-range mobile |
| Initial JS bundle | < 200 KB gzipped for public routes; route-level code splitting for dashboards |
| Dashboard load | < 2 s p95 |
| Concurrent users (v1 target) | 500 concurrent, 100 concurrent WebSocket connections per instance (scalable) |
| Images | WebP/AVIF, responsive `srcset`, lazy-loaded |

## 13.2 Reliability and Availability
- Target availability 99.5% monthly (excluding planned maintenance).
- RPO ≤ 24 h (target ≤ 15 min with PITR); RTO ≤ 4 h.
- Graceful degradation: if Redis, email, or push is down, core booking flows continue; notifications queue and retry.

## 13.3 Usability and Accessibility
WCAG 2.1 AA; responsive; consistent patterns; clear empty/error/loading states; confirmation for destructive actions; plain-language messages. Optional Amharic localisation (UI strings, emails, PDFs).

## 13.4 Maintainability
Layered modular NestJS architecture (module per domain: auth, users, rbac, destinations, pricing, agents, clients, bookings, wallet, notifications, chat, reports, audit); DTO-first; no business logic in controllers; shared types/OpenAPI-generated client; ADRs for major decisions.

## 13.5 Internationalisation and Time
- Storage in UTC; display in `Africa/Addis_Ababa`. Currency ETB; formatting via `Intl`. Optional Ethiopian calendar display. Phone numbers normalised to E.164.

## 13.6 Data Integrity
- Foreign keys, `CHECK` constraints (e.g. `total_price >= 0`, `penalty_fee >= 0`, status enum), unique indexes (referral code, email, commission per booking), transactions for multi-step money operations, soft deletes for business entities, `created_at/updated_at` everywhere.

## 13.7 Audit and Compliance
Append-only audit trail; retention policy documented; ability to export audit records for dispute resolution.

## 13.8 Quality Gates
Coverage thresholds enforced in CI; zero ESLint errors; no `any` in business logic without justification; migrations reviewed; security checklist ticked on each PR touching auth, money, or permissions.

---

# 14. Data Model (PostgreSQL)

The source schema is extended to support dynamic ABAC, ledger-based wallets, pricing rules, chat, notifications, and audit. Types shown are indicative.

## 14.1 Entity Overview

```
users 1─N user_roles N─1 roles 1─N role_permissions (permission ENUM, scope ENUM)
users 1─1 agents (referral_code UNIQUE) 1─N clients(users) via referred_by_agent_id
destinations 1─N price_rules ; destinations 1─N destination_media
bookings N─1 users(client) ; N─1 destinations ; 1─N booking_status_history
agents 1─N wallet_transactions ; bookings 1─N wallet_transactions
conversations 1─N conversation_participants ; conversations 1─N messages
users 1─N notifications ; audit_logs (append-only) ; refresh_sessions
```

## 14.2 Enumerated Types

```sql
CREATE TYPE user_status       AS ENUM ('PENDING_VERIFICATION','ACTIVE','SUSPENDED','REVOKED','BLOCKED');
CREATE TYPE permission_key    AS ENUM (/* all values of the Permission enum */);
CREATE TYPE permission_scope  AS ENUM ('ANY','OWN','ASSIGNED','TEAM');
CREATE TYPE destination_status AS ENUM ('DRAFT','ACTIVE','INACTIVE','CANCELLED');
CREATE TYPE booking_status    AS ENUM ('PENDING','APPROVED','REJECTED','CANCELLED','COMPLETED');
CREATE TYPE wallet_tx_type    AS ENUM ('COMMISSION_CREDIT','COMMISSION_REVERSAL','PAYOUT');
CREATE TYPE price_adjust_type AS ENUM ('PERCENT','FIXED_AMOUNT','OVERRIDE');
```

> If the enum must evolve often, store `permission` as `TEXT` with a `CHECK` constraint generated from the code enum and verified at boot, since altering Postgres enums is awkward. Either approach is acceptable; pick one in Phase 0.

## 14.3 Tables

### Identity and authorization
| Table | Key fields | Constraints / notes |
|---|---|---|
| `users` | `id UUID PK`, `name`, `email CITEXT UNIQUE`, `phone`, `password_hash`, `status user_status`, `email_verified_at`, `last_login_at`, `mfa_secret_enc`, `created_at`, `updated_at` | Index on `status`; email normalised |
| `roles` | `id`, `role_name UNIQUE`, `description`, `is_system BOOL` | System roles cannot be deleted |
| `role_permissions` | `role_id FK`, `permission permission_key`, `scope permission_scope`, `PRIMARY KEY (role_id, permission)` | The dynamic N-to-N mapping; replaces free-form `permission_key/route_path` of the source plan. Optional `route_map` table (`method`, `path_pattern`, `permission`) can document endpoint bindings. |
| `user_roles` | `user_id FK`, `role_id FK`, `assigned_by`, `assigned_at`, `PRIMARY KEY (user_id, role_id)` | 1-to-N from users |
| `refresh_sessions` | `id`, `user_id`, `token_hash`, `family_id`, `device`, `ip`, `expires_at`, `revoked_at`, `replaced_by` | Reuse detection by `family_id` |
| `one_time_tokens` | `id`, `user_id`, `type` (VERIFY/RESET/INVITE), `token_hash`, `expires_at`, `used_at` | Hashed, single-use |

### Business
| Table | Key fields | Constraints / notes |
|---|---|---|
| `destinations` | `id`, `slug UNIQUE`, `title`, `region`, `description`, `itinerary JSONB`, `inclusions`, `duration_days`, `capacity`, `base_price NUMERIC(14,2) CHECK (>=0)`, `status`, `popularity_score`, `created_by`, `deleted_at` | Index on `(status, region)`, GIN/trigram on title for search |
| `destination_media` | `id`, `destination_id FK`, `url`, `alt_text`, `sort_order`, `is_cover` | Max 12 per destination (app-level) |
| `price_rules` | `id`, `destination_id FK`, `name`, `start_date`, `end_date`, `adjust_type`, `value NUMERIC`, `priority` | Exclusion constraint for overlapping equal priority |
| `agents` | `id`, `user_id UNIQUE FK`, `referral_code UNIQUE`, `wallet_balance NUMERIC(14,2)`, `manager_id FK users`, `payout_details_enc`, `deactivated_at` | `referral_code` unique, indexed |
| `clients` (profile) | `user_id PK/FK`, `referred_by_agent_id FK NULL`, `referral_code_used`, `onboarding_status` | Index on `referred_by_agent_id` |
| `requests_bookings` (`bookings`) | `id`, `client_id FK`, `destination_id FK`, `agent_id FK NULL`, `travel_date`, `travelers INT`, `unit_price`, `total_price NUMERIC(14,2)`, `applied_rule_id`, `penalty_fee NUMERIC(14,2) DEFAULT 0`, `refund_amount NUMERIC(14,2)`, `status booking_status`, `manager_comment`, `idempotency_key UNIQUE`, `approved_by`, `approved_at`, `cancelled_at`, `completed_at` | Index on `(status, created_at)`, `(agent_id)`, `(client_id)`; `CHECK (penalty_fee + COALESCE(refund_amount,0) <= total_price)` |
| `booking_status_history` | `id`, `booking_id`, `from_status`, `to_status`, `actor_id`, `comment`, `created_at` | Append-only |
| `wallet_transactions` | `id`, `agent_id FK`, `booking_id FK NULL`, `type`, `amount NUMERIC(14,2)`, `rate_used`, `balance_after`, `reference`, `created_by`, `created_at` | `UNIQUE (booking_id, type)` where type in credit/reversal; append-only |
| `payments` | `id`, `booking_id`, `method`, `amount`, `provider_ref UNIQUE`, `status`, `raw_payload_hash` | Idempotent webhook handling |
| `app_settings` | `key PK`, `value JSONB`, `updated_by` | `commission_rate`, `cancellation_penalty_rate`, throttle values |

### Communication and audit
| Table | Key fields | Notes |
|---|---|---|
| `notifications` | `id`, `user_id`, `type`, `title`, `body`, `ref_type`, `ref_id`, `read_at`, `created_at` | Index `(user_id, read_at, created_at DESC)` |
| `notification_preferences` | `user_id`, `type`, `channel`, `enabled` | |
| `conversations` | `id`, `type` (AGENT_MANAGER / CLIENT_SUPPORT), `status`, `created_at` | |
| `conversation_participants` | `conversation_id`, `user_id`, `last_read_at` | PK on both |
| `messages` | `id`, `conversation_id`, `sender_id`, `body`, `client_msg_id UNIQUE per conversation`, `created_at` | Index `(conversation_id, created_at)` |
| `audit_logs` | `id`, `actor_id`, `action`, `entity_type`, `entity_id`, `before JSONB`, `after JSONB`, `ip`, `user_agent`, `created_at` | Append-only; DB role without UPDATE/DELETE |

## 14.4 Critical SQL Safeguards (examples)

```sql
-- Commission can only be credited once per booking
CREATE UNIQUE INDEX uq_commission_once
  ON wallet_transactions (booking_id, type)
  WHERE type IN ('COMMISSION_CREDIT','COMMISSION_REVERSAL');

-- Money sanity
ALTER TABLE requests_bookings
  ADD CONSTRAINT chk_amounts CHECK (total_price >= 0 AND penalty_fee >= 0);

-- Unique referral code, case-insensitive
CREATE UNIQUE INDEX uq_agents_referral ON agents (UPPER(referral_code));
```

---

# 15. API Specification Summary

Base path `/api/v1`. All JSON. Errors follow a standard envelope `{ statusCode, error, message, correlationId }`. Lists accept `page`, `limit` (≤ 100), `sort`, `q`, and filters.

| Area | Method and path | Permission (enum) | Notes |
|---|---|---|---|
| Auth | `POST /auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/logout-all` | Public / authenticated | Strict rate limit |
| | `POST /auth/register` (client), `/auth/verify-email`, `/auth/forgot-password`, `/auth/reset-password`, `/auth/accept-invite` | Public | Strict rate limit |
| | `GET /auth/me` | Authenticated | Returns effective permissions |
| Roles | `GET/POST/PATCH /roles`, `PUT /roles/:id/permissions` | `ROLE_READ` / `ROLE_MANAGE` | Owner |
| Managers | `POST /managers`, `PATCH /managers/:id`, `POST /managers/:id/suspend`, `/revoke` | `MANAGER_*` | Owner |
| Destinations | `GET /destinations`, `GET /destinations/:slug` | `DESTINATION_READ_PUBLIC` | Public, cacheable |
| | `POST /destinations`, `PATCH /destinations/:id`, `DELETE /destinations/:id` (soft) | `DESTINATION_CREATE/UPDATE/DELETE` | Owner |
| Pricing | `GET/POST/PATCH/DELETE /destinations/:id/price-rules` | `PRICING_MANAGE` | Owner |
| Agents | `POST /agents`, `GET /agents`, `PATCH /agents/:id`, `POST /agents/:id/deactivate`, `/rotate-referral` | `AGENT_*` | Manager |
| Clients | `POST /clients` (agent-assisted), `GET /clients` | `CLIENT_REGISTER`, `CLIENT_READ` | Scope-filtered |
| Bookings | `POST /bookings` | `BOOKING_CREATE` | `Idempotency-Key` |
| | `GET /bookings`, `GET /bookings/:id` | `BOOKING_READ` | Scope-filtered |
| | `POST /bookings/:id/approve`, `/reject`, `/comments`, `/complete` | `BOOKING_APPROVE/REJECT/COMMENT/COMPLETE` | Manager |
| | `POST /bookings/:id/cancel` | `BOOKING_CANCEL` | Preview: `GET /bookings/:id/cancel-preview` |
| Wallet | `GET /wallet`, `GET /wallet/transactions` | `WALLET_READ` | Agent: own |
| | `POST /payouts` | `COMMISSION_PAYOUT_PROCESS` | Manager |
| Dashboards | `GET /dashboard/{owner,manager,agent,client}` | `DASHBOARD_READ` | Scope-aware |
| Reports | `GET /reports/daily`, `/reports/bookings` | `REPORT_READ` | Filters, sort, search |
| | `POST /reports/export` (`xlsx` / `pdf`), `GET /reports/exports/:id` | `REPORT_EXPORT` | Async for large |
| Notifications | `GET /notifications`, `PATCH /notifications/:id/read`, `POST /notifications/read-all` | `NOTIFICATION_READ` | |
| Chat | `GET /conversations`, `GET /conversations/:id/messages` | `CHAT_USE` | WS events: `message:send`, `message:new`, `typing`, `read` |
| Audit | `GET /audit-logs` | `AUDIT_READ` | Owner |
| Health | `GET /health/live`, `/health/ready` | Public (limited) | Whitelisted from throttling |

---

# 16. Open Questions and Assumptions

## 16.1 Open Questions (need project-owner decisions)

| ID | Question | Default assumption used in this SRS |
|---|---|---|
| OQ-1 | **Deadline format:** is `14/02/2019 EC` DD/MM/YYYY (Tikimt 14, 2019 ≈ 24 Oct 2026) or something else? | DD/MM/YYYY, which makes the deadline very close. See 16.3. |
| OQ-2 | **Commission trigger:** source says commission applies to "successfully completed" transactions, but the rule table credits on **booking approval**. Which one? | Credit on approval (rule table), reverse on cancellation; configurable to credit on `COMPLETED`. |
| OQ-3 | Is the 10% commission and 2% penalty fixed or adjustable by the Owner? | Stored as settings (default 10% and 2%), editable by Owner only. |
| OQ-4 | Penalty on cancelling a booking **before any payment** (PENDING)? | 2% still applied to total per source; confirm with the owner. |
| OQ-5 | Are payments collected online (which gateway?) or offline and recorded manually? | Manual recording in v1, gateway interface ready. |
| OQ-6 | "Permission is attribute-based (enum)": confirm this means a typed permission enum plus scope attributes (ownership/assignment/team), with role mapping stored in the DB. | Yes, as designed in section 1.3. |
| OQ-7 | Where will the backend and database be hosted (budget, region, provider)? | Containerised cloud host with managed PostgreSQL. |
| OQ-8 | Languages required: English only, or Amharic too? | English first, Amharic-ready. |
| OQ-9 | Can one agent belong to multiple managers? Does `TEAM` scope follow the manager-agent link? | One manager per agent. |
| OQ-10 | Can a client change their referring agent? | No; Manager override only, audited. |
| OQ-11 | Does the Owner also approve bookings, or only view? | View only by default; adjustable via permissions. |
| OQ-12 | Is there capacity/availability per destination date? | Optional capacity field supported. |

## 16.2 Assumptions
- Single agency (single tenant). Single currency (ETB).
- Email is available for notifications; push notifications are optional.
- Image assets will be supplied or licensed by the owner.
- The team can obtain a custom domain so SPA and API share a registrable domain.

## 16.3 Minimum Viable Release (if the deadline is fixed)

If the deadline is near, deliver in this order, each slice shippable:

1. **Must-have (core):** Phase 0 (lean), Phase 1 (auth and enum-based ABAC, manager assignment), Phase 2 (catalog and base pricing), Phase 3 (agents, referral, client registration), Phase 4 (booking, approve/reject, 10% commission, 2% cancellation).
2. **Must-have security:** headers/CSP, input validation, rate limiting on auth and writes, audit log for money and permission changes.
3. **Should-have:** notifications (in-app first), basic dashboards, Excel/PDF export of the daily report.
4. **Could-have (post-launch):** real-time chat polish, seasonal pricing rules UI, async exports, Redis caching, Swagger, 2FA, Amharic.

Security items for auth, authorization, validation, rate limiting, and financial integrity are **not** deferrable.

---

# 17. Risks

| ID | Risk | Impact | Mitigation |
|---|---|---|---|
| R1 | Tight deadline versus scope | High | MVP slicing (16.3), parallel frontend/backend tracks, early design sign-off |
| R2 | Netlify cannot host the API/WebSocket | Medium | Separate backend host from day one; same-site custom domains |
| R3 | Financial errors (double credit/refund, rounding) | High | Transactions, row locks, unique constraints, ledger, exhaustive tests |
| R4 | Authorization gaps (IDOR/scope leaks) | High | Default-deny, scope filters in queries, IDOR test matrix |
| R5 | Ambiguous commission trigger | Medium | Decide OQ-2 early; setting-driven implementation |
| R6 | Payment gateway integration delays | Medium | Interface plus manual recording fallback |
| R7 | Abuse (credential stuffing, scraping, export flooding) | High | Layered rate limits, lockouts, CAPTCHA option, WAF |
| R8 | Design inconsistency across many screens | Medium | Token-driven design system built first |
| R9 | WebSocket scaling and reliability on weak networks | Medium | Redis adapter, reconnect/dedupe, REST fallback for history |
| R10 | Data loss | High | Managed backups, PITR, restore drills |

---

# 18. Requirements Traceability Matrix

Maps source-document requirements to this SRS.

| Source requirement (v1.0) | Covered by |
|---|---|
| Stack: React, NestJS, PostgreSQL, Netlify | Sections 2.4, 8.2; Phase 0 |
| Dynamic RBAC, no hardcoded roles | Section 1.3; FR-AUTHZ-01 to 07; `role_permissions` table |
| Owner: manager assignment/suspend/revoke | FR-USR-01 to 04 |
| Owner: destination CRUD with soft delete | FR-DST-01 to 05 |
| Owner: pricing engine (base and seasonal) | FR-PRC-01 to 06 |
| Owner: consolidated daily reports, search/sort/filter, Excel and PDF | FR-RPT-01 to 09 |
| Manager: agent lifecycle | FR-AGT-01 to 06 |
| Manager: client onboarding alerts | FR-ALR-01 to 03 |
| Manager: dashboard (sales, bookings, agent performance) | FR-DSH-01 to 04 |
| Manager: request moderation (approve/reject/comment) | FR-BKG-03, 04 |
| Manager: data export and search | FR-RPT-02 to 05 |
| Agent: referral registration, unique code | FR-AGT-02, FR-CLI-01, 02 |
| Agent: 10% automated commission | FR-COM-01 to 07 |
| Agent: financial notifications | FR-COM-05; FR-NOT-02 |
| Agent: pipeline dashboard (daily registered, pending, rejected) | Section 3.5; Phase 6 dashboards |
| Agent: chat with managers | FR-CHT-01 to 10 |
| Client: public discovery with search/filter/sort | FR-CAT-01 to 06 |
| Client: booking requests and status notifications | FR-BKG-01, 02, 05; FR-NOT |
| Client: self-cancel with 2% penalty | FR-CAN-01 to 07 |
| Client: live support chat | FR-CHT-01, 05 |
| Business rules table (commission, cancellation, RBAC evaluation) | Sections 4.3, 4.4, 1.3 |
| Architecture (API gateway, guard, generators, DB, external services) | Sections 2.1, 8.2 |
| Database schema plan | Section 14 |
| Netlify config (`/* /index.html 200`) | Section 8.2.1 |
| Backend containerised, TLS DB connection | Sections 8.2.2, SEC-B01 |
| **Added by project owner:** attribute-based (enum) permissions | Sections 1.3.1 to 1.3.6 |
| **Added:** professional hand-crafted design | Phase 0, section 0.3 |
| **Added:** Swagger (optional) | Section 7.7 |
| **Added:** hard security front and back | Sections 7.2, 7.4, 7.5 |
| **Added:** rate limiting | Section 7.3 |
| **Added:** caching (optional) | Section 7.6 |

---

*End of document. Version 2.0. Review the open questions in section 16 before implementation begins.*
