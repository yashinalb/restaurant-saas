import mysql from 'mysql2/promise';

export async function up(connection: mysql.Connection): Promise<void> {
  console.log('Running migration: 012_create_expenses');

  // =====================================================
  // TENANT EXPENSE CATEGORIES (copy from master)
  // =====================================================
  await connection.query(`
    CREATE TABLE IF NOT EXISTS tenant_expense_categories (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      tenant_id BIGINT UNSIGNED NOT NULL,
      master_expense_category_id BIGINT UNSIGNED NULL,
      code VARCHAR(50) NOT NULL,
      icon VARCHAR(100),
      sort_order INT DEFAULT 0,
      is_active TINYINT(1) DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY unique_tenant_code (tenant_id, code),
      INDEX idx_tenant (tenant_id),
      CONSTRAINT fk_tec_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      CONSTRAINT fk_tec_master FOREIGN KEY (master_expense_category_id) REFERENCES master_expense_categories(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS tenant_expense_category_translations (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      tenant_expense_category_id BIGINT UNSIGNED NOT NULL,
      language_id BIGINT UNSIGNED NOT NULL,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      UNIQUE KEY unique_ec_lang (tenant_expense_category_id, language_id),
      CONSTRAINT fk_tect_category FOREIGN KEY (tenant_expense_category_id) REFERENCES tenant_expense_categories(id) ON DELETE CASCADE,
      CONSTRAINT fk_tect_language FOREIGN KEY (language_id) REFERENCES languages(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // =====================================================
  // TENANT EXPENSE SOURCES (sub-categories)
  // =====================================================
  await connection.query(`
    CREATE TABLE IF NOT EXISTS tenant_expense_sources (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      tenant_id BIGINT UNSIGNED NOT NULL,
      tenant_expense_category_id BIGINT UNSIGNED NOT NULL,
      is_active TINYINT(1) DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_tenant (tenant_id),
      INDEX idx_category (tenant_expense_category_id),
      CONSTRAINT fk_tes_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      CONSTRAINT fk_tes_category FOREIGN KEY (tenant_expense_category_id) REFERENCES tenant_expense_categories(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS tenant_expense_source_translations (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      tenant_expense_source_id BIGINT UNSIGNED NOT NULL,
      language_id BIGINT UNSIGNED NOT NULL,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      UNIQUE KEY unique_es_lang (tenant_expense_source_id, language_id),
      CONSTRAINT fk_test_source FOREIGN KEY (tenant_expense_source_id) REFERENCES tenant_expense_sources(id) ON DELETE CASCADE,
      CONSTRAINT fk_test_language FOREIGN KEY (language_id) REFERENCES languages(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // =====================================================
  // EXPENSES
  // =====================================================
  await connection.query(`
    CREATE TABLE IF NOT EXISTS expenses (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      tenant_id BIGINT UNSIGNED NOT NULL,
      store_id BIGINT UNSIGNED NULL COMMENT 'NULL = tenant-level expense',
      tenant_expense_source_id BIGINT UNSIGNED NOT NULL,
      invoice_number VARCHAR(100),
      description TEXT NOT NULL,
      amount DECIMAL(10, 2) NOT NULL,
      currency_id BIGINT UNSIGNED NOT NULL,
      due_date DATE NULL,
      payment_status ENUM('unpaid', 'partially_paid', 'paid') DEFAULT 'unpaid',
      attachment_url VARCHAR(500),
      notes TEXT,
      created_by BIGINT UNSIGNED NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_tenant (tenant_id),
      INDEX idx_store (store_id),
      INDEX idx_source (tenant_expense_source_id),
      INDEX idx_status (payment_status),
      INDEX idx_due_date (due_date),
      INDEX idx_created (created_at),
      CONSTRAINT fk_exp_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      CONSTRAINT fk_exp_store FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE SET NULL,
      CONSTRAINT fk_exp_source FOREIGN KEY (tenant_expense_source_id) REFERENCES tenant_expense_sources(id),
      CONSTRAINT fk_exp_currency FOREIGN KEY (currency_id) REFERENCES currencies(id),
      CONSTRAINT fk_exp_created_by FOREIGN KEY (created_by) REFERENCES admin_users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // =====================================================
  // EXPENSE PAYMENTS
  // =====================================================
  await connection.query(`
    CREATE TABLE IF NOT EXISTS expense_payments (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      expense_id BIGINT UNSIGNED NOT NULL,
      tenant_payment_type_id BIGINT UNSIGNED NULL,
      currency_id BIGINT UNSIGNED NOT NULL,
      amount DECIMAL(10, 2) NOT NULL,
      payment_date DATE NOT NULL,
      reference_number VARCHAR(100),
      notes TEXT,
      paid_by BIGINT UNSIGNED NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_expense (expense_id),
      INDEX idx_date (payment_date),
      CONSTRAINT fk_ep_expense FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE CASCADE,
      CONSTRAINT fk_ep_payment_type FOREIGN KEY (tenant_payment_type_id) REFERENCES tenant_payment_types(id) ON DELETE SET NULL,
      CONSTRAINT fk_ep_currency FOREIGN KEY (currency_id) REFERENCES currencies(id),
      CONSTRAINT fk_ep_paid_by FOREIGN KEY (paid_by) REFERENCES admin_users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  console.log('✅ Migration 012 completed: Expense tables created');
  console.log('   - tenant_expense_categories + translations');
  console.log('   - tenant_expense_sources + translations');
  console.log('   - expenses');
  console.log('   - expense_payments');
}

export async function down(connection: mysql.Connection): Promise<void> {
  console.log('Rolling back migration: 012_create_expenses');

  await connection.query('DROP TABLE IF EXISTS expense_payments');
  await connection.query('DROP TABLE IF EXISTS expenses');
  await connection.query('DROP TABLE IF EXISTS tenant_expense_source_translations');
  await connection.query('DROP TABLE IF EXISTS tenant_expense_sources');
  await connection.query('DROP TABLE IF EXISTS tenant_expense_category_translations');
  await connection.query('DROP TABLE IF EXISTS tenant_expense_categories');

  console.log('✅ Migration 012 rolled back');
}
