import { useCallback, useMemo, useState } from 'react';
import { View, Text, SectionList, Pressable, StyleSheet } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { listTasks, toggleDone, clearAll } from '../src/db/local';
import { dayKey, type Task } from '../src/lib/types';
import { syncNow } from '../src/sync/sync';
import { scheduleForTask, cancelAllReminders } from '../src/notifications/reminders';
import { supabase } from '../src/lib/supabase';
import Bow from '../src/components/Bow';
import { colors, radius, shadow } from '../src/theme';

export default function Home() {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selected, setSelected] = useState(dayKey(new Date()));
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => setTasks(await listTasks()), []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function refresh() {
    setRefreshing(true);
    await syncNow();
    await load();
    setRefreshing(false);
  }

  async function onToggle(t: Task) {
    const updated = await toggleDone(t);
    await scheduleForTask(updated);
    await load();
    syncNow().then(load);
  }

  async function signOut() {
    await cancelAllReminders();
    await clearAll();
    await supabase.auth.signOut();
  }

  // dots on the calendar for days with unfinished tasks
  const marked = useMemo(() => {
    const m: Record<string, any> = {};
    for (const t of tasks) {
      if (!t.due_at || t.is_done) continue;
      const k = dayKey(new Date(t.due_at));
      m[k] = { ...(m[k] ?? {}), marked: true, dotColor: colors.pinkDeep };
    }
    m[selected] = { ...(m[selected] ?? {}), selected: true, selectedColor: colors.pinkDeep };
    return m;
  }, [tasks, selected]);

  const dayTasks = tasks.filter((t) => t.due_at && dayKey(new Date(t.due_at)) === selected);
  const noDue = tasks.filter((t) => !t.due_at);
  const pending = tasks.filter((t) => !t.is_done).length;
  const dayLabel = new Date(`${selected}T00:00:00`).toLocaleDateString(undefined, {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  const sections = [
    { title: `🎀 ${dayLabel}`, data: dayTasks },
    { title: '🌸 No due date', data: noDue },
  ];

  return (
    <View style={s.container}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable onPress={signOut}>
              <Text style={{ color: colors.pinkDeep, fontWeight: '700' }}>Sign out</Text>
            </Pressable>
          ),
        }}
      />
      <SectionList
        style={s.list}
        sections={sections}
        keyExtractor={(t) => t.id}
        refreshing={refreshing}
        onRefresh={refresh}
        ListHeaderComponent={
          <View>
            <View style={s.banner}>
              <Bow size={64} />
              <View style={{ flex: 1 }}>
                <Text style={s.bannerTitle}>Hello, cutie! ✨</Text>
                <Text style={s.bannerSub}>
                  {pending === 0 ? 'All done, great job!' : `${pending} task${pending === 1 ? '' : 's'} to do`}
                </Text>
              </View>
            </View>
            <View style={[s.calendarCard, shadow]}>
              <Calendar
                markedDates={marked}
                onDayPress={(d) => setSelected(d.dateString)}
                theme={{
                  calendarBackground: colors.card,
                  textSectionTitleColor: colors.muted,
                  selectedDayBackgroundColor: colors.pinkDeep,
                  selectedDayTextColor: '#ffffff',
                  todayTextColor: colors.pinkDeep,
                  dayTextColor: colors.text,
                  textDisabledColor: '#E8CBD6',
                  arrowColor: colors.pinkDeep,
                  monthTextColor: colors.text,
                  dotColor: colors.pinkDeep,
                  selectedDotColor: '#ffffff',
                  textMonthFontWeight: '800',
                }}
              />
            </View>
          </View>
        }
        renderSectionHeader={({ section }) => <Text style={s.header}>{section.title}</Text>}
        renderSectionFooter={({ section }) =>
          section.data.length === 0 ? <Text style={s.empty}>Nothing here yet 🌷</Text> : null
        }
        renderItem={({ item }) => (
          <View style={s.row}>
            <Pressable onPress={() => onToggle(item)} style={[s.check, item.is_done && s.checkDone]}>
              {item.is_done && <Text style={s.checkMark}>✓</Text>}
            </Pressable>
            <Pressable style={{ flex: 1 }} onPress={() => router.push(`/task/${item.id}`)}>
              <Text style={[s.taskTitle, item.is_done && s.done]}>{item.title}</Text>
              {item.due_at && (
                <Text style={s.time}>
                  ⏰ {new Date(item.due_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              )}
            </Pressable>
          </View>
        )}
        contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: 16 }}
      />
      <Pressable style={[s.fab, shadow]} onPress={() => router.push('/task/new')}>
        <Text style={s.fabText}>+</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  list: { width: '100%', maxWidth: 640, alignSelf: 'center' },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  bannerTitle: { fontSize: 22, fontWeight: '800', color: colors.text },
  bannerSub: { color: colors.muted, marginTop: 2 },
  calendarCard: {
    backgroundColor: colors.card, borderRadius: radius.lg, overflow: 'hidden',
    borderWidth: 1, borderColor: colors.border,
  },
  header: {
    fontWeight: '800', fontSize: 16, color: colors.text, paddingTop: 20, paddingBottom: 8,
    backgroundColor: colors.bg,
  },
  empty: { color: colors.muted, paddingBottom: 4 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card,
    borderRadius: radius.md, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: colors.border,
  },
  check: {
    width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: colors.pinkDeep,
    alignItems: 'center', justifyContent: 'center',
  },
  checkDone: { backgroundColor: colors.pinkDeep },
  checkMark: { color: 'white', fontWeight: '800', fontSize: 14 },
  taskTitle: { fontSize: 16, color: colors.text, fontWeight: '600' },
  done: { textDecorationLine: 'line-through', color: colors.muted },
  time: { color: colors.muted, fontSize: 12, marginTop: 2 },
  fab: {
    position: 'absolute', right: 20, bottom: 30, width: 60, height: 60, borderRadius: 30,
    backgroundColor: colors.pinkDeep, alignItems: 'center', justifyContent: 'center',
  },
  fabText: { color: 'white', fontSize: 34, marginTop: -2 },
});
