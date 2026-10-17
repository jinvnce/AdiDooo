export type Task = {
  id: string;
  user_id: string;
  list_id: string | null;
  title: string;
  notes: string | null;
  due_at: string | null; // ISO date string
  priority: number;
  is_done: boolean;
  completed_at: string | null;
  reminder_offsets: number[]; // minutes before due
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export const DEFAULT_OFFSETS = [300, 180, 60, 30, 5];
export const OFFSET_CHOICES = [1440, 300, 180, 60, 30, 5];

export function offsetLabel(m: number) {
  if (m >= 1440) return `${m / 1440} day`;
  if (m >= 60) return `${m / 60} hr`;
  return `${m} min`;
}

// "2026-10-17" in the phone's local time (used by the calendar)
export function dayKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
