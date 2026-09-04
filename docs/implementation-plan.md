# IMPLEMENTATION PLAN: AUTOMOTIVE PARTS & WAREHOUSE MANAGEMENT SYSTEM
**Project:** Website quản lý kho / phụ tùng ô tô tại Công ty Maluzen (Osaka, Japan)
**Author / Lead:** Senior Full-Stack System Engineer
**Date:** August 25, 2026

---

## 1. CURRENT PROJECT STATE

A comprehensive audit of the repository was conducted.

### 1.1 Existing Files & Artifacts
* **`MASTER_PROMPT.md`**: Master prompt document outlining the 20 implementation phases, core business rules, actors, 12 Use Cases, 13 Domain Entities, stack requirements, and academic consistency guidelines.
* **`bao_cao_thuc_tap_maluzen_nguyen_hoang_gia-gd4.md`**: Academic report (2,763 lines) containing:
  * Chapter 1 & 2: Internship context at Maluzen (Osaka, Japan) & physical inbound/outbound/stock check/QC processes.
  * Chapter 3: BPMN diagrams for Inbound, Outbound, Stock Check.
  * Chapter 4: System objectives, 5 primary actors, functional requirements (FR-01 to FR-12), and non-functional requirements (NFRs).
  * Chapter 5: 12 Use Cases with detailed specifications (UC01–UC12).
  * Chapter 6: Domain Model with 13 core entities and relationship diagrams.
  * Chapter 7: Sequence Diagrams for 6 core Use Cases (Login, Add Part, Inbound, Outbound, Stock Check, Inventory Report).
  * Chapter 8: System Architecture, Class Diagram, Database Design (11 primary tables), and UI screen designs.
  * Chapters 9–12: Web implementation plan, test cases (Chapter 10), internship logs, and conclusions.
* **`stitch/`**: Stitch UI export files:
  * `stitch_auto_parts_warehouse_manager.zip` & `stitch_auto_parts_warehouse_manager (1).zip`
  * Extracted screen mockups (HTML & PNG) across 23 screen folders (Login, Dashboard, Parts List, Add/Edit Part, Import Receipts, Create Import Receipt, Export Receipts, Create Export Receipt, Warehouses, Add/Edit Warehouse, Disable Warehouse Modal, Stock Check Verification, Stock Check History, Quality Checks, Create Quality Check, Reports & Statistics, User Management, Add User, Deactivate User Modal, Role Management, Add Role, Design Tokens).
  * `stitch/extracted/stitch_auto_parts_warehouse_manager/precision_logistics/DESIGN.md`: Visual Design System specification (Color palette: Primary `#1E40AF`, Surface `#F7F9FB`, Inter & JetBrains Mono fonts, 8px grid, 4px corner radius, Slate neutral scale).

### 1.2 Missing Infrastructure / Code Base
* **No Next.js application codebase** (`package.json`, `app/`, `src/`, `components/`, etc.) is present in the workspace root yet.
* **No Prisma ORM configuration** (`prisma/schema.prisma` or migration files) exists yet.
* **No environment configuration** (`.env`, `.env.example`, or `.env.local`) exists yet.

---

## 2. TECHNOLOGY STACK

The system architecture strictly adheres to Chapter 8 of the report and Section 22 of `MASTER_PROMPT.md`.

* **Frontend Framework:** Next.js (App Router), React, TypeScript.
* **Styling & UI Components:** Tailwind CSS, `shadcn/ui`, Lucide Icons.
* **Fonts:** `Inter` (sans-serif body/headers) & `JetBrains Mono` (monospace for SKU numbers, VINs, location bins).
* **Backend Layer:** Next.js Server Actions & Route Handlers (API Endpoints). *No external NestJS or Express backend server.*
* **ORM:** Prisma ORM (`@prisma/client`, `prisma`).
* **Database Engine:** PostgreSQL (Cloud instance hosted on **Neon PostgreSQL** with Connection Pooling).
* **Authentication & Authorization:** Custom JWT/Session authentication with `bcryptjs` password hashing and server-side RBAC middleware.
* **Validation:** Client-side & Server-side schema validation using `Zod`.
* **Deployment Target:** Vercel Cloud Platform.

