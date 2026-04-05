# Tenant Table Backend CRUD Pattern

Create backend service + controller + routes for a tenant-scoped table.

## Before You Start — Auto-Discovery Steps

When given just a table name (e.g. `tenant_position_types`), do these steps FIRST:

1. **Discover columns** — Search `backend/src/migrations/` for the CREATE TABLE statement for this table. Read it to get all columns, types, and foreign keys.
2. **Detect translations** — Check if a `{table_name}_translations` table exists in the same migration. If yes, use the WITH translations pattern (transactions, GROUP_CONCAT). If no, use simple single-table queries.
3. **Derive all names from the table name:**
   - Table `tenant_position_types` → strip `tenant_` prefix for naming
   - Service class: `TenantPositionTypeService` | File: `tenantPositionTypeService.ts`
   - Controller class: `TenantPositionTypeController` | File: `tenantPositionTypeController.ts`
   - Routes file: `tenantPositionType.routes.ts`
   - URL path: `/position-types` (under `/api/tenant`, so full path is `/api/tenant/position-types`)
   - Permission module: `tenant_position_types`
4. **Detect master link** — If a column like `master_position_type_id` exists, add a JOIN in `getAll()` to the corresponding master table to fetch display names. Also add an `importFromMaster()` method.
5. **Detect FK relationships** — If columns like `tenant_sport_id` exist, add JOIN for display name and filter parameter support. **Also add a tenant-accessible lookup endpoint** (e.g. `GET /api/tenant/sports`) so the frontend page can populate dropdowns without calling `/api/admin/` routes. Tenant users cannot access `/api/admin/` — those require `requireSuperAdmin`.
6. **Read an existing tenant reference** — Read `backend/src/routes/tenantAdminUser.routes.ts` and `backend/src/controllers/tenantAdminUserController.ts` to confirm exact import paths, `TenantAuthRequest` usage, auth middleware names (`loadTenantContext`, `requireTenantPermission`).
7. **Check server.ts** — Read `backend/src/server.ts` to see the exact pattern for tenant route registration (under `/api/tenant`).
8. **Find the permission seeder** — Search `backend/src/seeders/` for where permissions are seeded. Read it to understand the exact INSERT pattern and role-permission assignment pattern. Add new permissions following the same format.
9. **Build all columns into the service** — Every column from the migration should appear in CREATE, UPDATE, and the TypeScript interface. Don't use just `code` and `is_active` — use ALL actual columns from the table.

## Service (`backend/src/services/{entityName}Service.ts`)

Static class pattern. ALL queries filter by `tenant_id`. All methods take `tenantId` as first parameter (injected by controller from `req.tenant.id`).

```typescript
import pool from '../config/database.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export class {EntityName}Service {
  /**
   * Get all for a tenant (with optional filters)
   */
  static async getAll(tenantId: number, filters?: { is_active?: boolean; sport_id?: number }): Promise<any[]> {
    let query = `
      SELECT e.*,
        m.name as master_name
      FROM {table_name} e
      LEFT JOIN master_{related_table} m ON m.id = e.master_{related}_id
      WHERE e.tenant_id = ?
    `;
    const params: any[] = [tenantId];

    if (filters?.is_active !== undefined) {
      query += ' AND e.is_active = ?';
      params.push(filters.is_active);
    }

    query += ' ORDER BY e.created_at DESC';

    const [rows] = await pool.query<RowDataPacket[]>(query, params);
    return rows;
  }

  /**
   * Get by ID (scoped to tenant)
   */
  static async getById(tenantId: number, id: number): Promise<any | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM {table_name} WHERE id = ? AND tenant_id = ?',
      [id, tenantId]
    );
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * Create (scoped to tenant — tenantId comes from middleware, NOT from request body)
   */
  static async create(tenantId: number, data: any): Promise<number> {
    const [existing] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM {table_name} WHERE tenant_id = ? AND code = ?',
      [tenantId, data.code]
    );
    if (existing.length > 0) {
      throw { status: 409, message: 'Already exists for this tenant' };
    }

    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO {table_name} (tenant_id, code, is_active) VALUES (?, ?, ?)',
      [tenantId, data.code, data.is_active ?? true]
    );
    return result.insertId;
  }

  /**
   * Update (scoped to tenant)
   */
  static async update(tenantId: number, id: number, data: any): Promise<boolean> {
    const [existing] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM {table_name} WHERE id = ? AND tenant_id = ?',
      [id, tenantId]
    );
    if (existing.length === 0) {
      throw { status: 404, message: 'Not found' };
    }

    const fields: string[] = [];
    const values: any[] = [];
    if (data.code !== undefined) { fields.push('code = ?'); values.push(data.code); }
    if (data.is_active !== undefined) { fields.push('is_active = ?'); values.push(data.is_active); }

    if (fields.length > 0) {
      values.push(id, tenantId);
      await pool.query(
        `UPDATE {table_name} SET ${fields.join(', ')} WHERE id = ? AND tenant_id = ?`,
        values
      );
    }
    return true;
  }

  /**
   * Delete (scoped to tenant)
   */
  static async delete(tenantId: number, id: number): Promise<boolean> {
    const [result] = await pool.query<ResultSetHeader>(
      'DELETE FROM {table_name} WHERE id = ? AND tenant_id = ?',
      [id, tenantId]
    );
    return result.affectedRows > 0;
  }
}
```

