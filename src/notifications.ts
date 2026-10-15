export function notificationsSupported() {
  return typeof window !== "undefined" && "Notification" in window;
}

export function notificationPermission(): NotificationPermission | "unsupported" {
  if (!notificationsSupported()) return "unsupported";
  return Notification.permission;
}

export async function requestNotificationPermission() {
  if (!notificationsSupported()) return "unsupported" as const;
  const permission = await Notification.requestPermission();
  if (permission === "granted") void navigator.serviceWorker?.register("/sw.js").catch(() => undefined);
  return permission;
}

export async function showNotification(title: string, body: string) {
  if (!notificationsSupported() || Notification.permission !== "granted") return;
  const options: NotificationOptions = { body, icon: "/icon.svg", lang: "ru", data: { url: "/" } };
  const registration = await Promise.race([
    navigator.serviceWorker?.getRegistration().catch(() => undefined),
    new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), 400)),
  ]);
  if (registration) {
    await registration.showNotification(title, options);
    return;
  }
  new Notification(title, options);
}
