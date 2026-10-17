import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { offsetLabel, type Task } from '../lib/types';

export async function setupNotifications() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('reminders', {
      name: 'Task reminders',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') await Notifications.requestPermissionsAsync();
}

async function schedule(task: Task) {
  if (task.is_done || task.deleted_at || !task.due_at) return;
  const due = new Date(task.due_at).getTime();
  for (const m of task.reminder_offsets) {
    const when = due - m * 60_000;
    if (when <= Date.now()) continue; // already in the past, skip
    await Notifications.scheduleNotificationAsync({
      identifier: `${task.id}:${m}`,
      content: { title: task.title, body: `Due in ${offsetLabel(m)}` },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(when),
        channelId: 'reminders',
      },
    });
  }
}

export async function cancelForTask(taskId: string) {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    all
      .filter((n) => n.identifier.startsWith(`${taskId}:`))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier))
  );
}

// Call after adding / editing / completing a task
export async function scheduleForTask(task: Task) {
  await cancelForTask(task.id);
  await schedule(task);
}

// Call after sync (tasks may have changed on another device)
export async function rescheduleAll(tasks: Task[]) {
  await Notifications.cancelAllScheduledNotificationsAsync();
  for (const t of tasks) await schedule(t);
}

export async function cancelAllReminders() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
