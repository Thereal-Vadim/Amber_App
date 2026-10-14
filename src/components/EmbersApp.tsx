"use client";

import Image from "next/image";
import { useState } from "react";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { Drawer } from "vaul";
import {
  BatteryFull, CalendarDays, Camera, Check, ChevronDown, ChevronRight,
  Clock3, Crown, FileText, ImagePlus, Info, Link2, MapPin,
  Mic, Navigation, Phone, Plus, Search, Share2, Signal,
  Sparkles, Users, Wifi, X,
} from "lucide-react";
import {
  type Member, type Sheet, type Status, statusMeta, team, useEmbersStore,
} from "@/store/useEmbersStore";

const spring = { type: "spring" as const, stiffness: 380, damping: 30, mass: 0.8 };
const cn = (...v: Array<string | false | null | undefined>) => v.filter(Boolean).join(" ");

function Press({ children, className, onClick, type = "button" }: {
  children: React.ReactNode; className?: string; onClick?: () => void; type?: "button" | "submit";
}) {
  return <motion.button type={type} whileTap={{ scale: .96 }} transition={spring} onClick={onClick} className={className}>{children}</motion.button>;
}

function Asset({ src, className = "h-5 w-5" }: { src: string; className?: string }) {
  return <Image alt="" src={src} width={48} height={48} className={className} />;
}

function StatusBar({ time = "9:41" }: { time?: string }) {
  return <div className="absolute inset-x-0 top-0 z-[90] flex h-[44px] items-center justify-between px-10 text-[15px] font-semibold tabular">
    <span>{time}</span>
    <span className="flex items-center gap-2"><Signal size={14} strokeWidth={3} /><Wifi size={14} strokeWidth={3} /><BatteryFull size={20} /></span>
  </div>;
}

function HomeBar() {
  return <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[90] flex h-7 items-end justify-center pb-2"><i className="h-[5px] w-[135px] rounded-full bg-white" /></div>;
}

function Avatar({ member, size = 44 }: { member: Member; size?: number }) {
  return <span style={{ width: size, height: size, background: member.color }} className="grid shrink-0 place-items-center rounded-full border-2 border-white text-sm font-semibold shadow-sm">{member.initials}</span>;
}

function StatusPill({ status }: { status: Status }) {
  const meta = statusMeta[status];
  return <span style={{ color: meta.color, background: `${meta.color}2e` }} className="inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[13px] font-semibold"><i style={{ background: meta.color }} className="h-2 w-2 rounded-full" />{meta.label}</span>;
}

function CircleButton({ children, onClick, light = false }: { children: React.ReactNode; onClick?: () => void; light?: boolean }) {
  return <Press onClick={onClick} className={cn("grid h-11 w-11 place-items-center rounded-full", light ? "bg-white text-black" : "bg-white/10 text-white")}>{children}</Press>;
}

function AuthScreen() {
  const setScreen = useEmbersStore((s) => s.setScreen);
  return <div className="figma-gradient relative h-full min-h-[852px] overflow-hidden text-center" data-node-id="2:3">
    <StatusBar />
    <div className="absolute left-1/2 top-[206px] grid h-24 w-24 -translate-x-1/2 place-items-center rounded-[28px] border border-white/35 bg-white/15">
      <Asset src="/figma-flame.svg" className="h-12 w-12" />
    </div>
    <h1 className="absolute inset-x-0 top-[327px] text-5xl font-extrabold tracking-[-.02em]">Embers</h1>
    <h2 className="absolute inset-x-0 top-[395px] text-xl font-semibold">Вся команда на одной карте</h2>
    <p className="absolute left-9 right-9 top-[430px] text-[15px] leading-5 text-[#ebebf599]">Кто где, что делает и сколько осталось —<br />в реальном времени на любом событии</p>
    <div className="absolute inset-x-5 top-[640px] space-y-3">
      <Press onClick={() => setScreen("hub")} className="flex h-[54px] w-full items-center justify-center gap-2 rounded-full bg-white text-[17px] font-semibold text-black"><Asset src="/figma-apple.svg" />Войти через Apple</Press>
      <Press onClick={() => setScreen("hub")} className="flex h-[54px] w-full items-center justify-center gap-2 rounded-full border border-white/30 bg-white/15 text-[17px] font-semibold"><Asset src="/figma-phone.svg" />Войти по номеру</Press>
    </div>
    <p className="absolute inset-x-9 top-[776px] text-xs leading-4 text-[#ebebf599]">Продолжая, вы принимаете Условия использования<br />и Политику конфиденциальности</p>
  </div>;
}

function HubHeader() {
  const setScreen = useEmbersStore((s) => s.setScreen);
  return <div className="absolute inset-x-5 top-[58px] z-10 flex h-11 items-center">
    <h1 className="text-[34px] font-bold tracking-tight">События</h1><ChevronDown size={22} className="ml-1 text-white/60" />
    <div className="ml-auto flex gap-2">
      <CircleButton onClick={() => setScreen("create")}><Plus size={22} /></CircleButton>
      <span className="grid h-11 w-11 place-items-center rounded-full bg-[#9c613d] text-base font-semibold">ВФ</span>
    </div>
  </div>;
}

