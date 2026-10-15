"use client";

import Image from "next/image";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { createPortal } from "react-dom";
import jsQR from "jsqr";
import { AnimatePresence, LayoutGroup, Reorder, animate, motion, useDragControls, useMotionValue, useTransform } from "framer-motion";
import { Drawer } from "vaul";
import {
  CalendarDays, Camera, Check, ChevronDown, ChevronLeft, ChevronRight,
  Clock3, Coffee, Crown, DoorOpen, FileText, Flag, GripVertical, ImagePlus, Info, Lamp, Link2, MapPin,
  Mic, Music, Navigation, Pencil, Phone, Plus, Search, Share2,
  Sparkles, Star, Trash2, Users, Warehouse, X,
} from "lucide-react";
import {
  type EventPhase, type EventRecord, type LocationIcon, type Member, type ProgramFile, type ScheduleBlock, type Sheet, type Status, archiveDaysLeft, blankDraft, eventPhase, eventPlace, eventWhen, eventWindow, focusedEvent, formatDateLabel, locationIconNames, presetColors, statusMeta, useEmbersStore,
} from "@/store/useEmbersStore";
import "mapbox-gl/dist/mapbox-gl.css";

const spring = { type: "spring" as const, stiffness: 380, damping: 30, mass: 0.8 };
const cn = (...v: Array<string | false | null | undefined>) => v.filter(Boolean).join(" ");
const locationIconMap = { sparkles: Sparkles, mic: Mic, camera: Camera, users: Users, pin: MapPin, door: DoorOpen, box: Warehouse, lamp: Lamp, music: Music, coffee: Coffee, star: Star, flag: Flag };
const locationIconLabel: Record<LocationIcon, string> = { sparkles: "Блёстки", mic: "Микрофон", camera: "Камера", users: "Люди", pin: "Метка", door: "Дверь", box: "Коробка", lamp: "Лампа", music: "Музыка", coffee: "Кофе", star: "Звезда", flag: "Флаг" };
function LocationMark({ icon, color, size = 28 }: { icon?: string; color: string; size?: number }) {
  const Icon = locationIconMap[icon as LocationIcon] ?? Sparkles;
  return <span style={{ background: color, width: size, height: size, borderRadius: size >= 48 ? 16 : 8 }} className="grid shrink-0 place-items-center text-white"><Icon size={Math.round(size * 0.46)} /></span>;
}
const timezones = ["Москва", "Калининград", "Самара", "Екатеринбург", "Новосибирск", "Владивосток"];
const emptyBlocks: ScheduleBlock[] = [];
const emptyFiles: ProgramFile[] = [];

async function shareInvite(title: string, code: string) {
  const url = `https://embers.app/j/${code}`;
  if (navigator.share) {
    try {
      await navigator.share({ title, url });
      return "shared" as const;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return "cancelled" as const;
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    return "copied" as const;
  } catch {
    return "failed" as const;
  }
}

function shareResult(result: "shared" | "copied" | "cancelled" | "failed") {
  if (result === "copied") useEmbersStore.getState().setNotice("Ссылка скопирована");
  if (result === "failed") useEmbersStore.getState().setNotice("Не удалось поделиться");
}

function formatAway(minutes: number) {
  if (minutes < 60) return `через ${minutes} мин`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `через ${hours} ч ${rest} мин` : `через ${hours} ч`;
}

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

type SpeechRecognitionLike = {
  lang: string;
  start: () => void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
};

function startDictation(onText: (text: string) => void) {
  const host = window as Window & {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  const Ctor = host.SpeechRecognition || host.webkitSpeechRecognition;
  if (!Ctor) return false;
  const recognition = new Ctor();
  recognition.lang = "ru-RU";
  recognition.onresult = (event) => onText(event.results[0][0].transcript);
  recognition.onerror = () => useEmbersStore.getState().setNotice("Не удалось распознать речь");
  recognition.start();
  return true;
}

function FrameNotice() {
  const notice = useEmbersStore((s) => s.notice);
  const setNotice = useEmbersStore((s) => s.setNotice);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 2200);
    return () => clearTimeout(timer);
  }, [notice, setNotice]);
  if (!notice) return null;
  return <p className="fixed bottom-[max(32px,calc(env(safe-area-inset-bottom)+16px))] left-1/2 z-[200] -translate-x-1/2 rounded-full bg-white px-4 py-2 text-caption font-semibold text-black">{notice}</p>;
}

function Press({ children, className, onClick, type = "button" }: {
  children: React.ReactNode; className?: string; onClick?: () => void; type?: "button" | "submit";
}) {
  return <motion.button type={type} whileTap={{ scale: .96 }} transition={spring} onClick={onClick} className={className}>{children}</motion.button>;
}

function Asset({ src, className = "h-5 w-5" }: { src: string; className?: string }) {
  return <Image alt="" src={src} width={48} height={48} className={className} />;
}

function Avatar({ member, size = 44 }: { member: Member; size?: number }) {
  return <span style={{ width: size, height: size, background: member.color }} className="grid shrink-0 place-items-center rounded-full border-2 border-white text-callout font-semibold shadow-sm">{member.initials}</span>;
}

function StatusPill({ status }: { status: Status }) {
  const meta = statusMeta[status];
  return <span style={{ color: meta.color, background: `${meta.color}2e` }} className="inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-caption font-semibold"><i style={{ background: meta.color }} className="h-2 w-2 rounded-full" />{meta.label}</span>;
}

function CircleButton({ children, onClick, light = false, label, className }: { children: React.ReactNode; onClick?: () => void; light?: boolean; label?: string; className?: string }) {
  return <Press onClick={onClick} className={cn("relative z-30 grid h-11 w-11 place-items-center rounded-full", light ? "bg-white text-black" : "bg-white/10 text-white", className)}>{label && <span className="sr-only">{label}</span>}{children}</Press>;
}

function AuthScreen() {
  const setScreen = useEmbersStore((s) => s.setScreen);
  const open = useEmbersStore((s) => s.openSheet);
  return <div className="figma-gradient flex h-full min-h-0 flex-col overflow-hidden px-5 pt-[max(16px,env(safe-area-inset-top))] text-center" data-node-id="2:3">
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-4">
      <div className="grid h-24 w-24 shrink-0 place-items-center rounded-[28px] border border-white/35 bg-white/15">
        <Asset src="/figma-flame.svg" className="h-12 w-12" />
      </div>
      <h1 className="mt-7 text-display font-extrabold tracking-[-.02em]">Embers</h1>
      <h2 className="mt-4 text-body font-semibold">Вся команда на одной карте</h2>
      <p className="mt-3 text-callout leading-5 text-[#ebebf599]">Кто где, что делает и сколько осталось —<br />в реальном времени на любом событии</p>
    </div>
    <div className="shrink-0 space-y-3 pb-[max(24px,env(safe-area-inset-bottom))]">
      <Press onClick={() => setScreen("hub")} className="flex h-[54px] w-full items-center justify-center gap-2 rounded-full bg-white text-body font-semibold text-black"><Asset src="/figma-apple.svg" />Войти через Apple</Press>
      <Press onClick={() => open("phone")} className="flex h-[54px] w-full items-center justify-center gap-2 rounded-full border border-white/30 bg-white/15 text-body font-semibold"><Asset src="/figma-phone.svg" />Войти по номеру</Press>
      <p className="px-4 pt-2 text-caption leading-4 text-[#ebebf599]">Продолжая, вы принимаете Условия использования<br />и Политику конфиденциальности</p>
    </div>
  </div>;
}

function useBoardEvents() {
  const events = useEmbersStore((s) => s.events);
  const now = useClock();
  const time = now.getTime();
  return events
    .filter((event) => event.archivedAt == null && eventPhase(event.details, time) !== "past")
    .sort((left, right) => {
      const live = Number(eventPhase(right.details, time) === "live") - Number(eventPhase(left.details, time) === "live");
      if (live) return live;
      const start = (eventWindow(left.details)?.start ?? Number.MAX_SAFE_INTEGER) - (eventWindow(right.details)?.start ?? Number.MAX_SAFE_INTEGER);
      if (start) return start;
      return left.details.title.localeCompare(right.details.title, "ru");
    });
}

function HubHeader() {
  const setScreen = useEmbersStore((s) => s.setScreen);
  const startCreate = useEmbersStore((s) => s.startCreate);
  const open = useEmbersStore((s) => s.openSheet);
  const events = useBoardEvents();
  const selectEvent = useEmbersStore((s) => s.selectEvent);
  const [menu, setMenu] = useState(false);
  return <div className="absolute inset-x-5 top-(--chrome-top) z-20 flex h-11 items-center">
    <button onClick={() => setMenu((value) => !value)} className="flex items-center text-left" aria-expanded={menu}>
      <h1 className="text-title font-bold tracking-tight">События</h1>
      <ChevronDown size={22} className={cn("ml-1 text-white/60 transition-transform", menu && "rotate-180")} />
    </button>
    <div className="ml-auto flex gap-2">
      <CircleButton onClick={startCreate} label="Новое событие"><Plus size={22} /></CircleButton>
      <button onClick={() => open("account")} aria-label="Аккаунт" className="grid h-11 w-11 place-items-center rounded-full bg-[#9c613d] text-body font-semibold">ВФ</button>
    </div>
    {menu && <div className="absolute left-0 top-14 max-h-80 w-64 overflow-y-auto rounded-2xl bg-[#2c2c2e] shadow-2xl">
      {events.length ? events.map((item) => <button key={item.id} onClick={() => { selectEvent(item.id); setMenu(false); setScreen("live"); }} className="flex h-14 w-full items-center px-4 text-left text-body">{item.details.title || "Без названия"}</button>) : <p className="px-4 py-4 text-callout text-white/60">Нет текущих событий</p>}
    </div>}
  </div>;
}

function EmptyHub({ archived }: { archived: boolean }) {
  const open = useEmbersStore((s) => s.openSheet);
  const startCreate = useEmbersStore((s) => s.startCreate);
  return <div data-node-id="2:57">
    <div className="absolute left-14 right-14 top-[calc(106px+var(--chrome-shift))] h-10 rounded-[28px] bg-white/5" />
    <div className="absolute left-[38px] right-[38px] top-[calc(120px+var(--chrome-shift))] h-10 rounded-[30px] bg-white/[.07]" />
    <div className="absolute inset-x-5 top-[calc(136px+var(--chrome-shift))] flex h-[330px] flex-col items-center rounded-[32px] border border-white/[.08] bg-white/10 text-center">
      <span className="mt-[34px] grid h-[104px] w-[104px] place-items-center rounded-full bg-orange-500/25"><CalendarDays size={48} className="text-[#ff6b00]" /></span>
      <h2 className="mt-6 text-title font-bold">{archived ? "События в архиве" : "Пока нет событий"}</h2>
      <p className="mt-2 px-5 text-callout leading-5 text-[#ebebf599]">{archived ? <>Прошедшие события лежат в настройках<br />и хранятся там 7 дней</> : <>Создайте событие и пригласите команду<br />или присоединитесь по ссылке<br />от организатора</>}</p>
    </div>
    <div className="absolute inset-x-5 top-[calc(516px+var(--chrome-shift))] space-y-3">
      <Press onClick={startCreate} className="flex h-[54px] w-full items-center justify-center gap-2 rounded-full bg-[#ff6b00] text-body font-semibold"><Plus size={18} />Создать событие</Press>
      <Press onClick={() => open("join")} className="flex h-[54px] w-full items-center justify-center gap-2 rounded-full border border-white/15 bg-white/15 text-body font-semibold"><Link2 size={18} />Присоединиться по ссылке или коду</Press>
    </div>
  </div>;
}

const cardGap = 16;
const deleteReveal = 112;

function rubberShift(value: number, min: number, max: number, size: number) {
  if (value < min) {
    const over = min - value;
    return min - (over * size) / (over + size * 0.55);
  }
  if (value > max) {
    const over = value - max;
    return max + (over * size) / (over + size * 0.55);
  }
  return value;
}

function ruDays(count: number) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  const word = mod10 === 1 && mod100 !== 11 ? "день" : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? "дня" : "дней";
  return `${count} ${word}`;
}

function EventStatusBadge({ phase, size = "card" }: { phase: EventPhase; size?: "card" | "board" }) {
  const box = size === "card" ? "h-8 gap-1.5 px-3 text-caption" : "h-[30px] gap-1 px-3 text-caption";
  const label = phase === "live" ? "LIVE" : phase === "upcoming" ? "СКОРО" : "ПРОШЛО";
  const dot = phase === "live" ? "bg-red-500" : phase === "upcoming" ? "bg-[#ffd60a]" : "bg-white/45";
  return <span className={cn("inline-flex items-center rounded-full bg-black/30 font-bold", box, phase === "past" && "text-white/80")}><i className={cn("h-2 w-2 rounded-full", dot)} />{label}</span>;
}

