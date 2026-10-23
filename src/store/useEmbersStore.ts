"use client";

import { create } from "zustand";
import { z } from "zod";
import type { AuthProfile } from "@/lib/auth";
import { allPermissions, can as canPerm, noPermissions, type MemberPermissions, type PermissionKey } from "@/lib/permissions";
import {
  createEventRemote,
  joinEventByCode,
  postActivity,
  pushEventFields,
  pushMember,
  pushSchedule,
  updateMemberFields,
  updateMemberPermissions,
  type MemberDoc,
} from "@/lib/eventsApi";

export type Status = "on_site" | "in_transit" | "ready" | "gathering";
export type Screen = "auth" | "hub" | "create" | "live" | "schedule";
export type Sheet = null | "join" | "member" | "status" | "datetime" | "location" | "invite" | "account" | "phone" | "files" | "archive" | "locations" | "permissions";
export type ThemePreference = "system" | "light" | "dark";
export type ScheduleView = "list" | "grid";
export type { PermissionKey, MemberPermissions };

export type Member = {
  id: string;
  initials: string;
  name: string;
  role: string;
  roleLong?: string;
  color: string;
  status: Status;
  spot: string;
  currentTask: string;
  next: string;
  phone: string;
  coords: { x: number; y: number };
};

export type ScheduleBlock = {
  id: string;
  location: string;
  task: string;
  time: string;
  color: string;
  travel?: number;
};

export type ProgramFile = {
  id: string;
  name: string;
  size: number;
  url: string;
};

export const locationIconNames = ["sparkles", "mic", "camera", "users", "pin", "door", "box", "lamp", "music", "coffee", "star", "flag"] as const;
export type LocationIcon = (typeof locationIconNames)[number];

export type PresetLocation = {
  id: string;
  name: string;
  color: string;
  icon: LocationIcon;
};

export type LocationGroup = {
  name: string;
  locations: PresetLocation[];
};

export const statusMeta: Record<Status, { label: string; color: string }> = {
  on_site: { label: "На площадке", color: "#22C55E" },
  in_transit: { label: "В пути", color: "#3B82F6" },
  ready: { label: "Готов", color: "#EAB308" },
  gathering: { label: "Сбор", color: "#A855F7" },
};

export type EventDetails = {
  title: string;
  dateLabel: string;
  time: string;
  endTime: string;
  allDay: boolean;
  venue: string;
  zone: string;
  timezone: string;
  description: string;
  cover: string;
  date: string;
  lat: number | null;
  lng: number | null;
};

export const demoEvent: EventDetails = {
  title: "Городское окно",
  dateLabel: "Суббота, 1 сентября",
  time: "08:00",
  endTime: "",
  allDay: false,
  venue: "ВДНХ, павильон 57",
  zone: "",
  timezone: "Москва",
  description: "",
  cover: "",
  date: "2029-09-01",
  lat: 55.8304,
  lng: 37.6326,
};

export const blankDraft: EventDetails = {
  title: "",
  dateLabel: "",
  time: "08:00",
  endTime: "",
  allDay: false,
  venue: "",
  zone: "",
  timezone: "Москва",
  description: "",
  cover: "",
  date: "",
  lat: null,
  lng: null,
};

export const team: Member[] = [
  { id: "kostya", initials: "КБ", name: "Костя Белов", role: "Свет", roleLong: "Художник по свету", color: "#3B82F6", status: "on_site", spot: "Сцена А", currentTask: "Монтаж света · ещё 36 мин", next: "19:30 · Свет на награждении", phone: "+79031234501", coords: { x: 28, y: 38 } },
  { id: "kirill", initials: "КО", name: "Кирилл Орлов", role: "Техник", color: "#06B6D4", status: "in_transit", spot: "Еду на склад", currentTask: "12 мин в пути", next: "19:15 · Проверка звука", phone: "+79031234502", coords: { x: 22, y: 74 } },
  { id: "anya", initials: "АС", name: "Аня Смирнова", role: "Видео", color: "#EF4444", status: "ready", spot: "Сцена А, точка 2", currentTask: "готова", next: "19:30 · Съёмка награждения", phone: "+79031234503", coords: { x: 64, y: 68 } },
  { id: "masha", initials: "МК", name: "Маша Ким", role: "Фото", color: "#10B981", status: "on_site", spot: "Фотозона", currentTask: "ещё 20 мин", next: "19:20 · Групповое фото", phone: "+79031234504", coords: { x: 72, y: 42 } },
  { id: "ilya", initials: "ИП", name: "Илья Петров", role: "Звук", color: "#8B5CF6", status: "gathering", spot: "Гримвагон", currentTask: "сбор 5 мин", next: "19:10 · Саундчек", phone: "+79031234505", coords: { x: 86, y: 78 } },
];

