import pool from '../config/database.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export class TenantSupplierService {
  static async getAll(tenantId: number, filters?: {
    is_active?: boolean;
    search?: string;
  }): Promise<any[]> {
    let query = `
      SELECT * FROM tenant_suppliers
      WHERE tenant_id = ?
    `;
    const params: any[] = [tenantId];

    if (filters?.is_active !== undefined) {
      query += ' AND is_active = ?';
      params.push(filters.is_active ? 1 : 0);
    }
    if (filters?.search) {
      query += ' AND (name LIKE ? OR contact_person LIKE ? OR email LIKE ? OR phone LIKE ?)';
      const s = `%${filters.search}%`;
      params.push(s, s, s, s);
    }

    query += ' ORDER BY name ASC';

    const [rows] = await pool.query<RowDataPacket[]>(query, params);
    return rows;
  }

  static async getById(tenantId: number, id: number): Promise<any | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM tenant_suppliers WHERE id = ? AND tenant_id = ?',
      [id, tenantId]
    );
    return rows.length > 0 ? rows[0] : null;
  }

  static async create(tenantId: number, data: any): Promise<number> {
    if (!data.name || !String(data.name).trim()) {
      throw { status: 400, message: 'Name is required' };
    }

    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO tenant_suppliers
       (tenant_id, name, contact_person, phone, email, address, tax_id, notes, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        tenantId,
        data.name,
        data.contact_person ?? null,
        data.phone ?? null,
        data.email ?? null,
        data.address ?? null,
        data.tax_id ?? null,
        data.notes ?? null,
        data.is_active ?? true,
      ]
    );
    return result.insertId;
  }

  static async update(tenantId: number, id: number, data: any): Promise<boolean> {
    const [existing] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM tenant_suppliers WHERE id = ? AND tenant_id = ?',
      [id, tenantId]
    );
    if (existing.length === 0) {
      throw { status: 404, message: 'Supplier not found' };
    }

    const fields: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
    if (data.contact_person !== undefined) { fields.push('contact_person = ?'); values.push(data.contact_person ?? null); }
    if (data.phone !== undefined) { fields.push('phone = ?'); values.push(data.phone ?? null); }
    if (data.email !== undefined) { fields.push('email = ?'); values.push(data.email ?? null); }
    if (data.address !== undefined) { fields.push('address = ?'); values.push(data.address ?? null); }
    if (data.tax_id !== undefined) { fields.push('tax_id = ?'); values.push(data.tax_id ?? null); }
    if (data.notes !== undefined) { fields.push('notes = ?'); values.push(data.notes ?? null); }
    if (data.is_active !== undefined) { fields.push('is_active = ?'); values.push(data.is_active ? 1 : 0); }

    if (fields.length > 0) {
      values.push(id, tenantId);
      await pool.query(
        `UPDATE tenant_suppliers SET ${fields.join(', ')} WHERE id = ? AND tenant_id = ?`,
        values
      );
    }
    return true;
  }

  static async delete(tenantId: number, id: number): Promise<boolean> {
    const [result] = await pool.query<ResultSetHeader>(
      'DELETE FROM tenant_suppliers WHERE id = ? AND tenant_id = ?',
      [id, tenantId]
    );
    return result.affectedRows > 0;
  }
}
