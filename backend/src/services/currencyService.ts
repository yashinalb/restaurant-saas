import { ResultSetHeader, RowDataPacket } from 'mysql2';
import pool from '../config/database.js';

interface CreateCurrencyData {
  code: string;
  name: string;
  symbol: string;
  exchange_rate?: number;
  is_active?: boolean;
}

interface UpdateCurrencyData {
  code?: string;
  name?: string;
  symbol?: string;
  exchange_rate?: number;
  is_active?: boolean;
}

export class CurrencyService {
  /**
   * Get all currencies
   */
  static async getAllCurrencies() {
    const [currencies] = await pool.query<RowDataPacket[]>(
      `SELECT 
        c.*,
        (SELECT COUNT(*) FROM tenant_currencies WHERE currency_id = c.id) as tenant_count
      FROM currencies c
      ORDER BY c.code ASC`
    );

    return currencies;
  }

  /**
   * Get currency by ID
   */
  static async getCurrencyById(currencyId: number) {
    const [currencies] = await pool.query<RowDataPacket[]>(
      `SELECT 
        c.*,
        (SELECT COUNT(*) FROM tenant_currencies WHERE currency_id = c.id) as tenant_count
      FROM currencies c
      WHERE c.id = ?`,
      [currencyId]
    );

    if (currencies.length === 0) {
      throw new Error('Currency not found');
    }

    return currencies[0];
  }

  /**
   * Create new currency
   */
  static async createCurrency(data: CreateCurrencyData) {
    // Check if code already exists
    const [existing] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM currencies WHERE code = ?',
      [data.code]
    );

    if (existing.length > 0) {
      throw new Error('Currency code already exists');
    }

    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO currencies (code, name, symbol, exchange_rate, is_active)
       VALUES (?, ?, ?, ?, ?)`,
      [
        data.code,
        data.name,
        data.symbol,
        data.exchange_rate || 1.0,
        data.is_active !== undefined ? data.is_active : true,
      ]
    );

    return await this.getCurrencyById(result.insertId);
  }

  /**
   * Update currency
   */
  static async updateCurrency(currencyId: number, data: UpdateCurrencyData) {
    // Check if currency exists
    const [existing] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM currencies WHERE id = ?',
      [currencyId]
    );

    if (existing.length === 0) {
      throw new Error('Currency not found');
    }

    // Check if new code already exists (if changing code)
    if (data.code) {
      const [codeExists] = await pool.query<RowDataPacket[]>(
        'SELECT id FROM currencies WHERE code = ? AND id != ?',
        [data.code, currencyId]
      );

      if (codeExists.length > 0) {
        throw new Error('Currency code already exists');
      }
    }

    const updateFields: string[] = [];
    const updateValues: any[] = [];

    if (data.code !== undefined) {
      updateFields.push('code = ?');
      updateValues.push(data.code);
    }
    if (data.name !== undefined) {
      updateFields.push('name = ?');
      updateValues.push(data.name);
    }
    if (data.symbol !== undefined) {
      updateFields.push('symbol = ?');
      updateValues.push(data.symbol);
    }
    if (data.exchange_rate !== undefined) {
      updateFields.push('exchange_rate = ?');
      updateValues.push(data.exchange_rate);
    }
    if (data.is_active !== undefined) {
      updateFields.push('is_active = ?');
      updateValues.push(data.is_active);
    }

    if (updateFields.length === 0) {
      throw new Error('No fields to update');
    }

    updateValues.push(currencyId);

    await pool.query(
      `UPDATE currencies SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    return await this.getCurrencyById(currencyId);
  }

  /**
   * Delete currency (only if not used by any tenant)
   */
  static async deleteCurrency(currencyId: number) {
    // Check if currency exists
    const [currency] = await pool.query<RowDataPacket[]>(
      `SELECT 
        id,
        (SELECT COUNT(*) FROM tenant_currencies WHERE currency_id = ?) as tenant_count
       FROM currencies 
       WHERE id = ?`,
      [currencyId, currencyId]
    );

    if (currency.length === 0) {
      throw new Error('Currency not found');
    }

    if (currency[0].tenant_count > 0) {
      throw new Error('Cannot delete currency that is used by tenants');
    }

    await pool.query('DELETE FROM currencies WHERE id = ?', [currencyId]);

    return { message: 'Currency deleted successfully' };
  }

  /**
   * Update exchange rates in bulk
   */
  static async updateExchangeRates(rates: { code: string; rate: number }[]) {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      for (const { code, rate } of rates) {
        await connection.query(
          'UPDATE currencies SET exchange_rate = ? WHERE code = ?',
          [rate, code]
        );
      }

      await connection.commit();

      return { message: 'Exchange rates updated successfully' };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
}