export type EventRecord = {
  id: string;
  code: string;
  ownerId: string;
  organizer: Member;
  details: EventDetails;
  team: Member[];
  schedules: Record<string, ScheduleBlock[]>;
  memberRoles: Record<string, string>;
  permissions: Record<string, MemberPermissions>;
  openRoles: string[];
  programFiles: ProgramFile[];
  locationGroups: LocationGroup[];
  myStatus: Status;
  shareLocation: boolean;
  archivedAt: number | null;
  /** Past events stay on the board after the user returns them from the archive. */
  boardPinned?: boolean;
};

type AccountPrefs = {
  notifications: boolean;
  notifyStatus: boolean;
  notifyShifts: boolean;
  notifyTeam: boolean;
  notifyChanges: boolean;
  calendar: boolean;
  emailUpdates: boolean;
};

type Store = {
  screen: Screen;
  sheet: Sheet;
  selectedMemberId: string;
  teamFilter: "all" | Status;
  joined: boolean;
  joinCode: string;
  joinRole: string;
  joinError: string;
  profilePhone: string;
  notice: string;
  events: EventRecord[];
  activeEventId: string;
  draftEvent: EventRecord | null;
  scheduleOrigin: "live" | "invite";
  scheduleReturn: "live" | "create";
  accountPrefs: AccountPrefs;
  theme: ThemePreference;
  scheduleView: ScheduleView;
  currentUser: AuthProfile | null;
  authReady: boolean;
  authBusy: boolean;
  setTheme: (theme: ThemePreference) => void;
  setScheduleView: (view: ScheduleView) => void;
  shelveDraft: () => void;
  resumeCreate: () => void;
  setScreen: (screen: Screen) => void;
  openSheet: (sheet: Sheet, memberId?: string) => void;
  closeSheet: () => void;
  selectEvent: (id: string) => void;
  archiveEvent: (id: string) => void;
  restoreEvent: (id: string) => void;
  deleteEvent: (id: string) => void;
  pruneArchive: (now: number) => void;
  updateMyStatus: (status: Status) => void;
  filterTeam: (filter: "all" | Status) => void;
  toggleShareLocation: () => void;
  setJoinCode: (code: string) => void;
  setJoinRole: (role: string) => void;
  addOpenRole: (role: string) => void;
  addTeamMember: (name: string, role: string) => void;
  setProfilePhone: (phone: string) => void;
  setNotice: (notice: string) => void;
  joinByCode: (code?: string) => boolean;
  joinEventRemote: (code?: string) => Promise<boolean>;
  updateDraft: (patch: Partial<EventDetails>) => void;
  toggleAllDay: () => void;
  createEvent: () => void;
  startCreate: () => void;
  addScheduleBlock: (location: string) => void;
  insertScheduleBlock: (location: string, index: number) => void;
  reorderScheduleBlocks: (blocks: ScheduleBlock[]) => void;
  removeScheduleBlock: (id: string) => void;
  updateScheduleBlock: (id: string, patch: Partial<Pick<ScheduleBlock, "task" | "time" | "travel">>) => void;
  openSchedule: (memberId: string, origin?: "live" | "invite") => void;
  setMemberRole: (id: string, role: string) => void;
  setMemberPermissions: (memberId: string, permissions: MemberPermissions) => void;
  addProgramFile: (file: ProgramFile) => void;
  removeProgramFile: (id: string) => void;
  addLocationGroup: (name: string) => void;
  removeLocationGroup: (name: string) => void;
  addPresetLocation: (group: string, name: string) => void;
  updatePresetLocation: (id: string, patch: { group?: string; color?: string; icon?: LocationIcon }) => void;
  removePresetLocation: (group: string, id: string) => void;
  setAccountPref: (key: keyof AccountPrefs, value: boolean) => void;
  setCurrentUser: (user: AuthProfile | null) => void;
  setAuthReady: (ready: boolean) => void;
  setAuthBusy: (busy: boolean) => void;
  replaceEvents: (events: EventRecord[], activeEventId?: string) => void;
  upsertRemoteEvent: (record: EventRecord) => void;
  clearSession: () => void;
};

const joinCodeSchema = z.string().regex(/^[A-Z0-9]{6}$/, "Введите 6 символов");
const eventTitleSchema = z.string().trim().min(2, "Добавьте название");

