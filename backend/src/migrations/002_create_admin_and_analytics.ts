import mysql from 'mysql2/promise';

export async function up(connection: mysql.Connection): Promise<void> {
  console.log('Running migration: 002_create_admin_and_analytics');

  // =====================================================
  // HYBRID APPROACH: Simple now, can scale later
  // =====================================================

 
  // Roles - define what roles exist (start with 2, can add more)
  await connection.query(`
  CREATE TABLE IF NOT EXISTS roles (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL COMMENT 'e.g., tenant_owner, tenant_manager, tenant_viewer',
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    is_system_role TINYINT(1) DEFAULT 1 COMMENT 'System roles cannot be deleted',
    is_active TINYINT(1) DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_name (name),
    INDEX idx_is_active (is_active)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
`);

  // Permissions - define available permissions
  await connection.query(`
  CREATE TABLE IF NOT EXISTS permissions (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL COMMENT 'e.g., products.create, campaigns.edit',
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    module VARCHAR(50) NOT NULL COMMENT 'products, campaigns, categories, analytics, settings',
    is_active TINYINT(1) DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_name (name),
    INDEX idx_module (module)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
`);

  // Role permissions - which permissions does each role have
  await connection.query(`
  CREATE TABLE IF NOT EXISTS role_permissions (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    role_id BIGINT UNSIGNED NOT NULL,
    permission_id BIGINT UNSIGNED NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_role_permission (role_id, permission_id),
    INDEX idx_role_id (role_id),
    INDEX idx_permission_id (permission_id),
    CONSTRAINT fk_rp_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    CONSTRAINT fk_rp_permission FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
`);

  // Admin tenant access - which tenants can admin access with which role
  await connection.query(`
  CREATE TABLE IF NOT EXISTS admin_tenant_access (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    admin_user_id BIGINT UNSIGNED NOT NULL,
    tenant_id BIGINT UNSIGNED NOT NULL,
    role_id BIGINT UNSIGNED NOT NULL COMMENT 'Role for this specific tenant',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_admin_tenant (admin_user_id, tenant_id),
    INDEX idx_admin_user (admin_user_id),
    INDEX idx_tenant (tenant_id),
    INDEX idx_role (role_id),
    CONSTRAINT fk_ata_admin FOREIGN KEY (admin_user_id) REFERENCES admin_users(id) ON DELETE CASCADE,
    CONSTRAINT fk_ata_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT fk_ata_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
`);

  // Admin direct permissions - override specific permissions for specific admins
  await connection.query(`
  CREATE TABLE IF NOT EXISTS admin_permissions (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    admin_user_id BIGINT UNSIGNED NOT NULL,
    tenant_id BIGINT UNSIGNED NOT NULL,
    permission_id BIGINT UNSIGNED NOT NULL,
    granted TINYINT(1) DEFAULT 1 COMMENT '1 = grant permission, 0 = revoke permission',
    reason TEXT COMMENT 'Why this override was applied',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_admin_tenant_permission (admin_user_id, tenant_id, permission_id),
    INDEX idx_admin_user_id (admin_user_id),
    INDEX idx_tenant_id (tenant_id),
    CONSTRAINT fk_ap_admin FOREIGN KEY (admin_user_id) REFERENCES admin_users(id) ON DELETE CASCADE,
    CONSTRAINT fk_ap_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT fk_ap_permission FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
`);

  // Refresh tokens (for JWT authentication) with enhanced security tracking
  await connection.query(`
  CREATE TABLE IF NOT EXISTS admin_refresh_tokens (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    admin_user_id BIGINT UNSIGNED NOT NULL,
    token_hash VARCHAR(64) NOT NULL COMMENT 'SHA256 hash of the refresh token',
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    revoked_at DATETIME NULL,
    ip_address VARCHAR(45) NULL COMMENT 'Support IPv4 and IPv6',
    user_agent TEXT NULL,
    UNIQUE KEY uq_token_hash (token_hash),
    INDEX idx_admin_user (admin_user_id),
    INDEX idx_expires (expires_at),
    INDEX idx_revoked (revoked_at),
    CONSTRAINT fk_art_admin FOREIGN KEY (admin_user_id) REFERENCES admin_users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
`);

  // Create trigger for password change tracking
  await connection.query(`
  CREATE TRIGGER IF NOT EXISTS admin_users_password_change 
  BEFORE UPDATE ON admin_users 
  FOR EACH ROW 
  BEGIN 
    IF NEW.password_hash != OLD.password_hash THEN 
      SET NEW.last_password_change_at = CURRENT_TIMESTAMP; 
    END IF; 
  END
`);



  // Activity logs (audit trail)
  await connection.query(`
    CREATE TABLE IF NOT EXISTS activity_logs (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      tenant_id BIGINT UNSIGNED NULL,
      admin_user_id BIGINT UNSIGNED NULL,
      action VARCHAR(100) NOT NULL COMMENT 'e.g., product.create, campaign.update',
      entity_type VARCHAR(50) COMMENT 'e.g., product, campaign, category',
      entity_id BIGINT UNSIGNED,
      old_values JSON COMMENT 'Previous state (for updates)',
      new_values JSON COMMENT 'New state',
      ip_address VARCHAR(45),
      user_agent TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_tenant (tenant_id),
      INDEX idx_admin (admin_user_id),
      INDEX idx_action (action),
      INDEX idx_entity (entity_type, entity_id),
      INDEX idx_created_at (created_at),
      CONSTRAINT fk_al_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      CONSTRAINT fk_al_admin FOREIGN KEY (admin_user_id) REFERENCES admin_users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS user_invitations (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      tenant_id BIGINT UNSIGNED NOT NULL,
      email VARCHAR(255) NOT NULL,
      role_id BIGINT UNSIGNED NOT NULL,
      invited_by BIGINT UNSIGNED NOT NULL COMMENT 'Admin user who sent the invitation',
      invitation_token VARCHAR(255) NOT NULL COMMENT 'SHA256 hash of invitation token',
      expires_at DATETIME NOT NULL,
      accepted_at DATETIME NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_tenant (tenant_id),
      INDEX idx_email (email),
      INDEX idx_token (invitation_token),
      INDEX idx_expires (expires_at),
      UNIQUE KEY unique_pending_invitation (tenant_id, email, accepted_at),
      CONSTRAINT fk_ui_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      CONSTRAINT fk_ui_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
      CONSTRAINT fk_ui_invited_by FOREIGN KEY (invited_by) REFERENCES admin_users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  console.log('✅ Migration 002 completed: Admin and analytics tables created');
  console.log('   Tables created:');
  console.log('   - roles (define available roles)');
  console.log('   - permissions (define available permissions)');
  console.log('   - role_permissions (link roles to permissions)');
  console.log('   - admin_tenant_access (assign roles to admins per tenant)');
  console.log('   - admin_permissions (optional permission overrides)');
  console.log('   - admin_refresh_tokens (JWT tokens)');
  console.log('   - activity_logs (audit trail)');
  console.log('   - user_invitations');
}

export async function down(connection: mysql.Connection): Promise<void> {
  console.log('Rolling back migration: 002_create_admin_and_analytics');

  await connection.query('DROP TABLE IF EXISTS user_invitations');
  await connection.query('DROP TABLE IF EXISTS activity_logs');
  await connection.query('DROP TABLE IF EXISTS admin_refresh_tokens');
  await connection.query('DROP TABLE IF EXISTS admin_permissions');
  await connection.query('DROP TABLE IF EXISTS admin_tenant_access');
  await connection.query('DROP TABLE IF EXISTS role_permissions');
  await connection.query('DROP TABLE IF EXISTS permissions');
  await connection.query('DROP TABLE IF EXISTS roles');

  console.log('✅ Migration 002 rolled back');
}