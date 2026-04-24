import mysql from 'mysql2/promise';

export async function up(connection: mysql.Connection): Promise<void> {
  console.log('Running migration: 020_create_banner_interactions');

  await connection.query(`
    CREATE TABLE IF NOT EXISTS banner_interactions (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      tenant_id BIGINT UNSIGNED NOT NULL,
      banner_id BIGINT UNSIGNED NOT NULL,
      interaction_type ENUM('impression','click') NOT NULL DEFAULT 'impression',
      ip_address VARCHAR(45) NULL,
      user_agent TEXT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_tenant_banner (tenant_id, banner_id),
      INDEX idx_interaction_type (interaction_type),
      INDEX idx_created_at (created_at),
      INDEX idx_tenant_date (tenant_id, created_at),
      CONSTRAINT fk_bi_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      CONSTRAINT fk_bi_banner FOREIGN KEY (banner_id) REFERENCES tenant_banners(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  console.log('  ✓ banner_interactions');
}

export async function down(connection: mysql.Connection): Promise<void> {
  await connection.query('DROP TABLE IF EXISTS banner_interactions');
}
