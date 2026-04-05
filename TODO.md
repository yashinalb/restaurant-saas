# Restaurant SaaS - Table CRUD To-Do List

Legend: [x] = backend + frontend done | [ ] = needs to be built

---

## DONE - Migration 001: Core Foundation

- [x] languages
- [x] currencies
- [x] tenant_types + tenant_type_translations
- [x] subscription_plans
- [x] tenants
- [x] admin_users
- [x] tenant_subscriptions (managed within tenant)
- [x] tenant_languages (query-only endpoints)
- [x] tenant_currencies (query-only endpoints)

## DONE - Migration 002: Admin & Access

- [x] roles + permissions + role_permissions
- [x] admin_tenant_access + admin_permissions
- [x] admin_refresh_tokens (auth system)
- [x] activity_logs
- [x] user_invitations

## DONE - Migration 003: Email Verification

- [x] email_verification_tokens (auth system)

---
---

# TO DO - Priority Order

---

## PRIORITY 1: Stores & Settings (Migration 004)

### [x] 1. Stores

Tables: `stores`

```
Read .claude/skills/tenant-backend.md and .claude/skills/tenant-frontend.md.
Create full CRUD for stores.
Tenant-scoped physical restaurant locations. Fields include name, slug, address, phone, timezone, opening_hours (JSON), printer IPs (kitchen, bar, receipt), feature flags (kds_enabled, kiosk_enabled, online_ordering_enabled, qr_ordering_enabled), tax/service charge rates.
```

### [x] 2. Tenant Settings

Tables: `tenant_settings`

```
Read .claude/skills/tenant-backend.md and .claude/skills/tenant-frontend.md.
Create full CRUD for tenant_settings.
Key-value settings per tenant. setting_key, setting_value, setting_type (string|number|boolean|json). No translations.
```

---

## PRIORITY 2: Master Restaurant Lookups (Migration 005 + 014)

### [ ] 3. Master Addon Types

Tables: `master_addon_types` + `master_addon_type_translations`

```
Read .claude/skills/master-backend.md and .claude/skills/master-frontend.md.
Create full CRUD for master_addon_types + master_addon_type_translations.
Pre-seeded: portion, extra, sauce, topping, side, drink.
```

### [ ] 4. Master Addons

Tables: `master_addons` + `master_addon_translations`

```
Read .claude/skills/master-backend.md and .claude/skills/master-frontend.md.
Create full CRUD for master_addons + master_addon_translations.
FK to master_addon_types. Pre-seeded: Small/Medium/Large portions, sauces (ketchup, BBQ, etc.), toppings, sides, drinks.
```

### [ ] 5. Master Order Sources

Tables: `master_order_sources` + `master_order_source_translations`

```
Read .claude/skills/master-backend.md and .claude/skills/master-frontend.md.
Create full CRUD for master_order_sources + master_order_source_translations.
Pre-seeded: in_store, online, kiosk, phone, third_party.
```

### [ ] 6. Master Order Types

Tables: `master_order_types` + `master_order_type_translations`

```
Read .claude/skills/master-backend.md and .claude/skills/master-frontend.md.
Create full CRUD for master_order_types + master_order_type_translations.
Pre-seeded: dine_in, takeaway, delivery, drive_through.
```

### [ ] 7. Master Order Destinations

Tables: `master_order_destinations` + `master_order_destination_translations`

```
Read .claude/skills/master-backend.md and .claude/skills/master-frontend.md.
Create full CRUD for master_order_destinations + master_order_destination_translations.
Pre-seeded: kitchen, bar, dessert_station, grill, cold_kitchen.
```

### [ ] 8. Master Payment Types

Tables: `master_payment_types` + `master_payment_type_translations`

```
Read .claude/skills/master-backend.md and .claude/skills/master-frontend.md.
Create full CRUD for master_payment_types + master_payment_type_translations.
Pre-seeded: cash, credit_card, debit_card, mobile_pay, voucher, online_payment.
```

### [ ] 9. Master Order Item Statuses

Tables: `master_order_item_statuses` + `master_order_item_status_translations`