function EmptyHub() {
  const open = useEmbersStore((s) => s.openSheet);
  const setScreen = useEmbersStore((s) => s.setScreen);
  return <div data-node-id="2:57">
    <div className="absolute left-14 right-14 top-[150px] h-10 rounded-[28px] bg-white/5" />
    <div className="absolute left-[38px] right-[38px] top-[164px] h-10 rounded-[30px] bg-white/[.07]" />
    <div className="absolute inset-x-5 top-[180px] flex h-[330px] flex-col items-center rounded-[32px] border border-white/[.08] bg-white/10 text-center">
      <span className="mt-[34px] grid h-[104px] w-[104px] place-items-center rounded-full bg-orange-500/25"><CalendarDays size={48} className="text-[#ff6b00]" /></span>
      <h2 className="mt-6 text-[26px] font-bold">Пока нет событий</h2>
      <p className="mt-2 px-5 text-[15px] leading-5 text-[#ebebf599]">Создайте событие и пригласите команду<br />или присоединитесь по ссылке<br />от организатора</p>
    </div>
    <div className="absolute inset-x-5 top-[560px] space-y-3">
      <Press onClick={() => setScreen("create")} className="flex h-[54px] w-full items-center justify-center gap-2 rounded-full bg-[#ff6b00] text-[17px] font-semibold"><Plus size={18} />Создать событие</Press>
      <Press onClick={() => open("join")} className="flex h-[54px] w-full items-center justify-center gap-2 rounded-full border border-white/15 bg-white/15 text-[16px] font-semibold"><Link2 size={18} />Присоединиться по ссылке или коду</Press>
    </div>
  </div>;
}

function EventCard() {
  const setScreen = useEmbersStore((s) => s.setScreen);
  return <motion.button layoutId="event-card" onClick={() => setScreen("live")} whileTap={{ scale: .98 }} transition={spring} className="absolute left-5 top-32 h-[620px] w-[331px] overflow-hidden rounded-[36px] bg-gradient-to-b from-[#ff8a1f] via-[#d2321c] via-45% to-[#3b0b22] text-center shadow-2xl">
    <div className="absolute -left-16 top-10 h-[300px] w-[300px] rounded-full bg-[radial-gradient(circle_at_35%_30%,#ffd18b_0%,#ff7a1c_35%,transparent_68%)] opacity-90 blur-sm" />
    <div className="absolute inset-x-0 bottom-0 h-80 bg-gradient-to-b from-transparent to-black/55" />
    <span className="absolute left-4 top-4 flex h-8 items-center gap-1.5 rounded-full bg-white/20 px-3 text-[13px] font-semibold"><Asset src="/figma-crown.svg" className="h-3.5 w-3.5" />Организатор</span>
    <span className="absolute right-4 top-4 flex h-8 items-center gap-1.5 rounded-full bg-black/30 px-3 text-[13px] font-bold"><i className="h-2 w-2 rounded-full bg-red-500" />LIVE</span>
    <div className="absolute inset-x-0 top-[370px] flex justify-center -space-x-2">{team.slice(0, 4).map((m) => <Avatar key={m.id} member={m} size={36} />)}</div>
    <h2 className="absolute inset-x-0 top-[422px] text-[34px] font-extrabold tracking-tight">Городское окно</h2>
    <p className="absolute inset-x-0 top-[470px] text-[17px] font-semibold">Суббота, 18 октября · 08:00</p>
    <p className="absolute inset-x-0 top-[496px] text-[15px] text-white/75">ВДНХ, павильон 57</p>
    <span className="absolute left-1/2 top-[540px] flex h-9 -translate-x-1/2 items-center gap-2 rounded-full bg-white/20 px-4 text-[15px] font-semibold"><Asset src="/figma-users.svg" className="h-4 w-4" />12 в команде</span>
  </motion.button>;
}

function EventsHub() {
  const has = useEmbersStore((s) => s.hasEvents);
  const toggle = useEmbersStore((s) => s.setHasEvents);
  return <div className="hub-gradient relative h-full min-h-[852px] overflow-hidden" data-node-id={has ? "2:131" : "2:57"}>
    <StatusBar /><HubHeader />{has ? <EventCard /> : <EmptyHub />}
    {has && <><button onClick={() => toggle(false)} className="absolute bottom-[70px] left-1/2 h-2 w-2 -translate-x-4 rounded-full bg-white" /><i className="absolute bottom-[70px] left-1/2 h-2 w-2 rounded-full bg-white/30" /><i className="absolute bottom-[70px] left-1/2 ml-4 h-2 w-2 rounded-full bg-white/30" /></>}
  </div>;
}

