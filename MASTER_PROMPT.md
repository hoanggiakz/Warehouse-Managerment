# MASTER PROMPT
# AUTOMOTIVE PARTS & WAREHOUSE MANAGEMENT SYSTEM
# MALUZEN INTERNSHIP PROJECT

You are a Senior Full-Stack Engineer, System Analyst,
Database Engineer, UI/UX Engineer, DevOps Engineer and QA Engineer.

Your task is to implement a complete academic software project:

"Phân tích và xây dựng Website quản lý kho/phụ tùng ô tô tại Công ty Maluzen"

The project is an Information Systems internship project.

============================================================
0. PROJECT PURPOSE
============================================================

This system is an academic simulation/prototype based on the
warehouse and automotive parts management processes researched
during the internship at Maluzen, Osaka, Japan.

The system is NOT the official internal system of Maluzen.

The application must therefore:

- Reflect the business processes documented in the report.
- Implement the Use Cases documented in the report.
- Follow the Domain Model documented in the report.
- Follow the Class Diagram and Sequence Diagrams.
- Follow the database design in Chapter 8.
- Reproduce the Stitch UI design as accurately as possible.
- Provide real database-backed functionality.
- Be runnable locally.
- Be deployable to Vercel.
- Use realistic demo data.
- Be suitable for academic demonstration.

============================================================
1. SOURCE OF TRUTH
============================================================

The main source of truth is:

bao_cao_thuc_tap_maluzen_nguyen_hoang_gia-gd4.md

Read the entire document before implementing the system.

Important chapters:

Chapter 1:
Company and internship context.

Chapter 2:
Real business processes.

Chapter 3:
BPMN processes.

Chapter 4:
Functional and non-functional requirements.

Chapter 5:
Use Cases and Use Case specifications.

Chapter 6:
Domain Model.

Chapter 7:
Sequence Diagrams.

Chapter 8:
System Architecture, Class Diagram,
Database Design and UI Design.

Chapter 9:
Website implementation.

Chapter 10:
Testing.

The implementation must remain consistent with these chapters.

============================================================
2. ACADEMIC CONSISTENCY RULE
============================================================

The final website must NOT become a separate system unrelated
to the academic report.

The following mapping must remain valid:

Chapter 2
Business Process
        ↓
Chapter 3
BPMN
        ↓
Chapter 4
Requirements
        ↓
Chapter 5
Use Cases
        ↓
Chapter 6
Domain Model
        ↓
Chapter 7
Sequence Diagrams
        ↓
Chapter 8
Class + Database + UI Design
        ↓
Chapter 9
Implementation
        ↓
Chapter 10
Testing

Whenever a feature is implemented, verify that it can be
traced back to a requirement or Use Case.

============================================================
3. BUSINESS CONTEXT
============================================================

The system models warehouse operations related to:

- Automotive wheels
- Automotive tires
- Automotive accessories
- Warehouse inventory
- Receiving
- Issuing
- Stock checking
- Quality control
- Reporting

The real business process researched includes:

Inbound:
Receive → Quantity Check → Quality Check →
Record Import → Update Inventory → Put Away

Outbound:
Receive Request → Check Inventory →
Pick Items → Confirm Export → Update Inventory →
Deliver to Assembly

Stock Check:
Create Check → Physical Count →
Compare With System → Recount if necessary →
Manager Approval → Inventory Adjustment

Quality:
Inspect → Record Defect →
Quarantine → Return/Recycle/Dispose/Repair

============================================================
4. CORE ACTORS
============================================================

The system has FIVE primary actors:

1. Administrator
2. Manager
3. Warehouse Staff
4. Assembly Staff
5. Quality Control Staff

Do not invent additional business actors unless explicitly
required by the documentation.

============================================================
5. CORE USE CASES
============================================================

The system contains the following 12 primary Use Cases:

UC01 - Login
UC02 - Logout
UC03 - User Management
UC04 - Part Category Management
UC05 - Parts Management
UC06 - Import Warehouse
UC07 - Export Warehouse
UC08 - Stock Check
UC09 - Defective Parts / Quality Check
UC10 - Inventory Report
UC11 - Import/Export Report
UC12 - Dashboard