function EventCard({ record, onOpen }: { record: EventRecord; onOpen: () => void }) {
  const now = useClock();
  const event = record.details;
  const team = record.team;
  return <motion.button type="button" onClick={onOpen} whileTap={{ scale: .98 }} transition={spring} className="relative h-full w-full overflow-hidden rounded-[36px] bg-gradient-to-b from-[#ff8a1f] via-[#d2321c] via-45% to-[#3b0b22] text-center shadow-2xl">
    {event.cover && <span className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${event.cover})` }} />}
    <div className="absolute -left-16 top-10 h-[300px] w-[300px] rounded-full bg-[radial-gradient(circle_at_35%_30%,#ffd18b_0%,#ff7a1c_35%,transparent_68%)] opacity-90 blur-sm" />
    <div className="absolute inset-x-0 bottom-0 h-80 bg-gradient-to-b from-transparent to-black/55" />
    <span className="absolute left-4 top-4 flex h-8 items-center gap-1.5 rounded-full bg-white/20 px-3 text-caption font-semibold"><Asset src="/figma-crown.svg" className="h-3.5 w-3.5" />Организатор</span>
    <span className="absolute right-4 top-4"><EventStatusBadge phase={eventPhase(event, now.getTime())} /></span>
    <div className="absolute inset-x-0 bottom-8 flex flex-col items-center">
      <div className="flex justify-center -space-x-2">{team.slice(0, 4).map((m) => <Avatar key={m.id} member={m} size={36} />)}</div>
      <h2 className="mt-4 text-title font-extrabold tracking-tight">{event.title}</h2>
      <p className="mt-1.5 text-body font-semibold">{eventWhen(event)}</p>
      <p className="mt-1 text-callout text-white/75">{event.venue}</p>
      {event.description && <p className="mt-1 line-clamp-2 px-6 text-caption text-white/70">{event.description}</p>}
      <span className="mt-4 flex h-9 items-center gap-2 rounded-full bg-white/20 px-4 text-callout font-semibold"><Asset src="/figma-users.svg" className="h-4 w-4" />{team.length} в команде</span>
    </div>
  </motion.button>;
}

function EventPager() {
  const events = useBoardEvents();
  const activeId = useEmbersStore((s) => s.activeEventId);
  const selectEvent = useEmbersStore((s) => s.selectEvent);
  const archiveEvent = useEmbersStore((s) => s.archiveEvent);
  const deleteEvent = useEmbersStore((s) => s.deleteEvent);
  const setScreen = useEmbersStore((s) => s.setScreen);
  const index = Math.max(0, events.findIndex((item) => item.id === activeId));
  const frameRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [deleteReady, setDeleteReady] = useState(false);
  const x = useMotionValue(0);
  const lift = useMotionValue(0);
  const archiveOpacity = useTransform(lift, [28, 120], [0, 1]);
  const deleteOpacity = useTransform(lift, [-24, -deleteReveal], [0, 1]);
  const dragging = useRef(false);
  const placed = useRef(false);
  const suppressClick = useRef(false);
  const deleteOpen = useRef(false);
  const busy = useRef(false);
  const motionControl = useRef<{ stop: () => void } | null>(null);
  const stride = width + cardGap;

  useLayoutEffect(() => {
    const node = frameRef.current;
    if (!node) return;
    const measure = () => setWidth(node.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    if (!width || dragging.current) return;
    const target = -index * stride;
    if (!placed.current) {
      x.set(target);
      placed.current = true;
      return;
    }
    const animation = animate(x, target, spring);
    return () => animation.stop();
  }, [index, stride, width, x]);

  useLayoutEffect(() => {
    lift.set(0);
    deleteOpen.current = false;
    setDeleteReady(false);
  }, [activeId, lift]);

  const settleDelete = (open: boolean) => {
    deleteOpen.current = open;
    setDeleteReady(open);
    motionControl.current?.stop();
    motionControl.current = animate(lift, open ? -deleteReveal : 0, spring);
  };

  const openCard = (id: string) => {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    if (deleteOpen.current) {
      settleDelete(false);
      return;
    }
    selectEvent(id);
    setScreen("live");
  };

  const finishVertical = (id: string, velocity: number) => {
    const value = lift.get();
    if (value > 88 || (value > 36 && velocity > 900)) {
      busy.current = true;
      motionControl.current?.stop();
      const animation = animate(lift, 560, { duration: 0.26, ease: [0.4, 0, 1, 1] });
      motionControl.current = animation;
      void animation.finished.then(() => {
        busy.current = false;
        archiveEvent(id);
      });
      return;
    }
    if (value < -56 || (value < -28 && velocity < -700)) {
      settleDelete(true);
      return;
    }
    settleDelete(false);
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || busy.current || !width) return;
    suppressClick.current = false;
    motionControl.current?.stop();
    const pointerId = event.pointerId;
    const startX = event.clientX;
    const startY = event.clientY;
    const originX = x.get();
    const originY = lift.get();
    const minX = -Math.max(0, events.length - 1) * stride;
    let locked: "x" | "y" | null = null;
    let lastX = startX;
    let lastY = startY;
    let lastTime = performance.now();
    let velocityX = 0;
    let velocityY = 0;
    const move = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      const now = performance.now();
      const dt = now - lastTime;
      if (dt > 0) {
        velocityX = ((ev.clientX - lastX) / dt) * 1000;
        velocityY = ((ev.clientY - lastY) / dt) * 1000;
      }
      lastX = ev.clientX;
      lastY = ev.clientY;
      lastTime = now;
      if (!locked && Math.hypot(dx, dy) > 8) {
        locked = Math.abs(dy) > Math.abs(dx) ? "y" : "x";
        dragging.current = true;
        suppressClick.current = true;
      }
      if (locked === "x" && events.length > 1 && !deleteOpen.current) {
        x.set(rubberShift(originX + dx, minX, 0, width));
      }
      if (locked === "y") {
        ev.preventDefault();
        const raw = originY + dy;
        lift.set(raw <= 0 ? rubberShift(raw, -deleteReveal, 0, 160) : rubberShift(raw, 0, 240, 160));
      }
    };
    const up = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      dragging.current = false;
      if (locked === "x") {
        if (deleteOpen.current) {
          settleDelete(false);
          return;
        }
        x.stop();
        const nudge = Math.max(-stride, Math.min(stride, velocityX * 0.12));
        const next = Math.max(0, Math.min(events.length - 1, Math.round(-(x.get() + nudge) / stride)));
        if (events[next]?.id !== activeId) selectEvent(events[next].id);
        else void animate(x, -index * stride, spring);
      }
      if (locked === "y") finishVertical(activeId, velocityY);
    };
    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", up);
  };

  return <div ref={frameRef} onPointerDown={onPointerDown} className="absolute inset-x-5 top-[calc(104px+var(--chrome-shift))] bottom-[max(52px,env(safe-area-inset-bottom))] touch-none overflow-hidden">
    {width > 0 && <motion.div className="flex h-full" style={{ x, gap: cardGap }}>
      {events.map((item) => <div key={item.id} className="relative h-full shrink-0" style={{ width }} inert={item.id !== activeId}>
        {item.id === activeId && <>
          <motion.div style={{ opacity: archiveOpacity }} className="pointer-events-none absolute inset-x-0 top-3 flex justify-center">
            <span className="rounded-full bg-white/15 px-4 py-2 text-callout font-semibold">В архив</span>
          </motion.div>
          <motion.div style={{ opacity: deleteOpacity }} className="absolute inset-x-0 bottom-3 flex justify-center">
            <button type="button" onPointerDown={(pointer) => pointer.stopPropagation()} onClick={() => {
              busy.current = true;
              motionControl.current?.stop();
              const animation = animate(lift, -560, { duration: 0.22, ease: [0.4, 0, 1, 1] });
              motionControl.current = animation;
              void animation.finished.then(() => { busy.current = false; deleteEvent(item.id); });
            }} className={cn("flex h-12 items-center gap-2 rounded-full bg-[#ff3b30] px-5 text-body font-semibold shadow-[0_10px_24px_rgba(255,59,48,.35)]", !deleteReady && "pointer-events-none")}>
              <Trash2 size={18} />Удалить
            </button>
          </motion.div>
        </>}
        <motion.div className="relative z-10 h-full" style={{ y: item.id === activeId ? lift : 0 }}>
          <EventCard record={item} onOpen={() => openCard(item.id)} />
        </motion.div>
      </div>)}
    </motion.div>}
  </div>;
}

function EventsHub() {
  const events = useEmbersStore((s) => s.events);
  const board = useBoardEvents();
  const activeId = useEmbersStore((s) => s.activeEventId);
  const selectEvent = useEmbersStore((s) => s.selectEvent);
  const boardKey = board.map((event) => event.id).join("\0");
  useEffect(() => {
    const ids = boardKey ? boardKey.split("\0") : [];
    if (!ids.length || ids.includes(activeId)) return;
    selectEvent(ids[0]);
  }, [activeId, boardKey, selectEvent]);
  return <div className="hub-gradient absolute inset-0 overflow-hidden" data-node-id={board.length ? "2:131" : "2:57"}>
    <HubHeader />{board.length ? <EventPager /> : <EmptyHub archived={events.length > 0} />}
    {board.length > 1 && <div className="absolute bottom-[max(24px,env(safe-area-inset-bottom))] left-1/2 z-10 flex -translate-x-1/2 gap-2">
      {board.map((item) => <button key={item.id} aria-label={item.details.title} onClick={() => selectEvent(item.id)} className={cn("h-2 w-2 rounded-full", item.id === activeId ? "bg-white" : "bg-white/30")} />)}
    </div>}
  </div>;
}

function placeMark() {
  const mark = document.createElement("div");
  mark.style.cssText = "display:grid;width:22px;height:22px;place-items:center;border-radius:999px;border:3px solid #fff;background:#ff6b00;box-shadow:0 1px 4px rgba(0,0,0,.28)";
  const dot = document.createElement("span");
  dot.style.cssText = "width:6px;height:6px;border-radius:999px;background:#fff";
  mark.append(dot);
  return mark;
}

function LocationMap({ lat, lng }: { lat: number; lng: number }) {
  const nodeRef = useRef<HTMLDivElement>(null);
  const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
  const [expanded, setExpanded] = useState(false);
  const [frame, setFrame] = useState<HTMLElement | null>(null);
  useEffect(() => { setFrame(document.querySelector<HTMLElement>(".phone-frame")); }, []);
  useEffect(() => {
    const node = nodeRef.current;
    if (!node || !token) return;
    let map: { remove: () => void } | undefined;
    let alive = true;
    void import("mapbox-gl").then((mod) => {
      if (!alive || !node.isConnected) return;
      const mapboxgl = mod.default;
      mapboxgl.accessToken = token;
      const instance = new mapboxgl.Map({
        container: node,
        style: "mapbox://styles/therealvadim/cmv9jobw2013801sgcb182g5m",
        center: [lng, lat],
        zoom: expanded ? 16.4 : 15.6,
        pitch: 62,
        bearing: -24,
        antialias: true,
        cooperativeGestures: !expanded,
      });
      instance.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
      new mapboxgl.Marker({ element: placeMark(), anchor: "center" }).setLngLat([lng, lat]).addTo(instance);
      instance.once("style.load", () => {
        if (!alive) return;
        try { instance.setConfigProperty("basemap", "show3dObjects", true); } catch { /* стиль без конфигурации standard */ }
        const hasExtrusion = (instance.getStyle()?.layers ?? []).some((layer) => layer.type === "fill-extrusion");
        if (!hasExtrusion && instance.getSource("composite")) {
          instance.addLayer({
            id: "embers-buildings",
            source: "composite",
            "source-layer": "building",
            filter: ["==", ["get", "extrude"], "true"],
            type: "fill-extrusion",
            minzoom: 14,
            paint: {
              "fill-extrusion-color": "#e7e2dc",
              "fill-extrusion-height": ["interpolate", ["linear"], ["zoom"], 14, 0, 15.2, ["get", "height"]],
              "fill-extrusion-base": ["coalesce", ["get", "min_height"], 0],
              "fill-extrusion-opacity": 0.9,
            },
          });
        }
      });
      if (!alive) {
        instance.remove();
        return;
      }
      map = instance;
    });
    return () => {
      alive = false;
      map?.remove();
    };
  }, [expanded, lat, lng, token]);
  if (!token) return <div className="mt-4 grid h-52 place-items-center rounded-[22px] bg-black/30 px-6 text-center text-caption leading-5 text-white/50">Добавьте ключ Mapbox, чтобы показать карту</div>;
  const view = <div className={expanded ? "absolute inset-0 z-40 bg-[#111]" : "relative h-full w-full"}>
    <div ref={nodeRef} className="h-full w-full" />
    {expanded
      ? <button type="button" aria-label="Закрыть карту" onClick={() => setExpanded(false)} className="absolute left-5 top-(--chrome-top) z-20 grid h-11 w-11 place-items-center rounded-full bg-black/55 text-white backdrop-blur-xl"><X size={20} /></button>
      : <button type="button" aria-label="Открыть карту" onClick={() => setExpanded(true)} className="absolute inset-0 z-10" />}
  </div>;
  return <>
    <div className="relative mt-4 h-52 overflow-hidden rounded-[22px]">{expanded ? null : view}</div>
    {expanded && frame ? createPortal(view, frame) : null}
  </>;
}

function CreateEvent() {
  const setScreen = useEmbersStore((s) => s.setScreen);
  const open = useEmbersStore((s) => s.openSheet);
  const draft = useEmbersStore((s) => s.draftEvent?.details ?? blankDraft);
  const updateDraft = useEmbersStore((s) => s.updateDraft);
  const createEvent = useEmbersStore((s) => s.createEvent);
  const files = useEmbersStore((s) => s.draftEvent?.programFiles ?? emptyFiles);
  const coverRef = useRef<HTMLInputElement>(null);
  const [showMap, setShowMap] = useState(true);
  const placeName = draft.zone.trim();
  const [addressTitle, ...addressRest] = draft.venue.split(",").map((part) => part.trim()).filter(Boolean);
  const placeTitle = placeName || addressTitle;
  const placeDetail = placeName ? draft.venue : addressRest.join(", ");
  useEffect(() => { if (draft.venue) setShowMap(true); }, [draft.venue]);
  return <div className="relative h-full">
    <div className="no-scrollbar h-full overflow-y-auto">
    <div className="figma-gradient relative min-h-full pb-[max(32px,env(safe-area-inset-bottom))]" data-node-id="2:347">
    <div className="flex h-[28rem] flex-col items-center px-5 pt-[calc(84px+var(--chrome-shift))]">
      <input ref={coverRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) updateDraft({ cover: URL.createObjectURL(file) }); }} />
      <div className="flex flex-1 items-center">
        <button aria-label="Добавить фотографию" onClick={() => coverRef.current?.click()} className="relative grid h-[72px] w-[72px] place-items-center overflow-hidden rounded-full bg-white/20">{draft.cover ? <span className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${draft.cover})` }} /> : <ImagePlus size={30} />}</button>
      </div>
    </div>
    <div className="px-5">
      <div className="rounded-[32px] bg-[#1a040861] px-5">
        <input value={draft.title} onChange={(e) => updateDraft({ title: e.target.value })} placeholder="Название события" style={{ fontSize: "28px", fontWeight: 600, letterSpacing: "-0.03em" }} className="w-full bg-transparent py-8 text-center leading-tight outline-none placeholder:text-white/40" />
        <button onClick={() => open("datetime")} className="flex w-full flex-col items-center gap-2 border-t border-white/15 py-5 text-center"><CalendarDays size={22} className="text-white/80" /><span className={cn("text-body leading-6", draft.date ? "font-semibold" : "font-medium text-white/85")}>{draft.date ? eventWhen(draft) : "Дата события"}</span></button>
        <button onClick={() => open("location")} className="flex w-full flex-col items-center gap-2 border-t border-white/15 py-5 text-center"><MapPin size={22} className="text-white/80" /><span className={cn("text-body leading-6", draft.venue ? "font-semibold" : "font-medium text-white/85")}>{draft.venue ? eventPlace(draft) : "Выбрать локацию"}</span></button>
        <textarea value={draft.description} onChange={(e) => updateDraft({ description: e.target.value })} placeholder="Описание" rows={1} style={{ fontSize: "28px", fontWeight: 600, letterSpacing: "-0.03em", fieldSizing: "content" }} className="w-full resize-none bg-transparent py-8 text-center leading-tight outline-none placeholder:text-white/40" />
      </div>
      <div className="relative mt-3 rounded-[32px] bg-[#1a040861] px-5 py-6 text-center">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#9c613d] text-body font-semibold">ВФ</span>
        <p className="mt-3 text-caption text-white/60">Организатор</p>
        <p className="text-body font-semibold leading-7">Вадим Филатов</p>
      </div>
      {showMap && draft.venue && draft.lat != null && draft.lng != null && <div className="relative mt-3 rounded-[32px] bg-[#1a040861] px-5 pb-4 pt-5 text-center">
        <button aria-label="Скрыть карту" onClick={() => setShowMap(false)} className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full bg-white/10"><X size={16} /></button>
        <MapPin size={22} className="mx-auto text-[#8eb6ff]" />
        <p className="mt-2 text-body font-semibold leading-6">{placeTitle}</p>
        {placeDetail && <p className="mt-1 text-callout text-white/75">{placeDetail}</p>}
        <LocationMap lat={draft.lat} lng={draft.lng} />
      </div>}
      <div className="mt-3 rounded-[32px] bg-[#1a040861] px-5 py-4 text-center">
        <p className="text-caption font-medium tracking-wide text-white/55">ДЛЯ КОМАНДЫ</p>
        <button onClick={() => open("invite")} className="relative flex w-full flex-col items-center py-3.5"><span className="flex items-center gap-2 text-body font-semibold"><Users size={20} />Команда</span><small className="mt-0.5 text-callout text-white/60">Добавьте людей и роли</small><ChevronRight size={18} className="absolute right-0 top-1/2 -translate-y-1/2 text-white/45" /></button>
        <button onClick={() => open("files")} className="relative flex w-full flex-col items-center border-t border-white/15 py-3.5"><span className="flex items-center gap-2 text-body font-semibold"><FileText size={20} />Программа</span><small className="mt-0.5 text-callout text-white/60">{files.length ? `${files.length} PDF` : "Проходки, инструкции и другие PDF"}</small><ChevronRight size={18} className="absolute right-0 top-1/2 -translate-y-1/2 text-white/45" /></button>
      </div>
    </div>
    </div>
    </div>
    <div className="absolute left-5 top-(--chrome-top) z-30"><CircleButton onClick={() => setScreen("hub")} label="Назад" className="backdrop-blur-xl"><X size={20} /></CircleButton></div>
    <button onClick={createEvent} className="absolute right-5 top-(--chrome-top) z-30 h-11 rounded-full bg-white/20 px-4 text-callout font-semibold backdrop-blur-xl">Создать</button>
  </div>;
}

