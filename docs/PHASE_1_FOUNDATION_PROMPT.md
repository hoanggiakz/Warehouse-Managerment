# PHASE 1 — FOUNDATION SETUP
# AUTOMOTIVE PARTS & WAREHOUSE MANAGEMENT SYSTEM

You are a Senior Full-Stack System Engineer responsible for establishing
the production-ready foundation of an academic internship project.

==================================================
1. PROJECT CONTEXT
==================================================

Project name:
Automotive Parts & Warehouse Management System

Project purpose:
Build a web-based warehouse and automotive-parts management system
based on the internship research and system analysis conducted at
Maluzen, Osaka, Japan.

Academic context:
This project is part of an Information Systems internship report.

The system is intended to demonstrate:

- Automotive parts master-data management
- Warehouse management
- Inventory management
- Inbound / import warehouse operations
- Outbound / export warehouse operations
- Stock checking
- Quality checking
- Reporting
- User management
- Role-based access control

The system must remain consistent with the academic report,
Use Cases, Domain Model, Sequence Diagrams, Class Diagram,
Database Design and Stitch UI.

==================================================
2. SOURCE OF TRUTH
==================================================

The following project artifacts are the authoritative sources:

1. MASTER_PROMPT.md
2. PROJECT_SOURCE_OF_TRUTH.md
3. Implementation Plan
4. Academic internship report
5. Stitch UI export
6. Stitch DESIGN.md

Priority order:

PROJECT_SOURCE_OF_TRUTH.md
        ↓
MASTER_PROMPT.md
        ↓
Implementation Plan
        ↓
Academic Report
        ↓
Stitch UI Design
        ↓
Agent implementation decisions

If any implementation decision conflicts with these documents,
DO NOT silently change the architecture.

Stop and report the conflict before making a major architectural
decision.

==================================================
3. PHASE 1 OBJECTIVE
==================================================

The objective of this phase is ONLY to establish the application
foundation.

You must create a clean, maintainable and production-ready
Next.js project structure.

At the end of Phase 1, the project must:

- Install successfully
- Run locally
- Build successfully
- Pass TypeScript checking
- Have the correct folder structure
- Have Tailwind CSS configured
- Have shadcn/ui configured
- Have Lucide icons available
- Have Prisma installed and configured
- Have PostgreSQL environment variables prepared
- Have environment validation prepared
- Have basic design tokens prepared
- Have the initial application shell prepared
- Be ready for Phase 2 database implementation

DO NOT implement business modules yet.

==================================================
4. TECHNOLOGY STACK
==================================================

Use exactly the following stack:

Frontend:
- Next.js
- App Router
- React
- TypeScript

Styling:
- Tailwind CSS
- shadcn/ui
- Lucide React

Fonts:
- Inter
- JetBrains Mono

Backend:
- Next.js Server Actions
- Next.js Route Handlers

ORM:
- Prisma

Database:
- PostgreSQL

Production database:
- Neon PostgreSQL

Authentication:
- JWT / HTTP-only cookie architecture
- bcryptjs

Validation:
- Zod

Deployment target:
- Vercel

Do NOT introduce:

- NestJS
- Express
- MongoDB
- MySQL
- Firebase
- Supabase
- Redis
- GraphQL
- another backend server

unless explicitly requested later.

==================================================
5. ARCHITECTURE
==================================================

Use the following architecture:

Browser
   ↓
Next.js App Router
   ↓
React Components
   ↓
Server Actions / Route Handlers
   ↓
Validation Layer
   ↓
Business Logic Layer
   ↓
Prisma ORM
   ↓
PostgreSQL / Neon

Important:

The client must NEVER access the database directly.

All database access must occur inside server-side code.

Phase 1 does NOT implement the business logic layer yet,
but the folder architecture must allow it to be added cleanly.

==================================================
6. PROJECT STRUCTURE
==================================================

Create a scalable App Router structure similar to:

