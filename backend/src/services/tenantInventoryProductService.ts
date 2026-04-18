import pool from '../config/database.js';
import { RowDataPacket, ResultSetHeader, PoolConnection } from 'mysql2/promise';

interface SupplierLink {
  tenant_supplier_id: number;
  is_primary?: boolean;
  supplier_sku?: string | null;
}

export class TenantInventoryProductService {
  private static async syncSuppliers(
    conn: PoolConnection,
    productId: number,
    tenantId: number,
    suppliers: SupplierLink[] | undefined
  ): Promise<void> {
    if (suppliers === undefined) return;

    await conn.query(
      'DELETE FROM tenant_inventory_product_suppliers WHERE tenant_inventory_product_id = ?',
      [productId]
    );

    for (const s of suppliers) {
      // Validate supplier belongs to tenant
      const [supplierCheck] = await conn.query<RowDataPacket[]>(
        'SELECT id FROM tenant_suppliers WHERE id = ? AND tenant_id = ?',
        [s.tenant_supplier_id, tenantId]
      );
      if (supplierCheck.length === 0) {
        throw { status: 400, message: `Invalid supplier: ${s.tenant_supplier_id}` };
      }

      await conn.query(
        `INSERT INTO tenant_inventory_product_suppliers
         (tenant_inventory_product_id, tenant_supplier_id, is_primary, supplier_sku)
         VALUES (?, ?, ?, ?)`,
        [productId, s.tenant_supplier_id, s.is_primary ? 1 : 0, s.supplier_sku ?? null]
      );
    }
  }

  private static async loadSuppliers(productId: number): Promise<any[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT ps.*, s.name as supplier_name
       FROM tenant_inventory_product_suppliers ps
       LEFT JOIN tenant_suppliers s ON s.id = ps.tenant_supplier_id
       WHERE ps.tenant_inventory_product_id = ?
       ORDER BY ps.is_primary DESC, s.name ASC`,
      [productId]
    );
    return rows;
  }

  static async getAll(tenantId: number, filters?: {
    is_active?: boolean;
    search?: string;
    low_stock?: boolean;
    supplier_id?: number;
  }): Promise<any[]> {
    let query = `
      SELECT DISTINCT p.*
      FROM tenant_inventory_products p
    `;
    const params: any[] = [];

    if (filters?.supplier_id) {
      query += ` INNER JOIN tenant_inventory_product_suppliers ps
                 ON ps.tenant_inventory_product_id = p.id AND ps.tenant_supplier_id = ?`;
      params.push(filters.supplier_id);
    }

    query += ' WHERE p.tenant_id = ?';
    params.push(tenantId);

    if (filters?.is_active !== undefined) {
      query += ' AND p.is_active = ?';
      params.push(filters.is_active ? 1 : 0);
    }
    if (filters?.search) {
      query += ' AND (p.name LIKE ? OR p.product_code LIKE ?)';
      const s = `%${filters.search}%`;
      params.push(s, s);
    }
    if (filters?.low_stock) {
      query += ' AND p.unit_in_stock <= p.low_stock_threshold';
    }

    query += ' ORDER BY p.name ASC';

    const [rows] = await pool.query<RowDataPacket[]>(query, params);

    // Attach supplier count
    for (const row of rows) {
      const [cnt] = await pool.query<RowDataPacket[]>(
        'SELECT COUNT(*) as supplier_count FROM tenant_inventory_product_suppliers WHERE tenant_inventory_product_id = ?',
        [row.id]
      );
      row.supplier_count = Number(cnt[0]?.supplier_count) || 0;
    }
    return rows;
  }

  static async getById(tenantId: number, id: number): Promise<any | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM tenant_inventory_products WHERE id = ? AND tenant_id = ?',
      [id, tenantId]
    );
    if (rows.length === 0) return null;
    const product = rows[0];
    product.suppliers = await this.loadSuppliers(id);
    return product;
  }

  static async create(tenantId: number, data: any): Promise<number> {
    if (!data.name || !String(data.name).trim()) {
      throw { status: 400, message: 'Name is required' };
    }

    // Check unique product_code within tenant
    if (data.product_code) {
      const [existing] = await pool.query<RowDataPacket[]>(
        'SELECT id FROM tenant_inventory_products WHERE tenant_id = ? AND product_code = ?',
        [tenantId, data.product_code]
      );
      if (existing.length > 0) {
        throw { status: 409, message: 'Product code already exists for this tenant' };
      }
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [result] = await conn.query<ResultSetHeader>(
        `INSERT INTO tenant_inventory_products
         (tenant_id, product_code, name, unit_in_stock, is_weighted, has_carton, units_per_carton,
          buying_price_excl_vat, vat_type, vat_percentage, buying_price_incl_vat,
          low_stock_threshold, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          tenantId,
          data.product_code ?? null,
          data.name,
          data.unit_in_stock ?? 0,
          data.is_weighted ? 1 : 0,
          data.has_carton ? 1 : 0,
          data.units_per_carton ?? null,
          data.buying_price_excl_vat ?? null,
          data.vat_type ?? 'percentage',
          data.vat_percentage ?? 0,
          data.buying_price_incl_vat ?? null,
          data.low_stock_threshold ?? 0,
          data.is_active === false ? 0 : 1,
        ]
      );
      const productId = result.insertId;