```
Read .claude/skills/master-backend.md and .claude/skills/master-frontend.md.
Create full CRUD for master_order_item_statuses + master_order_item_status_translations.
Has color field. Pre-seeded: pending, preparing, ready, served, cancelled.
```

### [ ] 10. Master Payment Statuses

Tables: `master_payment_statuses` + `master_payment_status_translations`

```
Read .claude/skills/master-backend.md and .claude/skills/master-frontend.md.
Create full CRUD for master_payment_statuses + master_payment_status_translations.
Has color field. Pre-seeded: unpaid, partially_paid, paid, refunded, void.
```

### [ ] 11. Master Ingredients

Tables: `master_ingredients` + `master_ingredient_translations`

```
Read .claude/skills/master-backend.md and .claude/skills/master-frontend.md.
Create full CRUD for master_ingredients + master_ingredient_translations.
Has allergen_type field (allergen|dietary|ingredient), icon_url. Pre-seeded: 14 EU allergens + 6 dietary markers.
```

### [ ] 12. Master Expense Categories

Tables: `master_expense_categories` + `master_expense_category_translations`

```
Read .claude/skills/master-backend.md and .claude/skills/master-frontend.md.
Create full CRUD for master_expense_categories + master_expense_category_translations.
Pre-seeded: rent, utilities, food_supplies, beverage_supplies, cleaning_supplies, equipment, maintenance, marketing, insurance, labor, licenses, other.
```

### [ ] 13. Master Menu Categories

Tables: `master_menu_categories` + `master_menu_category_translations`

```
Read .claude/skills/master-backend.md and .claude/skills/master-frontend.md.
Create full CRUD for master_menu_categories + master_menu_category_translations.
Has parent_id (self-referencing hierarchy), icon_url, image_url. Pre-seeded: 16 categories (appetizers, soups, salads, main_course, grills, seafood, pasta, pizza, sandwiches, sides, desserts, hot_beverages, cold_beverages, alcoholic_beverages, kids_menu, breakfast).
```

---

## PRIORITY 3: Tenant Menu System (Migration 006 + 007)

### [ ] 14. Tenant Menu Categories

Tables: `tenant_menu_categories` + `tenant_menu_category_translations` + `tenant_menu_category_images`

```
Read .claude/skills/tenant-backend.md and .claude/skills/tenant-frontend.md.
Create full CRUD for tenant_menu_categories + tenant_menu_category_translations.
Has import-from-master pattern (master_menu_category_id FK). Hierarchical (parent_id), per-store optional (store_id), visibility flags (show_on_website, show_on_pos, show_on_kiosk), vat_rate. Also manages tenant_menu_category_images (slideshow).
```

### [ ] 15. Tenant Ingredients

Tables: `tenant_ingredients` + `tenant_ingredient_translations`

```
Read .claude/skills/tenant-backend.md and .claude/skills/tenant-frontend.md.
Create full CRUD for tenant_ingredients + tenant_ingredient_translations.
Has import-from-master pattern (master_ingredient_id FK). allergen_type field, icon_url.
```

### [ ] 16. Tenant Addon Types

Tables: `tenant_addon_types` + `tenant_addon_type_translations`

```
Read .claude/skills/tenant-backend.md and .claude/skills/tenant-frontend.md.
Create full CRUD for tenant_addon_types + tenant_addon_type_translations.
Has import-from-master pattern (master_addon_type_id FK).
```

### [ ] 17. Tenant Addons

Tables: `tenant_addons` + `tenant_addon_translations` + `tenant_addon_prices`

```
Read .claude/skills/tenant-backend.md and .claude/skills/tenant-frontend.md.
Create full CRUD for tenant_addons + tenant_addon_translations.
Has import-from-master pattern (master_addon_id FK). FK to tenant_addon_types. Also manages tenant_addon_prices (per currency, per store).
```

### [ ] 18. Tenant Order Destinations

Tables: `tenant_order_destinations` + `tenant_order_destination_translations`

```
Read .claude/skills/tenant-backend.md and .claude/skills/tenant-frontend.md.
Create full CRUD for tenant_order_destinations + tenant_order_destination_translations.
Has import-from-master pattern (master_order_destination_id FK). Extra fields: printer_ip, kds_screen_id.
```

