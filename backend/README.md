# Admin SaaS Backend

Multi-tenant admin SaaS platform backend. Centralized architecture with tenant isolation, role-based access control, and subscription management.

## Features

- **Multi-Tenant Architecture**: Single codebase serving multiple tenants
- **Tenant Isolation**: Complete data separation per tenant
- **Role-Based Access Control**: Roles, permissions, and granular access
- **Multi-Language Support**: English, Turkish, Greek, Russian, French, German, Spanish
- **Multi-Currency Support**: EUR, USD, TRY, GBP with exchange rates
- **Subscription Management**: Plans, billing, trial periods
- **Admin System**: Centralized admin panel for managing all tenants
- **Email Verification**: Secure account verification flow
- **IP Change Detection**: Security alerts for suspicious login activity

## Prerequisites

- Node.js 18+ and npm
- MySQL 8.0+

## Installation

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Environment Setup

```bash
cp .env.example .env
```

Update `.env` with your configuration.

### 3. Database Setup

Create the database:

```sql
CREATE DATABASE admin_saas CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Run migrations and seed data:

```bash
# Run all migrations
npm run migrate

# Seed initial data (languages, currencies, plans, admin user)
npm run seed

# Or do both at once
npm run setup-db
```

### 4. Start Development Server

```bash
npm run dev
```

Server will start on http://localhost:3003

## Database Schema

### Core Tables

- **tenant_types**: Industry verticals / tenant categories
- **subscription_plans**: Basic, Professional, Enterprise plans
- **tenants**: Tenant organizations
- **tenant_subscriptions**: Active subscriptions per tenant
- **languages**: Supported languages
- **currencies**: Supported currencies with exchange rates
- **admin_users**: Centralized admin accounts

### Admin & RBAC

- **roles**: Role definitions per tenant
- **permissions**: Permission definitions
- **role_permissions**: Role-permission mappings
- **admin_tenant_access**: Which tenants each admin can manage
- **admin_permissions**: Admin-level permissions
- **admin_refresh_tokens**: JWT refresh token storage
- **user_invitations**: Tenant user invitation system
- **activity_logs**: Audit log for all actions

### Email Verification

- **email_verification_tokens**: Token storage for email verification flow

## Migration Files

```
src/migrations/
├── 001_create_core_tables.ts              # Tenants, subscriptions, languages, currencies, admin_users
├── 002_create_admin_and_analytics.ts      # Roles, permissions, RBAC, activity logs, invitations
└── 003_add_email_verification.ts          # Email verification tokens
```

### Running Migrations

```bash
# Run all pending migrations
npm run migrate

# Rollback last migration
npm run migrate:down
```

## Seeding

The seed script creates:

- 4 Languages (English, Turkish, Greek, Russian)
- 4 Currencies (EUR, USD, TRY, GBP)
- 3 Subscription Plans (Basic, Professional, Enterprise)
- 3 Roles (tenant_owner, tenant_manager, tenant_viewer)
- Default Permissions
- Super Admin User

### Default Credentials

**Super Admin:**
- Email: `admin@admin-saas.com`
- Password: `SuperAdmin123!`

## Available Scripts

```bash
npm run dev          # Start development server with hot reload
npm run build        # Build for production
npm run start        # Start production server
npm run migrate      # Run pending migrations
npm run migrate:down # Rollback last migration
npm run seed         # Seed database with initial data
npm run setup-db     # Run migrations + seed (fresh setup)
npm run lint         # Lint TypeScript code
npm run format       # Format code with Prettier
```

## License

MIT
