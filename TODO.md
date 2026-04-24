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

### [x] 3. Master Addon Types

Tables: `master_addon_types` + `master_addon_type_translations`

```
Read .claude/skills/master-backend.md and .claude/skills/master-frontend.md.
Create full CRUD for master_addon_types + master_addon_type_translations.
Pre-seeded: portion, extra, sauce, topping, side, drink.
```

### [x] 4. Master Addons

Tables: `master_addons` + `master_addon_translations`

```
Read .claude/skills/master-backend.md and .claude/skills/master-frontend.md.
Create full CRUD for master_addons + master_addon_translations.
FK to master_addon_types. Pre-seeded: Small/Medium/Large portions, sauces (ketchup, BBQ, etc.), toppings, sides, drinks.
```

### [x] 5. Master Order Sources

Tables: `master_order_sources` + `master_order_source_translations`

```
Read .claude/skills/master-backend.md and .claude/skills/master-frontend.md.
Create full CRUD for master_order_sources + master_order_source_translations.
Pre-seeded: in_store, online, kiosk, phone, third_party.
```

### [x] 6. Master Order Types

Tables: `master_order_types` + `master_order_type_translations`

```
Read .claude/skills/master-backend.md and .claude/skills/master-frontend.md.
Create full CRUD for master_order_types + master_order_type_translations.
Pre-seeded: dine_in, takeaway, delivery, drive_through.
```

### [x] 7. Master Order Destinations

Tables: `master_order_destinations` + `master_order_destination_translations`

```
Read .claude/skills/master-backend.md and .claude/skills/master-frontend.md.
Create full CRUD for master_order_destinations + master_order_destination_translations.
Pre-seeded: kitchen, bar, dessert_station, grill, cold_kitchen.
```

### [x] 8. Master Payment Types

Tables: `master_payment_types` + `master_payment_type_translations`

```
Read .claude/skills/master-backend.md and .claude/skills/master-frontend.md.
Create full CRUD for master_payment_types + master_payment_type_translations.
Pre-seeded: cash, credit_card, debit_card, mobile_pay, voucher, online_payment.
```

### [x] 9. Master Order Item Statuses

Tables: `master_order_item_statuses` + `master_order_item_status_translations`

```
Read .claude/skills/master-backend.md and .claude/skills/master-frontend.md.
Create full CRUD for master_order_item_statuses + master_order_item_status_translations.
Has color field. Pre-seeded: pending, preparing, ready, served, cancelled.
```

### [x] 10. Master Payment Statuses

Tables: `master_payment_statuses` + `master_payment_status_translations`

```
Read .claude/skills/master-backend.md and .claude/skills/master-frontend.md.
Create full CRUD for master_payment_statuses + master_payment_status_translations.
Has color field. Pre-seeded: unpaid, partially_paid, paid, refunded, void.
```

### [x] 11. Master Ingredients

Tables: `master_ingredients` + `master_ingredient_translations`

```
Read .claude/skills/master-backend.md and .claude/skills/master-frontend.md.
Create full CRUD for master_ingredients + master_ingredient_translations.
Has allergen_type field (allergen|dietary|ingredient), icon_url. Pre-seeded: 14 EU allergens + 6 dietary markers.
```

### [x] 12. Master Expense Categories

Tables: `master_expense_categories` + `master_expense_category_translations`

```
Read .claude/skills/master-backend.md and .claude/skills/master-frontend.md.
Create full CRUD for master_expense_categories + master_expense_category_translations.
Pre-seeded: rent, utilities, food_supplies, beverage_supplies, cleaning_supplies, equipment, maintenance, marketing, insurance, labor, licenses, other.
```

### [x] 13. Master Menu Categories

Tables: `master_menu_categories` + `master_menu_category_translations`

```
Read .claude/skills/master-backend.md and .claude/skills/master-frontend.md.
Create full CRUD for master_menu_categories + master_menu_category_translations.
Has parent_id (self-referencing hierarchy), icon_url, image_url. Pre-seeded: 16 categories (appetizers, soups, salads, main_course, grills, seafood, pasta, pizza, sandwiches, sides, desserts, hot_beverages, cold_beverages, alcoholic_beverages, kids_menu, breakfast).
```

