import mysql from 'mysql2/promise';

export async function up(connection: mysql.Connection): Promise<void> {
  console.log('Running migration: 015_create_banners');

  await connection.query(`
    CREATE TABLE IF NOT EXISTS tenant_banners (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      tenant_id BIGINT UNSIGNED NOT NULL,
      banner_type ENUM('hero','top','middle','bottom','alert','promotional','sidebar') DEFAULT 'hero',
      image_url VARCHAR(500) NULL,
      mobile_image_url VARCHAR(500) NULL,
      background_color VARCHAR(7) NULL,
      text_color VARCHAR(7) DEFAULT '#FFFFFF',
      text_position ENUM('top-left','top-center','top-right','center-left','center','center-right','bottom-left','bottom-center','bottom-right') DEFAULT 'center',
      text_alignment ENUM('left','center','right') DEFAULT 'center',
      text_position_mobile ENUM('top-left','top-center','top-right','center-left','center','center-right','bottom-left','bottom-center','bottom-right') DEFAULT NULL,
      text_alignment_mobile ENUM('left','center','right') DEFAULT NULL,
      text_style JSON DEFAULT NULL,
      link_type ENUM('menu_item','menu_category','page','url','none') DEFAULT 'none',
      link_menu_item_id BIGINT UNSIGNED NULL,
      link_menu_category_id BIGINT UNSIGNED NULL,
      link_page_code VARCHAR(50) NULL,
      link_url VARCHAR(500) NULL,
      link_target ENUM('_self','_blank') DEFAULT '_self',
      show_cta TINYINT(1) DEFAULT 0,
      cta_style ENUM('primary','secondary','outline','ghost') DEFAULT 'primary',
      valid_from DATETIME NULL,
      valid_to DATETIME NULL,
      show_on_mobile TINYINT(1) DEFAULT 1,
      show_on_desktop TINYINT(1) DEFAULT 1,
      is_dismissible TINYINT(1) DEFAULT 0,
      is_active TINYINT(1) DEFAULT 1,
      sort_order INT DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      INDEX idx_tenant_active (tenant_id, is_active),
      INDEX idx_tenant_type (tenant_id, banner_type),
      INDEX idx_link_menu_item (link_menu_item_id),
      INDEX idx_link_menu_category (link_menu_category_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS tenant_banner_translations (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      banner_id BIGINT UNSIGNED NOT NULL,
      language_id BIGINT UNSIGNED NOT NULL,
      title VARCHAR(255) NULL,
      subtitle VARCHAR(255) NULL,
      description TEXT NULL,
      cta_text VARCHAR(100) NULL,
      alt_text VARCHAR(255) NULL,
      FOREIGN KEY (banner_id) REFERENCES tenant_banners(id) ON DELETE CASCADE,
      FOREIGN KEY (language_id) REFERENCES languages(id) ON DELETE CASCADE,
      UNIQUE KEY unique_banner_lang (banner_id, language_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  console.log('  ✓ tenant_banners');
  console.log('  ✓ tenant_banner_translations');
}

export async function down(connection: mysql.Connection): Promise<void> {
  await connection.query('DROP TABLE IF EXISTS tenant_banner_translations');
  await connection.query('DROP TABLE IF EXISTS tenant_banners');
}
