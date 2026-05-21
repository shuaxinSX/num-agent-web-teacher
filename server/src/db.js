import sqlite3 from "sqlite3";
import pg from "pg";
import path from "path";
import fs from "fs";

const databaseUrl = process.env.DATABASE_URL || "";
const isPostgres = databaseUrl.startsWith("postgres://") || databaseUrl.startsWith("postgresql://");

let dbInstance;

async function initDatabase() {
  if (isPostgres) {
    console.log("Database: Connecting to PostgreSQL...");
    const pool = new pg.Pool({
      connectionString: databaseUrl,
    });
    dbInstance = {
      isPostgres: true,
      async query(sql, params = []) {
        const pgSql = translateSql(sql, true);
        const res = await pool.query(pgSql, params);
        return res;
      },
      async get(sql, params = []) {
        const res = await this.query(sql, params);
        return res.rows[0] || null;
      },
      async run(sql, params = []) {
        await this.query(sql, params);
        return { lastID: null, changes: null };
      },
      async all(sql, params = []) {
        const res = await this.query(sql, params);
        return res.rows;
      },
      async close() {
        await pool.end();
      }
    };

    // Run migration
    await dbInstance.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
  } else {
    console.log("Database: Connecting to SQLite...");
    // Ensure data directory exists
    const dbPath = process.env.SQLITE_DB_PATH || path.resolve(process.cwd(), "database.sqlite");
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    const sqliteDb = new sqlite3.Database(dbPath);

    dbInstance = {
      isPostgres: false,
      query(sql, params = []) {
        return new Promise((resolve, reject) => {
          sqliteDb.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve({ rows });
          });
        });
      },
      get(sql, params = []) {
        return new Promise((resolve, reject) => {
          sqliteDb.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row || null);
          });
        });
      },
      run(sql, params = []) {
        return new Promise((resolve, reject) => {
          sqliteDb.run(sql, params, function (err) {
            if (err) reject(err);
            else resolve({ lastID: this.lastID, changes: this.changes });
          });
        });
      },
      all(sql, params = []) {
        return new Promise((resolve, reject) => {
          sqliteDb.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          });
        });
      },
      close() {
        return new Promise((resolve, reject) => {
          sqliteDb.close((err) => {
            if (err) reject(err);
            else resolve();
          });
        });
      }
    };

    // Run migration
    await dbInstance.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
  }
  console.log("Database: Initialization complete.");
}

function translateSql(sql, toPostgres) {
  if (!toPostgres) return sql;
  let index = 1;
  return sql.replace(/\?/g, () => `$${index++}`);
}

// Lazy initialization export wrapper
const db = {
  async get(sql, params = []) {
    if (!dbInstance) await initDatabase();
    return dbInstance.get(sql, params);
  },
  async run(sql, params = []) {
    if (!dbInstance) await initDatabase();
    return dbInstance.run(sql, params);
  },
  async all(sql, params = []) {
    if (!dbInstance) await initDatabase();
    return dbInstance.all(sql, params);
  },
  async close() {
    if (dbInstance) {
      await dbInstance.close();
      dbInstance = null;
    }
  }
};

export default db;