function CreateEvent() {
  const setScreen = useEmbersStore((s) => s.setScreen);
  const open = useEmbersStore((s) => s.openSheet);
  return <div className="figma-gradient relative h-full min-h-[852px]" data-node-id="2:347">
    <StatusBar />
    <div className="absolute left-4 top-[58px]"><CircleButton onClick={() => setScreen("hub")}><X size={20} /></CircleButton></div>
    <button className="absolute right-4 top-[58px] h-11 rounded-full bg-white/20 px-4 text-[15px] font-semibold">Предпросмотр</button>
    <button className="absolute left-1/2 top-[110px] grid h-16 w-16 -translate-x-1/2 place-items-center rounded-full bg-white/20"><ImagePlus size={28} /></button>
    <button className="absolute left-1/2 top-[184px] h-[34px] -translate-x-1/2 rounded-full bg-white/20 px-3.5 text-[15px] font-semibold">Добавить обложку</button>
    <div className="absolute inset-x-4 top-[240px] h-[226px] rounded-[32px] bg-[#1a040861] px-5 pt-5">
      <input placeholder="Название события" className="h-14 w-full bg-transparent text-[34px] font-bold tracking-tight outline-none placeholder:text-white/45" />
      <button onClick={() => open("datetime")} className="mt-3 flex h-[62px] w-full items-center gap-3 border-t border-white/15 text-[17px] text-white/70"><CalendarDays size={22} />Дата и время</button>
      <button onClick={() => open("location")} className="flex h-[62px] w-full items-center gap-3 border-t border-white/15 text-[17px] text-white/70"><MapPin size={22} />Локация</button>
    </div>
    <div className="absolute inset-x-4 top-[478px] h-[124px] rounded-[32px] bg-[#1a040861] p-5">
      <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-full bg-[#9c613d] text-sm font-semibold">ВФ</span><div><p className="text-[13px] text-white/60">Организатор</p><p className="text-[17px] font-semibold">Вадим Филатов</p></div></div>
      <button className="absolute bottom-4 left-1/2 h-9 -translate-x-1/2 rounded-full bg-white/90 px-4 text-[15px] font-semibold text-black">Добавить описание</button>
    </div>
    <div className="absolute inset-x-4 top-[614px] h-[152px] rounded-[32px] bg-[#1a040861] px-5 pt-4">
      <p className="text-[13px] font-medium text-white/60">ДЛЯ КОМАНДЫ</p>
      <button onClick={() => open("invite")} className="mt-2 flex h-[55px] w-full items-center gap-3 text-left"><Users size={22} /><span className="flex-1"><b className="block text-[17px]">Команда</b><small className="text-[13px] text-white/60">Добавьте людей и роли</small></span><ChevronRight size={18} /></button>
      <button onClick={() => setScreen("schedule")} className="flex h-[55px] w-full items-center gap-3 border-t border-white/15 text-left"><FileText size={22} /><span className="flex-1"><b className="block text-[17px]">Программа</b><small className="text-[13px] text-white/60">Загрузите PDF, Excel или фото тайминга</small></span><ChevronRight size={18} /></button>
    </div>
  </div>;
}

function Timeline() {
  return <div className="rounded-[28px] bg-white/10 p-4">
    <div className="flex items-center justify-between"><div><p className="text-[11px] font-semibold text-[#ff6b00]">СЕЙЧАС</p><p className="text-5xl font-bold tracking-[-.04em] tabular">18:54</p></div><div className="text-right text-[12px] font-semibold"><p>Награждение в 19:30</p><p className="text-[#ff6b00]">через 36 мин</p></div></div>
    <div className="relative mt-5"><div className="h-1.5 rounded-full bg-white/15"><div className="h-full w-[48%] rounded-full bg-[#ff6b00]" /></div><i className="absolute left-[48%] top-[-4px] h-3.5 w-3.5 rounded-full border-[3px] border-[#ff6b00] bg-white" /><i className="absolute left-[58%] top-0 h-2 w-2 rounded-full bg-yellow-300" /></div>
    <div className="mt-2 flex justify-between text-[9px] text-white/45 tabular">{[16,17,18,19,20,21,22].map((h) => <span key={h}>{h}</span>)}</div>
  </div>;
}

function MapCard() {
  const open = useEmbersStore((s) => s.openSheet);
  return <div className="rounded-[28px] bg-white/10 p-4"><h3 className="text-xl font-bold">Карта</h3><p className="mt-0.5 text-[11px] text-white/45">6 на площадке · 3 в пути</p>
    <div className="relative mt-2 h-[164px] overflow-hidden rounded-[18px] bg-[#26262b]">
      <i className="absolute -left-5 top-20 h-2 w-[420px] rotate-[8deg] bg-[#3a3a42]" /><i className="absolute left-28 -top-10 h-[260px] w-3 rotate-[8deg] bg-[#3a3a42]" /><i className="absolute right-14 -top-10 h-[260px] w-2 -rotate-12 bg-[#3a3a42]" />
      <span className="absolute right-10 top-3 h-[70px] w-[110px] rounded-[18px] bg-green-500/20" />
      <span className="absolute left-[168px] top-[72px] rounded-full bg-black/70 px-2 py-1 text-[9px] font-semibold">Сцена А</span>
      {team.map((m) => <button key={m.id} onClick={() => open("member", m.id)} style={{ left: `${m.coords.x}%`, top: `${m.coords.y}%` }} className="absolute -translate-x-1/2 -translate-y-1/2"><Avatar member={m} size={30} /></button>)}
    </div>
    <button className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-full bg-white/15 text-[13px] font-semibold"><Asset src="/figma-nav.svg" className="h-4 w-4" />Маршрут и карта</button>
  </div>;
}

function TeamList() {
  const filter = useEmbersStore((s) => s.teamFilter);
  const setFilter = useEmbersStore((s) => s.filterTeam);
  const open = useEmbersStore((s) => s.openSheet);
  const visible = filter === "all" ? team : team.filter((m) => m.status === filter);
  return <><LayoutGroup><div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 py-3">
    {[["all","Все · 12"],["on_site","На площадке · 6"],["in_transit","В пути · 3"]].map(([id,label]) => <button key={id} onClick={() => setFilter(id as "all" | Status)} className={cn("relative shrink-0 rounded-full px-3 py-2 text-[13px]", filter === id ? "text-black" : "bg-white/10")} >{filter === id && <motion.i layoutId="filter" transition={spring} className="absolute inset-0 rounded-full bg-white" />}<span className="relative">{label}</span></button>)}
  </div></LayoutGroup><h2 className="mb-3 text-xl font-bold">Команда</h2>
    <AnimatePresence mode="popLayout">{visible.map((m) => <motion.button layout key={m.id} onClick={() => open("member", m.id)} className="mb-2 flex h-[104px] w-full items-start gap-3 rounded-[24px] bg-white/10 p-4 text-left">
      <Avatar member={m} /><div className="min-w-0 flex-1"><div className="flex items-start justify-between"><div><b className="block text-[15px]">{m.name}</b><small className="text-[11px] text-white/45">{m.role}</small></div><StatusPill status={m.status} /></div><div className="mt-1 flex justify-between text-[13px]"><span>{m.spot}</span><b className="text-[#ff6b00]">{m.currentTask.split("· ").at(-1)}</b></div><p className="truncate text-[10px] text-white/40">дальше {m.next}</p></div>
    </motion.button>)}</AnimatePresence></>;
}

function LiveBoard() {
  const setScreen = useEmbersStore((s) => s.setScreen);
  const open = useEmbersStore((s) => s.openSheet);
  const myStatus = useEmbersStore((s) => s.myStatus);
  return <div className="relative min-h-[1520px] bg-black pb-8" data-node-id="2:598">
    <div className="figma-gradient absolute inset-x-0 top-0 h-[460px]" /><StatusBar />
    <div className="absolute left-4 top-[58px]"><CircleButton onClick={() => setScreen("hub")}><Asset src="/figma-back.svg" /></CircleButton></div>
    <div className="absolute right-4 top-[58px] flex gap-2"><CircleButton><Asset src="/figma-share.svg" /></CircleButton><span className="grid h-11 w-11 place-items-center rounded-full bg-[#9c613d] text-sm font-semibold">ВФ</span></div>
    <div className="relative px-4 pt-28">
      <div className="text-center"><span className="inline-flex h-[30px] items-center gap-1 rounded-full bg-black/30 px-3 text-[11px] font-bold"><i className="h-2 w-2 rounded-full bg-red-500" />LIVE</span><h1 className="mt-2 text-[28px] font-extrabold tracking-tight">Городское окно</h1><p className="text-[11px] text-white/85">Суббота, 18 октября · ВДНХ, павильон 57</p></div>
      <div className="mt-4"><Timeline /></div>
      <div className="mt-3 flex h-[52px] items-center rounded-[22px] bg-white/10 px-3"><span className="grid h-9 w-9 place-items-center rounded-full bg-green-500/20"><MapPin size={18} className="text-green-400" /></span><div className="ml-3 flex-1"><p className="text-[10px] text-white/45">Мой статус</p><p className="text-[13px] font-semibold">{statusMeta[myStatus].label}</p></div><button onClick={() => open("status")} className="h-9 rounded-full bg-[#ff6b00] px-4 text-xs font-semibold">Сменить</button></div>
      <div className="mt-3"><MapCard /></div><TeamList />
    </div>
  </div>;
}

function SheetHeader({ title, done = true }: { title: string; done?: boolean }) {
  const close = useEmbersStore((s) => s.closeSheet);
  return <div className="relative flex h-[58px] items-center justify-center"><CircleButton onClick={close}><X size={20} /></CircleButton><h2 className="absolute inset-x-16 text-center text-[17px] font-semibold">{title}</h2>{done && <div className="ml-auto"><CircleButton onClick={close} light><Check size={20} /></CircleButton></div>}</div>;
}

function JoinSheet() {
  const join = useEmbersStore((s) => s.joinByCode);
  const [role, setRole] = useState("Видео");
  const [code] = useState("K7Q2");
  return <div data-node-id="2:273"><SheetHeader title="Присоединиться" /><p className="ml-5 mt-2 text-[12px] text-white/50">КОД ПРИГЛАШЕНИЯ</p>
    <div className="mt-2 grid grid-cols-6 gap-2">{Array.from({length:6}).map((_,i) => <div key={i} className={cn("grid h-[62px] place-items-center rounded-[14px] bg-[#2c2c2e] text-[28px] font-semibold", i === 4 && "border-2 border-[#ff6b00]")}>{code[i] ?? ""}{i === 4 && <i className="h-[30px] w-0.5 bg-[#ff6b00]" />}</div>)}</div>
    <p className="ml-5 mt-2 text-[12px] text-white/50">Код есть в приглашении от организатора</p>
    <div className="mt-4 overflow-hidden rounded-[20px] bg-[#2c2c2e]"><button className="flex h-[52px] w-full items-center gap-3 px-4 text-[17px]"><Asset src="/figma-link.svg" className="h-[22px] w-[22px]" />Вставить ссылку<ChevronRight className="ml-auto text-white/40" size={18} /></button><button className="flex h-[52px] w-full items-center gap-3 border-t border-white/15 px-4 text-[17px]"><Asset src="/figma-qr.svg" className="h-[22px] w-[22px]" />Сканировать QR-код<ChevronRight className="ml-auto text-white/40" size={18} /></button></div>
    <p className="ml-5 mt-5 text-[12px] text-white/50">ПРЕДПРОСМОТР</p>
    <div className="mt-2 rounded-[20px] bg-[#2c2c2e] p-4"><div className="flex items-center gap-3"><span className="h-14 w-14 rounded-[14px] bg-gradient-to-b from-[#ff8a1f] via-[#d2321c] to-[#3b0b22]" /><div><b className="text-[17px]">Городское окно</b><p className="text-[12px] text-white/50">Пригласил Вадим Филатов · 12 в команде</p></div></div><div className="my-4 h-px bg-white/15" /><b className="text-[14px]">Выберите свою роль</b><div className="mt-3 flex flex-wrap gap-2">{["Свет","Звук","Видео","Фото","Продюсер","Площадка","Техник"].map((r) => <button key={r} onClick={() => setRole(r)} className={cn("h-9 rounded-full px-3.5 text-[14px]", role === r ? "bg-[#ff6b00]" : "bg-white/10")}>{r}</button>)}</div></div>
    <button onClick={() => join("K7Q2X9")} className="mt-[98px] h-[54px] w-full rounded-full bg-[#ff6b00] text-[17px] font-semibold">Присоединиться</button>
  </div>;
}

function DateSheet() {
  return <div data-node-id="2:407"><SheetHeader title="Дата и время" /><div className="mt-2 overflow-hidden rounded-[20px] bg-[#2c2c2e]"><div className="flex h-[52px] items-center px-4 text-[17px]">Весь день<span className="ml-auto h-[31px] w-[51px] rounded-full bg-[#39393d] p-0.5"><i className="block h-[27px] w-[27px] rounded-full bg-white" /></span></div><div className="flex h-[52px] items-center border-t border-white/15 px-4 text-[17px]">Начало<span className="ml-auto mr-2 rounded-lg bg-white/10 px-2.5 py-1.5">Сб, 18 окт. 2026 г.</span><span className="rounded-lg bg-white/10 px-2.5 py-1.5 tabular">08:00</span></div><div className="flex h-[52px] items-center border-t border-white/15 px-4 text-[17px]">Добавить время окончания</div></div><div className="mt-4 flex h-[52px] items-center rounded-[20px] bg-[#2c2c2e] px-4 text-[17px]">Часовой пояс<span className="ml-auto text-white/50">Москва</span><ChevronRight size={18} className="ml-2 text-white/40" /></div><p className="mt-3 px-4 text-[12px] leading-4 text-white/50">Время начала увидит вся команда. Тайминг программы<br />подстроится под эту дату автоматически.</p></div>;
}

function LocationSheet() {
  const places = [["Текущее местоположение","ВДНХ, Москва"],["ВДНХ, павильон 57","Проспект Мира, 119с57"],["Парк Горького","Крымский Вал, 9"],["Мосфильм, павильон 3","Мосфильмовская ул., 1"]];
  return <div data-node-id="2:448"><SheetHeader title="Локация" /><div className="flex h-10 items-center gap-2 rounded-xl bg-[#2c2c2e] px-3 text-[#8e8e93]"><Search size={20} /><span>Поиск адреса или места</span><Mic size={19} className="ml-auto" /></div><h3 className="mb-3 mt-6 text-xl font-bold">Подсказки</h3><div className="overflow-hidden rounded-[20px] bg-[#2c2c2e]">{places.map(([name,address],i) => <button key={name} className="flex h-16 w-full items-center gap-3 px-4 text-left"><span className={cn("grid h-9 w-9 place-items-center rounded-full", i===0 ? "bg-blue-500" : i===1 ? "bg-[#ff6b00]" : "bg-white/20")}><MapPin size={20} /></span><div className={cn("flex h-full flex-1 flex-col justify-center", i>0 && "border-t border-white/15")}><span className="text-[17px]">{name}</span><small className="text-[12px] text-white/50">{address}</small></div></button>)}</div><p className="ml-5 mt-5 text-[12px] text-white/50">НАЗВАНИЕ МЕСТА</p><input placeholder="Например, Сцена А или Гримвагон" className="mt-2 h-12 w-full rounded-xl bg-[#2c2c2e] px-4 text-[17px] outline-none placeholder:text-[#8e8e93]" /><p className="mt-3 px-4 text-[12px] leading-4 text-white/50">Название увидит вся команда — его удобно использовать<br />в статусах и на карте.</p></div>;
}

function InviteSheet() {
  return <div data-node-id="2:511"><SheetHeader title="Команда" /><div className="mt-2 flex h-[150px] items-center gap-4 rounded-[20px] bg-[#2c2c2e] p-4"><span className="grid h-24 w-24 place-items-center rounded-2xl bg-white"><Asset src="/figma-qr-large.svg" className="h-[76px] w-[76px]" /></span><div><b className="text-[17px]">Пригласите команду</b><p className="text-[15px] text-[#ff6b00]">embers.app/j/K7Q2X9</p><p className="text-[12px] text-white/50">Код: K7Q2X9</p><button className="mt-3 flex h-9 items-center gap-2 rounded-full bg-[#ff6b00] px-3.5 text-[14px] font-semibold"><Share2 size={16} />Поделиться</button></div></div><p className="ml-5 mt-5 text-[12px] text-white/50">УЧАСТНИКИ · 6</p><div className="mt-2 overflow-hidden rounded-[20px] bg-[#2c2c2e]"><div className="flex h-[60px] items-center gap-3 px-4"><span className="grid h-10 w-10 place-items-center rounded-full bg-[#ff6b00]">ВФ</span><div><p>Вадим Филатов <Crown size={13} className="inline text-[#ff6b00]" /></p><small className="text-white/50">Организатор</small></div></div>{team.map((m) => <div key={m.id} className="ml-4 flex h-[60px] items-center gap-3 border-t border-white/15 pr-4"><Avatar member={m} size={40} /><div><p>{m.name}</p><small className="text-white/50">{m.role}</small></div><ChevronRight size={18} className="ml-auto text-white/40" /></div>)}<button className="ml-4 flex h-[56px] w-[calc(100%-1rem)] items-center gap-3 border-t border-white/15 text-[#ff6b00]"><span className="grid h-10 w-10 place-items-center rounded-full bg-orange-500/15"><Plus /></span>Добавить роль</button></div></div>;
}

function MemberSheet() {
  const id = useEmbersStore((s) => s.selectedMemberId);
  const member = team.find((m) => m.id === id) ?? team[0];
  return <div data-node-id="2:890"><div className="flex h-11"><CircleButton onClick={useEmbersStore.getState().closeSheet}><X size={20} /></CircleButton></div><div className="flex flex-col items-center"><Avatar member={member} size={88} /><h2 className="mt-3 text-[26px] font-bold">{member.name}</h2><p className="text-[15px] text-white/50">{member.role} · {member.roleLong?.toLowerCase()}</p><div className="mt-2"><StatusPill status={member.status} /></div></div><div className="mt-5 grid grid-cols-3 gap-4">{[[Phone,"Позвонить"],[Sparkles,"Написать"],[MapPin,"На карте"]].map(([Icon,label]) => { const C = Icon as typeof Phone; return <button key={label as string} className="flex h-16 flex-col items-center justify-center gap-1 rounded-2xl bg-[#2c2c2e] text-[12px] font-medium text-[#ff6b00]"><C size={21} />{label as string}</button>; })}</div><div className="mt-4 overflow-hidden rounded-[20px] bg-[#2c2c2e] px-4">{[["Где","Сцена А · ВДНХ, павильон 57"],["Сейчас · ещё 36 мин","Монтаж света"],["Дальше · 19:30","Свет на награждении"]].map(([l,v],i) => <div key={l} className={cn("flex h-16 flex-col justify-center pl-9", i>0 && "border-t border-white/15")}><small className="text-white/50">{l}</small><span className="text-[17px]">{v}</span></div>)}</div><p className="ml-5 mt-4 text-[12px] text-white/50">ДЕНЬ КОСТИ</p><div className="mt-2 rounded-[20px] bg-[#2c2c2e] p-4"><div className="relative flex gap-[3px]">{["w-[12%] bg-[#636366]","w-[22%] bg-[#5e5ce6]","w-[9%] bg-[#ffd60a]","w-[28%] bg-[#30d158]","w-[12%] bg-[#ff6b00]","flex-1 bg-[#5e5ce6]"].map((c,i) => <i key={i} className={cn("h-3 rounded",c)} />)}<b className="absolute left-[55%] -top-1.5 h-6 w-0.5 bg-white" /></div><div className="mt-3 flex justify-between text-[10px] text-white/50"><span>08</span><span>12</span><span>16</span><span>20</span><span>23</span></div></div></div>;
}

function StatusSheet() {
  const current = useEmbersStore((s) => s.myStatus);
  const update = useEmbersStore((s) => s.updateMyStatus);
  const share = useEmbersStore((s) => s.shareLocation);
  const toggle = useEmbersStore((s) => s.toggleShareLocation);
  const items: Array<[Status,string,string,React.ReactNode]> = [["on_site","На площадке","Я на месте",<MapPin key="p" />],["in_transit","В пути","Еду, отмечу время в пути",<Navigation key="n" />],["ready","Готов","Можно начинать",<Check key="c" />],["gathering","Сбор","Собираю команду",<Users key="u" />]];
  return <div data-node-id="2:960"><SheetHeader title="Мой статус" /><div className="mt-2 grid grid-cols-2 gap-4">{items.map(([id,label,sub,icon]) => <button key={id} onClick={() => update(id)} className={cn("relative flex h-[150px] flex-col items-start rounded-[24px] border-2 bg-[#2c2c2e] p-4 text-left", current===id ? "border-[#30d158]" : "border-transparent")}><span style={{ color: statusMeta[id].color, background: `${statusMeta[id].color}32` }} className="grid h-[52px] w-[52px] place-items-center rounded-full">{icon}</span><b className="mt-4 text-[17px]">{label}</b><small className="text-[12px] text-white/50">{sub}</small>{current===id && <span className="absolute right-4 top-4 grid h-6 w-6 place-items-center rounded-full bg-[#30d158] text-black"><Check size={15} /></span>}</button>)}</div><button onClick={toggle} className="mt-5 flex h-[52px] w-full items-center rounded-[20px] bg-[#2c2c2e] px-4 text-[17px]">Делиться геопозицией<span className={cn("ml-auto h-[31px] w-[51px] rounded-full p-0.5",share?"bg-[#34c759]":"bg-[#39393d]")}><i className={cn("block h-[27px] w-[27px] rounded-full bg-white transition-transform",share&&"translate-x-5")} /></span></button><p className="mt-3 px-4 text-[12px] text-white/50">Команда увидит ваш статус и точку на карте</p></div>;
}

function ScheduleScreen() {
  const setScreen = useEmbersStore((s) => s.setScreen);
  const blocks = useEmbersStore((s) => s.schedule);
  const add = useEmbersStore((s) => s.addScheduleBlock);
  const remove = useEmbersStore((s) => s.removeScheduleBlock);
  const configured = blocks.length > 0;
  return <div className="relative min-h-[852px] bg-black" data-node-id={configured ? "4:88" : "4:2"}><StatusBar time="20:01" /><button onClick={() => setScreen("live")} className="absolute left-[15px] top-[59px] grid h-11 w-11 place-items-center rounded-full border border-white/10 bg-[#28282ae6]"><Asset src="/figma-schedule-back.svg" className="h-6 w-6" /></button><div className="absolute inset-x-16 top-[69px] flex items-center justify-center gap-2"><span className="grid h-6 w-6 place-items-center rounded-md bg-[#ff6b00]"><Asset src="/figma-calendar.svg" className="h-4 w-4" /></span><b className="text-[17px]">{configured ? "Расписание · Костя" : "Новое расписание"}</b><ChevronDown size={18} className="rounded-full bg-white/20 p-0.5" /></div>
    {!configured && <><span className="absolute left-1/2 top-[103px] -translate-x-1/2 rounded-full bg-[#2c2c2e] px-3 py-1 text-[12px] text-white/80">🔵 Костя Белов · Свет</span><p className="absolute inset-x-4 top-[152px] text-center text-[15px] leading-5 text-[#8e8e93]">Чтобы составить расписание, добавьте<br />локации из области внизу.</p></>}
    {configured && <div className="absolute inset-x-[17px] top-[129px]">{blocks.map((b,i) => <motion.div layout key={b.id}>{i>0&&<div className="flex h-11 items-center justify-center text-[12px] text-[#8e8e93]"><Clock3 size={14} className="mr-1" />переход 10 мин</div>}<div className="relative rounded-[28px] bg-[#2c2c2e] p-4"><div className="flex items-center gap-2"><span style={{background:b.color}} className="grid h-6 w-6 place-items-center rounded-md"><Camera size={15} /></span><b className="text-[19px]">{b.location}</b><button onClick={() => remove(b.id)} className="ml-auto grid h-6 w-6 place-items-center rounded-full bg-[#636366]"><X size={14} /></button></div><p className="mt-3 text-[18px]">« <span className="rounded-lg bg-[#ff6b0038] px-2 py-1 text-[#ff6b00]">{b.task}</span> »</p><p className="mt-3 text-[18px]">с <span className="rounded-lg bg-[#ff6b0038] px-2 py-1 text-[#ff6b00] tabular">{b.time}</span></p></div></motion.div>)}</div>}
    <div className={cn("absolute bottom-5 rounded-[34px] border border-white/10 bg-[#1e1e20] shadow-2xl", configured ? "inset-x-[21px] h-[124px] p-4" : "inset-x-2 h-[441px] p-5")}><i className="absolute left-1/2 top-1.5 h-[5px] w-[60px] -translate-x-1/2 rounded bg-[#6e6e73]" /><div className="mt-1 flex gap-2"><div className="flex h-11 flex-1 items-center gap-2 rounded-full bg-[#3a3a3e] px-3 text-[#8e8e93]"><MapPin size={20} />Новая локация</div><button onClick={() => add("Главная сцена")} className="grid h-11 w-11 place-items-center rounded-full bg-[#ff6b00]"><Plus size={24} /></button></div>{!configured&&<><div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">{["Сцена","Служебные","Гости"].map((x)=><span key={x} className="shrink-0 rounded-full bg-[#3a3a3e] px-4 py-2 text-[15px] font-medium text-[#ff6b00]">{x}</span>)}</div><p className="mt-3 text-[10px] font-semibold text-[#8e8e93]">СТАНДАРТНЫЕ ЛОКАЦИИ</p><div className="mt-2 space-y-2">{[["Главная сцена","#ff3b30"],["Фотозона","#af52de"],["Склад","#34c759"],["Офис","#007aff"]].map(([n,c])=><button onClick={()=>add(n)} key={n} className="flex h-12 w-full items-center gap-3 rounded-full bg-[#2c2c2e] px-3 text-[17px]"><span style={{background:c}} className="grid h-7 w-7 place-items-center rounded-lg"><Sparkles size={16}/></span>{n}<Info size={20} className="ml-auto text-white/50"/></button>)}</div></>}</div>
  </div>;
}

function Sheets() {
  const sheet = useEmbersStore((s) => s.sheet);
  const close = useEmbersStore((s) => s.closeSheet);
  const content: Partial<Record<Exclude<Sheet,null>,React.ReactNode>> = {join:<JoinSheet/>,datetime:<DateSheet/>,location:<LocationSheet/>,invite:<InviteSheet/>,member:<MemberSheet/>,status:<StatusSheet/>};
  const tall = ["join","location","invite"].includes(sheet ?? "");
  const heights: Record<string,string> = {datetime:"h-[492px]",status:"h-[552px]",member:"h-[702px]"};
  return <Drawer.Root open={sheet!==null} onOpenChange={(v)=>!v&&close()} shouldScaleBackground><Drawer.Portal><Drawer.Overlay className="fixed inset-0 z-[150] bg-black/50" /><Drawer.Content className={cn("fixed inset-x-0 bottom-0 z-[160] mx-auto max-w-[393px] overflow-y-auto rounded-t-[38px] bg-[#1c1c1e] px-4 pb-8 outline-none",tall?"h-[calc(100dvh-56px)] max-h-[836px]":heights[sheet??""]??"h-[70dvh]")}><Drawer.Title className="sr-only">{sheet}</Drawer.Title><i className="sticky top-1.5 z-20 mx-auto block h-[5px] w-[37px] rounded bg-[#7f7f7f80]" />{sheet&&content[sheet]}</Drawer.Content></Drawer.Portal></Drawer.Root>;
}

export default function EmbersApp() {
  const screen = useEmbersStore((s) => s.screen);
  const views = {auth:<AuthScreen/>,hub:<EventsHub/>,create:<CreateEvent/>,live:<LiveBoard/>,schedule:<ScheduleScreen/>};
  return <main className="grid min-h-dvh place-items-center overflow-hidden bg-[#080402]">
    <div data-vaul-drawer-wrapper="" className="phone-frame relative h-dvh min-h-[852px] w-full max-w-[393px] overflow-hidden bg-black text-white">
      <div className="no-scrollbar h-full overflow-y-auto"><AnimatePresence mode="wait"><motion.div key={screen} initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="min-h-full">{views[screen]}</motion.div></AnimatePresence></div><HomeBar />
    </div><Sheets />
  </main>;
}
