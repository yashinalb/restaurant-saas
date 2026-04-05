import { ResultSetHeader, RowDataPacket } from 'mysql2';
import pool from '../config/database.js';

interface MenuTranslation {
  language_id: number;
  name: string;
}

interface ItemTranslation {
  language_id: number;
  label: string;
  description?: string;
}

interface CreateMenuData {
  tenant_id: number;
  code: string;
  is_active?: boolean;
  translations: MenuTranslation[];
}

interface UpdateMenuData {
  code?: string;
  is_active?: boolean;
  translations?: MenuTranslation[];
}

interface CreateNavigationItemData {
  navigation_menu_id: number;
  parent_id?: number;
  link_type: 'home' | 'campaigns' | 'campaign' | 'category' | 'product' | 'page' | 'url';
  link_campaign_id?: number;
  link_category_id?: number;
  link_product_id?: number;
  link_page_code?: string;
  link_url?: string;
  link_target?: '_self' | '_blank';
  icon?: string;
  css_class?: string;
  badge_text?: string;
  badge_color?: string;
  sort_order?: number;
  is_active?: boolean;
  translations: ItemTranslation[];
}

interface UpdateNavigationItemData {
  parent_id?: number;
  link_type?: 'home' | 'campaigns' | 'campaign' | 'category' | 'product' | 'page' | 'url';
  link_campaign_id?: number;
  link_category_id?: number;
  link_product_id?: number;
  link_page_code?: string;
  link_url?: string;
  link_target?: '_self' | '_blank';
  icon?: string;
  css_class?: string;
  badge_text?: string;
  badge_color?: string;
  sort_order?: number;
  is_active?: boolean;
  translations?: ItemTranslation[];
}

export class NavigationMenuService {
  /**
   * Get all navigation menus for a tenant
   */
  static async getAllMenus(tenantId: number, languageCode?: string) {
    const [menus] = await pool.query<RowDataPacket[]>(
      `SELECT nm.*,
        (SELECT COUNT(*) FROM navigation_items WHERE navigation_menu_id = nm.id) as item_count
       FROM navigation_menus nm
       WHERE nm.tenant_id = ?
       ORDER BY nm.code ASC`,
      [tenantId]
    );

    // Get translations for each menu
    for (const menu of menus) {
      const [translations] = await pool.query<RowDataPacket[]>(
        `SELECT 
          nmt.*,
          l.code as language_code,
          l.name as language_name
        FROM navigation_menu_translations nmt
        JOIN languages l ON nmt.language_id = l.id
        WHERE nmt.navigation_menu_id = ?
        ORDER BY l.sort_order`,
        [menu.id]
      );
      menu.translations = translations;

      // If language code specified, add primary translation
      if (languageCode && translations.length > 0) {
        const primaryTranslation = translations.find(
          (t: any) => t.language_code === languageCode
        );
        if (primaryTranslation) {
          menu.name = primaryTranslation.name;
        } else {
          menu.name = translations[0].name;
        }
      }
    }

    return menus;
  }

  /**
   * Get all navigation menus across all tenants (superadmin only)
   */
  static async getAllMenusForAllTenants(languageCode?: string) {
    const [menus] = await pool.query<RowDataPacket[]>(
      `SELECT nm.*,
        t.name as tenant_name,
        t.slug as tenant_slug,
        (SELECT COUNT(*) FROM navigation_items WHERE navigation_menu_id = nm.id) as item_count
       FROM navigation_menus nm
       JOIN tenants t ON nm.tenant_id = t.id
       ORDER BY t.name ASC, nm.code ASC`
    );

    // Get translations for each menu
    for (const menu of menus) {
      const [translations] = await pool.query<RowDataPacket[]>(
        `SELECT 
          nmt.*,
          l.code as language_code,
          l.name as language_name
        FROM navigation_menu_translations nmt
        JOIN languages l ON nmt.language_id = l.id
        WHERE nmt.navigation_menu_id = ?
        ORDER BY l.sort_order`,
        [menu.id]
      );
      menu.translations = translations;

      // If language code specified, add primary translation
      if (languageCode && translations.length > 0) {
        const primaryTranslation = translations.find(
          (t: any) => t.language_code === languageCode
        );
        if (primaryTranslation) {
          menu.name = primaryTranslation.name;
        } else {
          menu.name = translations[0].name;
        }
      }
    }

    return menus;
  }