export function formatDateLabel(iso: string) {
  const date = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  const label = new Intl.DateTimeFormat("ru-RU", { weekday: "long", day: "numeric", month: "long" }).format(date);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function eventWhen(event: EventDetails) {
  return event.allDay ? `${event.dateLabel} · весь день` : `${event.dateLabel} · ${event.time}`;
}

export function eventPlace(event: EventDetails) {
  const name = event.zone.trim();
  if (name && event.venue) return `${name} · ${event.venue}`;
  return name || event.venue;
}

const dayMs = 24 * 60 * 60 * 1000;
export const archiveLifetime = 7 * dayMs;
export type EventPhase = "live" | "upcoming" | "past";

function clockParts(value: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return { hours, minutes };
}

export function eventWindow(event: EventDetails) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(event.date);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const startOfDay = new Date(year, month - 1, day).getTime();
  if (event.allDay) return { start: startOfDay, end: startOfDay + dayMs };
  const startClock = clockParts(event.time) ?? { hours: 0, minutes: 0 };
  const start = new Date(year, month - 1, day, startClock.hours, startClock.minutes).getTime();
  const endClock = clockParts(event.endTime);
  if (!endClock) return { start, end: startOfDay + dayMs };
  let end = new Date(year, month - 1, day, endClock.hours, endClock.minutes).getTime();
  if (end <= start) end += dayMs;
  return { start, end };
}

export function eventPhase(event: EventDetails, now: number): EventPhase {
  const window = eventWindow(event);
  if (!window || now < window.start) return "upcoming";
  if (now < window.end) return "live";
  return "past";
}

export function archiveDaysLeft(event: EventDetails, now: number, archivedAt?: number | null) {
  if (archivedAt != null) return Math.max(0, Math.ceil((archivedAt + archiveLifetime - now) / dayMs));
  const window = eventWindow(event);
  if (!window) return 7;
  return Math.max(0, Math.ceil((window.end + archiveLifetime - now) / dayMs));
}

export function archiveExpired(event: EventDetails, now: number, archivedAt?: number | null) {
  if (archivedAt != null) return now >= archivedAt + archiveLifetime;
  const window = eventWindow(event);
  if (!window) return false;
  return now >= window.end + archiveLifetime;
}

export const presetColors = ["#ff3b30", "#ff6b00", "#ffcc00", "#34c759", "#007aff", "#5e5ce6", "#af52de", "#ff2d55"];

export const initialLocationGroups: LocationGroup[] = [
  { name: "Сцена", locations: [{ id: "main-stage", name: "Главная сцена", color: "#ff3b30", icon: "mic" }, { id: "small-stage", name: "Малая сцена", color: "#ff6b00", icon: "sparkles" }] },
  { name: "Служебные", locations: [{ id: "storage", name: "Склад", color: "#34c759", icon: "box" }, { id: "office", name: "Офис", color: "#007aff", icon: "lamp" }] },
  { name: "Гости", locations: [{ id: "photo-zone", name: "Фотозона", color: "#af52de", icon: "camera" }, { id: "entrance", name: "Вход / регистрация", color: "#5e5ce6", icon: "door" }] },
];

const initialSchedule: ScheduleBlock[] = [
  { id: "stage", location: "Главная сцена", task: "Выставить свет на спикера и зону интерактива", time: "18:00 – 19:30", color: "#FF5A1F" },
  { id: "photo", location: "Фотозона", task: "Подготовить финальный свет для группового фото", time: "19:40 – 20:20", color: "#8B5CF6" },
];

function cloneGroups(groups: LocationGroup[]) {
  return groups.map((group) => ({ ...group, locations: group.locations.map((location) => ({ ...location })) }));
}

function eventCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
}

const demoOrganizer: Member = {
  id: "vadim",
  initials: "ВФ",
  name: "Вадим Филатов",
  role: "Организатор",
  color: "#9c613d",
  status: "on_site",
  spot: "Площадка",
  currentTask: "Организация",
  next: "Расписание",
  phone: "",
  coords: { x: 48, y: 48 },
};

function blankRecord(code: string, owner?: AuthProfile | null): EventRecord {
  const organizer: Member = owner
    ? {
        id: owner.uid,
        initials: owner.initials,
        name: owner.name,
        role: "Организатор",
        color: owner.color,
        status: "on_site",
        spot: "Площадка",
        currentTask: "Организация",
        next: "Расписание",
        phone: owner.phone,
        coords: { x: 48, y: 48 },
      }
    : { ...demoOrganizer };
  const ownerId = organizer.id;
  return {
    id: `event-${Date.now()}`,
    code,
    ownerId,
    organizer,
    details: { ...blankDraft },
    team: [],
    schedules: { [ownerId]: [] },
    memberRoles: { [ownerId]: "Организатор" },
    permissions: { [ownerId]: allPermissions() },
    openRoles: [],
    programFiles: [],
    locationGroups: cloneGroups(initialLocationGroups),
    myStatus: "on_site",
    shareLocation: true,
    archivedAt: null,
  };
}

