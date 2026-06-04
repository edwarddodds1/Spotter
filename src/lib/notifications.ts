import type { AppNotification } from "@/types/app";

/** Notifications visible to the signed-in user (recipient rows only). */
export function notificationsForUser(
  notifications: AppNotification[],
  recipientUserId: string | null | undefined,
): AppNotification[] {
  if (!recipientUserId) return notifications;
  return notifications.filter((n) => n.userId === recipientUserId);
}