### [ ] 19. Tenant Menu Items

Tables: `tenant_menu_items` + `tenant_menu_item_translations` + `tenant_menu_item_prices` + `tenant_menu_item_images`

```
Read .claude/skills/tenant-backend.md and .claude/skills/tenant-frontend.md.
Create full CRUD for tenant_menu_items + tenant_menu_item_translations.
Complex entity: FK to category + order destination. Manages prices (per currency/store), images, is_weighted, is_combo, vat_rate, many visibility/display flags (show_ingredients_*, show_addon_*, show_on_*).
Also manages: tenant_menu_item_addons (which addons available), tenant_menu_item_ingredients (which ingredients), tenant_menu_item_combo_links (combo composition).
```

---

## PRIORITY 4: Seating & Staff (Migration 008)

### [ ] 20. Tenant Seating Areas

Tables: `tenant_seating_areas` + `tenant_seating_area_translations`

```
Read .claude/skills/tenant-backend.md and .claude/skills/tenant-frontend.md.
Create full CRUD for tenant_seating_areas + tenant_seating_area_translations.
Per-store (store_id FK required). E.g. Indoor, Terrace, Garden, VIP.
```

### [ ] 21. Tenant Table Structures

Tables: `tenant_table_structures`

```
Read .claude/skills/tenant-backend.md and .claude/skills/tenant-frontend.md.
Create full CRUD for tenant_table_structures.
No translations. Per-store, FK to seating_area. Floor plan fields (position_x, position_y, width, height, shape), capacity, status (available|occupied|reserved|blocked). Table merging support (parent_table_id, is_temporary_merge, merged_at, merged_by).
```

### [ ] 22. Tenant Waiters

Tables: `tenant_waiters` + `tenant_waiter_sessions`

```
Read .claude/skills/tenant-backend.md and .claude/skills/tenant-frontend.md.
Create full CRUD for tenant_waiters.
No translations. PIN-based auth (unique per tenant), per-store optional, image_url. Also manages tenant_waiter_sessions (login/logout tracking with device_identifier, ip_address).
```

### [ ] 23. Tenant Customers

Tables: `tenant_customers`

```
Read .claude/skills/tenant-backend.md and .claude/skills/tenant-frontend.md.
Create full CRUD for tenant_customers.
No translations. Supports registered (password_hash) and guest (NULL password). Address fields, phone, email (unique per tenant), notes.
```

### [ ] 24. Reservations

Tables: `reservations` + `reservation_tables`

```
Read .claude/skills/tenant-backend.md and .claude/skills/tenant-frontend.md.
Create full CRUD for reservations.
No translations. Per-store, FK to primary_table + optional customer. guest_count, reserved_at, duration_minutes, status workflow (pending→confirmed→checked_in→completed/cancelled/no_show), source (phone|online|walk_in|third_party). Multi-table support via reservation_tables junction.
```

---

## PRIORITY 5: Order System (Migration 009)

### [ ] 25. Tenant Order Sources

Tables: `tenant_order_sources` + `tenant_order_source_translations`

```
Read .claude/skills/tenant-backend.md and .claude/skills/tenant-frontend.md.
Create full CRUD for tenant_order_sources + tenant_order_source_translations.
Has import-from-master pattern (master_order_source_id FK).
```

### [ ] 26. Tenant Order Types

Tables: `tenant_order_types` + `tenant_order_type_translations`

```
Read .claude/skills/tenant-backend.md and .claude/skills/tenant-frontend.md.
Create full CRUD for tenant_order_types + tenant_order_type_translations.
Has import-from-master pattern (master_order_type_id FK).
```

### [ ] 27. Tenant Order Item Statuses

Tables: `tenant_order_item_statuses` + `tenant_order_item_status_translations`

```
Read .claude/skills/tenant-backend.md and .claude/skills/tenant-frontend.md.
Create full CRUD for tenant_order_item_statuses + tenant_order_item_status_translations.
Has import-from-master pattern (master_order_item_status_id FK). Has color field.
```

### [ ] 28. Tenant Payment Statuses

Tables: `tenant_payment_statuses` + `tenant_payment_status_translations`

