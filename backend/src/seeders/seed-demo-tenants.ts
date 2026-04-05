// src/seeders/seed-demo-tenants.ts
// Seeds two demo restaurant tenants with stores, admin access, and imported master lookups
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function seedDemoTenants() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'restaurant_saas',
  });

  try {
    console.log('🌱 [DEMO TENANTS] Seeding demo restaurant tenants...\n');

    // =====================================================
    // LOOKUP IDs
    // =====================================================
    const [langs] = await connection.query<any[]>('SELECT id, code FROM languages');
    const langMap: Record<string, number> = {};
    for (const l of langs) langMap[l.code] = l.id;

    const [currencies] = await connection.query<any[]>('SELECT id, code FROM currencies');
    const curMap: Record<string, number> = {};
    for (const c of currencies) curMap[c.code] = c.id;

    const [tenantTypes] = await connection.query<any[]>('SELECT id, code FROM tenant_types');
    const ttMap: Record<string, number> = {};
    for (const t of tenantTypes) ttMap[t.code] = t.id;

    const [plans] = await connection.query<any[]>('SELECT id, slug FROM subscription_plans');
    const planMap: Record<string, number> = {};
    for (const p of plans) planMap[p.slug] = p.id;

    const [superAdmin] = await connection.query<any[]>('SELECT id FROM admin_users WHERE is_super_admin = 1 LIMIT 1');
    const superAdminId = superAdmin[0]?.id;

    const [ownerRole] = await connection.query<any[]>("SELECT id FROM roles WHERE name = 'tenant_owner' LIMIT 1");
    const ownerRoleId = ownerRole[0]?.id;

    // =====================================================
    // TENANT 1: Swan of Soli Restaurant
    // =====================================================
    console.log('📝 Creating tenant: Swan of Soli Restaurant...');

    await connection.query(`
      INSERT IGNORE INTO tenants (name, slug, subdomain, subscription_plan_id, tenant_type_id,
        primary_color, secondary_color, default_language_id, default_currency_id,
        contact_email, contact_phone, is_active, status)
      VALUES ('Swan of Soli Restaurant', 'swan-of-soli', 'swan-of-soli', ?, ?,
        '#1B4332', '#D4A574', ?, ?,
        'info@swanofsoli.com', '+90 533 123 4567', 1, 'active')
    `, [planMap['professional'], ttMap['full_service'], langMap['en'], curMap['TRY']]);

    const [t1] = await connection.query<any[]>("SELECT id FROM tenants WHERE slug = 'swan-of-soli'");
    const tenant1Id = t1[0]?.id;

    if (tenant1Id) {
      // Tenant languages
      await connection.query(`INSERT IGNORE INTO tenant_languages (tenant_id, language_id, is_default, is_active) VALUES
        (?, ?, 1, 1), (?, ?, 0, 1), (?, ?, 0, 1)`,
        [tenant1Id, langMap['en'], tenant1Id, langMap['tr'], tenant1Id, langMap['ru']]);

      // Tenant currencies
      await connection.query(`INSERT IGNORE INTO tenant_currencies (tenant_id, currency_id, is_default, is_active) VALUES
        (?, ?, 1, 1), (?, ?, 0, 1), (?, ?, 0, 1)`,
        [tenant1Id, curMap['TRY'], tenant1Id, curMap['EUR'], tenant1Id, curMap['USD']]);

      // Super admin access
      if (superAdminId && ownerRoleId) {
        await connection.query(`INSERT IGNORE INTO admin_tenant_access (admin_user_id, tenant_id, role_id) VALUES (?, ?, ?)`,
          [superAdminId, tenant1Id, ownerRoleId]);
      }

      // Store
      await connection.query(`
        INSERT IGNORE INTO stores (tenant_id, name, slug, code, address, city, country_code, phone, email, timezone,
          table_count, kds_enabled, online_ordering_enabled, qr_ordering_enabled, default_tax_rate, service_charge_rate, is_active)
        VALUES (?, 'Swan of Soli - Main', 'main', 'SOS-001', 'Soli Ancient City Road, Mezitli', 'Mersin', 'TR',
          '+90 533 123 4567', 'info@swanofsoli.com', 'Europe/Istanbul',
          25, 1, 1, 1, 18.00, 10.00, 1)
      `, [tenant1Id]);

      console.log('✅ Swan of Soli Restaurant created\n');
    }

    // =====================================================
    // TENANT 2: Dillirga Restaurant
    // =====================================================
    console.log('📝 Creating tenant: Dillirga Restaurant...');

    await connection.query(`
      INSERT IGNORE INTO tenants (name, slug, subdomain, subscription_plan_id, tenant_type_id,
        primary_color, secondary_color, default_language_id, default_currency_id,
        contact_email, contact_phone, is_active, status)
      VALUES ('Dillirga Restaurant', 'dillirga', 'dillirga', ?, ?,
        '#8B0000', '#FFD700', ?, ?,
        'info@dillirga.com', '+90 533 987 6543', 1, 'active')
    `, [planMap['professional'], ttMap['full_service'], langMap['tr'], curMap['TRY']]);

    const [t2] = await connection.query<any[]>("SELECT id FROM tenants WHERE slug = 'dillirga'");
    const tenant2Id = t2[0]?.id;

    if (tenant2Id) {
      // Tenant languages
      await connection.query(`INSERT IGNORE INTO tenant_languages (tenant_id, language_id, is_default, is_active) VALUES
        (?, ?, 1, 1), (?, ?, 0, 1), (?, ?, 0, 1)`,
        [tenant2Id, langMap['tr'], tenant2Id, langMap['en'], tenant2Id, langMap['ru']]);

      // Tenant currencies
      await connection.query(`INSERT IGNORE INTO tenant_currencies (tenant_id, currency_id, is_default, is_active) VALUES
        (?, ?, 1, 1), (?, ?, 0, 1)`,
        [tenant2Id, curMap['TRY'], tenant2Id, curMap['EUR']]);

      // Super admin access
      if (superAdminId && ownerRoleId) {
        await connection.query(`INSERT IGNORE INTO admin_tenant_access (admin_user_id, tenant_id, role_id) VALUES (?, ?, ?)`,
          [superAdminId, tenant2Id, ownerRoleId]);
      }

      // Store
      await connection.query(`
        INSERT IGNORE INTO stores (tenant_id, name, slug, code, address, city, country_code, phone, email, timezone,
          table_count, kds_enabled, online_ordering_enabled, qr_ordering_enabled, default_tax_rate, service_charge_rate, is_active)
        VALUES (?, 'Dillirga - Main', 'main', 'DLG-001', 'Kuzey Sahil Yolu, Girne', 'Girne', 'CY',
          '+90 533 987 6543', 'info@dillirga.com', 'Europe/Istanbul',
          30, 1, 1, 1, 18.00, 10.00, 1)
      `, [tenant2Id]);

      console.log('✅ Dillirga Restaurant created\n');
    }

    // =====================================================
    // IMPORT MASTER LOOKUPS INTO BOTH TENANTS
    // =====================================================
    for (const [tenantName, tenantId] of [['Swan of Soli', tenant1Id], ['Dillirga', tenant2Id]] as [string, number][]) {
      if (!tenantId) continue;
      console.log(`📝 Importing master lookups into ${tenantName}...`);

      // Import master order sources
      const [masterOrderSources] = await connection.query<any[]>('SELECT * FROM master_order_sources WHERE is_active = 1');
      for (const mos of masterOrderSources) {
        await connection.query(
          `INSERT IGNORE INTO tenant_order_sources (tenant_id, master_order_source_id, code, sort_order, is_active) VALUES (?, ?, ?, ?, 1)`,
          [tenantId, mos.id, mos.code, mos.sort_order]
        );
        const [inserted] = await connection.query<any[]>('SELECT id FROM tenant_order_sources WHERE tenant_id = ? AND code = ?', [tenantId, mos.code]);
        if (inserted[0]) {
          const [masterTrans] = await connection.query<any[]>('SELECT * FROM master_order_source_translations WHERE master_order_source_id = ?', [mos.id]);
          for (const mt of masterTrans) {
            await connection.query('INSERT IGNORE INTO tenant_order_source_translations (tenant_order_source_id, language_id, name) VALUES (?, ?, ?)',
              [inserted[0].id, mt.language_id, mt.name]);
          }
        }
      }

      // Import master order types
      const [masterOrderTypes] = await connection.query<any[]>('SELECT * FROM master_order_types WHERE is_active = 1');
      for (const mot of masterOrderTypes) {
        await connection.query(
          `INSERT IGNORE INTO tenant_order_types (tenant_id, master_order_type_id, code, sort_order, is_active) VALUES (?, ?, ?, ?, 1)`,
          [tenantId, mot.id, mot.code, mot.sort_order]
        );
        const [inserted] = await connection.query<any[]>('SELECT id FROM tenant_order_types WHERE tenant_id = ? AND code = ?', [tenantId, mot.code]);
        if (inserted[0]) {
          const [masterTrans] = await connection.query<any[]>('SELECT * FROM master_order_type_translations WHERE master_order_type_id = ?', [mot.id]);
          for (const mt of masterTrans) {
            await connection.query('INSERT IGNORE INTO tenant_order_type_translations (tenant_order_type_id, language_id, name) VALUES (?, ?, ?)',
              [inserted[0].id, mt.language_id, mt.name]);
          }
        }
      }

      // Import master order destinations
      const [masterDests] = await connection.query<any[]>('SELECT * FROM master_order_destinations WHERE is_active = 1');
      for (const md of masterDests) {
        await connection.query(
          `INSERT IGNORE INTO tenant_order_destinations (tenant_id, master_order_destination_id, code, sort_order, is_active) VALUES (?, ?, ?, ?, 1)`,
          [tenantId, md.id, md.code, md.sort_order]
        );
        const [inserted] = await connection.query<any[]>('SELECT id FROM tenant_order_destinations WHERE tenant_id = ? AND code = ?', [tenantId, md.code]);
        if (inserted[0]) {
          const [masterTrans] = await connection.query<any[]>('SELECT * FROM master_order_destination_translations WHERE master_order_destination_id = ?', [md.id]);
          for (const mt of masterTrans) {
            await connection.query('INSERT IGNORE INTO tenant_order_destination_translations (tenant_order_destination_id, language_id, name) VALUES (?, ?, ?)',
              [inserted[0].id, mt.language_id, mt.name]);
          }
        }
      }

      // Import master payment types
      const [masterPayTypes] = await connection.query<any[]>('SELECT * FROM master_payment_types WHERE is_active = 1');
      for (const mpt of masterPayTypes) {
        await connection.query(
          `INSERT IGNORE INTO tenant_payment_types (tenant_id, master_payment_type_id, code, icon, sort_order, is_active) VALUES (?, ?, ?, ?, ?, 1)`,
          [tenantId, mpt.id, mpt.code, mpt.icon, mpt.sort_order]
        );
        const [inserted] = await connection.query<any[]>('SELECT id FROM tenant_payment_types WHERE tenant_id = ? AND code = ?', [tenantId, mpt.code]);
        if (inserted[0]) {
          const [masterTrans] = await connection.query<any[]>('SELECT * FROM master_payment_type_translations WHERE master_payment_type_id = ?', [mpt.id]);
          for (const mt of masterTrans) {
            await connection.query('INSERT IGNORE INTO tenant_payment_type_translations (tenant_payment_type_id, language_id, name) VALUES (?, ?, ?)',
              [inserted[0].id, mt.language_id, mt.name]);
          }
        }
      }

      // Import master order item statuses
      const [masterItemStatuses] = await connection.query<any[]>('SELECT * FROM master_order_item_statuses WHERE is_active = 1');
      for (const mis of masterItemStatuses) {
        await connection.query(
          `INSERT IGNORE INTO tenant_order_item_statuses (tenant_id, master_order_item_status_id, code, color, sort_order, is_active) VALUES (?, ?, ?, ?, ?, 1)`,
          [tenantId, mis.id, mis.code, mis.color, mis.sort_order]
        );
        const [inserted] = await connection.query<any[]>('SELECT id FROM tenant_order_item_statuses WHERE tenant_id = ? AND code = ?', [tenantId, mis.code]);
        if (inserted[0]) {
          const [masterTrans] = await connection.query<any[]>('SELECT * FROM master_order_item_status_translations WHERE master_order_item_status_id = ?', [mis.id]);
          for (const mt of masterTrans) {
            await connection.query('INSERT IGNORE INTO tenant_order_item_status_translations (tenant_order_item_status_id, language_id, name) VALUES (?, ?, ?)',
              [inserted[0].id, mt.language_id, mt.name]);
          }
        }
      }

      // Import master payment statuses
      const [masterPayStatuses] = await connection.query<any[]>('SELECT * FROM master_payment_statuses WHERE is_active = 1');
      for (const mps of masterPayStatuses) {
        await connection.query(
          `INSERT IGNORE INTO tenant_payment_statuses (tenant_id, master_payment_status_id, code, color, sort_order, is_active) VALUES (?, ?, ?, ?, ?, 1)`,
          [tenantId, mps.id, mps.code, mps.color, mps.sort_order]
        );
        const [inserted] = await connection.query<any[]>('SELECT id FROM tenant_payment_statuses WHERE tenant_id = ? AND code = ?', [tenantId, mps.code]);
        if (inserted[0]) {
          const [masterTrans] = await connection.query<any[]>('SELECT * FROM master_payment_status_translations WHERE master_payment_status_id = ?', [mps.id]);
          for (const mt of masterTrans) {
            await connection.query('INSERT IGNORE INTO tenant_payment_status_translations (tenant_payment_status_id, language_id, name) VALUES (?, ?, ?)',
              [inserted[0].id, mt.language_id, mt.name]);
          }
        }
      }

      // Import master addon types + addons
      const [masterAddonTypes] = await connection.query<any[]>('SELECT * FROM master_addon_types WHERE is_active = 1');
      for (const mat of masterAddonTypes) {
        await connection.query(
          `INSERT IGNORE INTO tenant_addon_types (tenant_id, master_addon_type_id, code, icon, sort_order, is_active) VALUES (?, ?, ?, ?, ?, 1)`,
          [tenantId, mat.id, mat.code, mat.icon, mat.sort_order]
        );
        const [insertedType] = await connection.query<any[]>('SELECT id FROM tenant_addon_types WHERE tenant_id = ? AND code = ?', [tenantId, mat.code]);
        if (insertedType[0]) {
          // Translations
          const [masterTrans] = await connection.query<any[]>('SELECT * FROM master_addon_type_translations WHERE master_addon_type_id = ?', [mat.id]);
          for (const mt of masterTrans) {
            await connection.query('INSERT IGNORE INTO tenant_addon_type_translations (tenant_addon_type_id, language_id, name, description) VALUES (?, ?, ?, ?)',
              [insertedType[0].id, mt.language_id, mt.name, mt.description]);
          }

          // Import addons for this type
          const [masterAddons] = await connection.query<any[]>('SELECT * FROM master_addons WHERE master_addon_type_id = ? AND is_active = 1', [mat.id]);
          for (const ma of masterAddons) {
            await connection.query(
              `INSERT IGNORE INTO tenant_addons (tenant_id, tenant_addon_type_id, master_addon_id, sort_order, is_active) VALUES (?, ?, ?, ?, 1)`,
              [tenantId, insertedType[0].id, ma.id, ma.sort_order]
            );
            const [insertedAddon] = await connection.query<any[]>(
              'SELECT id FROM tenant_addons WHERE tenant_id = ? AND tenant_addon_type_id = ? AND master_addon_id = ?',
              [tenantId, insertedType[0].id, ma.id]
            );
            if (insertedAddon[0]) {
              const [addonTrans] = await connection.query<any[]>('SELECT * FROM master_addon_translations WHERE master_addon_id = ?', [ma.id]);
              for (const at of addonTrans) {
                await connection.query('INSERT IGNORE INTO tenant_addon_translations (tenant_addon_id, language_id, name, description) VALUES (?, ?, ?, ?)',
                  [insertedAddon[0].id, at.language_id, at.name, at.description]);
              }
            }
          }
        }
      }

      // Import master ingredients
      const [masterIngredients] = await connection.query<any[]>('SELECT * FROM master_ingredients WHERE is_active = 1');
      for (const mi of masterIngredients) {
        await connection.query(
          `INSERT IGNORE INTO tenant_ingredients (tenant_id, master_ingredient_id, code, allergen_type, icon_url, sort_order, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)`,
          [tenantId, mi.id, mi.code, mi.allergen_type, mi.icon_url, mi.sort_order]
        );
        const [inserted] = await connection.query<any[]>('SELECT id FROM tenant_ingredients WHERE tenant_id = ? AND code = ?', [tenantId, mi.code]);
        if (inserted[0]) {
          const [masterTrans] = await connection.query<any[]>('SELECT * FROM master_ingredient_translations WHERE master_ingredient_id = ?', [mi.id]);
          for (const mt of masterTrans) {
            await connection.query('INSERT IGNORE INTO tenant_ingredient_translations (tenant_ingredient_id, language_id, name, description) VALUES (?, ?, ?, ?)',
              [inserted[0].id, mt.language_id, mt.name, mt.description]);
          }
        }
      }

      // Import master expense categories
      const [masterExpCats] = await connection.query<any[]>('SELECT * FROM master_expense_categories WHERE is_active = 1');
      for (const mec of masterExpCats) {
        await connection.query(
          `INSERT IGNORE INTO tenant_expense_categories (tenant_id, master_expense_category_id, code, icon, sort_order, is_active) VALUES (?, ?, ?, ?, ?, 1)`,
          [tenantId, mec.id, mec.code, mec.icon, mec.sort_order]
        );
        const [inserted] = await connection.query<any[]>('SELECT id FROM tenant_expense_categories WHERE tenant_id = ? AND code = ?', [tenantId, mec.code]);
        if (inserted[0]) {
          const [masterTrans] = await connection.query<any[]>('SELECT * FROM master_expense_category_translations WHERE master_expense_category_id = ?', [mec.id]);
          for (const mt of masterTrans) {
            await connection.query('INSERT IGNORE INTO tenant_expense_category_translations (tenant_expense_category_id, language_id, name, description) VALUES (?, ?, ?, ?)',
              [inserted[0].id, mt.language_id, mt.name, mt.description]);
          }
        }
      }

      // Import master menu categories
      const [masterMenuCats] = await connection.query<any[]>('SELECT * FROM master_menu_categories WHERE is_active = 1 ORDER BY sort_order');
      for (const mmc of masterMenuCats) {
        await connection.query(
          `INSERT IGNORE INTO tenant_menu_categories (tenant_id, master_menu_category_id, slug, image_url, sort_order, is_active, show_on_website, show_on_pos, show_on_kiosk)
           VALUES (?, ?, ?, ?, ?, 1, 1, 1, 1)`,
          [tenantId, mmc.id, mmc.code, mmc.image_url, mmc.sort_order]
        );
        const [inserted] = await connection.query<any[]>('SELECT id FROM tenant_menu_categories WHERE tenant_id = ? AND slug = ?', [tenantId, mmc.code]);
        if (inserted[0]) {
          const [masterTrans] = await connection.query<any[]>('SELECT * FROM master_menu_category_translations WHERE master_menu_category_id = ?', [mmc.id]);
          for (const mt of masterTrans) {
            await connection.query('INSERT IGNORE INTO tenant_menu_category_translations (tenant_menu_category_id, language_id, name, description) VALUES (?, ?, ?, ?)',
              [inserted[0].id, mt.language_id, mt.name, mt.description]);
          }
        }
      }

      console.log(`✅ Master lookups imported into ${tenantName}\n`);
    }

    console.log('🎉 [DEMO TENANTS] Both demo tenants seeded successfully!\n');
    console.log('   Tenant 1: Swan of Soli Restaurant (swan-of-soli)');
    console.log('   Tenant 2: Dillirga Restaurant (dillirga)');
    console.log('   Both accessible via super admin: admin@admin-saas.com / SuperAdmin123!\n');
  } catch (err) {
    console.error('❌ [DEMO TENANTS] Seeding failed:', err);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

seedDemoTenants();
