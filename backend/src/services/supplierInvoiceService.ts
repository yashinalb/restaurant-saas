import pool from '../config/database.js';
import { RowDataPacket, ResultSetHeader, PoolConnection } from 'mysql2/promise';

type StockStatus = 'pending' | 'partial' | 'received';
const VALID_STOCK_STATUS: StockStatus[] = ['pending', 'partial', 'received'];

type IntakeStatus = 'complete' | 'partial' | 'pending';
const VALID_INTAKE_STATUS: IntakeStatus[] = ['complete', 'partial', 'pending'];

interface IntakeInput {
  id?: number;
  store_id: number;
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

interface SupplierInvoiceInput {
  tenant_supplier_id: number;
  invoice_number: string;
  invoice_date: string;
  total_amount_before_vat?: number | null;
  total_vat_amount?: number | null;
  total_amount: number;
  currency_id: number;
  stock_status?: StockStatus;
  notes?: string | null;
  received_by?: number | null;
  intakes?: IntakeInput[];
}

async function adjustProductStock(
  conn: PoolConnection,
  tenantId: number,
  productId: number,
  delta: number
): Promise<void> {
  if (delta === 0) return;
  await conn.query(
    'UPDATE tenant_inventory_products SET unit_in_stock = unit_in_stock + ? WHERE id = ? AND tenant_id = ?',
    [delta, productId, tenantId]
  );
}

function resolveIntakeUnits(intake: IntakeInput): number {
  if (intake.is_carton) {
    if (intake.total_units_received != null) return Number(intake.total_units_received);
    if (intake.units_in_carton != null) return Number(intake.quantity_received) * Number(intake.units_in_carton);
  }
  return Number(intake.quantity_received);
}

export class SupplierInvoiceService {
  private static async syncIntakes(
    conn: PoolConnection,
    tenantId: number,
    invoiceId: number,
    defaultSupplierId: number,
    intakes: IntakeInput[] | undefined
  ): Promise<void> {
    if (intakes === undefined) return;

    // Load existing intakes to reverse stock before deleting
    const [existingRows] = await conn.query<RowDataPacket[]>(
      'SELECT id, tenant_inventory_product_id, quantity_received, is_carton, units_in_carton, total_units_received FROM stock_intakes WHERE supplier_invoice_id = ? AND tenant_id = ?',
      [invoiceId, tenantId]
    );
    for (const row of existingRows) {
      const units = resolveIntakeUnits(row as any);
      await adjustProductStock(conn, tenantId, row.tenant_inventory_product_id, -units);
    }
    await conn.query('DELETE FROM stock_intakes WHERE supplier_invoice_id = ? AND tenant_id = ?', [invoiceId, tenantId]);

    // Insert fresh intakes + apply stock
    for (const intake of intakes) {
      if (!intake.store_id || !intake.tenant_inventory_product_id || intake.quantity_received == null || !intake.received_at) {
        throw { status: 400, message: 'Each intake requires store_id, tenant_inventory_product_id, quantity_received, received_at' };
      }

      // Validate store + product belong to tenant
      const [storeCheck] = await conn.query<RowDataPacket[]>(
        'SELECT id FROM stores WHERE id = ? AND tenant_id = ?', [intake.store_id, tenantId]
      );
      if (storeCheck.length === 0) throw { status: 400, message: `Invalid store: ${intake.store_id}` };

      const [productCheck] = await conn.query<RowDataPacket[]>(
        'SELECT id FROM tenant_inventory_products WHERE id = ? AND tenant_id = ?',
        [intake.tenant_inventory_product_id, tenantId]
      );
      if (productCheck.length === 0) throw { status: 400, message: `Invalid product: ${intake.tenant_inventory_product_id}` };

      const status = intake.status ?? 'complete';
      if (!VALID_INTAKE_STATUS.includes(status)) throw { status: 400, message: `Invalid intake status: ${status}` };

      const totalUnits = resolveIntakeUnits(intake);

      await conn.query(
        `INSERT INTO stock_intakes
         (tenant_id, store_id, tenant_supplier_id, supplier_invoice_id, tenant_inventory_product_id,
          quantity_ordered, quantity_received, is_carton, units_in_carton, total_units_received,
          notes, received_by, received_at, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          tenantId,
          intake.store_id,
          defaultSupplierId,
          invoiceId,
          intake.tenant_inventory_product_id,
          intake.quantity_ordered ?? null,
          intake.quantity_received,
          intake.is_carton ? 1 : 0,
          intake.units_in_carton ?? null,
          intake.is_carton ? totalUnits : null,
          intake.notes ?? null,
          intake.received_by ?? null,
          intake.received_at,
          status,
        ]
      );

      await adjustProductStock(conn, tenantId, intake.tenant_inventory_product_id, totalUnits);
    }
  }

  static async getAll(tenantId: number, filters?: {
    tenant_supplier_id?: number;
    stock_status?: StockStatus;
    from_date?: string;
    to_date?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<any[]> {
    let query = `
      SELECT si.*,
        s.name as supplier_name,
        c.code as currency_code, c.symbol as currency_symbol,
        (SELECT COUNT(*) FROM stock_intakes WHERE supplier_invoice_id = si.id) as intake_count
      FROM supplier_invoices si
      LEFT JOIN tenant_suppliers s ON s.id = si.tenant_supplier_id
      LEFT JOIN currencies c ON c.id = si.currency_id
      WHERE si.tenant_id = ?
    `;
    const params: any[] = [tenantId];

    if (filters?.tenant_supplier_id) { query += ' AND si.tenant_supplier_id = ?'; params.push(filters.tenant_supplier_id); }
    if (filters?.stock_status) { query += ' AND si.stock_status = ?'; params.push(filters.stock_status); }
    if (filters?.from_date) { query += ' AND si.invoice_date >= ?'; params.push(filters.from_date); }
    if (filters?.to_date) { query += ' AND si.invoice_date <= ?'; params.push(filters.to_date); }
    if (filters?.search) {
      query += ' AND si.invoice_number LIKE ?';
      params.push(`%${filters.search}%`);
    }

    query += ' ORDER BY si.invoice_date DESC';
    const limit = Math.min(filters?.limit ?? 100, 500);
    const offset = filters?.offset ?? 0;
    query += ` LIMIT ${limit} OFFSET ${offset}`;

    const [rows] = await pool.query<RowDataPacket[]>(query, params);
    return rows;
  }

  static async getById(tenantId: number, id: number): Promise<any | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT si.*,
        s.name as supplier_name,
        c.code as currency_code, c.symbol as currency_symbol
      FROM supplier_invoices si
      LEFT JOIN tenant_suppliers s ON s.id = si.tenant_supplier_id
      LEFT JOIN currencies c ON c.id = si.currency_id
      WHERE si.id = ? AND si.tenant_id = ?`,
      [id, tenantId]
    );
    if (rows.length === 0) return null;
    const invoice = rows[0];
    const [intakes] = await pool.query<RowDataPacket[]>(
      `SELECT si.*, st.name as store_name, p.name as product_name, p.product_code
       FROM stock_intakes si
       LEFT JOIN stores st ON st.id = si.store_id
       LEFT JOIN tenant_inventory_products p ON p.id = si.tenant_inventory_product_id
       WHERE si.supplier_invoice_id = ?
       ORDER BY si.id ASC`,
      [id]
    );
    invoice.intakes = intakes;
    return invoice;
  }

  static async create(tenantId: number, data: SupplierInvoiceInput): Promise<number> {
    if (!data.tenant_supplier_id || !data.invoice_number || !data.invoice_date || !data.currency_id) {
      throw { status: 400, message: 'tenant_supplier_id, invoice_number, invoice_date, and currency_id are required' };
    }
    if (data.total_amount == null) {
      throw { status: 400, message: 'total_amount is required' };
    }
    const status = data.stock_status ?? 'received';
    if (!VALID_STOCK_STATUS.includes(status)) {
      throw { status: 400, message: `Invalid stock_status: ${status}` };
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [supplierCheck] = await conn.query<RowDataPacket[]>(
        'SELECT id FROM tenant_suppliers WHERE id = ? AND tenant_id = ?',
        [data.tenant_supplier_id, tenantId]
      );
      if (supplierCheck.length === 0) throw { status: 400, message: 'Invalid supplier' };

      const [result] = await conn.query<ResultSetHeader>(
        `INSERT INTO supplier_invoices
         (tenant_id, tenant_supplier_id, invoice_number, invoice_date,
          total_amount_before_vat, total_vat_amount, total_amount, currency_id,
          stock_status, notes, received_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          tenantId,
          data.tenant_supplier_id,
          data.invoice_number,
          data.invoice_date,
          data.total_amount_before_vat ?? null,
          data.total_vat_amount ?? null,
          data.total_amount,
          data.currency_id,
          status,
          data.notes ?? null,
          data.received_by ?? null,
        ]
      );
      const invoiceId = result.insertId;

      await this.syncIntakes(conn, tenantId, invoiceId, data.tenant_supplier_id, data.intakes);

      await conn.commit();
      return invoiceId;
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }

  static async update(tenantId: number, id: number, data: Partial<SupplierInvoiceInput>): Promise<boolean> {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [existing] = await conn.query<RowDataPacket[]>(
        'SELECT tenant_supplier_id FROM supplier_invoices WHERE id = ? AND tenant_id = ?',
        [id, tenantId]
      );
      if (existing.length === 0) throw { status: 404, message: 'Invoice not found' };

      const fields: string[] = [];
      const values: any[] = [];
      const set = (col: string, val: any) => { fields.push(`${col} = ?`); values.push(val); };

      if (data.tenant_supplier_id !== undefined) set('tenant_supplier_id', data.tenant_supplier_id);
      if (data.invoice_number !== undefined) set('invoice_number', data.invoice_number);
      if (data.invoice_date !== undefined) set('invoice_date', data.invoice_date);
      if (data.total_amount_before_vat !== undefined) set('total_amount_before_vat', data.total_amount_before_vat ?? null);
      if (data.total_vat_amount !== undefined) set('total_vat_amount', data.total_vat_amount ?? null);
      if (data.total_amount !== undefined) set('total_amount', data.total_amount);
      if (data.currency_id !== undefined) set('currency_id', data.currency_id);
      if (data.stock_status !== undefined) {
        if (!VALID_STOCK_STATUS.includes(data.stock_status)) throw { status: 400, message: `Invalid stock_status: ${data.stock_status}` };
        set('stock_status', data.stock_status);
      }
      if (data.notes !== undefined) set('notes', data.notes ?? null);
      if (data.received_by !== undefined) set('received_by', data.received_by ?? null);

      if (fields.length > 0) {
        values.push(id, tenantId);
        await conn.query(
          `UPDATE supplier_invoices SET ${fields.join(', ')} WHERE id = ? AND tenant_id = ?`, values
        );
      }

      const effectiveSupplierId = data.tenant_supplier_id ?? existing[0].tenant_supplier_id;
      await this.syncIntakes(conn, tenantId, id, effectiveSupplierId, data.intakes);

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

      // Reverse stock for all linked intakes before deleting
      const [intakes] = await conn.query<RowDataPacket[]>(
        'SELECT tenant_inventory_product_id, quantity_received, is_carton, units_in_carton, total_units_received FROM stock_intakes WHERE supplier_invoice_id = ? AND tenant_id = ?',
        [id, tenantId]
      );
      for (const row of intakes) {
        const units = resolveIntakeUnits(row as any);
        await adjustProductStock(conn, tenantId, row.tenant_inventory_product_id, -units);
      }

      const [result] = await conn.query<ResultSetHeader>(
        'DELETE FROM supplier_invoices WHERE id = ? AND tenant_id = ?',
        [id, tenantId]
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

export { resolveIntakeUnits, adjustProductStock };
