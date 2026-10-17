import { supabase } from '../lib/supabase';
import { getDirtyTasks, markClean, upsertRemote, getMeta, setMeta, listTasks } from '../db/local';
import { rescheduleAll } from '../notifications/reminders';
import type { Task } from '../lib/types';

let running = false;

// Safe to call anytime. If offline it just fails quietly and tries again next time.
export async function syncNow(): Promise<boolean> {
  if (running) return false;
  running = true;
  try {
    const { data } = await supabase.auth.getSession();
    if (!data.session) return false;

    // 1. push local changes
    const dirty = await getDirtyTasks();
    if (dirty.length) {
      const { error } = await supabase.from('tasks').upsert(dirty);
      if (error) throw error;
      await markClean(dirty.map((t) => t.id));
    }

    // 2. pull changes from other devices
    const since = (await getMeta('last_pull')) ?? '1970-01-01T00:00:00Z';
    const res = await supabase.from('tasks').select('*').gt('updated_at', since).order('updated_at');
    if (res.error) throw res.error;
    const rows = (res.data ?? []) as Task[];
    if (rows.length) {
      await upsertRemote(rows);
      await setMeta('last_pull', rows[rows.length - 1].updated_at);
    }

    await rescheduleAll(await listTasks());
    return true;
  } catch (e) {
    console.log('Sync skipped (probably offline):', e);
    return false;
  } finally {
    running = false;
  }
}
