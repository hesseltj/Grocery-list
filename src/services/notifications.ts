/**
 * Push notification service for FlowLedger.
 * Uses Expo Notifications for cross-platform push support.
 */

import * as Notifications from 'expo-notifications';
import { getTaxQuarters, getDaysUntilDue } from '../utils/dates';

// ─── Configuration ────────────────────────────────────────────────────────────

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

// ─── Permissions ──────────────────────────────────────────────────────────────

export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();

  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

// ─── Notification Scheduling ──────────────────────────────────────────────────

/**
 * Schedules quarterly tax reminder notifications for the current year.
 * Sends 2 weeks before and 3 days before each due date.
 */
export async function scheduleQuarterlyTaxReminders(year: number): Promise<void> {
  const quarters = getTaxQuarters(year);

  for (const quarter of quarters) {
    const daysUntilDue = getDaysUntilDue(quarter.dueDate);
    if (daysUntilDue < 0) continue; // already passed

    // 2-week warning
    if (daysUntilDue > 14) {
      const twoWeeksBefore = new Date(quarter.dueDate);
      twoWeeksBefore.setDate(twoWeeksBefore.getDate() - 14);

      await Notifications.scheduleNotificationAsync({
        content: {
          title: `${quarter.label} Tax Payment Due in 2 Weeks`,
          body: 'Your estimated quarterly tax payment is coming up. Check your FlowLedger estimate.',
          data: { type: 'tax_reminder', quarter: quarter.quarter },
        },
        trigger: {
          date: twoWeeksBefore,
        },
      });
    }

    // 3-day warning
    if (daysUntilDue > 3) {
      const threeDaysBefore = new Date(quarter.dueDate);
      threeDaysBefore.setDate(threeDaysBefore.getDate() - 3);

      await Notifications.scheduleNotificationAsync({
        content: {
          title: `⚠️ ${quarter.label} Tax Payment Due in 3 Days`,
          body: 'Don\'t forget to pay your estimated federal taxes by the deadline.',
          data: { type: 'tax_reminder_urgent', quarter: quarter.quarter },
        },
        trigger: {
          date: threeDaysBefore,
        },
      });
    }
  }
}

/**
 * Sends an immediate local notification for a cash flow alert.
 */
export async function sendCashFlowAlert(title: string, message: string): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body: message,
      data: { type: 'cash_flow_alert' },
    },
    trigger: null, // immediate
  });
}

/**
 * Schedules a weekly cash flow summary notification (Sunday evening).
 */
export async function scheduleWeeklySummary(): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Your Weekly Cash Flow Summary',
      body: 'Tap to review your income, expenses, and upcoming forecast.',
      data: { type: 'weekly_summary' },
    },
    trigger: {
      weekday: 1, // Sunday = 1
      hour: 18,
      minute: 0,
      repeats: true,
    },
  });
}

/**
 * Cancels all scheduled notifications.
 */
export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
