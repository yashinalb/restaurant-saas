import mysql from 'mysql2/promise';

export async function up(connection: mysql.Connection): Promise<void> {
  console.log('Running migration: 017_create_kds_devices');

  // =====================================================
  // KDS DEVICES — one row per paired display (45.1)
  // =====================================================
  await connection.query(`
    CREATE TABLE IF NOT EXISTS kds_devices (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      tenant_id BIGINT UNSIGNED NOT NULL,
      store_id BIGINT UNSIGNED NOT NULL,
      tenant_order_destination_id BIGINT UNSIGNED NOT NULL,
      name VARCHAR(120) NULL,
      pairing_code VARCHAR(12) NULL,
      pairing_code_expires_at DATETIME NULL,
      device_token VARCHAR(128) NULL,
      paired_at DATETIME NULL,
      last_seen_at DATETIME NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_by BIGINT UNSIGNED NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY unique_pairing_code (pairing_code),
      UNIQUE KEY unique_device_token (device_token),
      INDEX idx_tenant_store (tenant_id, store_id),
      INDEX idx_destination (tenant_order_destination_id),
      CONSTRAINT fk_kdev_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      CONSTRAINT fk_kdev_store FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
      CONSTRAINT fk_kdev_dest FOREIGN KEY (tenant_order_destination_id) REFERENCES tenant_order_destinations(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // =====================================================
  // KDS permissions — gates the KDS app (45.1)
  // =====================================================
  await connection.query(`
    INSERT IGNORE INTO permissions (name, display_name, description, module, is_active) VALUES
      ('kds.access', 'Access KDS', 'Can access the Kitchen Display', 'kds', 1),
      ('kds.bump', 'Bump KDS Items', 'Can mark kitchen items ready', 'kds', 1),
      ('kds.recall', 'Recall KDS Items', 'Can recall a bumped ticket', 'kds', 1),
      ('kds.manage_device', 'Manage KDS Devices', 'Can pair, unpair, and view KDS devices', 'kds', 1)
  `);

  console.log('✅ Migration 017 completed: kds_devices + kds permissions');
}

export async function down(connection: mysql.Connection): Promise<void> {
  console.log('Rolling back migration: 017_create_kds_devices');
  await connection.query('DROP TABLE IF EXISTS kds_devices');
  await connection.query(`DELETE FROM permissions WHERE name IN ('kds.access','kds.bump','kds.recall','kds.manage_device')`);
  console.log('✅ Migration 017 rolled back');
}
