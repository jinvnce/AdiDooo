import * as SQLite from 'expo-sqlite';
import type { Task } from '../lib/types';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDb() {
  if (!dbPromise) dbPromise = init();
  return dbPromise;
}

async function init() {
  const db = await SQLite.openDatabaseAsync('todo.db');
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL,
      list_id TEXT,
      title TEXT NOT NULL,
      notes TEXT,
      due_at TEXT,
      priority INTEGER NOT NULL DEFAULT 0,
      is_done INTEGER NOT NULL DEFAULT 0,
      completed_at TEXT,
      reminder_offsets TEXT NOT NULL DEFAULT '[300,180,60,30,5]',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT,
      dirty INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY NOT NULL, value TEXT);
  `);
  return db;
}

type Row = Omit<Task, 'is_done' | 'reminder_offsets'> & {
  is_done: number;
  reminder_offsets: string;
  dirty: number;
};

function toTask(r: Row): Task {
  const { dirty, ...rest } = r;
  return { ...rest, is_done: !!r.is_done, reminder_offsets: JSON.parse(r.reminder_offsets) };
}

const INSERT_SQL = `INSERT OR REPLACE INTO tasks
  (id, user_id, list_id, title, notes, due_at, priority, is_done, completed_at,
   reminder_offsets, created_at, updated_at, deleted_at, dirty)
  VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;

function values(t: Task, updatedAt: string, dirty: number) {
  return [
    t.id, t.user_id, t.list_id, t.title, t.notes, t.due_at, t.priority,
    t.is_done ? 1 : 0, t.completed_at, JSON.stringify(t.reminder_offsets),
    t.created_at, updatedAt, t.deleted_at, dirty,
  ];
}

export async function listTasks(): Promise<Task[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Row>(
    'SELECT * FROM tasks WHERE deleted_at IS NULL ORDER BY due_at IS NULL, due_at'
  );
  return rows.map(toTask);
}

export async function getTask(id: string): Promise<Task | null> {
  const db = await getDb();
  const r = await db.getFirstAsync<Row>('SELECT * FROM tasks WHERE id = ?', [id]);
  return r ? toTask(r) : null;
}

export async function saveTask(t: Task) {
  const db = await getDb();
  await db.runAsync(INSERT_SQL, values(t, new Date().toISOString(), 1));
}

export async function deleteTask(id: string) {
  const db = await getDb();
  const now = new Date().toISOString();
  await db.runAsync('UPDATE tasks SET deleted_at = ?, updated_at = ?, dirty = 1 WHERE id = ?', [now, now, id]);
}

export async function toggleDone(t: Task): Promise<Task> {
  const done = !t.is_done;
  const updated = { ...t, is_done: done, completed_at: done ? new Date().toISOString() : null };
  await saveTask(updated);
  return updated;
}

// ---- used by sync ----
export async function getDirtyTasks(): Promise<Task[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Row>('SELECT * FROM tasks WHERE dirty = 1');
  return rows.map(toTask);
}

export async function markClean(ids: string[]) {
  const db = await getDb();
  for (const id of ids) await db.runAsync('UPDATE tasks SET dirty = 0 WHERE id = ?', [id]);
}

export async function upsertRemote(tasks: Task[]) {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    for (const t of tasks) {
      const local = await db.getFirstAsync<{ dirty: number }>('SELECT dirty FROM tasks WHERE id = ?', [t.id]);
      if (local?.dirty === 1) continue; // local change not pushed yet, keep it
      await db.runAsync(INSERT_SQL, values(t, t.updated_at, 0));
    }
  });
}

export async function getMeta(key: string): Promise<string | null> {
  const db = await getDb();
  const r = await db.getFirstAsync<{ value: string }>('SELECT value FROM meta WHERE key = ?', [key]);
  return r?.value ?? null;
}

export async function setMeta(key: string, value: string) {
  const db = await getDb();
  await db.runAsync('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)', [key, value]);
}

export async function clearAll() {
  const db = await getDb();
  await db.execAsync('DELETE FROM tasks; DELETE FROM meta;');
}