---

## 3. ARCHITECTURE

### 3.1 Layered Architecture Overview
```
[ Browser / Client UI ]
        │  (HTTP / Server Action Calls)
        ▼
[ Next.js App Router (Client Components) ]
        │
        ▼
[ Server Layer: Route Handlers / Server Actions ]
   ├── Input Validation (Zod)
   ├── Authentication & RBAC Verification
   └── Transaction & Business Rules Logic
        │
        ▼
[ Data Access Layer: Prisma ORM ]
        │  (SQL Queries / Transactions)
        ▼
[ Neon PostgreSQL Cloud Database ]
```

### 3.2 Key Architectural Principles
1. **Zero Direct DB Access from Client:** All DB queries occur strictly within server context (Server Actions / Route Handlers).
2. **ACID Transaction Management:** All inventory mutations (Inbound, Outbound, Stock Check adjustments) execute inside Prisma interactive transactions (`prisma.$transaction`).
3. **Optimistic & Safe Inventory Locks:** Prevent negative inventory during outbound operations by performing strict inventory checks before updating stock within single DB transactions.

---

## 4. DATABASE MAPPING (PRISMA SCHEMA DESIGN)

To resolve discrepancies between Chapter 6 (13 Entities), Chapter 8 (11 Tables), and Chapter 5/7/Stitch UI (Stock Checking & Audit Log), the Prisma schema includes all 13 core business entities plus explicit support for `StockCheck`, `StockCheckDetail`, and `AuditLog`.

### 4.1 Schema Tables & Fields Mapping