---

## PRIORITY 3: Tenant Menu System (Migration 006 + 007)

### [x] 14. Tenant Menu Categories

Tables: `tenant_menu_categories` + `tenant_menu_category_translations` + `tenant_menu_category_images`

```
Read .claude/skills/tenant-backend.md and .claude/skills/tenant-frontend.md.
Create full CRUD for tenant_menu_categories + tenant_menu_category_translations.
Has import-from-master pattern (master_menu_category_id FK). Hierarchical (parent_id), per-store optional (store_id), visibility flags (show_on_website, show_on_pos, show_on_kiosk), vat_rate. Also manages tenant_menu_category_images (slideshow).
```

### [x] 15. Tenant Ingredients

Tables: `tenant_ingredients` + `tenant_ingredient_translations`

```
Read .claude/skills/tenant-backend.md and .claude/skills/tenant-frontend.md.
Create full CRUD for tenant_ingredients + tenant_ingredient_translations.
Has import-from-master pattern (master_ingredient_id FK). allergen_type field, icon_url.
```

### [x] 16. Tenant Addon Types

Tables: `tenant_addon_types` + `tenant_addon_type_translations`

```
Read .claude/skills/tenant-backend.md and .claude/skills/tenant-frontend.md.
Create full CRUD for tenant_addon_types + tenant_addon_type_translations.
Has import-from-master pattern (master_addon_type_id FK).
```

### [x] 17. Tenant Addons

Tables: `tenant_addons` + `tenant_addon_translations` + `tenant_addon_prices`

```
Read .claude/skills/tenant-backend.md and .claude/skills/tenant-frontend.md.
Create full CRUD for tenant_addons + tenant_addon_translations.
Has import-from-master pattern (master_addon_id FK). FK to tenant_addon_types. Also manages tenant_addon_prices (per currency, per store).
```

### [x] 18. Tenant Order Destinations

Tables: `tenant_order_destinations` + `tenant_order_destination_translations`

```
Read .claude/skills/tenant-backend.md and .claude/skills/tenant-frontend.md.
Create full CRUD for tenant_order_destinations + tenant_order_destination_translations.
Has import-from-master pattern (master_order_destination_id FK). Extra fields: printer_ip, kds_screen_id.
```

### [x] 19. Tenant Menu Items

Tables: `tenant_menu_items` + `tenant_menu_item_translations` + `tenant_menu_item_prices` + `tenant_menu_item_images`

```
Read .claude/skills/tenant-backend.md and .claude/skills/tenant-frontend.md.
Create full CRUD for tenant_menu_items + tenant_menu_item_translations.
Complex entity: FK to category + order destination. Manages prices (per currency/store), images, is_weighted, is_combo, vat_rate, many visibility/display flags (show_ingredients_*, show_addon_*, show_on_*).
Also manages: tenant_menu_item_addons (which addons available), tenant_menu_item_ingredients (which ingredients), tenant_menu_item_combo_links (combo composition).
```

---

## PRIORITY 4: Seating & Staff (Migration 008)

### [x] 20. Tenant Seating Areas

Tables: `tenant_seating_areas` + `tenant_seating_area_translations`

```
Read .claude/skills/tenant-backend.md and .claude/skills/tenant-frontend.md.
Create full CRUD for tenant_seating_areas + tenant_seating_area_translations.
Per-store (store_id FK required). E.g. Indoor, Terrace, Garden, VIP.
```

### [x] 21. Tenant Table Structures

Tables: `tenant_table_structures`

```
Read .claude/skills/tenant-backend.md and .claude/skills/tenant-frontend.md.
Create full CRUD for tenant_table_structures.
No translations. Per-store, FK to seating_area. Floor plan fields (position_x, position_y, width, height, shape), capacity, status (available|occupied|reserved|blocked). Table merging support (parent_table_id, is_temporary_merge, merged_at, merged_by).
```

### [x] 22. Tenant Waiters

Tables: `tenant_waiters` + `tenant_waiter_sessions`

