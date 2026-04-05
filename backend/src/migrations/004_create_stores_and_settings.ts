import mysql from 'mysql2/promise';

export async function up(connection: mysql.Connection): Promise<void> {
  console.log('Running migration: 004_create_stores_and_settings');

  // Stores - physical restaurant locations per tenant
  await connection.query(`
    CREATE TABLE IF NOT EXISTS stores (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      tenant_id BIGINT UNSIGNED NOT NULL,
      name VARCHAR(255) NOT NULL,
      slug VARCHAR(255) NOT NULL,
      code VARCHAR(50),
      address TEXT,
      city VARCHAR(100),
      postal_code VARCHAR(20),
      country_code VARCHAR(3),
      phone VARCHAR(50),
      email VARCHAR(255),
      latitude DECIMAL(10, 8),
      longitude DECIMAL(11, 8),
      timezone VARCHAR(50) DEFAULT 'UTC',
      opening_hours JSON,
      table_count INT DEFAULT 0,
      kitchen_printer_ip VARCHAR(45),
      bar_printer_ip VARCHAR(45),
      receipt_printer_ip VARCHAR(45),
      kds_enabled TINYINT(1) DEFAULT 0 COMMENT 'Kitchen Display System',
      kiosk_enabled TINYINT(1) DEFAULT 0,
      online_ordering_enabled TINYINT(1) DEFAULT 0,
      qr_ordering_enabled TINYINT(1) DEFAULT 0,
      default_tax_rate DECIMAL(5, 2) DEFAULT 0.00,
      service_charge_rate DECIMAL(5, 2) DEFAULT 0.00,
      is_active TINYINT(1) DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY unique_tenant_slug (tenant_id, slug),
      INDEX idx_tenant_active (tenant_id, is_active),
      INDEX idx_code (code),
      CONSTRAINT fk_stores_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Tenant settings - key-value settings per tenant
  await connection.query(`
    CREATE TABLE IF NOT EXISTS tenant_settings (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      tenant_id BIGINT UNSIGNED NOT NULL,
      setting_key VARCHAR(100) NOT NULL,
      setting_value TEXT,
      setting_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY unique_tenant_setting (tenant_id, setting_key),
      INDEX idx_tenant (tenant_id),
      CONSTRAINT fk_tset_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  console.log('✅ Migration 004 completed: Stores and settings tables created');
  console.log('   - stores (physical restaurant locations)');
  console.log('   - tenant_settings (key-value settings per tenant)');
}

export async function down(connection: mysql.Connection): Promise<void> {
  console.log('Rolling back migration: 004_create_stores_and_settings');

  await connection.query('DROP TABLE IF EXISTS tenant_settings');
  await connection.query('DROP TABLE IF EXISTS stores');

  console.log('✅ Migration 004 rolled back');
}
