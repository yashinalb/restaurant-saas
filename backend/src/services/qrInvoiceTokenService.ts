import pool from '../config/database.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { randomUUID } from 'crypto';

export class QrInvoiceTokenService {
  static async getAll(tenantId: number, filters?: {
    status?: string;
    order_id?: number;
    table_id?: number;
  }): Promise<any[]> {
    let query = `
      SELECT qit.*,
        o.order_number,
        ts.name as table_name
      FROM qr_invoice_tokens qit
      LEFT JOIN orders o ON o.id = qit.order_id
      LEFT JOIN tenant_table_structures ts ON ts.id = qit.table_id
      WHERE qit.tenant_id = ?
    `;
    const params: any[] = [tenantId];

    if (filters?.status) {
      query += ' AND qit.status = ?';
      params.push(filters.status);
    }
    if (filters?.order_id) {
      query += ' AND qit.order_id = ?';
      params.push(filters.order_id);
    }
    if (filters?.table_id) {
      query += ' AND qit.table_id = ?';
      params.push(filters.table_id);
    }

    query += ' ORDER BY qit.created_at DESC';

    const [rows] = await pool.query<RowDataPacket[]>(query, params);
    return rows;
  }

  static async getById(tenantId: number, id: number): Promise<any | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT qit.*,
        o.order_number,
        ts.name as table_name
      FROM qr_invoice_tokens qit
      LEFT JOIN orders o ON o.id = qit.order_id
      LEFT JOIN tenant_table_structures ts ON ts.id = qit.table_id
      WHERE qit.id = ? AND qit.tenant_id = ?`,
      [id, tenantId]
    );
    return rows.length > 0 ? rows[0] : null;
  }

  static async create(tenantId: number, data: any): Promise<number> {
    // Validate FK: order belongs to tenant
    const [orderCheck] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM orders WHERE id = ? AND tenant_id = ?',
      [data.order_id, tenantId]
    );
    if (orderCheck.length === 0) {
      throw { status: 400, message: 'Invalid order' };
    }

    // Validate FK: table belongs to tenant
    const [tableCheck] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM tenant_table_structures WHERE id = ? AND tenant_id = ?',
      [data.table_id, tenantId]
    );
    if (tableCheck.length === 0) {
      throw { status: 400, message: 'Invalid table' };
    }

    const token = data.token || randomUUID();

    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO qr_invoice_tokens
       (tenant_id, order_id, table_id, token, status, expires_at, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        tenantId,
        data.order_id,
        data.table_id,
        token,
        data.status ?? 'active',
        data.expires_at,
        data.metadata ? JSON.stringify(data.metadata) : null,
      ]
    );
    return result.insertId;
  }

  static async update(tenantId: number, id: number, data: any): Promise<boolean> {
    const [existing] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM qr_invoice_tokens WHERE id = ? AND tenant_id = ?',
      [id, tenantId]
    );
    if (existing.length === 0) {
      throw { status: 404, message: 'Not found' };
    }

    const fields: string[] = [];
    const values: any[] = [];

    if (data.order_id !== undefined) { fields.push('order_id = ?'); values.push(data.order_id); }
    if (data.table_id !== undefined) { fields.push('table_id = ?'); values.push(data.table_id); }
    if (data.status !== undefined) { fields.push('status = ?'); values.push(data.status); }
    if (data.expires_at !== undefined) { fields.push('expires_at = ?'); values.push(data.expires_at); }
    if (data.metadata !== undefined) { fields.push('metadata = ?'); values.push(data.metadata ? JSON.stringify(data.metadata) : null); }
    if (data.last_accessed_at !== undefined) { fields.push('last_accessed_at = ?'); values.push(data.last_accessed_at); }

    if (fields.length > 0) {
      values.push(id, tenantId);
      await pool.query(
        `UPDATE qr_invoice_tokens SET ${fields.join(', ')} WHERE id = ? AND tenant_id = ?`,
        values
      );
    }
    return true;
  }

  static async delete(tenantId: number, id: number): Promise<boolean> {
    const [result] = await pool.query<ResultSetHeader>(
      'DELETE FROM qr_invoice_tokens WHERE id = ? AND tenant_id = ?',
      [id, tenantId]
    );
    return result.affectedRows > 0;
  }
}
