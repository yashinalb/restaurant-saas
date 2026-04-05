import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

dotenv.config();

// ES module dirname fix
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface Migration {
  filename: string;
  up: (connection: mysql.Connection) => Promise<void>;
  down: (connection: mysql.Connection) => Promise<void>;
}

async function createMigrationsTable(connection: mysql.Connection): Promise<void> {
  await connection.query(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      filename VARCHAR(255) NOT NULL UNIQUE,
      executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB
  `);
}

async function getExecutedMigrations(connection: mysql.Connection): Promise<string[]> {
  const [rows] = await connection.query<any[]>('SELECT filename FROM migrations ORDER BY id');
  return rows.map(row => row.filename);
}

async function markMigrationAsExecuted(connection: mysql.Connection, filename: string): Promise<void> {
  await connection.query('INSERT INTO migrations (filename) VALUES (?)', [filename]);
}

async function unmarkMigration(connection: mysql.Connection, filename: string): Promise<void> {
  await connection.query('DELETE FROM migrations WHERE filename = ?', [filename]);
}

async function loadMigration(filename: string): Promise<Migration> {
  // Fix for Windows paths - convert to file:// URL
  const migrationPath = path.join(__dirname, 'migrations', filename);
  const migrationUrl = pathToFileURL(migrationPath).href;
  const migration = await import(migrationUrl);
  return {
    filename,
    up: migration.up,
    down: migration.down
  };
}

async function runMigrations(direction: 'up' | 'down' = 'up'): Promise<void> {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'admin_saas',
    multipleStatements: true
  });

  try {
    console.log('🔄 Starting migration process...\n');

    // Create migrations table if it doesn't exist
    await createMigrationsTable(connection);

    // Get all migration files
    const migrationsDir = path.join(__dirname, 'migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.ts') || file.endsWith('.js'))
      .sort();

    // Get executed migrations
    const executedMigrations = await getExecutedMigrations(connection);

    if (direction === 'up') {
      // Run pending migrations
      const pendingMigrations = migrationFiles.filter(
        file => !executedMigrations.includes(file)
      );

      if (pendingMigrations.length === 0) {
        console.log('✅ No pending migrations to run');
        return;
      }

      console.log(`📋 Found ${pendingMigrations.length} pending migration(s)\n`);

      for (const filename of pendingMigrations) {
        try {
          console.log(`⏳ Running migration: ${filename}`);
          const migration = await loadMigration(filename);
          await migration.up(connection);
          await markMigrationAsExecuted(connection, filename);
          console.log(`✅ Completed: ${filename}\n`);
        } catch (error) {
          console.error(`❌ Failed to run migration ${filename}:`, error);
          throw error;
        }
      }

      console.log('🎉 All migrations completed successfully!');
    } else {
      // Rollback last migration
      if (executedMigrations.length === 0) {
        console.log('✅ No migrations to rollback');
        return;
      }

      const lastMigration = executedMigrations[executedMigrations.length - 1];
      console.log(`⏳ Rolling back migration: ${lastMigration}`);

      try {
        const migration = await loadMigration(lastMigration);
        await migration.down(connection);
        await unmarkMigration(connection, lastMigration);
        console.log(`✅ Rolled back: ${lastMigration}`);
      } catch (error) {
        console.error(`❌ Failed to rollback migration ${lastMigration}:`, error);
        throw error;
      }
    }
  } catch (error) {
    console.error('❌ Migration process failed:', error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

// Command line interface
const command = process.argv[2] || 'up';

if (command === 'up') {
  runMigrations('up');
} else if (command === 'down') {
  runMigrations('down');
} else {
  console.log('Usage:');
  console.log('  npm run migrate        - Run pending migrations');
  console.log('  npm run migrate:down   - Rollback last migration');
  process.exit(1);
}