### For tenant tables WITH translations

Use the same transaction + translations pattern as master-backend.md, but add `tenant_id` to all queries. The translations table does NOT need tenant_id — it links via the parent entity's ID which is already tenant-scoped.

## Controller (`backend/src/controllers/{entityName}Controller.ts`)

Uses `TenantAuthRequest` from tenant auth middleware. Gets `tenantId` from `req.tenant.id` (set by `loadTenantContext` middleware). **Never** accept `tenant_id` from request body — always use the middleware-injected value.

```typescript
import { Response } from 'express';
import { TenantAuthRequest } from '../middleware/tenantAuth.js';
import { {EntityName}Service } from '../services/{entityName}Service.js';

export class {EntityName}Controller {
  static async getAll(req: TenantAuthRequest, res: Response) {
    try {
      if (!req.tenant) {
        res.status(400).json({ error: 'Tenant context required' });
        return;
      }

      const tenantId = Number(req.tenant.id);
      const filters = {
        is_active: req.query.is_active !== undefined ? req.query.is_active === 'true' : undefined,
      };
      const items = await {EntityName}Service.getAll(tenantId, filters);
      res.json(items);
    } catch (error: any) {
      console.error('[{EntityName}Controller] getAll error:', error);
      res.status(500).json({ error: 'Failed to fetch' });
    }
  }

  static async getById(req: TenantAuthRequest, res: Response) {
    try {
      if (!req.tenant) {
        res.status(400).json({ error: 'Tenant context required' });
        return;
      }

      const tenantId = Number(req.tenant.id);
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });

      const item = await {EntityName}Service.getById(tenantId, id);
      if (!item) return res.status(404).json({ error: 'Not found' });

      res.json(item);
    } catch (error: any) {
      console.error('[{EntityName}Controller] getById error:', error);
      res.status(500).json({ error: 'Failed to fetch' });
    }
  }

  static async create(req: TenantAuthRequest, res: Response) {
    try {
      if (!req.tenant) {
        res.status(400).json({ error: 'Tenant context required' });
        return;
      }

      const tenantId = Number(req.tenant.id);
      const id = await {EntityName}Service.create(tenantId, req.body);
      const item = await {EntityName}Service.getById(tenantId, id);
      res.status(201).json(item);
    } catch (error: any) {
      if (error.status === 409) return res.status(409).json({ error: error.message });
      console.error('[{EntityName}Controller] create error:', error);
      res.status(500).json({ error: 'Failed to create' });
    }
  }

  static async update(req: TenantAuthRequest, res: Response) {
    try {
      if (!req.tenant) {
        res.status(400).json({ error: 'Tenant context required' });
        return;
      }

      const tenantId = Number(req.tenant.id);
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });

      await {EntityName}Service.update(tenantId, id, req.body);
      const item = await {EntityName}Service.getById(tenantId, id);
      res.json(item);
    } catch (error: any) {
      if (error.status === 404) return res.status(404).json({ error: error.message });
      if (error.status === 409) return res.status(409).json({ error: error.message });
      console.error('[{EntityName}Controller] update error:', error);
      res.status(500).json({ error: 'Failed to update' });
    }
  }

  static async delete(req: TenantAuthRequest, res: Response) {
    try {
      if (!req.tenant) {
        res.status(400).json({ error: 'Tenant context required' });
        return;
      }

      const tenantId = Number(req.tenant.id);
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });

      const deleted = await {EntityName}Service.delete(tenantId, id);
      if (!deleted) return res.status(404).json({ error: 'Not found' });

      res.json({ message: 'Deleted successfully' });
    } catch (error: any) {
      console.error('[{EntityName}Controller] delete error:', error);
      res.status(500).json({ error: 'Failed to delete' });
    }
  }
}
```

