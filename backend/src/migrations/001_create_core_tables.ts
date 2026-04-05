import mysql from 'mysql2/promise';

export async function up(connection: mysql.Connection): Promise<void> {
  console.log('Running migration: 001_create_core_tables');

  // Languages table (CREATE FIRST - referenced by tenants)
  await connection.query(`
    CREATE TABLE IF NOT EXISTS languages (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      code VARCHAR(10) UNIQUE NOT NULL,
      name VARCHAR(100) NOT NULL,
      native_name VARCHAR(100) NOT NULL,
      is_rtl TINYINT(1) DEFAULT 0,
      is_active TINYINT(1) DEFAULT 1,
      sort_order INT DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_code (code),
      INDEX idx_is_active (is_active)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Currencies table (CREATE SECOND - referenced by tenants)
  await connection.query(`
    CREATE TABLE IF NOT EXISTS currencies (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      code VARCHAR(3) UNIQUE NOT NULL,
      name VARCHAR(100) NOT NULL,
      symbol VARCHAR(10) NOT NULL,
      exchange_rate DECIMAL(10, 6) DEFAULT 1.000000,
      is_active TINYINT(1) DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_code (code),
      INDEX idx_is_active (is_active)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await connection.query(`
  -- 1. TENANT TYPES (Industry Verticals)
      CREATE TABLE tenant_types (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(50) UNIQUE NOT NULL,  -- e.g., retail, healthcare, education
        icon_url VARCHAR(500),
        sort_order INT DEFAULT 0,
        is_active TINYINT(1) DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_code (code),
        INDEX idx_is_active (is_active)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await connection.query(`
    -- 2. TENANT TYPE TRANSLATIONS
    CREATE TABLE tenant_type_translations (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      tenant_type_id BIGINT UNSIGNED NOT NULL,
      language_id BIGINT UNSIGNED NOT NULL,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      UNIQUE KEY unique_type_language (tenant_type_id, language_id),
      CONSTRAINT fk_ttt_type FOREIGN KEY (tenant_type_id) REFERENCES tenant_types(id) ON DELETE CASCADE,
      CONSTRAINT fk_ttt_language FOREIGN KEY (language_id) REFERENCES languages(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Subscription plans table (CREATE THIRD - referenced by tenants)
await connection.query(`
  CREATE TABLE IF NOT EXISTS subscription_plans (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) DEFAULT NULL,  -- Changed to nullable
    currency VARCHAR(3) DEFAULT 'EUR',
    billing_period VARCHAR(20) NOT NULL,
    max_products INT DEFAULT NULL,
    max_stores INT DEFAULT 1,
    max_campaigns INT DEFAULT NULL,
    max_users INT DEFAULT NULL COMMENT 'Maximum number of users per tenant (NULL = unlimited)',
    features JSON,
    is_active TINYINT(1) DEFAULT 1,
    sort_order INT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_slug (slug),
    INDEX idx_is_active (is_active)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
`);

await connection.query(`
  -- Link subscription plans to tenant types with custom pricing
  CREATE TABLE IF NOT EXISTS tenant_type_subscription_plans (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tenant_type_id BIGINT UNSIGNED NOT NULL,
    subscription_plan_id BIGINT UNSIGNED NOT NULL,
    is_recommended TINYINT(1) DEFAULT 0,
    custom_price DECIMAL(10, 2) DEFAULT NULL,  -- Override base price for this tenant type
    custom_features JSON DEFAULT NULL,  -- Override or extend features for this tenant type
    sort_order INT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_type_plan (tenant_type_id, subscription_plan_id),
    INDEX idx_tenant_type (tenant_type_id),
    INDEX idx_subscription_plan (subscription_plan_id),
    INDEX idx_recommended (is_recommended),
    CONSTRAINT fk_ttsp_type FOREIGN KEY (tenant_type_id) REFERENCES tenant_types(id) ON DELETE CASCADE,
    CONSTRAINT fk_ttsp_plan FOREIGN KEY (subscription_plan_id) REFERENCES subscription_plans(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
`);

  // Tenants table (NOW with all columns including defaults)
  await connection.query(`
    CREATE TABLE IF NOT EXISTS tenants (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      slug VARCHAR(255) UNIQUE NOT NULL,
      domain VARCHAR(255) UNIQUE,
      subdomain VARCHAR(255) UNIQUE,
      subscription_plan_id BIGINT UNSIGNED NULL,
      tenant_type_id BIGINT UNSIGNED NULL,
      logo_url VARCHAR(500),
      favicon_url VARCHAR(500),
      primary_color VARCHAR(7) DEFAULT '#0050AA',
      secondary_color VARCHAR(7) DEFAULT '#FFCC00',
      default_language_id BIGINT UNSIGNED NULL,
      default_currency_id BIGINT UNSIGNED NULL,
      contact_email VARCHAR(255),
      contact_phone VARCHAR(50),
      is_active TINYINT(1) DEFAULT 1,
      trial_ends_at DATETIME NULL,
      subscription_ends_at DATETIME NULL,
      settings JSON,
      status VARCHAR(20) DEFAULT 'active' COMMENT 'active, suspended, cancelled, trial',
      billing_email VARCHAR(255) NULL,
      tax_id VARCHAR(100) NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_slug (slug),
      INDEX idx_domain (domain),
      INDEX idx_subdomain (subdomain),
      INDEX idx_is_active (is_active),
      INDEX idx_tenant_type (tenant_type_id),
      INDEX idx_status (status),
      CONSTRAINT fk_tenants_subscription FOREIGN KEY (subscription_plan_id) REFERENCES subscription_plans(id) ON DELETE SET NULL,
      CONSTRAINT fk_tenants_tenant_type FOREIGN KEY (tenant_type_id) REFERENCES tenant_types(id) ON DELETE SET NULL,
      CONSTRAINT fk_tenants_language FOREIGN KEY (default_language_id) REFERENCES languages(id) ON DELETE SET NULL,
      CONSTRAINT fk_tenants_currency FOREIGN KEY (default_currency_id) REFERENCES currencies(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Tenant subscriptions table
  await connection.query(`
    CREATE TABLE IF NOT EXISTS tenant_subscriptions (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      tenant_id BIGINT UNSIGNED NOT NULL,
      subscription_plan_id BIGINT UNSIGNED NOT NULL,
      status VARCHAR(20) NOT NULL,
      started_at DATETIME NOT NULL,
      expires_at DATETIME NOT NULL,
      auto_renew TINYINT(1) DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_tenant_status (tenant_id, status),
      INDEX idx_expires_at (expires_at),
      CONSTRAINT fk_ts_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      CONSTRAINT fk_ts_plan FOREIGN KEY (subscription_plan_id) REFERENCES subscription_plans(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Tenant languages table (many-to-many)
  await connection.query(`
    CREATE TABLE IF NOT EXISTS tenant_languages (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      tenant_id BIGINT UNSIGNED NOT NULL,
      language_id BIGINT UNSIGNED NOT NULL,
      is_default TINYINT(1) DEFAULT 0,
      is_active TINYINT(1) DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_tenant_language (tenant_id, language_id),
      CONSTRAINT fk_tl_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      CONSTRAINT fk_tl_language FOREIGN KEY (language_id) REFERENCES languages(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Tenant currencies table (many-to-many)
  await connection.query(`
    CREATE TABLE IF NOT EXISTS tenant_currencies (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      tenant_id BIGINT UNSIGNED NOT NULL,
      currency_id BIGINT UNSIGNED NOT NULL,
      is_default TINYINT(1) DEFAULT 0,
      is_active TINYINT(1) DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_tenant_currency (tenant_id, currency_id),
      CONSTRAINT fk_tc_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      CONSTRAINT fk_tc_currency FOREIGN KEY (currency_id) REFERENCES currencies(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
 // Admin users - core user table with security enhancements
  await connection.query(`
  CREATE TABLE IF NOT EXISTS admin_users (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    avatar_url VARCHAR(500),
    preferred_language_id BIGINT UNSIGNED NULL COMMENT 'Admin panel language preference',
    is_super_admin TINYINT(1) DEFAULT 0 COMMENT 'Platform owner - full access',
    is_active TINYINT(1) DEFAULT 1,
    failed_login_attempts INT DEFAULT 0,
    last_failed_login_at DATETIME NULL,
    last_login_at DATETIME NULL,
    last_password_change_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
    password_reset_token VARCHAR(255) NULL COMMENT 'SHA256 hash of reset token',
    password_reset_expires DATETIME NULL COMMENT 'Token expiration time',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_super_admin (is_super_admin),
    INDEX idx_is_active (is_active),
    INDEX idx_password_reset_token (password_reset_token),
    INDEX idx_preferred_language (preferred_language_id),
    CONSTRAINT fk_admin_language FOREIGN KEY (preferred_language_id) REFERENCES languages(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
`);

  console.log('✅ Migration 001 completed: Core tables created');
}

export async function down(connection: mysql.Connection): Promise<void> {
  console.log('Rolling back migration: 001_create_core_tables');

  await connection.query('DROP TABLE IF EXISTS tenant_currencies');
  await connection.query('DROP TABLE IF EXISTS tenant_languages');
  await connection.query('DROP TABLE IF EXISTS tenant_subscriptions');
  await connection.query('DROP TABLE IF EXISTS tenants');
  await connection.query('DROP TABLE IF EXISTS subscription_plans');
  await connection.query('DROP TABLE IF EXISTS currencies');
  await connection.query('DROP TABLE IF EXISTS languages');
  await connection.query('DROP TABLE IF EXISTS tenant_type_subscription_plans');
await connection.query('DROP TABLE IF EXISTS tenant_type_translations');
await connection.query('DROP TABLE IF EXISTS tenant_types');

  console.log('✅ Migration 001 rolled back');
}