Every implemented feature must map to these Use Cases.

============================================================
6. DOMAIN MODEL
============================================================

The current Domain Model contains 13 core entities:

1. User
2. Role
3. Part
4. Category
5. Warehouse
6. Inventory
7. ImportReceipt
8. ImportReceiptDetail
9. ExportReceipt
10. ExportReceiptDetail
11. QualityCheck
12. Supplier
13. Report

These entities must remain consistent with the report.

Do not silently remove or rename these entities.

Do not introduce unrelated entities.

If a technical requirement needs an additional table
(for example AuditLog), report it clearly as a technical
supporting entity before implementation.

============================================================
7. IMPORTANT DATABASE RULE
============================================================

The report contains a conceptual model with 13 business
entities.

The implementation may require additional technical tables
ONLY when necessary for:

- authentication/session management
- audit logging
- system configuration
- database integrity
- technical infrastructure

Examples:

AuditLog
Session

These are technical support entities, NOT replacements for
the 13 business entities.

============================================================
8. PART DATA
============================================================

Parts are the central entity.

A Part may represent:

- Wheel
- Tire
- Accessory

Important information may include:

- SKU
- Name
- Category
- Brand
- Unit
- Purchase Price
- Sale/Issue Price
- Supplier
- Technical Specifications
- Image
- Minimum Stock
- Maximum Stock
- Default Location
- Status

For technical specifications, use structured JSON/JSONB
only where appropriate.

Examples:

Wheel:
- Size
- Width
- PCD
- Offset
- Number of holes
- Color
- Material

Tire:
- Width
- Aspect Ratio
- Diameter
- Load Index
- Speed Rating
- DOT

Do not make every possible field mandatory.

============================================================
9. CATEGORY
============================================================

Categories support hierarchical classification.

Examples:

Tires
  ├── Summer Tires
  └── Winter Tires

Wheels
  ├── Alloy Wheels
  └── Steel Wheels

Accessories
  └── TPMS / Valves / Nuts

Support parent-child categories if already defined.

============================================================
10. SUPPLIER
============================================================

Supplier is part of the Domain Model.

Supplier information includes:

- Name
- Contact Name
- Phone
- Email
- Address
- Tax Code
- Bank Account
- Rating
- Status

Supplier is used primarily by:

- Parts
- Import Receipts
- Quality Reports

============================================================
11. WAREHOUSE
============================================================

Warehouse represents physical storage locations.

Important data:

- Code
- Name
- Address/Location
- Description
- Phone
- Capacity
- Current Occupancy
- Status

Inventory belongs to a Warehouse.

============================================================
12. INVENTORY
============================================================

Inventory connects:

Part ↔ Warehouse

Important fields:

- Part
- Warehouse
- Quantity
- Minimum Stock
- Maximum Stock
- Location
- Last Updated
- Status

Inventory status should support:

NORMAL
LOW
OUT
OVER

Business rules:

quantity >= 0

LOW:
quantity <= minimumStock

OUT:
quantity = 0

OVER:
quantity > maximumStock

============================================================
13. IMPORT RECEIPT
============================================================

ImportReceipt uses Header-Detail architecture.

Header:

- Receipt Number
- Supplier
- Warehouse
- User
- Import Date
- PO Number
- Delivery Note
- Total Amount
- Notes
- Status

Details:

- Part
- Quantity
- Unit Price
- Total Price
- Notes

Import business rule:

newInventory =
oldInventory + importedQuantity

The entire operation must use a database transaction.

============================================================
14. EXPORT RECEIPT
============================================================

ExportReceipt uses Header-Detail architecture.

Header:

- Receipt Number
- User
- Request Department
- Export Date
- Reason
- Total Amount
- Approved By
- Status

Details:

- Part
- Quantity
- Unit Price
- Total Price
- Location Picked

Before export:

requestedQuantity <= currentInventory

