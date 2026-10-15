"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
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
  type LocationIcon, type Member, type ScheduleBlock, type Sheet, type Status, eventPlace, eventWhen, formatDateLabel, locationIconNames, presetColors, statusMeta, team, useEmbersStore,
} from "@/store/useEmbersStore";

const spring = { type: "spring" as const, stiffness: 380, damping: 30, mass: 0.8 };
const cn = (...v: Array<string | false | null | undefined>) => v.filter(Boolean).join(" ");
const locationIconMap = { sparkles: Sparkles, mic: Mic, camera: Camera, users: Users, pin: MapPin, door: DoorOpen, box: Warehouse, lamp: Lamp, music: Music, coffee: Coffee, star: Star, flag: Flag };
const locationIconLabel: Record<LocationIcon, string> = { sparkles: "Блёстки", mic: "Микрофон", camera: "Камера", users: "Люди", pin: "Метка", door: "Дверь", box: "Коробка", lamp: "Лампа", music: "Музыка", coffee: "Кофе", star: "Звезда", flag: "Флаг" };
function LocationMark({ icon, color, size = 28 }: { icon?: string; color: string; size?: number }) {
  const Icon = locationIconMap[icon as LocationIcon] ?? Sparkles;
  return <span style={{ background: color, width: size, height: size, borderRadius: size >= 48 ? 16 : 8 }} className="grid shrink-0 place-items-center text-white"><Icon size={Math.round(size * 0.46)} /></span>;
}
const inviteUrl = "https://embers.app/j/K7Q2X9";
const timezones = ["Москва", "Калининград", "Самара", "Екатеринбург", "Новосибирск", "Владивосток"];

