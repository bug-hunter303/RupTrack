import type { SQLiteDatabase } from 'expo-sqlite';

export async function initializeDatabase(
  db: SQLiteDatabase
): Promise<void> {
  // Enable safer database settings.
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
  `);

  // Bills created by the user.
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS bills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      date TEXT NOT NULL,
      total REAL NOT NULL DEFAULT 0,
      is_locked INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Custom items inside each bill.
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS bill_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bill_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      amount REAL NOT NULL,
      FOREIGN KEY (bill_id)
        REFERENCES bills(id)
        ON DELETE CASCADE
    );
  `);

  // Salary and additional income entries.
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS income (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      type TEXT NOT NULL CHECK (
        type IN ('salary', 'additional')
      ),
      date TEXT NOT NULL,
      period_key TEXT UNIQUE,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // User's monthly salary configuration.
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS salary_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      amount REAL NOT NULL,
      credit_day INTEGER NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1
    );
  `);


  // Monthly budget settings.
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS monthly_budgets (
      month_key TEXT PRIMARY KEY,
      savings_target REAL NOT NULL DEFAULT 0,
      spending_limit REAL NOT NULL DEFAULT 0,
      weekly_allowance REAL NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // User-created savings goals.
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS savings_goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      target_amount REAL NOT NULL,
      saved_amount REAL NOT NULL DEFAULT 0,
      target_date TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Records contributions made toward savings goals.
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS goal_contributions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      goal_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      date TEXT NOT NULL,
      FOREIGN KEY (goal_id)
        REFERENCES savings_goals(id)
        ON DELETE CASCADE
    );
  `);


  // Speed up date-based queries.
  await db.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_bills_date
    ON bills(date);

    CREATE INDEX IF NOT EXISTS idx_income_date
    ON income(date);

    CREATE INDEX IF NOT EXISTS idx_bill_items_bill_id
    ON bill_items(bill_id);
  `);
}
