"use client";

import { create } from "zustand";
import { z } from "zod";

export type Status = "on_site" | "in_transit" | "ready" | "gathering";
export type Screen = "auth" | "hub" | "create" | "live" | "schedule";
export type Sheet = null | "join" | "member" | "status" | "datetime" | "location" | "invite" | "account" | "phone" | "files";

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
  dateLabel: "Суббота, 18 октября",
  time: "08:00",
  endTime: "",
  allDay: false,
  venue: "ВДНХ, павильон 57",
  zone: "",
  timezone: "Москва",
  description: "",
  cover: "",
  date: "2026-10-18",
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

type Store = {
  screen: Screen;
  sheet: Sheet;
  hasEvents: boolean;
  selectedMemberId: string;
  teamFilter: "all" | Status;
  myStatus: Status;
  shareLocation: boolean;
  joined: boolean;
  joinCode: string;
  joinRole: string;
  joinError: string;
  openRoles: string[];
  profilePhone: string;
  notice: string;
  event: EventDetails;
  draft: EventDetails;
  eventCreated: boolean;
  scheduleOrigin: "live" | "invite";
  schedules: Record<string, ScheduleBlock[]>;
  memberRoles: Record<string, string>;
  programFiles: ProgramFile[];
  locationGroups: LocationGroup[];
  accountPrefs: { notifications: boolean; calendar: boolean; emailUpdates: boolean };
  setScreen: (screen: Screen) => void;
  openSheet: (sheet: Sheet, memberId?: string) => void;
  closeSheet: () => void;
  setHasEvents: (value: boolean) => void;
  updateMyStatus: (status: Status) => void;
  filterTeam: (filter: "all" | Status) => void;
  toggleShareLocation: () => void;
  setJoinCode: (code: string) => void;
  setJoinRole: (role: string) => void;
  addOpenRole: (role: string) => void;
  setProfilePhone: (phone: string) => void;
  setNotice: (notice: string) => void;
  joinByCode: (code?: string) => boolean;
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
  addProgramFile: (file: ProgramFile) => void;
  removeProgramFile: (id: string) => void;
  addLocationGroup: (name: string) => void;
  removeLocationGroup: (name: string) => void;
  addPresetLocation: (group: string, name: string) => void;
  updatePresetLocation: (id: string, patch: { group?: string; color?: string; icon?: LocationIcon }) => void;
  removePresetLocation: (group: string, id: string) => void;
  setAccountPref: (key: "notifications" | "calendar" | "emailUpdates", value: boolean) => void;
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
  return event.zone ? `${event.venue} · ${event.zone}` : event.venue;
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

export const useEmbersStore = create<Store>((set) => ({
  screen: "auth",
  sheet: null,
  hasEvents: true,
  selectedMemberId: "kostya",
  teamFilter: "all",
  myStatus: "on_site",
  shareLocation: true,
  joined: false,
  joinCode: "",
  joinRole: "Видео",
  joinError: "",
  openRoles: [],
  profilePhone: "",
  notice: "",
  event: { ...demoEvent },
  draft: { ...blankDraft },
  eventCreated: false,
  scheduleOrigin: "invite",
  schedules: { kostya: initialSchedule, kirill: [], anya: [], masha: [], ilya: [], vadim: [] },
  memberRoles: { vadim: "Организатор", kostya: "Свет", kirill: "Техник", anya: "Видео", masha: "Фото", ilya: "Звук" },
  programFiles: [],
  locationGroups: initialLocationGroups,
  accountPrefs: { notifications: true, calendar: false, emailUpdates: false },
  setScreen: (screen) => set({ screen, sheet: null }),
  openSheet: (sheet, memberId) => set({ sheet, ...(memberId ? { selectedMemberId: memberId } : {}) }),
  closeSheet: () => set({ sheet: null }),
  setHasEvents: (hasEvents) => set({ hasEvents }),
  updateMyStatus: (myStatus) => set({ myStatus, sheet: null }),
  filterTeam: (teamFilter) => set({ teamFilter }),
  toggleShareLocation: () => set((state) => ({ shareLocation: !state.shareLocation })),
  setJoinCode: (code) => set({ joinCode: code.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6), joinError: "" }),
  setJoinRole: (joinRole) => set({ joinRole }),
  addOpenRole: (role) => set((state) => {
    const name = role.trim();
    if (!name || state.openRoles.some((item) => item.toLowerCase() === name.toLowerCase())) return state;
    return { openRoles: [...state.openRoles, name] };
  }),
  setProfilePhone: (profilePhone) => set({ profilePhone }),
  setNotice: (notice) => set({ notice }),
  joinByCode: (code) => {
    const value = (code ?? useEmbersStore.getState().joinCode).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
    if (!joinCodeSchema.safeParse(value).success) {
      set({ joinCode: value, joinError: "Введите 6 символов" });
      return false;
    }
    if (value !== "K7Q2X9") {
      set({ joinError: "Событие с таким кодом не найдено" });
      return false;
    }
    set({ joined: true, joinError: "", sheet: null, screen: "live", hasEvents: true });
    return true;
  },
  updateDraft: (patch) => set((state) => ({ draft: { ...state.draft, ...patch } })),
  toggleAllDay: () => set((state) => ({ draft: { ...state.draft, allDay: !state.draft.allDay } })),
  createEvent: () => {
    const draft = useEmbersStore.getState().draft;
    if (!eventTitleSchema.safeParse(draft.title).success) { set({ notice: "Добавьте название события" }); return; }
    if (!draft.date) { set({ notice: "Выберите дату события" }); return; }
    if (!draft.venue) { set({ notice: "Выберите локацию" }); return; }
    set({ event: { ...draft }, draft: { ...blankDraft }, eventCreated: true, hasEvents: true, screen: "hub", sheet: null });
  },
  startCreate: () => set({ screen: "create", sheet: null, draft: { ...blankDraft } }),
  addScheduleBlock: (location) => useEmbersStore.getState().insertScheduleBlock(location, Number.MAX_SAFE_INTEGER),
  insertScheduleBlock: (location, index) => set((state) => {
    const name = location.trim();
    if (!name) return state;
    const current = state.schedules[state.selectedMemberId] ?? [];
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
    return { schedules: { ...state.schedules, [state.selectedMemberId]: next } };
  }),
  reorderScheduleBlocks: (blocks) => set((state) => {
    const current = state.schedules[state.selectedMemberId] ?? [];
    const ids = new Set(current.map((block) => block.id));
    if (blocks.length !== current.length || blocks.some((block) => !ids.has(block.id))) return state;
    return { schedules: { ...state.schedules, [state.selectedMemberId]: blocks } };
  }),
  removeScheduleBlock: (id) => set((state) => ({
    schedules: { ...state.schedules, [state.selectedMemberId]: (state.schedules[state.selectedMemberId] ?? []).filter((block) => block.id !== id) },
  })),
  updateScheduleBlock: (id, patch) => set((state) => {
    const task = patch.task?.trim();
    const time = patch.time?.trim();
    const travel = typeof patch.travel === "number" && patch.travel >= 0 ? Math.min(240, Math.round(patch.travel)) : undefined;
    return { schedules: { ...state.schedules, [state.selectedMemberId]: (state.schedules[state.selectedMemberId] ?? []).map((block) => block.id === id ? { ...block, ...(task ? { task } : {}), ...(time ? { time } : {}), ...(travel !== undefined ? { travel } : {}) } : block) } };
  }),
  openSchedule: (memberId, origin = "invite") => set({ selectedMemberId: memberId, screen: "schedule", sheet: null, scheduleOrigin: origin }),
  setMemberRole: (id, role) => set((state) => {
    const name = role.trim();
    if (!name) return state;
    return { memberRoles: { ...state.memberRoles, [id]: name } };
  }),
  addProgramFile: (file) => set((state) => ({ programFiles: [...state.programFiles, file] })),
  removeProgramFile: (id) => set((state) => ({ programFiles: state.programFiles.filter((file) => file.id !== id) })),
  addLocationGroup: (name) => set((state) => {
    const title = name.trim();
    if (!title) return state;
    if (state.locationGroups.some((group) => group.name.toLowerCase() === title.toLowerCase())) return { notice: "Такая группа уже есть" };
    return { locationGroups: [...state.locationGroups, { name: title, locations: [] }] };
  }),
  removeLocationGroup: (name) => set((state) => ({ locationGroups: state.locationGroups.filter((group) => group.name !== name) })),
  addPresetLocation: (group, name) => set((state) => {
    const title = name.trim();
    if (!title) return state;
    const current = state.locationGroups.find((item) => item.name === group);
    if (!current) return state;
    if (current.locations.some((location) => location.name.toLowerCase() === title.toLowerCase())) return { notice: "Такая локация уже есть" };
    return {
      locationGroups: state.locationGroups.map((item) => item.name === group ? { ...item, locations: [...item.locations, { id: `preset-${Date.now()}`, name: title, color: presetColors[item.locations.length % presetColors.length], icon: "sparkles" }] } : item),
    };
  }),
  updatePresetLocation: (id, patch) => set((state) => {
    const source = state.locationGroups.find((group) => group.locations.some((location) => location.id === id));
    const current = source?.locations.find((location) => location.id === id);
    if (!source || !current) return state;
    const nextGroup = patch.group?.trim() || source.name;
    if (!state.locationGroups.some((group) => group.name === nextGroup)) return state;
    const icon = patch.icon && locationIconNames.includes(patch.icon) ? patch.icon : current.icon;
    const updated = { ...current, color: patch.color || current.color, icon };
    return {
      locationGroups: state.locationGroups.map((group) => {
        if (source.name === nextGroup && group.name === source.name) return { ...group, locations: group.locations.map((location) => location.id === id ? updated : location) };
        if (group.name === source.name) return { ...group, locations: group.locations.filter((location) => location.id !== id) };
        if (group.name === nextGroup) return { ...group, locations: [...group.locations, updated] };
        return group;
      }),
    };
  }),
  removePresetLocation: (group, id) => set((state) => ({
    locationGroups: state.locationGroups.map((item) => item.name === group ? { ...item, locations: item.locations.filter((location) => location.id !== id) } : item),
  })),
  setAccountPref: (key, value) => set((state) => ({ accountPrefs: { ...state.accountPrefs, [key]: value } })),
}));
