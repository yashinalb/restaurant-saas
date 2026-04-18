import pool from '../config/database.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { resolveIntakeUnits, adjustProductStock } from './supplierInvoiceService.js';

type IntakeStatus = 'complete' | 'partial' | 'pending';
const VALID_STATUS: IntakeStatus[] = ['complete', 'partial', 'pending'];

interface StockIntakeInput {
  store_id: number;
  tenant_supplier_id: number;
  supplier_invoice_id?: number | null;
  tenant_inventory_product_id: number;
  quantity_ordered?: number | null;
  quantity_received: number;
  is_carton?: boolean;
  units_in_carton?: number | null;
  total_units_received?: number | null;
  notes?: string | null;
  received_by?: number | null;
  received_at: string;
  status?: IntakeStatus;
}

export class StockIntakeService {
  static async getAll(tenantId: number, filters?: {
    store_id?: number;
    tenant_supplier_id?: number;
    supplier_invoice_id?: number;
    tenant_inventory_product_id?: number;
    status?: IntakeStatus;
    from_date?: string;
    to_date?: string;
    limit?: number;
    offset?: number;
  }): Promise<any[]> {
    let query = `
      SELECT si.*,
        st.name as store_name,
        sup.name as supplier_name,
        p.name as product_name, p.product_code,
        inv.invoice_number
      FROM stock_intakes si
      LEFT JOIN stores st ON st.id = si.store_id
      LEFT JOIN tenant_suppliers sup ON sup.id = si.tenant_supplier_id
      LEFT JOIN tenant_inventory_products p ON p.id = si.tenant_inventory_product_id
      LEFT JOIN supplier_invoices inv ON inv.id = si.supplier_invoice_id
      WHERE si.tenant_id = ?
    `;
    const params: any[] = [tenantId];

    if (filters?.store_id) { query += ' AND si.store_id = ?'; params.push(filters.store_id); }
    if (filters?.tenant_supplier_id) { query += ' AND si.tenant_supplier_id = ?'; params.push(filters.tenant_supplier_id); }
    if (filters?.supplier_invoice_id) { query += ' AND si.supplier_invoice_id = ?'; params.push(filters.supplier_invoice_id); }
    if (filters?.tenant_inventory_product_id) { query += ' AND si.tenant_inventory_product_id = ?'; params.push(filters.tenant_inventory_product_id); }
    if (filters?.status) { query += ' AND si.status = ?'; params.push(filters.status); }
    if (filters?.from_date) { query += ' AND si.received_at >= ?'; params.push(filters.from_date); }
    if (filters?.to_date) { query += ' AND si.received_at <= ?'; params.push(filters.to_date); }

    query += ' ORDER BY si.received_at DESC';
    const limit = Math.min(filters?.limit ?? 100, 500);
    const offset = filters?.offset ?? 0;
    query += ` LIMIT ${limit} OFFSET ${offset}`;

    const [rows] = await pool.query<RowDataPacket[]>(query, params);
    return rows;
  }

