import mysql from 'mysql2/promise';

/**
 * 45.3 — Per-destination prep-time thresholds used to color the KDS timer badge.
 * Defaults: warn at 8 min, late at 15 min.
 */
export async function up(connection: mysql.Connection): Promise<void> {
  console.log('Running migration: 018_kds_destination_timers');

  const [cols] = await connection.query<any[]>(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tenant_order_destinations'`
  );
  const have = new Set(cols.map((c: any) => c.COLUMN_NAME));
  if (!have.has('warn_after_minutes')) {
    await connection.query(
      `ALTER TABLE tenant_order_destinations
       ADD COLUMN warn_after_minutes INT NOT NULL DEFAULT 8 AFTER kds_screen_id`
    );
  }
  if (!have.has('late_after_minutes')) {
    await connection.query(
      `ALTER TABLE tenant_order_destinations
       ADD COLUMN late_after_minutes INT NOT NULL DEFAULT 15 AFTER warn_after_minutes`
    );
  }
  console.log('✅ Migration 018 completed: tenant_order_destinations timer thresholds');
}

export async function down(connection: mysql.Connection): Promise<void> {
  console.log('Rolling back migration: 018_kds_destination_timers');
  await connection.query(`ALTER TABLE tenant_order_destinations DROP COLUMN IF EXISTS late_after_minutes`);
  await connection.query(`ALTER TABLE tenant_order_destinations DROP COLUMN IF EXISTS warn_after_minutes`);
  console.log('✅ Migration 018 rolled back');
}
