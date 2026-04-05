import { Response } from 'express';
import { NavigationMenuService } from '../services/navigationMenuService.js';
import { AuthRequest } from '../middleware/auth.js';

export class NavigationMenuController {
  /**
   * GET /api/admin/navigation-menus
   * Get all navigation menus (optionally filtered by tenant_id)
   */
  static async getAllMenus(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.query.tenant_id ? parseInt(req.query.tenant_id as string) : undefined;
      
      if (tenantId && isNaN(tenantId)) {
        res.status(400).json({ error: 'Invalid tenant ID' });
        return;
      }

      const languageCode = req.query.language as string | undefined;
      
      // If tenant_id provided, get menus for that tenant, otherwise get all
      let menus;
      if (tenantId) {
        menus = await NavigationMenuService.getAllMenus(tenantId, languageCode);
      } else {
        // Get all menus across all tenants (for superadmin overview)
        menus = await NavigationMenuService.getAllMenusForAllTenants(languageCode);
      }
      
      res.json({ data: menus });
    } catch (error: any) {
      console.error('Get navigation menus error:', error);
      res.status(500).json({ error: 'Failed to get navigation menus' });
    }
  }

  /**
   * GET /api/admin/navigation-menus/:id
   * Get menu by ID
   */
  static async getMenuById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const menuId = parseInt(req.params.id);

      if (isNaN(menuId)) {
        res.status(400).json({ error: 'Invalid menu ID' });
        return;
      }

      const menu = await NavigationMenuService.getMenuById(menuId);
      res.json({ data: menu });
    } catch (error: any) {
      console.error('Get navigation menu error:', error);
      if (error.message === 'Navigation menu not found') {
        res.status(404).json({ error: 'Navigation menu not found' });
      } else {
        res.status(500).json({ error: 'Failed to get navigation menu' });
      }
    }
  }

  /**
   * POST /api/admin/navigation-menus
   * Create new navigation menu
   */
  static async createMenu(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { tenant_id, code, is_active, translations } = req.body;

      // Validation
      if (!tenant_id) {
        res.status(400).json({ error: 'tenant_id is required' });
        return;
      }

      if (!code) {
        res.status(400).json({ error: 'code is required' });
        return;
      }

      if (!translations || !Array.isArray(translations) || translations.length === 0) {
        res.status(400).json({ error: 'At least one translation is required' });
        return;
      }

      const menu = await NavigationMenuService.createMenu({
        tenant_id,
        code,
        is_active,
        translations,
      });

      res.status(201).json({
        message: 'Navigation menu created successfully',
        data: menu,
      });
    } catch (error: any) {
      console.error('Create navigation menu error:', error);
      if (error.message === 'Navigation menu code already exists for this tenant') {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to create navigation menu' });
      }
    }
  }

  /**
   * PUT /api/admin/navigation-menus/:id
   * Update navigation menu
   */
  static async updateMenu(req: AuthRequest, res: Response): Promise<void> {
    try {
      const menuId = parseInt(req.params.id);

      if (isNaN(menuId)) {
        res.status(400).json({ error: 'Invalid menu ID' });
        return;
      }

      const { code, is_active, translations } = req.body;

      const menu = await NavigationMenuService.updateMenu(menuId, {
        code,
        is_active,
        translations,
      });

      res.json({
        message: 'Navigation menu updated successfully',
        data: menu,
      });
    } catch (error: any) {
      console.error('Update navigation menu error:', error);
      if (error.message === 'Navigation menu not found') {
        res.status(404).json({ error: 'Navigation menu not found' });
      } else if (error.message === 'Navigation menu code already exists for this tenant') {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to update navigation menu' });
      }
    }
  }

  /**
   * DELETE /api/admin/navigation-menus/:id
   * Delete navigation menu
   */
  static async deleteMenu(req: AuthRequest, res: Response): Promise<void> {
    try {
      const menuId = parseInt(req.params.id);

      if (isNaN(menuId)) {
        res.status(400).json({ error: 'Invalid menu ID' });
        return;
      }

      const result = await NavigationMenuService.deleteMenu(menuId);
      res.json(result);
    } catch (error: any) {
      console.error('Delete navigation menu error:', error);
      if (error.message === 'Navigation menu not found') {
        res.status(404).json({ error: 'Navigation menu not found' });
      } else if (error.message === 'Cannot delete menu that has navigation items') {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to delete navigation menu' });
      }
    }
  }

  /**
   * GET /api/admin/navigation-menus/:id/items
   * Get all items for a menu
   */
  static async getMenuItems(req: AuthRequest, res: Response): Promise<void> {
    try {
      const menuId = parseInt(req.params.id);

      if (isNaN(menuId)) {
        res.status(400).json({ error: 'Invalid menu ID' });
        return;
      }

      const languageCode = req.query.language as string | undefined;
      const items = await NavigationMenuService.getMenuItems(menuId, languageCode);
      res.json({ data: items });
    } catch (error: any) {
      console.error('Get navigation items error:', error);
      if (error.message === 'Navigation menu not found') {
        res.status(404).json({ error: 'Navigation menu not found' });
      } else {
        res.status(500).json({ error: 'Failed to get navigation items' });
      }
    }
  }

  /**
   * GET /api/admin/navigation-items/:id
   * Get navigation item by ID
   */
  static async getItemById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const itemId = parseInt(req.params.id);

      if (isNaN(itemId)) {
        res.status(400).json({ error: 'Invalid item ID' });
        return;
      }

      const item = await NavigationMenuService.getItemById(itemId);
      res.json({ data: item });
    } catch (error: any) {
      console.error('Get navigation item error:', error);
      if (error.message === 'Navigation item not found') {
        res.status(404).json({ error: 'Navigation item not found' });
      } else {
        res.status(500).json({ error: 'Failed to get navigation item' });
      }
    }
  }

  /**
   * POST /api/admin/navigation-menus/:id/items
   * Create navigation item
   */
  static async createItem(req: AuthRequest, res: Response): Promise<void> {
    try {
      const menuId = parseInt(req.params.id);

      if (isNaN(menuId)) {
        res.status(400).json({ error: 'Invalid menu ID' });
        return;
      }

      const {
        parent_id,
        link_type,
        link_campaign_id,
        link_category_id,
        link_product_id,
        link_page_code,
        link_url,
        link_target,
        icon,
        css_class,
        badge_text,
        badge_color,
        sort_order,
        is_active,
        translations,
      } = req.body;

      // Validation
      if (!link_type) {
        res.status(400).json({ error: 'link_type is required' });
        return;
      }

      if (!translations || !Array.isArray(translations) || translations.length === 0) {
        res.status(400).json({ error: 'At least one translation is required' });
        return;
      }

      const item = await NavigationMenuService.createItem({
        navigation_menu_id: menuId,
        parent_id,
        link_type,
        link_campaign_id,
        link_category_id,
        link_product_id,
        link_page_code,
        link_url,
        link_target,
        icon,
        css_class,
        badge_text,
        badge_color,
        sort_order,
        is_active,
        translations,
      });

      res.status(201).json({
        message: 'Navigation item created successfully',
        data: item,
      });
    } catch (error: any) {
      console.error('Create navigation item error:', error);
      if (error.message === 'Navigation menu not found' || error.message === 'Parent navigation item not found') {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to create navigation item' });
      }
    }
  }

  /**
   * PUT /api/admin/navigation-items/:id
   * Update navigation item
   */
  static async updateItem(req: AuthRequest, res: Response): Promise<void> {
    try {
      const itemId = parseInt(req.params.id);

      if (isNaN(itemId)) {
        res.status(400).json({ error: 'Invalid item ID' });
        return;
      }

      const {
        parent_id,
        link_type,
        link_campaign_id,
        link_category_id,
        link_product_id,
        link_page_code,
        link_url,
        link_target,
        icon,
        css_class,
        badge_text,
        badge_color,
        sort_order,
        is_active,
        translations,
      } = req.body;

      const item = await NavigationMenuService.updateItem(itemId, {
        parent_id,
        link_type,
        link_campaign_id,
        link_category_id,
        link_product_id,
        link_page_code,
        link_url,
        link_target,
        icon,
        css_class,
        badge_text,
        badge_color,
        sort_order,
        is_active,
        translations,
      });

      res.json({
        message: 'Navigation item updated successfully',
        data: item,
      });
    } catch (error: any) {
      console.error('Update navigation item error:', error);
      if (error.message === 'Navigation item not found' || error.message === 'Parent navigation item not found') {
        res.status(404).json({ error: error.message });
      } else if (error.message === 'Item cannot be its own parent') {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to update navigation item' });
      }
    }
  }

  /**
   * DELETE /api/admin/navigation-items/:id
   * Delete navigation item
   */
  static async deleteItem(req: AuthRequest, res: Response): Promise<void> {
    try {
      const itemId = parseInt(req.params.id);

      if (isNaN(itemId)) {
        res.status(400).json({ error: 'Invalid item ID' });
        return;
      }

      const result = await NavigationMenuService.deleteItem(itemId);
      res.json(result);
    } catch (error: any) {
      console.error('Delete navigation item error:', error);
      if (error.message === 'Navigation item not found') {
        res.status(404).json({ error: 'Navigation item not found' });
      } else if (error.message === 'Cannot delete item that has child items') {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to delete navigation item' });
      }
    }
  }

  /**
   * PUT /api/admin/navigation-menus/:id/items/reorder
   * Reorder navigation items
   */
  static async reorderItems(req: AuthRequest, res: Response): Promise<void> {
    try {
      const menuId = parseInt(req.params.id);

      if (isNaN(menuId)) {
        res.status(400).json({ error: 'Invalid menu ID' });
        return;
      }

      const { item_orders } = req.body;

      if (!Array.isArray(item_orders)) {
        res.status(400).json({ error: 'item_orders must be an array' });
        return;
      }

      // Validate each item order
      for (const item of item_orders) {
        if (!item.id || typeof item.id !== 'number') {
          res.status(400).json({ error: 'Each item must have a valid id' });
          return;
        }
        if (typeof item.sort_order !== 'number') {
          res.status(400).json({ error: 'sort_order must be a number' });
          return;
        }
      }

      const result = await NavigationMenuService.reorderItems(menuId, item_orders);

      res.json(result);
    } catch (error: any) {
      console.error('Reorder navigation items error:', error);
      if (error.message === 'Navigation menu not found') {
        res.status(404).json({ error: 'Navigation menu not found' });
      } else {
        res.status(500).json({ error: 'Failed to reorder navigation items' });
      }
    }
  }
}