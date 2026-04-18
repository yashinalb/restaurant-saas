import pool from '../config/database.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export type TableDisplayStatus = 'available' | 'occupied' | 'reserved' | 'blocked' | 'merged';

export class PosFloorService {
  static async getSeatingAreas(tenantId: number, storeId: number): Promise<any[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT a.*,
        (SELECT COUNT(*) FROM tenant_table_structures t
          WHERE t.tenant_seating_area_id = a.id AND t.is_active = 1) as table_count
       FROM tenant_seating_areas a
       WHERE a.tenant_id = ? AND a.store_id = ? AND a.is_active = 1
       ORDER BY a.sort_order ASC, a.id ASC`,
      [tenantId, storeId]
    );

    for (const row of rows) {
      const [trans] = await pool.query<RowDataPacket[]>(
        `SELECT t.*, l.code as language_code
         FROM tenant_seating_area_translations t
         JOIN languages l ON t.language_id = l.id
         WHERE t.tenant_seating_area_id = ?`,
        [row.id]
      );
      row.translations = trans;
    }
    return rows;
  }

  /**
   * Return all tables for a store with computed display status, open order,
   * and today's upcoming reservations.
   */
  static async getFloor(tenantId: number, storeId: number, seatingAreaId?: number): Promise<any[]> {
    let query = `
      SELECT t.*,
        a.id as area_id
      FROM tenant_table_structures t
      LEFT JOIN tenant_seating_areas a ON a.id = t.tenant_seating_area_id
      WHERE t.tenant_id = ? AND t.store_id = ?
    `;
    const params: any[] = [tenantId, storeId];
    if (seatingAreaId) {
      query += ' AND t.tenant_seating_area_id = ?';
      params.push(seatingAreaId);
    }
    query += ' ORDER BY a.sort_order ASC, t.name ASC';

    const [tables] = await pool.query<RowDataPacket[]>(query, params);
    if (tables.length === 0) return [];

    const tableIds = tables.map(t => Number(t.id));
    const placeholders = tableIds.map(() => '?').join(',');

    // Open orders per table
    const [openOrders] = await pool.query<RowDataPacket[]>(
      `SELECT id, order_number, table_id, total, created_at, tenant_waiter_id
       FROM orders
       WHERE tenant_id = ? AND store_id = ? AND table_id IN (${placeholders}) AND order_status = 'open'`,
      [tenantId, storeId, ...tableIds]
    );
    const openOrderMap: Record<number, any> = {};
    for (const o of openOrders) openOrderMap[Number(o.table_id)] = o;

    // Today's upcoming reservations (not checked_in / completed / cancelled / no_show)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const [reservations] = await pool.query<RowDataPacket[]>(
      `SELECT id, primary_table_id, reserved_at, guest_count, status,
        customer_name, customer_phone, duration_minutes
       FROM reservations
       WHERE tenant_id = ? AND store_id = ?
         AND primary_table_id IN (${placeholders})
         AND reserved_at BETWEEN ? AND ?
         AND status IN ('pending', 'confirmed')
       ORDER BY reserved_at ASC`,
      [
        tenantId, storeId, ...tableIds,
        todayStart.toISOString().slice(0, 19).replace('T', ' '),
        todayEnd.toISOString().slice(0, 19).replace('T', ' ')
      ]
    );
    const reservationMap: Record<number, any[]> = {};
    for (const r of reservations) {
      const tid = Number(r.primary_table_id);
      (reservationMap[tid] ||= []).push(r);
    }

    // Compute display status + attach extras
    for (const t of tables) {
      const openOrder = openOrderMap[Number(t.id)] || null;
      const todaysReservations = reservationMap[Number(t.id)] || [];

      let displayStatus: TableDisplayStatus = 'available';
      if (!t.is_active) displayStatus = 'blocked';
      else if (t.parent_table_id) displayStatus = 'merged';
      else if (openOrder) displayStatus = 'occupied';
      else if (t.status === 'blocked') displayStatus = 'blocked';
      else if (t.status === 'reserved' || todaysReservations.length > 0) displayStatus = 'reserved';

      t.display_status = displayStatus;
      t.open_order = openOrder;
      t.todays_reservations = todaysReservations;
    }

    return tables;
  }

  static async mergeTables(tenantId: number, storeId: number, parentId: number, childIds: number[], mergedBy: number): Promise<void> {
    if (!parentId || !childIds.length) throw { status: 400, message: 'parent and child table IDs are required' };

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [parentRows] = await conn.query<RowDataPacket[]>(
        'SELECT id FROM tenant_table_structures WHERE id = ? AND tenant_id = ? AND store_id = ?',
        [parentId, tenantId, storeId]
      );
      if (parentRows.length === 0) throw { status: 400, message: 'Invalid parent table' };

      const mergedAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
      for (const childId of childIds) {
        if (Number(childId) === Number(parentId)) continue;
        const [childRows] = await conn.query<RowDataPacket[]>(
          'SELECT id FROM tenant_table_structures WHERE id = ? AND tenant_id = ? AND store_id = ?',
          [childId, tenantId, storeId]
        );
        if (childRows.length === 0) throw { status: 400, message: `Invalid child table: ${childId}` };

        await conn.query(
          `UPDATE tenant_table_structures
           SET parent_table_id = ?, is_temporary_merge = 1, merged_at = ?, merged_by = ?
           WHERE id = ?`,
          [parentId, mergedAt, mergedBy, childId]
        );
      }

      await conn.commit();
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }

  static async unmergeTable(tenantId: number, storeId: number, tableId: number): Promise<boolean> {
    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE tenant_table_structures
       SET parent_table_id = NULL, is_temporary_merge = 0, merged_at = NULL, merged_by = NULL
       WHERE id = ? AND tenant_id = ? AND store_id = ?`,
      [tableId, tenantId, storeId]
    );
    return result.affectedRows > 0;
  }
}