  /**
   * Get menu by ID with translations
   */
  static async getMenuById(menuId: number) {
    const [menus] = await pool.query<RowDataPacket[]>(
      `SELECT nm.*,
        (SELECT COUNT(*) FROM navigation_items WHERE navigation_menu_id = nm.id) as item_count
       FROM navigation_menus nm
       WHERE nm.id = ?`,
      [menuId]
    );

    if (menus.length === 0) {
      throw new Error('Navigation menu not found');
    }

    const menu = menus[0];

    // Get translations
    const [translations] = await pool.query<RowDataPacket[]>(
      `SELECT 
        nmt.*,
        l.code as language_code,
        l.name as language_name
      FROM navigation_menu_translations nmt
      JOIN languages l ON nmt.language_id = l.id
      WHERE nmt.navigation_menu_id = ?
      ORDER BY l.sort_order`,
      [menuId]
    );

    menu.translations = translations;

    return menu;
  }

  /**
   * Create new navigation menu with translations
   */
  static async createMenu(data: CreateMenuData) {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // Check if code already exists for this tenant
      const [existing] = await connection.query<RowDataPacket[]>(
        'SELECT id FROM navigation_menus WHERE tenant_id = ? AND code = ?',
        [data.tenant_id, data.code]
      );

      if (existing.length > 0) {
        throw new Error('Navigation menu code already exists for this tenant');
      }

      // Create menu
      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO navigation_menus (tenant_id, code, is_active)
         VALUES (?, ?, ?)`,
        [
          data.tenant_id,
          data.code,
          data.is_active !== undefined ? data.is_active : true,
        ]
      );

      const menuId = result.insertId;

      // Create translations
      if (data.translations && data.translations.length > 0) {
        for (const translation of data.translations) {
          await connection.query(
            `INSERT INTO navigation_menu_translations (navigation_menu_id, language_id, name)
             VALUES (?, ?, ?)`,
            [menuId, translation.language_id, translation.name]
          );
        }
      }

      await connection.commit();

      return await this.getMenuById(menuId);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Update navigation menu
   */
  static async updateMenu(menuId: number, data: UpdateMenuData) {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // Check if menu exists
      const [existing] = await connection.query<RowDataPacket[]>(
        'SELECT id, tenant_id FROM navigation_menus WHERE id = ?',
        [menuId]
      );

      if (existing.length === 0) {
        throw new Error('Navigation menu not found');
      }

      // Check if new code already exists (if changing code)
      if (data.code) {
        const [codeExists] = await connection.query<RowDataPacket[]>(
          'SELECT id FROM navigation_menus WHERE code = ? AND tenant_id = ? AND id != ?',
          [data.code, existing[0].tenant_id, menuId]
        );

        if (codeExists.length > 0) {
          throw new Error('Navigation menu code already exists for this tenant');
        }
      }

      // Update menu fields
      const updateFields: string[] = [];
      const updateValues: any[] = [];

      if (data.code !== undefined) {
        updateFields.push('code = ?');
        updateValues.push(data.code);
      }
      if (data.is_active !== undefined) {
        updateFields.push('is_active = ?');
        updateValues.push(data.is_active);
      }

      if (updateFields.length > 0) {
        updateValues.push(menuId);
        await connection.query(
          `UPDATE navigation_menus SET ${updateFields.join(', ')} WHERE id = ?`,
          updateValues
        );
      }

      // Update translations if provided
      if (data.translations && data.translations.length > 0) {
        // Delete existing translations
        await connection.query('DELETE FROM navigation_menu_translations WHERE navigation_menu_id = ?', [menuId]);

        // Insert new translations
        for (const translation of data.translations) {
          await connection.query(
            `INSERT INTO navigation_menu_translations (navigation_menu_id, language_id, name)
             VALUES (?, ?, ?)`,
            [menuId, translation.language_id, translation.name]
          );
        }
      }

      await connection.commit();

      return await this.getMenuById(menuId);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Delete navigation menu (only if no items)
   */
  static async deleteMenu(menuId: number) {
    // Check if menu exists and get item count
    const [menu] = await pool.query<RowDataPacket[]>(
      `SELECT id,
        (SELECT COUNT(*) FROM navigation_items WHERE navigation_menu_id = ?) as item_count
       FROM navigation_menus
       WHERE id = ?`,
      [menuId, menuId]
    );

    if (menu.length === 0) {
      throw new Error('Navigation menu not found');
    }

    if (menu[0].item_count > 0) {
      throw new Error('Cannot delete menu that has navigation items');
    }

    // Delete menu (translations will cascade)
    await pool.query('DELETE FROM navigation_menus WHERE id = ?', [menuId]);

    return { message: 'Navigation menu deleted successfully' };
  }

  /**
   * Get all navigation items for a menu
   */
  static async getMenuItems(menuId: number, languageCode?: string) {
    // Verify menu exists
    const [menu] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM navigation_menus WHERE id = ?',
      [menuId]
    );

    if (menu.length === 0) {
      throw new Error('Navigation menu not found');
    }

    // Get all items
    const [items] = await pool.query<RowDataPacket[]>(
      `SELECT ni.*
       FROM navigation_items ni
       WHERE ni.navigation_menu_id = ?
       ORDER BY ni.sort_order ASC, ni.id ASC`,
      [menuId]
    );

    // Get translations for each item
    for (const item of items) {
      const [translations] = await pool.query<RowDataPacket[]>(
        `SELECT 
          nit.*,
          l.code as language_code,
          l.name as language_name
        FROM navigation_item_translations nit
        JOIN languages l ON nit.language_id = l.id
        WHERE nit.navigation_item_id = ?
        ORDER BY l.sort_order`,
        [item.id]
      );
      item.translations = translations;

      // If language code specified, add primary translation
      if (languageCode && translations.length > 0) {
        const primaryTranslation = translations.find(
          (t: any) => t.language_code === languageCode
        );
        if (primaryTranslation) {
          item.label = primaryTranslation.label;
          item.description = primaryTranslation.description;
        } else {
          item.label = translations[0].label;
          item.description = translations[0].description;
        }
      }
    }

    return items;
  }

  /**
   * Get navigation item by ID
   */
  static async getItemById(itemId: number) {
    const [items] = await pool.query<RowDataPacket[]>(
      `SELECT ni.*
       FROM navigation_items ni
       WHERE ni.id = ?`,
      [itemId]
    );

    if (items.length === 0) {
      throw new Error('Navigation item not found');
    }

    const item = items[0];

    // Get translations
    const [translations] = await pool.query<RowDataPacket[]>(
      `SELECT 
        nit.*,
        l.code as language_code,
        l.name as language_name
      FROM navigation_item_translations nit
      JOIN languages l ON nit.language_id = l.id
      WHERE nit.navigation_item_id = ?
      ORDER BY l.sort_order`,
      [itemId]
    );

    item.translations = translations;

    return item;
  }

  /**
   * Create navigation item
   */
  static async createItem(data: CreateNavigationItemData) {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // Verify menu exists
      const [menu] = await connection.query<RowDataPacket[]>(
        'SELECT id FROM navigation_menus WHERE id = ?',
        [data.navigation_menu_id]
      );

      if (menu.length === 0) {
        throw new Error('Navigation menu not found');
      }

      // Verify parent exists if specified
      if (data.parent_id) {
        const [parent] = await connection.query<RowDataPacket[]>(
          'SELECT id FROM navigation_items WHERE id = ? AND navigation_menu_id = ?',
          [data.parent_id, data.navigation_menu_id]
        );

        if (parent.length === 0) {
          throw new Error('Parent navigation item not found');
        }
      }

      // Create item
      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO navigation_items (
          navigation_menu_id, parent_id, link_type, link_campaign_id, 
          link_category_id, link_product_id, link_page_code, link_url, 
          link_target, icon, css_class, badge_text, badge_color, 
          sort_order, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          data.navigation_menu_id,
          data.parent_id || null,
          data.link_type,
          data.link_campaign_id || null,
          data.link_category_id || null,
          data.link_product_id || null,
          data.link_page_code || null,
          data.link_url || null,
          data.link_target || '_self',
          data.icon || null,
          data.css_class || null,
          data.badge_text || null,
          data.badge_color || null,
          data.sort_order || 0,
          data.is_active !== undefined ? data.is_active : true,
        ]
      );

      const itemId = result.insertId;

      // Create translations
      if (data.translations && data.translations.length > 0) {
        for (const translation of data.translations) {
          await connection.query(
            `INSERT INTO navigation_item_translations (navigation_item_id, language_id, label, description)
             VALUES (?, ?, ?, ?)`,
            [itemId, translation.language_id, translation.label, translation.description || null]
          );
        }
      }

      await connection.commit();

      return await this.getItemById(itemId);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Update navigation item
   */
  static async updateItem(itemId: number, data: UpdateNavigationItemData) {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // Check if item exists
      const [existing] = await connection.query<RowDataPacket[]>(
        'SELECT id, navigation_menu_id FROM navigation_items WHERE id = ?',
        [itemId]
      );

      if (existing.length === 0) {
        throw new Error('Navigation item not found');
      }

      // Verify parent exists if specified
      if (data.parent_id) {
        // Prevent self-referencing
        if (data.parent_id === itemId) {
          throw new Error('Item cannot be its own parent');
        }

        const [parent] = await connection.query<RowDataPacket[]>(
          'SELECT id FROM navigation_items WHERE id = ? AND navigation_menu_id = ?',
          [data.parent_id, existing[0].navigation_menu_id]
        );

        if (parent.length === 0) {
          throw new Error('Parent navigation item not found');
        }
      }

      // Update item fields
      const updateFields: string[] = [];
      const updateValues: any[] = [];

      if (data.parent_id !== undefined) {
        updateFields.push('parent_id = ?');
        updateValues.push(data.parent_id);
      }
      if (data.link_type !== undefined) {
        updateFields.push('link_type = ?');
        updateValues.push(data.link_type);
      }
      if (data.link_campaign_id !== undefined) {
        updateFields.push('link_campaign_id = ?');
        updateValues.push(data.link_campaign_id);
      }
      if (data.link_category_id !== undefined) {
        updateFields.push('link_category_id = ?');
        updateValues.push(data.link_category_id);
      }
      if (data.link_product_id !== undefined) {
        updateFields.push('link_product_id = ?');
        updateValues.push(data.link_product_id);
      }
      if (data.link_page_code !== undefined) {
        updateFields.push('link_page_code = ?');
        updateValues.push(data.link_page_code);
      }
      if (data.link_url !== undefined) {
        updateFields.push('link_url = ?');
        updateValues.push(data.link_url);
      }
      if (data.link_target !== undefined) {
        updateFields.push('link_target = ?');
        updateValues.push(data.link_target);
      }
      if (data.icon !== undefined) {
        updateFields.push('icon = ?');
        updateValues.push(data.icon);
      }
      if (data.css_class !== undefined) {
        updateFields.push('css_class = ?');
        updateValues.push(data.css_class);
      }
      if (data.badge_text !== undefined) {
        updateFields.push('badge_text = ?');
        updateValues.push(data.badge_text);
      }
      if (data.badge_color !== undefined) {
        updateFields.push('badge_color = ?');
        updateValues.push(data.badge_color);
      }
      if (data.sort_order !== undefined) {
        updateFields.push('sort_order = ?');
        updateValues.push(data.sort_order);
      }
      if (data.is_active !== undefined) {
        updateFields.push('is_active = ?');
        updateValues.push(data.is_active);
      }

      if (updateFields.length > 0) {
        updateValues.push(itemId);
        await connection.query(
          `UPDATE navigation_items SET ${updateFields.join(', ')} WHERE id = ?`,
          updateValues
        );
      }

      // Update translations if provided
      if (data.translations && data.translations.length > 0) {
        // Delete existing translations
        await connection.query('DELETE FROM navigation_item_translations WHERE navigation_item_id = ?', [itemId]);

        // Insert new translations
        for (const translation of data.translations) {
          await connection.query(
            `INSERT INTO navigation_item_translations (navigation_item_id, language_id, label, description)
             VALUES (?, ?, ?, ?)`,
            [itemId, translation.language_id, translation.label, translation.description || null]
          );
        }
      }

      await connection.commit();

      return await this.getItemById(itemId);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Delete navigation item
   */
  static async deleteItem(itemId: number) {
    // Check if item has children
    const [children] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM navigation_items WHERE parent_id = ?',
      [itemId]
    );

    if (children.length > 0) {
      throw new Error('Cannot delete item that has child items');
    }

    // Delete item (translations will cascade)
    const [result] = await pool.query<ResultSetHeader>(
      'DELETE FROM navigation_items WHERE id = ?',
      [itemId]
    );

    if (result.affectedRows === 0) {
      throw new Error('Navigation item not found');
    }

    return { message: 'Navigation item deleted successfully' };
  }

  /**
   * Reorder navigation items
   */
  static async reorderItems(menuId: number, itemOrders: Array<{ id: number; sort_order: number }>) {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // Verify menu exists
      const [menu] = await connection.query<RowDataPacket[]>(
        'SELECT id FROM navigation_menus WHERE id = ?',
        [menuId]
      );

      if (menu.length === 0) {
        throw new Error('Navigation menu not found');
      }

      // Update each item's sort order
      for (const item of itemOrders) {
        await connection.query(
          'UPDATE navigation_items SET sort_order = ? WHERE id = ? AND navigation_menu_id = ?',
          [item.sort_order, item.id, menuId]
        );
      }

      await connection.commit();

      return { message: 'Navigation items reordered successfully' };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
}