function minutesOf(value: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function clockLabel(minutes: number) {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

function scheduleRanges(schedules: Record<string, ScheduleBlock[]>, memberIds: readonly string[]) {
  return memberIds.flatMap((id) => schedules[id] ?? []).flatMap((block) => {
    const { start, end } = splitRange(block.time);
    const from = minutesOf(start);
    const to = minutesOf(end);
    if (from === null || to === null || to < from) return [];
    return [{ location: block.location, from, to, color: block.color }];
  }).sort((left, right) => left.from - right.from || left.to - right.to);
}

function momentAt(ranges: Array<{ location: string; from: number; to: number; color: string }>, selected: number) {
  const running = ranges.find((item) => item.from <= selected && selected < item.to);
  const upcoming = ranges.find((item) => item.from >= selected);
  const item = running ?? upcoming ?? ranges[ranges.length - 1];
  const away = item.from - selected;
  return {
    at: item.from,
    title: `${item.location} в ${clockLabel(item.from)}`,
    detail: running || away === 0 ? "сейчас" : away > 0 ? formatAway(away) : "уже прошло",
  };
}

function liveTimeline(schedules: Record<string, ScheduleBlock[]>, memberIds: readonly string[], current: number) {
  const ranges = scheduleRanges(schedules, memberIds);
  if (!ranges.length) return null;
  const upcoming = ranges.find((item) => item.from >= current);
  const running = ranges.find((item) => item.from <= current && current < item.to);
  const last = ranges[ranges.length - 1];
  const moment = upcoming
    ? { at: upcoming.from, title: `${upcoming.location} в ${clockLabel(upcoming.from)}` }
    : running
      ? { at: running.to, title: `${running.location} до ${clockLabel(running.to)}` }
      : { at: last.from, title: `${last.location} в ${clockLabel(last.from)}` };
  return { moment, ranges };
}

const liveCueStyle = { fontSize: 17, fontWeight: 400, lineHeight: "24px" };

function Timeline() {
  const now = useClock();
  const record = useEmbersStore(focusedEvent);
  const liveMinutes = now.getHours() * 60 + now.getMinutes();
  const [scrub, setScrub] = useState<number | null>(null);
  useEffect(() => { setScrub(null); }, [record.id]);
  const timeline = liveTimeline(record.schedules, record.team.map((member) => member.id), liveMinutes);
  const selected = scrub ?? liveMinutes;
  const preview = timeline && scrub !== null ? momentAt(timeline.ranges, selected) : null;
  const moment = preview ?? timeline?.moment ?? null;
  const label = clockLabel(scrub ?? liveMinutes);
  const day = 24 * 60;
  const progress = Math.min(100, Math.max(0, (selected / day) * 100));
  const away = timeline && !preview ? timeline.moment.at - liveMinutes : 0;
  const detail = preview ? preview.detail : timeline ? (away > 0 ? formatAway(away) : away === 0 ? "сейчас" : "уже прошло") : "Добавьте точки дня";
  const scrollerRef = useRef<HTMLDivElement>(null);
  const alignFrame = useRef(0);
  const [viewport, setViewport] = useState(0);
  const anchored = useRef<string | null>(null);
  useEffect(() => () => cancelAnimationFrame(alignFrame.current), []);
  useLayoutEffect(() => {
    const node = scrollerRef.current;
    if (!node) return;
    const measure = () => setViewport(node.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [timeline]);
  useLayoutEffect(() => {
    const node = scrollerRef.current;
    if (!node || !viewport || anchored.current === record.id) return;
    const hourWidth = viewport / 6;
    const nowX = 8 + (liveMinutes / 60) * hourWidth;
    node.scrollLeft = Math.max(0, nowX - viewport * 0.28);
    anchored.current = record.id;
  }, [viewport, record.id, liveMinutes]);
  const scrubTo = (clientX: number, element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    const ratio = rect.width ? Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)) : 0;
    const minutes = Math.round(ratio * day);
    setScrub(Math.abs(minutes - liveMinutes) <= 1 ? null : Math.min(day, minutes));
  };
  const alignLiveToStart = (fromMinutes?: number) => {
    const node = scrollerRef.current;
    if (!node || !viewport) return;
    const hourWidth = viewport / 6;
    const xFor = (minutes: number) => 8 + (minutes / 60) * hourWidth;
    const maxScroll = Math.max(0, node.scrollWidth - node.clientWidth);
    const target = Math.min(maxScroll, Math.max(0, xFor(liveMinutes) - 18));
    const start = node.scrollLeft;
    const delta = target - start;
    const origin = fromMinutes ?? liveMinutes;
    const minuteDelta = liveMinutes - origin;
    cancelAnimationFrame(alignFrame.current);
    if (Math.abs(delta) < 1 && Math.abs(minuteDelta) < 1) {
      setScrub(null);
      return;
    }
    const duration = 420;
    const started = performance.now();
    const step = (time: number) => {
      const progress = Math.min(1, (time - started) / duration);
      const eased = 1 - (1 - progress) ** 3;
      node.scrollLeft = start + delta * eased;
      if (progress < 1) {
        if (fromMinutes !== undefined) setScrub(Math.round(origin + minuteDelta * eased));
        alignFrame.current = requestAnimationFrame(step);
      } else {
        node.scrollLeft = target;
        setScrub(null);
      }
    };
    alignFrame.current = requestAnimationFrame(step);
  };
  const panScale = (event: ReactPointerEvent<HTMLDivElement>) => {
    const scroller = scrollerRef.current;
    if (!scroller || event.button !== 0) return;
    cancelAnimationFrame(alignFrame.current);
    const pointerId = event.pointerId;
    const startX = event.clientX;
    const startY = event.clientY;
    const startScroll = scroller.scrollLeft;
    let locked: "x" | "y" | null = null;
    const move = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      if (!locked && Math.hypot(dx, dy) > 6) locked = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
      if (locked !== "x") return;
      ev.preventDefault();
      scroller.scrollLeft = startScroll - dx;
    };
    const up = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", up);
  };
  const dayWidth = viewport > 0 ? (viewport / 6) * 24 : 0;
  return <div className="rounded-[28px] bg-white/10 p-5">
    {scrub === null ? <button type="button" onClick={() => alignLiveToStart()} className="text-[#ff6b00]" style={liveCueStyle}>сейчас</button> : <button type="button" onClick={() => alignLiveToStart(scrub)} className="text-[#ff6b00]" style={liveCueStyle}>вернуться к live</button>}
    <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4">
      <p className="text-display font-bold leading-[58px] tracking-[-0.04em] tabular">{label}</p>
      <div className="text-right text-callout font-semibold leading-[18px]">
        <p className="truncate">{moment ? moment.title : "Нет расписания"}</p>
        <p className="mt-0.5 truncate text-[#ff6b00]">{detail}</p>
      </div>
    </div>
    {timeline && <div ref={scrollerRef} className="no-scrollbar mt-5 overflow-x-auto overflow-y-hidden">
      {dayWidth > 0 && <div style={{ width: dayWidth + 16 }} className="px-2">
        <div className="relative py-2">
          <div className="relative h-1.5">
            <div
              role="slider"
              aria-label="Время дня"
              aria-valuemin={0}
              aria-valuemax={day}
              aria-valuenow={Math.min(day, Math.max(0, selected))}
              aria-valuetext={clockLabel(Math.min(day, Math.max(0, selected)))}
              tabIndex={0}
              onPointerDown={(event) => {
                event.stopPropagation();
                const slider = event.currentTarget;
                scrubTo(event.clientX, slider);
                slider.setPointerCapture(event.pointerId);
              }}
              onPointerMove={(event) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) scrubTo(event.clientX, event.currentTarget); }}
              onKeyDown={(event) => {
                const step = event.shiftKey ? 60 : 15;
                if (event.key === "ArrowRight") { event.preventDefault(); setScrub(Math.min(day, selected + step)); }
                if (event.key === "ArrowLeft") { event.preventDefault(); const next = Math.max(0, selected - step); setScrub(Math.abs(next - liveMinutes) <= 1 ? null : next); }
                if (event.key === "Home") { event.preventDefault(); setScrub(null); }
              }}
              className="absolute -inset-y-3 inset-x-0 z-10 cursor-pointer touch-none"
            />
            <div className="pointer-events-none relative h-1.5 rounded-full bg-white/15">
              {timeline.ranges.map((item) => <span key={`${item.location}-${item.from}-${item.to}`} className="absolute inset-y-0 rounded-full" style={{ left: `${(item.from / day) * 100}%`, width: `${((item.to - item.from) / day) * 100}%`, background: item.color }} />)}
              <span aria-hidden className="absolute top-1/2 z-10 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-[#ff6b00] bg-white" style={{ left: `${progress}%` }} />
            </div>
          </div>
        </div>
        <div onPointerDown={panScale} className="relative z-20 mt-0.5 h-8 cursor-grab touch-pan-x select-none active:cursor-grabbing">
          <div className="relative h-4 text-caption text-white/45">
            {Array.from({ length: 25 }, (_, hour) => <span key={hour} className="absolute top-0 w-5 -translate-x-1/2 text-center tabular" style={{ left: `${(hour / 24) * 100}%` }}>{hour}</span>)}
          </div>
        </div>
      </div>}
    </div>}
  </div>;
}

function MapCard() {
  const open = useEmbersStore((s) => s.openSheet);
  const team = useEmbersStore((s) => focusedEvent(s).team);
  const onSite = team.filter((member) => member.status === "on_site").length;
  const inTransit = team.filter((member) => member.status === "in_transit").length;
  return <div className="rounded-[28px] bg-white/10 p-5"><h3 className="text-body font-bold">Карта</h3><p className="mt-2 text-caption text-white/45">{onSite} на площадке · {inTransit} в пути</p>
    <div className="relative mt-5 h-[164px] overflow-hidden rounded-[18px] bg-[#26262b]">
      <i className="absolute -left-5 top-20 h-2 w-[420px] rotate-[8deg] bg-[#3a3a42]" /><i className="absolute left-28 -top-10 h-[260px] w-3 rotate-[8deg] bg-[#3a3a42]" /><i className="absolute right-14 -top-10 h-[260px] w-2 -rotate-12 bg-[#3a3a42]" />
      <span className="absolute right-10 top-3 h-[70px] w-[110px] rounded-[18px] bg-green-500/20" />
      {team.some((member) => member.spot.includes("Сцена")) && <span className="absolute left-[168px] top-[72px] rounded-full bg-black/70 px-2 py-1 text-caption font-semibold">Сцена А</span>}
      {team.map((m) => <button key={m.id} onClick={() => open("member", m.id)} style={{ left: `${m.coords.x}%`, top: `${m.coords.y}%` }} className="absolute -translate-x-1/2 -translate-y-1/2"><Avatar member={m} size={30} /></button>)}
    </div>
    <button className="mt-5 flex h-10 w-full items-center justify-center gap-2 rounded-full bg-white/15 text-caption font-semibold"><Asset src="/figma-nav.svg" className="h-4 w-4" />Маршрут и карта</button>
  </div>;
}

const swipeSpring = { type: "spring" as const, stiffness: 460, damping: 34, mass: 0.7 };

function MemberRow({ member, role, revealed, onReveal, onClose }: { member: Member; role: string; revealed: boolean; onReveal: () => void; onClose: () => void }) {
  const open = useEmbersStore((s) => s.openSheet);
  const openSchedule = useEmbersStore((s) => s.openSchedule);
  const x = useMotionValue(0);
  const moved = useRef(false);
  const action = 68;
  const scale = useTransform(x, [-120, -action, 0], [1, 1, 0.55], { clamp: true });
  const opacity = useTransform(x, [-action, -28, 0], [1, 0, 0], { clamp: true });
  useEffect(() => {
    const animation = animate(x, revealed ? -action : 0, swipeSpring);
    return () => animation.stop();
  }, [revealed, x]);
  const finish = (info: { offset: { x: number }; velocity: { x: number } }) => {
    const shouldOpen = info.offset.x < -action * 0.4 || info.velocity.x < -650;
    moved.current = Math.abs(info.offset.x) > 6;
    if (shouldOpen) onReveal();
    else onClose();
    if (shouldOpen === revealed) void animate(x, shouldOpen ? -action : 0, swipeSpring);
  };
  return <div className="relative h-[104px] overflow-hidden rounded-[24px]">
    <div className="absolute inset-y-0 right-3 z-0 flex items-center">
      <motion.button type="button" aria-label={`Изменить расписание ${member.name}`} style={{ scale, opacity }} whileTap={{ scale: 0.9 }} onClick={() => openSchedule(member.id, "live")} className="grid h-11 w-11 place-items-center rounded-full bg-[#007AFF] text-white shadow-[0_8px_18px_rgba(0,122,255,0.4)]"><Pencil size={20} strokeWidth={2.2} /></motion.button>
    </div>
    <motion.button type="button" drag="x" dragConstraints={{ left: -action, right: 0 }} dragElastic={0.16} dragMomentum={false} dragDirectionLock style={{ x }} onDragEnd={(_, info) => finish(info)} onClick={() => { if (moved.current) { moved.current = false; return; } if (revealed) onClose(); else open("member", member.id); }} className="absolute inset-0 z-10 flex items-start gap-3 rounded-[24px] bg-[#1a1a1a] p-4 text-left">
      <Avatar member={member} /><div className="min-w-0 flex-1"><div className="flex items-start justify-between"><div><b className="block text-callout">{member.name}</b><small className="text-caption text-white/45">{role}</small></div><StatusPill status={member.status} /></div><div className="mt-1 flex justify-between text-caption"><span>{member.spot}</span><b className="text-[#ff6b00]">{member.currentTask.split("· ").at(-1)}</b></div><p className="truncate text-caption text-white/40">дальше {member.next}</p></div>
    </motion.button>
  </div>;
}

