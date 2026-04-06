import pool from '../config/database.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export class TenantWaiterService {
  static async getAll(tenantId: number, filters?: { is_active?: boolean; store_id?: number }): Promise<any[]> {
    let query = 'SELECT w.*, s.name as store_name FROM tenant_waiters w LEFT JOIN stores s ON s.id = w.store_id WHERE w.tenant_id = ?';
    const params: any[] = [tenantId];
    if (filters?.is_active !== undefined) { query += ' AND w.is_active = ?'; params.push(filters.is_active); }
    if (filters?.store_id) { query += ' AND (w.store_id = ? OR w.store_id IS NULL)'; params.push(filters.store_id); }
    query += ' ORDER BY w.name ASC';
    const [rows] = await pool.query<RowDataPacket[]>(query, params);
    return rows;
  }

  static async getById(tenantId: number, id: number): Promise<any | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT w.*, s.name as store_name FROM tenant_waiters w LEFT JOIN stores s ON s.id = w.store_id WHERE w.id = ? AND w.tenant_id = ?', [id, tenantId]
    );
    if (rows.length === 0) return null;
    const [sessions] = await pool.query<RowDataPacket[]>(
      `SELECT ws.*, st.name as store_name FROM tenant_waiter_sessions ws
       LEFT JOIN stores st ON st.id = ws.store_id
       WHERE ws.tenant_waiter_id = ? ORDER BY ws.logged_in_at DESC LIMIT 20`, [id]
    );
    return { ...rows[0], sessions };
  }

  static async create(tenantId: number, data: {
    name: string; pin: string; store_id?: number | null; phone_1?: string; phone_2?: string;
    address?: string; image_url?: string; is_active?: boolean;
  }): Promise<number> {
    const [existing] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM tenant_waiters WHERE tenant_id = ? AND pin = ?', [tenantId, data.pin]
    );
    if (existing.length > 0) throw { status: 409, message: 'A waiter with this PIN already exists' };

    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO tenant_waiters (tenant_id, store_id, name, pin, phone_1, phone_2, address, image_url, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [tenantId, data.store_id || null, data.name, data.pin, data.phone_1 || null, data.phone_2 || null,
       data.address || null, data.image_url || null, data.is_active !== undefined ? (data.is_active ? 1 : 0) : 1]
    );
    return result.insertId;
  }

  static async update(tenantId: number, id: number, data: {
    name?: string; pin?: string; store_id?: number | null; phone_1?: string; phone_2?: string;
    address?: string; image_url?: string; is_active?: boolean;
  }): Promise<boolean> {
    const [existing] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM tenant_waiters WHERE id = ? AND tenant_id = ?', [id, tenantId]
    );
    if (existing.length === 0) throw { status: 404, message: 'Waiter not found' };

    if (data.pin) {
      const [dup] = await pool.query<RowDataPacket[]>(
        'SELECT id FROM tenant_waiters WHERE tenant_id = ? AND pin = ? AND id != ?', [tenantId, data.pin, id]
      );
      if (dup.length > 0) throw { status: 409, message: 'A waiter with this PIN already exists' };
    }

    const fields: string[] = []; const values: any[] = [];
    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
    if (data.pin !== undefined) { fields.push('pin = ?'); values.push(data.pin); }
    if (data.store_id !== undefined) { fields.push('store_id = ?'); values.push(data.store_id || null); }
    if (data.phone_1 !== undefined) { fields.push('phone_1 = ?'); values.push(data.phone_1 || null); }
    if (data.phone_2 !== undefined) { fields.push('phone_2 = ?'); values.push(data.phone_2 || null); }
    if (data.address !== undefined) { fields.push('address = ?'); values.push(data.address || null); }
    if (data.image_url !== undefined) { fields.push('image_url = ?'); values.push(data.image_url || null); }
    if (data.is_active !== undefined) { fields.push('is_active = ?'); values.push(data.is_active ? 1 : 0); }

    if (fields.length > 0) {
      values.push(id, tenantId);
      await pool.query(`UPDATE tenant_waiters SET ${fields.join(', ')} WHERE id = ? AND tenant_id = ?`, values);
    }
    return true;
  }

  static async delete(tenantId: number, id: number): Promise<boolean> {
    const [result] = await pool.query<ResultSetHeader>(
      'DELETE FROM tenant_waiters WHERE id = ? AND tenant_id = ?', [id, tenantId]
    );
    return result.affectedRows > 0;
  }
}
