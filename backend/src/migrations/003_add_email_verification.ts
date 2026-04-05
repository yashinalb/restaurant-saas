import mysql from 'mysql2/promise';

export async function up(connection: mysql.Connection): Promise<void> {
  console.log('Running migration: 003_add_email_verification');

  // Add email_verified_at column to admin_users table
  await connection.query(`
    ALTER TABLE admin_users
    ADD COLUMN email_verified_at DATETIME NULL COMMENT 'Timestamp when email was verified'
    AFTER is_active
  `);

  // Add index for faster queries on verified status
  await connection.query(`
    ALTER TABLE admin_users
    ADD INDEX idx_email_verified (email_verified_at)
  `);

  // Create email verification tokens table
  await connection.query(`
    CREATE TABLE IF NOT EXISTS email_verification_tokens (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      admin_user_id BIGINT UNSIGNED NOT NULL,
      token_hash VARCHAR(64) NOT NULL COMMENT 'SHA256 hash of verification token',
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      used_at DATETIME NULL,
      ip_address VARCHAR(45) NULL COMMENT 'IP address when token was requested',
      user_agent TEXT NULL,

      UNIQUE KEY uq_token_hash (token_hash),
      INDEX idx_admin_user (admin_user_id),
      INDEX idx_expires (expires_at),
      INDEX idx_used (used_at),

      CONSTRAINT fk_evt_admin FOREIGN KEY (admin_user_id)
        REFERENCES admin_users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  console.log('✅ Migration 003 completed: Email verification added');
  console.log('   - Added email_verified_at column to admin_users');
  console.log('   - Created email_verification_tokens table');
  console.log('   - Added index for faster verification status queries');
}

export async function down(connection: mysql.Connection): Promise<void> {
  console.log('Rolling back migration: 003_add_email_verification');

  // Drop email verification tokens table
  await connection.query('DROP TABLE IF EXISTS email_verification_tokens');

  // Remove index and column from admin_users
  await connection.query('ALTER TABLE admin_users DROP INDEX idx_email_verified');
  await connection.query('ALTER TABLE admin_users DROP COLUMN email_verified_at');

  console.log('✅ Migration 003 rolled back');
}
