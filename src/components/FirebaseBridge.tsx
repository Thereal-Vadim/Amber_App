"use client";

import { useEffect, useRef } from "react";
import { getToken } from "firebase/messaging";
import { profileFromUser, listenAuth } from "@/lib/auth";
import { getFirebaseMessaging } from "@/lib/firebase";
import {
  fetchEventRecord,
  saveDeviceToken,
  subscribeActivity,
  subscribeEvent,
  subscribeUserMemberships,
} from "@/lib/eventsApi";
import { showNotification } from "@/notifications";
import { useEmbersStore } from "@/store/useEmbersStore";

export function FirebaseBridge() {
  const eventUnsubs = useRef<Array<() => void>>([]);
  const activitySince = useRef(Date.now());

  useEffect(() => {
    let stopMemberships: (() => void) | undefined;
    const stopAuth = listenAuth(async (user) => {
      eventUnsubs.current.forEach((stop) => stop());
      eventUnsubs.current = [];
      stopMemberships?.();
      stopMemberships = undefined;

      const store = useEmbersStore.getState();
      if (!user) {
        store.setCurrentUser(null);
        store.setAuthReady(true);
        if (store.screen !== "auth") store.clearSession();
        else store.replaceEvents([]);
        return;
      }

      const profile = profileFromUser(user);
      store.setCurrentUser(profile);
      store.setAuthReady(true);
      if (store.screen === "auth") store.setScreen("hub");

      stopMemberships = subscribeUserMemberships(user.uid, (ids) => {
        eventUnsubs.current.forEach((stop) => stop());
        eventUnsubs.current = [];
        if (!ids.length) {
          useEmbersStore.getState().replaceEvents([]);
          return;
        }
        for (const eventId of ids) {
          eventUnsubs.current.push(
            subscribeEvent(eventId, user.uid, (record) => {
              useEmbersStore.getState().upsertRemoteEvent(record);
            }),
          );
          eventUnsubs.current.push(
            subscribeActivity(eventId, activitySince.current, (item) => {
              const state = useEmbersStore.getState();
              if (item.actorId === state.currentUser?.uid) return;
              if (!state.accountPrefs.notifications || !state.accountPrefs.notifyChanges) return;
              void showNotification("Изменение в событии", item.text);
            }),
          );
        }
        void Promise.all(ids.map((id) => fetchEventRecord(id, user.uid))).then((records) => {
          const list = records.filter(Boolean) as NonNullable<(typeof records)[number]>[];
          const active = useEmbersStore.getState().activeEventId;
          if (list.length) useEmbersStore.getState().replaceEvents(list, active || list[0]?.id);
        });
      });

      void (async () => {
        try {
          const messaging = await getFirebaseMessaging();
          const vapid = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
          if (!messaging || !vapid) return;
          await navigator.serviceWorker?.register("/sw.js");
          const registration = await navigator.serviceWorker.ready;
          const token = await getToken(messaging, { vapidKey: vapid, serviceWorkerRegistration: registration });
          if (token) await saveDeviceToken(user.uid, token);
        } catch {
          /* FCM optional until VAPID is set */
        }
      })();
    });

    return () => {
      stopAuth();
      stopMemberships?.();
      eventUnsubs.current.forEach((stop) => stop());
      eventUnsubs.current = [];
    };
  }, []);

  return null;
}