const demoRecord: EventRecord = {
  id: "gorodskoe-okno",
  code: "K7Q2X9",
  ownerId: "vadim",
  organizer: { ...demoOrganizer },
  details: { ...demoEvent },
  team: team.map((member) => ({ ...member, coords: { ...member.coords } })),
  schedules: {
    kostya: initialSchedule.map((block) => ({ ...block })),
    kirill: [],
    anya: [],
    masha: [],
    ilya: [],
    vadim: [],
  },
  memberRoles: { vadim: "Организатор", kostya: "Свет", kirill: "Техник", anya: "Видео", masha: "Фото", ilya: "Звук" },
  permissions: {
    vadim: allPermissions(),
    kostya: noPermissions(),
    kirill: noPermissions(),
    anya: noPermissions(),
    masha: noPermissions(),
    ilya: noPermissions(),
  },
  openRoles: [],
  programFiles: [],
  locationGroups: cloneGroups(initialLocationGroups),
  myStatus: "on_site",
  shareLocation: true,
  archivedAt: null,
};

export function eventPeople(event: EventRecord) {
  return [event.organizer, ...event.team];
}

export function viewerCan(state: Pick<Store, "currentUser"> & { event: EventRecord }, key: PermissionKey) {
  const uid = state.currentUser?.uid;
  if (!uid) return false;
  if (state.event.ownerId === uid) return true;
  const permissions = state.event.permissions[uid] ?? noPermissions();
  return canPerm({ isOwner: false, permissions }, key);
}

type FocusState = Pick<Store, "screen" | "scheduleOrigin" | "draftEvent" | "events" | "activeEventId">;

export function focusedEvent(state: FocusState) {
  const editing = Boolean(state.draftEvent) && (state.screen === "create" || (state.screen === "schedule" && state.scheduleOrigin === "invite"));
  if (editing && state.draftEvent) return state.draftEvent;
  return state.events.find((event) => event.id === state.activeEventId) ?? state.events[0] ?? blankRecord("------", null);
}

function withFocus(state: FocusState, change: (event: EventRecord) => EventRecord) {
  if (state.draftEvent && (state.screen === "create" || (state.screen === "schedule" && state.scheduleOrigin === "invite"))) {
    return { draftEvent: change(state.draftEvent) };
  }
  return { events: state.events.map((event) => event.id === state.activeEventId ? change(event) : event) };
}

function remoteEnabled(state: Pick<Store, "currentUser">) {
  return Boolean(state.currentUser?.uid);
}

function syncSchedule(state: Store, memberId: string) {
  if (!remoteEnabled(state)) return;
  const event = focusedEvent(state);
  const blocks = event.schedules[memberId] ?? [];
  void pushSchedule(event.id, memberId, blocks).catch(() => undefined);
}

function syncEventMeta(state: Store, patch: Parameters<typeof pushEventFields>[1], activity?: { kind: "team" | "schedule" | "event" | "files" | "locations"; text: string }) {
  if (!remoteEnabled(state)) return;
  const event = focusedEvent(state);
  void pushEventFields(event.id, patch).catch(() => undefined);
  if (activity && state.currentUser) {
    void postActivity(event.id, state.currentUser.uid, activity.kind, activity.text).catch(() => undefined);
  }
}

export function isOnBoard(event: EventRecord, now: number) {
  if (event.archivedAt != null) return false;
  if (event.boardPinned) return true;
  return eventPhase(event.details, now) !== "past";
}

function onBoard(event: EventRecord, now: number) {
  return isOnBoard(event, now);
}

function boardNeighbor(events: EventRecord[], id: string, now: number) {
  const board = events.filter((event) => onBoard(event, now));
  const index = board.findIndex((event) => event.id === id);
  return (board[index + 1] ?? board[index - 1])?.id;
}

