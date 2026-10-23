import * as SQLite from 'expo-sqlite';

const DATABASE_NAME = 'bp-journey.db';
let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

/**
 * Applies schema migrations. Used by both getDatabase() and the root
 * <SQLiteProvider onInit>, so there is a single source of truth for the schema.
 */
export async function migrateDatabase(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync('PRAGMA foreign_keys = ON;');
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY NOT NULL,
      applied_at_utc TEXT NOT NULL
    );
  `);

  const row = await db.getFirstAsync<{ version: number | null }>(
    'SELECT MAX(version) AS version FROM schema_migrations'
  );
  const version = row?.version ?? 0;

  if (version < 1) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS profiles (
          id TEXT PRIMARY KEY NOT NULL,
          display_name TEXT,
          created_at_utc TEXT NOT NULL
        );

        INSERT OR IGNORE INTO profiles (id, display_name, created_at_utc)
        VALUES ('local-profile', NULL, datetime('now'));

        CREATE TABLE IF NOT EXISTS readings (
          id TEXT PRIMARY KEY NOT NULL,
          profile_id TEXT NOT NULL,
          systolic INTEGER NOT NULL CHECK (systolic > 0),
          diastolic INTEGER NOT NULL CHECK (diastolic > 0),
          pulse_bpm INTEGER,
          measured_at_utc TEXT NOT NULL,
          timezone_offset_minutes INTEGER NOT NULL,
          arm TEXT NOT NULL CHECK (arm IN ('left','right','unknown')),
          position TEXT NOT NULL CHECK (position IN ('sitting','lying','standing','unknown')),
          context TEXT NOT NULL CHECK (context IN ('morning','evening','resting','other')),
          notes TEXT,
          source TEXT NOT NULL DEFAULT 'manual',
          created_at_utc TEXT NOT NULL,
          updated_at_utc TEXT NOT NULL,
          deleted_at_utc TEXT,
          FOREIGN KEY (profile_id) REFERENCES profiles(id)
        );

        CREATE INDEX IF NOT EXISTS idx_readings_profile_measured
          ON readings(profile_id, measured_at_utc DESC);
        CREATE INDEX IF NOT EXISTS idx_readings_session
          ON readings(profile_id, context);
      `);
      await db.runAsync(
        'INSERT INTO schema_migrations (version, applied_at_utc) VALUES (?, ?)',
        1,
        new Date().toISOString()
      );
    });
  }
}

export function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync(DATABASE_NAME)
      .then(async (db) => {
        await migrateDatabase(db);
        return db;
      })
      .catch((error) => {
        // Allow a later retry if initialization failed.
        dbPromise = null;
        throw error;
      });
  }
  return dbPromise;
}
