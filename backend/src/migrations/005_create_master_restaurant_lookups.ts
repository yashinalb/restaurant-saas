import mysql from 'mysql2/promise';

export async function up(connection: mysql.Connection): Promise<void> {
  console.log('Running migration: 005_create_master_restaurant_lookups');

  // =====================================================
  // MASTER ADDON TYPES (portion, extra, sauce, topping, side, drink)
  // =====================================================
  await connection.query(`
    CREATE TABLE IF NOT EXISTS master_addon_types (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      code VARCHAR(50) UNIQUE NOT NULL,
      icon VARCHAR(100),
      sort_order INT DEFAULT 0,
      is_active TINYINT(1) DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_code (code),
      INDEX idx_is_active (is_active)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS master_addon_type_translations (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      master_addon_type_id BIGINT UNSIGNED NOT NULL,
      language_id BIGINT UNSIGNED NOT NULL,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      UNIQUE KEY unique_addon_type_language (master_addon_type_id, language_id),
      CONSTRAINT fk_matt_addon_type FOREIGN KEY (master_addon_type_id) REFERENCES master_addon_types(id) ON DELETE CASCADE,
      CONSTRAINT fk_matt_language FOREIGN KEY (language_id) REFERENCES languages(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Bridge: which addon types are relevant for which restaurant type
  await connection.query(`
    CREATE TABLE IF NOT EXISTS tenant_type_addon_types (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      tenant_type_id BIGINT UNSIGNED NOT NULL,
      master_addon_type_id BIGINT UNSIGNED NOT NULL,
      is_recommended TINYINT(1) DEFAULT 0,
      sort_order INT DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_type_addon (tenant_type_id, master_addon_type_id),
      INDEX idx_tenant_type (tenant_type_id),
      INDEX idx_addon_type (master_addon_type_id),
      CONSTRAINT fk_ttat_type FOREIGN KEY (tenant_type_id) REFERENCES tenant_types(id) ON DELETE CASCADE,
      CONSTRAINT fk_ttat_addon FOREIGN KEY (master_addon_type_id) REFERENCES master_addon_types(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // =====================================================
  // MASTER ORDER SOURCES (in_store, online, kiosk, phone, third_party)
  // =====================================================
  await connection.query(`
    CREATE TABLE IF NOT EXISTS master_order_sources (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      code VARCHAR(50) UNIQUE NOT NULL,
      icon VARCHAR(100),
      sort_order INT DEFAULT 0,
      is_active TINYINT(1) DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_code (code)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS master_order_source_translations (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      master_order_source_id BIGINT UNSIGNED NOT NULL,
      language_id BIGINT UNSIGNED NOT NULL,
      name VARCHAR(255) NOT NULL,
      UNIQUE KEY unique_order_source_language (master_order_source_id, language_id),
      CONSTRAINT fk_most_source FOREIGN KEY (master_order_source_id) REFERENCES master_order_sources(id) ON DELETE CASCADE,
      CONSTRAINT fk_most_language FOREIGN KEY (language_id) REFERENCES languages(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // =====================================================
  // MASTER ORDER TYPES (dine_in, takeaway, delivery, drive_through)
  // =====================================================
  await connection.query(`
    CREATE TABLE IF NOT EXISTS master_order_types (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      code VARCHAR(50) UNIQUE NOT NULL,
      icon VARCHAR(100),
      sort_order INT DEFAULT 0,
      is_active TINYINT(1) DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_code (code)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS master_order_type_translations (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      master_order_type_id BIGINT UNSIGNED NOT NULL,
      language_id BIGINT UNSIGNED NOT NULL,
      name VARCHAR(255) NOT NULL,
      UNIQUE KEY unique_order_type_language (master_order_type_id, language_id),
      CONSTRAINT fk_mott_type FOREIGN KEY (master_order_type_id) REFERENCES master_order_types(id) ON DELETE CASCADE,
      CONSTRAINT fk_mott_language FOREIGN KEY (language_id) REFERENCES languages(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // =====================================================
  // MASTER ORDER DESTINATIONS (kitchen, bar, dessert_station, grill)
  // =====================================================
  await connection.query(`
    CREATE TABLE IF NOT EXISTS master_order_destinations (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      code VARCHAR(50) UNIQUE NOT NULL,
      icon VARCHAR(100),
      sort_order INT DEFAULT 0,
      is_active TINYINT(1) DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_code (code)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS master_order_destination_translations (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      master_order_destination_id BIGINT UNSIGNED NOT NULL,
      language_id BIGINT UNSIGNED NOT NULL,
      name VARCHAR(255) NOT NULL,
      UNIQUE KEY unique_order_dest_language (master_order_destination_id, language_id),
      CONSTRAINT fk_modt_dest FOREIGN KEY (master_order_destination_id) REFERENCES master_order_destinations(id) ON DELETE CASCADE,
      CONSTRAINT fk_modt_language FOREIGN KEY (language_id) REFERENCES languages(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // =====================================================
  // MASTER PAYMENT TYPES (cash, credit_card, debit_card, mobile_pay, voucher)
  // =====================================================
  await connection.query(`
    CREATE TABLE IF NOT EXISTS master_payment_types (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      code VARCHAR(50) UNIQUE NOT NULL,
      icon VARCHAR(100),
      sort_order INT DEFAULT 0,
      is_active TINYINT(1) DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_code (code)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS master_payment_type_translations (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      master_payment_type_id BIGINT UNSIGNED NOT NULL,
      language_id BIGINT UNSIGNED NOT NULL,
      name VARCHAR(255) NOT NULL,
      UNIQUE KEY unique_payment_type_language (master_payment_type_id, language_id),
      CONSTRAINT fk_mptt_type FOREIGN KEY (master_payment_type_id) REFERENCES master_payment_types(id) ON DELETE CASCADE,
      CONSTRAINT fk_mptt_language FOREIGN KEY (language_id) REFERENCES languages(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // =====================================================
  // MASTER ORDER ITEM STATUSES (pending, preparing, ready, served, cancelled)
  // =====================================================
  await connection.query(`
    CREATE TABLE IF NOT EXISTS master_order_item_statuses (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      code VARCHAR(50) UNIQUE NOT NULL,
      color VARCHAR(7),
      sort_order INT DEFAULT 0,
      is_active TINYINT(1) DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_code (code)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS master_order_item_status_translations (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      master_order_item_status_id BIGINT UNSIGNED NOT NULL,
      language_id BIGINT UNSIGNED NOT NULL,
      name VARCHAR(255) NOT NULL,
      UNIQUE KEY unique_ois_language (master_order_item_status_id, language_id),
      CONSTRAINT fk_moist_status FOREIGN KEY (master_order_item_status_id) REFERENCES master_order_item_statuses(id) ON DELETE CASCADE,
      CONSTRAINT fk_moist_language FOREIGN KEY (language_id) REFERENCES languages(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // =====================================================
  // MASTER PAYMENT STATUSES (unpaid, partially_paid, paid, refunded)
  // =====================================================
  await connection.query(`
    CREATE TABLE IF NOT EXISTS master_payment_statuses (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      code VARCHAR(50) UNIQUE NOT NULL,
      color VARCHAR(7),
      sort_order INT DEFAULT 0,
      is_active TINYINT(1) DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_code (code)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS master_payment_status_translations (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      master_payment_status_id BIGINT UNSIGNED NOT NULL,
      language_id BIGINT UNSIGNED NOT NULL,
      name VARCHAR(255) NOT NULL,
      UNIQUE KEY unique_ps_language (master_payment_status_id, language_id),
      CONSTRAINT fk_mpst_status FOREIGN KEY (master_payment_status_id) REFERENCES master_payment_statuses(id) ON DELETE CASCADE,
      CONSTRAINT fk_mpst_language FOREIGN KEY (language_id) REFERENCES languages(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // =====================================================
  // MASTER INGREDIENTS (allergens + dietary markers)
  // =====================================================
  await connection.query(`
    CREATE TABLE IF NOT EXISTS master_ingredients (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      code VARCHAR(50) UNIQUE NOT NULL,
      allergen_type VARCHAR(50) COMMENT 'allergen, dietary, ingredient',
      icon_url VARCHAR(500),
      sort_order INT DEFAULT 0,
      is_active TINYINT(1) DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_code (code),
      INDEX idx_allergen_type (allergen_type)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS master_ingredient_translations (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      master_ingredient_id BIGINT UNSIGNED NOT NULL,
      language_id BIGINT UNSIGNED NOT NULL,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      UNIQUE KEY unique_ingredient_language (master_ingredient_id, language_id),
      CONSTRAINT fk_mit_ingredient FOREIGN KEY (master_ingredient_id) REFERENCES master_ingredients(id) ON DELETE CASCADE,
      CONSTRAINT fk_mit_language FOREIGN KEY (language_id) REFERENCES languages(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // =====================================================
  // MASTER EXPENSE CATEGORIES (rent, utilities, supplies, labor, etc.)
  // =====================================================
  await connection.query(`
    CREATE TABLE IF NOT EXISTS master_expense_categories (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      code VARCHAR(50) UNIQUE NOT NULL,
      icon VARCHAR(100),
      sort_order INT DEFAULT 0,
      is_active TINYINT(1) DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_code (code)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS master_expense_category_translations (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      master_expense_category_id BIGINT UNSIGNED NOT NULL,
      language_id BIGINT UNSIGNED NOT NULL,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      UNIQUE KEY unique_expense_cat_language (master_expense_category_id, language_id),
      CONSTRAINT fk_mect_category FOREIGN KEY (master_expense_category_id) REFERENCES master_expense_categories(id) ON DELETE CASCADE,
      CONSTRAINT fk_mect_language FOREIGN KEY (language_id) REFERENCES languages(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  console.log('✅ Migration 005 completed: Master restaurant lookup tables created');
  console.log('   - master_addon_types + translations + tenant_type bridge');
  console.log('   - master_order_sources + translations');
  console.log('   - master_order_types + translations');
  console.log('   - master_order_destinations + translations');
  console.log('   - master_payment_types + translations');
  console.log('   - master_order_item_statuses + translations');
  console.log('   - master_payment_statuses + translations');
  console.log('   - master_ingredients + translations');
  console.log('   - master_expense_categories + translations');
}

export async function down(connection: mysql.Connection): Promise<void> {
  console.log('Rolling back migration: 005_create_master_restaurant_lookups');

  await connection.query('DROP TABLE IF EXISTS master_expense_category_translations');
  await connection.query('DROP TABLE IF EXISTS master_expense_categories');
  await connection.query('DROP TABLE IF EXISTS master_ingredient_translations');
  await connection.query('DROP TABLE IF EXISTS master_ingredients');
  await connection.query('DROP TABLE IF EXISTS master_payment_status_translations');
  await connection.query('DROP TABLE IF EXISTS master_payment_statuses');
  await connection.query('DROP TABLE IF EXISTS master_order_item_status_translations');
  await connection.query('DROP TABLE IF EXISTS master_order_item_statuses');
  await connection.query('DROP TABLE IF EXISTS master_payment_type_translations');
  await connection.query('DROP TABLE IF EXISTS master_payment_types');
  await connection.query('DROP TABLE IF EXISTS master_order_destination_translations');
  await connection.query('DROP TABLE IF EXISTS master_order_destinations');
  await connection.query('DROP TABLE IF EXISTS master_order_type_translations');
  await connection.query('DROP TABLE IF EXISTS master_order_types');
  await connection.query('DROP TABLE IF EXISTS master_order_source_translations');
  await connection.query('DROP TABLE IF EXISTS master_order_sources');
  await connection.query('DROP TABLE IF EXISTS tenant_type_addon_types');
  await connection.query('DROP TABLE IF EXISTS master_addon_type_translations');
  await connection.query('DROP TABLE IF EXISTS master_addon_types');

  console.log('✅ Migration 005 rolled back');
}