## Routes (`backend/src/routes/{entityName}.routes.ts`)

Uses `loadTenantContext` + per-route `requireTenantPermission`. **NOT** `requireSuperAdmin`.

```typescript
import { Router } from 'express';
import { {EntityName}Controller } from '../controllers/{entityName}Controller.js';
import { authenticateToken } from '../middleware/auth.js';
import { loadTenantContext, requireTenantPermission } from '../middleware/tenantAuth.js';

const router = Router();

// All routes require authentication + tenant context
router.use(authenticateToken, loadTenantContext);

router.get('/{url-path}', requireTenantPermission('{module}.view'), {EntityName}Controller.getAll);
router.get('/{url-path}/:id', requireTenantPermission('{module}.view'), {EntityName}Controller.getById);
router.post('/{url-path}', requireTenantPermission('{module}.create'), {EntityName}Controller.create);
router.put('/{url-path}/:id', requireTenantPermission('{module}.edit'), {EntityName}Controller.update);
router.delete('/{url-path}/:id', requireTenantPermission('{module}.delete'), {EntityName}Controller.delete);

export default router;
```

## Route Registration (`backend/src/server.ts`)

Register under `/api/tenant` (NOT `/api/admin`):
```typescript
import {entityName}Routes from './routes/{entityName}.routes.js';
app.use('/api/tenant', {entityName}Routes);
```

**IMPORTANT:** Tenant routes go under `/api/tenant`. Master/super-admin routes go under `/api/admin`. Never mix them.

## Permission Seeding (REQUIRED for every tenant table)

Tenant tables require permissions to be seeded so that `requireTenantPermission` works. Without seeded permissions, no tenant user (including via super admin tenant access) can use the CRUD endpoints. Master tables do NOT need this — super admins bypass all permission checks.

### Where to add permissions

Add to `backend/src/seeders/seed-core.ts` inside the existing `INSERT IGNORE INTO permissions` block. Read the file first to find the exact location.

```sql
-- {Entities} (add inside the existing INSERT IGNORE INTO permissions block)
('{module}.view', 'View {Entities}', 'View {entities} in this tenant', '{module}'),
('{module}.create', 'Create {Entity}', 'Create {entities} in this tenant', '{module}'),
('{module}.edit', 'Edit {Entity}', 'Edit {entities} in this tenant', '{module}'),
('{module}.delete', 'Delete {Entity}', 'Delete {entities} in this tenant', '{module}'),
```

### Role assignments (already automatic)

The seed-core.ts assigns permissions to roles programmatically after the INSERT:
- **tenant_owner**: gets ALL permissions (loop over all `permissions`)
- **tenant_manager**: gets all EXCEPT `settings.edit` (filters out only that one)
- **tenant_viewer**: gets only `*.view` permissions (filters by `.view` in name)

So you do NOT need to manually assign role-permissions — just adding the 4 permission rows is enough. The existing loops will pick them up automatically.

### Running the seeder

```bash
cd backend && npm run seed:core
```