export const useEmbersStore = create<Store>((set, get) => ({
  screen: "auth",
  sheet: null,
  selectedMemberId: "",
  teamFilter: "all",
  joined: false,
  joinCode: "",
  joinRole: "Видео",
  joinError: "",
  profilePhone: "",
  notice: "",
  events: [],
  activeEventId: "",
  draftEvent: null,
  scheduleOrigin: "invite",
  scheduleReturn: "create",
  accountPrefs: { notifications: false, notifyStatus: true, notifyShifts: true, notifyTeam: true, notifyChanges: true, calendar: false, emailUpdates: false },
  theme: "system",
  scheduleView: "list",
  currentUser: null,
  authReady: false,
  authBusy: false,
  setTheme: (theme) => set({ theme }),
  setScheduleView: (scheduleView) => set({ scheduleView }),
  setCurrentUser: (currentUser) => set({ currentUser }),
  setAuthReady: (authReady) => set({ authReady }),
  setAuthBusy: (authBusy) => set({ authBusy }),
  replaceEvents: (events, activeEventId) => set((state) => ({
    events,
    activeEventId: activeEventId && events.some((e) => e.id === activeEventId)
      ? activeEventId
      : events[0]?.id ?? "",
    selectedMemberId: state.selectedMemberId || events[0]?.organizer.id || "",
  })),
  upsertRemoteEvent: (record) => set((state) => {
    const exists = state.events.some((event) => event.id === record.id);
    const events = exists ? state.events.map((event) => event.id === record.id ? record : event) : [...state.events, record];
    return {
      events,
      activeEventId: state.activeEventId || record.id,
      selectedMemberId: state.selectedMemberId || record.organizer.id,
    };
  }),
  clearSession: () => set({
    currentUser: null,
    events: [],
    activeEventId: "",
    draftEvent: null,
    screen: "auth",
    sheet: null,
    selectedMemberId: "",
    joined: false,
  }),
  shelveDraft: () => set((state) => state.draftEvent ? { screen: "hub", sheet: null, notice: "Черновик сохранён" } : { screen: "hub", sheet: null }),
  resumeCreate: () => {
    if (useEmbersStore.getState().draftEvent) set({ screen: "create", sheet: null });
    else useEmbersStore.getState().startCreate();
  },
  setScreen: (screen) => set((state) => ({
    screen,
    sheet: null,
    ...(state.screen === "create" && screen !== "create" && screen !== "schedule" ? { draftEvent: null } : {}),
  })),
  openSheet: (sheet, memberId) => set({ sheet, ...(memberId ? { selectedMemberId: memberId } : {}) }),
  closeSheet: () => set({ sheet: null }),
  selectEvent: (id) => set((state) => state.events.some((event) => event.id === id) ? { activeEventId: id } : state),
  archiveEvent: (id) => set((state) => {
    const now = Date.now();
    const current = state.events.find((event) => event.id === id);
    if (!current || current.archivedAt != null) return state;
    const next = state.activeEventId === id ? boardNeighbor(state.events, id, now) : undefined;
    return {
      events: state.events.map((event) => event.id === id ? { ...event, archivedAt: now, boardPinned: false } : event),
      ...(next ? { activeEventId: next } : {}),
      notice: "Событие в архиве",
    };
  }),
  restoreEvent: (id) => set((state) => {
    const now = Date.now();
    const current = state.events.find((event) => event.id === id);
    if (!current || isOnBoard(current, now)) return state;
    const past = eventPhase(current.details, now) === "past";
    return {
      events: state.events.map((event) => event.id === id ? { ...event, archivedAt: null, boardPinned: past } : event),
      activeEventId: id,
      screen: "hub",
      sheet: null,
      notice: "Событие снова на доске",
    };
  }),
  deleteEvent: (id) => set((state) => {
    if (!state.events.some((event) => event.id === id)) return state;
    const now = Date.now();
    const next = state.activeEventId === id ? boardNeighbor(state.events, id, now) : undefined;
    const events = state.events.filter((event) => event.id !== id);
    const activeEventId = next && events.some((event) => event.id === next) ? next : events[0]?.id ?? state.activeEventId;
    return { events, activeEventId, notice: "Событие удалено" };
  }),
  pruneArchive: (now) => set((state) => {
    const events = state.events.filter((event) => !archiveExpired(event.details, now, event.archivedAt));
    if (events.length === state.events.length) return state;
    const activeEventId = events.some((event) => event.id === state.activeEventId)
      ? state.activeEventId
      : events.find((event) => onBoard(event, now))?.id ?? events[0]?.id ?? state.activeEventId;
    return { events, activeEventId };
  }),
  updateMyStatus: (myStatus) => set((state) => {
    const next = { ...withFocus(state, (event) => ({ ...event, myStatus })), sheet: null };
    const uid = state.currentUser?.uid;
    if (uid && remoteEnabled(state)) {
      const event = focusedEvent(state);
      void updateMemberFields(event.id, uid, { myStatus, status: myStatus }).catch(() => undefined);
      void postActivity(event.id, uid, "team", `Статус: ${myStatus}`).catch(() => undefined);
    }
    return next;
  }),
  filterTeam: (teamFilter) => set({ teamFilter }),
  toggleShareLocation: () => set((state) => {
    const event = focusedEvent(state);
    const shareLocation = !event.shareLocation;
    const uid = state.currentUser?.uid;
    if (uid && remoteEnabled(state)) void updateMemberFields(event.id, uid, { shareLocation }).catch(() => undefined);
    return withFocus(state, (item) => ({ ...item, shareLocation }));
  }),
  setJoinCode: (code) => set({ joinCode: code.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6), joinError: "" }),
  setJoinRole: (joinRole) => set({ joinRole }),
  addOpenRole: (role) => set((state) => {
    const name = role.trim();
    const current = focusedEvent(state);
    if (!viewerCan({ currentUser: state.currentUser, event: current }, "manageTeam") && remoteEnabled(state)) {
      return { notice: "Нет права управлять командой" };
    }
    if (!name || current.openRoles.some((item) => item.toLowerCase() === name.toLowerCase())) return state;
    const openRoles = [...current.openRoles, name];
    const next = withFocus(state, (event) => ({ ...event, openRoles }));
    syncEventMeta({ ...state, ...next } as Store, { openRoles }, { kind: "team", text: `Открыта роль «${name}»` });
    return next;
  }),
  addTeamMember: (name, role) => set((state) => {
    const person = name.trim().replace(/\s+/g, " ");
    if (person.length < 2) return { notice: "Введите имя участника" };
    const current = focusedEvent(state);
    if (!viewerCan({ currentUser: state.currentUser, event: current }, "manageTeam") && remoteEnabled(state)) {
      return { notice: "Нет права управлять командой" };
    }
    const job = role.trim() || "Участник";
    const id = `member-${Date.now()}`;
    const colors = ["#3B82F6", "#06B6D4", "#EF4444", "#10B981", "#8B5CF6", "#F59E0B", "#EC4899", "#FF6B00"];
    const pins = [
      { x: 30, y: 36 }, { x: 68, y: 40 }, { x: 24, y: 72 }, { x: 74, y: 66 },
      { x: 48, y: 58 }, { x: 86, y: 48 }, { x: 40, y: 80 }, { x: 58, y: 28 },
    ];
    const parts = person.split(" ");
    const member: Member = {
      id,
      initials: ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "•",
      name: person,
      role: job,
      color: colors[current.team.length % colors.length],
      status: "gathering",
      spot: "Ещё не на площадке",
      currentTask: "ожидает",
      next: "Расписание не задано",
      phone: "",
      coords: pins[current.team.length % pins.length],
    };
    const openRoles = current.openRoles.filter((item) => item.toLowerCase() !== job.toLowerCase());
    const next = withFocus(state, (event) => ({
      ...event,
      team: [...event.team, member],
      schedules: { ...event.schedules, [id]: [] },
      memberRoles: { ...event.memberRoles, [id]: job },
      permissions: { ...event.permissions, [id]: noPermissions() },
      openRoles,
    }));
    if (remoteEnabled(state)) {
      const doc: MemberDoc = { ...member, isOwner: false, permissions: noPermissions(), shareLocation: true, myStatus: "gathering" };
      void pushMember(current.id, doc).catch(() => undefined);
      void pushSchedule(current.id, id, []).catch(() => undefined);
      syncEventMeta({ ...state, ...next } as Store, { openRoles }, { kind: "team", text: `В команду добавлен ${person}` });
    }
    return next;
  }),
  setProfilePhone: (profilePhone) => set({ profilePhone }),
  setNotice: (notice) => set({ notice }),
  joinByCode: (code) => {
    const value = (code ?? get().joinCode).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
    if (!joinCodeSchema.safeParse(value).success) {
      set({ joinCode: value, joinError: "Введите 6 символов" });
      return false;
    }
    if (get().currentUser) {
      void get().joinEventRemote(value);
      return true;
    }
    const found = get().events.find((event) => event.code === value);
    if (!found) {
      set({ joinError: "Событие с таким кодом не найдено" });
      return false;
    }
    set({ joined: true, joinError: "", sheet: null, screen: "live", activeEventId: found.id });
    return true;
  },
  joinEventRemote: async (code) => {
    const state = get();
    const value = (code ?? state.joinCode).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
    if (!joinCodeSchema.safeParse(value).success) {
      set({ joinCode: value, joinError: "Введите 6 символов" });
      return false;
    }
    if (!state.currentUser) {
      set({ joinError: "Сначала войдите в аккаунт" });
      return false;
    }
    set({ authBusy: true, joinError: "" });
    try {
      const result = await joinEventByCode(state.currentUser, value, state.joinRole);
      if (!result.ok) {
        set({ joinError: result.error, authBusy: false });
        return false;
      }
      set({ joined: true, joinError: "", sheet: null, screen: "live", activeEventId: result.eventId, authBusy: false });
      return true;
    } catch (error) {
      set({ joinError: error instanceof Error ? error.message : "Не удалось присоединиться", authBusy: false });
      return false;
    }
  },
  updateDraft: (patch) => set((state) => state.draftEvent ? { draftEvent: { ...state.draftEvent, details: { ...state.draftEvent.details, ...patch } } } : state),
  toggleAllDay: () => set((state) => state.draftEvent ? { draftEvent: { ...state.draftEvent, details: { ...state.draftEvent.details, allDay: !state.draftEvent.details.allDay } } } : state),
  createEvent: () => {
    const draft = get().draftEvent;
    const user = get().currentUser;
    if (!draft) return;
    if (!eventTitleSchema.safeParse(draft.details.title).success) { set({ notice: "Добавьте название события" }); return; }
    if (!draft.details.date) { set({ notice: "Выберите дату события" }); return; }
    if (!draft.details.venue) { set({ notice: "Выберите локацию" }); return; }
    set((state) => ({ events: [...state.events, draft], activeEventId: draft.id, draftEvent: null, screen: "hub", sheet: null }));
    if (user) {
      void createEventRemote(user, draft).catch((error) => {
        set({ notice: error instanceof Error ? error.message : "Не удалось сохранить событие" });
      });
    }
  },
  startCreate: () => set((state) => {
    const taken = state.events.map((event) => event.code);
    let code = eventCode();
    while (taken.includes(code)) code = eventCode();
    const draft = blankRecord(code, state.currentUser);
    return { screen: "create", sheet: null, draftEvent: draft, selectedMemberId: draft.organizer.id };
  }),
  addScheduleBlock: (location) => get().insertScheduleBlock(location, Number.MAX_SAFE_INTEGER),
  insertScheduleBlock: (location, index) => set((state) => {
    const name = location.trim();
    if (!name) return state;
    const event = focusedEvent(state);
    if (!viewerCan({ currentUser: state.currentUser, event }, "editSchedule") && remoteEnabled(state)) {
      return { notice: "Нет права редактировать расписание" };
    }
    const memberId = state.selectedMemberId || event.organizer.id;
    const current = event.schedules[memberId] ?? [];
    const at = Math.max(0, Math.min(index, current.length));
    const next = [...current];
    next.splice(at, 0, {
      id: `${name}-${Date.now()}`,
      location: name,
      task: "Добавьте задачу для этой локации",
      time: "20:30 – 21:00",
      travel: 10,
      color: ["#FF5A1F", "#3B82F6", "#A855F7", "#10B981"][current.length % 4],
    });
    const patch = withFocus(state, (item) => ({ ...item, schedules: { ...item.schedules, [memberId]: next } }));
    const merged = { ...state, ...patch } as Store;
    syncSchedule(merged, memberId);
    if (state.currentUser) void postActivity(event.id, state.currentUser.uid, "schedule", `Обновлено расписание`).catch(() => undefined);
    return patch;
  }),
  reorderScheduleBlocks: (blocks) => set((state) => {
    const memberId = state.selectedMemberId;
    const current = focusedEvent(state).schedules[memberId] ?? [];
    const ids = new Set(current.map((block) => block.id));
    if (blocks.length !== current.length || blocks.some((block) => !ids.has(block.id))) return state;
    const patch = withFocus(state, (event) => ({ ...event, schedules: { ...event.schedules, [memberId]: blocks } }));
    syncSchedule({ ...state, ...patch } as Store, memberId);
    return patch;
  }),
  removeScheduleBlock: (id) => set((state) => {
    const memberId = state.selectedMemberId;
    const patch = withFocus(state, (event) => ({
      ...event,
      schedules: { ...event.schedules, [memberId]: (event.schedules[memberId] ?? []).filter((block) => block.id !== id) },
    }));
    syncSchedule({ ...state, ...patch } as Store, memberId);
    return patch;
  }),
  updateScheduleBlock: (id, patch) => set((state) => {
    const memberId = state.selectedMemberId;
    const task = patch.task?.trim();
    const time = patch.time?.trim();
    const travel = typeof patch.travel === "number" && patch.travel >= 0 ? Math.min(240, Math.round(patch.travel)) : undefined;
    const next = withFocus(state, (event) => ({
      ...event,
      schedules: { ...event.schedules, [memberId]: (event.schedules[memberId] ?? []).map((block) => block.id === id ? { ...block, ...(task ? { task } : {}), ...(time ? { time } : {}), ...(travel !== undefined ? { travel } : {}) } : block) },
    }));
    syncSchedule({ ...state, ...next } as Store, memberId);
    if (state.currentUser && (task || time)) {
      void postActivity(focusedEvent(state).id, state.currentUser.uid, "schedule", task ? "Обновлена задача" : "Обновлено время").catch(() => undefined);
    }
    return next;
  }),
  openSchedule: (memberId, origin = "invite") => set((state) => ({ selectedMemberId: memberId, screen: "schedule", sheet: null, scheduleOrigin: origin, scheduleReturn: state.screen === "live" ? "live" : "create" })),
  setMemberRole: (id, role) => set((state) => {
    const name = role.trim();
    if (!name) return state;
    const event = focusedEvent(state);
    const patch = withFocus(state, (item) => ({
      ...item,
      memberRoles: { ...item.memberRoles, [id]: name },
      team: item.team.map((member) => member.id === id ? { ...member, role: name } : member),
      organizer: item.organizer.id === id ? { ...item.organizer, role: name } : item.organizer,
    }));
    if (remoteEnabled(state)) void updateMemberFields(event.id, id, { role: name }).catch(() => undefined);
    return patch;
  }),
  setMemberPermissions: (memberId, permissions) => set((state) => {
    const event = focusedEvent(state);
    if (event.ownerId !== state.currentUser?.uid) return { notice: "Только организатор выдаёт права" };
    if (memberId === event.ownerId) return state;
    const patch = withFocus(state, (item) => ({ ...item, permissions: { ...item.permissions, [memberId]: permissions } }));
    if (remoteEnabled(state)) void updateMemberPermissions(event.id, memberId, permissions).catch(() => undefined);
    return { ...patch, notice: "Права обновлены" };
  }),
  addProgramFile: (file) => set((state) => {
    const event = focusedEvent(state);
    if (!viewerCan({ currentUser: state.currentUser, event }, "manageFiles") && remoteEnabled(state)) return { notice: "Нет права управлять файлами" };
    const programFiles = [...event.programFiles, file];
    const patch = withFocus(state, (item) => ({ ...item, programFiles }));
    syncEventMeta({ ...state, ...patch } as Store, { programFiles }, { kind: "files", text: `Добавлен файл «${file.name}»` });
    return patch;
  }),
  removeProgramFile: (id) => set((state) => {
    const event = focusedEvent(state);
    const programFiles = event.programFiles.filter((file) => file.id !== id);
    const patch = withFocus(state, (item) => ({ ...item, programFiles }));
    syncEventMeta({ ...state, ...patch } as Store, { programFiles }, { kind: "files", text: "Файл удалён из программы" });
    return patch;
  }),
  addLocationGroup: (name) => set((state) => {
    const title = name.trim();
    const event = focusedEvent(state);
    if (!viewerCan({ currentUser: state.currentUser, event }, "manageLocations") && remoteEnabled(state)) return { notice: "Нет права управлять локациями" };
    if (!title) return state;
    if (event.locationGroups.some((group) => group.name.toLowerCase() === title.toLowerCase())) return { notice: "Такая группа уже есть" };
    const locationGroups = [...event.locationGroups, { name: title, locations: [] }];
    const patch = withFocus(state, (item) => ({ ...item, locationGroups }));
    syncEventMeta({ ...state, ...patch } as Store, { locationGroups }, { kind: "locations", text: `Добавлена группа «${title}»` });
    return patch;
  }),
  removeLocationGroup: (name) => set((state) => {
    const event = focusedEvent(state);
    const locationGroups = event.locationGroups.filter((group) => group.name !== name);
    const patch = withFocus(state, (item) => ({ ...item, locationGroups }));
    syncEventMeta({ ...state, ...patch } as Store, { locationGroups });
    return patch;
  }),
  addPresetLocation: (group, name) => set((state) => {
    const title = name.trim();
    const event = focusedEvent(state);
    if (!title) return state;
    const current = event.locationGroups.find((item) => item.name === group);
    if (!current) return state;
    if (current.locations.some((location) => location.name.toLowerCase() === title.toLowerCase())) return { notice: "Такая локация уже есть" };
    const locationGroups = event.locationGroups.map((item) => item.name === group ? { ...item, locations: [...item.locations, { id: `preset-${Date.now()}`, name: title, color: presetColors[item.locations.length % presetColors.length], icon: "sparkles" as const }] } : item);
    const patch = withFocus(state, (item) => ({ ...item, locationGroups }));
    syncEventMeta({ ...state, ...patch } as Store, { locationGroups }, { kind: "locations", text: `Добавлена локация «${title}»` });
    return patch;
  }),
  updatePresetLocation: (id, patch) => set((state) => {
    const groups = focusedEvent(state).locationGroups;
    const source = groups.find((group) => group.locations.some((location) => location.id === id));
    const current = source?.locations.find((location) => location.id === id);
    if (!source || !current) return state;
    const nextGroup = patch.group?.trim() || source.name;
    if (!groups.some((group) => group.name === nextGroup)) return state;
    const icon = patch.icon && locationIconNames.includes(patch.icon) ? patch.icon : current.icon;
    const updated = { ...current, color: patch.color || current.color, icon };
    const locationGroups = groups.map((group) => {
      if (source.name === nextGroup && group.name === source.name) return { ...group, locations: group.locations.map((location) => location.id === id ? updated : location) };
      if (group.name === source.name) return { ...group, locations: group.locations.filter((location) => location.id !== id) };
      if (group.name === nextGroup) return { ...group, locations: [...group.locations, updated] };
      return group;
    });
    const next = withFocus(state, (event) => ({ ...event, locationGroups }));
    syncEventMeta({ ...state, ...next } as Store, { locationGroups });
    return next;
  }),
  removePresetLocation: (group, id) => set((state) => {
    const locationGroups = focusedEvent(state).locationGroups.map((item) => item.name === group ? { ...item, locations: item.locations.filter((location) => location.id !== id) } : item);
    const patch = withFocus(state, (event) => ({ ...event, locationGroups }));
    syncEventMeta({ ...state, ...patch } as Store, { locationGroups });
    return patch;
  }),
  setAccountPref: (key, value) => set((state) => ({ accountPrefs: { ...state.accountPrefs, [key]: value } })),
}));