```
Read .claude/skills/tenant-backend.md and .claude/skills/tenant-frontend.md.
Create full CRUD for tenant_waiters.
No translations. PIN-based auth (unique per tenant), per-store optional, image_url. Also manages tenant_waiter_sessions (login/logout tracking with device_identifier, ip_address).
```

### [x] 23. Tenant Customers

Tables: `tenant_customers`

```
Read .claude/skills/tenant-backend.md and .claude/skills/tenant-frontend.md.
Create full CRUD for tenant_customers.
No translations. Supports registered (password_hash) and guest (NULL password). Address fields, phone, email (unique per tenant), notes.
```

### [x] 24. Reservations

Tables: `reservations` + `reservation_tables`

```
Read .claude/skills/tenant-backend.md and .claude/skills/tenant-frontend.md.
Create full CRUD for reservations.
No translations. Per-store, FK to primary_table + optional customer. guest_count, reserved_at, duration_minutes, status workflow (pending→confirmed→checked_in→completed/cancelled/no_show), source (phone|online|walk_in|third_party). Multi-table support via reservation_tables junction.
```

---

## PRIORITY 5: Order System (Migration 009)

### [x] 25. Tenant Order Sources

Tables: `tenant_order_sources` + `tenant_order_source_translations`

```
Read .claude/skills/tenant-backend.md and .claude/skills/tenant-frontend.md.
Create full CRUD for tenant_order_sources + tenant_order_source_translations.
Has import-from-master pattern (master_order_source_id FK).
```

### [x] 26. Tenant Order Types

Tables: `tenant_order_types` + `tenant_order_type_translations`

```
Read .claude/skills/tenant-backend.md and .claude/skills/tenant-frontend.md.
Create full CRUD for tenant_order_types + tenant_order_type_translations.
Has import-from-master pattern (master_order_type_id FK).
```

### [x] 27. Tenant Order Item Statuses

Tables: `tenant_order_item_statuses` + `tenant_order_item_status_translations`

```
Read .claude/skills/tenant-backend.md and .claude/skills/tenant-frontend.md.
Create full CRUD for tenant_order_item_statuses + tenant_order_item_status_translations.
Has import-from-master pattern (master_order_item_status_id FK). Has color field.
```

### [x] 28. Tenant Payment Statuses

Tables: `tenant_payment_statuses` + `tenant_payment_status_translations`

```
Read .claude/skills/tenant-backend.md and .claude/skills/tenant-frontend.md.
Create full CRUD for tenant_payment_statuses + tenant_payment_status_translations.
Has import-from-master pattern (master_payment_status_id FK). Has color field.
```

### [x] 29. Orders + Order Items

Tables: `orders` + `order_items`

```
Read .claude/skills/tenant-backend.md and .claude/skills/tenant-frontend.md.
Create full CRUD for orders.
Complex transactional entity. Per-store, FKs to customer, waiter, table, order_source, order_type, payment_status, currency. order_number (unique per tenant+store). Denormalized totals (subtotal, tax, service_charge, discount, total). Table joining support (is_joined, joined_tables JSON). Status: open|closed|cancelled|void.
order_items: FK to order, menu_item, order_item_status. Per-item payment tracking (is_paid, amount_paid, payment_history JSON). selected_addons/ingredients as JSON snapshot. Weighted portion support.
```

---

## PRIORITY 6: Transactions & Payments (Migration 010)

### [x] 30. Tenant Payment Types

Tables: `tenant_payment_types` + `tenant_payment_type_translations`

```
Read .claude/skills/tenant-backend.md and .claude/skills/tenant-frontend.md.
Create full CRUD for tenant_payment_types + tenant_payment_type_translations.
Has import-from-master pattern (master_payment_type_id FK).
```

### [x] 31. Transactions + Transaction Payments

Tables: `transactions` + `transaction_payments`

```
Read .claude/skills/tenant-backend.md and .claude/skills/tenant-frontend.md.
Create full CRUD for transactions.
Per-store, FK to order + payment_status + currency. Tracks amount_before_vat, vat_amount, service_charge, total, paid, remaining. Joined transaction support.
transaction_payments: FK to transaction + payment_type + currency. payment_mode (full|partial|per_item|mixed). paid_items JSON for per_item mode. exchange_rate for multi-currency. reference_number for card/mobile refs.
```

