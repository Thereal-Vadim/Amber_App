"use client";

import { create } from "zustand";

export type Status = "on_site" | "in_transit" | "ready" | "gathering";
export type Screen = "auth" | "hub" | "create" | "live" | "schedule";
export type Sheet = null | "join" | "member" | "status" | "datetime" | "location" | "invite";

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
  coords: { x: number; y: number };
};

export type ScheduleBlock = {
  id: string;
  location: string;
  task: string;
  time: string;
  color: string;
};

export const statusMeta: Record<Status, { label: string; color: string }> = {
  on_site: { label: "На площадке", color: "#22C55E" },
  in_transit: { label: "В пути", color: "#3B82F6" },
  ready: { label: "Готов", color: "#EAB308" },
  gathering: { label: "Сбор", color: "#A855F7" },
};

export const team: Member[] = [
  { id: "kostya", initials: "КБ", name: "Костя Белов", role: "Свет", roleLong: "Художник по свету", color: "#3B82F6", status: "on_site", spot: "Сцена А", currentTask: "Монтаж света · ещё 36 мин", next: "19:30 · Свет на награждении", coords: { x: 28, y: 38 } },
  { id: "kirill", initials: "КО", name: "Кирилл Орлов", role: "Техник", color: "#06B6D4", status: "in_transit", spot: "Еду на склад", currentTask: "12 мин в пути", next: "19:15 · Проверка звука", coords: { x: 22, y: 74 } },
  { id: "anya", initials: "АС", name: "Аня Смирнова", role: "Видео", color: "#EF4444", status: "ready", spot: "Сцена А, точка 2", currentTask: "готова", next: "19:30 · Съёмка награждения", coords: { x: 64, y: 68 } },
  { id: "masha", initials: "МК", name: "Маша Ким", role: "Фото", color: "#10B981", status: "on_site", spot: "Фотозона", currentTask: "ещё 20 мин", next: "19:20 · Групповое фото", coords: { x: 72, y: 42 } },
  { id: "ilya", initials: "ИП", name: "Илья Петров", role: "Звук", color: "#8B5CF6", status: "gathering", spot: "Гримвагон", currentTask: "сбор 5 мин", next: "19:10 · Саундчек", coords: { x: 86, y: 78 } },
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
  eventCreated: boolean;
  schedule: ScheduleBlock[];
  setScreen: (screen: Screen) => void;
  openSheet: (sheet: Sheet, memberId?: string) => void;
  closeSheet: () => void;
  setHasEvents: (value: boolean) => void;
  updateMyStatus: (status: Status) => void;
  filterTeam: (filter: "all" | Status) => void;
  toggleShareLocation: () => void;
  joinByCode: (code: string) => boolean;
  createEvent: () => void;
  addScheduleBlock: (location: string) => void;
  removeScheduleBlock: (id: string) => void;
};

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
  eventCreated: false,
  schedule: initialSchedule,
  setScreen: (screen) => set({ screen, sheet: null }),
  openSheet: (sheet, memberId) => set({ sheet, ...(memberId ? { selectedMemberId: memberId } : {}) }),
  closeSheet: () => set({ sheet: null }),
  setHasEvents: (hasEvents) => set({ hasEvents }),
  updateMyStatus: (myStatus) => set({ myStatus, sheet: null }),
  filterTeam: (teamFilter) => set({ teamFilter }),
  toggleShareLocation: () => set((state) => ({ shareLocation: !state.shareLocation })),
  joinByCode: (code) => {
    const valid = code.toUpperCase() === "K7Q2X9";
    if (valid) set({ joined: true, sheet: null, screen: "live", hasEvents: true });
    return valid;
  },
  createEvent: () => set({ eventCreated: true, hasEvents: true, screen: "hub", sheet: null }),
  addScheduleBlock: (location) => set((state) => ({
    schedule: [...state.schedule, {
      id: `${location}-${Date.now()}`,
      location,
      task: "Добавьте задачу для этой локации",
      time: "20:30 – 21:00",
      color: ["#FF5A1F", "#3B82F6", "#A855F7", "#10B981"][state.schedule.length % 4],
    }],
  })),
  removeScheduleBlock: (id) => set((state) => ({ schedule: state.schedule.filter((block) => block.id !== id) })),
}));