  static async getById(tenantId: number, id: number): Promise<any | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT si.*,
        st.name as store_name,
        sup.name as supplier_name,
        p.name as product_name, p.product_code,
        inv.invoice_number
      FROM stock_intakes si
      LEFT JOIN stores st ON st.id = si.store_id
      LEFT JOIN tenant_suppliers sup ON sup.id = si.tenant_supplier_id
      LEFT JOIN tenant_inventory_products p ON p.id = si.tenant_inventory_product_id
      LEFT JOIN supplier_invoices inv ON inv.id = si.supplier_invoice_id
      WHERE si.id = ? AND si.tenant_id = ?`,
      [id, tenantId]
    );
    return rows.length > 0 ? rows[0] : null;
  }

  static async create(tenantId: number, data: StockIntakeInput): Promise<number> {
    if (!data.store_id || !data.tenant_supplier_id || !data.tenant_inventory_product_id) {
      throw { status: 400, message: 'store_id, tenant_supplier_id, and tenant_inventory_product_id are required' };
    }
    if (data.quantity_received == null || !data.received_at) {
      throw { status: 400, message: 'quantity_received and received_at are required' };
    }
    const status = data.status ?? 'complete';
    if (!VALID_STATUS.includes(status)) throw { status: 400, message: `Invalid status: ${status}` };

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // Validate FKs belong to tenant
      const [storeCheck] = await conn.query<RowDataPacket[]>(
        'SELECT id FROM stores WHERE id = ? AND tenant_id = ?', [data.store_id, tenantId]
      );
      if (storeCheck.length === 0) throw { status: 400, message: 'Invalid store' };

      const [supplierCheck] = await conn.query<RowDataPacket[]>(
        'SELECT id FROM tenant_suppliers WHERE id = ? AND tenant_id = ?', [data.tenant_supplier_id, tenantId]
      );
      if (supplierCheck.length === 0) throw { status: 400, message: 'Invalid supplier' };

      const [productCheck] = await conn.query<RowDataPacket[]>(
        'SELECT id FROM tenant_inventory_products WHERE id = ? AND tenant_id = ?', [data.tenant_inventory_product_id, tenantId]
      );
      if (productCheck.length === 0) throw { status: 400, message: 'Invalid product' };

      if (data.supplier_invoice_id) {
        const [invoiceCheck] = await conn.query<RowDataPacket[]>(
          'SELECT id FROM supplier_invoices WHERE id = ? AND tenant_id = ?', [data.supplier_invoice_id, tenantId]
        );
        if (invoiceCheck.length === 0) throw { status: 400, message: 'Invalid supplier invoice' };
      }

      const totalUnits = resolveIntakeUnits(data);

      const [result] = await conn.query<ResultSetHeader>(
        `INSERT INTO stock_intakes
         (tenant_id, store_id, tenant_supplier_id, supplier_invoice_id, tenant_inventory_product_id,
          quantity_ordered, quantity_received, is_carton, units_in_carton, total_units_received,
          notes, received_by, received_at, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          tenantId,
          data.store_id,
          data.tenant_supplier_id,
          data.supplier_invoice_id ?? null,
          data.tenant_inventory_product_id,
          data.quantity_ordered ?? null,
          data.quantity_received,
          data.is_carton ? 1 : 0,
          data.units_in_carton ?? null,
          data.is_carton ? totalUnits : null,
          data.notes ?? null,
          data.received_by ?? null,
          data.received_at,
          status,
        ]
      );

      await adjustProductStock(conn, tenantId, data.tenant_inventory_product_id, totalUnits);

      await conn.commit();
      return result.insertId;
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }

  static async update(tenantId: number, id: number, data: Partial<StockIntakeInput>): Promise<boolean> {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [existingRows] = await conn.query<RowDataPacket[]>(
        'SELECT * FROM stock_intakes WHERE id = ? AND tenant_id = ?', [id, tenantId]
      );
      if (existingRows.length === 0) throw { status: 404, message: 'Stock intake not found' };
      const existing = existingRows[0];

      const oldUnits = resolveIntakeUnits(existing as any);

      const fields: string[] = [];
      const values: any[] = [];
      const set = (col: string, val: any) => { fields.push(`${col} = ?`); values.push(val); };

      if (data.store_id !== undefined) set('store_id', data.store_id);
      if (data.tenant_supplier_id !== undefined) set('tenant_supplier_id', data.tenant_supplier_id);
      if (data.supplier_invoice_id !== undefined) set('supplier_invoice_id', data.supplier_invoice_id ?? null);
      if (data.tenant_inventory_product_id !== undefined) set('tenant_inventory_product_id', data.tenant_inventory_product_id);
      if (data.quantity_ordered !== undefined) set('quantity_ordered', data.quantity_ordered ?? null);
      if (data.quantity_received !== undefined) set('quantity_received', data.quantity_received);
      if (data.is_carton !== undefined) set('is_carton', data.is_carton ? 1 : 0);
      if (data.units_in_carton !== undefined) set('units_in_carton', data.units_in_carton ?? null);
      if (data.notes !== undefined) set('notes', data.notes ?? null);
      if (data.received_by !== undefined) set('received_by', data.received_by ?? null);
      if (data.received_at !== undefined) set('received_at', data.received_at);
      if (data.status !== undefined) {
        if (!VALID_STATUS.includes(data.status)) throw { status: 400, message: `Invalid status: ${data.status}` };
        set('status', data.status);
      }

      // Recompute total_units_received if relevant fields changed
      const mergedIntake = {
        is_carton: data.is_carton ?? !!(existing as any).is_carton,
        units_in_carton: data.units_in_carton ?? (existing as any).units_in_carton,
        total_units_received: data.total_units_received ?? null,
        quantity_received: data.quantity_received ?? (existing as any).quantity_received,
      } as any;
      const newUnits = resolveIntakeUnits(mergedIntake);
      set('total_units_received', mergedIntake.is_carton ? newUnits : null);

      if (fields.length > 0) {
        values.push(id, tenantId);
        await conn.query(
          `UPDATE stock_intakes SET ${fields.join(', ')} WHERE id = ? AND tenant_id = ?`, values
        );
      }

      // Adjust stock: reverse old product, apply new product
      const oldProductId = Number(existing.tenant_inventory_product_id);
      const newProductId = data.tenant_inventory_product_id ?? oldProductId;

      if (oldProductId === newProductId) {
        await adjustProductStock(conn, tenantId, newProductId, newUnits - oldUnits);
      } else {
        await adjustProductStock(conn, tenantId, oldProductId, -oldUnits);
        await adjustProductStock(conn, tenantId, newProductId, newUnits);
      }

      await conn.commit();
      return true;
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }

  static async delete(tenantId: number, id: number): Promise<boolean> {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [existingRows] = await conn.query<RowDataPacket[]>(
        'SELECT tenant_inventory_product_id, quantity_received, is_carton, units_in_carton, total_units_received FROM stock_intakes WHERE id = ? AND tenant_id = ?',
        [id, tenantId]
      );
      if (existingRows.length === 0) {
        await conn.commit();
        return false;
      }

      const units = resolveIntakeUnits(existingRows[0] as any);
      await adjustProductStock(conn, tenantId, Number(existingRows[0].tenant_inventory_product_id), -units);

      const [result] = await conn.query<ResultSetHeader>(
        'DELETE FROM stock_intakes WHERE id = ? AND tenant_id = ?', [id, tenantId]
      );

      await conn.commit();
      return result.affectedRows > 0;
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }
}
