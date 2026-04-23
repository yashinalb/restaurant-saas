import mysql from 'mysql2/promise';

/**
 * 45.4 — Seat number + course columns on order_items.
 *
 * - seat_number    INT NULL — which diner ordered this line (nullable for takeaway)
 * - course_code    VARCHAR(32) NULL — free-text course id ("appetizer", "main", "dessert", …)
 * - course_hold    TINYINT(1) DEFAULT 0 — if 1, hide from KDS until earlier courses cleared
 */
export async function up(connection: mysql.Connection): Promise<void> {
  console.log('Running migration: 019_order_item_seat_course');

  const [cols] = await connection.query<any[]>(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'order_items'`
  );
  const have = new Set(cols.map((c: any) => c.COLUMN_NAME));
  if (!have.has('seat_number')) {
    await connection.query(`ALTER TABLE order_items ADD COLUMN seat_number INT NULL AFTER notes`);
  }
  if (!have.has('course_code')) {
    await connection.query(`ALTER TABLE order_items ADD COLUMN course_code VARCHAR(32) NULL AFTER seat_number`);
  }
  if (!have.has('course_hold')) {
    await connection.query(`ALTER TABLE order_items ADD COLUMN course_hold TINYINT(1) NOT NULL DEFAULT 0 AFTER course_code`);
  }
  console.log('✅ Migration 019 completed: seat_number, course_code, course_hold on order_items');
}

export async function down(connection: mysql.Connection): Promise<void> {
  console.log('Rolling back migration: 019_order_item_seat_course');
  await connection.query(`ALTER TABLE order_items DROP COLUMN IF EXISTS course_hold`);
  await connection.query(`ALTER TABLE order_items DROP COLUMN IF EXISTS course_code`);
  await connection.query(`ALTER TABLE order_items DROP COLUMN IF EXISTS seat_number`);
  console.log('✅ Migration 019 rolled back');
}