```
Read .claude/skills/tenant-backend.md and .claude/skills/tenant-frontend.md.
Create full CRUD for tenant_payment_statuses + tenant_payment_status_translations.
Has import-from-master pattern (master_payment_status_id FK). Has color field.
```

### [ ] 29. Orders + Order Items

Tables: `orders` + `order_items`

```
Read .claude/skills/tenant-backend.md and .claude/skills/tenant-frontend.md.
Create full CRUD for orders.
Complex transactional entity. Per-store, FKs to customer, waiter, table, order_source, order_type, payment_status, currency. order_number (unique per tenant+store). Denormalized totals (subtotal, tax, service_charge, discount, total). Table joining support (is_joined, joined_tables JSON). Status: open|closed|cancelled|void.
order_items: FK to order, menu_item, order_item_status. Per-item payment tracking (is_paid, amount_paid, payment_history JSON). selected_addons/ingredients as JSON snapshot. Weighted portion support.
```

---

## PRIORITY 6: Transactions & Payments (Migration 010)

### [ ] 30. Tenant Payment Types

Tables: `tenant_payment_types` + `tenant_payment_type_translations`

```
Read .claude/skills/tenant-backend.md and .claude/skills/tenant-frontend.md.
Create full CRUD for tenant_payment_types + tenant_payment_type_translations.
Has import-from-master pattern (master_payment_type_id FK).
```

### [ ] 31. Transactions + Transaction Payments

Tables: `transactions` + `transaction_payments`

```
Read .claude/skills/tenant-backend.md and .claude/skills/tenant-frontend.md.
Create full CRUD for transactions.
Per-store, FK to order + payment_status + currency. Tracks amount_before_vat, vat_amount, service_charge, total, paid, remaining. Joined transaction support.
transaction_payments: FK to transaction + payment_type + currency. payment_mode (full|partial|per_item|mixed). paid_items JSON for per_item mode. exchange_rate for multi-currency. reference_number for card/mobile refs.
```

### [ ] 32. QR Invoice Tokens

Tables: `qr_invoice_tokens`

```
Read .claude/skills/tenant-backend.md and .claude/skills/tenant-frontend.md.
Create full CRUD for qr_invoice_tokens.
No translations. FK to order + table. Token-based access with status (active|expired|used), expires_at, metadata JSON.
```

---

## PRIORITY 7: Inventory & Suppliers (Migration 011)

### [ ] 33. Tenant Suppliers

Tables: `tenant_suppliers`

```
Read .claude/skills/tenant-backend.md and .claude/skills/tenant-frontend.md.
Create full CRUD for tenant_suppliers.
No translations. Contact info: name, contact_person, phone, email, address, tax_id, notes.
```

### [ ] 34. Tenant Inventory Products

Tables: `tenant_inventory_products` + `tenant_inventory_product_suppliers`

```
Read .claude/skills/tenant-backend.md and .claude/skills/tenant-frontend.md.
Create full CRUD for tenant_inventory_products.
No translations. Raw materials (distinct from menu items). product_code, stock tracking (unit_in_stock, low_stock_threshold), carton support (has_carton, units_per_carton), VAT fields, buying prices. Many-to-many supplier link via tenant_inventory_product_suppliers.
```

### [ ] 35. Supplier Invoices + Stock Intakes

Tables: `supplier_invoices` + `stock_intakes`

```
Read .claude/skills/tenant-backend.md and .claude/skills/tenant-frontend.md.
Create full CRUD for supplier_invoices.
FK to supplier + currency. Invoice tracking with stock_status (pending|partial|received). 
stock_intakes: Per-store, FK to supplier + invoice + product. Tracks quantity_ordered vs quantity_received, carton support, received_by + received_at.
```

### [ ] 36. Supplier Credits + Payments

Tables: `supplier_credits` + `supplier_payment_records`

```
Read .claude/skills/tenant-backend.md and .claude/skills/tenant-frontend.md.
Create full CRUD for supplier_credits.
FK to supplier + invoice + currency. Tracks credit_amount, amount_paid, balance.
supplier_payment_records: FK to credit + payment_type + currency. Tracks individual payments against credit balances.
```

