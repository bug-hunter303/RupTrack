
import type { SQLiteDatabase } from 'expo-sqlite';

async function addColumnIfMissing(
  db: SQLiteDatabase,
  table: string,
  column: string,
  definition: string
) {
  const columns = await db.getAllAsync<{ name: string }>(
    `PRAGMA table_info(${table})`
  );

  if (!columns.some((item) => item.name === column)) {
    await db.execAsync(
      `ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`
    );
  }
}

export async function initializeDatabase(
  db: SQLiteDatabase
): Promise<void> {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    -- Bills
    CREATE TABLE IF NOT EXISTS bills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      date TEXT NOT NULL,
      total REAL NOT NULL DEFAULT 0,
      is_locked INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- Individual items inside bills
    CREATE TABLE IF NOT EXISTS bill_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bill_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      amount REAL NOT NULL,
      FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE
    );

    -- Income records
    CREATE TABLE IF NOT EXISTS income (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('salary', 'additional')),
      date TEXT NOT NULL,
      period_key TEXT UNIQUE,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- Monthly salary settings
    CREATE TABLE IF NOT EXISTS salary_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      amount REAL NOT NULL,
      credit_day INTEGER NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1
    );

    -- Monthly budgets
    CREATE TABLE IF NOT EXISTS monthly_budgets (
      month_key TEXT PRIMARY KEY,
      savings_target REAL NOT NULL DEFAULT 0,
      spending_limit REAL NOT NULL DEFAULT 0,
      weekly_allowance REAL NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- Savings goals
    CREATE TABLE IF NOT EXISTS savings_goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      target_amount REAL NOT NULL,
      saved_amount REAL NOT NULL DEFAULT 0,
      target_date TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- Savings goal contributions
    CREATE TABLE IF NOT EXISTS goal_contributions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      goal_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      date TEXT NOT NULL,
      FOREIGN KEY (goal_id) REFERENCES savings_goals(id) ON DELETE CASCADE
    );

    -- App notifications
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL,
      goal_id INTEGER,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      is_read INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (goal_id) REFERENCES savings_goals(id) ON DELETE SET NULL
    );

    -- Appearance and Home screen preferences
    CREATE TABLE IF NOT EXISTS app_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      theme_mode TEXT NOT NULL DEFAULT 'system',
      accent_color TEXT NOT NULL DEFAULT '#6256F5',
      currency_code TEXT NOT NULL DEFAULT 'NPR',
      show_balance INTEGER NOT NULL DEFAULT 1,
      show_savings_goals INTEGER NOT NULL DEFAULT 1,
      show_completed_goals INTEGER NOT NULL DEFAULT 1,
      show_spending_overview INTEGER NOT NULL DEFAULT 1,
      show_recent_transactions INTEGER NOT NULL DEFAULT 1
    );

    -- Database indexes
    CREATE INDEX IF NOT EXISTS idx_bills_date
      ON bills(date);

    CREATE INDEX IF NOT EXISTS idx_income_date
      ON income(date);

    CREATE INDEX IF NOT EXISTS idx_bill_items_bill_id
      ON bill_items(bill_id);

    CREATE INDEX IF NOT EXISTS idx_goal_contributions_goal_id
      ON goal_contributions(goal_id);

    CREATE INDEX IF NOT EXISTS idx_notifications_created_at
      ON notifications(created_at);
  `);

  // Create default appearance settings without overwriting saved preferences.
  await db.runAsync(`
    INSERT OR IGNORE INTO app_settings (id)
    VALUES (1)
  `);

  // Safe migrations for databases created by earlier RupeeTrack versions.
  await addColumnIfMissing(
    db,
    'savings_goals',
    'is_completed',
    'INTEGER NOT NULL DEFAULT 0'
  );

  await addColumnIfMissing(
    db,
    'savings_goals',
    'completed_at',
    'TEXT'
  );

  // Announce automatic removal of completed goals after seven days.
  await db.runAsync(`
    INSERT INTO notifications (title, message, type, goal_id)
    SELECT
      'Goal removed',
      'Your completed goal "' || name ||
      '" was automatically removed after 7 days.',
      'goal_deleted',
      NULL
    FROM savings_goals
    WHERE is_completed = 1
      AND completed_at IS NOT NULL
      AND datetime(completed_at, '+7 days') <= datetime('now')
  `);

  // Remove expired completed goals.
  await db.runAsync(`
    DELETE FROM savings_goals
    WHERE is_completed = 1
      AND completed_at IS NOT NULL
      AND datetime(completed_at, '+7 days') <= datetime('now')
  `);
}
