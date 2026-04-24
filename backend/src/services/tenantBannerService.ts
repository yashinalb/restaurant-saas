import { ResultSetHeader, RowDataPacket } from 'mysql2';
import pool from '../config/database.js';

interface BannerTranslation {
  language_id: number;
  title?: string;
  subtitle?: string;
  description?: string;
  cta_text?: string;
  alt_text?: string;
}

interface CreateBannerData {
  banner_type?: string;
  image_url?: string;
  mobile_image_url?: string;
  background_color?: string;
  text_color?: string;
  text_position?: string;
  text_alignment?: string;
  text_position_mobile?: string | null;
  text_alignment_mobile?: string | null;
  text_style?: Record<string, number> | null;
  link_type?: string;
  link_menu_item_id?: number | null;
  link_menu_category_id?: number | null;
  link_page_code?: string;
  link_url?: string;
  link_target?: string;
  show_cta?: boolean | string;
  cta_style?: string;
  valid_from?: string | null;
  valid_to?: string | null;
  show_on_mobile?: boolean | string;
  show_on_desktop?: boolean | string;
  is_dismissible?: boolean | string;
  is_active?: boolean | string;
  sort_order?: number;
  translations?: BannerTranslation[];
}

export class TenantBannerService {
  private static parseBool(v: any, def: boolean = false): number {
    if (v === 'true' || v === true || v === 1) return 1;
    if (v === 'false' || v === false || v === 0) return 0;
    return def ? 1 : 0;
  }

  static async getAll(tenantId: number, filters?: { is_active?: boolean; banner_type?: string }) {
    let query = `SELECT tb.* FROM tenant_banners tb WHERE tb.tenant_id = ?`;
    const params: any[] = [tenantId];

    if (filters?.is_active !== undefined) {
      query += ' AND tb.is_active = ?';
      params.push(filters.is_active ? 1 : 0);
    }
    if (filters?.banner_type) {
      query += ' AND tb.banner_type = ?';
      params.push(filters.banner_type);
    }
    query += ' ORDER BY tb.sort_order ASC, tb.id DESC';

    const [banners] = await pool.query<RowDataPacket[]>(query, params);

    for (const banner of banners) {
      const [translations] = await pool.query<RowDataPacket[]>(
        `SELECT tbt.*, l.code as language_code, l.name as language_name
         FROM tenant_banner_translations tbt
         JOIN languages l ON tbt.language_id = l.id
         WHERE tbt.banner_id = ?`,
        [banner.id]
      );
      banner.translations = translations;
      banner.show_cta = !!banner.show_cta;
      banner.show_on_mobile = !!banner.show_on_mobile;
      banner.show_on_desktop = !!banner.show_on_desktop;
      banner.is_dismissible = !!banner.is_dismissible;
      banner.is_active = !!banner.is_active;
      if (typeof banner.text_style === 'string') {
        try { banner.text_style = JSON.parse(banner.text_style); } catch { banner.text_style = null; }
      }
    }

    return banners;
  }

  static async getById(tenantId: number, bannerId: number) {
    const [banners] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM tenant_banners WHERE id = ? AND tenant_id = ?',
      [bannerId, tenantId]
    );
    if (banners.length === 0) throw new Error('Banner not found');

    const banner = banners[0];
    const [translations] = await pool.query<RowDataPacket[]>(
      `SELECT tbt.*, l.code as language_code, l.name as language_name
       FROM tenant_banner_translations tbt
       JOIN languages l ON tbt.language_id = l.id
       WHERE tbt.banner_id = ?`,
      [banner.id]
    );
    banner.translations = translations;
    banner.show_cta = !!banner.show_cta;
    banner.show_on_mobile = !!banner.show_on_mobile;
    banner.show_on_desktop = !!banner.show_on_desktop;
    banner.is_dismissible = !!banner.is_dismissible;
    banner.is_active = !!banner.is_active;
    if (typeof banner.text_style === 'string') {
      try { banner.text_style = JSON.parse(banner.text_style); } catch { banner.text_style = null; }
    }