| Table Name | Description | Key Fields & Types | Relations |
| :--- | :--- | :--- | :--- |
| **`roles`** | Core RBAC Roles | `id` (Int PK), `name` (String Unique), `description` (String?), `permissions` (Json), `createdAt`, `updatedAt` | 1-to-N with `users` |
| **`users`** | System Accounts | `id` (Int PK), `username` (String Unique), `passwordHash` (String), `email` (String Unique), `fullName` (String), `roleId` (Int FK), `department` (String?), `status` (Enum: `ACTIVE`, `INACTIVE`), `lastLogin` (DateTime?), `createdAt`, `updatedAt` | N-to-1 with `roles`, 1-to-N with Receipts, QC, AuditLogs |
| **`categories`** | Part Classification Tree | `id` (Int PK), `name` (String Unique), `description` (String?), `parentId` (Int FK nullable), `status` (Enum: `ACTIVE`, `INACTIVE`), `createdAt`, `updatedAt` | Self-referencing (Parent/Child), 1-to-N with `parts` |
| **`suppliers`** | Vendor Profiles | `id` (Int PK), `name` (String Unique), `contactName` (String?), `phone` (String?), `email` (String?), `address` (String?), `taxCode` (String?), `bankAccount` (String?), `rating` (Float), `status` (Enum: `ACTIVE`, `INACTIVE`), `createdAt`, `updatedAt` | 1-to-N with `parts`, 1-to-N with `import_receipts` |
| **`parts`** | Auto Parts Master Data | `id` (Int PK), `sku` (String Unique), `name` (String), `categoryId` (Int FK), `brand` (String?), `unit` (String), `purchasePrice` (Decimal), `salePrice` (Decimal), `supplierId` (Int FK?), `specifications` (JsonB - size, width, PCD, ET, DOT, etc.), `imageUrl` (String?), `minStock` (Int), `maxStock` (Int), `locationDefault` (String?), `status` (Enum: `ACTIVE`, `INACTIVE`, `DISCONTINUED`), `createdAt`, `updatedAt` | N-to-1 `categories`, `suppliers`, 1-to-N `inventories`, Receipt Details, QC |
| **`warehouses`** | Physical Warehouse Sites | `id` (Int PK), `code` (String Unique), `name` (String), `address` (String?), `phone` (String?), `description` (String?), `capacity` (Int), `currentOccupancy` (Int), `status` (Enum: `ACTIVE`, `INACTIVE`, `MAINTENANCE`), `createdAt`, `updatedAt` | 1-to-N `inventories`, `import_receipts`, `stock_checks` |
| **`inventories`** | Stock per Part & Warehouse | `id` (Int PK), `partId` (Int FK), `warehouseId` (Int FK), `quantity` (Int), `minStock` (Int), `maxStock` (Int), `location` (String?), `status` (Enum: `NORMAL`, `LOW`, `OUT`, `OVER`), `lastUpdated` (DateTime) | Composite Unique (`partId`, `warehouseId`), N-to-1 `parts`, `warehouses` |
| **`import_receipts`** | Inbound Headers | `id` (Int PK), `receiptNumber` (String Unique), `supplierId` (Int FK), `warehouseId` (Int FK), `userId` (Int FK), `importDate` (DateTime), `poNumber` (String?), `deliveryNote` (String?), `totalAmount` (Decimal), `notes` (String?), `status` (Enum: `DRAFT`, `PENDING`, `COMPLETED`, `CANCELLED`), `createdAt`, `updatedAt` | N-to-1 `suppliers`, `warehouses`, `users`, 1-to-N `import_receipt_details` |
| **`import_receipt_details`**| Inbound Line Items | `id` (Int PK), `importId` (Int FK), `partId` (Int FK), `quantity` (Int), `unitPrice` (Decimal), `totalPrice` (Decimal), `notes` (String?) | N-to-1 `import_receipts`, `parts` |
| **`export_receipts`** | Outbound Headers | `id` (Int PK), `receiptNumber` (String Unique), `userId` (Int FK), `requestDepartment` (String?), `exportDate` (DateTime), `reason` (String?), `totalAmount` (Decimal), `approvedBy` (Int FK nullable), `status` (Enum: `DRAFT`, `PENDING`, `APPROVED`, `COMPLETED`, `CANCELLED`), `createdAt`, `updatedAt` | N-to-1 `users` (Creator/Approver), 1-to-N `export_receipt_details` |
| **`export_receipt_details`**| Outbound Line Items | `id` (Int PK), `exportId` (Int FK), `partId` (Int FK), `quantity` (Int), `unitPrice` (Decimal), `totalPrice` (Decimal), `locationPicked` (String?) | N-to-1 `export_receipts`, `parts` |
| **`stock_checks`** | Stock Audit Headers | `id` (Int PK), `checkNumber` (String Unique), `warehouseId` (Int FK), `performedBy` (Int FK), `checkDate` (DateTime), `status` (Enum: `DRAFT`, `IN_PROGRESS`, `COMPLETED`, `ADJUSTED`), `notes` (String?), `createdAt`, `updatedAt` | N-to-1 `warehouses`, `users`, 1-to-N `stock_check_details` |
| **`stock_check_details`** | Stock Audit Line Items | `id` (Int PK), `stockCheckId` (Int FK), `partId` (Int FK), `systemQty` (Int), `actualQty` (Int), `difference` (Int), `status` (Enum: `MATCHED`, `SURPLUS`, `SHORTAGE`), `notes` (String?) | N-to-1 `stock_checks`, `parts` |
| **`quality_checks`** | QC Inspection Forms | `id` (Int PK), `checkNumber` (String Unique), `partId` (Int FK), `importId` (Int FK nullable), `checkedBy` (Int FK), `checkDate` (DateTime), `quantityChecked` (Int), `quantityPassed` (Int), `quantityFailed` (Int), `failureType` (String?), `failureDescription` (String?), `severity` (Enum: `MINOR`, `MODERATE`, `MAJOR`, `CRITICAL`), `images` (Json?), `action` (Enum: `RETURN`, `RECYCLE`, `DISPOSE`, `REPAIR`), `status` (Enum: `PENDING`, `REVIEWED`, `RESOLVED`), `createdAt`, `updatedAt` | N-to-1 `parts`, `import_receipts`, `users` |
| **`reports`** | Report Archives | `id` (Int PK), `reportType` (Enum: `INVENTORY`, `IMPORT_EXPORT`, `QUALITY`, `DASHBOARD`), `title` (String), `parameters` (Json), `generatedDate` (DateTime), `generatedBy` (Int FK), `dataSummary` (Json?), `fileUrl` (String?), `status` (Enum: `PROCESSING`, `COMPLETED`, `FAILED`), `createdAt` | N-to-1 `users` |
| **`audit_logs`** | System Security Logs | `id` (Int PK), `userId` (Int FK nullable), `action` (String), `entity` (String), `entityId` (String?), `metadata` (Json?), `ipAddress` (String?), `timestamp` (DateTime Default Now) | N-to-1 `users` |