If insufficient:

Reject transaction.

Never allow negative inventory.

Successful export:

newInventory =
oldInventory - exportedQuantity

Use a transaction.

============================================================
15. STOCK CHECK
============================================================

Stock checking must follow the business process documented
in Chapter 3 and Chapter 5.

Workflow:

Create Stock Check
        ↓
Generate checklist
        ↓
Physical count
        ↓
Enter actual quantity
        ↓
Compare with system quantity
        ↓
If matched → complete
        ↓
If discrepancy → recount
        ↓
Still discrepancy
        ↓
Manager approval
        ↓
Inventory adjustment

Important:

Do not silently change inventory based only on employee input.

Inventory adjustment must require the appropriate permission.

============================================================
16. QUALITY CHECK
============================================================

QualityCheck must support:

- Part
- Import Receipt (optional)
- Checked By
- Check Date
- Checked Quantity
- Passed Quantity
- Failed Quantity
- Failure Type
- Failure Description
- Severity
- Images
- Action
- Status

Business rule:

checkedQuantity =
passedQuantity + failedQuantity

Possible severity:

Minor
Moderate
Major
Critical

Possible action:

Return
Recycle
Dispose
Repair

Possible status:

Pending
Reviewed
Resolved

============================================================
17. REPORTING
============================================================

Reports must be generated from actual database data.

Support:

Inventory Report
Import Report
Export Report
Quality Report
Dashboard statistics

Filters may include:

- Date range
- Warehouse
- Category
- Part
- Supplier

Reports must never use fake hardcoded numbers in production
screens.

============================================================
18. DASHBOARD
============================================================

Dashboard should display real database-backed statistics.

Examples:

- Total Parts
- Total Warehouses
- Low Stock Parts
- Total Inventory Quantity
- Import Quantity
- Export Quantity
- Recent Transactions
- Low Stock Alerts
- Inventory Movement
- Quality Statistics

All numbers shown in the dashboard must come from
the database.

============================================================
19. AUTHENTICATION
============================================================

The report specifies:

- Username/password authentication
- Password hashing
- RBAC
- Session/JWT concept
- Login audit information

Implementation must use a secure authentication mechanism
compatible with Next.js and Vercel.

Passwords must never be stored in plaintext.

Use bcrypt/secure password hashing.

Never expose passwordHash to the client.

============================================================
20. AUTHORIZATION / RBAC
============================================================

Authorization must be enforced server-side.

Suggested access model:

Administrator:
Full access.

Manager:
Management, approval, reports, dashboard,
inventory adjustment.

Warehouse Staff:
Parts, inventory, import, export, stock check,
quality reporting.

Assembly Staff:
View parts, request/export-related functions,
receive materials.

QC Staff:
Quality checks and quality reports.

However:

If the Markdown documentation specifies a different permission,
the Markdown takes priority.

============================================================
21. AUDIT LOG
============================================================

The report explicitly requires audit trail behavior.

Important actions should be auditable:

- Login
- Logout
- Create Part
- Update Part
- Delete/Deactivate Part
- Import
- Export
- Stock Adjustment
- Quality Check
- User Management
- Report Export

Audit data may include:

- User
- Action
- Entity
- Entity ID
- Timestamp
- IP if technically available
- Metadata

AuditLog is a technical support entity and must not replace
the business entities.

============================================================
22. TECHNOLOGY STACK
============================================================

Use:

Frontend:
Next.js
React
TypeScript
Tailwind CSS
shadcn/ui
Lucide Icons

Backend:
Next.js Server Actions
Next.js Route Handlers

ORM:
Prisma

Database:
PostgreSQL

Cloud Database:
Neon PostgreSQL

Deployment:
Vercel

Version Control:
GitHub

Do NOT use NestJS.

Do NOT create a separate Express server.

Do NOT create a persistent custom backend server.

============================================================
23. ARCHITECTURE
============================================================

Follow the architecture already documented in Chapter 8:

Browser
   ↓
Next.js
   ↓