### [x] 32. QR Invoice Tokens

Tables: `qr_invoice_tokens`

```
Read .claude/skills/tenant-backend.md and .claude/skills/tenant-frontend.md.
Create full CRUD for qr_invoice_tokens.
No translations. FK to order + table. Token-based access with status (active|expired|used), expires_at, metadata JSON.
```

---

## PRIORITY 7: Inventory & Suppliers (Migration 011)

### [x] 33. Tenant Suppliers

Tables: `tenant_suppliers`

```
Read .claude/skills/tenant-backend.md and .claude/skills/tenant-frontend.md.
Create full CRUD for tenant_suppliers.
No translations. Contact info: name, contact_person, phone, email, address, tax_id, notes.
```

### [x] 34. Tenant Inventory Products

Tables: `tenant_inventory_products` + `tenant_inventory_product_suppliers`

```
Read .claude/skills/tenant-backend.md and .claude/skills/tenant-frontend.md.
Create full CRUD for tenant_inventory_products.
No translations. Raw materials (distinct from menu items). product_code, stock tracking (unit_in_stock, low_stock_threshold), carton support (has_carton, units_per_carton), VAT fields, buying prices. Many-to-many supplier link via tenant_inventory_product_suppliers.
```

### [x] 35. Supplier Invoices + Stock Intakes

Tables: `supplier_invoices` + `stock_intakes`

```
Read .claude/skills/tenant-backend.md and .claude/skills/tenant-frontend.md.
Create full CRUD for supplier_invoices.
FK to supplier + currency. Invoice tracking with stock_status (pending|partial|received). 
stock_intakes: Per-store, FK to supplier + invoice + product. Tracks quantity_ordered vs quantity_received, carton support, received_by + received_at.
```

### [x] 36. Supplier Credits + Payments

Tables: `supplier_credits` + `supplier_payment_records`

```
Read .claude/skills/tenant-backend.md and .claude/skills/tenant-frontend.md.
Create full CRUD for supplier_credits.
FK to supplier + invoice + currency. Tracks credit_amount, amount_paid, balance.
supplier_payment_records: FK to credit + payment_type + currency. Tracks individual payments against credit balances.
```

---

## PRIORITY 8: Expenses (Migration 012)

### [x] 37. Tenant Expense Categories

Tables: `tenant_expense_categories` + `tenant_expense_category_translations`

```
Read .claude/skills/tenant-backend.md and .claude/skills/tenant-frontend.md.
Create full CRUD for tenant_expense_categories + tenant_expense_category_translations.
Has import-from-master pattern (master_expense_category_id FK).
```

### [x] 38. Tenant Expense Sources

Tables: `tenant_expense_sources` + `tenant_expense_source_translations`

```
Read .claude/skills/tenant-backend.md and .claude/skills/tenant-frontend.md.
Create full CRUD for tenant_expense_sources + tenant_expense_source_translations.
FK to tenant_expense_categories. Sub-categories for expenses.
```

### [x] 39. Expenses + Expense Payments

Tables: `expenses` + `expense_payments`

```
Read .claude/skills/tenant-backend.md and .claude/skills/tenant-frontend.md.
Create full CRUD for expenses.
Per-store optional, FK to expense_source + currency. payment_status (unpaid|partially_paid|paid), due_date, attachment_url.
expense_payments: FK to expense + payment_type + currency. Tracks individual payments.
```

---

## PRIORITY 9: KDS & Reporting (Migration 013)

### [x] 40. KDS Orders (Kitchen Display System)

Tables: `kds_orders`

```
Read .claude/skills/tenant-backend.md and .claude/skills/tenant-frontend.md.
Create full CRUD for kds_orders.
No translations. Per-store, FK to order + order_item + order_destination. Status workflow (pending��preparing→ready→served/cancelled). priority (0=normal, 1=rush), estimated_prep_time, timing (started_at, completed_at).
```

### [x] 41. Daily Report Snapshots

Tables: `daily_report_snapshots`