/
├── app/
│   ├── (public)/
│   │   └── login/
│   │       └── page.tsx
│   │
│   ├── (dashboard)/
│   │   └── dashboard/
│   │       └── page.tsx
│   │
│   ├── api/
│   │   └── health/
│   │       └── route.ts
│   │
│   ├── layout.tsx
│   ├── page.tsx
│   ├── globals.css
│   └── not-found.tsx
│
├── components/
│   ├── ui/
│   ├── layout/
│   └── shared/
│
├── lib/
│   ├── env.ts
│   ├── prisma.ts
│   ├── utils.ts
│   └── constants.ts
│
├── server/
│   ├── actions/
│   ├── services/
│   └── repositories/
│
├── prisma/
│   └── schema.prisma
│
├── types/
│   └── index.ts
│
├── config/
│   └── site.ts
│
├── public/
│   └── images/
│
├── tests/
│
├── .env.example
├── .gitignore
├── components.json
├── next.config.ts
├── package.json
├── postcss.config.mjs
├── tailwind.config.ts
├── tsconfig.json
└── README.md

You may adjust the exact folder structure if required by the
current Next.js version, but preserve the architectural separation.

==================================================
7. NEXT.JS CONFIGURATION
==================================================

Initialize a modern stable Next.js App Router application.

Requirements:

- TypeScript enabled
- ESLint enabled
- App Router enabled
- src/ directory is optional, but if used, use it consistently
- React Strict Mode enabled
- Production build must work
- No unnecessary experimental features

Use Server Components by default.

Use Client Components ONLY when interactivity requires them.

Do NOT add unnecessary state-management libraries.

Do NOT add Redux unless explicitly required later.

==================================================
8. TAILWIND / SHADCN CONFIGURATION
==================================================

Configure Tailwind CSS and shadcn/ui.

The design system must follow the Stitch design reference.

Core visual direction:

Primary:
#1E40AF

Surface:
#F7F9FB

Typography:
Inter

Monospace:
JetBrains Mono

Grid:
8px

Corner radius:
4px

General visual direction:

- Professional
- Enterprise
- Industrial
- Warehouse management
- High information density
- Clean
- Functional
- Minimal decorative elements

Do NOT redesign the Stitch UI.

The Stitch design is the visual source of truth.

==================================================
9. DESIGN TOKENS
==================================================

Prepare reusable design tokens for:

- Primary
- Primary foreground
- Background
- Surface
- Border
- Muted
- Text
- Success
- Warning
- Error
- Info

Also prepare typography utilities for:

- Body
- Heading
- Label
- Caption
- SKU
- VIN
- Warehouse location
- Technical identifiers

Use JetBrains Mono for:

- SKU
- VIN
- warehouse codes
- bin/location codes
- receipt numbers
- technical identifiers

==================================================
10. SHADCN COMPONENT FOUNDATION
==================================================

Install/configure only the foundational components needed during
Phase 1.

At minimum prepare the architecture for:

- Button
- Input
- Label
- Card
- Badge
- Dialog
- Dropdown Menu
- Table
- Select
- Checkbox
- Form
- Toast / Sonner
- Separator
- Sheet
- Tooltip

Do NOT build every business screen yet.

Do NOT create unnecessary components.

==================================================
11. PRISMA FOUNDATION
==================================================

Install Prisma and configure it for PostgreSQL.

Create:

prisma/schema.prisma

At this stage:

- Configure PostgreSQL datasource
- Configure Prisma client generator
- Do NOT implement the complete business schema yet
- Do NOT invent additional business entities
- Do NOT create migrations for business tables yet

The complete schema will be implemented in PHASE 2.

The environment must support:

DATABASE_URL
DIRECT_URL

The schema should be ready for Neon PostgreSQL.

==================================================
12. PRISMA CLIENT
==================================================

Create:

lib/prisma.ts

Implement a safe Prisma Client singleton suitable for:

- local development
- Next.js hot reload
- Vercel/serverless deployment

Avoid creating a new PrismaClient instance for every request.

Do NOT add database business queries yet.

==================================================
13. ENVIRONMENT CONFIGURATION
==================================================

Create:

.env.example

with:

DATABASE_URL=
DIRECT_URL=
AUTH_SECRET=

Optional future variables may be documented but should NOT be
required during Phase 1 unless actually used.

Never commit:

.env
.env.local
real secrets
production credentials

Create environment validation in:

lib/env.ts

Use Zod for environment validation.