---

## 5. DOMAIN MAPPING

Tracing between Report Chapter 6 Entities and the Implementation:

| Domain Entity (Chapter 6) | Database Model | Code Layer Mapping | Key Business Constraints |
| :--- | :--- | :--- | :--- |
| **User** | `users` | `lib/auth.ts`, `app/api/users` | Unique username/email, encrypted password, role linkage |
| **Role** | `roles` | `lib/rbac.ts`, `app/api/roles` | System roles (`Administrator`, `Manager`, `WarehouseStaff`, `AssemblyStaff`, `QC`) + custom permission JSON |
| **Part** | `parts` | `app/(dashboard)/parts` | Unique SKU, JSON specifications for Wheel (PCD, ET, Size) & Tire (DOT, Width, Aspect Ratio), min/max thresholds |
| **Category** | `categories` | `app/(dashboard)/categories` | Tree structure with `parentId` for multi-level category navigation |
| **Warehouse** | `warehouses` | `app/(dashboard)/warehouses` | Physical storage sites, code uniqueness, capacity & occupancy tracking |
| **Inventory** | `inventories` | `app/(dashboard)/inventory` | `quantity >= 0`, status auto-calculated (`NORMAL`, `LOW`, `OUT`, `OVER`) |
| **ImportReceipt** | `import_receipts` | `app/(dashboard)/imports` | Transactional receipt header linked to Supplier and Warehouse |
| **ImportReceiptDetail** | `import_receipt_details` | `app/(dashboard)/imports` | Header-detail relationship, total price calculations |
| **ExportReceipt** | `export_receipts` | `app/(dashboard)/exports` | Approval workflow (Manager), stock availability check prior to issuance |
| **ExportReceiptDetail** | `export_receipt_details` | `app/(dashboard)/exports` | Location bin tracking, deduction of stock on completion |
| **QualityCheck** | `quality_checks` | `app/(dashboard)/quality-checks` | `quantityChecked = quantityPassed + quantityFailed`, quarantine actions |
| **Supplier** | `suppliers` | `app/(dashboard)/suppliers` | Rating 0-5, contact & banking records for procurement |
| **Report** | `reports` | `app/(dashboard)/reports` | Real-time database query aggregator, parameters JSON logging |

---

## 6. USE CASE MAPPING

Tracing between Chapter 5 / Chapter 7 Use Cases and Technical Implementation:

| Use Case ID | Name | Core Actor(s) | Primary API / Action Path | Handled Technical Rules |
| :--- | :--- | :--- | :--- | :--- |
| **UC01** | Login | All Actors | `/api/auth/login` | Password verification (bcrypt), JWT creation, AuditLog entry |
| **UC02** | Logout | All Actors | `/api/auth/logout` | Session invalidation, client token clear |
| **UC03** | User Management | Administrator | `/api/users`, `/users` | Create, update, toggle active status, password reset, role assignment |
| **UC04** | Category Management | Admin, Manager | `/api/categories`, `/categories` | Parent-child tree hierarchy, delete safeguard (prevent if parts attached) |
| **UC05** | Parts Management | Admin, Manager, Warehouse | `/api/parts`, `/parts` | SKU uniqueness check, image URL, specification JSON validation |
| **UC06** | Import Warehouse | Warehouse Staff | `/api/imports`, `/imports/new` | Transactional import: receipt header + details + stock increment (`old + imported`) |
| **UC07** | Export Warehouse | Warehouse Staff, Assembly | `/api/exports`, `/exports/new` | Transactional export: stock check (`requested <= current`), prevent negative stock, stock decrement (`old - exported`) |
| **UC08** | Stock Check | Warehouse Staff, Manager | `/api/stock-check`, `/stock-check` | Physical count vs system count comparison, recount trigger on mismatch, Manager approval & overwrite |
| **UC09** | Quality Check | QC Staff, Warehouse Staff | `/api/quality-checks`, `/quality-checks` | `checked = passed + failed` validation rule, defective part quarantine, image uploads |
| **UC10** | Inventory Report | Manager, Admin, Warehouse | `/api/reports/inventory` | Real DB aggregation: total parts, low stock warnings, dead stock alerts |
| **UC11** | Import/Export Report | Manager, Admin | `/api/reports/import-export` | Date range filtering, N-X-T movement stats, chart data generation |
| **UC12** | Dashboard Overview | Manager, Admin, QC | `/api/dashboard/stats` | Real-time DB counters: Total Parts, Low Stock, Total Warehouses, Recent Activity |

---

## 7. UI PAGE MAPPING (STITCH DESIGN SYNC)

Tracing Stitch UI Screens to Next.js App Router Structure:

| Route Path | Stitch UI Source Folder | Target Component Page | Key UX Elements |
| :--- | :--- | :--- | :--- |
| `/login` | `login_precision_logistics` | `app/login/page.tsx` | Split login screen, indigo primary theme, error alerts, remember me |
| `/dashboard` | `dashboard_overview` | `app/(dashboard)/dashboard/page.tsx` | 4 Summary Stat cards, Low Stock alerts table, Recent transactions table, Movement trend charts |
| `/parts` | `parts_management_precision_logistics` | `app/(dashboard)/parts/page.tsx` | Filter bar (SKU/name, category, status), High density table, Action dropdowns |
| `/parts/new` | `add_new_part_precision_logistics` | `app/(dashboard)/parts/new/page.tsx` | Form cards, SKU input, JSON specifications editor (wheel/tire), image drag-and-drop |
| `/parts/[id]/edit` | `edit_part_precision_logistics` | `app/(dashboard)/parts/[id]/edit/page.tsx` | Pre-populated form fields, image upload, status toggle |
| `/categories` | *(Implied from Chapter 8)* | `app/(dashboard)/categories/page.tsx` | Category tree list, parent selector modal, quick search |
| `/suppliers` | *(Implied from Chapter 8)* | `app/(dashboard)/suppliers/page.tsx` | Supplier cards/table, rating badges, contact details modal |
| `/warehouses` | `warehouses_management_precision_logistics` | `app/(dashboard)/warehouses/page.tsx` | Grid/Table view of warehouses, capacity occupancy bars, status tags |
| `/warehouses/new` | `add_new_warehouse_precision_logistics` | `app/(dashboard)/warehouses/new/page.tsx` | Form for warehouse code, address, capacity, operating status |
| `/warehouses/[id]/edit`| `edit_warehouse_precision_logistics` & `disable_warehouse_confirmation` | `app/(dashboard)/warehouses/[id]/edit/page.tsx` | Edit details, disable confirmation dialog |
| `/inventory` | *(Combined from Warehouses/Parts)* | `app/(dashboard)/inventory/page.tsx` | Stock levels per location, low stock / out of stock status badges (`NORMAL`, `LOW`, `OUT`, `OVER`) |
| `/imports` | `import_receipts_precision_logistics` | `app/(dashboard)/imports/page.tsx` | Receipt status filters (`DRAFT`, `COMPLETED`, `CANCELLED`), creator tags |
| `/imports/new` | `create_import_receipt_precision_logistics` | `app/(dashboard)/imports/new/page.tsx` | Dynamic item row table (`+ Add Part`), quantity/price automatic line calculation, total summary card |
| `/exports` | *(Implied from Chapter 8)* | `app/(dashboard)/exports/page.tsx` | Outbound request list, department filters, approval status badges |
| `/exports/new` | `create_export_receipt_precision_logistics` | `app/(dashboard)/exports/new/page.tsx` | Dynamic item picking rows, real-time available stock validation error alert (`Requested > Available`) |
| `/stock-check` | `stock_check_history_precision_logistics` | `app/(dashboard)/stock-check/page.tsx` | History table of inventory audits, discrepancy counts, status badges |
| `/stock-check/new` | `stock_check_verification_precision_logistics` | `app/(dashboard)/stock-check/new/page.tsx` | Real-time physical count input table, match/discrepancy highlighting (surplus/shortage), progress indicator |
| `/quality-checks` | `quality_check_management_precision_logistics` | `app/(dashboard)/quality-checks/page.tsx` | QC history table, pass/fail counts, inspector tags |
| `/quality-checks/new` | `create_quality_check_precision_logistics` | `app/(dashboard)/quality-checks/new/page.tsx` | Inspection form, quantity sum validation error (`passed + failed == checked`), severity tags, defect reason select |
| `/reports` | `reports_and_statistics_precision_logistics` | `app/(dashboard)/reports/page.tsx` | Report tab navigation (Inventory, Import, Export, Quality), CSV/Excel/Print buttons, metric trend cards |
| `/users` | `user_management_precision_logistics` | `app/(dashboard)/users/page.tsx` | User table, role pills, status toggle, deactivate user modal |
| `/users/new` | `add_new_user_precision_logistics` | `app/(dashboard)/users/new/page.tsx` | Account creation form, password complexity, role select |
| `/roles` | `role_management_precision_logistics` | `app/(dashboard)/roles/page.tsx` | Role cards/table, user count badges, system vs custom tags |
| `/roles/new` | `add_new_role_precision_logistics` | `app/(dashboard)/roles/new/page.tsx` | Granular permission matrix checkboxes (Module x View/Create/Update/Delete) |

---

## 8. AUTHENTICATION PLAN

1. **Mechanism:** Session cookie / Stateless JWT signed with `AUTH_SECRET`.
2. **Password Hashing:** `bcryptjs` with salt rounds = 10. *Plaintext passwords are strictly forbidden.*
3. **Session Lifecycle:**
   * User submits credentials at `/login`.
   * Server validates `username` & `passwordHash` in `users` table.
   * If valid & `status == ACTIVE`, system updates `lastLogin` timestamp, creates an `AuditLog` entry, and sets an HTTP-only `auth_token` cookie.
   * Expiration: 8 hours.
4. **Middleware Protection:** Next.js `middleware.ts` intercepts all non-public routes (`/(dashboard)/*`) and redirects unauthenticated users to `/login`.

---

## 9. RBAC (ROLE-BASED ACCESS CONTROL) PLAN

### 9.1 Core Roles & Permissions Matrix

