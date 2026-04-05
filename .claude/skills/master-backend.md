# Master Table Backend CRUD Pattern

Create backend service + controller + routes for a master (super-admin) table.

## Before You Start — Auto-Discovery Steps

When given just a table name (e.g. `master_position_types`), do these steps FIRST:

1. **Discover columns** — Search `backend/src/migrations/` for the CREATE TABLE statement for this table. Read it to get all columns, types, and foreign keys.
2. **Detect translations** — Check if a `{table_name}_translations` table exists in the same migration. If yes, use the WITH translations pattern (transactions, GROUP_CONCAT). If no, use simple single-table queries.
3. **Derive all names from the table name:**
   - Table `master_position_types` → strip `master_` prefix for naming
   - Service class: `PositionTypeService` | File: `positionTypeService.ts`
   - Controller class: `PositionTypeController` | File: `positionTypeController.ts`
   - Routes file: `positionType.routes.ts`
   - URL path: `/position-types`
   - i18n key prefix: `positionTypes`
4. **Detect FK relationships** — If columns reference other tables (e.g. `master_sport_type_id`), add JOINs in `getAll()` to fetch display names, and add filter parameters.
5. **Read an existing reference** — Read one existing service file (e.g. `backend/src/services/positionTypeService.ts` or similar) to confirm exact import paths for `pool`, `RowDataPacket`, `ResultSetHeader`, `AuthRequest`, auth middleware names, etc.
6. **Check server.ts** — Read `backend/src/server.ts` to see the exact pattern for route registration (import style, `app.use` path).
7. **Build all columns into the service** — Every column from the migration should appear in CREATE, UPDATE, and the TypeScript interface. Don't use just `code` and `is_active` — use ALL actual columns from the table.

## Service (`backend/src/services/{entityName}Service.ts`)

Static class with raw SQL via mysql2 pool. For tables WITH translations, use transactions.