function TeamList() {
  const filter = useEmbersStore((s) => s.teamFilter);
  const setFilter = useEmbersStore((s) => s.filterTeam);
  const record = useEmbersStore(focusedEvent);
  const team = record.team;
  const roles = record.memberRoles;
  const open = useEmbersStore((s) => s.openSheet);
  const [swipedId, setSwipedId] = useState<string | null>(null);
  const counts = { all: team.length, on_site: team.filter((member) => member.status === "on_site").length, in_transit: team.filter((member) => member.status === "in_transit").length };
  const visible = filter === "all" ? team : team.filter((m) => m.status === filter);
  return <div className="flex flex-col gap-5">
    <LayoutGroup><div className="no-scrollbar flex gap-5 overflow-x-auto">
    {([["all", `Все · ${counts.all}`], ["on_site", `На площадке · ${counts.on_site}`], ["in_transit", `В пути · ${counts.in_transit}`]] as const).map(([id, label]) => <button key={id} onClick={() => setFilter(id)} className={cn("relative shrink-0 rounded-full px-3 py-2 text-caption", filter === id ? "text-black" : "bg-white/10")} >{filter === id && <motion.i layoutId="filter" transition={spring} className="absolute inset-0 rounded-full bg-white" />}<span className="relative">{label}</span></button>)}
  </div></LayoutGroup>
    <div className="flex items-center"><h2 className="text-body font-bold">Команда</h2><button type="button" onClick={() => open("invite")} className="ml-auto flex h-9 items-center gap-1.5 rounded-full bg-[#ff6b00] px-3 text-caption font-semibold"><Plus size={16} />Добавить</button></div>
    {team.length === 0 && <p className="text-callout leading-5 text-white/45">Пока никого нет. Добавьте участника или отправьте приглашение.</p>}
    <div className="flex flex-col gap-5"><AnimatePresence mode="popLayout">{visible.map((m) => <MemberRow key={m.id} member={m} role={roles[m.id] ?? m.role} revealed={swipedId === m.id} onReveal={() => setSwipedId(m.id)} onClose={() => setSwipedId((current) => current === m.id ? null : current)} />)}</AnimatePresence></div>
  </div>;
}

function LiveBoard() {
  const setScreen = useEmbersStore((s) => s.setScreen);
  const open = useEmbersStore((s) => s.openSheet);
  const record = useEmbersStore(focusedEvent);
  const myStatus = record.myStatus;
  const event = record.details;
  return <div className="relative bg-black" data-node-id="2:598">
    <div className="relative flex min-h-[100cqh] flex-col justify-end gap-5 px-5 pb-[max(20px,env(safe-area-inset-bottom))] pt-[calc(96px+var(--chrome-shift))]">
      <div className="figma-gradient pointer-events-none absolute inset-0" />
      <div className="absolute left-5 top-(--chrome-top) z-30"><CircleButton onClick={() => setScreen("hub")} label="Назад"><Asset src="/figma-back.svg" /></CircleButton></div>
      <div className="absolute right-5 top-(--chrome-top) z-30 flex gap-2"><CircleButton label="Поделиться" onClick={() => { void shareInvite(event.title, record.code).then(shareResult); }}><Asset src="/figma-share.svg" /></CircleButton><button onClick={() => open("account")} aria-label="Аккаунт" className="grid h-11 w-11 place-items-center rounded-full bg-[#9c613d] text-callout font-semibold">ВФ</button></div>
      <div className="relative z-0 text-center"><h1 className="text-title font-extrabold tracking-tight">{event.title}</h1><p className="mt-2 text-caption text-white/85">{event.dateLabel} · {event.venue}</p></div>
      <div className="relative z-0"><Timeline /></div>
      <div className="relative z-0 flex h-[52px] items-center gap-5 rounded-[22px] bg-white/10 px-5"><span className="grid h-9 w-9 place-items-center rounded-full" style={{ background: `${statusMeta[myStatus].color}33` }}><MapPin size={18} style={{ color: statusMeta[myStatus].color }} /></span><div className="min-w-0 flex-1"><p className="text-caption text-white/45">Мой статус</p><p className="text-caption font-semibold">{statusMeta[myStatus].label}</p></div><button onClick={() => open("status")} className="h-9 rounded-full bg-[#ff6b00] px-4 text-caption font-semibold">Сменить</button></div>
    </div>
    <div className="relative z-0 flex flex-col gap-5 px-5 pb-[max(20px,env(safe-area-inset-bottom))]"><MapCard /><TeamList /></div>
  </div>;
}

function SheetHeader({ title, done = true, closeButton = true }: { title: string; done?: boolean; closeButton?: boolean }) {
  const close = useEmbersStore((s) => s.closeSheet);
  return <div className="relative flex h-[58px] items-center justify-center">{closeButton && <CircleButton onClick={close}><X size={20} /></CircleButton>}<h2 className="absolute inset-x-16 text-center text-body font-semibold">{title}</h2>{done && <div className="ml-auto"><CircleButton onClick={close} light><Check size={20} /></CircleButton></div>}</div>;
}

function QrScanner({ onCode }: { onCode: (code: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const setNotice = useEmbersStore((s) => s.setNotice);
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let stopped = false;
    let stream: MediaStream | undefined;
    let frame = 0;
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d", { willReadFrequently: true });
    const stop = () => {
      stopped = true;
      cancelAnimationFrame(frame);
      stream?.getTracks().forEach((track) => track.stop());
    };
    const tick = () => {
      if (stopped) return;
      if (!context || !video.videoWidth) {
        frame = requestAnimationFrame(tick);
        return;
      }
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0);
      const image = context.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(image.data, image.width, image.height)?.data.toUpperCase().match(/[A-Z0-9]{6}/)?.[0];
      if (code) {
        stop();
        onCode(code);
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } }).then((next) => {
      if (stopped) {
        next.getTracks().forEach((track) => track.stop());
        return;
      }
      stream = next;
      video.srcObject = next;
      void video.play();
      frame = requestAnimationFrame(tick);
    }).catch(() => setNotice("Нет доступа к камере"));
    return stop;
  }, [onCode, setNotice]);
  return <video ref={videoRef} muted playsInline className="h-52 w-full rounded-2xl bg-black object-cover" />;
}

function JoinSheet() {
  const code = useEmbersStore((s) => s.joinCode);
  const setCode = useEmbersStore((s) => s.setJoinCode);
  const [scanning, setScanning] = useState(false);
  const onCode = useCallback((value: string) => {
    useEmbersStore.getState().setJoinCode(value);
    useEmbersStore.getState().setNotice("Код найден");
    setScanning(false);
  }, []);
  const role = useEmbersStore((s) => s.joinRole);
  const setRole = useEmbersStore((s) => s.setJoinRole);
  const error = useEmbersStore((s) => s.joinError);
  const join = useEmbersStore((s) => s.joinByCode);
  const event = useEmbersStore((s) => s.events.find((item) => item.code === s.joinCode));
  const pasteLink = async () => {
    const text = await navigator.clipboard.readText().catch(() => "");
    const found = text.toUpperCase().match(/[A-Z0-9]{6}/);
    if (found) setCode(found[0]);
  };
  return <div data-node-id="2:273"><SheetHeader title="Присоединиться" /><p className="ml-5 mt-2 text-caption text-white/50">КОД ПРИГЛАШЕНИЯ</p>
    <div className="relative mt-2">
      <input aria-label="Код приглашения" value={code} onChange={(e) => setCode(e.target.value)} className="absolute inset-0 z-10 opacity-0" />
      <div className="grid grid-cols-6 gap-2">{Array.from({ length: 6 }).map((_, i) => <div key={i} className={cn("grid h-[62px] place-items-center rounded-[14px] bg-[#2c2c2e] text-title font-semibold tabular", i === code.length && "border-2 border-[#ff6b00]")}>{code[i] ?? ""}</div>)}</div>
    </div>
    <p className={cn("ml-5 mt-2 text-caption", error ? "text-red-400" : "text-white/50")}>{error || "Код есть в приглашении от организатора"}</p>
    <div className="mt-4 overflow-hidden rounded-[20px] bg-[#2c2c2e]"><button onClick={pasteLink} className="flex h-[52px] w-full items-center gap-3 px-4 text-body"><Asset src="/figma-link.svg" className="h-[22px] w-[22px]" />Вставить ссылку<ChevronRight className="ml-auto text-white/40" size={18} /></button><button onClick={() => setScanning((value) => !value)} className="flex h-[52px] w-full items-center gap-3 border-t border-white/15 px-4 text-body"><Asset src="/figma-qr.svg" className="h-[22px] w-[22px]" />{scanning ? "Закрыть камеру" : "Сканировать QR-код"}<ChevronRight className="ml-auto text-white/40" size={18} /></button></div>
    {scanning && <div className="mt-3 overflow-hidden rounded-[20px]"><QrScanner onCode={onCode} /></div>}
    <p className="ml-5 mt-5 text-caption text-white/50">ПРЕДПРОСМОТР</p>
    <div className="mt-2 rounded-[20px] bg-[#2c2c2e] p-4"><div className="flex items-center gap-3"><span className="h-14 w-14 rounded-[14px] bg-gradient-to-b from-[#ff8a1f] via-[#d2321c] to-[#3b0b22]" /><div><b className="text-body">{event ? event.details.title : "Код ещё не совпал"}</b><p className="text-caption text-white/50">{event ? `Пригласил Вадим Филатов · ${event.team.length} в команде` : "Введите код события"}</p></div></div><div className="my-4 h-px bg-white/15" /><b className="text-callout">Выберите свою роль</b><div className="mt-3 flex flex-wrap gap-2">{["Свет","Звук","Видео","Фото","Продюсер","Площадка","Техник"].map((item) => <button key={item} onClick={() => setRole(item)} className={cn("h-9 rounded-full px-3.5 text-callout", role === item ? "bg-[#ff6b00]" : "bg-white/10")}>{item}</button>)}</div></div>
    <button onClick={() => join()} className="mt-[98px] h-[54px] w-full rounded-full bg-[#ff6b00] text-body font-semibold">Присоединиться</button>
  </div>;
}

function DateSheet() {
  const draft = useEmbersStore((s) => s.draftEvent?.details ?? blankDraft);
  const toggleAllDay = useEmbersStore((s) => s.toggleAllDay);
  const updateDraft = useEmbersStore((s) => s.updateDraft);
  const [zonesOpen, setZonesOpen] = useState(false);
  const setDate = (date: string) => { if (date) updateDraft({ date, dateLabel: formatDateLabel(date) }); };
  return <div data-node-id="2:407"><SheetHeader title="Дата и время" /><div className="mt-2 overflow-hidden rounded-[20px] bg-[#2c2c2e]"><button onClick={toggleAllDay} className="flex h-[52px] w-full items-center px-4 text-body">Весь день<span className={cn("ml-auto h-[31px] w-[51px] rounded-full p-0.5", draft.allDay ? "bg-[#34c759]" : "bg-[#39393d]")}><i className={cn("block h-[27px] w-[27px] rounded-full bg-white transition-transform", draft.allDay && "translate-x-5")} /></span></button><div className="flex h-[52px] items-center border-t border-white/15 px-4 text-body">Дата<input type="date" value={draft.date} onChange={(e) => setDate(e.target.value)} className="ml-auto rounded-lg bg-white/10 px-2.5 py-1.5 outline-none [color-scheme:dark]" /></div>{!draft.allDay && <div className="flex h-[52px] items-center border-t border-white/15 px-4 text-body">Начало<input type="time" value={draft.time} onChange={(e) => e.target.value && updateDraft({ time: e.target.value })} className="ml-auto rounded-lg bg-white/10 px-2.5 py-1.5 tabular outline-none [color-scheme:dark]" /></div>}<div className="flex h-[52px] items-center border-t border-white/15 px-4 text-body">{draft.endTime ? <>Окончание<input type="time" value={draft.endTime} onChange={(e) => updateDraft({ endTime: e.target.value })} className="ml-auto rounded-lg bg-white/10 px-2.5 py-1.5 tabular outline-none [color-scheme:dark]" /><button onClick={() => updateDraft({ endTime: "" })} className="ml-3 text-callout text-white/50">Убрать</button></> : <button onClick={() => updateDraft({ endTime: "23:00" })} className="w-full text-left">Добавить время окончания</button>}</div></div><button onClick={() => setZonesOpen((value) => !value)} className="mt-4 flex h-[52px] w-full items-center rounded-[20px] bg-[#2c2c2e] px-4 text-body">Часовой пояс<span className="ml-auto text-white/50">{draft.timezone}</span><ChevronRight size={18} className={cn("ml-2 text-white/40", zonesOpen && "rotate-90")} /></button>{zonesOpen && <div className="mt-2 overflow-hidden rounded-[20px] bg-[#2c2c2e]">{timezones.map((zone) => <button key={zone} onClick={() => { updateDraft({ timezone: zone }); setZonesOpen(false); }} className="flex h-12 w-full items-center border-t border-white/10 px-4 text-left first:border-t-0">{zone}{draft.timezone === zone && <Check size={16} className="ml-auto text-[#ff6b00]" />}</button>)}</div>}<p className="mt-3 px-4 text-caption leading-4 text-white/50">Время начала увидит вся команда. Тайминг программы<br />подстроится под эту дату автоматически.</p></div>;
}

type MapPlace = { id: string; name: string; address: string; lat: number; lng: number };
const knownPlaces: MapPlace[] = [
  { id: "vdnh", name: "ВДНХ, павильон 57", address: "Проспект Мира, 119с57", lat: 55.8304, lng: 37.6326 },
  { id: "gorky", name: "Парк Горького", address: "Крымский Вал, 9", lat: 55.7312, lng: 37.6034 },
  { id: "mosfilm", name: "Мосфильм, павильон 3", address: "Мосфильмовская ул., 1", lat: 55.7234, lng: 37.529 },
];

function LocationSheet() {
  const draft = useEmbersStore((s) => s.draftEvent?.details ?? blankDraft);
  const updateDraft = useEmbersStore((s) => s.updateDraft);
  const setNotice = useEmbersStore((s) => s.setNotice);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MapPlace[]>([]);
  useEffect(() => {
    const q = query.trim();
    if (q.length < 3) { setResults([]); return; }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(q)}&limit=5&accept-language=ru`, { signal: controller.signal })
        .then((response) => response.json())
        .then((rows: Array<{ place_id: number; display_name: string; lat: string; lon: string; name?: string }>) => {
          setResults(rows.map((row) => {
            const parts = row.display_name.split(",").map((part) => part.trim());
            return { id: String(row.place_id), name: parts.slice(0, 2).join(", "), address: parts.slice(2).join(", ") || row.display_name, lat: Number(row.lat), lng: Number(row.lon) };
          }));
        })
        .catch(() => undefined);
    }, 350);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query]);
  const choose = (place: MapPlace) => updateDraft({ venue: place.address.startsWith(place.name) ? place.address : `${place.name}, ${place.address}`, lat: place.lat, lng: place.lng });
  const useCurrent = () => {
    if (!navigator.geolocation) { setNotice("Геолокация недоступна"); return; }
    navigator.geolocation.getCurrentPosition(async (position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      let venue = "Текущее местоположение";
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=ru`);
        const data = await response.json() as { display_name?: string };
        if (data.display_name) venue = data.display_name;
      } catch { /* адрес останется общим, координаты уже есть */ }
      updateDraft({ venue, lat, lng });
    }, () => setNotice("Разрешите доступ к геопозиции"));
  };
  const typed = query.trim().toLowerCase();
  const local = typed ? knownPlaces.filter((place) => `${place.name} ${place.address}`.toLowerCase().includes(typed)) : [];
  const suggestions = results.length ? results : local;
  return <div data-node-id="2:448">
    <SheetHeader title="Локация" />
    <div className="mt-1 flex h-11 items-center gap-2 rounded-full bg-[#2c2c2e] px-3.5 text-[#8e8e93]">
      <Search size={18} />
      <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Поиск локации" className="w-full bg-transparent text-body text-white outline-none placeholder:text-[#8e8e93]" />
      <button type="button" aria-label="Голосовой поиск" onClick={() => { if (!startDictation(setQuery)) setNotice("Голосовой поиск недоступен в этом браузере"); }} className="text-white"><Mic size={18} /></button>
    </div>
    <p className="mb-2 ml-4 mt-6 text-caption text-white/45">Подсказки</p>
    <div className="overflow-hidden rounded-[22px] bg-[#2c2c2e]">
      <button onClick={useCurrent} className="flex h-[64px] w-full items-center gap-3 px-4 text-left"><span className="grid h-9 w-9 place-items-center rounded-full bg-[#0A84FF]"><Navigation size={18} /></span><span className="text-body">Текущее местоположение</span></button>
      {suggestions.map((place) => <button key={place.id} onClick={() => choose(place)} className="flex h-[64px] w-full items-center gap-3 border-t border-white/10 px-4 text-left"><span className="grid h-9 w-9 place-items-center rounded-full bg-white/15"><MapPin size={18} /></span><span className="min-w-0 flex-1"><b className="block truncate text-body font-normal">{place.name}</b><small className="block truncate text-caption text-white/45">{place.address}</small></span>{draft.lat === place.lat && draft.lng === place.lng && <Check size={18} className="text-[#0A84FF]" />}</button>)}
    </div>
    <p className="mb-2 ml-4 mt-6 text-caption text-white/45">Название места</p>
    <input value={draft.zone} onChange={(e) => updateDraft({ zone: e.target.value })} placeholder="Например, дом Вадима Филатова" className="h-12 w-full rounded-2xl bg-[#2c2c2e] px-4 text-body outline-none placeholder:text-[#8e8e93]" />
    <p className="mt-2 px-4 text-caption text-white/40">Необязательно. Будет видно в приглашении.</p>
  </div>;
}