| Actor / Role | Dashboard | Parts / Categories / Suppliers | Inbound (Imports) | Outbound (Exports) | Stock Check | Quality Check | Reports | Users & Roles | Audit Logs |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Administrator** | Full | Full | Full | Full | Full | Full | Full | Full | Full |
| **Manager** | Full | View / Edit | View / Approve | View / Approve | Approve / Overwrite | View / Review | Full | View Only | View |
| **Warehouse Staff** | Basic | View / Create / Edit | Create / Complete | Create / Complete | Perform Count | View / Report | View Basic | None | None |
| **Assembly Staff** | Basic | View Parts Only | None | Request Export | None | Report Defect | None | None | None |
| **QC Staff** | Basic | View Parts | View Inbound QC | None | None | Full QC | Quality Reports | None | None |

### 9.2 Enforcement Strategy
* **Client UI Enforcement:** Navigation links and action buttons are hidden/disabled based on current user's role.
* **Server-Side Authorization (Mandatory):** Every Server Action & Route Handler verifies the caller's role against required permission flags. Unauthorized requests throw `403 Forbidden` errors.

---

## 10. SEED DATA PLAN

To ensure a rich academic demonstration, seed scripts (`prisma/seed.ts`) will generate realistic automotive warehouse data:

1. **Roles:** `Administrator`, `Manager`, `WarehouseStaff`, `AssemblyStaff`, `QCStaff`.
2. **Demo Users (5 Accounts with default password `Password123!`):**
   * `admin` / `admin@precisionlogistics.com` (Administrator)
   * `manager` / `manager@precisionlogistics.com` (Manager)
   * `warehouse` / `staff@precisionlogistics.com` (Warehouse Staff)
   * `assembly` / `assembly@precisionlogistics.com` (Assembly Staff)
   * `qc` / `qc@precisionlogistics.com` (QC Staff)
3. **Categories:**
   * Tires (Summer Tires, Winter Tires, All-Season Tires)
   * Wheels (Alloy Wheels, Steel Wheels, Forged Wheels)
   * Accessories (TPMS Sensors, Lug Nuts, Valves, Wheel Spacers)
4. **Suppliers:** Michelin Japan, Bridgestone Corporation, Dunlop Tires, Yokohama Rubber, BBS Wheels, Work Wheels, Enkei Tuning.
5. **Warehouses:**
   * `WH-OSK-01`: Osaka Central Warehouse (Main Distribution Hub)
   * `WH-TKY-02`: Tokyo Regional Depot
   * `WH-KOB-03`: Kobe Assembly Storage
6. **Parts (25+ Realistic Items):**
   * *Wheels:* BBS LM 19" (Alloy, PCD 5x114.3, ET35), Work Emotion ZR10 18", Enkei RPF1 17".
   * *Tires:* Michelin Pilot Sport 5 225/40R18 (DOT 1224), Bridgestone Potenza RE-71RS, Yokohama ADVAN Neova.
   * *Accessories:* Air Valve TPMS Sensor, Forged Lug Nut Set M12xP1.5.
7. **Inventories & Movement Data:** Pre-populated inventory levels (`NORMAL`, `LOW`, `OUT`, `OVER`), initial import receipts, sample export receipts, completed stock checks, and QC reports.

---

## 11. TESTING PLAN

Testing will validate both positive flows and edge cases outlined in Chapter 10 of the report:

1. **Authentication & RBAC:**
   * Valid login redirect to role-specific dashboard.
   * Invalid password / disabled account rejection.
   * Route protection against unauthorized role access.
2. **Business Rules Validation:**
   * **Duplicate SKU Prevention:** Attempting to create a part with an existing SKU throws a validation error.
   * **Negative Stock Prevention:** Exporting more items than available in `inventories` throws `InsufficientStockException`.
   * **Quality Quantity Formula:** Creating a Quality Check where `checked != passed + failed` throws a validation error.
   * **Transaction Rollback:** Simulated failure during import receipt creation verifies no partial records are written.
3. **UI Responsiveness:** Test desktop layout (1280px+), collapsed sidebar tablet layout (768px-1279px), and mobile overlay drawer (<768px).

---

## 12. LOCAL DEVELOPMENT PLAN