Frontend UI
   ↓
Server Actions / Route Handlers
   ↓
Business Logic / Data Access
   ↓
Prisma
   ↓
Neon PostgreSQL

Frontend must never connect directly to PostgreSQL.

============================================================
24. UI SOURCE OF TRUTH
============================================================

Stitch UI is the visual source of truth.

The implementation must reproduce:

- Layout
- Sidebar
- Header
- Navigation
- Typography
- Colors
- Tables
- Forms
- Buttons
- Cards
- Dialogs
- Badges
- Charts
- Empty states
- Loading states
- Error states

Do not redesign the UI unless necessary.

If a Stitch screenshot and written requirements conflict:

Business requirements determine functionality.

Stitch determines visual presentation.

============================================================
25. REQUIRED UI PAGES
============================================================

At minimum:

/login

/dashboard

/parts
/parts/new
/parts/[id]
/parts/[id]/edit

/categories

/suppliers

/warehouses
/warehouses/new
/warehouses/[id]/edit

/inventory

/imports
/imports/new
/imports/[id]

/exports
/exports/new
/exports/[id]

/stock-check
/stock-check/new
/stock-check/[id]

/quality-checks
/quality-checks/new

/reports

/users
/users/new

/roles
/roles/new

Routes may be adjusted to fit the existing project structure.

============================================================
26. RESPONSIVE DESIGN
============================================================

Must support:

Desktop
Tablet
Mobile

Mobile navigation should use a drawer/sheet.

Tables must remain usable on small screens.

Forms must adapt to screen size.

============================================================
27. DATABASE INTEGRITY
============================================================

Use:

- Primary keys
- Foreign keys
- Unique constraints
- Indexes
- Transactions
- Appropriate cascading behavior
- Validation

Important unique fields:

username
roleName
category name where appropriate
SKU
receiptNumber
warehouse code
supplier name where appropriate

Do not overuse uniqueness constraints where the business
does not require them.

============================================================
28. VALIDATION
============================================================

Use a validation library such as Zod if appropriate.

Validation must happen:

Client side:
UX

Server side:
Security + business correctness

Important rules:

SKU cannot be duplicated.

Quantity must be > 0 when receiving/exporting.

Inventory cannot become negative.

Checked quantity =
passed quantity + failed quantity.

Part must belong to a valid category.

Import receipt must contain at least one item.

Export receipt must contain at least one item.

============================================================
29. SEED / DEMO DATA
============================================================

Create realistic seed data.

The demo environment must NOT be empty.

Seed:

Roles
Users
Categories
Suppliers
Parts
Warehouses
Inventory
Import Receipts
Export Receipts
Quality Checks

Data should look realistic for an automotive warehouse.

Examples:

Categories:
- Wheels
- Tires
- Accessories
- TPMS

Brands:
- Michelin
- Bridgestone
- Dunlop
- Yokohama
- BBS
- Work
- Enkei

Use fictionalized/demo data where appropriate.

Do not claim that demo data is real Maluzen confidential data.

============================================================
30. DEMO USERS
============================================================

Create demo accounts for:

admin
manager
warehouse
assembly
qc

Passwords must be documented in a development-only file
or README section clearly marked DEMO ONLY.

Never use real passwords.

============================================================
31. LOCAL DEVELOPMENT
============================================================

The project must run with:

npm install

and:

npm run dev

Required scripts should include:

dev
build
start
lint
typecheck
db:generate
db:migrate
db:seed
db:reset

Adapt scripts to the actual package manager/project.

============================================================
32. ENVIRONMENT VARIABLES
============================================================

Create:

.env.example

Potential variables:

DATABASE_URL=
DIRECT_URL=
AUTH_SECRET=

Do not commit real credentials.

============================================================
33. VERCEL
============================================================

The application must be deployable to Vercel.

Requirements:

- No persistent custom server
- Database accessible through Neon
- Environment variables configured
- Production build succeeds
- Prisma generated during build
- Server-side database access only
- No localhost assumptions

