import pool from '../config/database.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

const VALID_STATUSES = ['pending', 'confirmed', 'checked_in', 'completed', 'cancelled', 'no_show'];
const VALID_SOURCES = ['phone', 'online', 'walk_in', 'third_party'];

export class ReservationService {
  static async getAll(tenantId: number, filters?: {
    store_id?: number; status?: string; source?: string;
    primary_table_id?: number; tenant_customer_id?: number;
    from_date?: string; to_date?: string;
  }): Promise<any[]> {
    let query = `
      SELECT r.*,
        s.name as store_name,
        t.name as primary_table_name,
        c.name as customer_name_ref,
        c.email as customer_email_ref,
        c.phone as customer_phone_ref
      FROM reservations r
      LEFT JOIN stores s ON s.id = r.store_id
      LEFT JOIN tenant_table_structures t ON t.id = r.primary_table_id
      LEFT JOIN tenant_customers c ON c.id = r.tenant_customer_id
      WHERE r.tenant_id = ?
    `;
    const params: any[] = [tenantId];
    if (filters?.store_id) { query += ' AND r.store_id = ?'; params.push(filters.store_id); }
    if (filters?.status) { query += ' AND r.status = ?'; params.push(filters.status); }
    if (filters?.source) { query += ' AND r.source = ?'; params.push(filters.source); }
    if (filters?.primary_table_id) { query += ' AND r.primary_table_id = ?'; params.push(filters.primary_table_id); }
    if (filters?.tenant_customer_id) { query += ' AND r.tenant_customer_id = ?'; params.push(filters.tenant_customer_id); }
    if (filters?.from_date) { query += ' AND r.reserved_at >= ?'; params.push(filters.from_date); }
    if (filters?.to_date) { query += ' AND r.reserved_at <= ?'; params.push(filters.to_date); }
    query += ' ORDER BY r.reserved_at DESC';

    const [rows] = await pool.query<RowDataPacket[]>(query, params);

    for (const row of rows) {
      const [tables] = await pool.query<RowDataPacket[]>(
        `SELECT rt.tenant_table_structure_id, t.name as table_name
         FROM reservation_tables rt
         LEFT JOIN tenant_table_structures t ON t.id = rt.tenant_table_structure_id
         WHERE rt.reservation_id = ?`, [row.id]
      );
      row.tables = tables;
    }
    return rows;
  }