const roleSuggestions = ["Свет", "Звук", "Видео", "Фото", "Продюсер", "Площадка", "Техник"];

function InviteSheet() {
  const record = useEmbersStore(focusedEvent);
  const event = record.details;
  const team = record.team;
  const openRoles = record.openRoles;
  const addOpenRole = useEmbersStore((s) => s.addOpenRole);
  const addTeamMember = useEmbersStore((s) => s.addTeamMember);
  const openSchedule = useEmbersStore((s) => s.openSchedule);
  const roles = record.memberRoles;
  const [adding, setAdding] = useState(false);
  const [roleName, setRoleName] = useState("");
  const [addingPerson, setAddingPerson] = useState(team.length === 0);
  const [personName, setPersonName] = useState("");
  const [personRole, setPersonRole] = useState("");
  const saveRole = () => {
    if (!roleName.trim()) return;
    addOpenRole(roleName);
    setRoleName("");
    setAdding(false);
  };
  const savePerson = () => {
    if (personName.trim().length < 2) {
      addTeamMember(personName, personRole);
      return;
    }
    addTeamMember(personName, personRole);
    setPersonName("");
    setPersonRole("");
    setAddingPerson(false);
  };
  return <div data-node-id="2:511">
    <SheetHeader title="Команда" />
    <div className="mt-2 flex h-[150px] items-center gap-4 rounded-[20px] bg-[#2c2c2e] p-4"><span className="grid h-24 w-24 place-items-center rounded-2xl bg-white"><Asset src="/figma-qr-large.svg" className="h-[76px] w-[76px]" /></span><div><b className="text-body">Пригласите команду</b><p className="text-callout text-[#ff6b00]">embers.app/j/{record.code}</p><p className="text-caption text-white/50">Код: {record.code}</p><button onClick={() => { void shareInvite(event.title || "Событие", record.code).then(shareResult); }} className="mt-3 flex h-9 items-center gap-2 rounded-full bg-[#ff6b00] px-3.5 text-callout font-semibold"><Share2 size={16} />Поделиться</button></div></div>
    <p className="ml-5 mt-5 text-caption text-white/50">УЧАСТНИКИ · {team.length + 1 + openRoles.length}</p>
    <div className="mt-2 overflow-hidden rounded-[20px] bg-[#2c2c2e]">
      <button onClick={() => openSchedule("vadim")} className="flex h-[60px] w-full items-center gap-3 px-4 text-left"><span className="grid h-10 w-10 place-items-center rounded-full bg-[#ff6b00]">ВФ</span><div className="flex-1"><p>Вадим Филатов <Crown size={13} className="inline text-[#ff6b00]" /></p><small className="text-white/50">{roles.vadim}</small></div><ChevronRight size={18} className="text-white/40" /></button>
      {team.map((m) => <button key={m.id} onClick={() => openSchedule(m.id)} className="ml-4 flex h-[60px] w-[calc(100%-1rem)] items-center gap-3 border-t border-white/15 pr-4 text-left"><Avatar member={m} size={40} /><div className="flex-1"><p>{m.name}</p><small className="text-white/50">{roles[m.id] ?? m.role}</small></div><ChevronRight size={18} className="text-white/40" /></button>)}
      {openRoles.map((role) => <div key={role} className="ml-4 flex h-[60px] items-center gap-3 border-t border-white/15 pr-4"><span className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-caption">+</span><div><p>{role}</p><small className="text-white/50">Свободная роль</small></div></div>)}
      {addingPerson ? <div className="border-t border-white/15 px-4 py-3">
        <input value={personName} onChange={(event) => setPersonName(event.target.value)} onKeyDown={(event) => event.key === "Enter" && savePerson()} placeholder="Имя" className="h-11 w-full bg-transparent text-body outline-none placeholder:text-white/40" />
        <input value={personRole} onChange={(event) => setPersonRole(event.target.value)} onKeyDown={(event) => event.key === "Enter" && savePerson()} placeholder="Роль" className="h-11 w-full border-t border-white/10 bg-transparent text-body outline-none placeholder:text-white/40" />
        <div className="mt-2 flex flex-wrap gap-2">{roleSuggestions.map((item) => <button key={item} type="button" onClick={() => setPersonRole(item)} className={cn("h-8 rounded-full px-3 text-caption", personRole === item ? "bg-[#ff6b00]" : "bg-white/10")}>{item}</button>)}</div>
        <button type="button" onClick={savePerson} className="mt-3 h-10 rounded-full bg-[#ff6b00] px-4 text-callout font-semibold">Добавить</button>
      </div> : <button onClick={() => setAddingPerson(true)} className="ml-4 flex h-[56px] w-[calc(100%-1rem)] items-center gap-3 border-t border-white/15 text-[#ff6b00]"><span className="grid h-10 w-10 place-items-center rounded-full bg-orange-500/15"><Plus /></span>Добавить участника</button>}
      {adding ? <div className="ml-4 flex h-[56px] items-center gap-2 border-t border-white/15 pr-4"><input value={roleName} onChange={(e) => setRoleName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && saveRole()} placeholder="Название роли" className="h-10 flex-1 bg-transparent text-body outline-none placeholder:text-white/40" /><button onClick={saveRole} className="h-9 rounded-full bg-[#ff6b00] px-3 text-callout font-semibold">Добавить</button></div> : <button onClick={() => setAdding(true)} className="ml-4 flex h-[56px] w-[calc(100%-1rem)] items-center gap-3 border-t border-white/15 text-[#ff6b00]"><span className="grid h-10 w-10 place-items-center rounded-full bg-orange-500/15"><Plus /></span>Добавить роль</button>}
    </div>
  </div>;
}

function MemberSheet() {
  const id = useEmbersStore((s) => s.selectedMemberId);
  const record = useEmbersStore(focusedEvent);
  const event = record.details;
  const close = useEmbersStore((s) => s.closeSheet);
  const roles = record.memberRoles;
  const member = record.team.find((m) => m.id === id);
  if (!member) return null;
  const role = roles[member.id] ?? member.role;
  const roleLine = role === member.role && member.roleLong ? `${role} · ${member.roleLong.toLowerCase()}` : role;
  const now = member.currentTask.split(" · ");
  const next = member.next.split(" · ");
  const rows = [["Где", `${member.spot} · ${event.venue}`], [now[1] ? `Сейчас · ${now[1]}` : "Сейчас", now[0]], [next.length > 1 ? `Дальше · ${next[0]}` : "Дальше", next.at(-1) ?? member.next]];
  const missingPhone = () => useEmbersStore.getState().setNotice("Номер не указан");
  return <div data-node-id="2:890"><div className="flex h-11"><CircleButton onClick={close}><X size={20} /></CircleButton></div><div className="flex flex-col items-center"><Avatar member={member} size={88} /><h2 className="mt-3 text-title font-bold">{member.name}</h2><p className="text-callout text-white/50">{roleLine}</p><div className="mt-2"><StatusPill status={member.status} /></div></div><div className="mt-5 grid grid-cols-3 gap-4">{member.phone ? <a href={`tel:${member.phone}`} className="flex h-16 flex-col items-center justify-center gap-1 rounded-2xl bg-[#2c2c2e] text-caption font-medium text-[#ff6b00]"><Phone size={21} />Позвонить</a> : <button onClick={missingPhone} className="flex h-16 flex-col items-center justify-center gap-1 rounded-2xl bg-[#2c2c2e] text-caption font-medium text-[#ff6b00]"><Phone size={21} />Позвонить</button>}{member.phone ? <a href={`sms:${member.phone}`} className="flex h-16 flex-col items-center justify-center gap-1 rounded-2xl bg-[#2c2c2e] text-caption font-medium text-[#ff6b00]"><Sparkles size={21} />Написать</a> : <button onClick={missingPhone} className="flex h-16 flex-col items-center justify-center gap-1 rounded-2xl bg-[#2c2c2e] text-caption font-medium text-[#ff6b00]"><Sparkles size={21} />Написать</button>}<button onClick={close} className="flex h-16 flex-col items-center justify-center gap-1 rounded-2xl bg-[#2c2c2e] text-caption font-medium text-[#ff6b00]"><MapPin size={21} />На карте</button></div><div className="mt-4 overflow-hidden rounded-[20px] bg-[#2c2c2e] px-4">{rows.map(([label, value], i) => <div key={label} className={cn("flex h-16 flex-col justify-center pl-9", i > 0 && "border-t border-white/15")}><small className="text-white/50">{label}</small><span className="text-body">{value}</span></div>)}</div><p className="ml-5 mt-4 text-caption text-white/50">ДЕНЬ {member.name.split(" ")[0].toUpperCase()}</p><div className="mt-2 rounded-[20px] bg-[#2c2c2e] p-4"><div className="relative flex gap-[3px]">{["w-[12%] bg-[#636366]","w-[22%] bg-[#5e5ce6]","w-[9%] bg-[#ffd60a]","w-[28%] bg-[#30d158]","w-[12%] bg-[#ff6b00]","flex-1 bg-[#5e5ce6]"].map((c,i) => <i key={i} className={cn("h-3 rounded",c)} />)}<b className="absolute left-[55%] -top-1.5 h-6 w-0.5 bg-white" /></div><div className="mt-3 flex justify-between text-caption text-white/50"><span>08</span><span>12</span><span>16</span><span>20</span><span>23</span></div></div></div>;
}

function StatusSheet() {
  const record = useEmbersStore(focusedEvent);
  const current = record.myStatus;
  const update = useEmbersStore((s) => s.updateMyStatus);
  const share = record.shareLocation;
  const toggle = useEmbersStore((s) => s.toggleShareLocation);
  const requestShare = () => {
    if (share) { toggle(); return; }
    if (!navigator.geolocation) { useEmbersStore.getState().setNotice("Геолокация недоступна"); return; }
    navigator.geolocation.getCurrentPosition(() => toggle(), () => useEmbersStore.getState().setNotice("Разрешите доступ к геопозиции"));
  };
  const items: Array<[Status,string,string,React.ReactNode]> = [["on_site","На площадке","Я на месте",<MapPin key="p" />],["in_transit","В пути","Еду, отмечу время в пути",<Navigation key="n" />],["ready","Готов","Можно начинать",<Check key="c" />],["gathering","Сбор","Собираю команду",<Users key="u" />]];
  return <div data-node-id="2:960"><SheetHeader title="Мой статус" /><div className="mt-2 grid grid-cols-2 gap-4">{items.map(([id,label,sub,icon]) => <button key={id} onClick={() => update(id)} className={cn("relative flex h-[150px] flex-col items-start rounded-[24px] border-2 bg-[#2c2c2e] p-4 text-left", current===id ? "border-[#30d158]" : "border-transparent")}><span style={{ color: statusMeta[id].color, background: `${statusMeta[id].color}32` }} className="grid h-[52px] w-[52px] place-items-center rounded-full">{icon}</span><b className="mt-4 text-body">{label}</b><small className="text-caption text-white/50">{sub}</small>{current===id && <span className="absolute right-4 top-4 grid h-6 w-6 place-items-center rounded-full bg-[#30d158] text-black"><Check size={15} /></span>}</button>)}</div><button onClick={requestShare} className="mt-5 flex h-[52px] w-full items-center rounded-[20px] bg-[#2c2c2e] px-4 text-body">Делиться геопозицией<span className={cn("ml-auto h-[31px] w-[51px] rounded-full p-0.5",share?"bg-[#34c759]":"bg-[#39393d]")}><i className={cn("block h-[27px] w-[27px] rounded-full bg-white transition-transform",share&&"translate-x-5")} /></span></button><p className="mt-3 px-4 text-caption text-white/50">Команда увидит ваш статус и точку на карте</p></div>;
}

function RoleChip({ role, onSave }: { role: string; onSave: (role: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(role);
  const inputRef = useRef<HTMLInputElement>(null);
  const skipSave = useRef(false);
  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);
  const commit = () => {
    if (skipSave.current) { skipSave.current = false; setEditing(false); return; }
    const next = value.trim();
    if (next) onSave(next);
    setEditing(false);
  };
  if (editing) return <form onSubmit={(event) => { event.preventDefault(); commit(); }} className="flex h-9 max-w-full items-center gap-2 rounded-full bg-[#2c2c2e] pl-3.5 pr-2.5">
    <input ref={inputRef} aria-label="Роль" value={value} onChange={(event) => setValue(event.target.value)} onBlur={commit} onKeyDown={(event) => { if (event.key === "Escape") { skipSave.current = true; inputRef.current?.blur(); } }} placeholder="Роль" className="min-w-16 max-w-[220px] bg-transparent text-callout text-white outline-none [field-sizing:content]" />
    <Pencil size={14} className="shrink-0 text-white/55" />
  </form>;
  return <button type="button" onClick={() => { setValue(role); setEditing(true); }} className="flex h-9 max-w-full items-center gap-2 rounded-full bg-[#2c2c2e] pl-3.5 pr-2.5 text-callout text-white/85">
    <span className="truncate">{role}</span><Pencil size={14} className="shrink-0 text-white/55" />
  </button>;
}

function splitRange(time: string) {
  const [start = "18:00", end = "19:30"] = time.split(/\s*[–—-]\s*/);
  return { start: /^\d{2}:\d{2}$/.test(start) ? start : "18:00", end: /^\d{2}:\d{2}$/.test(end) ? end : "19:30" };
}

function ScheduleBlockCard({ block, onRemove, onChange, onDragStart }: { block: ScheduleBlock; onRemove: () => void; onChange: (patch: { task?: string; time?: string }) => void; onDragStart: (event: React.PointerEvent<HTMLDivElement>) => void }) {
  const [taskEdit, setTaskEdit] = useState(false);
  const [timeEdit, setTimeEdit] = useState(false);
  const [task, setTask] = useState(block.task);
  const range = splitRange(block.time);
  const [start, setStart] = useState(range.start);
  const [end, setEnd] = useState(range.end);
  const taskRef = useRef<HTMLTextAreaElement>(null);
  const startRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLInputElement>(null);
  const skipTask = useRef(false);
  useEffect(() => { if (taskEdit) taskRef.current?.focus(); }, [taskEdit]);
  useEffect(() => { if (timeEdit) startRef.current?.focus(); }, [timeEdit]);
  useEffect(() => {
    const field = taskRef.current;
    if (!field) return;
    field.style.height = "0px";
    field.style.height = `${field.scrollHeight}px`;
  }, [task, taskEdit]);
  const commitTask = () => {
    if (skipTask.current) { skipTask.current = false; setTaskEdit(false); return; }
    const next = task.trim();
    if (next) onChange({ task: next });
    else setTask(block.task);
    setTaskEdit(false);
  };
  const commitTime = () => {
    const from = startRef.current?.value || start;
    const to = endRef.current?.value || end;
    const [begin, finish] = from <= to ? [from, to] : [to, from];
    onChange({ time: `${begin} – ${finish}` });
    setTimeEdit(false);
  };
  return <div className="relative rounded-[28px] bg-[#2c2c2e] p-4 shadow-[0_10px_30px_rgba(0,0,0,.18)]">
    <div role="button" aria-label={`Переместить ${block.location}`} onPointerDown={onDragStart} className="flex cursor-grab touch-none items-center gap-2 active:cursor-grabbing"><GripVertical size={18} className="shrink-0 text-white/35" /><span style={{ background: block.color }} className="grid h-6 w-6 place-items-center rounded-md"><Camera size={15} /></span><b className="text-body">{block.location}</b><button aria-label="Удалить локацию" onPointerDown={(event) => event.stopPropagation()} onClick={onRemove} className="ml-auto grid h-6 w-6 place-items-center rounded-full bg-[#636366]"><X size={14} /></button></div>
    <p className="mt-3 text-body">« {taskEdit ? <textarea ref={taskRef} aria-label="Задача" value={task} rows={1} onChange={(event) => setTask(event.target.value)} onBlur={commitTask} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); commitTask(); } if (event.key === "Escape") { skipTask.current = true; setTask(block.task); taskRef.current?.blur(); } }} placeholder="Что делает на этой локации" className="inline-block w-[calc(100%-2rem)] resize-none rounded-lg bg-[#ff6b0038] px-2 py-1 text-[#ff6b00] outline-none" /> : <button type="button" onClick={() => { setTask(block.task); setTaskEdit(true); }} className="rounded-lg bg-[#ff6b0038] px-2 py-1 text-left text-[#ff6b00]">{block.task}</button>} »</p>
    <p className="mt-3 text-body">с {timeEdit ? <span className="inline-flex items-center gap-1 rounded-lg bg-[#ff6b0038] px-2 py-1 text-[#ff6b00]" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) commitTime(); }}>
      <input ref={startRef} aria-label="Начало" type="time" step={60} value={start} onChange={(event) => setStart(event.target.value)} className="bg-transparent tabular outline-none [color-scheme:dark]" />
      <span>–</span>
      <input ref={endRef} aria-label="Конец" type="time" step={60} value={end} onChange={(event) => setEnd(event.target.value)} className="bg-transparent tabular outline-none [color-scheme:dark]" />
    </span> : <button type="button" onClick={() => { const next = splitRange(block.time); setStart(next.start); setEnd(next.end); setTimeEdit(true); }} className="rounded-lg bg-[#ff6b0038] px-2 py-1 tabular text-[#ff6b00]">{block.time}</button>}</p>
  </div>;
}