Development should provide a clear error when required environment
variables are missing.

Do NOT expose server-only secrets to client components.

==================================================
14. BASIC APPLICATION SHELL
==================================================

Create a minimal application shell.

The root page should provide a simple project landing state.

Create:

/login

and:

/dashboard

However, these are ONLY placeholder foundation pages.

Do NOT implement authentication yet.

Do NOT implement RBAC yet.

Do NOT implement real database queries yet.

The dashboard placeholder should visually establish:

- Sidebar area
- Header area
- Main content area

but business navigation should be implemented in a later phase.

==================================================
15. HEALTH CHECK ENDPOINT
==================================================

Create:

GET /api/health

Response:

{
  "status": "ok"
}

The endpoint must not require authentication.

It will later be useful for:

- local development
- deployment verification
- Vercel health testing

Do not expose sensitive environment variables.

==================================================
16. BASIC ERROR HANDLING
==================================================

Prepare the application for:

- not-found handling
- global error handling
- loading states
- basic error boundaries

Create appropriate:

not-found.tsx

and error handling structure.

Do not implement complex business error handling yet.

==================================================
17. CODE QUALITY
==================================================

Use strict TypeScript.

Requirements:

- no `any` unless absolutely unavoidable
- meaningful variable names
- reusable components
- small focused modules
- no duplicated utility logic
- no hardcoded secrets
- no database access in UI components
- no business logic in presentation components

Use:

async/await

instead of deeply nested promises.

Prefer server-side logic where appropriate.

==================================================
18. ACCESSIBILITY
==================================================

All foundation UI components must consider:

- semantic HTML
- keyboard navigation
- labels for inputs
- accessible buttons
- focus states
- dialog accessibility
- appropriate ARIA only when necessary

Do not sacrifice accessibility for visual similarity.

==================================================
19. RESPONSIVE FOUNDATION
==================================================

Prepare the layout for:

Desktop:
1280px+

Tablet:
768px–1279px

Mobile:
<768px

The final application will use:

Desktop:
persistent sidebar

Tablet:
collapsed sidebar

Mobile:
drawer / overlay navigation

Phase 1 only needs the structural foundation.

==================================================
20. VERCEL COMPATIBILITY
==================================================

The project must be compatible with Vercel.

Do NOT use:

- custom Node server
- filesystem-dependent runtime state
- local database
- long-running server processes
- architecture that requires Docker in production

Use Next.js serverless-compatible patterns.

The project must be deployable later using:

Vercel
+
Neon PostgreSQL

Do not deploy during Phase 1 unless explicitly requested.

==================================================
21. PACKAGE MANAGEMENT
==================================================

Use npm.

Ensure package.json contains clean scripts for:

dev
build
start
lint
typecheck
db:generate
db:push
db:migrate
db:seed

For Phase 1:

- db:generate must work
- db:push may be available
- db:migrate may be prepared
- db:seed may be prepared for Phase 3

Do NOT implement seed data yet.

==================================================
22. README
==================================================

Create a useful README.md containing:

# Automotive Parts & Warehouse Management System

Include:

1. Project overview
2. Technology stack
3. Architecture
4. Local installation
5. Environment variables
6. Development commands
7. Database commands
8. Project structure
9. Deployment target
10. Current implementation phase

Clearly state:

CURRENT PHASE:
PHASE 1 — FOUNDATION SETUP

NEXT PHASE:
PHASE 2 — DATABASE IMPLEMENTATION

==================================================
23. GITIGNORE
==================================================

Ensure .gitignore includes:

node_modules
.next
.env
.env.local
.env.*.local
coverage
*.log

and other standard Next.js generated files.

==================================================
24. SECURITY BASELINE
==================================================

Even though authentication is not implemented yet:

- Never expose secrets
- Never commit .env
- Never expose DATABASE_URL to client
- Never expose AUTH_SECRET to client
- Never query database from Client Components
- Never store passwords in source code
- Never hardcode production credentials

==================================================
25. DO NOT IMPLEMENT IN PHASE 1
==================================================

ABSOLUTELY DO NOT IMPLEMENT:

