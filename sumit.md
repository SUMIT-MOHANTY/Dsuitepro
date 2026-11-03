# Project Structure Overview

This document provides a complete hierarchical tree structure of the Todo Application codebase.

## Directory Structure

```
.
├── docker/
│   ├── docker-compose.dev.yml
│   ├── docker-compose.yml
│   ├── Dockerfile
│   └── Dockerfile.dev
│
├── layout/
│   ├── auth-layout.tsx
│   ├── dashboard-layout.tsx
│   ├── dashboard-page.tsx
│   ├── forgot-password-form.tsx
│   ├── forgot-password-page.tsx
│   ├── login-form.tsx
│   ├── login-page.tsx
│   ├── register-page.tsx
│   ├── reset-password-page.tsx
│   ├── sidebar.tsx
│   ├── stats-summary.tsx
│   ├── todo-drawer.tsx
│   └── todo-table.tsx
│
├── prisma/
│   └── schema.prisma
│
├── src/
│   ├── lib/
│   │   ├── sse/
│   │   │   └── server.ts
│   │   ├── auth.ts
│   │   └── prisma.ts
│   │
│   ├── server/
│   │   ├── api/
│   │   │   ├── middleware/
│   │   │   │   ├── audit-log.ts
│   │   │   │   └── rate-limit.ts
│   │   │   ├── routers/
│   │   │   │   ├── admin.ts
│   │   │   │   ├── tags.ts
│   │   │   │   ├── todos.ts
│   │   │   │   └── users.ts
│   │   │   └── services/
│   │   │       ├── audit.service.ts
│   │   │       ├── tag.service.ts
│   │   │       ├── todo.service.ts
│   │   │       └── user.service.ts
│   │   ├── sse/
│   │   │   └── server.ts
│   │   └── trpc/
│   │       ├── context.ts
│   │       ├── procedures.ts
│   │       └── router.ts
│   │
│   └── styles/
│       ├── auth-components.css
│       ├── auth-layout.css
│       ├── auth-pages.css
│       ├── auth-variables.css
│       ├── dashboard.css
│       └── tailwind.config.ts
│
├── .agent/
│   └── docs/
│       ├── BRD_FULL.md
│       ├── EXECUTIVE_SUMMARY.md
│       ├── HLD.md
│       ├── LLD.md
│       └── REQUIREMENTS_ANALYSIS.md
│
├── .github/
│   └── workflows/
│       └── cd.yml
│
├── public/
│   └── (static assets)
│
├── Configuration Files
│   ├── package.json
│   ├── tsconfig.json
│   ├── next.config.js
│   ├── tailwind.config.ts
│   ├── .gitignore
│   └── .env.example
│
└── Documentation
    ├── README.md
    └── sumit.md (this file)
```

## Key Directories Explained

### `/docker/`
Contains Docker configuration files for containerized deployment:
- `Dockerfile` - Production Docker image configuration
- `Dockerfile.dev` - Development Docker image configuration
- `docker-compose.yml` - Production orchestration
- `docker-compose.dev.yml` - Development orchestration

### `/layout/`
React components for page layouts and UI:
- Authentication pages (login, register, forgot-password, reset-password)
- Dashboard components (sidebar, stats, todo table, todo drawer)
- Form components for user interactions

### `/prisma/`
Database schema and ORM configuration:
- `schema.prisma` - Prisma schema defining database models

### `/src/`
Main source code directory:
- `lib/` - Shared utilities (auth, database, SSE)
- `server/` - Server-side code (API routers, services, middleware, tRPC)
- `styles/` - CSS and Tailwind configuration

### `/.agent/docs/`
Architecture documentation:
- Business Requirements Document (BRD)
- High-Level Design (HLD)
- Low-Level Design (LLD)
- Requirements Analysis

### `/.github/workflows/`
CI/CD configuration:
- `cd.yml` - Continuous deployment workflow

## Excluded from Tree

The following directories and files are excluded from this structure:
- `node_modules/` - Dependencies
- `.git/` - Git repository data
- `dist/`, `.next/`, `coverage/` - Build artifacts and test coverage
- Generated files and temporary files

---

*Generated for Todo Application - A modern, responsive todo list application with full user authentication*
