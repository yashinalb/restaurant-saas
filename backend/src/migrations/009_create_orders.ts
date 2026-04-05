import mysql from 'mysql2/promise';

export async function up(connection: mysql.Connection): Promise<void> {
  console.log('Running migration: 009_create_orders');

  // =====================================================
  // TENANT ORDER SOURCES (copy from master)
  // =====================================================
  await connection.query(`
    CREATE TABLE IF NOT EXISTS tenant_order_sources (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      tenant_id BIGINT UNSIGNED NOT NULL,
      master_order_source_id BIGINT UNSIGNED NULL,
      code VARCHAR(50) NOT NULL,
      sort_order INT DEFAULT 0,
      is_active TINYINT(1) DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY unique_tenant_code (tenant_id, code),
      INDEX idx_tenant (tenant_id),
      CONSTRAINT fk_tos_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      CONSTRAINT fk_tos_master FOREIGN KEY (master_order_source_id) REFERENCES master_order_sources(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS tenant_order_source_translations (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      tenant_order_source_id BIGINT UNSIGNED NOT NULL,
      language_id BIGINT UNSIGNED NOT NULL,
      name VARCHAR(255) NOT NULL,
      UNIQUE KEY unique_source_lang (tenant_order_source_id, language_id),
      CONSTRAINT fk_tost_source FOREIGN KEY (tenant_order_source_id) REFERENCES tenant_order_sources(id) ON DELETE CASCADE,
      CONSTRAINT fk_tost_language FOREIGN KEY (language_id) REFERENCES languages(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // =====================================================
  // TENANT ORDER TYPES (copy from master)
  // =====================================================
  await connection.query(`
    CREATE TABLE IF NOT EXISTS tenant_order_types (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      tenant_id BIGINT UNSIGNED NOT NULL,
      master_order_type_id BIGINT UNSIGNED NULL,
      code VARCHAR(50) NOT NULL,
      sort_order INT DEFAULT 0,
      is_active TINYINT(1) DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY unique_tenant_code (tenant_id, code),
      INDEX idx_tenant (tenant_id),
      CONSTRAINT fk_tot_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      CONSTRAINT fk_tot_master FOREIGN KEY (master_order_type_id) REFERENCES master_order_types(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS tenant_order_type_translations (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      tenant_order_type_id BIGINT UNSIGNED NOT NULL,
      language_id BIGINT UNSIGNED NOT NULL,
      name VARCHAR(255) NOT NULL,
      UNIQUE KEY unique_type_lang (tenant_order_type_id, language_id),
      CONSTRAINT fk_tott_type FOREIGN KEY (tenant_order_type_id) REFERENCES tenant_order_types(id) ON DELETE CASCADE,
      CONSTRAINT fk_tott_language FOREIGN KEY (language_id) REFERENCES languages(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // =====================================================
  // TENANT ORDER ITEM STATUSES (copy from master)
  // =====================================================
  await connection.query(`
    CREATE TABLE IF NOT EXISTS tenant_order_item_statuses (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      tenant_id BIGINT UNSIGNED NOT NULL,
      master_order_item_status_id BIGINT UNSIGNED NULL,
      code VARCHAR(50) NOT NULL,
      color VARCHAR(7),
      sort_order INT DEFAULT 0,
      is_active TINYINT(1) DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY unique_tenant_code (tenant_id, code),
      INDEX idx_tenant (tenant_id),
      CONSTRAINT fk_tois_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      CONSTRAINT fk_tois_master FOREIGN KEY (master_order_item_status_id) REFERENCES master_order_item_statuses(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS tenant_order_item_status_translations (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      tenant_order_item_status_id BIGINT UNSIGNED NOT NULL,
      language_id BIGINT UNSIGNED NOT NULL,
      name VARCHAR(255) NOT NULL,
      UNIQUE KEY unique_status_lang (tenant_order_item_status_id, language_id),
      CONSTRAINT fk_toist_status FOREIGN KEY (tenant_order_item_status_id) REFERENCES tenant_order_item_statuses(id) ON DELETE CASCADE,
      CONSTRAINT fk_toist_language FOREIGN KEY (language_id) REFERENCES languages(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // =====================================================
  // TENANT PAYMENT STATUSES (copy from master)
  // =====================================================
  await connection.query(`
    CREATE TABLE IF NOT EXISTS tenant_payment_statuses (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      tenant_id BIGINT UNSIGNED NOT NULL,
      master_payment_status_id BIGINT UNSIGNED NULL,
      code VARCHAR(50) NOT NULL,
      color VARCHAR(7),
      sort_order INT DEFAULT 0,
      is_active TINYINT(1) DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY unique_tenant_code (tenant_id, code),
      INDEX idx_tenant (tenant_id),
      CONSTRAINT fk_tps_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      CONSTRAINT fk_tps_master FOREIGN KEY (master_payment_status_id) REFERENCES master_payment_statuses(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS tenant_payment_status_translations (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      tenant_payment_status_id BIGINT UNSIGNED NOT NULL,
      language_id BIGINT UNSIGNED NOT NULL,
      name VARCHAR(255) NOT NULL,
      UNIQUE KEY unique_ps_lang (tenant_payment_status_id, language_id),
      CONSTRAINT fk_tpst_status FOREIGN KEY (tenant_payment_status_id) REFERENCES tenant_payment_statuses(id) ON DELETE CASCADE,
      CONSTRAINT fk_tpst_language FOREIGN KEY (language_id) REFERENCES languages(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // =====================================================
  // ORDERS
  // =====================================================
  await connection.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      tenant_id BIGINT UNSIGNED NOT NULL,
      store_id BIGINT UNSIGNED NOT NULL,
      order_number VARCHAR(50) NOT NULL COMMENT 'Human-readable, sequential per store per day',
      tenant_customer_id BIGINT UNSIGNED NULL,
      tenant_waiter_id BIGINT UNSIGNED NULL,
      table_id BIGINT UNSIGNED NULL,
      tenant_order_source_id BIGINT UNSIGNED NOT NULL,
      tenant_order_type_id BIGINT UNSIGNED NOT NULL,
      tenant_payment_status_id BIGINT UNSIGNED NULL,
      order_status ENUM('open', 'closed', 'cancelled', 'void') DEFAULT 'open',
      subtotal DECIMAL(10, 2) DEFAULT 0.00,
      tax_amount DECIMAL(10, 2) DEFAULT 0.00,
      service_charge DECIMAL(10, 2) DEFAULT 0.00,
      discount_amount DECIMAL(10, 2) DEFAULT 0.00,
      total DECIMAL(10, 2) DEFAULT 0.00,
      currency_id BIGINT UNSIGNED NOT NULL,
      is_joined TINYINT(1) DEFAULT 0,
      joined_tables JSON NULL COMMENT 'IDs of joined tables',
      guest_name VARCHAR(255),
      guest_phone VARCHAR(50),
      delivery_address TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY unique_tenant_store_number (tenant_id, store_id, order_number),
      INDEX idx_tenant_store (tenant_id, store_id),
      INDEX idx_status (order_status),
      INDEX idx_customer (tenant_customer_id),
      INDEX idx_waiter (tenant_waiter_id),
      INDEX idx_table (table_id),
      INDEX idx_source (tenant_order_source_id),
      INDEX idx_type (tenant_order_type_id),
      INDEX idx_payment_status (tenant_payment_status_id),
      INDEX idx_created (created_at),
      CONSTRAINT fk_ord_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      CONSTRAINT fk_ord_store FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
      CONSTRAINT fk_ord_customer FOREIGN KEY (tenant_customer_id) REFERENCES tenant_customers(id) ON DELETE SET NULL,
      CONSTRAINT fk_ord_waiter FOREIGN KEY (tenant_waiter_id) REFERENCES tenant_waiters(id) ON DELETE SET NULL,
      CONSTRAINT fk_ord_table FOREIGN KEY (table_id) REFERENCES tenant_table_structures(id) ON DELETE SET NULL,
      CONSTRAINT fk_ord_source FOREIGN KEY (tenant_order_source_id) REFERENCES tenant_order_sources(id),
      CONSTRAINT fk_ord_type FOREIGN KEY (tenant_order_type_id) REFERENCES tenant_order_types(id),
      CONSTRAINT fk_ord_ps FOREIGN KEY (tenant_payment_status_id) REFERENCES tenant_payment_statuses(id) ON DELETE SET NULL,
      CONSTRAINT fk_ord_currency FOREIGN KEY (currency_id) REFERENCES currencies(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // =====================================================
  // ORDER ITEMS (per-item payment tracking)
  // =====================================================
  await connection.query(`
    CREATE TABLE IF NOT EXISTS order_items (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      order_id BIGINT UNSIGNED NOT NULL,
      original_order_id BIGINT UNSIGNED NULL COMMENT 'For joined orders - tracks originating order',
      tenant_menu_item_id BIGINT UNSIGNED NOT NULL,
      tenant_order_item_status_id BIGINT UNSIGNED NOT NULL,
      quantity INT NOT NULL DEFAULT 1,
      unit_price DECIMAL(10, 2) NOT NULL,
      total_price DECIMAL(10, 2) NOT NULL,
      weighted_portion DECIMAL(8, 3) NULL COMMENT 'Actual weight in grams/kg',
      selected_addons JSON NULL COMMENT 'Snapshot: [{addon_id, addon_type_id, name, price, quantity}]',
      selected_ingredients JSON NULL COMMENT 'Snapshot: [{ingredient_id, name, removed: true/false}]',
      is_paid TINYINT(1) DEFAULT 0,
      amount_paid DECIMAL(10, 2) DEFAULT 0.00,
      payment_history JSON NULL COMMENT '[{payment_id, amount, timestamp}]',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_order (order_id),
      INDEX idx_order_paid (order_id, is_paid),
      INDEX idx_menu_item (tenant_menu_item_id),
      INDEX idx_status (tenant_order_item_status_id),
      INDEX idx_original_order (original_order_id),
      CONSTRAINT fk_oi_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      CONSTRAINT fk_oi_original FOREIGN KEY (original_order_id) REFERENCES orders(id) ON DELETE SET NULL,
      CONSTRAINT fk_oi_item FOREIGN KEY (tenant_menu_item_id) REFERENCES tenant_menu_items(id),
      CONSTRAINT fk_oi_status FOREIGN KEY (tenant_order_item_status_id) REFERENCES tenant_order_item_statuses(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  console.log('✅ Migration 009 completed: Order tables created');
  console.log('   - tenant_order_sources + translations');
  console.log('   - tenant_order_types + translations');
  console.log('   - tenant_order_item_statuses + translations');
  console.log('   - tenant_payment_statuses + translations');
  console.log('   - orders');
  console.log('   - order_items (per-item payment tracking)');
}

export async function down(connection: mysql.Connection): Promise<void> {
  console.log('Rolling back migration: 009_create_orders');

  await connection.query('DROP TABLE IF EXISTS order_items');
  await connection.query('DROP TABLE IF EXISTS orders');
  await connection.query('DROP TABLE IF EXISTS tenant_payment_status_translations');
  await connection.query('DROP TABLE IF EXISTS tenant_payment_statuses');
  await connection.query('DROP TABLE IF EXISTS tenant_order_item_status_translations');
  await connection.query('DROP TABLE IF EXISTS tenant_order_item_statuses');
  await connection.query('DROP TABLE IF EXISTS tenant_order_type_translations');
  await connection.query('DROP TABLE IF EXISTS tenant_order_types');
  await connection.query('DROP TABLE IF EXISTS tenant_order_source_translations');
  await connection.query('DROP TABLE IF EXISTS tenant_order_sources');

  console.log('✅ Migration 009 rolled back');
}