---

## PRIORITY 8: Expenses (Migration 012)

### [ ] 37. Tenant Expense Categories

Tables: `tenant_expense_categories` + `tenant_expense_category_translations`

```
Read .claude/skills/tenant-backend.md and .claude/skills/tenant-frontend.md.
Create full CRUD for tenant_expense_categories + tenant_expense_category_translations.
Has import-from-master pattern (master_expense_category_id FK).
```

### [ ] 38. Tenant Expense Sources

Tables: `tenant_expense_sources` + `tenant_expense_source_translations`

```
Read .claude/skills/tenant-backend.md and .claude/skills/tenant-frontend.md.
Create full CRUD for tenant_expense_sources + tenant_expense_source_translations.
FK to tenant_expense_categories. Sub-categories for expenses.
```

### [ ] 39. Expenses + Expense Payments

Tables: `expenses` + `expense_payments`

```
Read .claude/skills/tenant-backend.md and .claude/skills/tenant-frontend.md.
Create full CRUD for expenses.
Per-store optional, FK to expense_source + currency. payment_status (unpaid|partially_paid|paid), due_date, attachment_url.
expense_payments: FK to expense + payment_type + currency. Tracks individual payments.
```

---

## PRIORITY 9: KDS & Reporting (Migration 013)

### [ ] 40. KDS Orders (Kitchen Display System)

Tables: `kds_orders`

```
Read .claude/skills/tenant-backend.md and .claude/skills/tenant-frontend.md.
Create full CRUD for kds_orders.
No translations. Per-store, FK to order + order_item + order_destination. Status workflow (pending��preparing→ready→served/cancelled). priority (0=normal, 1=rush), estimated_prep_time, timing (started_at, completed_at).
```

### [ ] 41. Daily Report Snapshots

Tables: `daily_report_snapshots`

```
Read .claude/skills/tenant-backend.md and .claude/skills/tenant-frontend.md.
Create full CRUD for daily_report_snapshots.
No translations. Per-store + currency. End-of-day aggregation: total_orders, total_revenue, total_tax, total_tips, total_discounts, total_refunds, total_expenses, order_count_by_type JSON, payment_breakdown JSON. Unique per (tenant, store, date, currency).
```

### [ ] 42. Cash Register Sessions

Tables: `cash_register_sessions`

```
Read .claude/skills/tenant-backend.md and .claude/skills/tenant-frontend.md.
Create full CRUD for cash_register_sessions.
No translations. Per-store. Shift management: opened_by/closed_by (admin_users), opening/closing/expected amounts, difference calculation. Currency-aware.
```

---

## PRIORITY 10: Storefront (Future)

### [ ] 43. Storefront Foundation

```
Set up public-facing storefront app (React + TailwindCSS) for online menu browsing, QR ordering, and online reservations. Follow supermarket-saas storefront pattern.
```

### [ ] 44. POS Interface

```
Build the POS (Point of Sale) interface as a dedicated section within the admin panel or as a standalone app. Table selection → order creation → item selection → payment processing → receipt/QR. Needs real-time updates (WebSocket) for KDS integration.
```

---

## Database Summary

| Migration | Tables | Status |
|-----------|--------|--------|
| 001 Core | 12 | DONE (migrated + seeded) |
| 002 Admin | 8 | DONE (migrated + seeded) |
| 003 Email | 1 | DONE (migrated) |
| 004 Stores | 2 | DONE (migrated) |
| 005 Master Lookups | 19 | DONE (migrated + seeded) |
| 006 Menu Categories | 5 | DONE (migrated) |
| 007 Menu Items & Addons | 15 | DONE (migrated) |
| 008 Seating & Staff | 8 | DONE (migrated) |
| 009 Orders | 10 | DONE (migrated) |
| 010 Transactions | 5 | DONE (migrated) |
| 011 Inventory | 7 | DONE (migrated) |
| 012 Expenses | 6 | DONE (migrated) |
| 013 KDS & Reporting | 3 | DONE (migrated) |
| 014 Master Categories & Addons | 6 | DONE (migrated + seeded) |
| **TOTAL** | **107** | **All migrated** |
