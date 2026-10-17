import { useEffect, useState } from 'react';
import { Text, TextInput, Pressable, ScrollView, StyleSheet, Alert, View } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Crypto from 'expo-crypto';
import { getTask, saveTask, deleteTask } from '../../src/db/local';
import { DEFAULT_OFFSETS, OFFSET_CHOICES, offsetLabel, type Task } from '../../src/lib/types';
import { scheduleForTask, cancelForTask } from '../../src/notifications/reminders';
import { syncNow } from '../../src/sync/sync';
import { supabase } from '../../src/lib/supabase';
import Bow from '../../src/components/Bow';
import { colors, radius } from '../../src/theme';

export default function TaskScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const isNew = id === 'new';

  const [existing, setExisting] = useState<Task | null>(null);
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [due, setDue] = useState<Date | null>(null);
  const [offsets, setOffsets] = useState<number[]>(DEFAULT_OFFSETS);
  const [picker, setPicker] = useState<null | 'date' | 'time'>(null);

  useEffect(() => {
    if (isNew) return;
    getTask(id).then((t) => {
      if (!t) return;
      setExisting(t);
      setTitle(t.title);
      setNotes(t.notes ?? '');
      setDue(t.due_at ? new Date(t.due_at) : null);
      setOffsets(t.reminder_offsets);
    });
  }, [id]);

  // pick the date first, then the time
  function onPick(e: DateTimePickerEvent, d?: Date) {
    if (e.type === 'dismissed' || !d) {
      setPicker(null);
      return;
    }
    const base = new Date(due ?? Date.now());
    if (picker === 'date') {
      base.setFullYear(d.getFullYear(), d.getMonth(), d.getDate());
      setDue(base);
      setPicker('time');
    } else {
      base.setHours(d.getHours(), d.getMinutes(), 0, 0);
      setDue(base);
      setPicker(null);
    }
  }

  function toggleOffset(m: number) {
    setOffsets((o) => (o.includes(m) ? o.filter((x) => x !== m) : [...o, m]));
  }

  async function save() {
    if (!title.trim()) return Alert.alert('Please add a title');
    const { data } = await supabase.auth.getSession();
    const uid = data.session?.user.id;
    if (!uid) return;

    const now = new Date().toISOString();
    const t: Task = {
      id: existing?.id ?? Crypto.randomUUID(),
      user_id: uid,
      list_id: existing?.list_id ?? null,
      title: title.trim(),
      notes: notes.trim() || null,
      due_at: due ? due.toISOString() : null,
      priority: existing?.priority ?? 0,
      is_done: existing?.is_done ?? false,
      completed_at: existing?.completed_at ?? null,
      reminder_offsets: [...offsets].sort((a, b) => b - a),
      created_at: existing?.created_at ?? now,
      updated_at: now,
      deleted_at: null,
    };
    await saveTask(t);
    await scheduleForTask(t);
    router.back();
    syncNow();
  }

  async function remove() {
    if (!existing) return;
    await deleteTask(existing.id);
    await cancelForTask(existing.id);
    router.back();
    syncNow();
  }

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={s.scroll}>
      <View style={s.container}>
        <View style={s.top}>
          <Bow size={56} />
          <Text style={s.heading}>{existing ? 'Edit task' : 'New task'} ✨</Text>
        </View>

        <Text style={s.label}>Title</Text>
        <TextInput
          style={s.input}
          value={title}
          onChangeText={setTitle}
          placeholder="What do you want to do?"
          placeholderTextColor={colors.muted}
        />

        <Text style={s.label}>Notes</Text>
        <TextInput
          style={[s.input, { height: 100, textAlignVertical: 'top' }]}
          value={notes}
          onChangeText={setNotes}
          multiline
          placeholder="Anything to remember?"
          placeholderTextColor={colors.muted}
        />

        <Text style={s.label}>Due</Text>
        <View style={s.rowWrap}>
          <Pressable style={s.chip} onPress={() => setPicker('date')}>
            <Text style={s.chipText}>📅 {due ? due.toLocaleString() : 'Set due date & time'}</Text>
          </Pressable>
          {due && (
            <Pressable style={s.chip} onPress={() => setDue(null)}>
              <Text style={s.chipText}>Clear</Text>
            </Pressable>
          )}
        </View>
        {picker && <DateTimePicker value={due ?? new Date()} mode={picker} onChange={onPick} />}

        <Text style={s.label}>Remind me before it's due 🔔</Text>
        <View style={s.rowWrap}>
          {OFFSET_CHOICES.map((m) => (
            <Pressable key={m} style={[s.chip, offsets.includes(m) && s.chipOn]} onPress={() => toggleOffset(m)}>
              <Text style={[s.chipText, offsets.includes(m) && { color: 'white' }]}>{offsetLabel(m)}</Text>
            </Pressable>
          ))}
        </View>

        <Pressable style={s.save} onPress={save}>
          <Text style={s.saveText}>Save</Text>
        </Pressable>
        {existing && (
          <Pressable onPress={remove}>
            <Text style={s.delete}>Delete task</Text>
          </Pressable>
        )}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll: { flexGrow: 1, alignItems: 'center' },
  container: { width: '100%', maxWidth: 520, padding: 20, gap: 8 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  heading: { fontSize: 24, fontWeight: '800', color: colors.text },
  label: { fontWeight: '700', color: colors.text, marginTop: 14 },
  input: {
    backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md,
    padding: 12, fontSize: 16, color: colors.text,
  },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1.5, borderColor: colors.pinkDeep, backgroundColor: colors.card,
    borderRadius: 20, paddingVertical: 7, paddingHorizontal: 14,
  },
  chipOn: { backgroundColor: colors.pinkDeep },
  chipText: { color: colors.pinkDeep, fontWeight: '600' },
  save: { backgroundColor: colors.pinkDeep, padding: 15, borderRadius: radius.md, alignItems: 'center', marginTop: 28 },
  saveText: { color: 'white', fontWeight: '800', fontSize: 16 },
  delete: { color: colors.error, textAlign: 'center', marginTop: 18, fontWeight: '600' },
});