This runs `tsx src/seeders/seed-core.ts`. It uses `INSERT IGNORE` so it's safe to re-run — existing data won't be duplicated.

### Important notes
- Permissions use `INSERT IGNORE` — safe to re-run without duplicates
- The `module` column groups permissions in the UI (e.g. `tenant_teams` groups all team permissions)
- Permission names follow pattern: `{module}.{action}` where action is `view`, `create`, `edit`, `delete`
- After adding permissions, you MUST run the seeder for the CRUD to work — otherwise `requireTenantPermission` will deny all requests

## Master vs Tenant Comparison

| Aspect | Master tables | Tenant tables |
|--------|--------------|---------------|
| Route prefix | `/api/admin` | `/api/tenant` |
| Auth middleware | `authenticateToken` + `requireSuperAdmin` | `authenticateToken` + `loadTenantContext` |
| Per-route auth | None (super admin has all) | `requireTenantPermission('module.action')` |
| Request type | `AuthRequest` | `TenantAuthRequest` |
| Tenant ID source | N/A | `req.tenant.id` (from middleware) |
| Service methods | `getAll()`, `getById(id)` | `getAll(tenantId)`, `getById(tenantId, id)` |

## Import from Master Pattern

When a tenant table has a `master_{entity}_id` FK column, add import-from-master functionality:

### Service methods

**`getAvailableMaster*(tenantId, filters?)`**
- LEFT JOIN `master_{entity}` with `tenant_{entity}` (ON `master_{entity}_id` AND `tenant_id`) to compute `is_imported` flag
- Fetch translations via `master_{entity}_translations` JOIN `languages`
- Return array: `{ id, code, is_imported, translations[] }`

**`importFromMaster(tenantId, data: { tenant_sport_id, master_{entity}_ids[] })`**
- Uses transaction (`pool.getConnection()` + `beginTransaction()`)
- For each master ID:
  - Skip if already imported: `SELECT id FROM tenant_{entity} WHERE tenant_id = ? AND master_{entity}_id = ?`
  - Fetch master record: `SELECT * FROM master_{entity} WHERE id = ?`
  - INSERT into `tenant_{entity}` (tenant_id, tenant_sport_id, master_{entity}_id, code, ...)
  - Copy translations: `SELECT * FROM master_{entity}_translations WHERE master_{entity}_id = ?` → INSERT into `tenant_{entity}_translations`
- Return: `{ message, imported_count, imported_ids }`

### Controller methods

```typescript
static async getAvailableMaster(req: TenantAuthRequest, res: Response): Promise<void> {
  // Call service.getAvailableMaster*(tenantId, filters)
}

static async importFromMaster(req: TenantAuthRequest, res: Response): Promise<void> {
  // Validate: tenant_sport_id required, master_{entity}_ids must be non-empty array
  // Call service.importFromMaster(tenantId, { tenant_sport_id, master_{entity}_ids })
}
```

### Routes (add BEFORE CRUD routes to avoid `:id` conflict)

```typescript
router.get('/{url-path}/master/available', requireTenantPermission('{module}.view'), Controller.getAvailableMaster);
router.post('/{url-path}/import', requireTenantPermission('{module}.create'), Controller.importFromMaster);
```

### Category resolution for Position Types import

When importing position types, resolve tenant category: find `tenant_position_categories` with matching `master_position_category_id` for this tenant, set `tenant_position_category_id` if found.

## Checklist
- [ ] Service file with tenant-scoped queries (all methods take `tenantId`)
- [ ] Controller file using `TenantAuthRequest` and `req.tenant.id`
- [ ] Routes file with `loadTenantContext` + `requireTenantPermission`
- [ ] Register route in `server.ts` under `/api/tenant`
- [ ] Add 4 permissions to `seed-core.ts` (view, create, edit, delete)
- [ ] If master link exists: add `getAvailableMaster*()` + `importFromMaster()` to service/controller/routes
- [ ] Run seeder: `cd backend && npm run seed:core`
- [ ] Build: `cd backend && npm run build`
