# Maluzen Automotive Parts & Warehouse Management System
## Technical Architecture & Production Specification

### 1. Architectural Overview

The Maluzen Warehouse Management System (WMS) is architected as a modern, high-performance, full-stack Next.js application utilizing React Server Components (RSC), Server Actions for authoritative mutations, Prisma ORM 5.x for type-safe database interactions, and serverless Neon PostgreSQL with connection pooling.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CLIENT BROWSER                                │
│  - React Server Component Streaming & Client Component Interactivity     │
│  - Lucide Icons & Tailwind CSS (Stitch Automotive Theme)                │
│  - Client-side validation mirroring server schemas                      │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ HTTPS / HTTP-Only Secure Cookies
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       NEXT.JS EDGE & RUNTIME                            │
│  - middleware.ts: Session presence check, route gatekeeping             │
│  - Server Components: Pre-rendered data retrieval                       │
│  - Server Actions: Authoritative state mutations                        │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ Authoritative Invocations
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       AUTHORITATIVE SECURITY PIPELINE                    │
│  1. requireAuth()        → Authenticates JWT session cookie             │
│  2. requirePermission()  → Validates RBAC permissions                   │
│  3. Zod Parsing          → Validates and coerces payload                │
│  4. Business Invariants  → Validates domain rules & safety guards       │
│  5. prisma.$transaction  → Executes atomic database operations          │
│  6. logAudit()           → Persists sanitized audit record              │
│  7. revalidatePath()     → Invalidates stale client caches              │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ Pooled SQL Queries
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                  DATABASE LAYER (NEON POSTGRESQL)                       │
│  - Primary Serverless PostgreSQL Instance                               │
│  - PgBouncer Connection Pooling (DATABASE_URL)                          │
│  - Direct Migration Target (DIRECT_URL)                                 │
│  - ACID Transactions, Cascades & Relational Integrity Constraints       │
└─────────────────────────────────────────────────────────────────────────┘
```

---

### 2. Core Architectural Principles

1. **Server-Side Authorization is Authoritative**:
   Client UI controls (hidden buttons, disabled inputs) exist purely for user ergonomics. All security boundaries are strictly enforced inside Server Actions using `requireAuth()` and `requirePermission()`.
2. **Atomic Multi-Record Mutations**:
   All operations touching more than one entity or altering inventory balances (Imports, Exports, Stock Checks, User Admin) are encapsulated inside `prisma.$transaction()` blocks. Partial states and broken records are impossible.
3. **Audit Trail Immutability**:
   Every state modification is logged via `logAudit()` with sanitized metadata (passwords, tokens, and credentials stripped). The audit log interface is strictly read-only.
4. **Resilient Inventory Model**:
   Negative inventory levels are prevented at both the application logic level and transactional checks. Stock statuses (`IN_STOCK`, `LOW_STOCK`, `OUT_OF_STOCK`) are dynamically derived based on minimum threshold metrics.

---

### 3. Data & Entity Relationship Model (ERD)

The database schema encapsulates 12 core domain entities:

- **User**: System user accounts (`username`, `email`, `passwordHash`, `isActive`, `roleId`).
- **Role**: Dynamic RBAC roles (`name`, `description`, `isSystem`, `permissions: String[]`).
- **AuditLog**: Append-only log trail (`userId`, `action`, `entity`, `entityId`, `details`, `ipAddress`, `createdAt`).
- **Category**: Part classifications (`name`, `code`, `description`).
- **Supplier**: External component vendors (`name`, `code`, `contactName`, `email`, `phone`, `address`).
- **Part**: Automotive components (`sku`, `name`, `partNumber`, `description`, `categoryId`, `supplierId`, `minStock`, `maxStock`, `unitPrice`).
- **Warehouse**: Storage facilities (`code`, `name`, `location`, `capacity`, `isActive`).
- **Inventory**: Stock positions (`warehouseId`, `partId`, `quantity`, `minQuantity`, `maxQuantity`, `location`).
- **ImportReceipt & ImportReceiptDetail**: Inbound goods receipts (`receiptNumber`, `supplierId`, `warehouseId`, `status: DRAFT|PENDING|COMPLETED|CANCELLED`, lines).
- **ExportReceipt & ExportReceiptDetail**: Outbound goods receipts (`receiptNumber`, `warehouseId`, `status: DRAFT|PENDING|COMPLETED|CANCELLED`, `customerName`, lines).
- **StockCheck & StockCheckDetail**: Physical inventory audits (`checkNumber`, `warehouseId`, `status: DRAFT|COUNTING|COMPLETED|CANCELLED|CONFLICT`, system vs counted qty, variance).
- **QualityCheck**: Quality assurance inspections (`checkNumber`, `partId`, `quantityChecked`, `quantityPassed`, `quantityFailed`, `severity`, `action`, `result: PASS|FAIL|CONDITIONAL`).

---

### 4. RBAC & Security Matrix

System permissions are fine-grained strings grouped by domain:

| Domain | Permission Keys | Default Role Mappings |
| :--- | :--- | :--- |
| **System** | `users:view`, `users:manage`, `roles:view`, `roles:manage`, `audit:view` | `ADMINISTRATOR` |
| **Inventory** | `inventory:view`, `inventory:manage` | `ADMINISTRATOR`, `MANAGER`, `WAREHOUSE_STAFF` |
| **Catalog** | `parts:view`, `parts:manage`, `categories:manage`, `suppliers:manage` | `ADMINISTRATOR`, `MANAGER`, `WAREHOUSE_STAFF` |
| **Logistics** | `import:view`, `import:create`, `import:complete`, `import:cancel` | `ADMINISTRATOR`, `MANAGER`, `WAREHOUSE_STAFF` |
| **Outbound** | `export:view`, `export:create`, `export:complete`, `export:cancel` | `ADMINISTRATOR`, `MANAGER`, `WAREHOUSE_STAFF` |
| **Auditing** | `stock-check:view`, `stock-check:create`, `stock-check:complete` | `ADMINISTRATOR`, `MANAGER`, `WAREHOUSE_STAFF` |
| **Quality** | `quality:view`, `quality:create`, `quality:manage` | `ADMINISTRATOR`, `MANAGER`, `QC_STAFF` |
| **Analytics**| `reports:view`, `dashboard:view` | `ADMINISTRATOR`, `MANAGER` |

#### Administrator Safety Invariants (BR-ADMIN-001..007)
1. **BR-ADMIN-001**: The system requires at least one active Administrator. Deactivating the final active Administrator is blocked with `CANNOT_DEACTIVATE_LAST_ADMIN`.
2. **BR-ADMIN-002**: Deleting the final active Administrator account is strictly prohibited.
3. **BR-ADMIN-003**: Reassigning the final active Administrator to a non-administrative role is rejected.
4. **BR-ADMIN-004**: System-seeded roles (`ADMINISTRATOR`, `MANAGER`, etc.) cannot be deleted or renamed.
5. **BR-ADMIN-005**: Password resets for administrative accounts require elevated privileges.
6. **BR-ADMIN-006**: Self-demotion or self-deactivation by the sole active administrator is prevented.
7. **BR-ADMIN-007**: Every administrative action logs before-and-after states atomically.

---

### 5. Production Configuration & Deployment

#### Environment Variables
```env
# Serverless connection to Neon PostgreSQL (pooled via PgBouncer)
DATABASE_URL="postgresql://user:pass@ep-xyz-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require"

# Direct unpooled connection for Prisma migrations
DIRECT_URL="postgresql://user:pass@ep-xyz.us-east-1.aws.neon.tech/neondb?sslmode=require"

# JWT session encryption secret (32+ character high-entropy key)
AUTH_SECRET="your-high-entropy-jwt-secret-min-32-chars"

# Node runtime environment
NODE_ENV="production"
```

#### Production Build & Release Pipeline
```bash
# 1. Install dependencies
npm ci

# 2. Generate Prisma Client
npx prisma generate

# 3. Apply any pending database migrations safely
npx prisma migrate deploy

# 4. Compile Next.js production build
npm run build

# 5. Start production server
npm start
```
