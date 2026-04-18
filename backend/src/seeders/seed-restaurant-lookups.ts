// src/seeders/seed-restaurant-lookups.ts
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function seedRestaurantLookups() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'restaurant_saas',
  });

  try {
    console.log('🌱 [RESTAURANT LOOKUPS] Seeding master restaurant data...\n');

    // Helper: get language IDs
    const [langs] = await connection.query<any[]>('SELECT id, code FROM languages');
    const langMap: Record<string, number> = {};
    for (const lang of langs) {
      langMap[lang.code] = lang.id;
    }

    // =====================================================
    // TENANT TYPES (restaurant verticals)
    // =====================================================
    console.log('📝 Seeding restaurant tenant types...');
    await connection.query(`
      INSERT IGNORE INTO tenant_types (code, sort_order, is_active) VALUES
      ('full_service', 1, 1),
      ('fast_food', 2, 1),
      ('cafe', 3, 1),
      ('bar_lounge', 4, 1),
      ('bakery', 5, 1),
      ('food_truck', 6, 1)
    `);

    const [tenantTypes] = await connection.query<any[]>('SELECT id, code FROM tenant_types');
    const ttMap: Record<string, number> = {};
    for (const tt of tenantTypes) {
      ttMap[tt.code] = tt.id;
    }

    // Tenant type translations
    const ttTranslations: Record<string, Record<string, [string, string]>> = {
      full_service: { en: ['Full Service Restaurant', 'Dine-in restaurant with table service'], tr: ['Tam Hizmet Restoran', 'Masa servisi ile yemek restoranı'], de: ['Vollservice-Restaurant', 'Restaurant mit Tischservice'], el: ['Εστιατόριο Πλήρους Εξυπηρέτησης', 'Εστιατόριο με σερβίρισμα στο τραπέζι'], es: ['Restaurante de Servicio Completo', 'Restaurante con servicio de mesa'], fr: ['Restaurant Service Complet', 'Restaurant avec service à table'], ru: ['Ресторан Полного Обслуживания', 'Ресторан с обслуживанием за столом'] },
      fast_food: { en: ['Fast Food', 'Quick service restaurant'], tr: ['Fast Food', 'Hızlı servis restoran'], de: ['Schnellrestaurant', 'Schnellservice-Restaurant'], el: ['Φαστ Φουντ', 'Εστιατόριο γρήγορης εξυπηρέτησης'], es: ['Comida Rápida', 'Restaurante de servicio rápido'], fr: ['Restauration Rapide', 'Restaurant à service rapide'], ru: ['Фаст-фуд', 'Ресторан быстрого обслуживания'] },
      cafe: { en: ['Cafe', 'Coffee shop and light meals'], tr: ['Kafe', 'Kahve ve hafif yemekler'], de: ['Café', 'Kaffee und leichte Speisen'], el: ['Καφετέρια', 'Καφέ και ελαφριά γεύματα'], es: ['Cafetería', 'Café y comidas ligeras'], fr: ['Café', 'Café et repas légers'], ru: ['Кафе', 'Кофейня и лёгкие блюда'] },
      bar_lounge: { en: ['Bar & Lounge', 'Drinks and bar food'], tr: ['Bar & Lounge', 'İçecekler ve bar yemekleri'], de: ['Bar & Lounge', 'Getränke und Bargerichte'], el: ['Μπαρ & Lounge', 'Ποτά και σνακ μπαρ'], es: ['Bar & Lounge', 'Bebidas y comida de bar'], fr: ['Bar & Lounge', 'Boissons et restauration de bar'], ru: ['Бар & Лаундж', 'Напитки и барная еда'] },
      bakery: { en: ['Bakery', 'Fresh bread, pastries and baked goods'], tr: ['Fırın', 'Taze ekmek, pasta ve unlu mamuller'], de: ['Bäckerei', 'Frisches Brot, Gebäck und Backwaren'], el: ['Αρτοποιείο', 'Φρέσκο ψωμί, γλυκά και αρτοσκευάσματα'], es: ['Panadería', 'Pan fresco, pasteles y productos horneados'], fr: ['Boulangerie', 'Pain frais, pâtisseries et produits de boulangerie'], ru: ['Пекарня', 'Свежий хлеб, выпечка и кондитерские изделия'] },
      food_truck: { en: ['Food Truck', 'Mobile food service'], tr: ['Yemek Kamyonu', 'Mobil yemek servisi'], de: ['Food Truck', 'Mobiler Essensservice'], el: ['Food Truck', 'Κινητή υπηρεσία φαγητού'], es: ['Food Truck', 'Servicio de comida móvil'], fr: ['Food Truck', 'Service de restauration mobile'], ru: ['Фуд-трак', 'Мобильная еда'] },
    };

    for (const [code, translations] of Object.entries(ttTranslations)) {
      for (const [langCode, [name, desc]] of Object.entries(translations)) {
        if (langMap[langCode] && ttMap[code]) {
          await connection.query(
            'INSERT IGNORE INTO tenant_type_translations (tenant_type_id, language_id, name, description) VALUES (?, ?, ?, ?)',
            [ttMap[code], langMap[langCode], name, desc]
          );
        }
      }
    }
    console.log('✅ Restaurant tenant types seeded\n');

    // =====================================================
    // MASTER ADDON TYPES
    // =====================================================
    console.log('📝 Seeding master addon types...');
    await connection.query(`
      INSERT IGNORE INTO master_addon_types (code, sort_order, is_active) VALUES
      ('portion', 1, 1),
      ('extra', 2, 1),
      ('sauce', 3, 1),
      ('topping', 4, 1),
      ('side', 5, 1),
      ('drink', 6, 1)
    `);

    const [addonTypes] = await connection.query<any[]>('SELECT id, code FROM master_addon_types');
    const atMap: Record<string, number> = {};
    for (const at of addonTypes) { atMap[at.code] = at.id; }

    const atTranslations: Record<string, Record<string, string>> = {
      portion: { en: 'Portion Size', tr: 'Porsiyon', de: 'Portionsgröße', el: 'Μέγεθος Μερίδας', es: 'Tamaño de Porción', fr: 'Taille de Portion', ru: 'Размер Порции' },
      extra: { en: 'Extra', tr: 'Ekstra', de: 'Extra', el: 'Επιπλέον', es: 'Extra', fr: 'Supplément', ru: 'Дополнительно' },
      sauce: { en: 'Sauce', tr: 'Sos', de: 'Soße', el: 'Σάλτσα', es: 'Salsa', fr: 'Sauce', ru: 'Соус' },
      topping: { en: 'Topping', tr: 'Üst Malzeme', de: 'Belag', el: 'Επικάλυψη', es: 'Cobertura', fr: 'Garniture', ru: 'Топпинг' },
      side: { en: 'Side Dish', tr: 'Yan Yemek', de: 'Beilage', el: 'Συνοδευτικό', es: 'Acompañamiento', fr: 'Accompagnement', ru: 'Гарнир' },
      drink: { en: 'Drink', tr: 'İçecek', de: 'Getränk', el: 'Ποτό', es: 'Bebida', fr: 'Boisson', ru: 'Напиток' },
    };

    for (const [code, translations] of Object.entries(atTranslations)) {
      for (const [langCode, name] of Object.entries(translations)) {
        if (langMap[langCode] && atMap[code]) {
          await connection.query(
            'INSERT IGNORE INTO master_addon_type_translations (master_addon_type_id, language_id, name) VALUES (?, ?, ?)',
            [atMap[code], langMap[langCode], name]
          );
        }
      }
    }

    // Bridge all addon types to all restaurant tenant types
    for (const ttCode of Object.keys(ttMap)) {
      for (const atCode of Object.keys(atMap)) {
        await connection.query(
          'INSERT IGNORE INTO tenant_type_addon_types (tenant_type_id, master_addon_type_id, is_recommended, sort_order) VALUES (?, ?, 1, ?)',
          [ttMap[ttCode], atMap[atCode], atMap[atCode]]
        );
      }
    }
    console.log('✅ Master addon types seeded\n');

    // =====================================================
    // MASTER ORDER SOURCES
    // =====================================================
    console.log('📝 Seeding master order sources...');
    await connection.query(`
      INSERT IGNORE INTO master_order_sources (code, sort_order, is_active) VALUES
      ('in_store', 1, 1),
      ('online', 2, 1),
      ('kiosk', 3, 1),
      ('phone', 4, 1),
      ('third_party', 5, 1)
    `);

    const [orderSources] = await connection.query<any[]>('SELECT id, code FROM master_order_sources');
    const osMap: Record<string, number> = {};
    for (const os of orderSources) { osMap[os.code] = os.id; }

    const osTranslations: Record<string, Record<string, string>> = {
      in_store: { en: 'In Store', tr: 'Restoranda', de: 'Im Restaurant', el: 'Στο Κατάστημα', es: 'En Tienda', fr: 'En Restaurant', ru: 'В Ресторане' },
      online: { en: 'Online', tr: 'Online', de: 'Online', el: 'Online', es: 'En Línea', fr: 'En Ligne', ru: 'Онлайн' },
      kiosk: { en: 'Kiosk', tr: 'Kiosk', de: 'Kiosk', el: 'Κιόσκι', es: 'Quiosco', fr: 'Kiosque', ru: 'Киоск' },
      phone: { en: 'Phone', tr: 'Telefon', de: 'Telefon', el: 'Τηλέφωνο', es: 'Teléfono', fr: 'Téléphone', ru: 'Телефон' },
      third_party: { en: 'Third Party', tr: 'Üçüncü Taraf', de: 'Drittanbieter', el: 'Τρίτο Μέρος', es: 'Terceros', fr: 'Tiers', ru: 'Третья Сторона' },
    };

    for (const [code, translations] of Object.entries(osTranslations)) {
      for (const [langCode, name] of Object.entries(translations)) {
        if (langMap[langCode] && osMap[code]) {
          await connection.query(
            'INSERT IGNORE INTO master_order_source_translations (master_order_source_id, language_id, name) VALUES (?, ?, ?)',
            [osMap[code], langMap[langCode], name]
          );
        }
      }
    }
    console.log('✅ Master order sources seeded\n');

    // =====================================================
    // MASTER ORDER TYPES
    // =====================================================
    console.log('📝 Seeding master order types...');
    await connection.query(`
      INSERT IGNORE INTO master_order_types (code, sort_order, is_active) VALUES
      ('dine_in', 1, 1),
      ('takeaway', 2, 1),
      ('delivery', 3, 1),
      ('drive_through', 4, 1)
    `);

    const [orderTypes] = await connection.query<any[]>('SELECT id, code FROM master_order_types');
    const otMap: Record<string, number> = {};
    for (const ot of orderTypes) { otMap[ot.code] = ot.id; }

    const otTranslations: Record<string, Record<string, string>> = {
      dine_in: { en: 'Dine In', tr: 'Restoranda Yemek', de: 'Vor Ort Essen', el: 'Φαγητό Εντός', es: 'Comer Aquí', fr: 'Sur Place', ru: 'В Зале' },
      takeaway: { en: 'Takeaway', tr: 'Paket Servis', de: 'Zum Mitnehmen', el: 'Πακέτο', es: 'Para Llevar', fr: 'À Emporter', ru: 'На Вынос' },
      delivery: { en: 'Delivery', tr: 'Teslimat', de: 'Lieferung', el: 'Παράδοση', es: 'Entrega', fr: 'Livraison', ru: 'Доставка' },
      drive_through: { en: 'Drive Through', tr: 'Drive Through', de: 'Drive-Through', el: 'Drive Through', es: 'Drive Through', fr: 'Drive', ru: 'Драйв-Тру' },
    };

    for (const [code, translations] of Object.entries(otTranslations)) {
      for (const [langCode, name] of Object.entries(translations)) {
        if (langMap[langCode] && otMap[code]) {
          await connection.query(
            'INSERT IGNORE INTO master_order_type_translations (master_order_type_id, language_id, name) VALUES (?, ?, ?)',
            [otMap[code], langMap[langCode], name]
          );
        }
      }
    }
    console.log('✅ Master order types seeded\n');

    // =====================================================
    // MASTER ORDER DESTINATIONS
    // =====================================================
    console.log('📝 Seeding master order destinations...');
    await connection.query(`
      INSERT IGNORE INTO master_order_destinations (code, sort_order, is_active) VALUES
      ('kitchen', 1, 1),
      ('bar', 2, 1),
      ('dessert_station', 3, 1),
      ('grill', 4, 1),
      ('cold_kitchen', 5, 1)
    `);

    const [orderDests] = await connection.query<any[]>('SELECT id, code FROM master_order_destinations');
    const odMap: Record<string, number> = {};
    for (const od of orderDests) { odMap[od.code] = od.id; }

    const odTranslations: Record<string, Record<string, string>> = {
      kitchen: { en: 'Kitchen', tr: 'Mutfak', de: 'Küche', el: 'Κουζίνα', es: 'Cocina', fr: 'Cuisine', ru: 'Кухня' },
      bar: { en: 'Bar', tr: 'Bar', de: 'Bar', el: 'Μπαρ', es: 'Bar', fr: 'Bar', ru: 'Бар' },
      dessert_station: { en: 'Dessert Station', tr: 'Tatlı İstasyonu', de: 'Dessertstation', el: 'Σταθμός Επιδορπίων', es: 'Estación de Postres', fr: 'Station Desserts', ru: 'Станция Десертов' },
      grill: { en: 'Grill', tr: 'Izgara', de: 'Grill', el: 'Γκριλ', es: 'Parrilla', fr: 'Grill', ru: 'Гриль' },
      cold_kitchen: { en: 'Cold Kitchen', tr: 'Soğuk Mutfak', de: 'Kalte Küche', el: 'Κρύα Κουζίνα', es: 'Cocina Fría', fr: 'Cuisine Froide', ru: 'Холодный Цех' },
    };

    for (const [code, translations] of Object.entries(odTranslations)) {
      for (const [langCode, name] of Object.entries(translations)) {
        if (langMap[langCode] && odMap[code]) {
          await connection.query(
            'INSERT IGNORE INTO master_order_destination_translations (master_order_destination_id, language_id, name) VALUES (?, ?, ?)',
            [odMap[code], langMap[langCode], name]
          );
        }
      }
    }
    console.log('✅ Master order destinations seeded\n');

    // =====================================================
    // MASTER PAYMENT TYPES
    // =====================================================
    console.log('📝 Seeding master payment types...');
    await connection.query(`
      INSERT IGNORE INTO master_payment_types (code, sort_order, is_active) VALUES
      ('cash', 1, 1),
      ('credit_card', 2, 1),
      ('debit_card', 3, 1),
      ('mobile_pay', 4, 1),
      ('voucher', 5, 1),
      ('online_payment', 6, 1)
    `);

    const [payTypes] = await connection.query<any[]>('SELECT id, code FROM master_payment_types');
    const ptMap: Record<string, number> = {};
    for (const pt of payTypes) { ptMap[pt.code] = pt.id; }

    const ptTranslations: Record<string, Record<string, string>> = {
      cash: { en: 'Cash', tr: 'Nakit', de: 'Bargeld', el: 'Μετρητά', es: 'Efectivo', fr: 'Espèces', ru: 'Наличные' },
      credit_card: { en: 'Credit Card', tr: 'Kredi Kartı', de: 'Kreditkarte', el: 'Πιστωτική Κάρτα', es: 'Tarjeta de Crédito', fr: 'Carte de Crédit', ru: 'Кредитная Карта' },
      debit_card: { en: 'Debit Card', tr: 'Banka Kartı', de: 'Debitkarte', el: 'Χρεωστική Κάρτα', es: 'Tarjeta de Débito', fr: 'Carte de Débit', ru: 'Дебетовая Карта' },
      mobile_pay: { en: 'Mobile Pay', tr: 'Mobil Ödeme', de: 'Mobile Zahlung', el: 'Πληρωμή Κινητού', es: 'Pago Móvil', fr: 'Paiement Mobile', ru: 'Мобильная Оплата' },
      voucher: { en: 'Voucher', tr: 'Kupon', de: 'Gutschein', el: 'Κουπόνι', es: 'Vale', fr: 'Bon', ru: 'Ваучер' },
      online_payment: { en: 'Online Payment', tr: 'Online Ödeme', de: 'Online-Zahlung', el: 'Online Πληρωμή', es: 'Pago en Línea', fr: 'Paiement en Ligne', ru: 'Онлайн Оплата' },
    };

    for (const [code, translations] of Object.entries(ptTranslations)) {
      for (const [langCode, name] of Object.entries(translations)) {
        if (langMap[langCode] && ptMap[code]) {
          await connection.query(
            'INSERT IGNORE INTO master_payment_type_translations (master_payment_type_id, language_id, name) VALUES (?, ?, ?)',
            [ptMap[code], langMap[langCode], name]
          );
        }
      }
    }
    console.log('✅ Master payment types seeded\n');

    // =====================================================
    // MASTER ORDER ITEM STATUSES
    // =====================================================
    console.log('📝 Seeding master order item statuses...');
    await connection.query(`
      INSERT IGNORE INTO master_order_item_statuses (code, color, sort_order, is_active) VALUES
      ('pending', '#FFA500', 1, 1),
      ('preparing', '#3498DB', 2, 1),
      ('ready', '#2ECC71', 3, 1),
      ('served', '#27AE60', 4, 1),
      ('cancelled', '#E74C3C', 5, 1)
    `);

    const [itemStatuses] = await connection.query<any[]>('SELECT id, code FROM master_order_item_statuses');
    const isMap: Record<string, number> = {};
    for (const is_ of itemStatuses) { isMap[is_.code] = is_.id; }

    const isTranslations: Record<string, Record<string, string>> = {
      pending: { en: 'Pending', tr: 'Beklemede', de: 'Ausstehend', el: 'Εκκρεμεί', es: 'Pendiente', fr: 'En Attente', ru: 'Ожидание' },
      preparing: { en: 'Preparing', tr: 'Hazırlanıyor', de: 'In Vorbereitung', el: 'Σε Προετοιμασία', es: 'Preparando', fr: 'En Préparation', ru: 'Готовится' },
      ready: { en: 'Ready', tr: 'Hazır', de: 'Fertig', el: 'Έτοιμο', es: 'Listo', fr: 'Prêt', ru: 'Готово' },
      served: { en: 'Served', tr: 'Servis Edildi', de: 'Serviert', el: 'Σερβιρίστηκε', es: 'Servido', fr: 'Servi', ru: 'Подано' },
      cancelled: { en: 'Cancelled', tr: 'İptal Edildi', de: 'Storniert', el: 'Ακυρωμένο', es: 'Cancelado', fr: 'Annulé', ru: 'Отменено' },
    };

    for (const [code, translations] of Object.entries(isTranslations)) {
      for (const [langCode, name] of Object.entries(translations)) {
        if (langMap[langCode] && isMap[code]) {
          await connection.query(
            'INSERT IGNORE INTO master_order_item_status_translations (master_order_item_status_id, language_id, name) VALUES (?, ?, ?)',
            [isMap[code], langMap[langCode], name]
          );
        }
      }
    }
    console.log('✅ Master order item statuses seeded\n');

    // =====================================================
    // MASTER PAYMENT STATUSES
    // =====================================================
    console.log('📝 Seeding master payment statuses...');
    await connection.query(`
      INSERT IGNORE INTO master_payment_statuses (code, color, sort_order, is_active) VALUES
      ('unpaid', '#E74C3C', 1, 1),
      ('partially_paid', '#F39C12', 2, 1),
      ('paid', '#2ECC71', 3, 1),
      ('refunded', '#9B59B6', 4, 1),
      ('void', '#95A5A6', 5, 1)
    `);

    const [payStatuses] = await connection.query<any[]>('SELECT id, code FROM master_payment_statuses');
    const psMap: Record<string, number> = {};
    for (const ps of payStatuses) { psMap[ps.code] = ps.id; }

    const psTranslations: Record<string, Record<string, string>> = {
      unpaid: { en: 'Unpaid', tr: 'Ödenmemiş', de: 'Unbezahlt', el: 'Απλήρωτο', es: 'Sin Pagar', fr: 'Impayé', ru: 'Не Оплачено' },
      partially_paid: { en: 'Partially Paid', tr: 'Kısmen Ödendi', de: 'Teilweise Bezahlt', el: 'Μερικώς Πληρωμένο', es: 'Parcialmente Pagado', fr: 'Partiellement Payé', ru: 'Частично Оплачено' },
      paid: { en: 'Paid', tr: 'Ödendi', de: 'Bezahlt', el: 'Πληρωμένο', es: 'Pagado', fr: 'Payé', ru: 'Оплачено' },
      refunded: { en: 'Refunded', tr: 'İade Edildi', de: 'Erstattet', el: 'Επιστράφηκε', es: 'Reembolsado', fr: 'Remboursé', ru: 'Возвращено' },
      void: { en: 'Void', tr: 'Geçersiz', de: 'Ungültig', el: 'Άκυρο', es: 'Anulado', fr: 'Annulé', ru: 'Аннулировано' },
    };

    for (const [code, translations] of Object.entries(psTranslations)) {
      for (const [langCode, name] of Object.entries(translations)) {
        if (langMap[langCode] && psMap[code]) {
          await connection.query(
            'INSERT IGNORE INTO master_payment_status_translations (master_payment_status_id, language_id, name) VALUES (?, ?, ?)',
            [psMap[code], langMap[langCode], name]
          );
        }
      }
    }
    console.log('✅ Master payment statuses seeded\n');

    // =====================================================
    // MASTER INGREDIENTS (14 EU allergens + dietary markers)
    // =====================================================
    console.log('📝 Seeding master ingredients (allergens + dietary)...');
    await connection.query(`
      INSERT IGNORE INTO master_ingredients (code, allergen_type, sort_order, is_active) VALUES
      ('gluten', 'allergen', 1, 1),
      ('crustaceans', 'allergen', 2, 1),
      ('eggs', 'allergen', 3, 1),
      ('fish', 'allergen', 4, 1),
      ('peanuts', 'allergen', 5, 1),
      ('soybeans', 'allergen', 6, 1),
      ('milk', 'allergen', 7, 1),
      ('nuts', 'allergen', 8, 1),
      ('celery', 'allergen', 9, 1),
      ('mustard', 'allergen', 10, 1),
      ('sesame', 'allergen', 11, 1),
      ('sulphites', 'allergen', 12, 1),
      ('lupin', 'allergen', 13, 1),
      ('molluscs', 'allergen', 14, 1),
      ('vegan', 'dietary', 15, 1),
      ('vegetarian', 'dietary', 16, 1),
      ('halal', 'dietary', 17, 1),
      ('kosher', 'dietary', 18, 1),
      ('gluten_free', 'dietary', 19, 1),
      ('lactose_free', 'dietary', 20, 1)
    `);

    const [ingredients] = await connection.query<any[]>('SELECT id, code FROM master_ingredients');
    const ingMap: Record<string, number> = {};
    for (const ing of ingredients) { ingMap[ing.code] = ing.id; }

    const ingTranslations: Record<string, Record<string, string>> = {
      gluten: { en: 'Gluten', tr: 'Gluten', de: 'Gluten', el: 'Γλουτένη', es: 'Gluten', fr: 'Gluten', ru: 'Глютен' },
      crustaceans: { en: 'Crustaceans', tr: 'Kabuklular', de: 'Krebstiere', el: 'Καρκινοειδή', es: 'Crustáceos', fr: 'Crustacés', ru: 'Ракообразные' },
      eggs: { en: 'Eggs', tr: 'Yumurta', de: 'Eier', el: 'Αυγά', es: 'Huevos', fr: 'Oeufs', ru: 'Яйца' },
      fish: { en: 'Fish', tr: 'Balık', de: 'Fisch', el: 'Ψάρι', es: 'Pescado', fr: 'Poisson', ru: 'Рыба' },
      peanuts: { en: 'Peanuts', tr: 'Yer Fıstığı', de: 'Erdnüsse', el: 'Αράπικα Φιστίκια', es: 'Cacahuetes', fr: 'Arachides', ru: 'Арахис' },
      soybeans: { en: 'Soybeans', tr: 'Soya', de: 'Sojabohnen', el: 'Σόγια', es: 'Soja', fr: 'Soja', ru: 'Соя' },
      milk: { en: 'Milk', tr: 'Süt', de: 'Milch', el: 'Γάλα', es: 'Leche', fr: 'Lait', ru: 'Молоко' },
      nuts: { en: 'Tree Nuts', tr: 'Kuruyemiş', de: 'Schalenfrüchte', el: 'Ξηροί Καρποί', es: 'Frutos Secos', fr: 'Fruits à Coque', ru: 'Орехи' },
      celery: { en: 'Celery', tr: 'Kereviz', de: 'Sellerie', el: 'Σέλινο', es: 'Apio', fr: 'Céleri', ru: 'Сельдерей' },
      mustard: { en: 'Mustard', tr: 'Hardal', de: 'Senf', el: 'Μουστάρδα', es: 'Mostaza', fr: 'Moutarde', ru: 'Горчица' },
      sesame: { en: 'Sesame', tr: 'Susam', de: 'Sesam', el: 'Σουσάμι', es: 'Sésamo', fr: 'Sésame', ru: 'Кунжут' },
      sulphites: { en: 'Sulphites', tr: 'Sülfitler', de: 'Sulfite', el: 'Θειώδη', es: 'Sulfitos', fr: 'Sulfites', ru: 'Сульфиты' },
      lupin: { en: 'Lupin', tr: 'Acı Bakla', de: 'Lupinen', el: 'Λούπινο', es: 'Altramuz', fr: 'Lupin', ru: 'Люпин' },
      molluscs: { en: 'Molluscs', tr: 'Yumuşakçalar', de: 'Weichtiere', el: 'Μαλάκια', es: 'Moluscos', fr: 'Mollusques', ru: 'Моллюски' },
      vegan: { en: 'Vegan', tr: 'Vegan', de: 'Vegan', el: 'Βίγκαν', es: 'Vegano', fr: 'Végan', ru: 'Веганское' },
      vegetarian: { en: 'Vegetarian', tr: 'Vejetaryen', de: 'Vegetarisch', el: 'Χορτοφαγικό', es: 'Vegetariano', fr: 'Végétarien', ru: 'Вегетарианское' },
      halal: { en: 'Halal', tr: 'Helal', de: 'Halal', el: 'Χαλάλ', es: 'Halal', fr: 'Halal', ru: 'Халяль' },
      kosher: { en: 'Kosher', tr: 'Koşer', de: 'Koscher', el: 'Κόσερ', es: 'Kosher', fr: 'Casher', ru: 'Кошерное' },
      gluten_free: { en: 'Gluten Free', tr: 'Glutensiz', de: 'Glutenfrei', el: 'Χωρίς Γλουτένη', es: 'Sin Gluten', fr: 'Sans Gluten', ru: 'Без Глютена' },
      lactose_free: { en: 'Lactose Free', tr: 'Laktozsuz', de: 'Laktosefrei', el: 'Χωρίς Λακτόζη', es: 'Sin Lactosa', fr: 'Sans Lactose', ru: 'Без Лактозы' },
    };

    for (const [code, translations] of Object.entries(ingTranslations)) {
      for (const [langCode, name] of Object.entries(translations)) {
        if (langMap[langCode] && ingMap[code]) {
          await connection.query(
            'INSERT IGNORE INTO master_ingredient_translations (master_ingredient_id, language_id, name) VALUES (?, ?, ?)',
            [ingMap[code], langMap[langCode], name]
          );
        }
      }
    }
    console.log('✅ Master ingredients seeded\n');

    // =====================================================
    // MASTER EXPENSE CATEGORIES
    // =====================================================
    console.log('📝 Seeding master expense categories...');
    await connection.query(`
      INSERT IGNORE INTO master_expense_categories (code, sort_order, is_active) VALUES
      ('rent', 1, 1),
      ('utilities', 2, 1),
      ('food_supplies', 3, 1),
      ('beverage_supplies', 4, 1),
      ('cleaning_supplies', 5, 1),
      ('equipment', 6, 1),
      ('maintenance', 7, 1),
      ('marketing', 8, 1),
      ('insurance', 9, 1),
      ('labor', 10, 1),
      ('licenses', 11, 1),
      ('other', 12, 1)
    `);

    const [expCats] = await connection.query<any[]>('SELECT id, code FROM master_expense_categories');
    const ecMap: Record<string, number> = {};
    for (const ec of expCats) { ecMap[ec.code] = ec.id; }

    const ecTranslations: Record<string, Record<string, string>> = {
      rent: { en: 'Rent', tr: 'Kira', de: 'Miete', el: 'Ενοίκιο', es: 'Alquiler', fr: 'Loyer', ru: 'Аренда' },
      utilities: { en: 'Utilities', tr: 'Faturalar', de: 'Nebenkosten', el: 'Λογαριασμοί', es: 'Servicios Públicos', fr: 'Services Publics', ru: 'Коммунальные' },
      food_supplies: { en: 'Food Supplies', tr: 'Gıda Malzemeleri', de: 'Lebensmittel', el: 'Τρόφιμα', es: 'Suministros de Comida', fr: 'Approvisionnement Alimentaire', ru: 'Продукты' },
      beverage_supplies: { en: 'Beverage Supplies', tr: 'İçecek Malzemeleri', de: 'Getränke', el: 'Ποτά', es: 'Suministros de Bebidas', fr: 'Approvisionnement Boissons', ru: 'Напитки' },
      cleaning_supplies: { en: 'Cleaning Supplies', tr: 'Temizlik Malzemeleri', de: 'Reinigungsmittel', el: 'Καθαριστικά', es: 'Productos de Limpieza', fr: 'Produits de Nettoyage', ru: 'Моющие Средства' },
      equipment: { en: 'Equipment', tr: 'Ekipman', de: 'Ausrüstung', el: 'Εξοπλισμός', es: 'Equipamiento', fr: 'Équipement', ru: 'Оборудование' },
      maintenance: { en: 'Maintenance', tr: 'Bakım', de: 'Wartung', el: 'Συντήρηση', es: 'Mantenimiento', fr: 'Maintenance', ru: 'Обслуживание' },
      marketing: { en: 'Marketing', tr: 'Pazarlama', de: 'Marketing', el: 'Μάρκετινγκ', es: 'Marketing', fr: 'Marketing', ru: 'Маркетинг' },
      insurance: { en: 'Insurance', tr: 'Sigorta', de: 'Versicherung', el: 'Ασφάλιση', es: 'Seguros', fr: 'Assurance', ru: 'Страхование' },
      labor: { en: 'Labor', tr: 'İşçilik', de: 'Personalkosten', el: 'Εργατικά', es: 'Mano de Obra', fr: 'Main-d\'œuvre', ru: 'Заработная Плата' },
      licenses: { en: 'Licenses & Permits', tr: 'Lisans ve İzinler', de: 'Lizenzen & Genehmigungen', el: 'Άδειες', es: 'Licencias y Permisos', fr: 'Licences et Permis', ru: 'Лицензии' },
      other: { en: 'Other', tr: 'Diğer', de: 'Sonstiges', el: 'Άλλο', es: 'Otros', fr: 'Autre', ru: 'Прочее' },
    };

    for (const [code, translations] of Object.entries(ecTranslations)) {
      for (const [langCode, name] of Object.entries(translations)) {
        if (langMap[langCode] && ecMap[code]) {
          await connection.query(
            'INSERT IGNORE INTO master_expense_category_translations (master_expense_category_id, language_id, name) VALUES (?, ?, ?)',
            [ecMap[code], langMap[langCode], name]
          );
        }
      }
    }
    console.log('✅ Master expense categories seeded\n');

    // =====================================================
    // PERMISSIONS (restaurant-specific)
    // =====================================================
    console.log('📝 Seeding restaurant permissions...');
    await connection.query(`
      INSERT IGNORE INTO permissions (name, display_name, description, module, is_active) VALUES
      ('menu_categories.view', 'View Menu Categories', 'Can view menu categories', 'menu', 1),
      ('menu_categories.create', 'Create Menu Categories', 'Can create menu categories', 'menu', 1),
      ('menu_categories.edit', 'Edit Menu Categories', 'Can edit menu categories', 'menu', 1),
      ('menu_categories.delete', 'Delete Menu Categories', 'Can delete menu categories', 'menu', 1),
      ('menu_items.view', 'View Menu Items', 'Can view menu items', 'menu', 1),
      ('menu_items.create', 'Create Menu Items', 'Can create menu items', 'menu', 1),
      ('menu_items.edit', 'Edit Menu Items', 'Can edit menu items', 'menu', 1),
      ('menu_items.delete', 'Delete Menu Items', 'Can delete menu items', 'menu', 1),
      ('addons.view', 'View Addons', 'Can view addons', 'menu', 1),
      ('addons.create', 'Create Addons', 'Can create addons', 'menu', 1),
      ('addons.edit', 'Edit Addons', 'Can edit addons', 'menu', 1),
      ('addons.delete', 'Delete Addons', 'Can delete addons', 'menu', 1),
      ('orders.view', 'View Orders', 'Can view orders', 'orders', 1),
      ('orders.create', 'Create Orders', 'Can create orders', 'orders', 1),
      ('orders.edit', 'Edit Orders', 'Can edit orders', 'orders', 1),
      ('orders.cancel', 'Cancel Orders', 'Can cancel orders', 'orders', 1),
      ('orders.void', 'Void Orders', 'Can void orders', 'orders', 1),
      ('payments.view', 'View Payments', 'Can view payments', 'payments', 1),
      ('payments.process', 'Process Payments', 'Can process payments', 'payments', 1),
      ('payments.refund', 'Refund Payments', 'Can process refunds', 'payments', 1),
      ('tables.view', 'View Tables', 'Can view table layout', 'tables', 1),
      ('tables.manage', 'Manage Tables', 'Can manage table structures', 'tables', 1),
      ('tables.merge', 'Merge Tables', 'Can merge/unmerge tables', 'tables', 1),
      ('reservations.view', 'View Reservations', 'Can view reservations', 'reservations', 1),
      ('reservations.create', 'Create Reservations', 'Can create reservations', 'reservations', 1),
      ('reservations.edit', 'Edit Reservations', 'Can edit reservations', 'reservations', 1),
      ('reservations.cancel', 'Cancel Reservations', 'Can cancel reservations', 'reservations', 1),
      ('waiters.view', 'View Waiters', 'Can view waiters', 'staff', 1),
      ('waiters.manage', 'Manage Waiters', 'Can add/edit/remove waiters', 'staff', 1),
      ('customers.view', 'View Customers', 'Can view customers', 'customers', 1),
      ('customers.manage', 'Manage Customers', 'Can manage customers', 'customers', 1),
      ('inventory.view', 'View Inventory', 'Can view inventory products', 'inventory', 1),
      ('inventory.manage', 'Manage Inventory', 'Can manage inventory', 'inventory', 1),
      ('suppliers.view', 'View Suppliers', 'Can view suppliers', 'suppliers', 1),
      ('suppliers.manage', 'Manage Suppliers', 'Can manage suppliers', 'suppliers', 1),
      ('expenses.view', 'View Expenses', 'Can view expenses', 'expenses', 1),
      ('expenses.create', 'Create Expenses', 'Can create expenses', 'expenses', 1),
      ('expenses.manage', 'Manage Expenses', 'Can edit/delete expenses', 'expenses', 1),
      ('reports.view', 'View Reports', 'Can view daily reports', 'reports', 1),
      ('reports.export', 'Export Reports', 'Can export reports', 'reports', 1),
      ('cash_register.open', 'Open Cash Register', 'Can open cash register session', 'cash_register', 1),
      ('cash_register.close', 'Close Cash Register', 'Can close cash register session', 'cash_register', 1),
      ('kds.view', 'View Kitchen Display', 'Can view kitchen display', 'kds', 1),
      ('kds.manage', 'Manage Kitchen Display', 'Can manage KDS orders', 'kds', 1),
      ('settings.view', 'View Settings', 'Can view tenant settings', 'settings', 1),
      ('settings.manage', 'Manage Settings', 'Can manage tenant settings', 'settings', 1),
      ('stores.view', 'View Stores', 'Can view stores', 'stores', 1),
      ('stores.manage', 'Manage Stores', 'Can manage stores', 'stores', 1),
      ('ingredients.view', 'View Ingredients', 'Can view ingredients', 'menu', 1),
      ('ingredients.create', 'Create Ingredients', 'Can create ingredients', 'menu', 1),
      ('ingredients.edit', 'Edit Ingredients', 'Can edit ingredients', 'menu', 1),
      ('ingredients.delete', 'Delete Ingredients', 'Can delete ingredients', 'menu', 1),
      ('addon_types.view', 'View Addon Types', 'Can view addon types', 'menu', 1),
      ('addon_types.create', 'Create Addon Types', 'Can create addon types', 'menu', 1),
      ('addon_types.edit', 'Edit Addon Types', 'Can edit addon types', 'menu', 1),
      ('addon_types.delete', 'Delete Addon Types', 'Can delete addon types', 'menu', 1),
      ('order_destinations.view', 'View Order Destinations', 'Can view order destinations', 'orders', 1),
      ('order_destinations.create', 'Create Order Destinations', 'Can create order destinations', 'orders', 1),
      ('order_destinations.edit', 'Edit Order Destinations', 'Can edit order destinations', 'orders', 1),
      ('order_destinations.delete', 'Delete Order Destinations', 'Can delete order destinations', 'orders', 1),
      ('seating_areas.view', 'View Seating Areas', 'Can view seating areas', 'tables', 1),
      ('seating_areas.create', 'Create Seating Areas', 'Can create seating areas', 'tables', 1),
      ('seating_areas.edit', 'Edit Seating Areas', 'Can edit seating areas', 'tables', 1),
      ('seating_areas.delete', 'Delete Seating Areas', 'Can delete seating areas', 'tables', 1),
      ('order_sources.view', 'View Order Sources', 'Can view order sources', 'orders', 1),
      ('order_sources.create', 'Create Order Sources', 'Can create order sources', 'orders', 1),
      ('order_sources.edit', 'Edit Order Sources', 'Can edit order sources', 'orders', 1),
      ('order_sources.delete', 'Delete Order Sources', 'Can delete order sources', 'orders', 1),
      ('order_types.view', 'View Order Types', 'Can view order types', 'orders', 1),
      ('order_types.create', 'Create Order Types', 'Can create order types', 'orders', 1),
      ('order_types.edit', 'Edit Order Types', 'Can edit order types', 'orders', 1),
      ('order_types.delete', 'Delete Order Types', 'Can delete order types', 'orders', 1),
      ('order_item_statuses.view', 'View Order Item Statuses', 'Can view order item statuses', 'orders', 1),
      ('order_item_statuses.create', 'Create Order Item Statuses', 'Can create order item statuses', 'orders', 1),
      ('order_item_statuses.edit', 'Edit Order Item Statuses', 'Can edit order item statuses', 'orders', 1),
      ('order_item_statuses.delete', 'Delete Order Item Statuses', 'Can delete order item statuses', 'orders', 1),
      ('payment_statuses.view', 'View Payment Statuses', 'Can view payment statuses', 'payments', 1),
      ('payment_statuses.create', 'Create Payment Statuses', 'Can create payment statuses', 'payments', 1),
      ('payment_statuses.edit', 'Edit Payment Statuses', 'Can edit payment statuses', 'payments', 1),
      ('payment_statuses.delete', 'Delete Payment Statuses', 'Can delete payment statuses', 'payments', 1),
      ('payment_types.view', 'View Payment Types', 'Can view payment types', 'payments', 1),
      ('payment_types.create', 'Create Payment Types', 'Can create payment types', 'payments', 1),
      ('payment_types.edit', 'Edit Payment Types', 'Can edit payment types', 'payments', 1),
      ('payment_types.delete', 'Delete Payment Types', 'Can delete payment types', 'payments', 1),
      ('transactions.view', 'View Transactions', 'Can view transactions', 'payments', 1),
      ('transactions.create', 'Create Transactions', 'Can create transactions', 'payments', 1),
      ('transactions.edit', 'Edit Transactions', 'Can edit transactions', 'payments', 1),
      ('transactions.delete', 'Delete Transactions', 'Can delete transactions', 'payments', 1),
      ('qr_invoice_tokens.view', 'View QR Invoice Tokens', 'Can view QR invoice tokens', 'qr_invoice_tokens', 1),
      ('qr_invoice_tokens.create', 'Create QR Invoice Tokens', 'Can create QR invoice tokens', 'qr_invoice_tokens', 1),
      ('qr_invoice_tokens.edit', 'Edit QR Invoice Tokens', 'Can edit QR invoice tokens', 'qr_invoice_tokens', 1),
      ('qr_invoice_tokens.delete', 'Delete QR Invoice Tokens', 'Can delete QR invoice tokens', 'qr_invoice_tokens', 1),
      ('suppliers.view', 'View Suppliers', 'Can view suppliers', 'suppliers', 1),
      ('suppliers.create', 'Create Suppliers', 'Can create suppliers', 'suppliers', 1),
      ('suppliers.edit', 'Edit Suppliers', 'Can edit suppliers', 'suppliers', 1),
      ('suppliers.delete', 'Delete Suppliers', 'Can delete suppliers', 'suppliers', 1),
      ('inventory_products.view', 'View Inventory Products', 'Can view inventory products', 'inventory_products', 1),
      ('inventory_products.create', 'Create Inventory Products', 'Can create inventory products', 'inventory_products', 1),
      ('inventory_products.edit', 'Edit Inventory Products', 'Can edit inventory products', 'inventory_products', 1),
      ('inventory_products.delete', 'Delete Inventory Products', 'Can delete inventory products', 'inventory_products', 1),
      ('supplier_invoices.view', 'View Supplier Invoices', 'Can view supplier invoices', 'supplier_invoices', 1),
      ('supplier_invoices.create', 'Create Supplier Invoices', 'Can create supplier invoices', 'supplier_invoices', 1),
      ('supplier_invoices.edit', 'Edit Supplier Invoices', 'Can edit supplier invoices', 'supplier_invoices', 1),
      ('supplier_invoices.delete', 'Delete Supplier Invoices', 'Can delete supplier invoices', 'supplier_invoices', 1),
      ('stock_intakes.view', 'View Stock Intakes', 'Can view stock intakes', 'stock_intakes', 1),
      ('stock_intakes.create', 'Create Stock Intakes', 'Can create stock intakes', 'stock_intakes', 1),
      ('stock_intakes.edit', 'Edit Stock Intakes', 'Can edit stock intakes', 'stock_intakes', 1),
      ('stock_intakes.delete', 'Delete Stock Intakes', 'Can delete stock intakes', 'stock_intakes', 1),
      ('supplier_credits.view', 'View Supplier Credits', 'Can view supplier credits', 'supplier_credits', 1),
      ('supplier_credits.create', 'Create Supplier Credits', 'Can create supplier credits', 'supplier_credits', 1),
      ('supplier_credits.edit', 'Edit Supplier Credits', 'Can edit supplier credits', 'supplier_credits', 1),
      ('supplier_credits.delete', 'Delete Supplier Credits', 'Can delete supplier credits', 'supplier_credits', 1),
      ('tenant_expense_categories.view', 'View Expense Categories', 'Can view expense categories', 'tenant_expense_categories', 1),
      ('tenant_expense_categories.create', 'Create Expense Categories', 'Can create expense categories', 'tenant_expense_categories', 1),
      ('tenant_expense_categories.edit', 'Edit Expense Categories', 'Can edit expense categories', 'tenant_expense_categories', 1),
      ('tenant_expense_categories.delete', 'Delete Expense Categories', 'Can delete expense categories', 'tenant_expense_categories', 1),
      ('tenant_expense_sources.view', 'View Expense Sources', 'Can view expense sources', 'tenant_expense_sources', 1),
      ('tenant_expense_sources.create', 'Create Expense Sources', 'Can create expense sources', 'tenant_expense_sources', 1),
      ('tenant_expense_sources.edit', 'Edit Expense Sources', 'Can edit expense sources', 'tenant_expense_sources', 1),
      ('tenant_expense_sources.delete', 'Delete Expense Sources', 'Can delete expense sources', 'tenant_expense_sources', 1),
      ('expenses.view', 'View Expenses', 'Can view expenses', 'expenses', 1),
      ('expenses.create', 'Create Expenses', 'Can create expenses', 'expenses', 1),
      ('expenses.edit', 'Edit Expenses', 'Can edit expenses', 'expenses', 1),
      ('expenses.delete', 'Delete Expenses', 'Can delete expenses', 'expenses', 1),
      ('kds_orders.view', 'View KDS Orders', 'Can view KDS orders', 'kds_orders', 1),
      ('kds_orders.create', 'Create KDS Orders', 'Can create KDS orders', 'kds_orders', 1),
      ('kds_orders.edit', 'Edit KDS Orders', 'Can edit/update KDS orders', 'kds_orders', 1),
      ('kds_orders.delete', 'Delete KDS Orders', 'Can delete KDS orders', 'kds_orders', 1),
      ('daily_reports.view', 'View Daily Reports', 'Can view daily report snapshots', 'daily_reports', 1),
      ('daily_reports.create', 'Create Daily Reports', 'Can create/generate daily report snapshots', 'daily_reports', 1),
      ('daily_reports.edit', 'Edit Daily Reports', 'Can edit daily report snapshots', 'daily_reports', 1),
      ('daily_reports.delete', 'Delete Daily Reports', 'Can delete daily report snapshots', 'daily_reports', 1),
      ('cash_sessions.view', 'View Cash Sessions', 'Can view cash register sessions', 'cash_sessions', 1),
      ('cash_sessions.create', 'Open Cash Sessions', 'Can open cash register sessions', 'cash_sessions', 1),
      ('cash_sessions.edit', 'Close/Edit Cash Sessions', 'Can close and edit cash register sessions', 'cash_sessions', 1),
      ('cash_sessions.delete', 'Delete Cash Sessions', 'Can delete cash register sessions', 'cash_sessions', 1)
    `);
    console.log('✅ Restaurant permissions seeded\n');

    // =====================================================
    // MASTER MENU CATEGORIES (template categories)
    // =====================================================
    console.log('📝 Seeding master menu categories...');
    await connection.query(`
      INSERT IGNORE INTO master_menu_categories (code, sort_order, is_active) VALUES
      ('appetizers', 1, 1),
      ('soups', 2, 1),
      ('salads', 3, 1),
      ('main_course', 4, 1),
      ('grills', 5, 1),
      ('seafood', 6, 1),
      ('pasta', 7, 1),
      ('pizza', 8, 1),
      ('sandwiches', 9, 1),
      ('sides', 10, 1),
      ('desserts', 11, 1),
      ('hot_beverages', 12, 1),
      ('cold_beverages', 13, 1),
      ('alcoholic_beverages', 14, 1),
      ('kids_menu', 15, 1),
      ('breakfast', 16, 1)
    `);

    const [menuCats] = await connection.query<any[]>('SELECT id, code FROM master_menu_categories');
    const mcMap: Record<string, number> = {};
    for (const mc of menuCats) { mcMap[mc.code] = mc.id; }

    const mcTranslations: Record<string, Record<string, [string, string]>> = {
      appetizers: { en: ['Appetizers', 'Starters and small plates'], tr: ['Başlangıçlar', 'Meze ve küçük tabaklar'], de: ['Vorspeisen', 'Vorspeisen und kleine Gerichte'], el: ['Ορεκτικά', 'Μικρά πιάτα και ορεκτικά'], es: ['Entrantes', 'Aperitivos y platos pequeños'], fr: ['Entrées', 'Entrées et petits plats'], ru: ['Закуски', 'Закуски и маленькие порции'] },
      soups: { en: ['Soups', 'Hot and cold soups'], tr: ['Çorbalar', 'Sıcak ve soğuk çorbalar'], de: ['Suppen', 'Heiße und kalte Suppen'], el: ['Σούπες', 'Ζεστές και κρύες σούπες'], es: ['Sopas', 'Sopas calientes y frías'], fr: ['Soupes', 'Soupes chaudes et froides'], ru: ['Супы', 'Горячие и холодные супы'] },
      salads: { en: ['Salads', 'Fresh salads'], tr: ['Salatalar', 'Taze salatalar'], de: ['Salate', 'Frische Salate'], el: ['Σαλάτες', 'Φρέσκες σαλάτες'], es: ['Ensaladas', 'Ensaladas frescas'], fr: ['Salades', 'Salades fraîches'], ru: ['Салаты', 'Свежие салаты'] },
      main_course: { en: ['Main Course', 'Main dishes'], tr: ['Ana Yemekler', 'Ana yemekler'], de: ['Hauptgerichte', 'Hauptgerichte'], el: ['Κυρίως Πιάτα', 'Κυρίως πιάτα'], es: ['Platos Principales', 'Platos principales'], fr: ['Plats Principaux', 'Plats principaux'], ru: ['Основные Блюда', 'Основные блюда'] },
      grills: { en: ['Grills', 'Grilled meats and vegetables'], tr: ['Izgaralar', 'Izgara et ve sebzeler'], de: ['Grill', 'Gegrilltes Fleisch und Gemüse'], el: ['Σχάρα', 'Ψητά κρέατα και λαχανικά'], es: ['Parrilla', 'Carnes y verduras a la parrilla'], fr: ['Grillades', 'Viandes et légumes grillés'], ru: ['Гриль', 'Мясо и овощи на гриле'] },
      seafood: { en: ['Seafood', 'Fish and seafood dishes'], tr: ['Deniz Ürünleri', 'Balık ve deniz ürünleri'], de: ['Meeresfrüchte', 'Fisch- und Meeresfrüchtegerichte'], el: ['Θαλασσινά', 'Ψάρια και θαλασσινά'], es: ['Mariscos', 'Platos de pescado y mariscos'], fr: ['Fruits de Mer', 'Poissons et fruits de mer'], ru: ['Морепродукты', 'Рыба и морепродукты'] },
      pasta: { en: ['Pasta', 'Pasta dishes'], tr: ['Makarna', 'Makarna çeşitleri'], de: ['Pasta', 'Nudelgerichte'], el: ['Ζυμαρικά', 'Πιάτα ζυμαρικών'], es: ['Pasta', 'Platos de pasta'], fr: ['Pâtes', 'Plats de pâtes'], ru: ['Паста', 'Блюда из пасты'] },
      pizza: { en: ['Pizza', 'Pizzas and flatbreads'], tr: ['Pizza', 'Pizza ve pide'], de: ['Pizza', 'Pizzen und Flammkuchen'], el: ['Πίτσα', 'Πίτσες'], es: ['Pizza', 'Pizzas'], fr: ['Pizza', 'Pizzas'], ru: ['Пицца', 'Пицца и лепёшки'] },
      sandwiches: { en: ['Sandwiches', 'Sandwiches and wraps'], tr: ['Sandviçler', 'Sandviç ve dürümler'], de: ['Sandwiches', 'Sandwiches und Wraps'], el: ['Σάντουιτς', 'Σάντουιτς και τυλιχτά'], es: ['Sándwiches', 'Sándwiches y wraps'], fr: ['Sandwichs', 'Sandwichs et wraps'], ru: ['Сэндвичи', 'Сэндвичи и роллы'] },
      sides: { en: ['Sides', 'Side dishes'], tr: ['Yan Yemekler', 'Yan yemekler'], de: ['Beilagen', 'Beilagen'], el: ['Συνοδευτικά', 'Συνοδευτικά πιάτα'], es: ['Acompañamientos', 'Acompañamientos'], fr: ['Accompagnements', 'Accompagnements'], ru: ['Гарниры', 'Гарниры'] },
      desserts: { en: ['Desserts', 'Sweet treats and desserts'], tr: ['Tatlılar', 'Tatlılar ve pastalar'], de: ['Desserts', 'Süßspeisen und Desserts'], el: ['Επιδόρπια', 'Γλυκά και επιδόρπια'], es: ['Postres', 'Dulces y postres'], fr: ['Desserts', 'Douceurs et desserts'], ru: ['Десерты', 'Сладости и десерты'] },
      hot_beverages: { en: ['Hot Beverages', 'Coffee, tea and hot drinks'], tr: ['Sıcak İçecekler', 'Kahve, çay ve sıcak içecekler'], de: ['Heißgetränke', 'Kaffee, Tee und Heißgetränke'], el: ['Ζεστά Ροφήματα', 'Καφές, τσάι και ζεστά ροφήματα'], es: ['Bebidas Calientes', 'Café, té y bebidas calientes'], fr: ['Boissons Chaudes', 'Café, thé et boissons chaudes'], ru: ['Горячие Напитки', 'Кофе, чай и горячие напитки'] },
      cold_beverages: { en: ['Cold Beverages', 'Juices, sodas and cold drinks'], tr: ['Soğuk İçecekler', 'Meyve suyu, soda ve soğuk içecekler'], de: ['Kaltgetränke', 'Säfte, Limonaden und Kaltgetränke'], el: ['Κρύα Ποτά', 'Χυμοί, αναψυκτικά και κρύα ποτά'], es: ['Bebidas Frías', 'Jugos, refrescos y bebidas frías'], fr: ['Boissons Froides', 'Jus, sodas et boissons fraîches'], ru: ['Холодные Напитки', 'Соки, газировка и холодные напитки'] },
      alcoholic_beverages: { en: ['Alcoholic Beverages', 'Wine, beer and spirits'], tr: ['Alkollü İçecekler', 'Şarap, bira ve alkollü içecekler'], de: ['Alkoholische Getränke', 'Wein, Bier und Spirituosen'], el: ['Αλκοολούχα Ποτά', 'Κρασί, μπύρα και ποτά'], es: ['Bebidas Alcohólicas', 'Vino, cerveza y licores'], fr: ['Boissons Alcoolisées', 'Vin, bière et spiritueux'], ru: ['Алкогольные Напитки', 'Вино, пиво и крепкие напитки'] },
      kids_menu: { en: ['Kids Menu', 'Special meals for children'], tr: ['Çocuk Menüsü', 'Çocuklara özel yemekler'], de: ['Kindermenü', 'Spezielle Kindergerichte'], el: ['Παιδικό Μενού', 'Ειδικά γεύματα για παιδιά'], es: ['Menú Infantil', 'Comidas especiales para niños'], fr: ['Menu Enfant', 'Repas spéciaux pour enfants'], ru: ['Детское Меню', 'Специальные блюда для детей'] },
      breakfast: { en: ['Breakfast', 'Morning meals and brunch'], tr: ['Kahvaltı', 'Sabah yemekleri ve brunch'], de: ['Frühstück', 'Morgenmahlzeiten und Brunch'], el: ['Πρωινό', 'Πρωινά γεύματα και brunch'], es: ['Desayuno', 'Comidas matutinas y brunch'], fr: ['Petit-Déjeuner', 'Repas du matin et brunch'], ru: ['Завтрак', 'Утренние блюда и бранч'] },
    };

    for (const [code, translations] of Object.entries(mcTranslations)) {
      for (const [langCode, [name, desc]] of Object.entries(translations)) {
        if (langMap[langCode] && mcMap[code]) {
          await connection.query(
            'INSERT IGNORE INTO master_menu_category_translations (master_menu_category_id, language_id, name, description) VALUES (?, ?, ?, ?)',
            [mcMap[code], langMap[langCode], name, desc]
          );
        }
      }
    }

    // Bridge all categories to all restaurant tenant types (as defaults)
    for (const ttCode of Object.keys(ttMap)) {
      for (const mcCode of Object.keys(mcMap)) {
        await connection.query(
          'INSERT IGNORE INTO tenant_type_menu_categories (tenant_type_id, master_menu_category_id, is_default, sort_order) VALUES (?, ?, 1, ?)',
          [ttMap[ttCode], mcMap[mcCode], mcMap[mcCode]]
        );
      }
    }
    console.log('✅ Master menu categories seeded\n');

    // =====================================================
    // MASTER ADDONS (template addon items)
    // =====================================================
    console.log('📝 Seeding master addons...');

    // Portions
    const portionAddons = [
      { code: 'small', sort: 1 },
      { code: 'medium', sort: 2 },
      { code: 'large', sort: 3 },
      { code: 'family', sort: 4 },
    ];
    for (const addon of portionAddons) {
      await connection.query(
        'INSERT IGNORE INTO master_addons (master_addon_type_id, code, sort_order, is_active) VALUES (?, ?, ?, 1)',
        [atMap['portion'], addon.code, addon.sort]
      );
    }

    // Extras
    const extraAddons = [
      { code: 'extra_cheese', sort: 1 },
      { code: 'extra_meat', sort: 2 },
      { code: 'extra_vegetables', sort: 3 },
      { code: 'extra_bread', sort: 4 },
    ];
    for (const addon of extraAddons) {
      await connection.query(
        'INSERT IGNORE INTO master_addons (master_addon_type_id, code, sort_order, is_active) VALUES (?, ?, ?, 1)',
        [atMap['extra'], addon.code, addon.sort]
      );
    }

    // Sauces
    const sauceAddons = [
      { code: 'ketchup', sort: 1 },
      { code: 'mayonnaise', sort: 2 },
      { code: 'mustard_sauce', sort: 3 },
      { code: 'bbq_sauce', sort: 4 },
      { code: 'hot_sauce', sort: 5 },
      { code: 'garlic_sauce', sort: 6 },
    ];
    for (const addon of sauceAddons) {
      await connection.query(
        'INSERT IGNORE INTO master_addons (master_addon_type_id, code, sort_order, is_active) VALUES (?, ?, ?, 1)',
        [atMap['sauce'], addon.code, addon.sort]
      );
    }

    // Toppings
    const toppingAddons = [
      { code: 'mushrooms', sort: 1 },
      { code: 'olives', sort: 2 },
      { code: 'onions', sort: 3 },
      { code: 'peppers', sort: 4 },
      { code: 'bacon', sort: 5 },
      { code: 'jalapenos', sort: 6 },
    ];
    for (const addon of toppingAddons) {
      await connection.query(
        'INSERT IGNORE INTO master_addons (master_addon_type_id, code, sort_order, is_active) VALUES (?, ?, ?, 1)',
        [atMap['topping'], addon.code, addon.sort]
      );
    }

    // Sides
    const sideAddons = [
      { code: 'french_fries', sort: 1 },
      { code: 'rice', sort: 2 },
      { code: 'mashed_potatoes', sort: 3 },
      { code: 'coleslaw', sort: 4 },
      { code: 'garden_salad', sort: 5 },
    ];
    for (const addon of sideAddons) {
      await connection.query(
        'INSERT IGNORE INTO master_addons (master_addon_type_id, code, sort_order, is_active) VALUES (?, ?, ?, 1)',
        [atMap['side'], addon.code, addon.sort]
      );
    }

    // Drinks
    const drinkAddons = [
      { code: 'water', sort: 1 },
      { code: 'cola', sort: 2 },
      { code: 'lemonade', sort: 3 },
      { code: 'iced_tea', sort: 4 },
      { code: 'orange_juice', sort: 5 },
    ];
    for (const addon of drinkAddons) {
      await connection.query(
        'INSERT IGNORE INTO master_addons (master_addon_type_id, code, sort_order, is_active) VALUES (?, ?, ?, 1)',
        [atMap['drink'], addon.code, addon.sort]
      );
    }

    // Master addon translations
    const [allAddons] = await connection.query<any[]>('SELECT id, code, master_addon_type_id FROM master_addons');
    const maMap: Record<string, number> = {};
    for (const a of allAddons) { maMap[a.code] = a.id; }

    const maTranslations: Record<string, Record<string, string>> = {
      // Portions
      small: { en: 'Small', tr: 'Küçük', de: 'Klein', el: 'Μικρό', es: 'Pequeño', fr: 'Petit', ru: 'Маленький' },
      medium: { en: 'Medium', tr: 'Orta', de: 'Mittel', el: 'Μεσαίο', es: 'Mediano', fr: 'Moyen', ru: 'Средний' },
      large: { en: 'Large', tr: 'Büyük', de: 'Groß', el: 'Μεγάλο', es: 'Grande', fr: 'Grand', ru: 'Большой' },
      family: { en: 'Family Size', tr: 'Aile Boyu', de: 'Familiengröße', el: 'Οικογενειακό', es: 'Familiar', fr: 'Familial', ru: 'Семейный' },
      // Extras
      extra_cheese: { en: 'Extra Cheese', tr: 'Ekstra Peynir', de: 'Extra Käse', el: 'Επιπλέον Τυρί', es: 'Extra Queso', fr: 'Fromage Supplémentaire', ru: 'Дополнительный Сыр' },
      extra_meat: { en: 'Extra Meat', tr: 'Ekstra Et', de: 'Extra Fleisch', el: 'Επιπλέον Κρέας', es: 'Extra Carne', fr: 'Viande Supplémentaire', ru: 'Дополнительное Мясо' },
      extra_vegetables: { en: 'Extra Vegetables', tr: 'Ekstra Sebze', de: 'Extra Gemüse', el: 'Επιπλέον Λαχανικά', es: 'Extra Verduras', fr: 'Légumes Supplémentaires', ru: 'Дополнительные Овощи' },
      extra_bread: { en: 'Extra Bread', tr: 'Ekstra Ekmek', de: 'Extra Brot', el: 'Επιπλέον Ψωμί', es: 'Extra Pan', fr: 'Pain Supplémentaire', ru: 'Дополнительный Хлеб' },
      // Sauces
      ketchup: { en: 'Ketchup', tr: 'Ketçap', de: 'Ketchup', el: 'Κέτσαπ', es: 'Ketchup', fr: 'Ketchup', ru: 'Кетчуп' },
      mayonnaise: { en: 'Mayonnaise', tr: 'Mayonez', de: 'Mayonnaise', el: 'Μαγιονέζα', es: 'Mayonesa', fr: 'Mayonnaise', ru: 'Майонез' },
      mustard_sauce: { en: 'Mustard', tr: 'Hardal', de: 'Senf', el: 'Μουστάρδα', es: 'Mostaza', fr: 'Moutarde', ru: 'Горчица' },
      bbq_sauce: { en: 'BBQ Sauce', tr: 'BBQ Sos', de: 'BBQ-Soße', el: 'Σάλτσα BBQ', es: 'Salsa BBQ', fr: 'Sauce BBQ', ru: 'Соус BBQ' },
      hot_sauce: { en: 'Hot Sauce', tr: 'Acı Sos', de: 'Scharfe Soße', el: 'Καυτερή Σάλτσα', es: 'Salsa Picante', fr: 'Sauce Piquante', ru: 'Острый Соус' },
      garlic_sauce: { en: 'Garlic Sauce', tr: 'Sarımsak Sos', de: 'Knoblauchsoße', el: 'Σκορδοσάλτσα', es: 'Salsa de Ajo', fr: 'Sauce à l\'Ail', ru: 'Чесночный Соус' },
      // Toppings
      mushrooms: { en: 'Mushrooms', tr: 'Mantar', de: 'Pilze', el: 'Μανιτάρια', es: 'Champiñones', fr: 'Champignons', ru: 'Грибы' },
      olives: { en: 'Olives', tr: 'Zeytin', de: 'Oliven', el: 'Ελιές', es: 'Aceitunas', fr: 'Olives', ru: 'Оливки' },
      onions: { en: 'Onions', tr: 'Soğan', de: 'Zwiebeln', el: 'Κρεμμύδια', es: 'Cebollas', fr: 'Oignons', ru: 'Лук' },
      peppers: { en: 'Peppers', tr: 'Biber', de: 'Paprika', el: 'Πιπεριές', es: 'Pimientos', fr: 'Poivrons', ru: 'Перец' },
      bacon: { en: 'Bacon', tr: 'Pastırma', de: 'Speck', el: 'Μπέικον', es: 'Bacon', fr: 'Bacon', ru: 'Бекон' },
      jalapenos: { en: 'Jalapeños', tr: 'Jalapeño', de: 'Jalapeños', el: 'Χαλαπένιο', es: 'Jalapeños', fr: 'Jalapeños', ru: 'Халапеньо' },
      // Sides
      french_fries: { en: 'French Fries', tr: 'Patates Kızartması', de: 'Pommes Frites', el: 'Τηγανητές Πατάτες', es: 'Papas Fritas', fr: 'Frites', ru: 'Картофель Фри' },
      rice: { en: 'Rice', tr: 'Pilav', de: 'Reis', el: 'Ρύζι', es: 'Arroz', fr: 'Riz', ru: 'Рис' },
      mashed_potatoes: { en: 'Mashed Potatoes', tr: 'Patates Püresi', de: 'Kartoffelpüree', el: 'Πουρές Πατάτας', es: 'Puré de Papas', fr: 'Purée de Pommes de Terre', ru: 'Картофельное Пюре' },
      coleslaw: { en: 'Coleslaw', tr: 'Lahana Salatası', de: 'Krautsalat', el: 'Σαλάτα Λάχανο', es: 'Ensalada de Col', fr: 'Salade de Chou', ru: 'Капустный Салат' },
      garden_salad: { en: 'Garden Salad', tr: 'Mevsim Salata', de: 'Gartensalat', el: 'Σαλάτα Κήπου', es: 'Ensalada de Jardín', fr: 'Salade du Jardin', ru: 'Овощной Салат' },
      // Drinks
      water: { en: 'Water', tr: 'Su', de: 'Wasser', el: 'Νερό', es: 'Agua', fr: 'Eau', ru: 'Вода' },
      cola: { en: 'Cola', tr: 'Kola', de: 'Cola', el: 'Κόλα', es: 'Cola', fr: 'Cola', ru: 'Кола' },
      lemonade: { en: 'Lemonade', tr: 'Limonata', de: 'Limonade', el: 'Λεμονάδα', es: 'Limonada', fr: 'Limonade', ru: 'Лимонад' },
      iced_tea: { en: 'Iced Tea', tr: 'Buzlu Çay', de: 'Eistee', el: 'Παγωμένο Τσάι', es: 'Té Helado', fr: 'Thé Glacé', ru: 'Холодный Чай' },
      orange_juice: { en: 'Orange Juice', tr: 'Portakal Suyu', de: 'Orangensaft', el: 'Χυμός Πορτοκάλι', es: 'Jugo de Naranja', fr: 'Jus d\'Orange', ru: 'Апельсиновый Сок' },
    };

    for (const [code, translations] of Object.entries(maTranslations)) {
      for (const [langCode, name] of Object.entries(translations)) {
        if (langMap[langCode] && maMap[code]) {
          await connection.query(
            'INSERT IGNORE INTO master_addon_translations (master_addon_id, language_id, name) VALUES (?, ?, ?)',
            [maMap[code], langMap[langCode], name]
          );
        }
      }
    }

    // Bridge all addons to all restaurant tenant types
    for (const ttCode of Object.keys(ttMap)) {
      for (const maCode of Object.keys(maMap)) {
        await connection.query(
          'INSERT IGNORE INTO tenant_type_addons (tenant_type_id, master_addon_id, is_default, sort_order) VALUES (?, ?, 1, ?)',
          [ttMap[ttCode], maMap[maCode], maMap[maCode]]
        );
      }
    }
    console.log('✅ Master addons seeded\n');

    console.log('🎉 [RESTAURANT LOOKUPS] All master data seeded successfully!\n');
  } catch (err) {
    console.error('❌ [RESTAURANT LOOKUPS] Seeding failed:', err);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

seedRestaurantLookups();
