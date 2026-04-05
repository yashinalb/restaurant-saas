import pool from '../config/database.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export interface StoreData {
  name: string;
  slug: string;
  code?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  country_code?: string;
  phone?: string;
  email?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  opening_hours?: any;
  table_count?: number;
  kitchen_printer_ip?: string;
  bar_printer_ip?: string;
  receipt_printer_ip?: string;
  kds_enabled?: boolean;
  kiosk_enabled?: boolean;
  online_ordering_enabled?: boolean;
  qr_ordering_enabled?: boolean;
  default_tax_rate?: number;
  service_charge_rate?: number;
  is_active?: boolean;
}

export class StoreService {
  /**
   * Get all stores for a tenant
   */
  static async getAll(tenantId: number, filters?: { is_active?: boolean }): Promise<any[]> {
    let query = 'SELECT * FROM stores WHERE tenant_id = ?';
    const params: any[] = [tenantId];

    if (filters?.is_active !== undefined) {
      query += ' AND is_active = ?';
      params.push(filters.is_active);
    }

    query += ' ORDER BY name ASC';

    const [rows] = await pool.query<RowDataPacket[]>(query, params);
    return rows;
  }

  /**
   * Get store by ID (scoped to tenant)
   */
  static async getById(tenantId: number, id: number): Promise<any | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM stores WHERE id = ? AND tenant_id = ?',
      [id, tenantId]
    );
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * Create store (scoped to tenant)
   */
  static async create(tenantId: number, data: StoreData): Promise<number> {
    // Check slug uniqueness within tenant
    const [existing] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM stores WHERE tenant_id = ? AND slug = ?',
      [tenantId, data.slug]
    );
    if (existing.length > 0) {
      throw { status: 409, message: 'A store with this slug already exists for this tenant' };
    }

    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO stores (
        tenant_id, name, slug, code, address, city, postal_code, country_code,
        phone, email, latitude, longitude, timezone, opening_hours, table_count,
        kitchen_printer_ip, bar_printer_ip, receipt_printer_ip,
        kds_enabled, kiosk_enabled, online_ordering_enabled, qr_ordering_enabled,
        default_tax_rate, service_charge_rate, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        tenantId,
        data.name,
        data.slug,
        data.code || null,
        data.address || null,
        data.city || null,
        data.postal_code || null,
        data.country_code || null,
        data.phone || null,
        data.email || null,
        data.latitude || null,
        data.longitude || null,
        data.timezone || 'UTC',
        data.opening_hours ? JSON.stringify(data.opening_hours) : null,
        data.table_count ?? 0,
        data.kitchen_printer_ip || null,
        data.bar_printer_ip || null,
        data.receipt_printer_ip || null,
        data.kds_enabled ? 1 : 0,
        data.kiosk_enabled ? 1 : 0,
        data.online_ordering_enabled ? 1 : 0,
        data.qr_ordering_enabled ? 1 : 0,
        data.default_tax_rate ?? 0,
        data.service_charge_rate ?? 0,
        data.is_active !== undefined ? (data.is_active ? 1 : 0) : 1,
      ]
    );
    return result.insertId;
  }

  /**
   * Update store (scoped to tenant)
   */
  static async update(tenantId: number, id: number, data: Partial<StoreData>): Promise<boolean> {
    const [existing] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM stores WHERE id = ? AND tenant_id = ?',
      [id, tenantId]
    );
    if (existing.length === 0) {
      throw { status: 404, message: 'Store not found' };
    }

    // Check slug uniqueness if changing slug
    if (data.slug) {
      const [slugCheck] = await pool.query<RowDataPacket[]>(
        'SELECT id FROM stores WHERE tenant_id = ? AND slug = ? AND id != ?',
        [tenantId, data.slug, id]
      );
      if (slugCheck.length > 0) {
        throw { status: 409, message: 'A store with this slug already exists for this tenant' };
      }
    }

    const fields: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
    if (data.slug !== undefined) { fields.push('slug = ?'); values.push(data.slug); }
    if (data.code !== undefined) { fields.push('code = ?'); values.push(data.code || null); }
    if (data.address !== undefined) { fields.push('address = ?'); values.push(data.address || null); }
    if (data.city !== undefined) { fields.push('city = ?'); values.push(data.city || null); }
    if (data.postal_code !== undefined) { fields.push('postal_code = ?'); values.push(data.postal_code || null); }
    if (data.country_code !== undefined) { fields.push('country_code = ?'); values.push(data.country_code || null); }
    if (data.phone !== undefined) { fields.push('phone = ?'); values.push(data.phone || null); }
    if (data.email !== undefined) { fields.push('email = ?'); values.push(data.email || null); }
    if (data.latitude !== undefined) { fields.push('latitude = ?'); values.push(data.latitude); }
    if (data.longitude !== undefined) { fields.push('longitude = ?'); values.push(data.longitude); }
    if (data.timezone !== undefined) { fields.push('timezone = ?'); values.push(data.timezone); }
    if (data.opening_hours !== undefined) { fields.push('opening_hours = ?'); values.push(JSON.stringify(data.opening_hours)); }
    if (data.table_count !== undefined) { fields.push('table_count = ?'); values.push(data.table_count); }
    if (data.kitchen_printer_ip !== undefined) { fields.push('kitchen_printer_ip = ?'); values.push(data.kitchen_printer_ip || null); }
    if (data.bar_printer_ip !== undefined) { fields.push('bar_printer_ip = ?'); values.push(data.bar_printer_ip || null); }
    if (data.receipt_printer_ip !== undefined) { fields.push('receipt_printer_ip = ?'); values.push(data.receipt_printer_ip || null); }
    if (data.kds_enabled !== undefined) { fields.push('kds_enabled = ?'); values.push(data.kds_enabled ? 1 : 0); }
    if (data.kiosk_enabled !== undefined) { fields.push('kiosk_enabled = ?'); values.push(data.kiosk_enabled ? 1 : 0); }
    if (data.online_ordering_enabled !== undefined) { fields.push('online_ordering_enabled = ?'); values.push(data.online_ordering_enabled ? 1 : 0); }
    if (data.qr_ordering_enabled !== undefined) { fields.push('qr_ordering_enabled = ?'); values.push(data.qr_ordering_enabled ? 1 : 0); }
    if (data.default_tax_rate !== undefined) { fields.push('default_tax_rate = ?'); values.push(data.default_tax_rate); }
    if (data.service_charge_rate !== undefined) { fields.push('service_charge_rate = ?'); values.push(data.service_charge_rate); }
    if (data.is_active !== undefined) { fields.push('is_active = ?'); values.push(data.is_active ? 1 : 0); }

    if (fields.length > 0) {
      values.push(id, tenantId);
      await pool.query(
        `UPDATE stores SET ${fields.join(', ')} WHERE id = ? AND tenant_id = ?`,
        values
      );
    }
    return true;
  }

  /**
   * Delete store (scoped to tenant)
   */
  static async delete(tenantId: number, id: number): Promise<boolean> {
    const [result] = await pool.query<ResultSetHeader>(
      'DELETE FROM stores WHERE id = ? AND tenant_id = ?',
      [id, tenantId]
    );
    return result.affectedRows > 0;
  }
}