function TravelGap({ minutes, onSave }: { minutes: number; onSave: (minutes: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(minutes));
  const inputRef = useRef<HTMLInputElement>(null);
  const skip = useRef(false);
  useEffect(() => { if (editing) inputRef.current?.select(); }, [editing]);
  const commit = () => {
    if (skip.current) { skip.current = false; setEditing(false); return; }
    const next = Number.parseInt(value, 10);
    if (Number.isFinite(next) && next >= 0) onSave(next);
    setEditing(false);
  };
  return <div className="flex h-11 items-center justify-center text-caption text-[#8e8e93]"><Clock3 size={14} className="mr-1" />переход {editing ? <input ref={inputRef} aria-label="Время перехода" inputMode="numeric" value={value} onChange={(event) => setValue(event.target.value.replace(/\D/g, "").slice(0, 3))} onBlur={commit} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); commit(); } if (event.key === "Escape") { skip.current = true; setValue(String(minutes)); inputRef.current?.blur(); } }} className="mx-1 w-10 rounded-md bg-white/10 text-center tabular text-white outline-none" /> : <button type="button" onClick={() => { setValue(String(minutes)); setEditing(true); }} className="mx-1 rounded-md bg-white/10 px-1.5 tabular text-white">{minutes}</button>} мин</div>;
}

function ScheduleRow({ block, index, marked, onRemove, onChange, onTravel }: { block: ScheduleBlock; index: number; marked: boolean; onRemove: () => void; onChange: (patch: { task?: string; time?: string }) => void; onTravel: (minutes: number) => void }) {
  const controls = useDragControls();
  return <Reorder.Item as="div" value={block} dragListener={false} dragControls={controls} whileDrag={{ scale: 1.03, zIndex: 30, boxShadow: "0 18px 40px rgba(0,0,0,.45)" }} transition={spring} className="relative" data-schedule-id={block.id}>
    {marked && <div className="mb-2 h-0.5 rounded-full bg-[#ff6b00]" />}
    {index > 0 && <TravelGap minutes={block.travel ?? 10} onSave={onTravel} />}
    <ScheduleBlockCard block={block} onRemove={onRemove} onChange={onChange} onDragStart={(event) => controls.start(event)} />
  </Reorder.Item>;
}

