import mysql from 'mysql2/promise';

export async function up(connection: mysql.Connection): Promise<void> {
  console.log('Running migration: 011_create_inventory_and_suppliers');

  // =====================================================
  // SUPPLIERS
  // =====================================================
  await connection.query(`
    CREATE TABLE IF NOT EXISTS tenant_suppliers (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      tenant_id BIGINT UNSIGNED NOT NULL,
      name VARCHAR(255) NOT NULL,
      contact_person VARCHAR(255),
      phone VARCHAR(50),
      email VARCHAR(255),
      address TEXT,
      tax_id VARCHAR(100),
      notes TEXT,
      is_active TINYINT(1) DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_tenant (tenant_id),
      INDEX idx_tenant_active (tenant_id, is_active),
      CONSTRAINT fk_tsup_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // =====================================================
  // INVENTORY PRODUCTS (raw materials / supplies)
  // =====================================================
  await connection.query(`
    CREATE TABLE IF NOT EXISTS tenant_inventory_products (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      tenant_id BIGINT UNSIGNED NOT NULL,
      product_code VARCHAR(50) NULL,
      name VARCHAR(255) NOT NULL,
      unit_in_stock DECIMAL(10, 3) DEFAULT 0,
      is_weighted TINYINT(1) DEFAULT 0,
      has_carton TINYINT(1) DEFAULT 0,
      units_per_carton INT NULL,
      buying_price_excl_vat DECIMAL(10, 2) NULL,
      vat_type ENUM('percentage', 'exempt') DEFAULT 'percentage',
      vat_percentage DECIMAL(5, 2) DEFAULT 0.00,
      buying_price_incl_vat DECIMAL(10, 2) NULL,
      low_stock_threshold DECIMAL(10, 3) DEFAULT 0,
      is_active TINYINT(1) DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY unique_tenant_code (tenant_id, product_code),
      INDEX idx_tenant_active (tenant_id, is_active),
      CONSTRAINT fk_tip_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Many-to-many: which supplier provides which product
  await connection.query(`
    CREATE TABLE IF NOT EXISTS tenant_inventory_product_suppliers (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      tenant_inventory_product_id BIGINT UNSIGNED NOT NULL,
      tenant_supplier_id BIGINT UNSIGNED NOT NULL,
      is_primary TINYINT(1) DEFAULT 0,
      supplier_sku VARCHAR(100),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_product_supplier (tenant_inventory_product_id, tenant_supplier_id),
      INDEX idx_product (tenant_inventory_product_id),
      INDEX idx_supplier (tenant_supplier_id),
      CONSTRAINT fk_tips_product FOREIGN KEY (tenant_inventory_product_id) REFERENCES tenant_inventory_products(id) ON DELETE CASCADE,
      CONSTRAINT fk_tips_supplier FOREIGN KEY (tenant_supplier_id) REFERENCES tenant_suppliers(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // =====================================================
  // SUPPLIER INVOICES
  // =====================================================
  await connection.query(`
    CREATE TABLE IF NOT EXISTS supplier_invoices (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      tenant_id BIGINT UNSIGNED NOT NULL,
      tenant_supplier_id BIGINT UNSIGNED NOT NULL,
      invoice_number VARCHAR(100) NOT NULL,
      invoice_date DATETIME NOT NULL,
      total_amount_before_vat DECIMAL(10, 2) NULL,
      total_vat_amount DECIMAL(10, 2) NULL,
      total_amount DECIMAL(10, 2) NOT NULL,
      currency_id BIGINT UNSIGNED NOT NULL,
      stock_status ENUM('pending', 'partial', 'received') DEFAULT 'received',
      notes TEXT,
      received_by BIGINT UNSIGNED NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_tenant (tenant_id),
      INDEX idx_supplier (tenant_supplier_id),
      INDEX idx_date (invoice_date),
      CONSTRAINT fk_si_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      CONSTRAINT fk_si_supplier FOREIGN KEY (tenant_supplier_id) REFERENCES tenant_suppliers(id),
      CONSTRAINT fk_si_currency FOREIGN KEY (currency_id) REFERENCES currencies(id),
      CONSTRAINT fk_si_received_by FOREIGN KEY (received_by) REFERENCES admin_users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // =====================================================
  // STOCK INTAKES
  // =====================================================
  await connection.query(`
    CREATE TABLE IF NOT EXISTS stock_intakes (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      tenant_id BIGINT UNSIGNED NOT NULL,
      store_id BIGINT UNSIGNED NOT NULL,
      tenant_supplier_id BIGINT UNSIGNED NOT NULL,
      supplier_invoice_id BIGINT UNSIGNED NULL,
      tenant_inventory_product_id BIGINT UNSIGNED NOT NULL,
      quantity_ordered DECIMAL(10, 3) NULL,
      quantity_received DECIMAL(10, 3) NOT NULL,
      is_carton TINYINT(1) DEFAULT 0,
      units_in_carton INT NULL,
      total_units_received DECIMAL(10, 3) NULL,
      notes TEXT,
      received_by BIGINT UNSIGNED NULL,
      received_at DATETIME NOT NULL,
      status ENUM('complete', 'partial', 'pending') DEFAULT 'complete',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_tenant_store (tenant_id, store_id),
      INDEX idx_supplier (tenant_supplier_id),
      INDEX idx_invoice (supplier_invoice_id),
      INDEX idx_product (tenant_inventory_product_id),
      INDEX idx_received_at (received_at),
      CONSTRAINT fk_stk_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      CONSTRAINT fk_stk_store FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
      CONSTRAINT fk_stk_supplier FOREIGN KEY (tenant_supplier_id) REFERENCES tenant_suppliers(id),
      CONSTRAINT fk_stk_invoice FOREIGN KEY (supplier_invoice_id) REFERENCES supplier_invoices(id) ON DELETE SET NULL,
      CONSTRAINT fk_stk_product FOREIGN KEY (tenant_inventory_product_id) REFERENCES tenant_inventory_products(id),
      CONSTRAINT fk_stk_received_by FOREIGN KEY (received_by) REFERENCES admin_users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // =====================================================
  // SUPPLIER CREDITS
  // =====================================================
  await connection.query(`
    CREATE TABLE IF NOT EXISTS supplier_credits (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      tenant_id BIGINT UNSIGNED NOT NULL,
      tenant_supplier_id BIGINT UNSIGNED NOT NULL,
      supplier_invoice_id BIGINT UNSIGNED NULL,
      credit_amount DECIMAL(10, 2) NOT NULL,
      amount_paid DECIMAL(10, 2) DEFAULT 0.00,
      balance DECIMAL(10, 2) NOT NULL,
      currency_id BIGINT UNSIGNED NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_tenant (tenant_id),
      INDEX idx_supplier (tenant_supplier_id),
      CONSTRAINT fk_sc_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      CONSTRAINT fk_sc_supplier FOREIGN KEY (tenant_supplier_id) REFERENCES tenant_suppliers(id) ON DELETE CASCADE,
      CONSTRAINT fk_sc_invoice FOREIGN KEY (supplier_invoice_id) REFERENCES supplier_invoices(id) ON DELETE SET NULL,
      CONSTRAINT fk_sc_currency FOREIGN KEY (currency_id) REFERENCES currencies(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // =====================================================
  // SUPPLIER PAYMENT RECORDS
  // =====================================================
  await connection.query(`
    CREATE TABLE IF NOT EXISTS supplier_payment_records (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      tenant_id BIGINT UNSIGNED NOT NULL,
      supplier_credit_id BIGINT UNSIGNED NOT NULL,
      tenant_payment_type_id BIGINT UNSIGNED NOT NULL,
      paid_by BIGINT UNSIGNED NOT NULL,
      payment_amount DECIMAL(10, 2) NOT NULL,
      payment_date DATE NOT NULL,
      currency_id BIGINT UNSIGNED NOT NULL,
      reference_number VARCHAR(100),
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_tenant (tenant_id),
      INDEX idx_credit (supplier_credit_id),
      INDEX idx_date (payment_date),
      CONSTRAINT fk_spr_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      CONSTRAINT fk_spr_credit FOREIGN KEY (supplier_credit_id) REFERENCES supplier_credits(id) ON DELETE CASCADE,
      CONSTRAINT fk_spr_payment_type FOREIGN KEY (tenant_payment_type_id) REFERENCES tenant_payment_types(id),
      CONSTRAINT fk_spr_paid_by FOREIGN KEY (paid_by) REFERENCES admin_users(id),
      CONSTRAINT fk_spr_currency FOREIGN KEY (currency_id) REFERENCES currencies(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  console.log('✅ Migration 011 completed: Inventory and supplier tables created');
  console.log('   - tenant_suppliers');
  console.log('   - tenant_inventory_products + product_suppliers');
  console.log('   - supplier_invoices');
  console.log('   - stock_intakes');
  console.log('   - supplier_credits + supplier_payment_records');
}

export async function down(connection: mysql.Connection): Promise<void> {
  console.log('Rolling back migration: 011_create_inventory_and_suppliers');

  await connection.query('DROP TABLE IF EXISTS supplier_payment_records');
  await connection.query('DROP TABLE IF EXISTS supplier_credits');
  await connection.query('DROP TABLE IF EXISTS stock_intakes');
  await connection.query('DROP TABLE IF EXISTS supplier_invoices');
  await connection.query('DROP TABLE IF EXISTS tenant_inventory_product_suppliers');
  await connection.query('DROP TABLE IF EXISTS tenant_inventory_products');
  await connection.query('DROP TABLE IF EXISTS tenant_suppliers');

  console.log('✅ Migration 011 rolled back');
}
