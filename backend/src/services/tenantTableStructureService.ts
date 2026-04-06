import pool from '../config/database.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export class TenantTableStructureService {
  static async getAll(tenantId: number, filters?: { is_active?: boolean; store_id?: number; tenant_seating_area_id?: number; status?: string }): Promise<any[]> {
    let query = `SELECT t.*, s.name as store_name, sa.id as seating_area_id,
      p.name as parent_table_name
      FROM tenant_table_structures t
      LEFT JOIN stores s ON s.id = t.store_id
      LEFT JOIN tenant_seating_areas sa ON sa.id = t.tenant_seating_area_id
      LEFT JOIN tenant_table_structures p ON p.id = t.parent_table_id
      WHERE t.tenant_id = ?`;
    const params: any[] = [tenantId];
    if (filters?.is_active !== undefined) { query += ' AND t.is_active = ?'; params.push(filters.is_active); }
    if (filters?.store_id) { query += ' AND t.store_id = ?'; params.push(filters.store_id); }
    if (filters?.tenant_seating_area_id) { query += ' AND t.tenant_seating_area_id = ?'; params.push(filters.tenant_seating_area_id); }
    if (filters?.status) { query += ' AND t.status = ?'; params.push(filters.status); }
    query += ' ORDER BY t.store_id, t.tenant_seating_area_id, t.name ASC';
    const [rows] = await pool.query<RowDataPacket[]>(query, params);

    // Fetch seating area translations for display
    for (const row of rows) {
      if (row.tenant_seating_area_id) {
        const [saTrans] = await pool.query<RowDataPacket[]>(
          `SELECT t.name, l.code as language_code FROM tenant_seating_area_translations t
           JOIN languages l ON t.language_id = l.id WHERE t.tenant_seating_area_id = ?`, [row.tenant_seating_area_id]
        );
        row.seating_area_translations = saTrans;
      }
    }
    return rows;
  }

  static async getById(tenantId: number, id: number): Promise<any | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT t.*, s.name as store_name, p.name as parent_table_name
       FROM tenant_table_structures t
       LEFT JOIN stores s ON s.id = t.store_id
       LEFT JOIN tenant_table_structures p ON p.id = t.parent_table_id
       WHERE t.id = ? AND t.tenant_id = ?`, [id, tenantId]
    );
    if (rows.length === 0) return null;
    if (rows[0].tenant_seating_area_id) {
      const [saTrans] = await pool.query<RowDataPacket[]>(
        `SELECT t.name, l.code as language_code FROM tenant_seating_area_translations t
         JOIN languages l ON t.language_id = l.id WHERE t.tenant_seating_area_id = ?`, [rows[0].tenant_seating_area_id]
      );
      rows[0].seating_area_translations = saTrans;
    }
    return rows[0];
  }

  static async create(tenantId: number, data: {
    store_id: number; tenant_seating_area_id?: number | null; name: string;
    position_x?: number | null; position_y?: number | null; width?: number | null; height?: number | null;
    shape?: string; capacity?: number; min_capacity?: number; status?: string; is_active?: boolean;
  }): Promise<number> {
    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO tenant_table_structures (tenant_id, store_id, tenant_seating_area_id, name,
       position_x, position_y, width, height, shape, capacity, min_capacity, status, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [tenantId, data.store_id, data.tenant_seating_area_id || null, data.name,
       data.position_x ?? null, data.position_y ?? null, data.width ?? null, data.height ?? null,
       data.shape || 'square', data.capacity ?? 2, data.min_capacity ?? 1,
       data.status || 'available', data.is_active !== undefined ? (data.is_active ? 1 : 0) : 1]
    );
    return result.insertId;
  }

  static async update(tenantId: number, id: number, data: {
    store_id?: number; tenant_seating_area_id?: number | null; name?: string;
    position_x?: number | null; position_y?: number | null; width?: number | null; height?: number | null;
    shape?: string; capacity?: number; min_capacity?: number; status?: string; is_active?: boolean;
  }): Promise<boolean> {
    const [existing] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM tenant_table_structures WHERE id = ? AND tenant_id = ?', [id, tenantId]
    );
    if (existing.length === 0) throw { status: 404, message: 'Table not found' };

    const fields: string[] = []; const values: any[] = [];
    if (data.store_id !== undefined) { fields.push('store_id = ?'); values.push(data.store_id); }
    if (data.tenant_seating_area_id !== undefined) { fields.push('tenant_seating_area_id = ?'); values.push(data.tenant_seating_area_id || null); }
    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
    if (data.position_x !== undefined) { fields.push('position_x = ?'); values.push(data.position_x); }
    if (data.position_y !== undefined) { fields.push('position_y = ?'); values.push(data.position_y); }
    if (data.width !== undefined) { fields.push('width = ?'); values.push(data.width); }
    if (data.height !== undefined) { fields.push('height = ?'); values.push(data.height); }
    if (data.shape !== undefined) { fields.push('shape = ?'); values.push(data.shape); }
    if (data.capacity !== undefined) { fields.push('capacity = ?'); values.push(data.capacity); }
    if (data.min_capacity !== undefined) { fields.push('min_capacity = ?'); values.push(data.min_capacity); }
    if (data.status !== undefined) { fields.push('status = ?'); values.push(data.status); }
    if (data.is_active !== undefined) { fields.push('is_active = ?'); values.push(data.is_active ? 1 : 0); }

    if (fields.length > 0) {
      values.push(id, tenantId);
      await pool.query(`UPDATE tenant_table_structures SET ${fields.join(', ')} WHERE id = ? AND tenant_id = ?`, values);
    }
    return true;
  }

  static async delete(tenantId: number, id: number): Promise<boolean> {
    const [result] = await pool.query<ResultSetHeader>(
      'DELETE FROM tenant_table_structures WHERE id = ? AND tenant_id = ?', [id, tenantId]
    );
    return result.affectedRows > 0;
  }
}