  static async getById(tenantId: number, id: number): Promise<any | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT r.*, s.name as store_name, t.name as primary_table_name,
        c.name as customer_name_ref, c.email as customer_email_ref, c.phone as customer_phone_ref
       FROM reservations r
       LEFT JOIN stores s ON s.id = r.store_id
       LEFT JOIN tenant_table_structures t ON t.id = r.primary_table_id
       LEFT JOIN tenant_customers c ON c.id = r.tenant_customer_id
       WHERE r.id = ? AND r.tenant_id = ?`, [id, tenantId]
    );
    if (rows.length === 0) return null;
    const [tables] = await pool.query<RowDataPacket[]>(
      `SELECT rt.tenant_table_structure_id, t.name as table_name
       FROM reservation_tables rt
       LEFT JOIN tenant_table_structures t ON t.id = rt.tenant_table_structure_id
       WHERE rt.reservation_id = ?`, [id]
    );
    rows[0].tables = tables;
    return rows[0];
  }

  static async create(tenantId: number, data: {
    store_id: number; primary_table_id: number; tenant_customer_id?: number | null;
    guest_count: number; reserved_at: string; duration_minutes?: number;
    status?: string; customer_name?: string | null; customer_phone?: string | null;
    customer_email?: string | null; notes?: string | null; source?: string;
    table_ids?: number[];
  }): Promise<number> {
    if (data.status && !VALID_STATUSES.includes(data.status)) {
      throw { status: 400, message: 'Invalid status' };
    }
    if (data.source && !VALID_SOURCES.includes(data.source)) {
      throw { status: 400, message: 'Invalid source' };
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [storeCheck] = await connection.query<RowDataPacket[]>(
        'SELECT id FROM stores WHERE id = ? AND tenant_id = ?', [data.store_id, tenantId]
      );
      if (storeCheck.length === 0) throw { status: 400, message: 'Invalid store' };

      const [tableCheck] = await connection.query<RowDataPacket[]>(
        'SELECT id FROM tenant_table_structures WHERE id = ? AND tenant_id = ?',
        [data.primary_table_id, tenantId]
      );
      if (tableCheck.length === 0) throw { status: 400, message: 'Invalid primary table' };

      if (data.tenant_customer_id) {
        const [custCheck] = await connection.query<RowDataPacket[]>(
          'SELECT id FROM tenant_customers WHERE id = ? AND tenant_id = ?',
          [data.tenant_customer_id, tenantId]
        );
        if (custCheck.length === 0) throw { status: 400, message: 'Invalid customer' };
      }

      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO reservations (tenant_id, store_id, primary_table_id, tenant_customer_id,
         guest_count, reserved_at, duration_minutes, status, customer_name, customer_phone,
         customer_email, notes, source)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [tenantId, data.store_id, data.primary_table_id, data.tenant_customer_id || null,
         data.guest_count, data.reserved_at, data.duration_minutes ?? 120,
         data.status || 'pending', data.customer_name || null, data.customer_phone || null,
         data.customer_email || null, data.notes || null, data.source || 'phone']
      );
      const reservationId = result.insertId;

      const tableIds = Array.from(new Set([data.primary_table_id, ...(data.table_ids || [])]));
      for (const tableId of tableIds) {
        const [chk] = await connection.query<RowDataPacket[]>(
          'SELECT id FROM tenant_table_structures WHERE id = ? AND tenant_id = ?', [tableId, tenantId]
        );
        if (chk.length === 0) throw { status: 400, message: `Invalid table id ${tableId}` };
        await connection.query(
          'INSERT IGNORE INTO reservation_tables (reservation_id, tenant_table_structure_id) VALUES (?, ?)',
          [reservationId, tableId]
        );
      }

      await connection.commit();
      return reservationId;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  static async update(tenantId: number, id: number, data: {
    store_id?: number; primary_table_id?: number; tenant_customer_id?: number | null;
    guest_count?: number; reserved_at?: string; duration_minutes?: number;
    status?: string; customer_name?: string | null; customer_phone?: string | null;
    customer_email?: string | null; notes?: string | null; source?: string;
    table_ids?: number[];
  }): Promise<boolean> {
    if (data.status && !VALID_STATUSES.includes(data.status)) {
      throw { status: 400, message: 'Invalid status' };
    }
    if (data.source && !VALID_SOURCES.includes(data.source)) {
      throw { status: 400, message: 'Invalid source' };
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [existing] = await connection.query<RowDataPacket[]>(
        'SELECT id FROM reservations WHERE id = ? AND tenant_id = ?', [id, tenantId]
      );
      if (existing.length === 0) throw { status: 404, message: 'Reservation not found' };

      const fields: string[] = []; const values: any[] = [];
      if (data.store_id !== undefined) { fields.push('store_id = ?'); values.push(data.store_id); }
      if (data.primary_table_id !== undefined) { fields.push('primary_table_id = ?'); values.push(data.primary_table_id); }
      if (data.tenant_customer_id !== undefined) { fields.push('tenant_customer_id = ?'); values.push(data.tenant_customer_id || null); }
      if (data.guest_count !== undefined) { fields.push('guest_count = ?'); values.push(data.guest_count); }
      if (data.reserved_at !== undefined) { fields.push('reserved_at = ?'); values.push(data.reserved_at); }
      if (data.duration_minutes !== undefined) { fields.push('duration_minutes = ?'); values.push(data.duration_minutes); }
      if (data.status !== undefined) { fields.push('status = ?'); values.push(data.status); }
      if (data.customer_name !== undefined) { fields.push('customer_name = ?'); values.push(data.customer_name || null); }
      if (data.customer_phone !== undefined) { fields.push('customer_phone = ?'); values.push(data.customer_phone || null); }
      if (data.customer_email !== undefined) { fields.push('customer_email = ?'); values.push(data.customer_email || null); }
      if (data.notes !== undefined) { fields.push('notes = ?'); values.push(data.notes || null); }
      if (data.source !== undefined) { fields.push('source = ?'); values.push(data.source); }

      if (fields.length > 0) {
        values.push(id, tenantId);
        await connection.query(
          `UPDATE reservations SET ${fields.join(', ')} WHERE id = ? AND tenant_id = ?`, values
        );
      }

      if (data.table_ids !== undefined) {
        await connection.query('DELETE FROM reservation_tables WHERE reservation_id = ?', [id]);
        const [resRow] = await connection.query<RowDataPacket[]>(
          'SELECT primary_table_id FROM reservations WHERE id = ?', [id]
        );
        const primaryId = resRow[0]?.primary_table_id;
        const tableIds = Array.from(new Set([primaryId, ...data.table_ids].filter(Boolean)));
        for (const tableId of tableIds) {
          const [chk] = await connection.query<RowDataPacket[]>(
            'SELECT id FROM tenant_table_structures WHERE id = ? AND tenant_id = ?', [tableId, tenantId]
          );
          if (chk.length === 0) throw { status: 400, message: `Invalid table id ${tableId}` };
          await connection.query(
            'INSERT IGNORE INTO reservation_tables (reservation_id, tenant_table_structure_id) VALUES (?, ?)',
            [id, tableId]
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

  static async delete(tenantId: number, id: number): Promise<boolean> {
    const [result] = await pool.query<ResultSetHeader>(
      'DELETE FROM reservations WHERE id = ? AND tenant_id = ?', [id, tenantId]
    );
    return result.affectedRows > 0;
  }
}