    return banner;
  }

  static async create(tenantId: number, data: CreateBannerData): Promise<number> {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [maxSort] = await connection.query<RowDataPacket[]>(
        'SELECT COALESCE(MAX(sort_order), 0) + 1 as next_sort FROM tenant_banners WHERE tenant_id = ?',
        [tenantId]
      );

      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO tenant_banners (
          tenant_id, banner_type, image_url, mobile_image_url, background_color, text_color,
          text_position, text_alignment, text_position_mobile, text_alignment_mobile, text_style,
          link_type, link_menu_item_id, link_menu_category_id, link_page_code, link_url, link_target,
          show_cta, cta_style, valid_from, valid_to,
          show_on_mobile, show_on_desktop, is_dismissible, is_active, sort_order
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          tenantId,
          data.banner_type || 'hero',
          data.image_url || null,
          data.mobile_image_url || null,
          data.background_color || null,
          data.text_color || '#FFFFFF',
          data.text_position || 'center',
          data.text_alignment || 'center',
          data.text_position_mobile || null,
          data.text_alignment_mobile || null,
          data.text_style ? JSON.stringify(data.text_style) : null,
          data.link_type || 'none',
          data.link_menu_item_id || null,
          data.link_menu_category_id || null,
          data.link_page_code || null,
          data.link_url || null,
          data.link_target || '_self',
          this.parseBool(data.show_cta, false),
          data.cta_style || 'primary',
          data.valid_from || null,
          data.valid_to || null,
          this.parseBool(data.show_on_mobile, true),
          this.parseBool(data.show_on_desktop, true),
          this.parseBool(data.is_dismissible, false),
          this.parseBool(data.is_active, true),
          data.sort_order ?? maxSort[0].next_sort,
        ]
      );

      const bannerId = result.insertId;

      if (data.translations && data.translations.length > 0) {
        for (const tr of data.translations) {
          if (!tr.language_id) continue;
          await connection.query(
            `INSERT INTO tenant_banner_translations (banner_id, language_id, title, subtitle, description, cta_text, alt_text)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [bannerId, tr.language_id, tr.title || null, tr.subtitle || null, tr.description || null, tr.cta_text || null, tr.alt_text || null]
          );
        }
      }

      await connection.commit();
      return bannerId;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  static async update(tenantId: number, bannerId: number, data: CreateBannerData) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [existing] = await connection.query<RowDataPacket[]>(
        'SELECT id FROM tenant_banners WHERE id = ? AND tenant_id = ?',
        [bannerId, tenantId]
      );
      if (existing.length === 0) throw new Error('Banner not found');

      const fields: string[] = [];
      const values: any[] = [];

      if (data.banner_type !== undefined) { fields.push('banner_type = ?'); values.push(data.banner_type); }
      if (data.image_url !== undefined) { fields.push('image_url = ?'); values.push(data.image_url || null); }
      if (data.mobile_image_url !== undefined) { fields.push('mobile_image_url = ?'); values.push(data.mobile_image_url || null); }
      if (data.background_color !== undefined) { fields.push('background_color = ?'); values.push(data.background_color || null); }
      if (data.text_color !== undefined) { fields.push('text_color = ?'); values.push(data.text_color || null); }
      if (data.text_position !== undefined) { fields.push('text_position = ?'); values.push(data.text_position || 'center'); }
      if (data.text_alignment !== undefined) { fields.push('text_alignment = ?'); values.push(data.text_alignment || 'center'); }
      if (data.text_position_mobile !== undefined) { fields.push('text_position_mobile = ?'); values.push(data.text_position_mobile || null); }
      if (data.text_alignment_mobile !== undefined) { fields.push('text_alignment_mobile = ?'); values.push(data.text_alignment_mobile || null); }
      if (data.text_style !== undefined) { fields.push('text_style = ?'); values.push(data.text_style ? JSON.stringify(data.text_style) : null); }
      if (data.link_type !== undefined) { fields.push('link_type = ?'); values.push(data.link_type); }
      if (data.link_menu_item_id !== undefined) { fields.push('link_menu_item_id = ?'); values.push(data.link_menu_item_id || null); }
      if (data.link_menu_category_id !== undefined) { fields.push('link_menu_category_id = ?'); values.push(data.link_menu_category_id || null); }
      if (data.link_page_code !== undefined) { fields.push('link_page_code = ?'); values.push(data.link_page_code || null); }
      if (data.link_url !== undefined) { fields.push('link_url = ?'); values.push(data.link_url || null); }
      if (data.link_target !== undefined) { fields.push('link_target = ?'); values.push(data.link_target); }
      if (data.show_cta !== undefined) { fields.push('show_cta = ?'); values.push(this.parseBool(data.show_cta)); }
      if (data.cta_style !== undefined) { fields.push('cta_style = ?'); values.push(data.cta_style); }
      if (data.valid_from !== undefined) { fields.push('valid_from = ?'); values.push(data.valid_from || null); }
      if (data.valid_to !== undefined) { fields.push('valid_to = ?'); values.push(data.valid_to || null); }
      if (data.show_on_mobile !== undefined) { fields.push('show_on_mobile = ?'); values.push(this.parseBool(data.show_on_mobile, true)); }
      if (data.show_on_desktop !== undefined) { fields.push('show_on_desktop = ?'); values.push(this.parseBool(data.show_on_desktop, true)); }
      if (data.is_dismissible !== undefined) { fields.push('is_dismissible = ?'); values.push(this.parseBool(data.is_dismissible)); }
      if (data.is_active !== undefined) { fields.push('is_active = ?'); values.push(this.parseBool(data.is_active)); }
      if (data.sort_order !== undefined) { fields.push('sort_order = ?'); values.push(data.sort_order); }

      if (fields.length > 0) {
        values.push(bannerId);
        await connection.query(
          `UPDATE tenant_banners SET ${fields.join(', ')} WHERE id = ?`,
          values
        );
      }

      if (data.translations) {
        await connection.query('DELETE FROM tenant_banner_translations WHERE banner_id = ?', [bannerId]);
        for (const tr of data.translations) {
          if (!tr.language_id) continue;
          await connection.query(
            `INSERT INTO tenant_banner_translations (banner_id, language_id, title, subtitle, description, cta_text, alt_text)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [bannerId, tr.language_id, tr.title || null, tr.subtitle || null, tr.description || null, tr.cta_text || null, tr.alt_text || null]
          );
        }
      }

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  static async delete(tenantId: number, bannerId: number) {
    const [existing] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM tenant_banners WHERE id = ? AND tenant_id = ?',
      [bannerId, tenantId]
    );
    if (existing.length === 0) throw new Error('Banner not found');

    await pool.query('DELETE FROM tenant_banners WHERE id = ?', [bannerId]);
    return { message: 'Banner deleted successfully' };
  }

  static async toggleActive(tenantId: number, bannerId: number) {
    const [banners] = await pool.query<RowDataPacket[]>(
      'SELECT id, is_active FROM tenant_banners WHERE id = ? AND tenant_id = ?',
      [bannerId, tenantId]
    );
    if (banners.length === 0) throw new Error('Banner not found');

    const newValue = banners[0].is_active ? 0 : 1;
    await pool.query('UPDATE tenant_banners SET is_active = ? WHERE id = ?', [newValue, bannerId]);
    return { message: newValue ? 'Banner activated' : 'Banner deactivated', data: { id: bannerId, is_active: !!newValue } };
  }

  static async updateSortOrder(tenantId: number, items: Array<{ id: number; sort_order: number }>) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      for (const item of items) {
        await connection.query(
          'UPDATE tenant_banners SET sort_order = ? WHERE id = ? AND tenant_id = ?',
          [item.sort_order, item.id, tenantId]
        );
      }
      await connection.commit();
      return { message: 'Sort order updated successfully' };
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

  static async getStats(tenantId: number) {
    const [stats] = await pool.query<RowDataPacket[]>(
      `SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN is_active = 1 AND (valid_from IS NULL OR valid_from <= NOW()) AND (valid_to IS NULL OR valid_to >= NOW()) THEN 1 ELSE 0 END) AS active,
        SUM(CASE WHEN is_active = 1 AND valid_from > NOW() THEN 1 ELSE 0 END) AS scheduled,
        SUM(CASE WHEN valid_to IS NOT NULL AND valid_to < NOW() THEN 1 ELSE 0 END) AS expired,
        SUM(CASE WHEN banner_type = 'hero' THEN 1 ELSE 0 END) AS hero_count,
        SUM(CASE WHEN banner_type = 'promotional' THEN 1 ELSE 0 END) AS promotional_count
       FROM tenant_banners
       WHERE tenant_id = ?`,
      [tenantId]
    );
    return stats[0];
  }

  static async duplicate(tenantId: number, bannerId: number) {
    const original = await this.getById(tenantId, bannerId);
    const translations = (original.translations || []).map((t: any) => ({
      language_id: t.language_id,
      title: t.title ? `${t.title} (Copy)` : null,
      subtitle: t.subtitle,
      description: t.description,
      cta_text: t.cta_text,
      alt_text: t.alt_text,
    }));

    const newId = await this.create(tenantId, {
      banner_type: original.banner_type,
      image_url: original.image_url,
      mobile_image_url: original.mobile_image_url,
      background_color: original.background_color,
      text_color: original.text_color,
      text_position: original.text_position,
      text_alignment: original.text_alignment,
      text_position_mobile: original.text_position_mobile,
      text_alignment_mobile: original.text_alignment_mobile,
      text_style: original.text_style,
      link_type: original.link_type,
      link_menu_item_id: original.link_menu_item_id,
      link_menu_category_id: original.link_menu_category_id,
      link_page_code: original.link_page_code,
      link_url: original.link_url,
      link_target: original.link_target,
      show_cta: !!original.show_cta,
      cta_style: original.cta_style,
      valid_from: null,
      valid_to: null,
      show_on_mobile: !!original.show_on_mobile,
      show_on_desktop: !!original.show_on_desktop,
      is_dismissible: !!original.is_dismissible,
      is_active: false,
      translations,
    });

    return await this.getById(tenantId, newId);
  }

  /**
   * Record a banner impression or click from the storefront.
   * Verifies the banner belongs to the given tenant before inserting.
   */
  static async recordInteraction(
    tenantId: number,
    bannerId: number,
    interactionType: 'impression' | 'click',
    ipAddress: string | null,
    userAgent: string | null,
  ): Promise<void> {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM tenant_banners WHERE id = ? AND tenant_id = ? LIMIT 1',
      [bannerId, tenantId]
    );
    if (rows.length === 0) throw new Error('Banner not found');

    await pool.query(
      `INSERT INTO banner_interactions (tenant_id, banner_id, interaction_type, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?)`,
      [tenantId, bannerId, interactionType, ipAddress, userAgent]
    );
  }

  /**
   * Storefront: get active banners of a given type for a tenant.
   * No auth — caller must supply a verified tenantId (resolved from subdomain/slug).
   */
  static async getPublicBannersByType(tenantId: number, bannerType: string) {
    const [banners] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM tenant_banners
       WHERE tenant_id = ?
         AND banner_type = ?
         AND is_active = 1
         AND (valid_from IS NULL OR valid_from <= NOW())
         AND (valid_to IS NULL OR valid_to >= NOW())
       ORDER BY sort_order ASC, id DESC`,
      [tenantId, bannerType]
    );

    for (const banner of banners) {
      const [translations] = await pool.query<RowDataPacket[]>(
        `SELECT tbt.*, l.code AS language_code, l.name AS language_name
         FROM tenant_banner_translations tbt
         JOIN languages l ON tbt.language_id = l.id
         WHERE tbt.banner_id = ?`,
        [banner.id]
      );
      banner.translations = translations;
      banner.show_cta = !!banner.show_cta;
      banner.show_on_mobile = !!banner.show_on_mobile;
      banner.show_on_desktop = !!banner.show_on_desktop;
      banner.is_dismissible = !!banner.is_dismissible;
      banner.is_active = !!banner.is_active;
      if (typeof banner.text_style === 'string') {
        try { banner.text_style = JSON.parse(banner.text_style); } catch { banner.text_style = null; }
      }
    }

    return banners;
  }
}