```typescript
import pool from '../config/database.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export class {EntityName}Service {
  /**
   * Get all with translations (joined)
   */
  static async getAll(): Promise<any[]> {
    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT e.*,
        GROUP_CONCAT(
          JSON_OBJECT('language_code', t.language_code, 'name', t.name, 'description', t.description)
        ) as translations_json
      FROM {table_name} e
      LEFT JOIN {table_name}_translations t ON t.{entity}_id = e.id
      GROUP BY e.id
      ORDER BY e.created_at DESC
    `);

    return rows.map(row => ({
      ...row,
      translations: row.translations_json
        ? JSON.parse(`[${row.translations_json}]`)
        : []
    }));
  }

  /**
   * Get by ID with translations
   */
  static async getById(id: number): Promise<any | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM {table_name} WHERE id = ?',
      [id]
    );
    if (rows.length === 0) return null;

    const [translations] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM {table_name}_translations WHERE {entity}_id = ?',
      [id]
    );

    return { ...rows[0], translations };
  }

  /**
   * Create with translations (transaction)
   */
  static async create(data: {
    code: string;
    is_active?: boolean;
    translations: Array<{ language_code: string; name: string; description?: string }>;
  }): Promise<number> {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Check duplicate code
      const [existing] = await connection.query<RowDataPacket[]>(
        'SELECT id FROM {table_name} WHERE code = ?',
        [data.code]
      );
      if (existing.length > 0) {
        throw { status: 409, message: '{Entity} with this code already exists' };
      }

      const [result] = await connection.query<ResultSetHeader>(
        'INSERT INTO {table_name} (code, is_active) VALUES (?, ?)',
        [data.code, data.is_active ?? true]
      );
      const entityId = result.insertId;

      // Insert translations
      if (data.translations?.length) {
        for (const t of data.translations) {
          await connection.query(
            'INSERT INTO {table_name}_translations ({entity}_id, language_code, name, description) VALUES (?, ?, ?, ?)',
            [entityId, t.language_code, t.name, t.description || null]
          );
        }
      }

      await connection.commit();
      return entityId;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Update with translations (transaction)
   */
  static async update(id: number, data: {
    code?: string;
    is_active?: boolean;
    translations?: Array<{ language_code: string; name: string; description?: string }>;
  }): Promise<boolean> {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Check exists
      const [existing] = await connection.query<RowDataPacket[]>(
        'SELECT id FROM {table_name} WHERE id = ?',
        [id]
      );
      if (existing.length === 0) {
        throw { status: 404, message: '{Entity} not found' };
      }

      // Check duplicate code (exclude self)
      if (data.code) {
        const [dup] = await connection.query<RowDataPacket[]>(
          'SELECT id FROM {table_name} WHERE code = ? AND id != ?',
          [data.code, id]
        );
        if (dup.length > 0) {
          throw { status: 409, message: '{Entity} with this code already exists' };
        }
      }

      // Update main record
      const fields: string[] = [];
      const values: any[] = [];
      if (data.code !== undefined) { fields.push('code = ?'); values.push(data.code); }
      if (data.is_active !== undefined) { fields.push('is_active = ?'); values.push(data.is_active); }

      if (fields.length > 0) {
        values.push(id);
        await connection.query(
          `UPDATE {table_name} SET ${fields.join(', ')} WHERE id = ?`,
          values
        );
      }

      // Replace translations (delete + re-insert)
      if (data.translations) {
        await connection.query(
          'DELETE FROM {table_name}_translations WHERE {entity}_id = ?',
          [id]
        );
        for (const t of data.translations) {
          await connection.query(
            'INSERT INTO {table_name}_translations ({entity}_id, language_code, name, description) VALUES (?, ?, ?, ?)',
            [id, t.language_code, t.name, t.description || null]
          );
        }
      }

      await connection.commit();
      return true;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Delete
   */
  static async delete(id: number): Promise<boolean> {
    const [result] = await pool.query<ResultSetHeader>(
      'DELETE FROM {table_name} WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  }
}
```

## Controller (`backend/src/controllers/{entityName}Controller.ts`)

```typescript
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { {EntityName}Service } from '../services/{entityName}Service.js';

export class {EntityName}Controller {
  static async getAll(req: AuthRequest, res: Response) {
    try {
      const items = await {EntityName}Service.getAll();
      res.json({ data: items });
    } catch (error: any) {
      console.error('[{EntityName}Controller] getAll error:', error);
      res.status(500).json({ message: 'Failed to fetch {entities}' });
    }
  }

  static async getById(req: AuthRequest, res: Response) {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: 'Invalid ID' });

      const item = await {EntityName}Service.getById(id);
      if (!item) return res.status(404).json({ message: '{Entity} not found' });

      res.json({ data: item });
    } catch (error: any) {
      console.error('[{EntityName}Controller] getById error:', error);
      res.status(500).json({ message: 'Failed to fetch {entity}' });
    }
  }

  static async create(req: AuthRequest, res: Response) {
    try {
      const { code, is_active, translations } = req.body;
      if (!code) return res.status(400).json({ message: 'Code is required' });

      const id = await {EntityName}Service.create({ code, is_active, translations });
      const item = await {EntityName}Service.getById(id);
      res.status(201).json({ data: item, message: '{Entity} created successfully' });
    } catch (error: any) {
      if (error.status === 409) return res.status(409).json({ message: error.message });
      console.error('[{EntityName}Controller] create error:', error);
      res.status(500).json({ message: 'Failed to create {entity}' });
    }
  }

  static async update(req: AuthRequest, res: Response) {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: 'Invalid ID' });

      await {EntityName}Service.update(id, req.body);
      const item = await {EntityName}Service.getById(id);
      res.json({ data: item, message: '{Entity} updated successfully' });
    } catch (error: any) {
      if (error.status === 404) return res.status(404).json({ message: error.message });
      if (error.status === 409) return res.status(409).json({ message: error.message });
      console.error('[{EntityName}Controller] update error:', error);
      res.status(500).json({ message: 'Failed to update {entity}' });
    }
  }

  static async delete(req: AuthRequest, res: Response) {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: 'Invalid ID' });

      const deleted = await {EntityName}Service.delete(id);
      if (!deleted) return res.status(404).json({ message: '{Entity} not found' });

      res.json({ message: '{Entity} deleted successfully' });
    } catch (error: any) {
      console.error('[{EntityName}Controller] delete error:', error);
      res.status(500).json({ message: 'Failed to delete {entity}' });
    }
  }
}
```

## Routes (`backend/src/routes/{entityName}.routes.ts`)

```typescript
import { Router } from 'express';
import { {EntityName}Controller } from '../controllers/{entityName}Controller.js';
import { authenticateToken, requireSuperAdmin } from '../middleware/auth.js';

const router = Router();

// All routes require super admin
router.use(authenticateToken, requireSuperAdmin);

router.get('/{url-path}', {EntityName}Controller.getAll);
router.get('/{url-path}/:id', {EntityName}Controller.getById);
router.post('/{url-path}', {EntityName}Controller.create);
router.put('/{url-path}/:id', {EntityName}Controller.update);
router.delete('/{url-path}/:id', {EntityName}Controller.delete);

export default router;
```

## Route Registration (`backend/src/server.ts`)

Add import and mount:
```typescript
import {entityName}Routes from './routes/{entityName}.routes.js';
// ...
app.use('/api/admin', {entityName}Routes);
```

## For tables WITHOUT translations

Remove the translations JOIN from `getAll()`, remove translations from `getById()`, remove transaction + translations INSERT/DELETE from `create()`/`update()`. Use simple single-table queries.

## Permission Seeding — NOT needed for master tables

Master tables use `requireSuperAdmin` which checks `admin_users.is_super_admin` — no permission rows needed. Only tenant tables need permission seeding (see tenant-backend.md).

## Checklist
- [ ] Service file with static class + raw SQL
- [ ] Controller file with try-catch handlers
- [ ] Routes file with `authenticateToken` + `requireSuperAdmin`
- [ ] Register route in `server.ts` under `/api/admin`
- [ ] Build: `cd backend && npm run build`
- [ ] (No permission seeding needed — super admin bypasses all)
