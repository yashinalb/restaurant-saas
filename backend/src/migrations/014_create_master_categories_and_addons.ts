import mysql from 'mysql2/promise';

export async function up(connection: mysql.Connection): Promise<void> {
  console.log('Running migration: 014_create_master_categories_and_addons');

  // =====================================================
  // MASTER MENU CATEGORIES (template categories for new tenants)
  // e.g. Appetizers, Main Course, Desserts, Drinks, Soups, Salads
  // =====================================================
  await connection.query(`
    CREATE TABLE IF NOT EXISTS master_menu_categories (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      code VARCHAR(50) UNIQUE NOT NULL,
      parent_id BIGINT UNSIGNED NULL,
      icon_url VARCHAR(500),
      image_url VARCHAR(500),
      sort_order INT DEFAULT 0,
      is_active TINYINT(1) DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_code (code),
      INDEX idx_parent (parent_id),
      INDEX idx_is_active (is_active),
      CONSTRAINT fk_mmc_parent FOREIGN KEY (parent_id) REFERENCES master_menu_categories(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS master_menu_category_translations (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      master_menu_category_id BIGINT UNSIGNED NOT NULL,
      language_id BIGINT UNSIGNED NOT NULL,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      UNIQUE KEY unique_mmc_language (master_menu_category_id, language_id),
      CONSTRAINT fk_mmct_category FOREIGN KEY (master_menu_category_id) REFERENCES master_menu_categories(id) ON DELETE CASCADE,
      CONSTRAINT fk_mmct_language FOREIGN KEY (language_id) REFERENCES languages(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Bridge: which master categories are relevant for which restaurant type
  await connection.query(`
    CREATE TABLE IF NOT EXISTS tenant_type_menu_categories (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      tenant_type_id BIGINT UNSIGNED NOT NULL,
      master_menu_category_id BIGINT UNSIGNED NOT NULL,
      is_default TINYINT(1) DEFAULT 0 COMMENT 'Auto-import when tenant is created',
      sort_order INT DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_type_category (tenant_type_id, master_menu_category_id),
      INDEX idx_tenant_type (tenant_type_id),
      INDEX idx_category (master_menu_category_id),
      CONSTRAINT fk_ttmc_type FOREIGN KEY (tenant_type_id) REFERENCES tenant_types(id) ON DELETE CASCADE,
      CONSTRAINT fk_ttmc_category FOREIGN KEY (master_menu_category_id) REFERENCES master_menu_categories(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Add master_menu_category_id FK to tenant_menu_categories
  await connection.query(`
    ALTER TABLE tenant_menu_categories
    ADD COLUMN master_menu_category_id BIGINT UNSIGNED NULL AFTER tenant_id,
    ADD INDEX idx_master_category (master_menu_category_id),
    ADD CONSTRAINT fk_tmc_master FOREIGN KEY (master_menu_category_id) REFERENCES master_menu_categories(id) ON DELETE SET NULL
  `);

  // =====================================================
  // MASTER ADDONS (template addons for new tenants)
  // e.g. Small/Medium/Large portions, common sauces, toppings
  // =====================================================
  await connection.query(`
    CREATE TABLE IF NOT EXISTS master_addons (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      master_addon_type_id BIGINT UNSIGNED NOT NULL,
      code VARCHAR(50) NOT NULL,
      sort_order INT DEFAULT 0,
      is_active TINYINT(1) DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY unique_type_code (master_addon_type_id, code),
      INDEX idx_addon_type (master_addon_type_id),
      INDEX idx_is_active (is_active),
      CONSTRAINT fk_ma_addon_type FOREIGN KEY (master_addon_type_id) REFERENCES master_addon_types(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS master_addon_translations (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      master_addon_id BIGINT UNSIGNED NOT NULL,
      language_id BIGINT UNSIGNED NOT NULL,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      UNIQUE KEY unique_ma_language (master_addon_id, language_id),
      CONSTRAINT fk_mat_addon FOREIGN KEY (master_addon_id) REFERENCES master_addons(id) ON DELETE CASCADE,
      CONSTRAINT fk_mat_language FOREIGN KEY (language_id) REFERENCES languages(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Bridge: which master addons are relevant for which restaurant type
  await connection.query(`
    CREATE TABLE IF NOT EXISTS tenant_type_addons (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      tenant_type_id BIGINT UNSIGNED NOT NULL,
      master_addon_id BIGINT UNSIGNED NOT NULL,
      is_default TINYINT(1) DEFAULT 0 COMMENT 'Auto-import when tenant is created',
      sort_order INT DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_type_addon (tenant_type_id, master_addon_id),
      INDEX idx_tenant_type (tenant_type_id),
      INDEX idx_addon (master_addon_id),
      CONSTRAINT fk_tta_type FOREIGN KEY (tenant_type_id) REFERENCES tenant_types(id) ON DELETE CASCADE,
      CONSTRAINT fk_tta_addon FOREIGN KEY (master_addon_id) REFERENCES master_addons(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Add master_addon_id FK to tenant_addons
  await connection.query(`
    ALTER TABLE tenant_addons
    ADD COLUMN master_addon_id BIGINT UNSIGNED NULL AFTER tenant_addon_type_id,
    ADD INDEX idx_master_addon (master_addon_id),
    ADD CONSTRAINT fk_ta_master FOREIGN KEY (master_addon_id) REFERENCES master_addons(id) ON DELETE SET NULL
  `);

  console.log('✅ Migration 014 completed: Master categories and addons created');
  console.log('   - master_menu_categories + translations + tenant_type bridge');
  console.log('   - tenant_menu_categories.master_menu_category_id FK added');
  console.log('   - master_addons + translations + tenant_type bridge');
  console.log('   - tenant_addons.master_addon_id FK added');
}

export async function down(connection: mysql.Connection): Promise<void> {
  console.log('Rolling back migration: 014_create_master_categories_and_addons');

  // Remove FKs from tenant tables
  await connection.query('ALTER TABLE tenant_addons DROP FOREIGN KEY fk_ta_master');
  await connection.query('ALTER TABLE tenant_addons DROP INDEX idx_master_addon');
  await connection.query('ALTER TABLE tenant_addons DROP COLUMN master_addon_id');

  await connection.query('ALTER TABLE tenant_menu_categories DROP FOREIGN KEY fk_tmc_master');
  await connection.query('ALTER TABLE tenant_menu_categories DROP INDEX idx_master_category');
  await connection.query('ALTER TABLE tenant_menu_categories DROP COLUMN master_menu_category_id');

  // Drop tables
  await connection.query('DROP TABLE IF EXISTS tenant_type_addons');
  await connection.query('DROP TABLE IF EXISTS master_addon_translations');
  await connection.query('DROP TABLE IF EXISTS master_addons');
  await connection.query('DROP TABLE IF EXISTS tenant_type_menu_categories');
  await connection.query('DROP TABLE IF EXISTS master_menu_category_translations');
  await connection.query('DROP TABLE IF EXISTS master_menu_categories');

  console.log('✅ Migration 014 rolled back');
}