### 1.1 Command Workflow
```bash
# 1. Initialize Next.js app foundation with dependencies
npm install

# 2. Database Schema Generation & Migration
npx prisma generate
npx prisma db push

# 3. Seed Demo Data
npx prisma db seed

# 4. Run Local Development Server
npm run dev
```

### 1.2 Required `package.json` Scripts
* `dev`: `next dev`
* `build`: `prisma generate && next build`
* `start`: `next start`
* `lint`: `next lint`
* `typecheck`: `tsc --noEmit`
* `db:generate`: `prisma generate`
* `db:push`: `prisma db push`
* `db:seed`: `tsx prisma/seed.ts`
* `db:reset`: `prisma db push --force-reset && tsx prisma/seed.ts`

---

## 13. VERCEL DEPLOYMENT PLAN

1. **Build Step Execution:** `build` script triggers `prisma generate` prior to `next build` to ensure client types are fresh in Vercel's serverless environment.
2. **Environment Variables Configuration:**
   * `DATABASE_URL`: Neon PostgreSQL pooled connection string (`postgres://...pooler.eastus2.azure.neon.tech/neondb?sslmode=require`).
   * `DIRECT_URL`: Neon PostgreSQL direct connection string for migrations.
   * `AUTH_SECRET`: Random 64-char secret key for JWT signing.
3. **Zero Custom Server:** Built strictly on Next.js serverless functions (Route Handlers & Server Actions).

---

## 14. CONFLICTS AND INCONSISTENCIES ANALYSIS

During the audit, the following conflicts between Chapter 4/5/6/7/8 documentation and Stitch UI were identified:

| Issue # | Area | Conflict / Discrepancy | Resolution & Recommendation |
| :--- | :--- | :--- | :--- |
| **C-01** | **Stock Check Database Tables** | Chapter 5 (UC08), Chapter 7 (Seq 7.6), and Stitch UI (`stock_check_verification`, `stock_check_history`) detail an explicit Stock Check workflow. However, Chapter 6 & 8 omitted `StockCheck` and `StockCheckDetail` tables from their explicit DB lists. | **Resolved in Plan:** Added `stock_checks` and `stock_check_details` tables to the Prisma schema to fully back UC08 & Stitch UI screens. |
| **C-02** | **Suppliers & Reports DB Tables** | Chapter 6 Domain Model & Class Diagram 8.2 include `Supplier` and `Report` entities, but Chapter 8.3 DB section omitted detailed table breakdowns for them. | **Resolved in Plan:** Included `suppliers` and `reports` tables explicitly in the database mapping. |
| **C-03** | **Audit Log Requirements** | Chapter 4.5.2 & MASTER_PROMPT Chapter 21 mandate audit trailing for sensitive changes, but Chapter 6 did not list `AuditLog` as a business entity. | **Resolved in Plan:** Classified `AuditLog` as a Technical Support Entity (allowed by MASTER_PROMPT Section 7) and added `audit_logs` table. |
| **C-04** | **Role Definitions (Report vs. Stitch)** | Report Chapter 4 specifies 5 core actors (`Administrator`, `Manager`, `Warehouse Staff`, `Assembly Staff`, `QC Staff`). Stitch UI Role Management mockup lists terms like `Super Admin`, `Forklift Operator`, `Inventory Clerk`. | **Resolved in Plan:** Seed the 5 core academic business roles defined in Chapter 4, while allowing the dynamic Role table to support custom user-created roles as shown in Stitch UI. |
| **C-05** | **Part Specifications Structure** | Wheel & Tire specifications have completely different fields (Wheel: size, width, PCD, ET, holes, material; Tire: width, aspect ratio, diameter, load index, speed rating, DOT code). | **Resolved in Plan:** Store specifications in a flexible PostgreSQL `@db.JsonB` column with TypeScript interface validation per category. |

---

**Next Phase Readiness:** Upon user approval of this implementation plan, Phase 1 (Foundation Setup) can commence.
