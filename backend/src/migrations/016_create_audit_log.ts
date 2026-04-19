import mysql from 'mysql2/promise';

export async function up(connection: mysql.Connection): Promise<void> {
  console.log('Running migration: 016_create_audit_log');

  await connection.query(`
    CREATE TABLE IF NOT EXISTS audit_log (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      tenant_id BIGINT UNSIGNED NOT NULL,
      store_id BIGINT UNSIGNED NULL,
      admin_user_id BIGINT UNSIGNED NULL,
      tenant_waiter_id BIGINT UNSIGNED NULL,
      action VARCHAR(64) NOT NULL COMMENT 'e.g. void_order, void_item, ikram, discount, refund, reprint_receipt, reprint_ticket, drawer_open',
      target_type VARCHAR(64) NULL COMMENT 'e.g. order, order_item, transaction',
      target_id BIGINT UNSIGNED NULL,
      reason VARCHAR(255) NULL,
      before_json JSON NULL,
      after_json JSON NULL,
      ip_address VARCHAR(45) NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_tenant_created (tenant_id, created_at),
      INDEX idx_tenant_action (tenant_id, action),
      INDEX idx_tenant_target (tenant_id, target_type, target_id),
      INDEX idx_admin_user (admin_user_id),
      INDEX idx_waiter (tenant_waiter_id),
      CONSTRAINT fk_audit_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      CONSTRAINT fk_audit_store FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE SET NULL,
      CONSTRAINT fk_audit_admin FOREIGN KEY (admin_user_id) REFERENCES admin_users(id) ON DELETE SET NULL,
      CONSTRAINT fk_audit_waiter FOREIGN KEY (tenant_waiter_id) REFERENCES tenant_waiters(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  console.log('✅ Migration 016 completed: audit_log table created');
}

export async function down(connection: mysql.Connection): Promise<void> {
  console.log('Rolling back migration: 016_create_audit_log');
  await connection.query('DROP TABLE IF EXISTS audit_log');
  console.log('✅ Migration 016 rolled back');
}