============================================================
34. DEVELOPMENT PROCESS
============================================================

Do NOT build the entire application in one uncontrolled step.

Work in phases.

After every phase:

1. Run typecheck.
2. Run lint.
3. Run build where appropriate.
4. Test functionality.
5. Review database changes.
6. Update implementation status.
7. Commit changes.

============================================================
35. PHASES
============================================================

PHASE 0
Repository audit

PHASE 1
Project foundation

PHASE 2
Database + Prisma

PHASE 3
Seed data

PHASE 4
Authentication

PHASE 5
Application shell / layout

PHASE 6
Dashboard

PHASE 7
Categories + Suppliers

PHASE 8
Parts

PHASE 9
Warehouses + Inventory

PHASE 10
Import Receipts

PHASE 11
Export Receipts

PHASE 12
Stock Check

PHASE 13
Quality Checks

PHASE 14
Reports

PHASE 15
Users + Roles + RBAC

PHASE 16
Audit Log

PHASE 17
Responsive/UI refinement

PHASE 18
Testing

PHASE 19
Production preparation

PHASE 20
Vercel deployment

============================================================
36. IMPLEMENTATION STATUS
============================================================

Maintain:

docs/implementation-status.md

Use:

DONE
IN PROGRESS
BLOCKED
TODO

For every feature record:

- Requirement
- Use Case
- UI
- Database
- Backend
- Testing
- Status

============================================================
37. NO MOCKED PRODUCTION DATA
============================================================

Mock data may be used ONLY for:

- initial UI prototyping
- Storybook/demo components
- seed generation

Once database integration begins:

Production pages must use real database data.

Never leave:

const parts = [...]

as the actual production data source.

============================================================
38. NO FAKE COMPLETION
============================================================

Never claim:

"Feature completed"

if it only has:

- static UI
- fake API
- mock database
- hardcoded numbers
- incomplete validation

Clearly distinguish:

UI COMPLETE

DATABASE CONNECTED

FUNCTIONAL COMPLETE

TESTED

DEPLOYED

============================================================
39. TESTING
============================================================

Testing must cover:

Login
Logout
RBAC
Parts CRUD
Category CRUD
Supplier CRUD
Warehouse CRUD
Inventory
Import
Export
Stock Check
Quality Check
Reports
Validation
Authorization
Responsive UI

Important negative cases:

Duplicate SKU
Invalid login
Disabled account
Insufficient inventory
Invalid quantity
Invalid quality totals
Unauthorized action
Invalid category
Failed transaction

============================================================
40. REPORT CONSISTENCY
============================================================

Before implementing a feature, identify:

- Related requirement
- Related Use Case
- Related Domain Entity
- Related Sequence Diagram
- Related database tables
- Related UI screen

This traceability should be documented.

============================================================
41. FIRST TASK — DO NOT CODE
============================================================

Before writing implementation code:

1. Inspect the repository.
2. Read the Markdown report.
3. Inspect Stitch exports.
4. Inspect screenshots.
5. Inspect package.json.
6. Inspect existing source code.
7. Inspect Prisma schema if present.
8. Inspect environment files.
9. Identify contradictions.
10. Create:

docs/implementation-plan.md

The plan must include:

A. Existing project state
B. Architecture
C. Database mapping
D. Domain mapping
E. Use Case mapping
F. UI mapping
G. Seed data plan
H. Authentication plan
I. RBAC plan
J. Testing plan
K. Local development plan
L. Vercel deployment plan
M. Potential inconsistencies

DO NOT IMPLEMENT FEATURES YET.

STOP AFTER CREATING THE PLAN.

============================================================
42. CRITICAL RULE
============================================================

Do not invent.

Do not silently redesign.

Do not delete documented functionality.

Do not replace the Domain Model.

Do not replace the database design.

Do not create fake functionality.

Do not change the Stitch visual design unnecessarily.

Do not expose secrets.

Do not use real confidential company data.

Build a coherent, realistic, database-backed academic
warehouse management system.

============================================================
END OF MASTER PROMPT
============================================================