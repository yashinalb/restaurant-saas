import mysql from 'mysql2/promise';

export async function up(connection: mysql.Connection): Promise<void> {
  console.log('Running migration: 007_create_menu_items_and_addons');

  // =====================================================
  // TENANT ADDON TYPES (copy from master or custom)
  // =====================================================
  await connection.query(`
    CREATE TABLE IF NOT EXISTS tenant_addon_types (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      tenant_id BIGINT UNSIGNED NOT NULL,
      master_addon_type_id BIGINT UNSIGNED NULL,
      code VARCHAR(50) NOT NULL,
      icon VARCHAR(100),
      sort_order INT DEFAULT 0,
      is_active TINYINT(1) DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY unique_tenant_code (tenant_id, code),
      INDEX idx_tenant (tenant_id),
      INDEX idx_master (master_addon_type_id),
      CONSTRAINT fk_tat_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      CONSTRAINT fk_tat_master FOREIGN KEY (master_addon_type_id) REFERENCES master_addon_types(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS tenant_addon_type_translations (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      tenant_addon_type_id BIGINT UNSIGNED NOT NULL,
      language_id BIGINT UNSIGNED NOT NULL,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      UNIQUE KEY unique_tat_language (tenant_addon_type_id, language_id),
      CONSTRAINT fk_tatt_type FOREIGN KEY (tenant_addon_type_id) REFERENCES tenant_addon_types(id) ON DELETE CASCADE,
      CONSTRAINT fk_tatt_language FOREIGN KEY (language_id) REFERENCES languages(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // =====================================================
  // TENANT ADDONS (individual items: "Small", "Large", "Extra Cheese")
  // =====================================================
  await connection.query(`
    CREATE TABLE IF NOT EXISTS tenant_addons (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      tenant_id BIGINT UNSIGNED NOT NULL,
      tenant_addon_type_id BIGINT UNSIGNED NOT NULL,
      sort_order INT DEFAULT 0,
      is_active TINYINT(1) DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_tenant (tenant_id),
      INDEX idx_addon_type (tenant_addon_type_id),
      CONSTRAINT fk_ta_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      CONSTRAINT fk_ta_addon_type FOREIGN KEY (tenant_addon_type_id) REFERENCES tenant_addon_types(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS tenant_addon_translations (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      tenant_addon_id BIGINT UNSIGNED NOT NULL,
      language_id BIGINT UNSIGNED NOT NULL,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      UNIQUE KEY unique_addon_language (tenant_addon_id, language_id),
      CONSTRAINT fk_taddt_addon FOREIGN KEY (tenant_addon_id) REFERENCES tenant_addons(id) ON DELETE CASCADE,
      CONSTRAINT fk_taddt_language FOREIGN KEY (language_id) REFERENCES languages(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Addon prices per currency per store
  await connection.query(`
    CREATE TABLE IF NOT EXISTS tenant_addon_prices (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      tenant_addon_id BIGINT UNSIGNED NOT NULL,
      store_id BIGINT UNSIGNED NULL COMMENT 'NULL = all stores',
      currency_id BIGINT UNSIGNED NOT NULL,
      price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
      is_active TINYINT(1) DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY unique_addon_store_currency (tenant_addon_id, store_id, currency_id),
      INDEX idx_addon (tenant_addon_id),
      INDEX idx_store (store_id),
      INDEX idx_currency (currency_id),
      CONSTRAINT fk_tap_addon FOREIGN KEY (tenant_addon_id) REFERENCES tenant_addons(id) ON DELETE CASCADE,
      CONSTRAINT fk_tap_store FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
      CONSTRAINT fk_tap_currency FOREIGN KEY (currency_id) REFERENCES currencies(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // =====================================================
  // TENANT ORDER DESTINATIONS (kitchen, bar, etc. with printer/KDS config)
  // =====================================================
  await connection.query(`
    CREATE TABLE IF NOT EXISTS tenant_order_destinations (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      tenant_id BIGINT UNSIGNED NOT NULL,
      master_order_destination_id BIGINT UNSIGNED NULL,
      code VARCHAR(50) NOT NULL,
      printer_ip VARCHAR(45),
      kds_screen_id INT NULL COMMENT 'Kitchen Display screen assignment',
      sort_order INT DEFAULT 0,
      is_active TINYINT(1) DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY unique_tenant_code (tenant_id, code),
      INDEX idx_tenant (tenant_id),
      CONSTRAINT fk_tod_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      CONSTRAINT fk_tod_master FOREIGN KEY (master_order_destination_id) REFERENCES master_order_destinations(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS tenant_order_destination_translations (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      tenant_order_destination_id BIGINT UNSIGNED NOT NULL,
      language_id BIGINT UNSIGNED NOT NULL,
      name VARCHAR(255) NOT NULL,
      UNIQUE KEY unique_dest_language (tenant_order_destination_id, language_id),
      CONSTRAINT fk_todt_dest FOREIGN KEY (tenant_order_destination_id) REFERENCES tenant_order_destinations(id) ON DELETE CASCADE,
      CONSTRAINT fk_todt_language FOREIGN KEY (language_id) REFERENCES languages(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // =====================================================
  // TENANT MENU ITEMS
  // =====================================================
  await connection.query(`
    CREATE TABLE IF NOT EXISTS tenant_menu_items (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      tenant_id BIGINT UNSIGNED NOT NULL,
      tenant_menu_category_id BIGINT UNSIGNED NULL,
      tenant_order_destination_id BIGINT UNSIGNED NULL,
      image_url VARCHAR(500),
      sort_order INT DEFAULT 0,
      is_active TINYINT(1) DEFAULT 1,
      is_weighted TINYINT(1) DEFAULT 0,
      vat_rate DECIMAL(5, 2) NULL COMMENT 'Overrides category VAT if set',
      is_combo TINYINT(1) DEFAULT 0,
      show_ingredients_website TINYINT(1) DEFAULT 0,
      show_ingredients_pos TINYINT(1) DEFAULT 0,
      show_ingredients_kiosk TINYINT(1) DEFAULT 0,
      show_addon_names_website TINYINT(1) DEFAULT 0,
      show_addon_prices_website TINYINT(1) DEFAULT 0,
      show_addon_names_pos TINYINT(1) DEFAULT 0,
      show_addon_names_kiosk TINYINT(1) DEFAULT 0,
      show_addon_prices_kiosk TINYINT(1) DEFAULT 0,
      show_on_website TINYINT(1) DEFAULT 1,
      show_on_pos TINYINT(1) DEFAULT 1,
      show_on_kiosk TINYINT(1) DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_tenant_active (tenant_id, is_active),
      INDEX idx_category (tenant_menu_category_id),
      INDEX idx_destination (tenant_order_destination_id),
      CONSTRAINT fk_tmi_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      CONSTRAINT fk_tmi_category FOREIGN KEY (tenant_menu_category_id) REFERENCES tenant_menu_categories(id) ON DELETE SET NULL,
      CONSTRAINT fk_tmi_destination FOREIGN KEY (tenant_order_destination_id) REFERENCES tenant_order_destinations(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS tenant_menu_item_translations (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      tenant_menu_item_id BIGINT UNSIGNED NOT NULL,
      language_id BIGINT UNSIGNED NOT NULL,
      name VARCHAR(500) NOT NULL,
      slug VARCHAR(255),
      description TEXT,
      short_description VARCHAR(1000),
      UNIQUE KEY unique_item_language (tenant_menu_item_id, language_id),
      FULLTEXT INDEX idx_search (name, description),
      CONSTRAINT fk_tmit_item FOREIGN KEY (tenant_menu_item_id) REFERENCES tenant_menu_items(id) ON DELETE CASCADE,
      CONSTRAINT fk_tmit_language FOREIGN KEY (language_id) REFERENCES languages(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Menu item prices per currency per store
  await connection.query(`
    CREATE TABLE IF NOT EXISTS tenant_menu_item_prices (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      tenant_menu_item_id BIGINT UNSIGNED NOT NULL,
      store_id BIGINT UNSIGNED NULL COMMENT 'NULL = all stores',
      currency_id BIGINT UNSIGNED NOT NULL,
      price DECIMAL(10, 2) NOT NULL,
      weight_price_per_100g DECIMAL(10, 2) NULL COMMENT 'For is_weighted=1 items',
      is_active TINYINT(1) DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY unique_item_store_currency (tenant_menu_item_id, store_id, currency_id),
      INDEX idx_item (tenant_menu_item_id),
      INDEX idx_store (store_id),
      INDEX idx_currency (currency_id),
      CONSTRAINT fk_tmip_item FOREIGN KEY (tenant_menu_item_id) REFERENCES tenant_menu_items(id) ON DELETE CASCADE,
      CONSTRAINT fk_tmip_store FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
      CONSTRAINT fk_tmip_currency FOREIGN KEY (currency_id) REFERENCES currencies(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Multiple images per menu item
  await connection.query(`
    CREATE TABLE IF NOT EXISTS tenant_menu_item_images (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      tenant_menu_item_id BIGINT UNSIGNED NOT NULL,
      image_url VARCHAR(500) NOT NULL,
      is_primary TINYINT(1) DEFAULT 0,
      sort_order INT DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_item (tenant_menu_item_id),
      CONSTRAINT fk_tmii_item FOREIGN KEY (tenant_menu_item_id) REFERENCES tenant_menu_items(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Which addons are available for which menu item
  await connection.query(`
    CREATE TABLE IF NOT EXISTS tenant_menu_item_addons (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      tenant_menu_item_id BIGINT UNSIGNED NOT NULL,
      tenant_addon_id BIGINT UNSIGNED NOT NULL,
      is_default TINYINT(1) DEFAULT 0 COMMENT 'Pre-selected addon',
      is_required TINYINT(1) DEFAULT 0,
      max_quantity INT DEFAULT 1,
      sort_order INT DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_item_addon (tenant_menu_item_id, tenant_addon_id),
      INDEX idx_item (tenant_menu_item_id),
      INDEX idx_addon (tenant_addon_id),
      CONSTRAINT fk_tmia_item FOREIGN KEY (tenant_menu_item_id) REFERENCES tenant_menu_items(id) ON DELETE CASCADE,
      CONSTRAINT fk_tmia_addon FOREIGN KEY (tenant_addon_id) REFERENCES tenant_addons(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Which ingredients are in which menu item
  await connection.query(`
    CREATE TABLE IF NOT EXISTS tenant_menu_item_ingredients (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      tenant_menu_item_id BIGINT UNSIGNED NOT NULL,
      tenant_ingredient_id BIGINT UNSIGNED NOT NULL,
      is_removable TINYINT(1) DEFAULT 1 COMMENT 'Customer can request removal',
      sort_order INT DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_item_ingredient (tenant_menu_item_id, tenant_ingredient_id),
      INDEX idx_item (tenant_menu_item_id),
      INDEX idx_ingredient (tenant_ingredient_id),
      CONSTRAINT fk_tmii2_item FOREIGN KEY (tenant_menu_item_id) REFERENCES tenant_menu_items(id) ON DELETE CASCADE,
      CONSTRAINT fk_tmii2_ingredient FOREIGN KEY (tenant_ingredient_id) REFERENCES tenant_ingredients(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Combo composition: which items make up a combo
  await connection.query(`
    CREATE TABLE IF NOT EXISTS tenant_menu_item_combo_links (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      combo_menu_item_id BIGINT UNSIGNED NOT NULL,
      component_menu_item_id BIGINT UNSIGNED NOT NULL,
      quantity INT DEFAULT 1,
      is_required TINYINT(1) DEFAULT 1,
      sort_order INT DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_combo_component (combo_menu_item_id, component_menu_item_id),
      INDEX idx_combo (combo_menu_item_id),
      INDEX idx_component (component_menu_item_id),
      CONSTRAINT fk_tmicl_combo FOREIGN KEY (combo_menu_item_id) REFERENCES tenant_menu_items(id) ON DELETE CASCADE,
      CONSTRAINT fk_tmicl_component FOREIGN KEY (component_menu_item_id) REFERENCES tenant_menu_items(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Price change audit trail
  await connection.query(`
    CREATE TABLE IF NOT EXISTS menu_item_price_histories (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      tenant_id BIGINT UNSIGNED NOT NULL,
      tenant_menu_item_id BIGINT UNSIGNED NOT NULL,
      price_type VARCHAR(20) NOT NULL COMMENT 'item, addon, weight',
      related_id BIGINT UNSIGNED NULL COMMENT 'tenant_addon_id if price_type=addon',
      currency_id BIGINT UNSIGNED NOT NULL,
      store_id BIGINT UNSIGNED NULL,
      old_price DECIMAL(10, 2) NOT NULL,
      new_price DECIMAL(10, 2) NOT NULL,
      changed_by BIGINT UNSIGNED NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_tenant (tenant_id),
      INDEX idx_item_type_date (tenant_menu_item_id, price_type, created_at),
      INDEX idx_currency (currency_id),
      CONSTRAINT fk_miph_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      CONSTRAINT fk_miph_item FOREIGN KEY (tenant_menu_item_id) REFERENCES tenant_menu_items(id) ON DELETE CASCADE,
      CONSTRAINT fk_miph_currency FOREIGN KEY (currency_id) REFERENCES currencies(id) ON DELETE CASCADE,
      CONSTRAINT fk_miph_store FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE SET NULL,
      CONSTRAINT fk_miph_changed_by FOREIGN KEY (changed_by) REFERENCES admin_users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  console.log('✅ Migration 007 completed: Menu items and addons created');
  console.log('   - tenant_addon_types + translations');
  console.log('   - tenant_addons + translations + prices');
  console.log('   - tenant_order_destinations + translations');
  console.log('   - tenant_menu_items + translations + prices + images');
  console.log('   - tenant_menu_item_addons, _ingredients, _combo_links');
  console.log('   - menu_item_price_histories');
}

export async function down(connection: mysql.Connection): Promise<void> {
  console.log('Rolling back migration: 007_create_menu_items_and_addons');

  await connection.query('DROP TABLE IF EXISTS menu_item_price_histories');
  await connection.query('DROP TABLE IF EXISTS tenant_menu_item_combo_links');
  await connection.query('DROP TABLE IF EXISTS tenant_menu_item_ingredients');
  await connection.query('DROP TABLE IF EXISTS tenant_menu_item_addons');
  await connection.query('DROP TABLE IF EXISTS tenant_menu_item_images');
  await connection.query('DROP TABLE IF EXISTS tenant_menu_item_prices');
  await connection.query('DROP TABLE IF EXISTS tenant_menu_item_translations');
  await connection.query('DROP TABLE IF EXISTS tenant_menu_items');
  await connection.query('DROP TABLE IF EXISTS tenant_order_destination_translations');
  await connection.query('DROP TABLE IF EXISTS tenant_order_destinations');
  await connection.query('DROP TABLE IF EXISTS tenant_addon_prices');
  await connection.query('DROP TABLE IF EXISTS tenant_addon_translations');
  await connection.query('DROP TABLE IF EXISTS tenant_addons');
  await connection.query('DROP TABLE IF EXISTS tenant_addon_type_translations');
  await connection.query('DROP TABLE IF EXISTS tenant_addon_types');

  console.log('✅ Migration 007 rolled back');
}