- Authentication logic
- JWT generation
- Login verification
- Password hashing
- RBAC
- User management
- Role management
- Parts CRUD
- Category CRUD
- Supplier CRUD
- Warehouse CRUD
- Inventory logic
- Import logic
- Export logic
- Stock Check logic
- Quality Check logic
- Reports
- Dashboard statistics
- Audit logs
- Business transactions
- Seed data
- Production database migration
- File upload system

These belong to later phases.

==================================================
26. ACADEMIC CONSISTENCY
==================================================

This is an academic internship project.

Implementation must remain traceable to:

Chapter 4:
Requirements

Chapter 5:
Use Cases

Chapter 6:
Domain Model

Chapter 7:
Sequence Diagrams

Chapter 8:
System Design

Chapter 9:
Website Implementation

Do not introduce features that cannot be justified by the
requirements or system design unless explicitly approved.

==================================================
27. STITCH UI RULE
==================================================

Stitch is the visual design source of truth.

The implementation must eventually reproduce:

- layout
- spacing
- typography
- color system
- table density
- buttons
- cards
- forms
- badges
- navigation
- responsive behavior

For Phase 1, only establish the component/design foundation.

Do NOT attempt to recreate all 23 Stitch screens yet.

==================================================
28. IMPLEMENTATION PROCEDURE
==================================================

Follow this exact order:

STEP 1
Inspect the existing repository.

STEP 2
Determine whether a Next.js project already exists.

STEP 3
If no application exists, initialize the Next.js application.

STEP 4
Install required dependencies.

STEP 5
Configure Tailwind CSS.

STEP 6
Configure shadcn/ui.

STEP 7
Configure fonts and design tokens.

STEP 8
Create project folder structure.

STEP 9
Configure Prisma.

STEP 10
Create environment validation.

STEP 11
Create Prisma client singleton.

STEP 12
Create application shell.

STEP 13
Create /api/health.

STEP 14
Create README.

STEP 15
Run:

npm install
npm run lint
npm run typecheck
npm run build

STEP 16
Fix all errors.

STEP 17
Run local development server.

STEP 18
Verify:

/
 /login
 /dashboard
 /api/health

==================================================
29. ACCEPTANCE CRITERIA
==================================================

Phase 1 is COMPLETE only when ALL conditions below are satisfied.

[ ] Next.js application runs locally.

[ ] npm install succeeds.

[ ] npm run dev succeeds.

[ ] npm run lint succeeds.

[ ] npm run typecheck succeeds.

[ ] npm run build succeeds.

[ ] / loads successfully.

[ ] /login loads successfully.

[ ] /dashboard loads successfully.

[ ] /api/health returns HTTP 200.

[ ] Prisma is installed.

[ ] prisma/schema.prisma exists.

[ ] Prisma PostgreSQL datasource is configured.

[ ] lib/prisma.ts exists.

[ ] lib/env.ts exists.

[ ] .env.example exists.

[ ] No secrets are committed.

[ ] Tailwind works.

[ ] shadcn/ui works.

[ ] Lucide icons work.

[ ] Inter font is configured.

[ ] JetBrains Mono is configured.

[ ] Responsive foundation exists.

[ ] README is complete.

[ ] Project structure is clean.

[ ] No business logic was implemented prematurely.

==================================================
30. OUTPUT FORMAT
==================================================

After completing Phase 1, provide a concise implementation report.

Use this format:

# PHASE 1 COMPLETION REPORT

## 1. Summary

## 2. Files Created

## 3. Files Modified

## 4. Dependencies Installed

## 5. Architecture

## 6. Environment Variables

## 7. Commands Verified

## 8. Validation Results

## 9. Known Issues

## 10. Next Phase

Next phase:

PHASE 2 — DATABASE IMPLEMENTATION

Do NOT begin Phase 2 automatically.

WAIT FOR USER APPROVAL.

==================================================
31. FINAL RULE
==================================================

DO NOT over-engineer Phase 1.

DO NOT implement future phases.

DO NOT change the agreed architecture.

DO NOT invent business requirements.

DO NOT redesign Stitch.

DO NOT introduce another backend framework.

DO NOT create fake production functionality.

Build a clean foundation that can safely support the next phases.

STOP after Phase 1 and report the result.