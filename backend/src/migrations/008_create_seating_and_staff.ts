import mysql from 'mysql2/promise';

export async function up(connection: mysql.Connection): Promise<void> {
  console.log('Running migration: 008_create_seating_and_staff');

  // =====================================================
  // SEATING AREAS (per store)
  // =====================================================
  await connection.query(`
    CREATE TABLE IF NOT EXISTS tenant_seating_areas (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      tenant_id BIGINT UNSIGNED NOT NULL,
      store_id BIGINT UNSIGNED NOT NULL,
      sort_order INT DEFAULT 0,
      is_active TINYINT(1) DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_tenant (tenant_id),
      INDEX idx_store_active (store_id, is_active),
      CONSTRAINT fk_tsa_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      CONSTRAINT fk_tsa_store FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS tenant_seating_area_translations (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      tenant_seating_area_id BIGINT UNSIGNED NOT NULL,
      language_id BIGINT UNSIGNED NOT NULL,
      name VARCHAR(255) NOT NULL,
      UNIQUE KEY unique_area_language (tenant_seating_area_id, language_id),
      CONSTRAINT fk_tsat_area FOREIGN KEY (tenant_seating_area_id) REFERENCES tenant_seating_areas(id) ON DELETE CASCADE,
      CONSTRAINT fk_tsat_language FOREIGN KEY (language_id) REFERENCES languages(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // =====================================================
  // TABLE STRUCTURES (floor plan with merging support)
  // =====================================================
  await connection.query(`
    CREATE TABLE IF NOT EXISTS tenant_table_structures (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      tenant_id BIGINT UNSIGNED NOT NULL,
      store_id BIGINT UNSIGNED NOT NULL,
      tenant_seating_area_id BIGINT UNSIGNED NULL,
      name VARCHAR(50) NOT NULL,
      position_x INT NULL COMMENT 'Floor plan X coordinate',
      position_y INT NULL COMMENT 'Floor plan Y coordinate',
      width INT NULL COMMENT 'Visual width on floor plan',
      height INT NULL COMMENT 'Visual height on floor plan',
      shape ENUM('square', 'rectangle', 'circle', 'oval') DEFAULT 'square',
      capacity INT NOT NULL DEFAULT 2,
      min_capacity INT DEFAULT 1,
      status ENUM('available', 'occupied', 'reserved', 'blocked') DEFAULT 'available',
      parent_table_id BIGINT UNSIGNED NULL COMMENT 'For table merging',
      is_temporary_merge TINYINT(1) DEFAULT 0,
      merged_at DATETIME NULL,
      merged_by BIGINT UNSIGNED NULL,
      is_active TINYINT(1) DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_tenant_store (tenant_id, store_id),
      INDEX idx_area (tenant_seating_area_id),
      INDEX idx_status (status),
      INDEX idx_parent (parent_table_id),
      CONSTRAINT fk_tts_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      CONSTRAINT fk_tts_store FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
      CONSTRAINT fk_tts_area FOREIGN KEY (tenant_seating_area_id) REFERENCES tenant_seating_areas(id) ON DELETE SET NULL,
      CONSTRAINT fk_tts_parent FOREIGN KEY (parent_table_id) REFERENCES tenant_table_structures(id) ON DELETE SET NULL,
      CONSTRAINT fk_tts_merged_by FOREIGN KEY (merged_by) REFERENCES admin_users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // =====================================================
  // WAITERS (PIN-based auth)
  // =====================================================
  await connection.query(`
    CREATE TABLE IF NOT EXISTS tenant_waiters (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      tenant_id BIGINT UNSIGNED NOT NULL,
      store_id BIGINT UNSIGNED NULL COMMENT 'NULL = works at any store',
      name VARCHAR(255) NOT NULL,
      pin VARCHAR(6) NOT NULL,
      phone_1 VARCHAR(50),
      phone_2 VARCHAR(50),
      address TEXT,
      image_url VARCHAR(500),
      is_active TINYINT(1) DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY unique_tenant_pin (tenant_id, pin),
      INDEX idx_tenant_active (tenant_id, is_active),
      INDEX idx_store (store_id),
      CONSTRAINT fk_tw_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      CONSTRAINT fk_tw_store FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS tenant_waiter_sessions (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      tenant_waiter_id BIGINT UNSIGNED NOT NULL,
      store_id BIGINT UNSIGNED NOT NULL,
      device_identifier VARCHAR(255),
      ip_address VARCHAR(45),
      logged_in_at DATETIME NOT NULL,
      logged_out_at DATETIME NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_waiter (tenant_waiter_id),
      INDEX idx_store (store_id),
      INDEX idx_active (logged_out_at),
      CONSTRAINT fk_tws_waiter FOREIGN KEY (tenant_waiter_id) REFERENCES tenant_waiters(id) ON DELETE CASCADE,
      CONSTRAINT fk_tws_store FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // =====================================================
  // CUSTOMERS (registered + guest)
  // =====================================================
  await connection.query(`
    CREATE TABLE IF NOT EXISTS tenant_customers (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      tenant_id BIGINT UNSIGNED NOT NULL,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NULL,
      phone VARCHAR(50) NULL,
      password_hash VARCHAR(255) NULL COMMENT 'NULL for guest customers',
      is_registered TINYINT(1) DEFAULT 0,
      address_line_1 VARCHAR(255),
      address_line_2 VARCHAR(255),
      city VARCHAR(100),
      postal_code VARCHAR(20),
      country_code VARCHAR(3),
      notes TEXT,
      is_active TINYINT(1) DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY unique_tenant_email (tenant_id, email),
      INDEX idx_tenant (tenant_id),
      INDEX idx_phone (phone),
      CONSTRAINT fk_tcust_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // =====================================================
  // RESERVATIONS
  // =====================================================
  await connection.query(`
    CREATE TABLE IF NOT EXISTS reservations (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      tenant_id BIGINT UNSIGNED NOT NULL,
      store_id BIGINT UNSIGNED NOT NULL,
      primary_table_id BIGINT UNSIGNED NOT NULL,
      tenant_customer_id BIGINT UNSIGNED NULL,
      guest_count INT NOT NULL,
      reserved_at DATETIME NOT NULL,
      duration_minutes INT DEFAULT 120,
      status ENUM('pending', 'confirmed', 'checked_in', 'completed', 'cancelled', 'no_show') DEFAULT 'pending',
      customer_name VARCHAR(255),
      customer_phone VARCHAR(50),
      customer_email VARCHAR(255),
      notes TEXT,
      source ENUM('phone', 'online', 'walk_in', 'third_party') DEFAULT 'phone',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_tenant_store (tenant_id, store_id),
      INDEX idx_status_date (status, reserved_at),
      INDEX idx_reserved_at (reserved_at),
      INDEX idx_customer (tenant_customer_id),
      INDEX idx_table (primary_table_id),
      CONSTRAINT fk_res_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      CONSTRAINT fk_res_store FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
      CONSTRAINT fk_res_table FOREIGN KEY (primary_table_id) REFERENCES tenant_table_structures(id) ON DELETE CASCADE,
      CONSTRAINT fk_res_customer FOREIGN KEY (tenant_customer_id) REFERENCES tenant_customers(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Many-to-many: reservation can span multiple tables
  await connection.query(`
    CREATE TABLE IF NOT EXISTS reservation_tables (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      reservation_id BIGINT UNSIGNED NOT NULL,
      tenant_table_structure_id BIGINT UNSIGNED NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_reservation_table (reservation_id, tenant_table_structure_id),
      INDEX idx_reservation (reservation_id),
      INDEX idx_table (tenant_table_structure_id),
      CONSTRAINT fk_rt_reservation FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE CASCADE,
      CONSTRAINT fk_rt_table FOREIGN KEY (tenant_table_structure_id) REFERENCES tenant_table_structures(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  console.log('✅ Migration 008 completed: Seating and staff tables created');
  console.log('   - tenant_seating_areas + translations');
  console.log('   - tenant_table_structures (floor plan + merging)');
  console.log('   - tenant_waiters + waiter_sessions');
  console.log('   - tenant_customers');
  console.log('   - reservations + reservation_tables');
}

export async function down(connection: mysql.Connection): Promise<void> {
  console.log('Rolling back migration: 008_create_seating_and_staff');

  await connection.query('DROP TABLE IF EXISTS reservation_tables');
  await connection.query('DROP TABLE IF EXISTS reservations');
  await connection.query('DROP TABLE IF EXISTS tenant_customers');
  await connection.query('DROP TABLE IF EXISTS tenant_waiter_sessions');
  await connection.query('DROP TABLE IF EXISTS tenant_waiters');
  await connection.query('DROP TABLE IF EXISTS tenant_table_structures');
  await connection.query('DROP TABLE IF EXISTS tenant_seating_area_translations');
  await connection.query('DROP TABLE IF EXISTS tenant_seating_areas');

  console.log('✅ Migration 008 rolled back');
}
