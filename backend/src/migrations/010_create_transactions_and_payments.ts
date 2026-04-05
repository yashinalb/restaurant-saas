import mysql from 'mysql2/promise';

export async function up(connection: mysql.Connection): Promise<void> {
  console.log('Running migration: 010_create_transactions_and_payments');

  // =====================================================
  // TENANT PAYMENT TYPES (copy from master)
  // =====================================================
  await connection.query(`
    CREATE TABLE IF NOT EXISTS tenant_payment_types (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      tenant_id BIGINT UNSIGNED NOT NULL,
      master_payment_type_id BIGINT UNSIGNED NULL,
      code VARCHAR(50) NOT NULL,
      icon VARCHAR(100),
      sort_order INT DEFAULT 0,
      is_active TINYINT(1) DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY unique_tenant_code (tenant_id, code),
      INDEX idx_tenant (tenant_id),
      CONSTRAINT fk_tpt_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      CONSTRAINT fk_tpt_master FOREIGN KEY (master_payment_type_id) REFERENCES master_payment_types(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS tenant_payment_type_translations (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      tenant_payment_type_id BIGINT UNSIGNED NOT NULL,
      language_id BIGINT UNSIGNED NOT NULL,
      name VARCHAR(255) NOT NULL,
      UNIQUE KEY unique_pt_lang (tenant_payment_type_id, language_id),
      CONSTRAINT fk_tptt_type FOREIGN KEY (tenant_payment_type_id) REFERENCES tenant_payment_types(id) ON DELETE CASCADE,
      CONSTRAINT fk_tptt_language FOREIGN KEY (language_id) REFERENCES languages(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // =====================================================
  // TRANSACTIONS (per order)
  // =====================================================
  await connection.query(`
    CREATE TABLE IF NOT EXISTS transactions (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      tenant_id BIGINT UNSIGNED NOT NULL,
      store_id BIGINT UNSIGNED NOT NULL,
      order_id BIGINT UNSIGNED NOT NULL,
      tenant_payment_status_id BIGINT UNSIGNED NOT NULL,
      currency_id BIGINT UNSIGNED NOT NULL,
      amount_before_vat DECIMAL(10, 2) NOT NULL,
      vat_amount DECIMAL(10, 2) NOT NULL,
      service_charge DECIMAL(10, 2) DEFAULT 0.00,
      total_amount DECIMAL(10, 2) NOT NULL,
      total_paid DECIMAL(10, 2) DEFAULT 0.00,
      amount_remaining DECIMAL(10, 2) NULL,
      is_joined TINYINT(1) DEFAULT 0,
      joined_to_transaction_id BIGINT UNSIGNED NULL,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_tenant_store (tenant_id, store_id),
      INDEX idx_order (order_id),
      INDEX idx_payment_status (tenant_payment_status_id, total_paid),
      INDEX idx_joined (joined_to_transaction_id),
      INDEX idx_created (created_at),
      CONSTRAINT fk_txn_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      CONSTRAINT fk_txn_store FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
      CONSTRAINT fk_txn_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      CONSTRAINT fk_txn_ps FOREIGN KEY (tenant_payment_status_id) REFERENCES tenant_payment_statuses(id),
      CONSTRAINT fk_txn_currency FOREIGN KEY (currency_id) REFERENCES currencies(id),
      CONSTRAINT fk_txn_joined FOREIGN KEY (joined_to_transaction_id) REFERENCES transactions(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // =====================================================
  // TRANSACTION PAYMENTS (multi-currency, multiple modes)
  // =====================================================
  await connection.query(`
    CREATE TABLE IF NOT EXISTS transaction_payments (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      transaction_id BIGINT UNSIGNED NOT NULL,
      tenant_payment_type_id BIGINT UNSIGNED NOT NULL,
      currency_id BIGINT UNSIGNED NOT NULL,
      amount DECIMAL(10, 2) NOT NULL,
      amount_due DECIMAL(10, 2) NULL COMMENT 'Remaining after this payment',
      payment_mode ENUM('full', 'partial', 'per_item', 'mixed') DEFAULT 'full',
      paid_items JSON NULL COMMENT '[{order_item_id, amount}] for per_item mode',
      exchange_rate DECIMAL(10, 6) NULL COMMENT 'If paying in different currency',
      reference_number VARCHAR(100) COMMENT 'Card auth, mobile pay ref, etc.',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_transaction (transaction_id),
      INDEX idx_payment_type (tenant_payment_type_id),
      INDEX idx_payment_mode (payment_mode),
      INDEX idx_created (created_at),
      CONSTRAINT fk_tp_transaction FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
      CONSTRAINT fk_tp_payment_type FOREIGN KEY (tenant_payment_type_id) REFERENCES tenant_payment_types(id),
      CONSTRAINT fk_tp_currency FOREIGN KEY (currency_id) REFERENCES currencies(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // =====================================================
  // QR INVOICE TOKENS
  // =====================================================
  await connection.query(`
    CREATE TABLE IF NOT EXISTS qr_invoice_tokens (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      tenant_id BIGINT UNSIGNED NOT NULL,
      order_id BIGINT UNSIGNED NOT NULL,
      table_id BIGINT UNSIGNED NOT NULL,
      token VARCHAR(255) UNIQUE NOT NULL,
      status ENUM('active', 'expired', 'used') DEFAULT 'active',
      expires_at DATETIME NOT NULL,
      metadata JSON NULL,
      last_accessed_at DATETIME NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_token_status (token, status),
      INDEX idx_expires_status (expires_at, status),
      INDEX idx_order (order_id),
      INDEX idx_tenant (tenant_id),
      CONSTRAINT fk_qit_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      CONSTRAINT fk_qit_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      CONSTRAINT fk_qit_table FOREIGN KEY (table_id) REFERENCES tenant_table_structures(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  console.log('✅ Migration 010 completed: Transactions and payments created');
  console.log('   - tenant_payment_types + translations');
  console.log('   - transactions');
  console.log('   - transaction_payments (multi-currency, multi-mode)');
  console.log('   - qr_invoice_tokens');
}

export async function down(connection: mysql.Connection): Promise<void> {
  console.log('Rolling back migration: 010_create_transactions_and_payments');

  await connection.query('DROP TABLE IF EXISTS qr_invoice_tokens');
  await connection.query('DROP TABLE IF EXISTS transaction_payments');
  await connection.query('DROP TABLE IF EXISTS transactions');
  await connection.query('DROP TABLE IF EXISTS tenant_payment_type_translations');
  await connection.query('DROP TABLE IF EXISTS tenant_payment_types');

  console.log('✅ Migration 010 rolled back');
}
