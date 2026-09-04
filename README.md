# Maluzen Automotive Parts & Warehouse Management System

[![Production Ready](https://img.shields.io/badge/Status-Production%20Ready-emerald.svg)](https://github.com/maluzen/automotive-parts-warehouse-management-system)
[![Node.js](https://img.shields.io/badge/Node.js-20%20LTS-brightgreen.svg)](https://nodejs.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14.2%20App%20Router-black.svg)](https://nextjs.org/)
[![PostgreSQL / Neon](https://img.shields.io/badge/PostgreSQL-Neon%20Serverless-00e599.svg)](https://neon.tech/)
[![Prisma ORM](https://img.shields.io/badge/Prisma-5.22-2D3748.svg)](https://www.prisma.io/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg)](https://www.typescriptlang.org/)
[![Test Suites](https://img.shields.io/badge/Tests-269%20Passed%20%2F%200%20Failed-success.svg)](#test-suites--regression)

An enterprise-grade, web-based Automotive Parts and Warehouse Management System engineered for **Maluzen Co., Ltd. (Japan)**. The system streamlines end-to-end warehouse logistics: multi-warehouse inventory tracking, procurement inbound receipts, workshop outbound fulfillment, physical cycle counts, quality control inspections, real-time analytics, and role-based administration with immutable audit logging.

---

## 1. System Architecture & Tech Stack

```text
Browser Client (React / Tailwind CSS / Stitch Design System)
       │
       ▼
Next.js 14.2 App Router (Server Components & Server Actions)
       │
       ├─► HTTP-Only JWT Cookie Authentication (jose, 8h expiry)
       ├─► Granular Role-Based Access Control (RBAC)
       ├─► Zod Server-Side Schema Validation
       │
       ▼
Transactional Domain Services (Atomic prisma.$transaction)
       │
       ├─► Prisma ORM 5.22
       ▼
PostgreSQL Database (Neon Serverless Architecture with Connection Pooling)
```

### Core Technologies
- **Framework**: Next.js 14.2 (App Router, Server Actions, Server Components)
- **Language**: TypeScript 5.6 (Strict Mode)
- **Database**: PostgreSQL on Neon (Serverless connection pooling & autoscaling)
- **ORM**: Prisma 5.22 with relational integrity and indexed query execution
- **Security & Crypto**: `bcryptjs` (salt factor 10), `jose` (HS256 signed JWT cookies)
- **Validation**: Zod (100% input coverage across all Server Actions)
- **UI Design System**: Stitch Design System (accessible, responsive, clean enterprise aesthetics)
- **Visualization**: Accessible, dependency-free responsive SVG/Tailwind charts & meters

---

## 2. Functional Modules (Phases 1–12)

| Phase | Module | Primary Capabilities |
| :--- | :--- | :--- |
| **Phase 1–2.5** | **Foundation & Neon DB** | Next.js App Router, Neon PostgreSQL schema, relational mapping, connection pooling. |
| **Phase 3** | **Authentication & RBAC** | Secure JWT authentication, password hashing, role definitions, server-side authorization. |
| **Phase 4** | **Parts, Categories & Suppliers** | Master catalog, SKU management, category hierarchies, supplier scoring. |
| **Phase 5** | **Warehouse & Inventory** | Multi-warehouse tracking, bin locations, min/max thresholds, automated stock health derivation (`NORMAL`, `LOW`, `OUT`, `OVER`). |
| **Phase 6** | **Inbound / Import Receipts** | Supplier shipments, receipt lifecycles (`DRAFT` → `PENDING` → `COMPLETED`), atomic inventory addition. |
| **Phase 7** | **Outbound / Export Receipts** | Fulfillment orders, workshop dispatch, atomic stock deductions, negative inventory prevention. |
| **Phase 8** | **Physical Stock Checks** | Snapshot-based cycle counts, physical count entry, variance detection (`SHORTAGE`, `SURPLUS`), atomic reconciliation. |
| **Phase 9** | **Quality Control (QC)** | Inbound/outbound inspections, defect recording, severity tiers, disposition routing (`REWORK`, `RETURN`, `QUARANTINE`). |
| **Phase 10** | **Reports & Operational Analytics** | Real-time KPI dashboards, movement trends, supplier scorecards, warehouse capacities, CSV export. |
| **Phase 11** | **User, Role & System Admin** | User CRUD, credential management, interactive permission matrix, lockout guards (`BR-ADMIN-001..007`), read-only audit log viewer. |
| **Phase 12** | **QA, Security & Release** | Cross-module E2E integration tests, security threat review, responsive polish, production readiness verification. |

---

## 3. Seeded Accounts & Roles

The system comes pre-configured with 5 distinct operational roles:

| Username | Role | Scope & Permissions | Default Password |
| :--- | :--- | :--- | :--- |
| `admin` | **Administrator** | Full administrative and operational permissions across all 14 domains. | `Password123!` |
| `manager` | **Manager** | Warehouse management, receipt approvals, stock reconciliations, and analytics reports. | `Password123!` |
| `warehouse` | **Warehouse Staff** | Part management, receiving shipments, dispatching orders, physical stock counting. | `Password123!` |
| `assembly` | **Assembly Staff** | Workshop access, export shipment requests, defect reporting. | `Password123!` |
| `qc` | **QC Staff** | Scheduled quality inspections, defect recording, quality analytics reports. | `Password123!` |

---

## 4. Local Installation & Development

### Prerequisites
- Node.js 20 LTS or higher
- npm 10 or higher
- Neon PostgreSQL database instance

### Quickstart
1. **Clone the repository**:
   ```bash
   git clone https://github.com/maluzen/automotive-parts-warehouse-management-system.git
   cd automotive-parts-warehouse-management-system
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   Fill in your connection strings and auth secret:
   ```env
   DATABASE_URL="postgresql://[user]:[password]@[endpoint]-pooler.[region].aws.neon.tech/neondb?sslmode=require"
   DIRECT_URL="postgresql://[user]:[password]@[endpoint].[region].aws.neon.tech/neondb?sslmode=require"
   AUTH_SECRET="your-secure-random-32-byte-secret"
   NODE_ENV="development"
   ```

4. **Synchronize Prisma & Seed**:
   ```bash
   npx prisma generate
   npx prisma migrate status
   npm run db:seed
   ```

5. **Start Development Server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` and log in with one of the demo accounts above.

---

## 5. Test Suites & Regression

The repository includes a comprehensive 6-suite automated verification harness covering unit, transactional, security, RBAC, and E2E integration tests.

Run all test suites:
```bash
npm test
```

### Test Breakdown
| Suite | Command | Coverage | Tests |
| :--- | :--- | :--- | :--- |
| **Phase 7** | `npm run test:exports` | Outbound export receipts, negative stock guards, atomic deduction | 23 Passed |
| **Phase 8** | `npm run test:stock-checks` | Physical counting, snapshot concurrency, variance reconciliation | 32 Passed |
| **Phase 9** | `npm run test:quality-checks` | QC inspections, defect classification, disposition adjustments | 44 Passed |
| **Phase 10** | `npm run test:reports` | Analytical aggregations, zero-denominator safety, CSV formatting | 59 Passed |
| **Phase 11** | `npm run test:admin` | User CRUD, role matrix, BR-ADMIN-001..007, password hashing | 85 Passed |
| **Phase 12** | `npm run test:e2e` | Multi-module end-to-end integration workflows & rollback safety | 26 Passed |
| **Total** | `npm test` | **Complete Regression Suite** | **269 Passed / 0 Failed** |

---

## 6. Build & Quality Verification

Run strict verification gates:
```bash
# 1. Typecheck (0 errors expected)
npm run typecheck

# 2. ESLint (0 warnings/errors expected)
npm run lint

# 3. Production Build
npm run build

# 4. Prisma Validation
npx prisma validate
npx prisma migrate status
```

---

## 7. Security Architecture Highlights

- **Server-Side Enforcement**: All Server Actions enforce `requireAuth()` and `requirePermission()`. UI button visibility is never treated as authorization.
- **Administrator Safety Rules**:
  - `BR-ADMIN-001`: Sole active Administrator cannot be deactivated.
  - `BR-ADMIN-002`: Sole active Administrator cannot be deleted.
  - `BR-ADMIN-003`: Administrator role cannot be removed if zero administrators remain.
  - `BR-ADMIN-004`: Users cannot self-escalate to Administrator.
  - `BR-ADMIN-005`: Unauthorized actors cannot assign the Administrator role.
  - `BR-ADMIN-006`: Non-admins cannot modify Administrator permissions.
  - `BR-ADMIN-007`: Every administrative mutation is atomically logged to `AuditLog`.
- **Credential Protection**: Plaintext passwords are never stored in the database, logged, or exposed in API responses. Queries strictly omit `passwordHash`.
- **Audit Immutability**: The audit trail is strictly read-only; no UI or Server Action permits tampering, modification, or purging.

---

## 8. Deployment Target

The application is optimized for **Vercel** with **Neon PostgreSQL**:
- Build command: `npm run build`
- Start command: `npm run start`
- Runtime: Node.js 20 LTS
- Static / Dynamic Route generation: 31 compiled routes (serverless SSR & static assets)

---

## 9. License

Developed for Maluzen Co., Ltd. and Industrial University of Ho Chi Minh City (IUH). All rights reserved.