```
Read .claude/skills/tenant-backend.md and .claude/skills/tenant-frontend.md.
Create full CRUD for daily_report_snapshots.
No translations. Per-store + currency. End-of-day aggregation: total_orders, total_revenue, total_tax, total_tips, total_discounts, total_refunds, total_expenses, order_count_by_type JSON, payment_breakdown JSON. Unique per (tenant, store, date, currency).
```

### [x] 42. Cash Register Sessions

Tables: `cash_register_sessions`

```
Read .claude/skills/tenant-backend.md and .claude/skills/tenant-frontend.md.
Create full CRUD for cash_register_sessions.
No translations. Per-store. Shift management: opened_by/closed_by (admin_users), opening/closing/expected amounts, difference calculation. Currency-aware.
```

---

## PRIORITY 10: POS (Point of Sale)

Prerequisites (must be [x] before starting any POS sub-task):
- #25–28 Tenant Order Sources / Types / Item Statuses / Payment Statuses
- #29 Orders + Order Items
- #30 Tenant Payment Types
- #31 Transactions + Transaction Payments
- #40 KDS Orders (for real-time kitchen routing)

Shared conventions:
- POS lives inside admin-panel under the route prefix `/pos/*` (separate page shell from the `/tenant/*` management pages, same login session).
- Gated by new permissions under the `pos` module: `pos.access`, `pos.take_order`, `pos.discount`, `pos.ikram`, `pos.split_bill`, `pos.refund`, `pos.void`.
- Reuses `tenant_waiter_sessions` for the per-device PIN login flow.
- The existing admin CRUD pages (Reservations #24, Customers #23, Waiters #22, Tables #21) remain for management and history; POS consumes the same data but with an operations-oriented UI.

### [x] 44.1 POS Shell & Waiter PIN Login

Route group `/pos/*`, PIN-based waiter sign-in, `device_identifier` + `ip_address` capture, session row written to `tenant_waiter_sessions`, global "current waiter" indicator, logout button that closes the session.

### [x] 44.2 POS Floor Plan (Tables View)

Grid/canvas of `tenant_table_structures` for the selected store, filterable by seating area. Status badges: available / occupied / reserved / blocked / merged. Tap-to-open-order. Floating action menu: walk-in, merge tables, check-in reservation. Today's reservations appear as chips on the relevant tables (visual cue only — check-in handled by 44.17).

### [x] 44.3 POS Cart / Active Order Panel

Left panel matching the screenshot: line items with qty, customizations, subtotal/total. Action buttons: new order, ikram (comp), iade (refund), böl (split), iskonto (discount), yazdır (print), iptal (cancel), taşı (move item to another order).

### [x] 44.4 POS Menu Browser

Category sidebar filtered to `show_on_pos = 1`, items grid with image + price + availability, search bar, quick-add. Tapping an item opens 44.5 when the item has portions/addons/weight, otherwise it's added directly to the cart.

### [x] 44.5 Item Options Modal

Portions, addons, extras, ingredients, main-dish options, per-item note, weighted-item kg input. Recomputes the final line price as modifiers are toggled. Confirm adds the line to the active order.

### [x] 44.6 Table Merging & Move Items

Merge/unmerge tables using `parent_table_id` + `is_temporary_merge`. Move a single item or a group of items between active orders on different tables (updates `order_items.order_id`).

### [x] 44.7 Payment Flow

Full / partial / per-item / mixed payment modes. Supports multiple `tenant_payment_types` in one transaction. Tip. Discount (percent + flat). Ikram (comp a specific item without voiding). Writes to `transactions` and `transaction_payments`.

### [x] 44.8 Customer Receipt Printing

Per-order customer receipt with store header, line items, modifiers, subtotal, discounts/ikram, tip, per-rate VAT breakdown, total, payment split, and QR payment link. Supports re-print (pre-payment or post-payment) and the order's language/currency. Routes to `stores.receipt_printer_ip` via ESC/POS (browser print as fallback for non-thermal).

### [x] 44.9 Kitchen / Bar Ticket Printing

One ticket per `tenant_order_destination` in the order — no prices, shows qty, modifiers, per-item note, seat number, and course. Routes each ticket to the destination's printer (`stores.kitchen_printer_ip` / `bar_printer_ip`, or a per-destination override if present). Supports re-fire (reprints only the un-served items) and void ticket (strikethrough + notice to the cook).

### [x] 44.10 Order Destination Routing & Fire Flow

When the waiter taps "Fire" on the cart, split the new/un-fired items by `menu_items.tenant_order_destination_id`, transition each item `pending → preparing`, then dispatch two parallel outputs per destination: (1) print the kitchen/bar ticket via 44.9, (2) broadcast to the KDS display (Priority 11) via 44.16. Handles partial fire (send appetizers now, hold mains), re-fire (resend the same slice), and void-after-fire (notify KDS + print a void ticket).

### [x] 44.11 Item Status Lifecycle

Status machine `pending → preparing → ready → served → cancelled` enforced at the service layer (no skipping except `cancelled`). POS cart shows a colored status badge per line; a toast fires when any item transitions to `ready` (coming from the KDS via 44.16). Tap the ready badge to mark the item `served`. Cancel while `preparing` triggers the void-after-fire branch in 44.10.

### [x] 44.12 Order Mode (Dine-in / Takeaway / Delivery / Kiosk)

Select the `tenant_order_type` at order creation. Dine-in requires a table (uses 44.2). Takeaway / delivery capture customer + address instead of a table, skip the floor plan, and print a customer-copy receipt at order-fire time (not just at payment). Kiosk is a customer-self-service variant of 44.4. Controls which fields are required, which printers fire, and which POS screens are shown.

### [x] 44.13 Cash Register Session Integration

Require an open `cash_register_session` (#42) at the POS device before accepting any payment. Cash payments trigger an ESC/POS drawer-open pulse on the receipt printer. "Close shift" reconciles expected vs counted cash and closes the session. POS blocks new payments (not new orders) if no session is open.

### [x] 44.14 Void / Re-print / Audit Trail

Re-print any receipt or kitchen ticket for an order (within the shift). Void a whole order or a single item with a mandatory reason code. Every privileged action (void, ikram, discount, refund, reprint, drawer-open) writes a row to an `audit_log` table with `waiter_id`, `admin_user_id`, action, target_type/id, before/after JSON, and timestamp — queryable from the admin panel.

### [x] 44.15 QR Invoice Generation

Depends on #32. Generate a signed, short-lived token for the table, render a QR the guest can scan to view and pay the bill from their phone.

### [x] 44.16 Real-time Order Sync (WebSocket)

Item-status broadcast so KDS (Priority 11) and other POS devices mirror changes live. Order-level broadcast so a manager's view updates when a waiter adds or removes an item. Also carries the "ready" signal that 44.11 surfaces as a toast in the POS cart.

### [x] 44.17 POS Reservations Quick View

Today's reservations drawer on the tables page (reuses #24). "Check in" button flips reservation status `confirmed` → `checked_in` AND opens a new order on the primary table with the reservation's customer pre-filled.

---

## PRIORITY 11: KDS (Kitchen Display Application)

Prerequisites (must be [x] before starting any KDS sub-task):
- #40 KDS Orders
- 44.10 Order Destination Routing & Fire Flow (produces the events KDS consumes)
- 44.11 Item Status Lifecycle
- 44.16 Real-time Order Sync

Shared conventions:
- KDS is a separate app from POS, intended to run on a wall-mounted tablet or monitor in the kitchen / bar (route prefix `/kds/*`).
- Each KDS device is paired to a specific `store` + `tenant_order_destination` at first boot via a one-time code; a device only shows tickets routed to its destination.
- Cook-facing UI — large tap targets, high-contrast badges, no waiter / payment concepts.
- Gated by a new `kds` permission module: `kds.access`, `kds.bump`, `kds.recall`, `kds.manage_device`.

### [x] 45.1 KDS Shell & Device Pairing

Route group `/kds/*`, first-run pairing flow (enter a one-time code generated from the tenant admin; binds the device to a `store_id` + `tenant_order_destination_id`). Persistent session; auto-reconnect on network drop. Status bar with destination name, network indicator, and "un-pair device" action.

### [x] 45.2 KDS Display View

Card grid of active tickets for the paired destination. Each ticket shows table (or takeaway label), order time, seat number per item, item name, qty, modifiers, and per-item note. Layout: up to 4 columns, oldest first, overflow paginates. Pulls from `kds_orders` (#40) filtered by the device's destination.

### [x] 45.3 Bump / Recall / Timers

"Bump" per item marks it `ready` (writes the transition defined in 44.11; POS hears it via 44.16). "Bump all" per ticket. "Recall" reverses a just-bumped item back to `preparing` within a short window. Per-ticket elapsed-time badge with color thresholds — green under target, yellow approaching, red over target — thresholds configurable per destination.

### [x] 45.4 Course & Seat Management

Group items on a ticket by seat number (so the cook sees "Seat 1: burger, Seat 2: steak"). Support courses (appetizer / main / dessert) with a "hold" flag that keeps the main course hidden until the appetizer is bumped. Course separator between groups on the card.

### [x] 45.5 Audio Alerts & Overdue Escalation

Chime on each new ticket; a different chime on overdue (past the red threshold). Volume + mute. Flashing border on the single most-overdue ticket. Optional notification-webhook hook on tickets overdue more than X minutes (config stub for now — wire later).

---

## PRIORITY 12: Storefront (Future)

### [x] 43. Storefront Foundation

```
Set up public-facing storefront app (React + TailwindCSS) for online menu browsing, QR ordering, and online reservations. Follow supermarket-saas storefront pattern.
```

### [~] 43.1 Banner System (Backend — before storefront)

Backend done; admin-panel UI still pending.

When building the storefront, include the full banner system from supermarket-saas. This requires:

**Migration — `tenant_banners` + `tenant_banner_translations` tables:**
```sql
CREATE TABLE tenant_banners (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT UNSIGNED NOT NULL,
  banner_type ENUM('hero','top','middle','bottom','alert','promotional','sidebar') DEFAULT 'hero',
  image_url VARCHAR(500),
  mobile_image_url VARCHAR(500),
  background_color VARCHAR(7),
  text_color VARCHAR(7) DEFAULT '#FFFFFF',
  text_position ENUM('top-left','top-center','top-right','center-left','center','center-right','bottom-left','bottom-center','bottom-right') DEFAULT 'center',
  text_alignment ENUM('left','center','right') DEFAULT 'center',
  text_position_mobile ENUM('top-left','top-center','top-right','center-left','center','center-right','bottom-left','bottom-center','bottom-right') DEFAULT NULL,
  text_alignment_mobile ENUM('left','center','right') DEFAULT NULL,
  text_style JSON DEFAULT NULL,
  link_type ENUM('menu_item','menu_category','page','url','none') DEFAULT 'none',
  link_menu_item_id BIGINT UNSIGNED NULL,
  link_menu_category_id BIGINT UNSIGNED NULL,
  link_page_code VARCHAR(50),
  link_url VARCHAR(500),
  link_target ENUM('_self','_blank') DEFAULT '_self',
  show_cta TINYINT(1) DEFAULT 0,
  cta_style ENUM('primary','secondary','outline','ghost') DEFAULT 'primary',
  valid_from DATETIME NULL,
  valid_to DATETIME NULL,
  show_on_mobile TINYINT(1) DEFAULT 1,
  show_on_desktop TINYINT(1) DEFAULT 1,
  is_dismissible TINYINT(1) DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1,
  sort_order INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE TABLE tenant_banner_translations (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  banner_id BIGINT UNSIGNED NOT NULL,
  language_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(255),
  subtitle VARCHAR(255),
  description TEXT,
  cta_text VARCHAR(100),
  alt_text VARCHAR(255),
  FOREIGN KEY (banner_id) REFERENCES tenant_banners(id) ON DELETE CASCADE,
  FOREIGN KEY (language_id) REFERENCES languages(id) ON DELETE CASCADE,
  UNIQUE KEY (banner_id, language_id)
);
```

**Backend — ✅ done:**
- ✅ `backend/src/migrations/015_create_banners.ts` — tables + `banners.view` / `banners.manage` permissions
- ✅ `backend/src/services/tenantBannerService.ts` — CRUD + translations, stats, sort-order, duplicate, `getPublicBannersByType`
- ✅ `backend/src/controllers/tenantBannerController.ts` — REST + upload/delete/stats/sort/duplicate handlers + public storefront handler
- ✅ `backend/src/routes/tenantBanner.routes.ts` — mounted at `/api/tenant` in `server.ts`
- ✅ `backend/src/middleware/upload.ts` — multer storage for `{tenantId}_banners/`; `uploadBannerImage` (`image` field, 10MB) + `uploadBannerMobileImage` (`mobile_image` field)
- ✅ Public route `GET /api/public/:tenantSlug/banners/type/:type` in `public.routes.ts` (no auth, active-only, date-gated)

**Admin panel files to create:**
- `admin-panel/src/services/bannerService.ts` — API wrapper + types
- `admin-panel/src/pages/TenantBanners/BannerFormPage.tsx` — full form with:
  - Image upload (desktop + mobile)
  - Multi-language translations (title, subtitle, description, CTA)
  - Text position (9-position grid picker) + alignment
  - Mobile override position/alignment
  - Font size controls (title, subtitle, description — desktop + mobile)
  - Color pickers with hex input (background, text)
  - Link type (menu_item, menu_category, page, url, none)
  - CTA button toggle + style
  - Scheduling (valid_from, valid_to)
  - Device visibility + dismissible
  - Live preview with dynamic positioning
  - Mobile preview

**Note:** `link_type` for restaurant uses `menu_item` and `menu_category` instead of `campaign` and `product` (adapted to restaurant domain).

### [x] 43.2 Storefront App Setup

Scaffold in place: `storefront/src/api/{storefrontApi.ts,types.ts}`, `components/{home,layout,common,pages}/`, `hooks/{useBanners,useTenantStore}.ts`, `store/{cartStore,tenantStore}.ts`, `locales/{en,tr,el,ru}.json` + `i18n.ts`, pages (`HomePage`, `MenuPage`, `MenuItemPage`, `ReservationsPage`, `ContactPage`, `CustomPage`, `CartPage`, `NotFoundPage`), routes wired in `App.tsx`. HeroBanner consumes `GET /api/public/:slug/banners/type/hero` via the public endpoint from 43.1. Tenant slug resolved from `?tenant=`, `VITE_TENANT_SLUG`, or subdomain.

```
storefront/
├── src/
│   ├── api/          — Axios instance, types
│   ├── components/
│   │   ├── home/     — HeroBanner, MenuHighlights, FeaturedItems
│   │   ├── layout/   — Header, Footer, Layout
│   │   ├── common/   — Loading, SEOHead
│   │   └── pages/    — DynamicPage, block components
│   ├── hooks/        — useBanners, useTenantStore
│   ├── locales/      — en.json, tr.json, el.json, ru.json
│   ├── pages/        — HomePage, MenuPage, ReservationPage, ContactPage
│   ├── store/        — Zustand tenant store
│   └── App.tsx
```

Key pages:
- **HomePage** — HeroBanner carousel + featured menu items + specials
- **MenuPage** (`/menu`) — full menu with category sidebar
- **MenuItemPage** (`/menu/:slug`) — item detail with images, description, addons
- **ReservationPage** (`/reserve`) — online table reservation form
- **ContactPage** (`/contact`) — store info, hours, map
- **CustomPage** (`/page/:slug`) — block-builder CMS pages

### [ ] 43.3 Storefront Banner Component (HeroBanner)

Port the HeroBanner from supermarket-saas with:
- Dynamic text positioning (9 positions + mobile override)
- Responsive font sizes from `text_style` JSON
- Desktop/mobile separate images (`object-contain`)
- Auto-advance carousel with arrows + dots
- Banner impression/click analytics tracking
- Boolean conversion for MySQL tinyint fields (prevent "0" rendering)

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


### [ ] 46. look at C:\laragon\www\supermarket-saas an dthere for products we use enchance image here where ever there is a image I want to use the same system in this project lets do that ofcourse for drinks and food