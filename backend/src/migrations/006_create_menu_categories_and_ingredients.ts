import mysql from 'mysql2/promise';

export async function up(connection: mysql.Connection): Promise<void> {
  console.log('Running migration: 006_create_menu_categories_and_ingredients');

  // =====================================================
  // TENANT MENU CATEGORIES (hierarchical)
  // =====================================================
  await connection.query(`
    CREATE TABLE IF NOT EXISTS tenant_menu_categories (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      tenant_id BIGINT UNSIGNED NOT NULL,
      store_id BIGINT UNSIGNED NULL COMMENT 'NULL = all stores',
      parent_id BIGINT UNSIGNED NULL,
      slug VARCHAR(255) NOT NULL,
      image_url VARCHAR(500),
      sort_order INT DEFAULT 0,
      is_active TINYINT(1) DEFAULT 1,
      show_on_website TINYINT(1) DEFAULT 1,
      show_on_pos TINYINT(1) DEFAULT 1,
      show_on_kiosk TINYINT(1) DEFAULT 1,
      vat_rate DECIMAL(5, 2) NULL COMMENT 'Default VAT for items in this category',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY unique_tenant_slug (tenant_id, slug),
      INDEX idx_tenant_parent (tenant_id, parent_id),
      INDEX idx_tenant_active (tenant_id, is_active),
      INDEX idx_store (store_id),
      CONSTRAINT fk_tmc_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      CONSTRAINT fk_tmc_parent FOREIGN KEY (parent_id) REFERENCES tenant_menu_categories(id) ON DELETE CASCADE,
      CONSTRAINT fk_tmc_store FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS tenant_menu_category_translations (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      tenant_menu_category_id BIGINT UNSIGNED NOT NULL,
      language_id BIGINT UNSIGNED NOT NULL,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      UNIQUE KEY unique_cat_language (tenant_menu_category_id, language_id),
      INDEX idx_name (name),
      CONSTRAINT fk_tmct_category FOREIGN KEY (tenant_menu_category_id) REFERENCES tenant_menu_categories(id) ON DELETE CASCADE,
      CONSTRAINT fk_tmct_language FOREIGN KEY (language_id) REFERENCES languages(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Category slideshow images
  await connection.query(`
    CREATE TABLE IF NOT EXISTS tenant_menu_category_images (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      tenant_menu_category_id BIGINT UNSIGNED NOT NULL,
      image_url VARCHAR(500) NOT NULL,
      is_primary TINYINT(1) DEFAULT 0,
      sort_order INT DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_category (tenant_menu_category_id),
      CONSTRAINT fk_tmci_category FOREIGN KEY (tenant_menu_category_id) REFERENCES tenant_menu_categories(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // =====================================================
  // TENANT INGREDIENTS (import from master or custom)
  // =====================================================
  await connection.query(`
    CREATE TABLE IF NOT EXISTS tenant_ingredients (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      tenant_id BIGINT UNSIGNED NOT NULL,
      master_ingredient_id BIGINT UNSIGNED NULL,
      code VARCHAR(50) NOT NULL,
      allergen_type VARCHAR(50) COMMENT 'allergen, dietary, ingredient',
      icon_url VARCHAR(500),
      sort_order INT DEFAULT 0,
      is_active TINYINT(1) DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY unique_tenant_code (tenant_id, code),
      INDEX idx_tenant (tenant_id),
      INDEX idx_master (master_ingredient_id),
      INDEX idx_allergen_type (allergen_type),
      CONSTRAINT fk_ti_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      CONSTRAINT fk_ti_master FOREIGN KEY (master_ingredient_id) REFERENCES master_ingredients(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS tenant_ingredient_translations (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      tenant_ingredient_id BIGINT UNSIGNED NOT NULL,
      language_id BIGINT UNSIGNED NOT NULL,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      UNIQUE KEY unique_ingredient_language (tenant_ingredient_id, language_id),
      CONSTRAINT fk_tit_ingredient FOREIGN KEY (tenant_ingredient_id) REFERENCES tenant_ingredients(id) ON DELETE CASCADE,
      CONSTRAINT fk_tit_language FOREIGN KEY (language_id) REFERENCES languages(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  console.log('✅ Migration 006 completed: Menu categories and ingredients created');
  console.log('   - tenant_menu_categories + translations + images');
  console.log('   - tenant_ingredients + translations');
}

export async function down(connection: mysql.Connection): Promise<void> {
  console.log('Rolling back migration: 006_create_menu_categories_and_ingredients');

  await connection.query('DROP TABLE IF EXISTS tenant_ingredient_translations');
  await connection.query('DROP TABLE IF EXISTS tenant_ingredients');
  await connection.query('DROP TABLE IF EXISTS tenant_menu_category_images');
  await connection.query('DROP TABLE IF EXISTS tenant_menu_category_translations');
  await connection.query('DROP TABLE IF EXISTS tenant_menu_categories');

  console.log('✅ Migration 006 rolled back');
}
