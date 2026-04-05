import { Response } from 'express';
import { CurrencyService } from '../services/currencyService.js';
import { AuthRequest } from '../middleware/auth.js';

export class CurrencyController {
  /**
   * GET /api/admin/currencies
   * Get all currencies
   */
  static async getAllCurrencies(_req: AuthRequest, res: Response): Promise<void> {
    try {
      const currencies = await CurrencyService.getAllCurrencies();
      res.json({ data: currencies });
    } catch (error: any) {
      console.error('Get currencies error:', error);
      res.status(500).json({ error: 'Failed to get currencies' });
    }
  }

  /**
   * GET /api/admin/currencies/:id
   * Get currency by ID
   */
  static async getCurrencyById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const currencyId = parseInt(req.params.id);

      if (isNaN(currencyId)) {
        res.status(400).json({ error: 'Invalid currency ID' });
        return;
      }

      const currency = await CurrencyService.getCurrencyById(currencyId);
      res.json({ data: currency });
    } catch (error: any) {
      console.error('Get currency error:', error);
      if (error.message === 'Currency not found') {
        res.status(404).json({ error: 'Currency not found' });
      } else {
        res.status(500).json({ error: 'Failed to get currency' });
      }
    }
  }

  /**
   * POST /api/admin/currencies
   * Create new currency
   */
  static async createCurrency(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { code, name, symbol, exchange_rate, is_active } = req.body;

      // Validation
      if (!code || !name || !symbol) {
        res.status(400).json({ error: 'code, name, and symbol are required' });
        return;
      }

      const currency = await CurrencyService.createCurrency({
        code,
        name,
        symbol,
        exchange_rate,
        is_active,
      });

      res.status(201).json({
        message: 'Currency created successfully',
        data: currency,
      });
    } catch (error: any) {
      console.error('Create currency error:', error);
      if (error.message === 'Currency code already exists') {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to create currency' });
      }
    }
  }

  /**
   * PUT /api/admin/currencies/:id
   * Update currency
   */
  static async updateCurrency(req: AuthRequest, res: Response): Promise<void> {
    try {
      const currencyId = parseInt(req.params.id);

      if (isNaN(currencyId)) {
        res.status(400).json({ error: 'Invalid currency ID' });
        return;
      }

      const { code, name, symbol, exchange_rate, is_active } = req.body;

      const currency = await CurrencyService.updateCurrency(currencyId, {
        code,
        name,
        symbol,
        exchange_rate,
        is_active,
      });

      res.json({
        message: 'Currency updated successfully',
        data: currency,
      });
    } catch (error: any) {
      console.error('Update currency error:', error);
      if (error.message === 'Currency not found') {
        res.status(404).json({ error: 'Currency not found' });
      } else if (error.message === 'Currency code already exists') {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to update currency' });
      }
    }
  }

  /**
   * DELETE /api/admin/currencies/:id
   * Delete currency
   */
  static async deleteCurrency(req: AuthRequest, res: Response): Promise<void> {
    try {
      const currencyId = parseInt(req.params.id);

      if (isNaN(currencyId)) {
        res.status(400).json({ error: 'Invalid currency ID' });
        return;
      }

      const result = await CurrencyService.deleteCurrency(currencyId);
      res.json(result);
    } catch (error: any) {
      console.error('Delete currency error:', error);
      if (error.message === 'Currency not found') {
        res.status(404).json({ error: 'Currency not found' });
      } else if (error.message === 'Cannot delete currency that is used by tenants') {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to delete currency' });
      }
    }
  }

  /**
   * PUT /api/admin/currencies/exchange-rates
   * Update exchange rates in bulk
   */
  static async updateExchangeRates(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { rates } = req.body;

      if (!Array.isArray(rates) || rates.length === 0) {
        res.status(400).json({ error: 'rates array is required' });
        return;
      }

      const result = await CurrencyService.updateExchangeRates(rates);
      res.json(result);
    } catch (error: any) {
      console.error('Update exchange rates error:', error);
      res.status(500).json({ error: 'Failed to update exchange rates' });
    }
  }
}
