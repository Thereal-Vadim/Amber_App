"use client";

import { useEffect, useSyncExternalStore } from "react";
import { Plus } from "lucide-react";
import { type ThemePreference, eventPhase, useEmbersStore } from "@/store/useEmbersStore";
import { ArchiveSweep, FrameNotice, NotificationBridge, cn, useBoardEvents, useClock } from "../EmbersApp";
import { Avatar, Button, EventThumb, Icon, Panel, PhaseDot, SectionLabel, organizer, phaseLabel, shortDate } from "./ui";
import { DesktopAuth } from "./auth";
import { DesktopHub } from "./hub";
import { DesktopLive } from "./live";
import { DesktopCreate } from "./create";
import { DesktopScheduleEditor, DesktopScheduleGrid } from "./schedule";
import { DesktopModals, useArchived } from "./modals";

const themeKey = "amber-theme";

function useSystemDark() {
  return useSyncExternalStore(
    (notify) => {
      const query = window.matchMedia("(prefers-color-scheme: dark)");
      query.addEventListener("change", notify);
      return () => query.removeEventListener("change", notify);
    },
    () => window.matchMedia("(prefers-color-scheme: dark)").matches,
    () => true,
  );
}

function useTheme() {
  const theme = useEmbersStore((s) => s.theme);
  const setTheme = useEmbersStore((s) => s.setTheme);
  const systemDark = useSystemDark();
  useEffect(() => {
    const saved = localStorage.getItem(themeKey);
    if (saved === "light" || saved === "dark" || saved === "system") setTheme(saved as ThemePreference);
  }, [setTheme]);
  useEffect(() => { localStorage.setItem(themeKey, theme); }, [theme]);
  const resolved = theme === "system" ? (systemDark ? "dark" : "light") : theme;
  useEffect(() => {
    const color = resolved === "dark" ? "#000000" : "#f2f2f7";
    document.documentElement.style.backgroundColor = color;
    document.body.style.backgroundColor = color;
    document.querySelectorAll('meta[name="theme-color"]').forEach((node) => node.setAttribute("content", color));
  }, [resolved]);
  return resolved;
}

function Sidebar() {
  const screen = useEmbersStore((s) => s.screen);
  const activeId = useEmbersStore((s) => s.activeEventId);
  const selectEvent = useEmbersStore((s) => s.selectEvent);
  const setScreen = useEmbersStore((s) => s.setScreen);
  const resumeCreate = useEmbersStore((s) => s.resumeCreate);
  const open = useEmbersStore((s) => s.openSheet);
  const events = useBoardEvents();
  const archived = useArchived();
  const now = useClock().getTime();
  const inEvent = screen === "live" || screen === "schedule";
  return <Panel as="aside" className="flex w-[248px] shrink-0 flex-col p-3">
    <div className="flex h-12 items-center gap-2.5 px-2">
      <span className="grid h-9 w-9 place-items-center rounded-[11px] bg-brand text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,.2)]"><Icon name="flame" size={20} /></span>
      <b className="text-body font-bold">Amber</b>
    </div>
    <Button tone="primary" className="mt-3 w-full" onClick={resumeCreate}><Plus size={16} strokeWidth={2.6} />Новое событие</Button>
    <SectionLabel className="mb-1.5 mt-6 px-2">События</SectionLabel>
    <div className="no-scrollbar -mx-1 max-h-[40vh] space-y-0.5 overflow-y-auto px-1">
      {!events.length && <p className="px-2 py-1 text-caption text-ink-3">Нет текущих событий</p>}
      {events.map((item) => {
        const phase = eventPhase(item.details, now);
        const active = inEvent && item.id === activeId;
        return <button key={item.id} type="button" onClick={() => { selectEvent(item.id); setScreen("live"); }} className={cn("flex w-full items-center gap-3 rounded-[16px] px-2 py-2 text-left transition-colors", active ? "bg-field" : "hover:bg-ink/5")}>
          <EventThumb cover={item.details.cover} size={34} />
          <span className="min-w-0 flex-1">
            <b className="block truncate text-callout font-semibold">{item.details.title || "Без названия"}</b>
            <small className="mt-0.5 flex items-center gap-1.5 text-footnote text-ink-2"><PhaseDot phase={phase} /><span className="truncate">{shortDate(item.details.date)} · {phaseLabel(phase)}</span></small>
          </span>
        </button>;
      })}
    </div>
    <SectionLabel className="mb-1.5 mt-6 px-2">Навигация</SectionLabel>
    <nav className="space-y-0.5">
      {([["Присоединиться по коду", () => open("join")], ["Заготовленные локации", () => open("locations")], [`Архив · ${archived.length}`, () => open("archive")]] as const).map(([label, action]) => <button key={label} type="button" onClick={action} className="flex h-10 w-full items-center rounded-[14px] px-2 text-left text-callout transition-colors hover:bg-ink/5">{label}</button>)}
    </nav>
    <button type="button" onClick={() => open("account")} className="mt-auto flex items-center gap-3 rounded-[18px] bg-field p-2.5 text-left transition-colors hover:bg-ink/15">
      <Avatar member={organizer} size={36} ring={false} />
      <span className="min-w-0"><b className="block truncate text-callout font-semibold">{organizer.name}</b><small className="text-footnote text-ink-2">Настройки</small></span>
    </button>
  </Panel>;
}

function Workspace() {
  const screen = useEmbersStore((s) => s.screen);
  const view = useEmbersStore((s) => s.scheduleView);
  const content = screen === "create" ? <DesktopCreate /> : screen === "live" ? <DesktopLive /> : screen === "schedule" ? (view === "grid" ? <DesktopScheduleGrid /> : <DesktopScheduleEditor />) : <DesktopHub />;
  return <>
    <div aria-hidden className={cn("absolute inset-0", screen === "create" ? "bg-hero" : "bg-backdrop")} />
    <div className="relative flex h-full gap-4 p-4">
      <Sidebar />
      <main className="relative min-w-0 flex-1">{content}</main>
    </div>
  </>;
}

export default function DesktopApp() {
  const screen = useEmbersStore((s) => s.screen);
  const theme = useTheme();
  return <div className="ds fixed inset-0 overflow-hidden" data-theme={theme}>
    <ArchiveSweep />
    <NotificationBridge />
    {screen === "auth" ? <DesktopAuth /> : <Workspace />}
    <DesktopModals />
    <FrameNotice />
  </div>;
}
