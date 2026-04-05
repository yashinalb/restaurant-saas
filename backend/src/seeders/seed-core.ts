// src/seeders/seed-core.ts
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import argon2 from 'argon2';

dotenv.config();

async function seedCore() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'admin_saas',
  });

  try {
    console.log('🌱 [CORE] Seeding core data...\n');

    // 1. Languages
    console.log('📝 Seeding languages...');
    await connection.query(`
      INSERT IGNORE INTO languages (code, name, native_name, is_rtl, is_active, sort_order) VALUES
      ('tr', 'Turkish', 'Türkçe', 0, 1, 1),
      ('en', 'English', 'English', 0, 1, 2),
      ('el', 'Greek', 'Ελληνικά', 0, 1, 3),
      ('ru', 'Russian', 'Русский', 0, 1, 4),
      ('fr', 'French', 'Français', 0, 1, 5),
      ('de', 'German', 'Deutsch', 0, 1, 6),
      ('es', 'Spanish', 'Español', 0, 1, 7)
    `);
    console.log('✅ Languages seeded\n');

    // 2. Currencies
    console.log('📝 Seeding currencies...');
    await connection.query(`
      INSERT IGNORE INTO currencies (code, name, symbol, exchange_rate, is_active) VALUES
      ('TRY', 'Turkish Lira', '₺', 1.000000, 1),
      ('EUR', 'Euro', '€', 32.500000, 1),
      ('USD', 'US Dollar', '$', 35.700000, 1),
      ('GBP', 'British Pound', '£', 38.100000, 1)
    `);
    console.log('✅ Currencies seeded\n');

    // 3. Subscription Plans
    console.log('📝 Seeding subscription plans...');
    // In seed-core.ts, update subscription plans:
    await connection.query(`
      INSERT IGNORE INTO subscription_plans 
      (name, slug, description, price, currency, billing_period, max_products, max_stores, max_campaigns, max_users, features, is_active, sort_order) 
      VALUES
      ('Temel', 'basic', 'Küçük yerel marketler için mükemmel', 699.00, 'TRY', 'monthly', 200, 1, 5, 3, 
      '{"custom_domain": false, "analytics": "basic", "multi_language": true}', 1, 1),
      ('Profesyonel', 'professional', 'Büyüyen süpermarketler için ideal', 1749.00, 'TRY', 'monthly', 1000, 5, 20, 10, 
      '{"custom_domain": true, "analytics": "advanced", "multi_language": true, "api_access": true}', 1, 2),
      ('Kurumsal', 'enterprise', 'Büyük süpermarket zincirleri için', 5249.00, 'TRY', 'monthly', NULL, NULL, NULL, NULL, 
      '{"custom_domain": true, "analytics": "advanced", "multi_language": true, "api_access": true, "white_label": true, "priority_support": true}', 1, 3)
    `);
    console.log('✅ Subscription plans seeded\n');

    // 4. Roles
    console.log('📝 Seeding roles...');
    await connection.query(`
      INSERT IGNORE INTO roles (name, display_name, description, is_system_role, is_active) VALUES
      ('tenant_owner', 'Kiracı Sahibi', 'Kiracıyı yönetmek için tam erişim', 1, 1),
      ('tenant_manager', 'Kiracı Yöneticisi', 'Ürünleri ve kampanyaları düzenleyebilir', 1, 1),
      ('tenant_viewer', 'Kiracı Görüntüleyici', 'Kiracı verilerine salt okunur erişim', 1, 1)
    `);
    console.log('✅ Roles seeded\n');

    // 5. Super admin
    console.log('📝 Creating platform super admin...');
    const defaultPassword = 'SuperAdmin123!';
    const passwordHash = await argon2.hash(defaultPassword);

    await connection.query(
      `
      INSERT IGNORE INTO admin_users 
        (email, password_hash, first_name, last_name, is_super_admin, is_active)
      VALUES
        ('admin@admin-saas.com', ?, 'Super', 'Admin', 1, 1)
    `,
      [passwordHash],
    );

    console.log('✅ Super admin created');
    console.log('   Email: admin@admin-saas.com');
    console.log('   Password: SuperAdmin123!\n');

    console.log('🎉 [CORE] Done.\n');
  } catch (err) {
    console.error('❌ [CORE] Seeding failed:', err);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

seedCore();
