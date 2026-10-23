"use client";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from "firebase/firestore";
import type { EventDetails, EventRecord, Member, ProgramFile, ScheduleBlock, Status, LocationGroup } from "@/store/useEmbersStore";
import { allPermissions, noPermissions, type MemberPermissions, type PermissionKey } from "./permissions";
import { getFirestoreDb } from "./firebase";
import type { AuthProfile } from "./auth";

export type MemberDoc = Member & {
  isOwner: boolean;
  permissions: MemberPermissions;
  shareLocation?: boolean;
  myStatus?: Status;
};

export type EventDoc = {
  ownerId: string;
  code: string;
  details: EventDetails;
  openRoles: string[];
  programFiles: ProgramFile[];
  locationGroups: LocationGroup[];
  archivedAt: number | null;
  boardPinned?: boolean;
  updatedAt: number;
};

function dbOrThrow() {
  const db = getFirestoreDb();
  if (!db) throw new Error("Firestore недоступен");
  return db;
}

export function eventToRecord(
  eventId: string,
  data: EventDoc,
  members: MemberDoc[],
  schedules: Record<string, ScheduleBlock[]>,
  viewerId: string,
): EventRecord {
  const owner = members.find((m) => m.isOwner) ?? members.find((m) => m.id === data.ownerId);
  const team = members.filter((m) => !m.isOwner).map(({ isOwner: _o, permissions: _p, shareLocation: _s, myStatus: _st, ...member }) => member);
  const memberRoles: Record<string, string> = {};
  const permissions: Record<string, MemberPermissions> = {};
  for (const m of members) {
    memberRoles[m.id] = m.role;
    permissions[m.id] = m.isOwner ? allPermissions() : m.permissions;
  }
  const me = members.find((m) => m.id === viewerId);
  return {
    id: eventId,
    code: data.code,
    ownerId: data.ownerId,
    details: data.details,
    team,
    schedules,
    memberRoles,
    permissions,
    openRoles: data.openRoles ?? [],
    programFiles: data.programFiles ?? [],
    locationGroups: data.locationGroups ?? [],
    myStatus: me?.myStatus ?? "on_site",
    shareLocation: me?.shareLocation ?? true,
    archivedAt: data.archivedAt ?? null,
    boardPinned: data.boardPinned,
    organizer: owner
      ? { id: owner.id, initials: owner.initials, name: owner.name, role: owner.role, color: owner.color, status: owner.status, spot: owner.spot, currentTask: owner.currentTask, next: owner.next, phone: owner.phone, coords: owner.coords }
      : {
          id: data.ownerId,
          initials: "•",
          name: "Организатор",
          role: "Организатор",
          color: "#9c613d",
          status: "on_site",
          spot: "",
          currentTask: "",
          next: "",
          phone: "",
          coords: { x: 50, y: 50 },
        },
  };
}

export function ownerMemberFromProfile(profile: AuthProfile): MemberDoc {
  return {
    id: profile.uid,
    initials: profile.initials,
    name: profile.name,
    role: "Организатор",
    color: profile.color,
    status: "on_site",
    spot: "Площадка",
    currentTask: "Организация",
    next: "Расписание",
    phone: profile.phone,
    coords: { x: 48, y: 48 },
    isOwner: true,
    permissions: allPermissions(),
    shareLocation: true,
    myStatus: "on_site",
  };
}

export async function createEventRemote(profile: AuthProfile, record: EventRecord) {
  const db = dbOrThrow();
  const batch = writeBatch(db);
  const eventRef = doc(db, "events", record.id);
  const member = ownerMemberFromProfile(profile);
  batch.set(eventRef, {
    ownerId: profile.uid,
    code: record.code,
    details: record.details,
    openRoles: record.openRoles,
    programFiles: record.programFiles,
    locationGroups: record.locationGroups,
    archivedAt: null,
    boardPinned: false,
    updatedAt: Date.now(),
  } satisfies EventDoc);
  batch.set(doc(db, "events", record.id, "members", profile.uid), member);
  batch.set(doc(db, "events", record.id, "schedules", profile.uid), { blocks: record.schedules[profile.uid] ?? [] });
  batch.set(doc(db, "eventCodes", record.code), { eventId: record.id, title: record.details.title, ownerName: profile.name });
  batch.set(doc(db, "users", profile.uid, "memberships", record.id), { eventId: record.id, code: record.code, role: "Организатор", joinedAt: Date.now() });
  await batch.commit();
}

export async function joinEventByCode(profile: AuthProfile, code: string, role: string) {
  const db = dbOrThrow();
  const codeSnap = await getDoc(doc(db, "eventCodes", code));
  if (!codeSnap.exists()) return { ok: false as const, error: "Событие с таким кодом не найдено" };
  const eventId = codeSnap.data().eventId as string;
  const existing = await getDoc(doc(db, "events", eventId, "members", profile.uid));
  if (existing.exists()) return { ok: true as const, eventId };
  const job = role.trim() || "Участник";
  const member: MemberDoc = {
    id: profile.uid,
    initials: profile.initials,
    name: profile.name,
    role: job,
    color: ["#3B82F6", "#06B6D4", "#EF4444", "#10B981", "#8B5CF6", "#F59E0B"][Math.floor(Math.random() * 6)],
    status: "gathering",
    spot: "Ещё не на площадке",
    currentTask: "ожидает",
    next: "Расписание не задано",
    phone: profile.phone,
    coords: { x: 30 + Math.random() * 40, y: 30 + Math.random() * 40 },
    isOwner: false,
    permissions: noPermissions(),
    shareLocation: true,
    myStatus: "gathering",
  };
  const batch = writeBatch(db);
  batch.set(doc(db, "events", eventId, "members", profile.uid), member);
  batch.set(doc(db, "events", eventId, "schedules", profile.uid), { blocks: [] });
  batch.set(doc(db, "users", profile.uid, "memberships", eventId), { eventId, code, role: job, joinedAt: Date.now() });
  await batch.commit();
  await postActivity(eventId, profile.uid, "team", `В команду добавлен ${profile.name}`);
  return { ok: true as const, eventId };
}