async function shareInvite(title: string) {
  if (navigator.share) {
    try {
      await navigator.share({ title, url: inviteUrl });
      return "shared" as const;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return "cancelled" as const;
    }
  }
  try {
    await navigator.clipboard.writeText(inviteUrl);
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
  return <p className="fixed bottom-8 left-1/2 z-[200] -translate-x-1/2 rounded-full bg-white px-4 py-2 text-[13px] font-semibold text-black">{notice}</p>;
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
  return <span style={{ width: size, height: size, background: member.color }} className="grid shrink-0 place-items-center rounded-full border-2 border-white text-sm font-semibold shadow-sm">{member.initials}</span>;
}

function StatusPill({ status }: { status: Status }) {
  const meta = statusMeta[status];
  return <span style={{ color: meta.color, background: `${meta.color}2e` }} className="inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[13px] font-semibold"><i style={{ background: meta.color }} className="h-2 w-2 rounded-full" />{meta.label}</span>;
}

function CircleButton({ children, onClick, light = false, label, className }: { children: React.ReactNode; onClick?: () => void; light?: boolean; label?: string; className?: string }) {
  return <Press onClick={onClick} className={cn("relative z-30 grid h-11 w-11 place-items-center rounded-full", light ? "bg-white text-black" : "bg-white/10 text-white", className)}>{label && <span className="sr-only">{label}</span>}{children}</Press>;
}

function AuthScreen() {
  const setScreen = useEmbersStore((s) => s.setScreen);
  const open = useEmbersStore((s) => s.openSheet);
  return <div className="figma-gradient relative h-full min-h-[852px] overflow-hidden text-center" data-node-id="2:3">
    <div className="absolute left-1/2 top-[162px] grid h-24 w-24 -translate-x-1/2 place-items-center rounded-[28px] border border-white/35 bg-white/15">
      <Asset src="/figma-flame.svg" className="h-12 w-12" />
    </div>
    <h1 className="absolute inset-x-0 top-[283px] text-5xl font-extrabold tracking-[-.02em]">Embers</h1>
    <h2 className="absolute inset-x-0 top-[351px] text-xl font-semibold">Вся команда на одной карте</h2>
    <p className="absolute left-9 right-9 top-[386px] text-[15px] leading-5 text-[#ebebf599]">Кто где, что делает и сколько осталось —<br />в реальном времени на любом событии</p>
    <div className="absolute inset-x-5 top-[596px] space-y-3">
      <Press onClick={() => setScreen("hub")} className="flex h-[54px] w-full items-center justify-center gap-2 rounded-full bg-white text-[17px] font-semibold text-black"><Asset src="/figma-apple.svg" />Войти через Apple</Press>
      <Press onClick={() => open("phone")} className="flex h-[54px] w-full items-center justify-center gap-2 rounded-full border border-white/30 bg-white/15 text-[17px] font-semibold"><Asset src="/figma-phone.svg" />Войти по номеру</Press>
    </div>
    <p className="absolute inset-x-9 top-[732px] text-xs leading-4 text-[#ebebf599]">Продолжая, вы принимаете Условия использования<br />и Политику конфиденциальности</p>
  </div>;
}

function HubHeader() {
  const setScreen = useEmbersStore((s) => s.setScreen);
  const startCreate = useEmbersStore((s) => s.startCreate);
  const open = useEmbersStore((s) => s.openSheet);
  const has = useEmbersStore((s) => s.hasEvents);
  const event = useEmbersStore((s) => s.event);
  const [menu, setMenu] = useState(false);
  return <div className="absolute inset-x-5 top-10 z-20 flex h-11 items-center">
    <button onClick={() => setMenu((value) => !value)} className="flex items-center text-left" aria-expanded={menu}>
      <h1 className="text-[34px] font-bold tracking-tight">События</h1>
      <ChevronDown size={22} className={cn("ml-1 text-white/60 transition-transform", menu && "rotate-180")} />
    </button>
    <div className="ml-auto flex gap-2">
      <CircleButton onClick={startCreate} label="Новое событие"><Plus size={22} /></CircleButton>
      <button onClick={() => open("account")} aria-label="Аккаунт" className="grid h-11 w-11 place-items-center rounded-full bg-[#9c613d] text-base font-semibold">ВФ</button>
    </div>
    {menu && <div className="absolute left-0 top-14 w-64 overflow-hidden rounded-2xl bg-[#2c2c2e] shadow-2xl">
      {has ? <button onClick={() => setScreen("live")} className="flex h-14 w-full items-center px-4 text-left text-[17px]">{event.title}</button> : <p className="px-4 py-4 text-[15px] text-white/60">Пока нет событий</p>}
    </div>}
  </div>;
}

function EmptyHub() {
  const open = useEmbersStore((s) => s.openSheet);
  const startCreate = useEmbersStore((s) => s.startCreate);
  return <div data-node-id="2:57">
    <div className="absolute left-14 right-14 top-[106px] h-10 rounded-[28px] bg-white/5" />
    <div className="absolute left-[38px] right-[38px] top-[120px] h-10 rounded-[30px] bg-white/[.07]" />
    <div className="absolute inset-x-5 top-[136px] flex h-[330px] flex-col items-center rounded-[32px] border border-white/[.08] bg-white/10 text-center">
      <span className="mt-[34px] grid h-[104px] w-[104px] place-items-center rounded-full bg-orange-500/25"><CalendarDays size={48} className="text-[#ff6b00]" /></span>
      <h2 className="mt-6 text-[26px] font-bold">Пока нет событий</h2>
      <p className="mt-2 px-5 text-[15px] leading-5 text-[#ebebf599]">Создайте событие и пригласите команду<br />или присоединитесь по ссылке<br />от организатора</p>
    </div>
    <div className="absolute inset-x-5 top-[516px] space-y-3">
      <Press onClick={startCreate} className="flex h-[54px] w-full items-center justify-center gap-2 rounded-full bg-[#ff6b00] text-[17px] font-semibold"><Plus size={18} />Создать событие</Press>
      <Press onClick={() => open("join")} className="flex h-[54px] w-full items-center justify-center gap-2 rounded-full border border-white/15 bg-white/15 text-[16px] font-semibold"><Link2 size={18} />Присоединиться по ссылке или коду</Press>
    </div>
  </div>;
}

function EventCard() {
  const setScreen = useEmbersStore((s) => s.setScreen);
  const event = useEmbersStore((s) => s.event);
  return <motion.button layoutId="event-card" onClick={() => setScreen("live")} whileTap={{ scale: .98 }} transition={spring} className="absolute inset-x-5 top-[104px] bottom-[52px] overflow-hidden rounded-[36px] bg-gradient-to-b from-[#ff8a1f] via-[#d2321c] via-45% to-[#3b0b22] text-center shadow-2xl">
    {event.cover && <span className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${event.cover})` }} />}
    <div className="absolute -left-16 top-10 h-[300px] w-[300px] rounded-full bg-[radial-gradient(circle_at_35%_30%,#ffd18b_0%,#ff7a1c_35%,transparent_68%)] opacity-90 blur-sm" />
    <div className="absolute inset-x-0 bottom-0 h-80 bg-gradient-to-b from-transparent to-black/55" />
    <span className="absolute left-4 top-4 flex h-8 items-center gap-1.5 rounded-full bg-white/20 px-3 text-[13px] font-semibold"><Asset src="/figma-crown.svg" className="h-3.5 w-3.5" />Организатор</span>
    <span className="absolute right-4 top-4 flex h-8 items-center gap-1.5 rounded-full bg-black/30 px-3 text-[13px] font-bold"><i className="h-2 w-2 rounded-full bg-red-500" />LIVE</span>
    <div className="absolute inset-x-0 bottom-8 flex flex-col items-center">
      <div className="flex justify-center -space-x-2">{team.slice(0, 4).map((m) => <Avatar key={m.id} member={m} size={36} />)}</div>
      <h2 className="mt-4 text-[34px] font-extrabold tracking-tight">{event.title}</h2>
      <p className="mt-1.5 text-[17px] font-semibold">{eventWhen(event)}</p>
      <p className="mt-1 text-[15px] text-white/75">{event.venue}</p>
      {event.description && <p className="mt-1 line-clamp-2 px-6 text-[13px] text-white/70">{event.description}</p>}
      <span className="mt-4 flex h-9 items-center gap-2 rounded-full bg-white/20 px-4 text-[15px] font-semibold"><Asset src="/figma-users.svg" className="h-4 w-4" />{team.length} в команде</span>
    </div>
  </motion.button>;
}

function EventsHub() {
  const has = useEmbersStore((s) => s.hasEvents);
  const toggle = useEmbersStore((s) => s.setHasEvents);
  return <div className="hub-gradient absolute inset-0 overflow-hidden" data-node-id={has ? "2:131" : "2:57"}>
    <HubHeader />{has ? <EventCard /> : <EmptyHub />}
    {has && <div className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 gap-2">
      <button onClick={() => toggle(false)} aria-label="Пустой список" className="h-2 w-2 rounded-full bg-white" />
      <i className="h-2 w-2 rounded-full bg-white/30" />
      <i className="h-2 w-2 rounded-full bg-white/30" />
    </div>}
  </div>;
}

function CreateEvent() {
  const setScreen = useEmbersStore((s) => s.setScreen);
  const open = useEmbersStore((s) => s.openSheet);
  const draft = useEmbersStore((s) => s.draft);
  const updateDraft = useEmbersStore((s) => s.updateDraft);
  const createEvent = useEmbersStore((s) => s.createEvent);
  const files = useEmbersStore((s) => s.programFiles);
  const coverRef = useRef<HTMLInputElement>(null);
  const [showMap, setShowMap] = useState(true);
  const [placeTitle, ...placeRest] = draft.venue.split(",").map((part) => part.trim()).filter(Boolean);
  const placeDetail = [placeRest.join(", "), draft.zone].filter(Boolean).join(" · ");
  const mapSrc = draft.lat != null && draft.lng != null
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${draft.lng - 0.01}%2C${draft.lat - 0.008}%2C${draft.lng + 0.01}%2C${draft.lat + 0.008}&layer=mapnik&marker=${draft.lat}%2C${draft.lng}`
    : "";
  useEffect(() => { if (draft.venue) setShowMap(true); }, [draft.venue]);
  return <div className="relative h-full">
    <div className="no-scrollbar h-full overflow-y-auto">
    <div className="figma-gradient relative min-h-full pb-8" data-node-id="2:347">
    <div className="flex h-[28rem] flex-col items-center px-5 pt-[84px]">
      <input ref={coverRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) updateDraft({ cover: URL.createObjectURL(file) }); }} />
      <div className="flex flex-1 items-center">
        <button aria-label="Добавить фотографию" onClick={() => coverRef.current?.click()} className="relative grid h-[72px] w-[72px] place-items-center overflow-hidden rounded-full bg-white/20">{draft.cover ? <span className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${draft.cover})` }} /> : <ImagePlus size={30} />}</button>
      </div>
    </div>
    <div className="px-5">
      <div className="rounded-[32px] bg-[#1a040861] px-5">
        <input value={draft.title} onChange={(e) => updateDraft({ title: e.target.value })} placeholder="Название события" style={{ fontSize: "32px", fontWeight: 600, letterSpacing: "-0.03em" }} className="w-full bg-transparent py-8 text-center leading-tight outline-none placeholder:text-white/40" />
        <button onClick={() => open("datetime")} className="flex w-full flex-col items-center gap-2 border-t border-white/15 py-5 text-center"><CalendarDays size={22} className="text-white/80" /><span className={cn("text-[20px] leading-6", draft.date ? "font-semibold" : "font-medium text-white/85")}>{draft.date ? eventWhen(draft) : "Дата события"}</span></button>
        <button onClick={() => open("location")} className="flex w-full flex-col items-center gap-2 border-t border-white/15 py-5 text-center"><MapPin size={22} className="text-white/80" /><span className={cn("text-[20px] leading-6", draft.venue ? "font-semibold" : "font-medium text-white/85")}>{draft.venue ? eventPlace(draft) : "Выбрать локацию"}</span></button>
        <textarea value={draft.description} onChange={(e) => updateDraft({ description: e.target.value })} placeholder="Описание" rows={1} style={{ fontSize: "32px", fontWeight: 600, letterSpacing: "-0.03em", fieldSizing: "content" }} className="w-full resize-none bg-transparent py-8 text-center leading-tight outline-none placeholder:text-white/40" />
      </div>
      <div className="relative mt-3 rounded-[32px] bg-[#1a040861] px-5 py-6 text-center">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#9c613d] text-base font-semibold">ВФ</span>
        <p className="mt-3 text-[13px] text-white/60">Организатор</p>
        <p className="text-[22px] font-semibold leading-7">Вадим Филатов</p>
      </div>
      {showMap && draft.venue && mapSrc && <div className="relative mt-3 rounded-[32px] bg-[#1a040861] px-5 pb-4 pt-5 text-center">
        <button aria-label="Скрыть карту" onClick={() => setShowMap(false)} className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full bg-white/10"><X size={16} /></button>
        <MapPin size={22} className="mx-auto text-[#8eb6ff]" />
        <p className="mt-2 text-[20px] font-semibold leading-6">{placeTitle}</p>
        {placeDetail && <p className="mt-1 text-[15px] text-white/75">{placeDetail}</p>}
        <iframe title="Карта локации" src={mapSrc} className="mt-4 h-52 w-full rounded-[22px] border-0" />
      </div>}
      <div className="mt-3 rounded-[32px] bg-[#1a040861] px-5 py-4 text-center">
        <p className="text-[13px] font-medium tracking-wide text-white/55">ДЛЯ КОМАНДЫ</p>
        <button onClick={() => open("invite")} className="relative flex w-full flex-col items-center py-3.5"><span className="flex items-center gap-2 text-[20px] font-semibold"><Users size={20} />Команда</span><small className="mt-0.5 text-[14px] text-white/60">Добавьте людей и роли</small><ChevronRight size={18} className="absolute right-0 top-1/2 -translate-y-1/2 text-white/45" /></button>
        <button onClick={() => open("files")} className="relative flex w-full flex-col items-center border-t border-white/15 py-3.5"><span className="flex items-center gap-2 text-[20px] font-semibold"><FileText size={20} />Программа</span><small className="mt-0.5 text-[14px] text-white/60">{files.length ? `${files.length} PDF` : "Проходки, инструкции и другие PDF"}</small><ChevronRight size={18} className="absolute right-0 top-1/2 -translate-y-1/2 text-white/45" /></button>
      </div>
    </div>
    </div>
    </div>
    <div className="absolute left-5 top-10 z-30"><CircleButton onClick={() => setScreen("hub")} label="Назад" className="backdrop-blur-xl"><X size={20} /></CircleButton></div>
    <button onClick={createEvent} className="absolute right-5 top-10 z-30 h-11 rounded-full bg-white/20 px-4 text-[15px] font-semibold backdrop-blur-xl">Создать</button>
  </div>;
}

function Timeline() {
  const now = useClock();
  const current = now.getHours() * 60 + now.getMinutes();
  const start = 16 * 60;
  const end = 22 * 60;
  const award = 19 * 60 + 30;
  const progress = Math.min(100, Math.max(0, ((current - start) / (end - start)) * 100));
  const awardMark = ((award - start) / (end - start)) * 100;
  const label = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  return <div className="rounded-[28px] bg-white/10 p-4">
    <div className="flex items-center justify-between"><div><p className="text-[11px] font-semibold text-[#ff6b00]">СЕЙЧАС</p><p className="text-5xl font-bold tracking-[-.04em] tabular">{label}</p></div><div className="text-right text-[12px] font-semibold"><p>Награждение в 19:30</p><p className="text-[#ff6b00]">{award - current >= 0 ? formatAway(award - current) : "уже прошло"}</p></div></div>
    <div className="relative mt-5"><div className="h-1.5 rounded-full bg-white/15"><div className="h-full rounded-full bg-[#ff6b00]" style={{ width: `${progress}%` }} /></div><i className="absolute top-[-4px] h-3.5 w-3.5 -translate-x-1/2 rounded-full border-[3px] border-[#ff6b00] bg-white" style={{ left: `${progress}%` }} /><i className="absolute top-0 h-2 w-2 -translate-x-1/2 rounded-full bg-yellow-300" style={{ left: `${awardMark}%` }} /></div>
    <div className="mt-2 flex justify-between text-[9px] text-white/45 tabular">{[16,17,18,19,20,21,22].map((h) => <span key={h}>{h}</span>)}</div>
  </div>;
}

function MapCard() {
  const open = useEmbersStore((s) => s.openSheet);
  const onSite = team.filter((member) => member.status === "on_site").length;
  const inTransit = team.filter((member) => member.status === "in_transit").length;
  return <div className="rounded-[28px] bg-white/10 p-4"><h3 className="text-xl font-bold">Карта</h3><p className="mt-0.5 text-[11px] text-white/45">{onSite} на площадке · {inTransit} в пути</p>
    <div className="relative mt-2 h-[164px] overflow-hidden rounded-[18px] bg-[#26262b]">
      <i className="absolute -left-5 top-20 h-2 w-[420px] rotate-[8deg] bg-[#3a3a42]" /><i className="absolute left-28 -top-10 h-[260px] w-3 rotate-[8deg] bg-[#3a3a42]" /><i className="absolute right-14 -top-10 h-[260px] w-2 -rotate-12 bg-[#3a3a42]" />
      <span className="absolute right-10 top-3 h-[70px] w-[110px] rounded-[18px] bg-green-500/20" />
      <span className="absolute left-[168px] top-[72px] rounded-full bg-black/70 px-2 py-1 text-[9px] font-semibold">Сцена А</span>
      {team.map((m) => <button key={m.id} onClick={() => open("member", m.id)} style={{ left: `${m.coords.x}%`, top: `${m.coords.y}%` }} className="absolute -translate-x-1/2 -translate-y-1/2"><Avatar member={m} size={30} /></button>)}
    </div>
    <button className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-full bg-white/15 text-[13px] font-semibold"><Asset src="/figma-nav.svg" className="h-4 w-4" />Маршрут и карта</button>
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
  return <div className="relative mb-2 h-[104px] overflow-hidden rounded-[24px]">
    <div className="absolute inset-y-0 right-3 z-0 flex items-center">
      <motion.button type="button" aria-label={`Изменить расписание ${member.name}`} style={{ scale, opacity }} whileTap={{ scale: 0.9 }} onClick={() => openSchedule(member.id, "live")} className="grid h-11 w-11 place-items-center rounded-full bg-[#007AFF] text-white shadow-[0_8px_18px_rgba(0,122,255,0.4)]"><Pencil size={20} strokeWidth={2.2} /></motion.button>
    </div>
    <motion.button type="button" drag="x" dragConstraints={{ left: -action, right: 0 }} dragElastic={0.16} dragMomentum={false} dragDirectionLock style={{ x }} onDragEnd={(_, info) => finish(info)} onClick={() => { if (moved.current) { moved.current = false; return; } if (revealed) onClose(); else open("member", member.id); }} className="absolute inset-0 z-10 flex items-start gap-3 rounded-[24px] bg-[#1a1a1a] p-4 text-left">
      <Avatar member={member} /><div className="min-w-0 flex-1"><div className="flex items-start justify-between"><div><b className="block text-[15px]">{member.name}</b><small className="text-[11px] text-white/45">{role}</small></div><StatusPill status={member.status} /></div><div className="mt-1 flex justify-between text-[13px]"><span>{member.spot}</span><b className="text-[#ff6b00]">{member.currentTask.split("· ").at(-1)}</b></div><p className="truncate text-[10px] text-white/40">дальше {member.next}</p></div>
    </motion.button>
  </div>;
}

function TeamList() {
  const filter = useEmbersStore((s) => s.teamFilter);
  const setFilter = useEmbersStore((s) => s.filterTeam);
  const roles = useEmbersStore((s) => s.memberRoles);
  const [swipedId, setSwipedId] = useState<string | null>(null);
  const counts = { all: team.length, on_site: team.filter((member) => member.status === "on_site").length, in_transit: team.filter((member) => member.status === "in_transit").length };
  const visible = filter === "all" ? team : team.filter((m) => m.status === filter);
  return <><LayoutGroup><div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 py-3">
    {([["all", `Все · ${counts.all}`], ["on_site", `На площадке · ${counts.on_site}`], ["in_transit", `В пути · ${counts.in_transit}`]] as const).map(([id, label]) => <button key={id} onClick={() => setFilter(id)} className={cn("relative shrink-0 rounded-full px-3 py-2 text-[13px]", filter === id ? "text-black" : "bg-white/10")} >{filter === id && <motion.i layoutId="filter" transition={spring} className="absolute inset-0 rounded-full bg-white" />}<span className="relative">{label}</span></button>)}
  </div></LayoutGroup><h2 className="mb-3 text-xl font-bold">Команда</h2>
    <AnimatePresence mode="popLayout">{visible.map((m) => <MemberRow key={m.id} member={m} role={roles[m.id] ?? m.role} revealed={swipedId === m.id} onReveal={() => setSwipedId(m.id)} onClose={() => setSwipedId((current) => current === m.id ? null : current)} />)}</AnimatePresence></>;
}

function LiveBoard() {
  const setScreen = useEmbersStore((s) => s.setScreen);
  const open = useEmbersStore((s) => s.openSheet);
  const myStatus = useEmbersStore((s) => s.myStatus);
  const event = useEmbersStore((s) => s.event);
  return <div className="relative min-h-[1520px] bg-black pb-8" data-node-id="2:598">
    <div className="figma-gradient pointer-events-none absolute inset-x-0 top-0 h-[416px]" />
    <div className="absolute left-5 top-10 z-30"><CircleButton onClick={() => setScreen("hub")} label="Назад"><Asset src="/figma-back.svg" /></CircleButton></div>
    <div className="absolute right-5 top-10 z-30 flex gap-2"><CircleButton label="Поделиться" onClick={() => { void shareInvite(event.title).then(shareResult); }}><Asset src="/figma-share.svg" /></CircleButton><button onClick={() => open("account")} aria-label="Аккаунт" className="grid h-11 w-11 place-items-center rounded-full bg-[#9c613d] text-sm font-semibold">ВФ</button></div>
    <div className="relative z-0 px-5 pt-[104px]">
      <div className="text-center"><span className="inline-flex h-[30px] items-center gap-1 rounded-full bg-black/30 px-3 text-[11px] font-bold"><i className="h-2 w-2 rounded-full bg-red-500" />LIVE</span><h1 className="mt-2 text-[28px] font-extrabold tracking-tight">{event.title}</h1><p className="text-[11px] text-white/85">{event.dateLabel} · {event.venue}</p></div>
      <div className="mt-4"><Timeline /></div>
      <div className="mt-3 flex h-[52px] items-center rounded-[22px] bg-white/10 px-3"><span className="grid h-9 w-9 place-items-center rounded-full" style={{ background: `${statusMeta[myStatus].color}33` }}><MapPin size={18} style={{ color: statusMeta[myStatus].color }} /></span><div className="ml-3 flex-1"><p className="text-[10px] text-white/45">Мой статус</p><p className="text-[13px] font-semibold">{statusMeta[myStatus].label}</p></div><button onClick={() => open("status")} className="h-9 rounded-full bg-[#ff6b00] px-4 text-xs font-semibold">Сменить</button></div>
      <div className="mt-3"><MapCard /></div><TeamList />
    </div>
  </div>;
}

function SheetHeader({ title, done = true, closeButton = true }: { title: string; done?: boolean; closeButton?: boolean }) {
  const close = useEmbersStore((s) => s.closeSheet);
  return <div className="relative flex h-[58px] items-center justify-center">{closeButton && <CircleButton onClick={close}><X size={20} /></CircleButton>}<h2 className="absolute inset-x-16 text-center text-[17px] font-semibold">{title}</h2>{done && <div className="ml-auto"><CircleButton onClick={close} light><Check size={20} /></CircleButton></div>}</div>;
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
  const event = useEmbersStore((s) => s.event);
  const pasteLink = async () => {
    const text = await navigator.clipboard.readText().catch(() => "");
    const found = text.toUpperCase().match(/[A-Z0-9]{6}/);
    if (found) setCode(found[0]);
  };
  return <div data-node-id="2:273"><SheetHeader title="Присоединиться" /><p className="ml-5 mt-2 text-[12px] text-white/50">КОД ПРИГЛАШЕНИЯ</p>
    <div className="relative mt-2">
      <input aria-label="Код приглашения" value={code} onChange={(e) => setCode(e.target.value)} className="absolute inset-0 z-10 opacity-0" />
      <div className="grid grid-cols-6 gap-2">{Array.from({ length: 6 }).map((_, i) => <div key={i} className={cn("grid h-[62px] place-items-center rounded-[14px] bg-[#2c2c2e] text-[28px] font-semibold tabular", i === code.length && "border-2 border-[#ff6b00]")}>{code[i] ?? ""}</div>)}</div>
    </div>
    <p className={cn("ml-5 mt-2 text-[12px]", error ? "text-red-400" : "text-white/50")}>{error || "Код есть в приглашении от организатора"}</p>
    <div className="mt-4 overflow-hidden rounded-[20px] bg-[#2c2c2e]"><button onClick={pasteLink} className="flex h-[52px] w-full items-center gap-3 px-4 text-[17px]"><Asset src="/figma-link.svg" className="h-[22px] w-[22px]" />Вставить ссылку<ChevronRight className="ml-auto text-white/40" size={18} /></button><button onClick={() => setScanning((value) => !value)} className="flex h-[52px] w-full items-center gap-3 border-t border-white/15 px-4 text-[17px]"><Asset src="/figma-qr.svg" className="h-[22px] w-[22px]" />{scanning ? "Закрыть камеру" : "Сканировать QR-код"}<ChevronRight className="ml-auto text-white/40" size={18} /></button></div>
    {scanning && <div className="mt-3 overflow-hidden rounded-[20px]"><QrScanner onCode={onCode} /></div>}
    <p className="ml-5 mt-5 text-[12px] text-white/50">ПРЕДПРОСМОТР</p>
    <div className="mt-2 rounded-[20px] bg-[#2c2c2e] p-4"><div className="flex items-center gap-3"><span className="h-14 w-14 rounded-[14px] bg-gradient-to-b from-[#ff8a1f] via-[#d2321c] to-[#3b0b22]" /><div><b className="text-[17px]">{event.title}</b><p className="text-[12px] text-white/50">Пригласил Вадим Филатов · {team.length} в команде</p></div></div><div className="my-4 h-px bg-white/15" /><b className="text-[14px]">Выберите свою роль</b><div className="mt-3 flex flex-wrap gap-2">{["Свет","Звук","Видео","Фото","Продюсер","Площадка","Техник"].map((item) => <button key={item} onClick={() => setRole(item)} className={cn("h-9 rounded-full px-3.5 text-[14px]", role === item ? "bg-[#ff6b00]" : "bg-white/10")}>{item}</button>)}</div></div>
    <button onClick={() => join()} className="mt-[98px] h-[54px] w-full rounded-full bg-[#ff6b00] text-[17px] font-semibold">Присоединиться</button>
  </div>;
}

function DateSheet() {
  const draft = useEmbersStore((s) => s.draft);
  const toggleAllDay = useEmbersStore((s) => s.toggleAllDay);
  const updateDraft = useEmbersStore((s) => s.updateDraft);
  const [zonesOpen, setZonesOpen] = useState(false);
  const setDate = (date: string) => { if (date) updateDraft({ date, dateLabel: formatDateLabel(date) }); };
  return <div data-node-id="2:407"><SheetHeader title="Дата и время" /><div className="mt-2 overflow-hidden rounded-[20px] bg-[#2c2c2e]"><button onClick={toggleAllDay} className="flex h-[52px] w-full items-center px-4 text-[17px]">Весь день<span className={cn("ml-auto h-[31px] w-[51px] rounded-full p-0.5", draft.allDay ? "bg-[#34c759]" : "bg-[#39393d]")}><i className={cn("block h-[27px] w-[27px] rounded-full bg-white transition-transform", draft.allDay && "translate-x-5")} /></span></button><div className="flex h-[52px] items-center border-t border-white/15 px-4 text-[17px]">Дата<input type="date" value={draft.date} onChange={(e) => setDate(e.target.value)} className="ml-auto rounded-lg bg-white/10 px-2.5 py-1.5 outline-none [color-scheme:dark]" /></div>{!draft.allDay && <div className="flex h-[52px] items-center border-t border-white/15 px-4 text-[17px]">Начало<input type="time" value={draft.time} onChange={(e) => e.target.value && updateDraft({ time: e.target.value })} className="ml-auto rounded-lg bg-white/10 px-2.5 py-1.5 tabular outline-none [color-scheme:dark]" /></div>}<div className="flex h-[52px] items-center border-t border-white/15 px-4 text-[17px]">{draft.endTime ? <>Окончание<input type="time" value={draft.endTime} onChange={(e) => updateDraft({ endTime: e.target.value })} className="ml-auto rounded-lg bg-white/10 px-2.5 py-1.5 tabular outline-none [color-scheme:dark]" /><button onClick={() => updateDraft({ endTime: "" })} className="ml-3 text-[15px] text-white/50">Убрать</button></> : <button onClick={() => updateDraft({ endTime: "23:00" })} className="w-full text-left">Добавить время окончания</button>}</div></div><button onClick={() => setZonesOpen((value) => !value)} className="mt-4 flex h-[52px] w-full items-center rounded-[20px] bg-[#2c2c2e] px-4 text-[17px]">Часовой пояс<span className="ml-auto text-white/50">{draft.timezone}</span><ChevronRight size={18} className={cn("ml-2 text-white/40", zonesOpen && "rotate-90")} /></button>{zonesOpen && <div className="mt-2 overflow-hidden rounded-[20px] bg-[#2c2c2e]">{timezones.map((zone) => <button key={zone} onClick={() => { updateDraft({ timezone: zone }); setZonesOpen(false); }} className="flex h-12 w-full items-center border-t border-white/10 px-4 text-left first:border-t-0">{zone}{draft.timezone === zone && <Check size={16} className="ml-auto text-[#ff6b00]" />}</button>)}</div>}<p className="mt-3 px-4 text-[12px] leading-4 text-white/50">Время начала увидит вся команда. Тайминг программы<br />подстроится под эту дату автоматически.</p></div>;
}

type MapPlace = { id: string; name: string; address: string; lat: number; lng: number };
const knownPlaces: MapPlace[] = [
  { id: "vdnh", name: "ВДНХ, павильон 57", address: "Проспект Мира, 119с57", lat: 55.8304, lng: 37.6326 },
  { id: "gorky", name: "Парк Горького", address: "Крымский Вал, 9", lat: 55.7312, lng: 37.6034 },
  { id: "mosfilm", name: "Мосфильм, павильон 3", address: "Мосфильмовская ул., 1", lat: 55.7234, lng: 37.529 },
];

function LocationSheet() {
  const draft = useEmbersStore((s) => s.draft);
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
      <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Поиск локации" className="w-full bg-transparent text-[17px] text-white outline-none placeholder:text-[#8e8e93]" />
      <button type="button" aria-label="Голосовой поиск" onClick={() => { if (!startDictation(setQuery)) setNotice("Голосовой поиск недоступен в этом браузере"); }} className="text-white"><Mic size={18} /></button>
    </div>
    <p className="mb-2 ml-4 mt-6 text-[13px] text-white/45">Подсказки</p>
    <div className="overflow-hidden rounded-[22px] bg-[#2c2c2e]">
      <button onClick={useCurrent} className="flex h-[64px] w-full items-center gap-3 px-4 text-left"><span className="grid h-9 w-9 place-items-center rounded-full bg-[#0A84FF]"><Navigation size={18} /></span><span className="text-[17px]">Текущее местоположение</span></button>
      {suggestions.map((place) => <button key={place.id} onClick={() => choose(place)} className="flex h-[64px] w-full items-center gap-3 border-t border-white/10 px-4 text-left"><span className="grid h-9 w-9 place-items-center rounded-full bg-white/15"><MapPin size={18} /></span><span className="min-w-0 flex-1"><b className="block truncate text-[17px] font-normal">{place.name}</b><small className="block truncate text-[12px] text-white/45">{place.address}</small></span>{draft.lat === place.lat && draft.lng === place.lng && <Check size={18} className="text-[#0A84FF]" />}</button>)}
    </div>
    <p className="mb-2 ml-4 mt-6 text-[13px] text-white/45">Название места</p>
    <input value={draft.zone} onChange={(e) => updateDraft({ zone: e.target.value })} placeholder="Например, дом Вадима Филатова" className="h-12 w-full rounded-2xl bg-[#2c2c2e] px-4 text-[17px] outline-none placeholder:text-[#8e8e93]" />
    <p className="mt-2 px-4 text-[13px] text-white/40">Необязательно. Будет видно в приглашении.</p>
  </div>;
}

function InviteSheet() {
  const event = useEmbersStore((s) => s.event);
  const openRoles = useEmbersStore((s) => s.openRoles);
  const addOpenRole = useEmbersStore((s) => s.addOpenRole);
  const openSchedule = useEmbersStore((s) => s.openSchedule);
  const roles = useEmbersStore((s) => s.memberRoles);
  const [adding, setAdding] = useState(false);
  const [roleName, setRoleName] = useState("");
  const saveRole = () => {
    if (!roleName.trim()) return;
    addOpenRole(roleName);
    setRoleName("");
    setAdding(false);
  };
  return <div data-node-id="2:511"><SheetHeader title="Команда" /><div className="mt-2 flex h-[150px] items-center gap-4 rounded-[20px] bg-[#2c2c2e] p-4"><span className="grid h-24 w-24 place-items-center rounded-2xl bg-white"><Asset src="/figma-qr-large.svg" className="h-[76px] w-[76px]" /></span><div><b className="text-[17px]">Пригласите команду</b><p className="text-[15px] text-[#ff6b00]">embers.app/j/K7Q2X9</p><p className="text-[12px] text-white/50">Код: K7Q2X9</p><button onClick={() => { void shareInvite(event.title).then(shareResult); }} className="mt-3 flex h-9 items-center gap-2 rounded-full bg-[#ff6b00] px-3.5 text-[14px] font-semibold"><Share2 size={16} />Поделиться</button></div></div><p className="ml-5 mt-5 text-[12px] text-white/50">УЧАСТНИКИ · {team.length + 1 + openRoles.length}</p><div className="mt-2 overflow-hidden rounded-[20px] bg-[#2c2c2e]"><button onClick={() => openSchedule("vadim")} className="flex h-[60px] w-full items-center gap-3 px-4 text-left"><span className="grid h-10 w-10 place-items-center rounded-full bg-[#ff6b00]">ВФ</span><div className="flex-1"><p>Вадим Филатов <Crown size={13} className="inline text-[#ff6b00]" /></p><small className="text-white/50">{roles.vadim}</small></div><ChevronRight size={18} className="text-white/40" /></button>{team.map((m) => <button key={m.id} onClick={() => openSchedule(m.id)} className="ml-4 flex h-[60px] w-[calc(100%-1rem)] items-center gap-3 border-t border-white/15 pr-4 text-left"><Avatar member={m} size={40} /><div className="flex-1"><p>{m.name}</p><small className="text-white/50">{roles[m.id] ?? m.role}</small></div><ChevronRight size={18} className="text-white/40" /></button>)}{openRoles.map((role) => <div key={role} className="ml-4 flex h-[60px] items-center gap-3 border-t border-white/15 pr-4"><span className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-[13px]">+</span><div><p>{role}</p><small className="text-white/50">Свободная роль</small></div></div>)}{adding ? <div className="ml-4 flex h-[56px] items-center gap-2 border-t border-white/15 pr-4"><input value={roleName} onChange={(e) => setRoleName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && saveRole()} placeholder="Название роли" className="h-10 flex-1 bg-transparent text-[17px] outline-none placeholder:text-white/40" /><button onClick={saveRole} className="h-9 rounded-full bg-[#ff6b00] px-3 text-[14px] font-semibold">Добавить</button></div> : <button onClick={() => setAdding(true)} className="ml-4 flex h-[56px] w-[calc(100%-1rem)] items-center gap-3 border-t border-white/15 text-[#ff6b00]"><span className="grid h-10 w-10 place-items-center rounded-full bg-orange-500/15"><Plus /></span>Добавить роль</button>}</div></div>;
}

function MemberSheet() {
  const id = useEmbersStore((s) => s.selectedMemberId);
  const event = useEmbersStore((s) => s.event);
  const close = useEmbersStore((s) => s.closeSheet);
  const roles = useEmbersStore((s) => s.memberRoles);
  const member = team.find((m) => m.id === id) ?? team[0];
  const role = roles[member.id] ?? member.role;
  const roleLine = role === member.role && member.roleLong ? `${role} · ${member.roleLong.toLowerCase()}` : role;
  const now = member.currentTask.split(" · ");
  const next = member.next.split(" · ");
  const rows = [["Где", `${member.spot} · ${event.venue}`], [now[1] ? `Сейчас · ${now[1]}` : "Сейчас", now[0]], [next.length > 1 ? `Дальше · ${next[0]}` : "Дальше", next.at(-1) ?? member.next]];
  return <div data-node-id="2:890"><div className="flex h-11"><CircleButton onClick={close}><X size={20} /></CircleButton></div><div className="flex flex-col items-center"><Avatar member={member} size={88} /><h2 className="mt-3 text-[26px] font-bold">{member.name}</h2><p className="text-[15px] text-white/50">{roleLine}</p><div className="mt-2"><StatusPill status={member.status} /></div></div><div className="mt-5 grid grid-cols-3 gap-4"><a href={`tel:${member.phone}`} className="flex h-16 flex-col items-center justify-center gap-1 rounded-2xl bg-[#2c2c2e] text-[12px] font-medium text-[#ff6b00]"><Phone size={21} />Позвонить</a><a href={`sms:${member.phone}`} className="flex h-16 flex-col items-center justify-center gap-1 rounded-2xl bg-[#2c2c2e] text-[12px] font-medium text-[#ff6b00]"><Sparkles size={21} />Написать</a><button onClick={close} className="flex h-16 flex-col items-center justify-center gap-1 rounded-2xl bg-[#2c2c2e] text-[12px] font-medium text-[#ff6b00]"><MapPin size={21} />На карте</button></div><div className="mt-4 overflow-hidden rounded-[20px] bg-[#2c2c2e] px-4">{rows.map(([label, value], i) => <div key={label} className={cn("flex h-16 flex-col justify-center pl-9", i > 0 && "border-t border-white/15")}><small className="text-white/50">{label}</small><span className="text-[17px]">{value}</span></div>)}</div><p className="ml-5 mt-4 text-[12px] text-white/50">ДЕНЬ {member.name.split(" ")[0].toUpperCase()}</p><div className="mt-2 rounded-[20px] bg-[#2c2c2e] p-4"><div className="relative flex gap-[3px]">{["w-[12%] bg-[#636366]","w-[22%] bg-[#5e5ce6]","w-[9%] bg-[#ffd60a]","w-[28%] bg-[#30d158]","w-[12%] bg-[#ff6b00]","flex-1 bg-[#5e5ce6]"].map((c,i) => <i key={i} className={cn("h-3 rounded",c)} />)}<b className="absolute left-[55%] -top-1.5 h-6 w-0.5 bg-white" /></div><div className="mt-3 flex justify-between text-[10px] text-white/50"><span>08</span><span>12</span><span>16</span><span>20</span><span>23</span></div></div></div>;
}

function StatusSheet() {
  const current = useEmbersStore((s) => s.myStatus);
  const update = useEmbersStore((s) => s.updateMyStatus);
  const share = useEmbersStore((s) => s.shareLocation);
  const toggle = useEmbersStore((s) => s.toggleShareLocation);
  const requestShare = () => {
    if (share) { toggle(); return; }
    if (!navigator.geolocation) { useEmbersStore.getState().setNotice("Геолокация недоступна"); return; }
    navigator.geolocation.getCurrentPosition(() => toggle(), () => useEmbersStore.getState().setNotice("Разрешите доступ к геопозиции"));
  };
  const items: Array<[Status,string,string,React.ReactNode]> = [["on_site","На площадке","Я на месте",<MapPin key="p" />],["in_transit","В пути","Еду, отмечу время в пути",<Navigation key="n" />],["ready","Готов","Можно начинать",<Check key="c" />],["gathering","Сбор","Собираю команду",<Users key="u" />]];
  return <div data-node-id="2:960"><SheetHeader title="Мой статус" /><div className="mt-2 grid grid-cols-2 gap-4">{items.map(([id,label,sub,icon]) => <button key={id} onClick={() => update(id)} className={cn("relative flex h-[150px] flex-col items-start rounded-[24px] border-2 bg-[#2c2c2e] p-4 text-left", current===id ? "border-[#30d158]" : "border-transparent")}><span style={{ color: statusMeta[id].color, background: `${statusMeta[id].color}32` }} className="grid h-[52px] w-[52px] place-items-center rounded-full">{icon}</span><b className="mt-4 text-[17px]">{label}</b><small className="text-[12px] text-white/50">{sub}</small>{current===id && <span className="absolute right-4 top-4 grid h-6 w-6 place-items-center rounded-full bg-[#30d158] text-black"><Check size={15} /></span>}</button>)}</div><button onClick={requestShare} className="mt-5 flex h-[52px] w-full items-center rounded-[20px] bg-[#2c2c2e] px-4 text-[17px]">Делиться геопозицией<span className={cn("ml-auto h-[31px] w-[51px] rounded-full p-0.5",share?"bg-[#34c759]":"bg-[#39393d]")}><i className={cn("block h-[27px] w-[27px] rounded-full bg-white transition-transform",share&&"translate-x-5")} /></span></button><p className="mt-3 px-4 text-[12px] text-white/50">Команда увидит ваш статус и точку на карте</p></div>;
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
    <input ref={inputRef} aria-label="Роль" value={value} onChange={(event) => setValue(event.target.value)} onBlur={commit} onKeyDown={(event) => { if (event.key === "Escape") { skipSave.current = true; inputRef.current?.blur(); } }} placeholder="Роль" className="min-w-16 max-w-[220px] bg-transparent text-[15px] text-white outline-none [field-sizing:content]" />
    <Pencil size={14} className="shrink-0 text-white/55" />
  </form>;
  return <button type="button" onClick={() => { setValue(role); setEditing(true); }} className="flex h-9 max-w-full items-center gap-2 rounded-full bg-[#2c2c2e] pl-3.5 pr-2.5 text-[15px] text-white/85">
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
    <div role="button" aria-label={`Переместить ${block.location}`} onPointerDown={onDragStart} className="flex cursor-grab touch-none items-center gap-2 active:cursor-grabbing"><GripVertical size={18} className="shrink-0 text-white/35" /><span style={{ background: block.color }} className="grid h-6 w-6 place-items-center rounded-md"><Camera size={15} /></span><b className="text-[19px]">{block.location}</b><button aria-label="Удалить локацию" onPointerDown={(event) => event.stopPropagation()} onClick={onRemove} className="ml-auto grid h-6 w-6 place-items-center rounded-full bg-[#636366]"><X size={14} /></button></div>
    <p className="mt-3 text-[18px]">« {taskEdit ? <textarea ref={taskRef} aria-label="Задача" value={task} rows={1} onChange={(event) => setTask(event.target.value)} onBlur={commitTask} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); commitTask(); } if (event.key === "Escape") { skipTask.current = true; setTask(block.task); taskRef.current?.blur(); } }} placeholder="Что делает на этой локации" className="inline-block w-[calc(100%-2rem)] resize-none rounded-lg bg-[#ff6b0038] px-2 py-1 text-[#ff6b00] outline-none" /> : <button type="button" onClick={() => { setTask(block.task); setTaskEdit(true); }} className="rounded-lg bg-[#ff6b0038] px-2 py-1 text-left text-[#ff6b00]">{block.task}</button>} »</p>
    <p className="mt-3 text-[18px]">с {timeEdit ? <span className="inline-flex items-center gap-1 rounded-lg bg-[#ff6b0038] px-2 py-1 text-[#ff6b00]" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) commitTime(); }}>
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
  return <div className="flex h-11 items-center justify-center text-[12px] text-[#8e8e93]"><Clock3 size={14} className="mr-1" />переход {editing ? <input ref={inputRef} aria-label="Время перехода" inputMode="numeric" value={value} onChange={(event) => setValue(event.target.value.replace(/\D/g, "").slice(0, 3))} onBlur={commit} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); commit(); } if (event.key === "Escape") { skip.current = true; setValue(String(minutes)); inputRef.current?.blur(); } }} className="mx-1 w-10 rounded-md bg-white/10 text-center tabular text-white outline-none" /> : <button type="button" onClick={() => { setValue(String(minutes)); setEditing(true); }} className="mx-1 rounded-md bg-white/10 px-1.5 tabular text-white">{minutes}</button>} мин</div>;
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
  const blocks = useEmbersStore((s) => s.schedules[memberId] ?? []);
  const role = useEmbersStore((s) => s.memberRoles[memberId] ?? "Роль");
  const setRole = useEmbersStore((s) => s.setMemberRole);
  const add = useEmbersStore((s) => s.addScheduleBlock);
  const insert = useEmbersStore((s) => s.insertScheduleBlock);
  const reorder = useEmbersStore((s) => s.reorderScheduleBlocks);
  const remove = useEmbersStore((s) => s.removeScheduleBlock);
  const update = useEmbersStore((s) => s.updateScheduleBlock);
  const origin = useEmbersStore((s) => s.scheduleOrigin);
  const backToTeam = () => useEmbersStore.setState(origin === "live" ? { screen: "live", sheet: null } : { screen: "create", sheet: "invite" });
  const person = memberId === "vadim" ? { name: "Вадим Филатов" } : team.find((member) => member.id === memberId) ?? team[0];
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
  const groups = useEmbersStore((s) => s.locationGroups);
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
    <button type="button" aria-label="Назад" onClick={backToTeam} className="absolute left-5 top-10 z-30 grid h-11 w-11 place-items-center rounded-full border border-white/10 bg-[#28282ae6]"><Asset src="/figma-schedule-back.svg" className="h-6 w-6" /></button>
    <div className="pointer-events-none absolute inset-x-[72px] top-10 z-30 flex h-11 items-center justify-center"><b className="truncate text-[16px]">Расписание {person.name}</b></div>
    <div className="absolute left-1/2 top-[96px] z-30 w-max max-w-[calc(100%-40px)] -translate-x-1/2"><RoleChip key={memberId} role={role} onSave={(next) => setRole(memberId, next)} /></div>
    <motion.div ref={listRef} style={{ paddingBottom: listPad }} className="no-scrollbar absolute inset-x-5 top-[148px] bottom-0 overflow-y-auto overscroll-contain">
      {!configured && <p className={cn("px-1 text-center text-[15px] leading-5", dragChip ? "text-[#ff6b00]" : "text-[#8e8e93]")}>{dragChip ? "Отпустите, чтобы добавить локацию" : <>Чтобы составить расписание {possessive}, добавьте<br />локации из области внизу. Их можно перетаскивать.</>}</p>}
      {configured && <Reorder.Group as="div" axis="y" values={blocks} onReorder={reorder} className="relative pb-2">{blocks.map((b, i) => <ScheduleRow key={b.id} block={b} index={i} marked={Boolean(dragChip) && dropIndex === i} onRemove={() => remove(b.id)} onChange={(patch) => update(b.id, patch)} onTravel={(travel) => update(b.id, { travel })} />)}{dragChip && dropIndex === blocks.length && <div className="mt-2 h-0.5 rounded-full bg-[#ff6b00]" />}</Reorder.Group>}
    </motion.div>
    {wideScreen && typeof document !== "undefined" ? createPortal(<div aria-hidden style={{ bottom: blurBottom, height: collapsed / 2, WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, #000 100%)", maskImage: "linear-gradient(to bottom, transparent 0%, #000 100%)", WebkitBackdropFilter: "blur(24px)", backdropFilter: "blur(24px)" }} className="pointer-events-none fixed inset-x-0 z-10" />, document.body) : <div aria-hidden style={{ height: collapsed / 2, WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, #000 100%)", maskImage: "linear-gradient(to bottom, transparent 0%, #000 100%)", WebkitBackdropFilter: "blur(24px)", backdropFilter: "blur(24px)" }} className="pointer-events-none absolute inset-x-0 bottom-0 z-10" />}
    <motion.div ref={sheetRef} style={{ height: sheetHeight }} className="absolute inset-x-[21px] bottom-5 z-20 flex flex-col overflow-hidden rounded-[34px] border border-white/10 bg-[#1e1e20] px-4 pb-4 shadow-[0_18px_48px_rgba(0,0,0,.55)]">
      <div role="button" aria-label={expanded ? "Свернуть список локаций" : "Раскрыть список локаций"} onPointerDown={dragHandle} className="flex h-7 shrink-0 cursor-grab touch-none items-center justify-center active:cursor-grabbing"><i className="h-[5px] w-[60px] rounded-full bg-[#6e6e73]" /></div>
      <div className="flex shrink-0 gap-2"><div className="flex h-11 flex-1 items-center gap-2 rounded-full bg-[#3a3a3e] px-3 text-[#8e8e93]"><MapPin size={20} /><input value={locationName} onChange={(e) => setLocationName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addLocation()} placeholder="Новая локация" className="w-full bg-transparent text-[17px] text-white outline-none placeholder:text-[#8e8e93]" /></div><button onClick={() => addLocation()} className="grid h-11 w-11 place-items-center rounded-full bg-[#ff6b00]"><Plus size={24} /></button></div>
      <div className="no-scrollbar mt-3 flex shrink-0 gap-2 overflow-x-auto">{groups.map((group) => <button key={group.name} onClick={() => setCategory((item) => item === group.name ? "" : group.name)} className={cn("shrink-0 rounded-full px-4 py-2 text-[15px] font-medium", category === group.name ? "bg-[#ff6b00] text-white" : "bg-[#3a3a3e] text-[#ff6b00]")}>{group.name}</button>)}</div>
      {!configured && <p className="mt-3 shrink-0 text-[10px] font-semibold text-[#8e8e93]">СТАНДАРТНЫЕ ЛОКАЦИИ</p>}
      <div className={cn("mt-2 min-h-0 flex-1 space-y-2", expanded ? "overflow-y-auto" : "overflow-hidden")}>{palette.map((location) => <button onPointerDown={(event) => beginChipDrag(location, event)} onClick={() => { if (suppressClick.current) { suppressClick.current = false; return; } add(location.name); }} key={location.id} className={cn("flex h-12 w-full items-center gap-3 rounded-full bg-[#2c2c2e] px-3 text-[17px]", dragChip?.name === location.name && "opacity-40")}><LocationMark icon={location.icon} color={location.color} />{location.name}{!configured && <Info size={20} className="ml-auto text-white/50" />}</button>)}</div>
    </motion.div>
    {dragChip && <div className="pointer-events-none fixed z-[80] flex h-12 items-center gap-3 rounded-full bg-[#3a3a3e] px-3 text-[17px] shadow-2xl" style={{ left: dragChip.x, top: dragChip.y, transform: "translate(-50%, -60%) scale(1.04)" }}><LocationMark icon={dragChip.icon} color={dragChip.color} />{dragChip.name}</div>}
  </div>;
}

function FilesSheet() {
  const files = useEmbersStore((s) => s.programFiles);
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
    <p className="mt-1 px-1 text-[13px] leading-5 text-white/50">Проходки на концерт, инструкции и любые другие PDF для команды.</p>
    <input ref={inputRef} type="file" accept="application/pdf,.pdf" multiple className="hidden" onChange={(e) => pick(e.target.files)} />
    <button onClick={() => inputRef.current?.click()} className="mt-4 flex h-[54px] w-full items-center justify-center gap-2 rounded-full bg-[#ff6b00] text-[17px] font-semibold"><Plus size={18} />Добавить PDF</button>
    <div className="mt-4 overflow-hidden rounded-[20px] bg-[#2c2c2e]">
      {files.length === 0 && <p className="px-4 py-6 text-center text-[15px] text-white/45">Пока нет файлов</p>}
      {files.map((file, index) => <div key={file.id} className={cn("flex items-center gap-3 px-4 py-3", index > 0 && "border-t border-white/10")}>
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#ff6b00]/20 text-[#ff6b00]"><FileText size={18} /></span>
        <a href={file.url} target="_blank" rel="noreferrer" className="min-w-0 flex-1"><b className="block truncate text-[16px]">{file.name}</b><small className="text-white/45">{formatSize(file.size)}</small></a>
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
    <motion.button type="button" data-selected={selected ? "true" : undefined} onPointerDown={onBubblePointerDown} onClick={() => { if (moved.current) { moved.current = false; return; } if (revealed) onClose(); else onSelect(); }} whileTap={{ scale: 0.96 }} transition={spring} className={cn("relative z-10 h-11 touch-pan-x rounded-full px-4 text-[15px] font-medium select-none", selected ? "bg-[#ff6b00] text-white" : "bg-[#3a3a3e] text-[#ff6b00]")}><span data-swipe="" onPointerDown={onTextPointerDown} className="inline-flex h-full touch-none items-center">{name}</span></motion.button>
    <motion.div style={{ width: slot, marginLeft: gapPx, minWidth: 0 }} className="flex h-11 items-center justify-center overflow-hidden">
      <motion.button type="button" aria-label={`Удалить группу ${name}`} style={{ opacity: trashOpacity, scale: trashScale, rotate: trashRotate }} onClick={onDelete} className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#ff3b30] text-white shadow-[0_8px_16px_rgba(255,59,48,.35)]", !revealed && "pointer-events-none")}><Trash2 size={16} /></motion.button>
    </motion.div>
  </motion.div>;
}

function LocationEditor({ id, onBack }: { id: string; onBack: () => void }) {
  const groups = useEmbersStore((s) => s.locationGroups);
  const update = useEmbersStore((s) => s.updatePresetLocation);
  const located = groups.flatMap((group) => group.locations.map((location) => ({ ...location, group: group.name }))).find((location) => location.id === id);
  useEffect(() => { if (!located) onBack(); }, [located, onBack]);
  if (!located) return null;
  return <div>
    <div className="relative flex h-11 items-center"><button type="button" onClick={onBack} className="flex items-center text-[17px] text-[#0A84FF]"><ChevronLeft size={22} />Локации</button><h2 className="absolute inset-x-24 truncate text-center text-[17px] font-semibold">{located.name}</h2></div>
    <div className="mt-4 flex items-center gap-3 rounded-[22px] bg-[#2c2c2e] px-4 py-3.5"><LocationMark icon={located.icon} color={located.color} size={56} /><div className="min-w-0"><p className="truncate text-[20px] font-semibold">{located.name}</p><p className="truncate text-[15px] text-white/45">{located.group}</p></div></div>
    <p className="mb-2 ml-4 mt-6 text-[15px] text-white/50">Группа</p>
    <div className="no-scrollbar flex gap-2 overflow-x-auto">{groups.map((group) => <button key={group.name} type="button" onClick={() => update(id, { group: group.name })} className={cn("h-11 shrink-0 rounded-full px-4 text-[15px] font-medium", located.group === group.name ? "bg-[#ff6b00] text-white" : "bg-[#3a3a3e] text-[#ff6b00]")}>{group.name}</button>)}</div>
    <p className="mb-2 ml-4 mt-6 text-[15px] text-white/50">Иконка</p>
    <div className="grid grid-cols-6 gap-2 rounded-[22px] bg-[#2c2c2e] p-3">{locationIconNames.map((icon) => { const Icon = locationIconMap[icon]; return <button key={icon} type="button" aria-label={locationIconLabel[icon]} aria-pressed={located.icon === icon} onClick={() => update(id, { icon })} className={cn("grid aspect-square place-items-center rounded-2xl", located.icon === icon ? "bg-[#ff6b00] text-white" : "bg-white/10 text-white/80")}><Icon size={22} /></button>; })}</div>
    <p className="mb-2 ml-4 mt-6 text-[15px] text-white/50">Цвет</p>
    <div className="flex justify-between rounded-[22px] bg-[#2c2c2e] px-4 py-3.5">{presetColors.map((color) => <button key={color} type="button" aria-label={`Цвет ${color}`} aria-pressed={located.color === color} onClick={() => update(id, { color })} style={{ background: color }} className={cn("h-8 w-8 rounded-full", located.color === color && "ring-2 ring-white ring-offset-2 ring-offset-[#2c2c2e]")} />)}</div>
  </div>;
}

function PresetLocationsPage({ onBack }: { onBack: () => void }) {
  const groups = useEmbersStore((s) => s.locationGroups);
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
    const after = useEmbersStore.getState().locationGroups.find((group) => group.name === current.name)?.locations.length ?? before;
    if (after > before) setName("");
  };
  const submitGroup = () => {
    const title = (groupDraft ?? "").trim();
    if (!title) { setGroupDraft(null); return; }
    const before = groups.length;
    addGroup(title);
    const next = useEmbersStore.getState().locationGroups;
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
    <div className="relative flex h-11 items-center"><button type="button" onClick={onBack} className="flex items-center text-[17px] text-[#0A84FF]"><ChevronLeft size={22} />Настройки</button><h2 className="absolute inset-x-24 text-center text-[17px] font-semibold">Локации</h2></div>
    <p className="mt-3 px-1 text-[13px] leading-5 text-white/45">Эти локации появляются внизу расписания. Их можно перетаскивать в программу человека.</p>
    <div className="mt-4 flex items-center gap-2"><button type="button" aria-label="Новая группа" onClick={() => groupDraft === null ? setGroupDraft("") : submitGroup()} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#ff6b00]"><Plus size={24} /></button><div ref={rowRef} onPointerDown={(event) => { if (event.button !== 0 || event.target !== event.currentTarget || event.pointerType === "touch") return; const pointerId = event.pointerId; const startX = event.clientX; const startScroll = event.currentTarget.scrollLeft; const row = event.currentTarget; const move = (ev: PointerEvent) => { if (ev.pointerId !== pointerId) return; row.scrollLeft = startScroll - (ev.clientX - startX); }; const up = (ev: PointerEvent) => { if (ev.pointerId !== pointerId) return; window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); }; window.addEventListener("pointermove", move); window.addEventListener("pointerup", up); }} className="no-scrollbar flex min-w-0 flex-1 touch-pan-x items-center gap-2 overflow-x-auto">{groupDraft !== null && <input ref={groupRef} value={groupDraft} onChange={(event) => setGroupDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); submitGroup(); } if (event.key === "Escape") setGroupDraft(null); }} placeholder="Новая группа" className="h-11 w-40 shrink-0 rounded-full bg-[#3a3a3e] px-4 text-[17px] outline-none placeholder:text-[#8e8e93]" />}{groups.map((group) => <GroupPill key={group.name} name={group.name} selected={category === group.name} revealed={openGroup === group.name} rowRef={rowRef} onSelect={() => { setCategory((item) => item === group.name ? "" : group.name); setOpenGroup(null); }} onOpen={() => setOpenGroup(group.name)} onClose={() => setOpenGroup((item) => item === group.name ? null : item)} onDelete={() => deleteGroup(group.name)} />)}</div></div>
    <div className="mt-3 flex gap-2"><input value={name} onChange={(event) => setName(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); submit(); } }} placeholder="Новая локация" className="h-11 min-w-0 flex-1 rounded-full bg-[#3a3a3e] px-4 text-[17px] outline-none placeholder:text-[#8e8e93]" /><button type="button" aria-label="Добавить локацию" onClick={submit} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#ff6b00]"><Plus size={24} /></button></div>
    <div className="mt-3 overflow-hidden rounded-[22px] bg-[#2c2c2e]">
      {!groups.length && <p className="px-4 py-6 text-center text-[15px] text-white/45">Добавьте группу кнопкой плюс</p>}
      {current && current.locations.length === 0 && <p className="px-4 py-6 text-center text-[15px] text-white/45">В этой группе пока нет локаций</p>}
      {!current && groups.length > 0 && visible.length === 0 && <p className="px-4 py-6 text-center text-[15px] text-white/45">Пока нет локаций</p>}
      {visible.map((location, index) => <div key={location.id} className={cn("flex h-14 items-center gap-2 px-4", index > 0 && "border-t border-white/10")}><button type="button" onClick={() => setEditingId(location.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left"><LocationMark icon={location.icon} color={location.color} /><span className="min-w-0 flex-1 truncate text-[17px]">{location.name}</span><ChevronRight size={18} className="shrink-0 text-white/30" /></button><button type="button" aria-label={`Удалить ${location.name}`} onClick={() => remove(location.group, location.id)} className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/10"><X size={14} /></button></div>)}
    </div>
  </div>;
}

function AccountSheet() {
  const close = useEmbersStore((s) => s.closeSheet);
  const setScreen = useEmbersStore((s) => s.setScreen);
  const prefs = useEmbersStore((s) => s.accountPrefs);
  const setPref = useEmbersStore((s) => s.setAccountPref);
  const locationCount = useEmbersStore((s) => s.locationGroups.reduce((sum, group) => sum + group.locations.length, 0));
  const [page, setPage] = useState<"root" | "notifications" | "calendar" | "email" | "privacy" | "help" | "terms" | "locations">("root");
  const pages = {
    notifications: { title: "Уведомления", key: "notifications" as const, text: "Сообщения команды, смена статуса и напоминания о ваших сменах." },
    calendar: { title: "Календарь", key: "calendar" as const, text: "Событие появится в календаре телефона, когда синхронизация будет подключена." },
    email: { title: "Письма", key: "emailUpdates" as const, text: "Письма о приглашениях и изменениях в расписании." },
  };
  if (page === "notifications" || page === "calendar" || page === "email") {
    const current = pages[page];
    return <div>
      <div className="relative flex h-11 items-center"><button type="button" onClick={() => setPage("root")} className="flex items-center text-[17px] text-[#0A84FF]"><ChevronLeft size={22} />Настройки</button><h2 className="absolute inset-x-24 text-center text-[17px] font-semibold">{current.title}</h2></div>
      <div className="mt-4 flex h-[52px] items-center rounded-[22px] bg-[#2c2c2e] px-4 text-[17px]">{current.title}<span className="ml-auto"><SettingsSwitch on={prefs[current.key]} onToggle={() => setPref(current.key, !prefs[current.key])} /></span></div>
      <p className="mt-2 px-4 text-[13px] leading-5 text-white/45">{current.text}</p>
    </div>;
  }
  if (page === "locations") return <PresetLocationsPage onBack={() => setPage("root")} />;
  if (page === "privacy" || page === "help" || page === "terms") {
    const copy = {
      privacy: ["Конфиденциальность", "Embers хранит событие, команду и расписание на этом устройстве. В демо-версии данные никуда не отправляются."],
      help: ["Помощь", "Сдвиньте карточку человека влево, чтобы открыть его расписание. В программе события можно приложить PDF: проходки, инструкции и другие файлы."],
      terms: ["Условия", "Продолжая пользоваться Embers, вы соглашаетесь с правилами сервиса. Это демонстрационная версия."],
    }[page];
    return <div>
      <div className="relative flex h-11 items-center"><button type="button" onClick={() => setPage("root")} className="flex items-center text-[17px] text-[#0A84FF]"><ChevronLeft size={22} />Настройки</button><h2 className="absolute inset-x-24 text-center text-[17px] font-semibold">{copy[0]}</h2></div>
      <p className="mt-4 px-1 text-[17px] leading-6 text-white/80">{copy[1]}</p>
    </div>;
  }
  const stateLabel = (on: boolean) => on ? "Вкл" : "Выкл";
  return <div>
    <div className="relative flex h-11 items-center justify-center"><h2 className="text-[17px] font-semibold">Настройки</h2><div className="absolute right-0"><CircleButton onClick={close} light><Check size={20} /></CircleButton></div></div>
    <div className="mt-3 flex items-center gap-3 rounded-[22px] bg-[#2c2c2e] px-4 py-3.5"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#9c613d] text-base font-semibold">ВФ</span><div className="min-w-0"><p className="text-[17px] font-semibold">Вадим Филатов</p><p className="truncate text-[15px] text-white/45">{accountEmail}</p></div></div>
    <p className="mt-2 px-4 text-[13px] leading-5 text-white/45">Вы вошли с Apple ID. Имя и фото можно сменить, когда будете отвечать на приглашение.</p>
    <div className="mt-4 space-y-2.5">
      <button type="button" onClick={() => setPage("notifications")} className="flex h-[54px] w-full items-center rounded-[22px] bg-[#2c2c2e] px-4 text-left text-[17px]">Уведомления<span className="ml-auto text-white/45">{stateLabel(prefs.notifications)}</span><ChevronRight size={18} className="ml-1 text-white/30" /></button>
      <button type="button" onClick={() => setPage("calendar")} className="flex h-[54px] w-full items-center rounded-[22px] bg-[#2c2c2e] px-4 text-left text-[17px]">Календарь<span className="ml-auto text-white/45">{stateLabel(prefs.calendar)}</span><ChevronRight size={18} className="ml-1 text-white/30" /></button>
      <button type="button" onClick={() => setPage("email")} className="flex h-[54px] w-full items-center rounded-[22px] bg-[#2c2c2e] px-4 text-left text-[17px]">Письма<span className="ml-auto text-white/45">{stateLabel(prefs.emailUpdates)}</span><ChevronRight size={18} className="ml-1 text-white/30" /></button>
    </div>
    <p className="mb-2 ml-4 mt-6 text-[15px] text-white/50">Локации</p>
    <button type="button" onClick={() => setPage("locations")} className="flex h-[54px] w-full items-center rounded-[22px] bg-[#2c2c2e] px-4 text-left text-[17px]">Заготовленные локации<span className="ml-auto text-white/45">{locationCount}</span><ChevronRight size={18} className="ml-1 text-white/30" /></button>
    <p className="mb-2 ml-4 mt-6 text-[15px] text-white/50">Отправка</p>
    <div className="rounded-[22px] bg-[#2c2c2e] px-4 py-3"><p className="text-[17px]">Отправлять с</p><p className="truncate text-[15px] text-white/45">{accountEmail}</p></div>
    <p className="mt-2 px-4 text-[13px] leading-5 text-white/45">Этот адрес увидят люди, которым вы отправите приглашение.</p>
    <p className="mb-2 ml-4 mt-6 text-[15px] text-white/50">Конфиденциальность</p>
    <div className="overflow-hidden rounded-[22px] bg-[#2c2c2e]">
      <button type="button" onClick={() => setPage("privacy")} className="flex h-[52px] w-full items-center px-4 text-left text-[17px]">Как используются данные<ChevronRight size={18} className="ml-auto text-white/30" /></button>
      <button type="button" onClick={() => setPage("help")} className="flex h-[52px] w-full items-center border-t border-white/10 px-4 text-left text-[17px]">Помощь</button>
      <button type="button" onClick={() => setPage("terms")} className="flex h-[52px] w-full items-center border-t border-white/10 px-4 text-left text-[17px]">Условия</button>
      <button type="button" onClick={() => setScreen("auth")} className="flex h-[52px] w-full items-center border-t border-white/10 px-4 text-left text-[17px] text-[#ff453a]">Выйти</button>
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
  return <div><SheetHeader title="Номер телефона" done={false} /><p className="mt-2 px-1 text-[13px] leading-5 text-white/50">Номер сохранится в аккаунте. Код подтверждения появится, когда подключим отправку сообщений.</p><input value={value} onChange={(e) => setValue(e.target.value)} inputMode="tel" placeholder="+7 900 000-00-00" className="mt-4 h-14 w-full rounded-2xl bg-[#2c2c2e] px-4 text-[20px] outline-none placeholder:text-white/30" /><button onClick={submit} className="mt-4 h-[54px] w-full rounded-full bg-[#ff6b00] text-[17px] font-semibold">Продолжить</button></div>;
}

function Sheets() {
  const sheet = useEmbersStore((s) => s.sheet);
  const close = useEmbersStore((s) => s.closeSheet);
  const content: Partial<Record<Exclude<Sheet,null>,React.ReactNode>> = {join:<JoinSheet/>,datetime:<DateSheet/>,location:<LocationSheet/>,invite:<InviteSheet/>,member:<MemberSheet/>,status:<StatusSheet/>,account:<AccountSheet/>,phone:<PhoneSheet/>,files:<FilesSheet/>};
  const tall = ["join","location","invite","files","account"].includes(sheet ?? "");
  const heights: Record<string,string> = {datetime:"h-[560px]",status:"h-[552px]",member:"h-[702px]",account:"h-[420px]",phone:"h-[380px]"};
  return <Drawer.Root open={sheet!==null} onOpenChange={(v)=>!v&&close()} shouldScaleBackground><Drawer.Portal><Drawer.Overlay className="fixed inset-0 z-[150] bg-black/50" /><Drawer.Content className={cn("fixed inset-x-0 bottom-0 z-[160] mx-auto max-w-[393px] overflow-y-auto rounded-t-[38px] bg-[#1c1c1e] px-4 pb-8 outline-none",tall?"h-[calc(100dvh-56px)] max-h-[836px]":heights[sheet??""]??"h-[70dvh]")}><Drawer.Title className="sr-only">{sheet}</Drawer.Title><i className="sticky top-1.5 z-20 mx-auto block h-[5px] w-[37px] rounded bg-[#7f7f7f80]" />{sheet === "account" ? <div className="pt-10">{content.account}</div> : sheet && content[sheet]}</Drawer.Content></Drawer.Portal></Drawer.Root>;
}

export default function EmbersApp() {
  const screen = useEmbersStore((s) => s.screen);
  const views = {auth:<AuthScreen/>,hub:<EventsHub/>,create:<CreateEvent/>,live:<LiveBoard/>,schedule:<ScheduleScreen/>};
  return <main className="grid min-h-dvh place-items-center overflow-hidden bg-[#080402]">
    <div data-vaul-drawer-wrapper="" className="phone-frame relative w-full overflow-hidden bg-black text-white">
      <div key={screen} className={cn("no-scrollbar h-full", screen === "create" || screen === "schedule" ? "overflow-hidden" : "overflow-y-auto")}><div className={cn("relative", screen === "create" || screen === "schedule" ? "h-full" : "min-h-full")}>{views[screen]}</div></div>
    </div><Sheets /><FrameNotice />
  </main>;
}