      await this.syncSuppliers(conn, productId, tenantId, data.suppliers);

      await conn.commit();
      return productId;
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }

  static async update(tenantId: number, id: number, data: any): Promise<boolean> {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [existing] = await conn.query<RowDataPacket[]>(
        'SELECT id FROM tenant_inventory_products WHERE id = ? AND tenant_id = ?',
        [id, tenantId]
      );
      if (existing.length === 0) {
        throw { status: 404, message: 'Product not found' };
      }

      // Check unique product_code (excluding self)
      if (data.product_code) {
        const [codeCheck] = await conn.query<RowDataPacket[]>(
          'SELECT id FROM tenant_inventory_products WHERE tenant_id = ? AND product_code = ? AND id != ?',
          [tenantId, data.product_code, id]
        );
        if (codeCheck.length > 0) {
          throw { status: 409, message: 'Product code already exists for this tenant' };
        }
      }

      const fields: string[] = [];
      const values: any[] = [];
      const set = (col: string, val: any) => { fields.push(`${col} = ?`); values.push(val); };

      if (data.product_code !== undefined) set('product_code', data.product_code ?? null);
      if (data.name !== undefined) set('name', data.name);
      if (data.unit_in_stock !== undefined) set('unit_in_stock', data.unit_in_stock);
      if (data.is_weighted !== undefined) set('is_weighted', data.is_weighted ? 1 : 0);
      if (data.has_carton !== undefined) set('has_carton', data.has_carton ? 1 : 0);
      if (data.units_per_carton !== undefined) set('units_per_carton', data.units_per_carton ?? null);
      if (data.buying_price_excl_vat !== undefined) set('buying_price_excl_vat', data.buying_price_excl_vat ?? null);
      if (data.vat_type !== undefined) set('vat_type', data.vat_type);
      if (data.vat_percentage !== undefined) set('vat_percentage', data.vat_percentage);
      if (data.buying_price_incl_vat !== undefined) set('buying_price_incl_vat', data.buying_price_incl_vat ?? null);
      if (data.low_stock_threshold !== undefined) set('low_stock_threshold', data.low_stock_threshold);
      if (data.is_active !== undefined) set('is_active', data.is_active ? 1 : 0);

      if (fields.length > 0) {
        values.push(id, tenantId);
        await conn.query(
          `UPDATE tenant_inventory_products SET ${fields.join(', ')} WHERE id = ? AND tenant_id = ?`,
          values
        );
      }

      await this.syncSuppliers(conn, id, tenantId, data.suppliers);

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
    const [result] = await pool.query<ResultSetHeader>(
      'DELETE FROM tenant_inventory_products WHERE id = ? AND tenant_id = ?',
      [id, tenantId]
    );
    return result.affectedRows > 0;
  }
}
