import mysql from 'mysql2/promise';

export async function up(connection: mysql.Connection): Promise<void> {
  console.log('Running migration: 013_create_kds_and_reporting');

  // =====================================================
  // KDS ORDERS (Kitchen Display System queue)
  // =====================================================
  await connection.query(`
    CREATE TABLE IF NOT EXISTS kds_orders (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      tenant_id BIGINT UNSIGNED NOT NULL,
      store_id BIGINT UNSIGNED NOT NULL,
      order_id BIGINT UNSIGNED NOT NULL,
      order_item_id BIGINT UNSIGNED NOT NULL,
      tenant_order_destination_id BIGINT UNSIGNED NOT NULL,
      status ENUM('pending', 'preparing', 'ready', 'served', 'cancelled') DEFAULT 'pending',
      priority INT DEFAULT 0 COMMENT '0=normal, 1=rush',
      started_at DATETIME NULL,
      completed_at DATETIME NULL,
      estimated_prep_time INT NULL COMMENT 'Minutes',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_store_dest_status (store_id, tenant_order_destination_id, status),
      INDEX idx_order (order_id),
      INDEX idx_item (order_item_id),
      INDEX idx_created (created_at),
      CONSTRAINT fk_kds_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      CONSTRAINT fk_kds_store FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
      CONSTRAINT fk_kds_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      CONSTRAINT fk_kds_item FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE CASCADE,
      CONSTRAINT fk_kds_dest FOREIGN KEY (tenant_order_destination_id) REFERENCES tenant_order_destinations(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // =====================================================
  // DAILY REPORT SNAPSHOTS (end-of-day summaries)
  // =====================================================
  await connection.query(`
    CREATE TABLE IF NOT EXISTS daily_report_snapshots (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      tenant_id BIGINT UNSIGNED NOT NULL,
      store_id BIGINT UNSIGNED NOT NULL,
      report_date DATE NOT NULL,
      total_orders INT DEFAULT 0,
      total_revenue DECIMAL(12, 2) DEFAULT 0.00,
      total_tax DECIMAL(12, 2) DEFAULT 0.00,
      total_tips DECIMAL(12, 2) DEFAULT 0.00,
      total_discounts DECIMAL(12, 2) DEFAULT 0.00,
      total_refunds DECIMAL(12, 2) DEFAULT 0.00,
      total_expenses DECIMAL(12, 2) DEFAULT 0.00,
      order_count_by_type JSON COMMENT '{dine_in: 50, takeaway: 30, delivery: 20}',
      payment_breakdown JSON COMMENT '{cash: 5000, card: 3000, mobile: 1000}',
      currency_id BIGINT UNSIGNED NOT NULL,
      generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_tenant_store_date (tenant_id, store_id, report_date, currency_id),
      INDEX idx_date (report_date),
      CONSTRAINT fk_drs_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      CONSTRAINT fk_drs_store FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
      CONSTRAINT fk_drs_currency FOREIGN KEY (currency_id) REFERENCES currencies(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // =====================================================
  // CASH REGISTER SESSIONS (shift tracking)
  // =====================================================
  await connection.query(`
    CREATE TABLE IF NOT EXISTS cash_register_sessions (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      tenant_id BIGINT UNSIGNED NOT NULL,
      store_id BIGINT UNSIGNED NOT NULL,
      opened_by BIGINT UNSIGNED NOT NULL,
      closed_by BIGINT UNSIGNED NULL,
      opening_amount DECIMAL(10, 2) NOT NULL,
      closing_amount DECIMAL(10, 2) NULL,
      expected_amount DECIMAL(10, 2) NULL,
      difference DECIMAL(10, 2) NULL,
      currency_id BIGINT UNSIGNED NOT NULL,
      opened_at DATETIME NOT NULL,
      closed_at DATETIME NULL,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_tenant_store (tenant_id, store_id),
      INDEX idx_opened (opened_at),
      INDEX idx_status (closed_at),
      CONSTRAINT fk_crs_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      CONSTRAINT fk_crs_store FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
      CONSTRAINT fk_crs_opened_by FOREIGN KEY (opened_by) REFERENCES admin_users(id),
      CONSTRAINT fk_crs_closed_by FOREIGN KEY (closed_by) REFERENCES admin_users(id) ON DELETE SET NULL,
      CONSTRAINT fk_crs_currency FOREIGN KEY (currency_id) REFERENCES currencies(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  console.log('✅ Migration 013 completed: KDS and reporting tables created');
  console.log('   - kds_orders (Kitchen Display System)');
  console.log('   - daily_report_snapshots');
  console.log('   - cash_register_sessions');
}

export async function down(connection: mysql.Connection): Promise<void> {
  console.log('Rolling back migration: 013_create_kds_and_reporting');

  await connection.query('DROP TABLE IF EXISTS cash_register_sessions');
  await connection.query('DROP TABLE IF EXISTS daily_report_snapshots');
  await connection.query('DROP TABLE IF EXISTS kds_orders');

  console.log('✅ Migration 013 rolled back');
}
