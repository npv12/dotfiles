export interface SqliteConn {
  all<T = unknown>(sql: string, params?: unknown[]): T[];
  get<T = unknown>(sql: string, params?: unknown[]): T | null;
  close(): void;
}

interface SqliteStatement {
  all(...params: unknown[]): unknown[];
  get(...params: unknown[]): unknown;
  run(...params: unknown[]): unknown;
}

interface SqliteDatabase {
  query(sql: string): SqliteStatement;
  close(): void;
}

interface BunSqliteModule {
  Database: new (path: string, options: { readonly: boolean }) => SqliteDatabase;
}

interface NodeSqliteModule {
  DatabaseSync: new (path: string, options: { readOnly?: boolean }) => {
    close(): void;
    prepare(sql: string): {
      all(...params: unknown[]): unknown[];
      get(...params: unknown[]): unknown;
      run(...params: unknown[]): unknown;
    };
  };
}

function toParams(params?: unknown[]): unknown[] {
  return Array.isArray(params) ? params : [];
}

function runPragma(db: SqliteDatabase, sql: string): void {
  try {
    db.query(sql).run();
  } catch {
    // ignore
  }
}

function openWithBun(dbPath: string): Promise<SqliteDatabase> {
  // The opencode2 runtime is Bun; plugins keep using bun:sqlite at runtime.
  return import("bun:sqlite").then((mod) => {
    const bun = mod as unknown as BunSqliteModule;
    if (typeof bun.Database !== "function") throw new Error("bun:sqlite unavailable");
    return new bun.Database(dbPath, { readonly: true });
  });
}

function openWithNode(dbPath: string): Promise<SqliteDatabase> {
  // Node fallback so the engine (and its vitest suite) also runs under plain
  // node without bun:sqlite.
  return import("node:sqlite").then((mod) => {
    const node = mod as unknown as NodeSqliteModule;
    if (typeof node.DatabaseSync !== "function") throw new Error("node:sqlite unavailable");
    const db = new node.DatabaseSync(dbPath, { readOnly: true });
    return {
      query(sql: string): SqliteStatement {
        const stmt = db.prepare(sql);
        return {
          all(...params: unknown[]): unknown[] {
            return stmt.all(...params) as unknown[];
          },
          get(...params: unknown[]): unknown {
            return stmt.get(...params) ?? null;
          },
          run(...params: unknown[]): unknown {
            return stmt.run(...params);
          },
        };
      },
      close(): void {
        db.close();
      },
    };
  });
}

export async function openOpenCodeSqliteReadOnly(dbPath: string): Promise<SqliteConn> {
  let db: SqliteDatabase;
  try {
    db = await openWithBun(dbPath);
  } catch {
    db = await openWithNode(dbPath);
  }

  // Keep reads deterministic and avoid accidental writes.
  runPragma(db, "PRAGMA query_only = ON;");

  // Avoid transient SQLITE_BUSY errors (WAL).
  runPragma(db, "PRAGMA busy_timeout = 5000;");

  return {
    all<T = unknown>(sql: string, params?: unknown[]): T[] {
      const stmt = db.query(sql);
      const p = toParams(params);
      return (p.length ? stmt.all(...p) : stmt.all()) as T[];
    },

    get<T = unknown>(sql: string, params?: unknown[]): T | null {
      const stmt = db.query(sql);
      const p = toParams(params);
      const row = (p.length ? stmt.get(...p) : stmt.get()) as T | undefined;
      return row ?? null;
    },

    close(): void {
      try {
        db.close();
      } catch {
        // ignore
      }
    },
  };
}
