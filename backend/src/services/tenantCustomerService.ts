import pool from '../config/database.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export class TenantCustomerService {
  static async getAll(tenantId: number, filters?: { is_active?: boolean; is_registered?: boolean }): Promise<any[]> {
    let query = 'SELECT * FROM tenant_customers WHERE tenant_id = ?';
    const params: any[] = [tenantId];
    if (filters?.is_active !== undefined) { query += ' AND is_active = ?'; params.push(filters.is_active); }
    if (filters?.is_registered !== undefined) { query += ' AND is_registered = ?'; params.push(filters.is_registered); }
    query += ' ORDER BY created_at DESC';
    const [rows] = await pool.query<RowDataPacket[]>(query, params);
    return rows;
  }

  static async getById(tenantId: number, id: number): Promise<any | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM tenant_customers WHERE id = ? AND tenant_id = ?', [id, tenantId]
    );
    return rows.length > 0 ? rows[0] : null;
  }

  static async create(tenantId: number, data: {
    name: string; email?: string | null; phone?: string | null; password_hash?: string | null;
    is_registered?: boolean; address_line_1?: string; address_line_2?: string;
    city?: string; postal_code?: string; country_code?: string; notes?: string; is_active?: boolean;
  }): Promise<number> {
    if (data.email) {
      const [existing] = await pool.query<RowDataPacket[]>(
        'SELECT id FROM tenant_customers WHERE tenant_id = ? AND email = ?', [tenantId, data.email]
      );
      if (existing.length > 0) throw { status: 409, message: 'A customer with this email already exists' };
    }

    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO tenant_customers (tenant_id, name, email, phone, password_hash, is_registered,
        address_line_1, address_line_2, city, postal_code, country_code, notes, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [tenantId, data.name, data.email || null, data.phone || null, data.password_hash || null,
       data.is_registered ? 1 : 0, data.address_line_1 || null, data.address_line_2 || null,
       data.city || null, data.postal_code || null, data.country_code || null,
       data.notes || null, data.is_active !== undefined ? (data.is_active ? 1 : 0) : 1]
    );
    return result.insertId;
  }

  static async update(tenantId: number, id: number, data: {
    name?: string; email?: string | null; phone?: string | null; password_hash?: string | null;
    is_registered?: boolean; address_line_1?: string; address_line_2?: string;
    city?: string; postal_code?: string; country_code?: string; notes?: string; is_active?: boolean;
  }): Promise<boolean> {
    const [existing] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM tenant_customers WHERE id = ? AND tenant_id = ?', [id, tenantId]
    );
    if (existing.length === 0) throw { status: 404, message: 'Customer not found' };

    if (data.email) {
      const [dup] = await pool.query<RowDataPacket[]>(
        'SELECT id FROM tenant_customers WHERE tenant_id = ? AND email = ? AND id != ?', [tenantId, data.email, id]
      );
      if (dup.length > 0) throw { status: 409, message: 'A customer with this email already exists' };
    }

    const fields: string[] = []; const values: any[] = [];
    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
    if (data.email !== undefined) { fields.push('email = ?'); values.push(data.email || null); }
    if (data.phone !== undefined) { fields.push('phone = ?'); values.push(data.phone || null); }
    if (data.password_hash !== undefined) { fields.push('password_hash = ?'); values.push(data.password_hash || null); }
    if (data.is_registered !== undefined) { fields.push('is_registered = ?'); values.push(data.is_registered ? 1 : 0); }
    if (data.address_line_1 !== undefined) { fields.push('address_line_1 = ?'); values.push(data.address_line_1 || null); }
    if (data.address_line_2 !== undefined) { fields.push('address_line_2 = ?'); values.push(data.address_line_2 || null); }
    if (data.city !== undefined) { fields.push('city = ?'); values.push(data.city || null); }
    if (data.postal_code !== undefined) { fields.push('postal_code = ?'); values.push(data.postal_code || null); }
    if (data.country_code !== undefined) { fields.push('country_code = ?'); values.push(data.country_code || null); }
    if (data.notes !== undefined) { fields.push('notes = ?'); values.push(data.notes || null); }
    if (data.is_active !== undefined) { fields.push('is_active = ?'); values.push(data.is_active ? 1 : 0); }

    if (fields.length > 0) {
      values.push(id, tenantId);
      await pool.query(`UPDATE tenant_customers SET ${fields.join(', ')} WHERE id = ? AND tenant_id = ?`, values);
    }
    return true;
  }

  static async delete(tenantId: number, id: number): Promise<boolean> {
    const [result] = await pool.query<ResultSetHeader>(
      'DELETE FROM tenant_customers WHERE id = ? AND tenant_id = ?', [id, tenantId]
    );
    return result.affectedRows > 0;
  }
}