function ScheduleScreen() {
  const memberId = useEmbersStore((s) => s.selectedMemberId);
  const record = useEmbersStore(focusedEvent);
  const blocks = record.schedules[memberId] ?? emptyBlocks;
  const role = record.memberRoles[memberId] ?? "Роль";
  const setRole = useEmbersStore((s) => s.setMemberRole);
  const add = useEmbersStore((s) => s.addScheduleBlock);
  const insert = useEmbersStore((s) => s.insertScheduleBlock);
  const reorder = useEmbersStore((s) => s.reorderScheduleBlocks);
  const remove = useEmbersStore((s) => s.removeScheduleBlock);
  const update = useEmbersStore((s) => s.updateScheduleBlock);
  const origin = useEmbersStore((s) => s.scheduleOrigin);
  const scheduleReturn = useEmbersStore((s) => s.scheduleReturn);
  const backToTeam = () => useEmbersStore.setState({ screen: scheduleReturn, sheet: origin === "invite" ? "invite" : null });
  const person = memberId === "vadim" ? { name: "Вадим Филатов" } : record.team.find((member) => member.id === memberId) ?? { name: "Участник" };
  const shortName = person.name.split(" ")[0];
  const possessive = ({ Вадим: "Вадима", Костя: "Кости", Кирилл: "Кирилла", Аня: "Ани", Маша: "Маши", Илья: "Ильи" } as Record<string, string>)[shortName] ?? shortName;
  const [category, setCategory] = useState("");
  const [locationName, setLocationName] = useState("");
  const [dragChip, setDragChip] = useState<{ name: string; color: string; icon?: string; x: number; y: number } | null>(null);
  const [dropIndex, setDropIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const screenRef = useRef<HTMLDivElement>(null);
  const suppressClick = useRef(false);
  const collapsed = 248;
  const maxHeight = useRef(560);
  const sheetHeight = useMotionValue(collapsed);
  const listPad = useTransform(sheetHeight, (value) => value + 32);
  const [expanded, setExpanded] = useState(false);
  const [blurBottom, setBlurBottom] = useState(0);
  const [wideScreen, setWideScreen] = useState(false);
  const configured = blocks.length > 0;
  const groups = useEmbersStore((s) => focusedEvent(s).locationGroups);
  const palette = category ? groups.find((group) => group.name === category)?.locations ?? [] : groups.flatMap((group) => group.locations);
  const addLocation = (name = locationName.trim()) => { if (!name) return; add(name); setLocationName(""); };
  const placeIndex = (clientY: number) => {
    const cards = [...(listRef.current?.querySelectorAll<HTMLElement>("[data-schedule-id]") ?? [])];
    const index = cards.findIndex((card) => clientY < card.getBoundingClientRect().top + card.getBoundingClientRect().height / 2);
    return index === -1 ? cards.length : index;
  };
  const beginChipDrag = (chip: { name: string; color: string; icon?: string }, event: React.PointerEvent<HTMLButtonElement>) => {
    const startX = event.clientX;
    const startY = event.clientY;
    const pointerId = event.pointerId;
    let dragging = false;
    const move = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      if (!dragging) {
        if (Math.hypot(dx, dy) < 10 || Math.abs(dx) > Math.abs(dy)) return;
        dragging = true;
        suppressClick.current = true;
      }
      setDragChip({ name: chip.name, color: chip.color, icon: chip.icon, x: ev.clientX, y: ev.clientY });
      setDropIndex(placeIndex(ev.clientY));
    };
    const up = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      if (!dragging) return;
      const sheetTop = sheetRef.current?.getBoundingClientRect().top ?? Number.POSITIVE_INFINITY;
      if (ev.clientY < sheetTop - 8) insert(chip.name, placeIndex(ev.clientY));
      setDragChip(null);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };
  useEffect(() => {
    const frame = screenRef.current;
    if (!frame) return;
    const measure = () => { maxHeight.current = Math.max(collapsed + 140, frame.clientHeight - 288); };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(frame);
    return () => observer.disconnect();
  }, [collapsed]);
  useEffect(() => {
    const query = window.matchMedia("(min-width: 520px)");
    const update = () => setWideScreen(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (!wideScreen) return;
    const frame = document.querySelector(".phone-frame");
    if (!frame) return;
    const update = () => setBlurBottom(Math.max(0, window.innerHeight - frame.getBoundingClientRect().bottom));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(frame);
    window.addEventListener("resize", update);
    return () => { observer.disconnect(); window.removeEventListener("resize", update); };
  }, [wideScreen]);
  const dragHandle = (event: React.PointerEvent<HTMLDivElement>) => {
    const pointerId = event.pointerId;
    const startY = event.clientY;
    const startH = sheetHeight.get();
    let lastY = startY;
    let lastT = performance.now();
    let velocity = 0;
    let moved = false;
    const move = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      const now = performance.now();
      const delta = startY - ev.clientY;
      if (Math.abs(delta) > 6) moved = true;
      velocity = (lastY - ev.clientY) / Math.max(now - lastT, 1);
      lastY = ev.clientY;
      lastT = now;
      sheetHeight.set(Math.min(maxHeight.current, Math.max(collapsed, startH + delta)));
    };
    const up = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      if (ev.pointerId !== pointerId) return;
      const open = !moved ? sheetHeight.get() < (collapsed + maxHeight.current) / 2 : velocity > 0.45 || (velocity > -0.45 && sheetHeight.get() > (collapsed + maxHeight.current) / 2);
      const target = open ? maxHeight.current : collapsed;
      animate(sheetHeight, target, { type: "spring", stiffness: 460, damping: 36, mass: 0.75 });
      setExpanded(open);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };
  return <div ref={screenRef} className="relative h-full overflow-hidden bg-black" data-node-id={configured ? "4:88" : "4:2"}>
    <button type="button" aria-label="Назад" onClick={backToTeam} className="absolute left-5 top-(--chrome-top) z-30 grid h-11 w-11 place-items-center rounded-full border border-white/10 bg-[#28282ae6]"><Asset src="/figma-schedule-back.svg" className="h-6 w-6" /></button>
    <div className="pointer-events-none absolute inset-x-[72px] top-(--chrome-top) z-30 flex h-11 items-center justify-center"><b className="truncate text-body">Расписание {person.name}</b></div>
    <div className="absolute left-1/2 top-[calc(96px+var(--chrome-shift))] z-30 w-max max-w-[calc(100%-40px)] -translate-x-1/2"><RoleChip key={memberId} role={role} onSave={(next) => setRole(memberId, next)} /></div>
    <motion.div ref={listRef} style={{ paddingBottom: listPad }} className="no-scrollbar absolute inset-x-5 top-[calc(148px+var(--chrome-shift))] bottom-0 overflow-y-auto overscroll-contain">
      {!configured && <p className={cn("px-1 text-center text-callout leading-5", dragChip ? "text-[#ff6b00]" : "text-[#8e8e93]")}>{dragChip ? "Отпустите, чтобы добавить локацию" : <>Чтобы составить расписание {possessive}, добавьте<br />локации из области внизу. Их можно перетаскивать.</>}</p>}
      {configured && <Reorder.Group as="div" axis="y" values={blocks} onReorder={reorder} className="relative pb-2">{blocks.map((b, i) => <ScheduleRow key={b.id} block={b} index={i} marked={Boolean(dragChip) && dropIndex === i} onRemove={() => remove(b.id)} onChange={(patch) => update(b.id, patch)} onTravel={(travel) => update(b.id, { travel })} />)}{dragChip && dropIndex === blocks.length && <div className="mt-2 h-0.5 rounded-full bg-[#ff6b00]" />}</Reorder.Group>}
    </motion.div>
    {wideScreen && typeof document !== "undefined" ? createPortal(<div aria-hidden style={{ bottom: blurBottom, height: collapsed / 2, WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, #000 100%)", maskImage: "linear-gradient(to bottom, transparent 0%, #000 100%)", WebkitBackdropFilter: "blur(24px)", backdropFilter: "blur(24px)" }} className="pointer-events-none fixed inset-x-0 z-10" />, document.body) : <div aria-hidden style={{ height: collapsed / 2, WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, #000 100%)", maskImage: "linear-gradient(to bottom, transparent 0%, #000 100%)", WebkitBackdropFilter: "blur(24px)", backdropFilter: "blur(24px)" }} className="pointer-events-none absolute inset-x-0 bottom-0 z-10" />}
    <motion.div ref={sheetRef} style={{ height: sheetHeight }} className="absolute inset-x-[21px] bottom-[max(20px,env(safe-area-inset-bottom))] z-20 flex flex-col overflow-hidden rounded-[34px] border border-white/10 bg-[#1e1e20] px-4 pb-4 shadow-[0_18px_48px_rgba(0,0,0,.55)]">
      <div role="button" aria-label={expanded ? "Свернуть список локаций" : "Раскрыть список локаций"} onPointerDown={dragHandle} className="flex h-7 shrink-0 cursor-grab touch-none items-center justify-center active:cursor-grabbing"><i className="h-[5px] w-[60px] rounded-full bg-[#6e6e73]" /></div>
      <div className="flex shrink-0 gap-2"><div className="flex h-11 flex-1 items-center gap-2 rounded-full bg-[#3a3a3e] px-3 text-[#8e8e93]"><MapPin size={20} /><input value={locationName} onChange={(e) => setLocationName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addLocation()} placeholder="Новая локация" className="w-full bg-transparent text-body text-white outline-none placeholder:text-[#8e8e93]" /></div><button onClick={() => addLocation()} className="grid h-11 w-11 place-items-center rounded-full bg-[#ff6b00]"><Plus size={24} /></button></div>
      <div className="no-scrollbar mt-3 flex shrink-0 gap-2 overflow-x-auto">{groups.map((group) => <button key={group.name} onClick={() => setCategory((item) => item === group.name ? "" : group.name)} className={cn("shrink-0 rounded-full px-4 py-2 text-callout font-medium", category === group.name ? "bg-[#ff6b00] text-white" : "bg-[#3a3a3e] text-[#ff6b00]")}>{group.name}</button>)}</div>
      {!configured && <p className="mt-3 shrink-0 text-caption font-semibold text-[#8e8e93]">СТАНДАРТНЫЕ ЛОКАЦИИ</p>}
      <div className={cn("mt-2 min-h-0 flex-1 space-y-2", expanded ? "overflow-y-auto" : "overflow-hidden")}>{palette.map((location) => <button onPointerDown={(event) => beginChipDrag(location, event)} onClick={() => { if (suppressClick.current) { suppressClick.current = false; return; } add(location.name); }} key={location.id} className={cn("flex h-12 w-full items-center gap-3 rounded-full bg-[#2c2c2e] px-3 text-body", dragChip?.name === location.name && "opacity-40")}><LocationMark icon={location.icon} color={location.color} />{location.name}{!configured && <Info size={20} className="ml-auto text-white/50" />}</button>)}</div>
    </motion.div>
    {dragChip && <div className="pointer-events-none fixed z-[80] flex h-12 items-center gap-3 rounded-full bg-[#3a3a3e] px-3 text-body shadow-2xl" style={{ left: dragChip.x, top: dragChip.y, transform: "translate(-50%, -60%) scale(1.04)" }}><LocationMark icon={dragChip.icon} color={dragChip.color} />{dragChip.name}</div>}
  </div>;
}

function FilesSheet() {
  const files = useEmbersStore((s) => focusedEvent(s).programFiles);
  const addFile = useEmbersStore((s) => s.addProgramFile);
  const removeFile = useEmbersStore((s) => s.removeProgramFile);
  const inputRef = useRef<HTMLInputElement>(null);
  const formatSize = (size: number) => size < 1024 * 1024 ? `${Math.max(1, Math.round(size / 1024))} КБ` : `${(size / 1024 / 1024).toFixed(1)} МБ`;
  const pick = (list: FileList | null) => {
    const picked = [...(list ?? [])];
    const pdfs = picked.filter((file) => file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf"));
    if (picked.length && !pdfs.length) useEmbersStore.getState().setNotice("Можно добавить только PDF");
    pdfs.forEach((file) => addFile({ id: `${file.name}-${file.size}-${Date.now()}`, name: file.name, size: file.size, url: URL.createObjectURL(file) }));
    if (inputRef.current) inputRef.current.value = "";
  };
  return <div>
    <SheetHeader title="Программа" done={false} closeButton={false} />
    <p className="mt-1 px-1 text-caption leading-5 text-white/50">Проходки на концерт, инструкции и любые другие PDF для команды.</p>
    <input ref={inputRef} type="file" accept="application/pdf,.pdf" multiple className="hidden" onChange={(e) => pick(e.target.files)} />
    <button onClick={() => inputRef.current?.click()} className="mt-4 flex h-[54px] w-full items-center justify-center gap-2 rounded-full bg-[#ff6b00] text-body font-semibold"><Plus size={18} />Добавить PDF</button>
    <div className="mt-4 overflow-hidden rounded-[20px] bg-[#2c2c2e]">
      {files.length === 0 && <p className="px-4 py-6 text-center text-callout text-white/45">Пока нет файлов</p>}
      {files.map((file, index) => <div key={file.id} className={cn("flex items-center gap-3 px-4 py-3", index > 0 && "border-t border-white/10")}>
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#ff6b00]/20 text-[#ff6b00]"><FileText size={18} /></span>
        <a href={file.url} target="_blank" rel="noreferrer" className="min-w-0 flex-1"><b className="block truncate text-body">{file.name}</b><small className="text-white/45">{formatSize(file.size)}</small></a>
        <button aria-label="Удалить файл" onClick={() => removeFile(file.id)} className="grid h-8 w-8 place-items-center rounded-full bg-white/10"><X size={14} /></button>
      </div>)}
    </div>
  </div>;
}

const accountEmail = "troble.gaming2001@icloud.com";

function SettingsSwitch({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return <button type="button" role="switch" aria-checked={on} onClick={onToggle} className={cn("h-[31px] w-[51px] rounded-full p-0.5", on ? "bg-[#34c759]" : "bg-[#39393d]")}><i className={cn("block h-[27px] w-[27px] rounded-full bg-white transition-transform", on && "translate-x-5")} /></button>;
}

function GroupPill({ name, selected, revealed, rowRef, onSelect, onOpen, onClose, onDelete }: { name: string; selected: boolean; revealed: boolean; rowRef: React.RefObject<HTMLDivElement | null>; onSelect: () => void; onOpen: () => void; onClose: () => void; onDelete: () => void }) {
  const x = useMotionValue(0);
  const trashSize = 36;
  const gap = 6;
  const action = trashSize + gap;
  const settle = { type: "spring" as const, stiffness: 460, damping: 34, mass: 0.62 };
  const progress = useTransform(x, [-action, 0], [1, 0]);
  const slot = useTransform(progress, (value) => value * trashSize);
  const gapPx = useTransform(progress, (value) => value * gap);
  const trashOpacity = useTransform(progress, [0, 0.35, 1], [0, 0.55, 1]);
  const trashScale = useTransform(progress, [0, 1], [0.55, 1]);
  const trashRotate = useTransform(progress, [0, 1], [-16, 0]);
  const wrapRef = useRef<HTMLDivElement>(null);
  const moved = useRef(false);
  const keepTrashVisible = () => {
    const row = rowRef.current;
    const wrap = wrapRef.current;
    if (!row || !wrap) return;
    const rowBox = row.getBoundingClientRect();
    const box = wrap.getBoundingClientRect();
    if (box.right > rowBox.right - 4) row.scrollLeft += box.right - rowBox.right + 8;
  };
  useEffect(() => {
    const animation = animate(x, revealed ? -action : 0, { ...settle, onUpdate: () => { if (revealed) keepTrashVisible(); } });
    return () => animation.stop();
  }, [revealed, rowRef, x]);
  const onTextPointerDown = (event: React.PointerEvent<HTMLSpanElement>) => {
    if (event.button !== 0) return;
    event.stopPropagation();
    const pointerId = event.pointerId;
    const startX = event.clientX;
    const startY = event.clientY;
    const origin = x.get();
    let mode: "undecided" | "swipe" | "ignore" = "undecided";
    const move = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      if (mode === "undecided") {
        if (Math.hypot(dx, dy) < 8) return;
        if (Math.abs(dy) > Math.abs(dx)) { mode = "ignore"; return; }
        mode = "swipe";
      }
      if (mode !== "swipe") return;
      const raw = origin + dx;
      const next = raw < -action ? -action + (raw + action) * 0.22 : Math.min(0, raw);
      moved.current = Math.abs(dx) > 6;
      x.set(next);
      keepTrashVisible();
    };
    const up = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      if (ev.pointerId !== pointerId || mode !== "swipe") return;
      const shouldOpen = x.get() < -action * 0.4;
      if (shouldOpen) onOpen();
      else onClose();
      if (shouldOpen === revealed) void animate(x, shouldOpen ? -action : 0, settle);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };
  const onBubblePointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0 || event.target !== event.currentTarget || event.pointerType === "touch") return;
    const pointerId = event.pointerId;
    const startX = event.clientX;
    const row = rowRef.current;
    const startScroll = row?.scrollLeft ?? 0;
    let dragged = false;
    const move = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId || !row) return;
      const dx = ev.clientX - startX;
      if (Math.abs(dx) > 4) dragged = true;
      row.scrollLeft = startScroll - dx;
    };
    const up = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      if (ev.pointerId === pointerId && dragged) moved.current = true;
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };
  return <motion.div ref={wrapRef} className="flex h-11 shrink-0 items-center">
    <motion.button type="button" data-selected={selected ? "true" : undefined} onPointerDown={onBubblePointerDown} onClick={() => { if (moved.current) { moved.current = false; return; } if (revealed) onClose(); else onSelect(); }} whileTap={{ scale: 0.96 }} transition={spring} className={cn("relative z-10 h-11 touch-pan-x rounded-full px-4 text-callout font-medium select-none", selected ? "bg-[#ff6b00] text-white" : "bg-[#3a3a3e] text-[#ff6b00]")}><span data-swipe="" onPointerDown={onTextPointerDown} className="inline-flex h-full touch-none items-center">{name}</span></motion.button>
    <motion.div style={{ width: slot, marginLeft: gapPx, minWidth: 0 }} className="flex h-11 items-center justify-center overflow-hidden">
      <motion.button type="button" aria-label={`Удалить группу ${name}`} style={{ opacity: trashOpacity, scale: trashScale, rotate: trashRotate }} onClick={onDelete} className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#ff3b30] text-white shadow-[0_8px_16px_rgba(255,59,48,.35)]", !revealed && "pointer-events-none")}><Trash2 size={16} /></motion.button>
    </motion.div>
  </motion.div>;
}

function LocationEditor({ id, onBack }: { id: string; onBack: () => void }) {
  const groups = useEmbersStore((s) => focusedEvent(s).locationGroups);
  const update = useEmbersStore((s) => s.updatePresetLocation);
  const located = groups.flatMap((group) => group.locations.map((location) => ({ ...location, group: group.name }))).find((location) => location.id === id);
  useEffect(() => { if (!located) onBack(); }, [located, onBack]);
  if (!located) return null;
  return <div>
    <div className="relative flex h-11 items-center"><button type="button" onClick={onBack} className="flex items-center text-body text-[#0A84FF]"><ChevronLeft size={22} />Локации</button><h2 className="absolute inset-x-24 truncate text-center text-body font-semibold">{located.name}</h2></div>
    <div className="mt-4 flex items-center gap-3 rounded-[22px] bg-[#2c2c2e] px-4 py-3.5"><LocationMark icon={located.icon} color={located.color} size={56} /><div className="min-w-0"><p className="truncate text-body font-semibold">{located.name}</p><p className="truncate text-callout text-white/45">{located.group}</p></div></div>
    <p className="mb-2 ml-4 mt-6 text-callout text-white/50">Группа</p>
    <div className="no-scrollbar flex gap-2 overflow-x-auto">{groups.map((group) => <button key={group.name} type="button" onClick={() => update(id, { group: group.name })} className={cn("h-11 shrink-0 rounded-full px-4 text-callout font-medium", located.group === group.name ? "bg-[#ff6b00] text-white" : "bg-[#3a3a3e] text-[#ff6b00]")}>{group.name}</button>)}</div>
    <p className="mb-2 ml-4 mt-6 text-callout text-white/50">Иконка</p>
    <div className="grid grid-cols-6 gap-2 rounded-[22px] bg-[#2c2c2e] p-3">{locationIconNames.map((icon) => { const Icon = locationIconMap[icon]; return <button key={icon} type="button" aria-label={locationIconLabel[icon]} aria-pressed={located.icon === icon} onClick={() => update(id, { icon })} className={cn("grid aspect-square place-items-center rounded-2xl", located.icon === icon ? "bg-[#ff6b00] text-white" : "bg-white/10 text-white/80")}><Icon size={22} /></button>; })}</div>
    <p className="mb-2 ml-4 mt-6 text-callout text-white/50">Цвет</p>
    <div className="flex justify-between rounded-[22px] bg-[#2c2c2e] px-4 py-3.5">{presetColors.map((color) => <button key={color} type="button" aria-label={`Цвет ${color}`} aria-pressed={located.color === color} onClick={() => update(id, { color })} style={{ background: color }} className={cn("h-8 w-8 rounded-full", located.color === color && "ring-2 ring-white ring-offset-2 ring-offset-[#2c2c2e]")} />)}</div>
  </div>;
}

function PresetLocationsPage({ onBack }: { onBack: () => void }) {
  const groups = useEmbersStore((s) => focusedEvent(s).locationGroups);
  const add = useEmbersStore((s) => s.addPresetLocation);
  const addGroup = useEmbersStore((s) => s.addLocationGroup);
  const remove = useEmbersStore((s) => s.removePresetLocation);
  const removeGroup = useEmbersStore((s) => s.removeLocationGroup);
  const [category, setCategory] = useState("");
  const [name, setName] = useState("");
  const [groupDraft, setGroupDraft] = useState<string | null>(null);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const groupRef = useRef<HTMLInputElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const current = groups.find((group) => group.name === category);
  const visible = current ? current.locations.map((location) => ({ ...location, group: current.name })) : groups.flatMap((group) => group.locations.map((location) => ({ ...location, group: group.name })));
  useEffect(() => { if (groupDraft !== null) groupRef.current?.focus(); }, [groupDraft]);
  useEffect(() => {
    const row = rowRef.current;
    const pill = row?.querySelector<HTMLElement>("[data-selected='true']");
    if (!row || !pill) return;
    const rowBox = row.getBoundingClientRect();
    const pillBox = pill.getBoundingClientRect();
    if (pillBox.right > rowBox.right - 8) row.scrollLeft += pillBox.right - rowBox.right + 12;
    else if (pillBox.left < rowBox.left + 8) row.scrollLeft -= rowBox.left - pillBox.left + 12;
  }, [category, groups.length]);
  const submit = () => {
    const title = name.trim();
    if (!title) return;
    if (!current) { useEmbersStore.getState().setNotice("Выберите группу"); return; }
    const before = current.locations.length;
    add(current.name, title);
    const after = focusedEvent(useEmbersStore.getState()).locationGroups.find((group) => group.name === current.name)?.locations.length ?? before;
    if (after > before) setName("");
  };
  const submitGroup = () => {
    const title = (groupDraft ?? "").trim();
    if (!title) { setGroupDraft(null); return; }
    const before = groups.length;
    addGroup(title);
    const next = focusedEvent(useEmbersStore.getState()).locationGroups;
    if (next.length > before) { setCategory(title); setGroupDraft(null); setOpenGroup(null); }
  };
  const deleteGroup = (groupName: string) => {
    removeGroup(groupName);
    if (category === groupName) setCategory("");
    setOpenGroup(null);
  };
  const closeEditor = useCallback(() => setEditingId(null), []);
  if (editingId) return <LocationEditor id={editingId} onBack={closeEditor} />;
  return <div>
    <div className="relative flex h-11 items-center"><button type="button" onClick={onBack} className="flex items-center text-body text-[#0A84FF]"><ChevronLeft size={22} />Настройки</button><h2 className="absolute inset-x-24 text-center text-body font-semibold">Локации</h2></div>
    <p className="mt-3 px-1 text-caption leading-5 text-white/45">Эти локации появляются внизу расписания. Их можно перетаскивать в программу человека.</p>
    <div className="mt-4 flex items-center gap-2"><button type="button" aria-label="Новая группа" onClick={() => groupDraft === null ? setGroupDraft("") : submitGroup()} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#ff6b00]"><Plus size={24} /></button><div ref={rowRef} onPointerDown={(event) => { if (event.button !== 0 || event.target !== event.currentTarget || event.pointerType === "touch") return; const pointerId = event.pointerId; const startX = event.clientX; const startScroll = event.currentTarget.scrollLeft; const row = event.currentTarget; const move = (ev: PointerEvent) => { if (ev.pointerId !== pointerId) return; row.scrollLeft = startScroll - (ev.clientX - startX); }; const up = (ev: PointerEvent) => { if (ev.pointerId !== pointerId) return; window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); }; window.addEventListener("pointermove", move); window.addEventListener("pointerup", up); }} className="no-scrollbar flex min-w-0 flex-1 touch-pan-x items-center gap-2 overflow-x-auto">{groupDraft !== null && <input ref={groupRef} value={groupDraft} onChange={(event) => setGroupDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); submitGroup(); } if (event.key === "Escape") setGroupDraft(null); }} placeholder="Новая группа" className="h-11 w-40 shrink-0 rounded-full bg-[#3a3a3e] px-4 text-body outline-none placeholder:text-[#8e8e93]" />}{groups.map((group) => <GroupPill key={group.name} name={group.name} selected={category === group.name} revealed={openGroup === group.name} rowRef={rowRef} onSelect={() => { setCategory((item) => item === group.name ? "" : group.name); setOpenGroup(null); }} onOpen={() => setOpenGroup(group.name)} onClose={() => setOpenGroup((item) => item === group.name ? null : item)} onDelete={() => deleteGroup(group.name)} />)}</div></div>
    <div className="mt-3 flex gap-2"><input value={name} onChange={(event) => setName(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); submit(); } }} placeholder="Новая локация" className="h-11 min-w-0 flex-1 rounded-full bg-[#3a3a3e] px-4 text-body outline-none placeholder:text-[#8e8e93]" /><button type="button" aria-label="Добавить локацию" onClick={submit} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#ff6b00]"><Plus size={24} /></button></div>
    <div className="mt-3 overflow-hidden rounded-[22px] bg-[#2c2c2e]">
      {!groups.length && <p className="px-4 py-6 text-center text-callout text-white/45">Добавьте группу кнопкой плюс</p>}
      {current && current.locations.length === 0 && <p className="px-4 py-6 text-center text-callout text-white/45">В этой группе пока нет локаций</p>}
      {!current && groups.length > 0 && visible.length === 0 && <p className="px-4 py-6 text-center text-callout text-white/45">Пока нет локаций</p>}
      {visible.map((location, index) => <div key={location.id} className={cn("flex h-14 items-center gap-2 px-4", index > 0 && "border-t border-white/10")}><button type="button" onClick={() => setEditingId(location.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left"><LocationMark icon={location.icon} color={location.color} /><span className="min-w-0 flex-1 truncate text-body">{location.name}</span><ChevronRight size={18} className="shrink-0 text-white/30" /></button><button type="button" aria-label={`Удалить ${location.name}`} onClick={() => remove(location.group, location.id)} className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/10"><X size={14} /></button></div>)}
    </div>
  </div>;
}

function ArchivePage({ onBack }: { onBack: () => void }) {
  const events = useEmbersStore((s) => s.events);
  const selectEvent = useEmbersStore((s) => s.selectEvent);
  const setScreen = useEmbersStore((s) => s.setScreen);
  const restoreEvent = useEmbersStore((s) => s.restoreEvent);
  const now = useClock();
  const time = now.getTime();
  const archived = events.filter((event) => event.archivedAt != null || eventPhase(event.details, time) === "past");
  return <div>
    <div className="relative flex h-11 items-center"><button type="button" onClick={onBack} className="flex items-center text-body text-[#0A84FF]"><ChevronLeft size={22} />Настройки</button><h2 className="absolute inset-x-24 text-center text-body font-semibold">Архив</h2></div>
    <p className="mt-3 px-1 text-caption leading-5 text-white/45">События в архиве хранятся 7 дней, затем архив очищается. Текущие можно вернуть на доску.</p>
    {!archived.length && <p className="mt-8 text-center text-callout text-white/45">Архив пуст</p>}
    <div className="mt-4 space-y-2.5">{archived.map((event) => {
      const phase = eventPhase(event.details, time);
      const days = archiveDaysLeft(event.details, time, event.archivedAt);
      const left = days <= 0 ? "Удалится сегодня" : `Ещё ${ruDays(days)}`;
      const canRestore = event.archivedAt != null && phase !== "past";
      return <div key={event.id} className="flex items-center gap-3 rounded-[22px] bg-[#2c2c2e] px-4 py-3">
        <button type="button" onClick={() => { selectEvent(event.id); setScreen("live"); }} className="flex min-w-0 flex-1 items-center gap-3 text-left">
          <span className="min-w-0 flex-1"><b className="block truncate text-body font-semibold">{event.details.title || "Без названия"}</b><small className="mt-0.5 block truncate text-caption text-white/45">{eventWhen(event.details)}</small><small className="mt-0.5 block text-caption text-white/45">{left}</small></span>
          <EventStatusBadge phase={phase} size="board" />
        </button>
        {canRestore && <button type="button" onClick={() => restoreEvent(event.id)} style={{ fontSize: 13, fontWeight: 600 }} className="shrink-0 rounded-full bg-white px-3.5 py-2 text-black">Вернуть</button>}
      </div>;
    })}</div>
  </div>;
}

function AccountSheet() {
  const close = useEmbersStore((s) => s.closeSheet);
  const setScreen = useEmbersStore((s) => s.setScreen);
  const prefs = useEmbersStore((s) => s.accountPrefs);
  const setPref = useEmbersStore((s) => s.setAccountPref);
  const locationCount = useEmbersStore((s) => focusedEvent(s).locationGroups.reduce((sum, group) => sum + group.locations.length, 0));
  const now = useClock();
  const events = useEmbersStore((s) => s.events);
  const archiveCount = events.filter((event) => event.archivedAt != null || eventPhase(event.details, now.getTime()) === "past").length;
  const [page, setPage] = useState<"root" | "notifications" | "calendar" | "email" | "privacy" | "help" | "terms" | "locations" | "archive">("root");
  const pages = {
    notifications: { title: "Уведомления", key: "notifications" as const, text: "Сообщения команды, смена статуса и напоминания о ваших сменах." },
    calendar: { title: "Календарь", key: "calendar" as const, text: "Событие появится в календаре телефона, когда синхронизация будет подключена." },
    email: { title: "Письма", key: "emailUpdates" as const, text: "Письма о приглашениях и изменениях в расписании." },
  };
  if (page === "notifications" || page === "calendar" || page === "email") {
    const current = pages[page];
    return <div>
      <div className="relative flex h-11 items-center"><button type="button" onClick={() => setPage("root")} className="flex items-center text-body text-[#0A84FF]"><ChevronLeft size={22} />Настройки</button><h2 className="absolute inset-x-24 text-center text-body font-semibold">{current.title}</h2></div>
      <div className="mt-4 flex h-[52px] items-center rounded-[22px] bg-[#2c2c2e] px-4 text-body">{current.title}<span className="ml-auto"><SettingsSwitch on={prefs[current.key]} onToggle={() => setPref(current.key, !prefs[current.key])} /></span></div>
      <p className="mt-2 px-4 text-caption leading-5 text-white/45">{current.text}</p>
    </div>;
  }
  if (page === "locations") return <PresetLocationsPage onBack={() => setPage("root")} />;
  if (page === "archive") return <ArchivePage onBack={() => setPage("root")} />;
  if (page === "privacy" || page === "help" || page === "terms") {
    const copy = {
      privacy: ["Конфиденциальность", "Embers хранит событие, команду и расписание на этом устройстве. В демо-версии данные никуда не отправляются."],
      help: ["Помощь", "Сдвиньте карточку человека влево, чтобы открыть его расписание. В программе события можно приложить PDF: проходки, инструкции и другие файлы."],
      terms: ["Условия", "Продолжая пользоваться Embers, вы соглашаетесь с правилами сервиса. Это демонстрационная версия."],
    }[page];
    return <div>
      <div className="relative flex h-11 items-center"><button type="button" onClick={() => setPage("root")} className="flex items-center text-body text-[#0A84FF]"><ChevronLeft size={22} />Настройки</button><h2 className="absolute inset-x-24 text-center text-body font-semibold">{copy[0]}</h2></div>
      <p className="mt-4 px-1 text-body leading-6 text-white/80">{copy[1]}</p>
    </div>;
  }
  const stateLabel = (on: boolean) => on ? "Вкл" : "Выкл";
  return <div>
    <div className="relative flex h-11 items-center justify-center"><h2 className="text-body font-semibold">Настройки</h2><div className="absolute right-0"><CircleButton onClick={close} light><Check size={20} /></CircleButton></div></div>
    <div className="mt-3 flex items-center gap-3 rounded-[22px] bg-[#2c2c2e] px-4 py-3.5"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#9c613d] text-body font-semibold">ВФ</span><div className="min-w-0"><p className="text-body font-semibold">Вадим Филатов</p><p className="truncate text-callout text-white/45">{accountEmail}</p></div></div>
    <p className="mt-2 px-4 text-caption leading-5 text-white/45">Вы вошли с Apple ID. Имя и фото можно сменить, когда будете отвечать на приглашение.</p>
    <p className="mb-2 ml-4 mt-5 text-callout text-white/50">События</p>
    <button type="button" onClick={() => setPage("archive")} className="flex h-[54px] w-full items-center rounded-[22px] bg-[#2c2c2e] px-4 text-left text-body">Архив<span className="ml-auto text-white/45">{archiveCount}</span><ChevronRight size={18} className="ml-1 text-white/30" /></button>
    <div className="mt-4 space-y-2.5">
      <button type="button" onClick={() => setPage("notifications")} className="flex h-[54px] w-full items-center rounded-[22px] bg-[#2c2c2e] px-4 text-left text-body">Уведомления<span className="ml-auto text-white/45">{stateLabel(prefs.notifications)}</span><ChevronRight size={18} className="ml-1 text-white/30" /></button>
      <button type="button" onClick={() => setPage("calendar")} className="flex h-[54px] w-full items-center rounded-[22px] bg-[#2c2c2e] px-4 text-left text-body">Календарь<span className="ml-auto text-white/45">{stateLabel(prefs.calendar)}</span><ChevronRight size={18} className="ml-1 text-white/30" /></button>
      <button type="button" onClick={() => setPage("email")} className="flex h-[54px] w-full items-center rounded-[22px] bg-[#2c2c2e] px-4 text-left text-body">Письма<span className="ml-auto text-white/45">{stateLabel(prefs.emailUpdates)}</span><ChevronRight size={18} className="ml-1 text-white/30" /></button>
    </div>
    <p className="mb-2 ml-4 mt-6 text-callout text-white/50">Локации</p>
    <button type="button" onClick={() => setPage("locations")} className="flex h-[54px] w-full items-center rounded-[22px] bg-[#2c2c2e] px-4 text-left text-body">Заготовленные локации<span className="ml-auto text-white/45">{locationCount}</span><ChevronRight size={18} className="ml-1 text-white/30" /></button>
    <p className="mb-2 ml-4 mt-6 text-callout text-white/50">Отправка</p>
    <div className="rounded-[22px] bg-[#2c2c2e] px-4 py-3"><p className="text-body">Отправлять с</p><p className="truncate text-callout text-white/45">{accountEmail}</p></div>
    <p className="mt-2 px-4 text-caption leading-5 text-white/45">Этот адрес увидят люди, которым вы отправите приглашение.</p>
    <p className="mb-2 ml-4 mt-6 text-callout text-white/50">Конфиденциальность</p>
    <div className="overflow-hidden rounded-[22px] bg-[#2c2c2e]">
      <button type="button" onClick={() => setPage("privacy")} className="flex h-[52px] w-full items-center px-4 text-left text-body">Как используются данные<ChevronRight size={18} className="ml-auto text-white/30" /></button>
      <button type="button" onClick={() => setPage("help")} className="flex h-[52px] w-full items-center border-t border-white/10 px-4 text-left text-body">Помощь</button>
      <button type="button" onClick={() => setPage("terms")} className="flex h-[52px] w-full items-center border-t border-white/10 px-4 text-left text-body">Условия</button>
      <button type="button" onClick={() => setScreen("auth")} className="flex h-[52px] w-full items-center border-t border-white/10 px-4 text-left text-body text-[#ff453a]">Выйти</button>
    </div>
  </div>;
}

function PhoneSheet() {
  const setScreen = useEmbersStore((s) => s.setScreen);
  const setPhone = useEmbersStore((s) => s.setProfilePhone);
  const [value, setValue] = useState("");
  const submit = () => {
    if (value.replace(/\D/g, "").length < 10) { useEmbersStore.getState().setNotice("Введите номер полностью"); return; }
    setPhone(value.trim());
    setScreen("hub");
  };
  return <div><SheetHeader title="Номер телефона" done={false} /><p className="mt-2 px-1 text-caption leading-5 text-white/50">Номер сохранится в аккаунте. Код подтверждения появится, когда подключим отправку сообщений.</p><input value={value} onChange={(e) => setValue(e.target.value)} inputMode="tel" placeholder="+7 900 000-00-00" className="mt-4 h-14 w-full rounded-2xl bg-[#2c2c2e] px-4 text-body outline-none placeholder:text-white/30" /><button onClick={submit} className="mt-4 h-[54px] w-full rounded-full bg-[#ff6b00] text-body font-semibold">Продолжить</button></div>;
}

function Sheets() {
  const sheet = useEmbersStore((s) => s.sheet);
  const close = useEmbersStore((s) => s.closeSheet);
  const content: Partial<Record<Exclude<Sheet,null>,React.ReactNode>> = {join:<JoinSheet/>,datetime:<DateSheet/>,location:<LocationSheet/>,invite:<InviteSheet/>,member:<MemberSheet/>,status:<StatusSheet/>,account:<AccountSheet/>,phone:<PhoneSheet/>,files:<FilesSheet/>};
  const tall = ["join","location","invite","files","account"].includes(sheet ?? "");
  const heights: Record<string,string> = {datetime:"h-[560px]",status:"h-[552px]",member:"h-[702px]",account:"h-[420px]",phone:"h-[380px]"};
  return <Drawer.Root open={sheet!==null} onOpenChange={(v)=>!v&&close()} shouldScaleBackground><Drawer.Portal><Drawer.Overlay className="fixed inset-0 z-[150] bg-black/50" /><Drawer.Content className={cn("fixed inset-x-0 bottom-0 z-[160] mx-auto w-full max-w-none overflow-y-auto rounded-t-[38px] bg-[#1c1c1e] px-4 pb-[max(32px,env(safe-area-inset-bottom))] outline-none min-[520px]:max-w-[393px]",tall?"h-[calc(100dvh-56px)] max-h-[836px]":heights[sheet??""]??"h-[70dvh]")}><Drawer.Title className="sr-only">{sheet}</Drawer.Title><i className="sticky top-1.5 z-20 mx-auto block h-[5px] w-[37px] rounded bg-[#7f7f7f80]" />{sheet === "account" ? <div className="pt-10">{content.account}</div> : sheet && content[sheet]}</Drawer.Content></Drawer.Portal></Drawer.Root>;
}

function ArchiveSweep() {
  const pruneArchive = useEmbersStore((s) => s.pruneArchive);
  const now = useClock();
  useEffect(() => { pruneArchive(now.getTime()); }, [now, pruneArchive]);
  return null;
}

function useStatusBar(screen: string) {
  useEffect(() => {
    const color = screen === "auth" || screen === "create" || screen === "live" ? "#ff6b00" : "#000000";
    document.documentElement.style.backgroundColor = color;
    document.body.style.backgroundColor = color;
    document.querySelectorAll('meta[name="theme-color"]').forEach((node) => node.setAttribute("content", color));
  }, [screen]);
}

export default function EmbersApp() {
  const screen = useEmbersStore((s) => s.screen);
  useStatusBar(screen);
  const views = {auth:<AuthScreen/>,hub:<EventsHub/>,create:<CreateEvent/>,live:<LiveBoard/>,schedule:<ScheduleScreen/>};
  return <main className="grid h-dvh place-items-center overflow-hidden bg-black">
    <ArchiveSweep />
    <div data-vaul-drawer-wrapper="" className="phone-frame relative w-full overflow-hidden bg-black text-white">
      <div key={screen} className={cn("no-scrollbar h-full", screen === "create" || screen === "schedule" || screen === "auth" ? "overflow-hidden" : "overflow-y-auto")}><div className={cn("relative", screen === "create" || screen === "schedule" || screen === "auth" ? "h-full" : "min-h-full")}>{views[screen]}</div></div>
    </div><Sheets /><FrameNotice />
  </main>;
}