export async function loadUserEventIds(uid: string) {
  const db = dbOrThrow();
  const snap = await getDocs(collection(db, "users", uid, "memberships"));
  return snap.docs.map((d) => d.id);
}

export async function fetchEventRecord(eventId: string, viewerId: string): Promise<EventRecord | null> {
  const db = dbOrThrow();
  const eventSnap = await getDoc(doc(db, "events", eventId));
  if (!eventSnap.exists()) return null;
  const membersSnap = await getDocs(collection(db, "events", eventId, "members"));
  const schedulesSnap = await getDocs(collection(db, "events", eventId, "schedules"));
  const members = membersSnap.docs.map((d) => d.data() as MemberDoc);
  const schedules: Record<string, ScheduleBlock[]> = {};
  for (const s of schedulesSnap.docs) schedules[s.id] = (s.data().blocks as ScheduleBlock[]) ?? [];
  return eventToRecord(eventId, eventSnap.data() as EventDoc, members, schedules, viewerId);
}

export function subscribeEvent(
  eventId: string,
  viewerId: string,
  onChange: (record: EventRecord) => void,
): Unsubscribe {
  const db = dbOrThrow();
  let eventData: EventDoc | null = null;
  let members: MemberDoc[] = [];
  let schedules: Record<string, ScheduleBlock[]> = {};
  const emit = () => {
    if (!eventData) return;
    onChange(eventToRecord(eventId, eventData, members, schedules, viewerId));
  };
  const unsubs = [
    onSnapshot(doc(db, "events", eventId), (snap) => {
      if (!snap.exists()) return;
      eventData = snap.data() as EventDoc;
      emit();
    }),
    onSnapshot(collection(db, "events", eventId, "members"), (snap) => {
      members = snap.docs.map((d) => d.data() as MemberDoc);
      emit();
    }),
    onSnapshot(collection(db, "events", eventId, "schedules"), (snap) => {
      schedules = {};
      for (const s of snap.docs) schedules[s.id] = (s.data().blocks as ScheduleBlock[]) ?? [];
      emit();
    }),
  ];
  return () => unsubs.forEach((u) => u());
}

export function subscribeUserMemberships(uid: string, onIds: (ids: string[]) => void): Unsubscribe {
  const db = dbOrThrow();
  return onSnapshot(collection(db, "users", uid, "memberships"), (snap) => {
    onIds(snap.docs.map((d) => d.id));
  });
}

export async function pushEventFields(eventId: string, patch: Partial<EventDoc>) {
  const db = dbOrThrow();
  await updateDoc(doc(db, "events", eventId), { ...patch, updatedAt: Date.now() });
}

export async function pushSchedule(eventId: string, memberId: string, blocks: ScheduleBlock[]) {
  const db = dbOrThrow();
  await setDoc(doc(db, "events", eventId, "schedules", memberId), { blocks }, { merge: true });
}

export async function pushMember(eventId: string, member: MemberDoc) {
  const db = dbOrThrow();
  await setDoc(doc(db, "events", eventId, "members", member.id), member, { merge: true });
}

export async function updateMemberPermissions(eventId: string, memberId: string, permissions: MemberPermissions) {
  const db = dbOrThrow();
  await updateDoc(doc(db, "events", eventId, "members", memberId), { permissions });
}

export async function updateMemberFields(eventId: string, memberId: string, patch: Partial<MemberDoc>) {
  const db = dbOrThrow();
  await updateDoc(doc(db, "events", eventId, "members", memberId), patch);
}

export async function postActivity(
  eventId: string,
  actorId: string,
  kind: "team" | "schedule" | "event" | "files" | "locations",
  text: string,
) {
  const db = getFirestoreDb();
  if (!db) return;
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  await setDoc(doc(db, "events", eventId, "activity", id), {
    actorId,
    kind,
    text,
    createdAt: Date.now(),
  });
  try {
    await fetch("/api/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId, actorId, kind, text }),
    });
  } catch {
    /* local listeners still work */
  }
}

export function subscribeActivity(
  eventId: string,
  since: number,
  onItem: (item: { id: string; actorId: string; kind: string; text: string; createdAt: number }) => void,
): Unsubscribe {
  const db = dbOrThrow();
  return onSnapshot(collection(db, "events", eventId, "activity"), (snap) => {
    for (const change of snap.docChanges()) {
      if (change.type !== "added") continue;
      const data = change.doc.data() as { actorId: string; kind: string; text: string; createdAt: number };
      if (data.createdAt < since) continue;
      onItem({ id: change.doc.id, ...data });
    }
  });
}

export async function saveDeviceToken(uid: string, token: string) {
  const db = getFirestoreDb();
  if (!db) return;
  await setDoc(doc(db, "users", uid, "devices", token.slice(0, 40)), { token, updatedAt: Date.now() }, { merge: true });
}

export async function listMemberDeviceTokens(eventId: string, excludeUid: string) {
  const db = dbOrThrow();
  const members = await getDocs(collection(db, "events", eventId, "members"));
  const tokens: string[] = [];
  for (const m of members.docs) {
    if (m.id === excludeUid) continue;
    const devices = await getDocs(collection(db, "users", m.id, "devices"));
    for (const d of devices.docs) {
      const token = d.data().token as string | undefined;
      if (token) tokens.push(token);
    }
  }
  return tokens;
}

export { query, where };
