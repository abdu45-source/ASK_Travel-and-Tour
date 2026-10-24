# Tour & Travel Agency Management System
### ASK Digital Technologies — Bahir Dar, Ethiopia

A full-stack, enterprise-grade Tour & Travel Agency Management System developed in strict adherence to the [Software Requirements Specification (SRS v2.0)](./SRS_Tour_Travel_Agency_Management_System.md).

---

## 🏛️ Architecture & Tech Stack

| Tier | Technology | Key Modules & Patterns |
|---|---|---|
| **Frontend** | React 18, Vite, TypeScript, Tailwind CSS, Lucide Icons | SPA architecture, Netlify deployment ready (`netlify.toml`), in-memory JWT storage, reactive Socket.IO connection, WCAG AA accessible Ethiopian palette |
| **Backend** | NestJS 10, TypeScript, TypeORM, Socket.IO, Helmet, Throttler | Modular domain architecture, Dynamic ABAC authorization engine, transactional row-level locking (`SELECT ... FOR UPDATE`), ExcelJS & PDFKit report generators |
| **Database** | PostgreSQL 18 | Fully normalized schema, immutable ledgers (`wallet_transactions`, `audit_logs`), unique referral codes, soft deletes |
| **Security** | Helmet, Argon2/Bcrypt, SameSite HttpOnly cookies | Rotating refresh tokens with family reuse detection, formula injection sanitization (`exceljs`), correlation IDs, global validation pipes |

---

## 🔑 Default Test Accounts & Credentials

The database has been seeded with standard test accounts for all four user classes:

| Role | Email | Password | Details |
|---|---|---|---|
| **System Owner** | `owner@askdigital.et` | `Owner@2026!` | Full executive oversight, dynamic RBAC permission editor, manager lifecycle, audit logs |
| **Agency Manager** | `manager@askdigital.et` | `Manager@2026!` | Moderation queue (approve/reject), agent partner management, commission payouts |
| **Travel Agent** | `agent@askdigital.et` | `Agent@2026!` | Unique referral code: **`ETHIOPIA10`**, 10% commission wallet ledger, pipeline stats |
| **Client Traveler** | `client@gmail.com` | `Client@2026!` | Public catalog discovery, booking requests, 2% penalty cancellation preview |

*Note: The login screen also features **One-Click Demo Role** buttons for instant testing.*

---

## 🚀 Running Locally

### 1. Backend (`backEnd/`)
```bash
cd backEnd
npm install
npm run seed       # Seeds roles, ABAC matrix, sample users, destinations, and bookings
npm run start:prod # Starts API server on http://localhost:3000/api/v1
```

- **API Base URL**: `http://localhost:3000/api/v1`
- **Health Check**: `http://localhost:3000/api/v1/health/live`
- **WebSocket Gateway**: `ws://localhost:3000`

### 2. Frontend (`frontEnd/`)
```bash
cd frontEnd
npm install
npm run build      # Builds production bundle to dist/
npm run preview    # Serves on http://localhost:5173/
```

- **Web App URL**: `http://localhost:5173/`

---

## 📋 Key Implemented Features

1. **Dynamic Attribute-Based Authorization (ABAC)**:
   - Permissions are closed, typed enums (`Permission`, `PermissionScope`).
   - Mappings between roles, permissions, and scopes are stored in PostgreSQL and **editable in real-time by the Owner** via the interactive matrix on the Owner Dashboard without any code redeployment!
2. **Automated 10% Agent Commission & Wallet Ledger**:
   - Unique, unambiguous 8-character referral codes (e.g. `ETHIOPIA10`).
   - When a referred client's booking is approved by a manager, **exactly 10%** is credited to the agent's wallet in a database transaction with append-only ledger entries in `wallet_transactions`.
3. **Transparent 2% Cancellation Policy & 98% Refund**:
   - Clients can self-cancel pending or approved tours before departure.
   - Interactive cancellation modal displays real-time 2% penalty fee and 98% refund calculation before confirmation.
   - Automatically reverses credited commissions (`COMMISSION_REVERSAL`) to prevent double dipping.
4. **Seasonal Pricing Engine**:
   - Date-based pricing rules (`PERCENT`, `FIXED_AMOUNT`, `OVERRIDE`) with priority resolution for holiday peaks (e.g. Genna Christmas +15%) or off-season discounts.
   - Price snapshots stored permanently at booking creation.
5. **Real-Time Support Chat & Notifications**:
   - Socket.IO gateway with authenticated JWT handshake, typing indicators, and room-based messaging between Clients ↔ Support and Agents ↔ Managers.
   - Persistent in-app notification center with unread counters.
6. **Reporting & Data Export**:
   - Consolidated Daily Operational Reports.
   - **Excel (.xlsx)** export with spreadsheet formula-injection protection (`=`, `+`, `-`, `@` neutralization).
   - **PDF (.pdf)** branded report export with headers, timestamps, and styled tables.
