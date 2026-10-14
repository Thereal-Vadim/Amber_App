"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { Drawer } from "vaul";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowLeft, ArrowRight, BatteryFull, CalendarDays, Camera, Check, ChevronRight,
  Clock3, Copy, Flame, ImagePlus, Link2, LocateFixed, MapPin, MessageCircle,
  MoreHorizontal, Navigation, Phone, Plus, QrCode, Radio, Search, Share2,
  Signal, Sparkles, Trash2, Users, Wifi, X, Zap,
} from "lucide-react";
import { type Member, type Sheet, type Status, statusMeta, team, useEmbersStore } from "@/store/useEmbersStore";

const spring = { type: "spring" as const, stiffness: 380, damping: 30, mass: 0.8 };
const tap = { scale: 0.96 };
const cn = (...values: Array<string | false | null | undefined>) => values.filter(Boolean).join(" ");

function Pressable({ children, className, onClick, type = "button", disabled }: {
  children: React.ReactNode; className?: string; onClick?: () => void; type?: "button" | "submit"; disabled?: boolean;
}) {
  return <motion.button type={type} disabled={disabled} whileTap={tap} transition={spring} onClick={onClick} className={cn("select-none disabled:opacity-45", className)}>{children}</motion.button>;
}

function Avatar({ member, size = "md" }: { member: Member; size?: "sm" | "md" | "lg" }) {
  return <div style={{ background: `linear-gradient(145deg, ${member.color}, ${member.color}88)` }} className={cn("grid shrink-0 place-items-center rounded-full border border-white/20 font-bold shadow-lg", size === "sm" && "h-8 w-8 text-[10px]", size === "md" && "h-11 w-11 text-xs", size === "lg" && "h-20 w-20 text-xl")}>{member.initials}</div>;
}

function StatusDot({ status, label = true }: { status: Status; label?: boolean }) {
  const meta = statusMeta[status];
  return <span className="inline-flex items-center gap-1.5 text-xs text-white/65"><i className="h-2 w-2 rounded-full shadow-[0_0_10px_currentColor]" style={{ color: meta.color, background: meta.color }} />{label && meta.label}</span>;
}

function IOSStatusBar() {
  return <div className="pointer-events-none absolute inset-x-0 top-0 z-[100] flex h-11 items-center justify-between px-6 text-[12px] font-semibold tabular">
    <span>18:54</span><div className="flex items-center gap-1.5"><Signal size={13} /><Wifi size={13} /><BatteryFull size={16} /></div>
  </div>;
}

function HomeIndicator() {
  return <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[100] flex h-5 items-end justify-center pb-1.5"><div className="h-1 w-32 rounded-full bg-white/70" /></div>;
}

function TopBar({ title, back, right }: { title?: string; back?: () => void; right?: React.ReactNode }) {
  return <header className="relative z-10 flex h-14 items-center justify-between px-5">
    <div className="w-20">{back && <Pressable onClick={back} className="grid h-10 w-10 place-items-center rounded-full bg-white/[.06]"><ArrowLeft size={19} /></Pressable>}</div>
    {title && <div className="text-sm font-semibold">{title}</div>}
    <div className="flex w-20 justify-end">{right}</div>
  </header>;
}

function AuthScreen() {
  const setScreen = useEmbersStore((s) => s.setScreen);
  return <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative flex min-h-full flex-col overflow-hidden px-6 pb-10 pt-20">
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_7%,#d94e1f_0%,#592211_27%,#0d0c0b_67%)]" />
    <div className="absolute left-[-25%] top-[30%] h-72 w-72 rounded-full bg-orange-600/10 blur-3xl" />
    <div className="relative flex flex-1 flex-col items-center justify-center text-center">
      <motion.div initial={{ scale: .7, rotate: -12 }} animate={{ scale: 1, rotate: 0 }} transition={{ ...spring, delay: .15 }} className="glass mb-8 grid h-24 w-24 place-items-center rounded-[32px] shadow-[0_20px_80px_rgba(255,90,31,.25)]">
        <Flame size={48} fill="#FF5A1F" color="#FF8A50" />
      </motion.div>
      <h1 className="text-5xl font-bold tracking-[-.055em]">Embers</h1>
      <p className="mt-4 max-w-[280px] text-lg leading-snug text-white/65">Вся команда на одной карте. В одном ритме.</p>
    </div>
    <div className="relative space-y-3">
      <Pressable onClick={() => setScreen("hub")} className="h-14 w-full rounded-2xl bg-white font-semibold text-black shadow-xl">Войти через Apple</Pressable>
      <Pressable onClick={() => setScreen("hub")} className="glass h-14 w-full rounded-2xl font-semibold">Войти по номеру</Pressable>
      <p className="pt-3 text-center text-[11px] leading-relaxed text-white/35">Продолжая, вы принимаете Условия использования<br />и Политику конфиденциальности</p>
    </div>
  </motion.div>;
}

function EventCard() {
  const setScreen = useEmbersStore((s) => s.setScreen);
  return <motion.button layoutId="event-hero-card" onClick={() => setScreen("live")} whileTap={tap} transition={spring} className="relative h-[360px] w-full overflow-hidden rounded-[34px] border border-white/10 text-left shadow-[0_34px_90px_rgba(0,0,0,.55)]">
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_12%,rgba(255,150,86,.9),transparent_25%),radial-gradient(circle_at_30%_35%,#8c260f,transparent_46%),linear-gradient(145deg,#2b110a,#0d0c0b_70%)]" />
    <div className="absolute inset-0 opacity-35 [background-image:linear-gradient(115deg,transparent_42%,rgba(255,255,255,.2)_47%,transparent_52%)]" />
    <div className="absolute right-[-45px] top-[68px] h-52 w-52 rounded-full border-[30px] border-orange-500/20 blur-[1px]" />
    <div className="relative flex h-full flex-col justify-between p-6">
      <div className="flex items-start justify-between">
        <span className="rounded-full border border-white/15 bg-black/20 px-3 py-1.5 text-[11px] font-medium backdrop-blur-xl">Организатор</span>
        <span className="flex items-center gap-2 rounded-full bg-red-500/90 px-3 py-1.5 text-[11px] font-bold"><i className="h-1.5 w-1.5 rounded-full bg-white" /> LIVE</span>
      </div>
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-[.16em] text-white/55">Суббота, 18 октября</p>
        <h2 className="text-[40px] font-bold leading-[.95] tracking-[-.055em]">Городское<br />окно</h2>
        <div className="mt-5 flex items-center justify-between">
          <div className="flex -space-x-2.5">{team.slice(0, 4).map((member) => <Avatar key={member.id} member={member} size="sm" />)}<span className="grid h-8 w-8 place-items-center rounded-full border border-white/20 bg-zinc-800 text-[9px] font-semibold">+8</span></div>
          <span className="flex items-center gap-1 text-xs text-white/60"><MapPin size={13} /> ВДНХ · 08:00</span>
        </div>
      </div>
    </div>
  </motion.button>;
}

function EventsHubScreen() {
  const openSheet = useEmbersStore((s) => s.openSheet);
  const setScreen = useEmbersStore((s) => s.setScreen);
  const hasEvents = useEmbersStore((s) => s.hasEvents);
  const setHasEvents = useEmbersStore((s) => s.setHasEvents);
  return <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="min-h-full px-5 pb-9 pt-12">
    <div className="mb-7 flex items-center justify-between">
      <div><p className="text-xs text-white/40">Добрый вечер</p><h1 className="text-[30px] font-bold tracking-tight">Вадим</h1></div>
      <div className="grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br from-orange-400 to-orange-700 text-xs font-bold shadow-[0_0_25px_rgba(255,90,31,.25)]">ВФ</div>
    </div>
    <div className="mb-6 flex items-center justify-between">
      <h2 className="text-sm font-semibold text-white/55">МОИ СОБЫТИЯ</h2>
      <Pressable onClick={() => setHasEvents(!hasEvents)} className="text-[11px] text-white/35">{hasEvents ? "Пустой вид" : "Показать демо"}</Pressable>
    </div>
    {hasEvents ? <EventCard /> : <div className="glass flex h-[360px] flex-col items-center justify-center rounded-[34px] px-8 text-center">
      <div className="mb-5 grid h-16 w-16 place-items-center rounded-3xl bg-white/[.06]"><CalendarDays className="text-white/55" /></div>
      <h2 className="text-xl font-semibold">Пока нет событий</h2>
      <p className="mt-2 text-sm leading-relaxed text-white/45">Создайте первое событие или присоединитесь по коду команды.</p>
    </div>}
    <div className="mt-6 grid grid-cols-2 gap-3">
      <Pressable onClick={() => setScreen("create")} className="glass flex h-28 flex-col items-start justify-between rounded-3xl p-4 text-left"><span className="grid h-9 w-9 place-items-center rounded-full bg-orange-500"><Plus size={19} /></span><span className="text-sm font-semibold">Создать событие</span></Pressable>
      <Pressable onClick={() => openSheet("join")} className="glass flex h-28 flex-col items-start justify-between rounded-3xl p-4 text-left"><span className="grid h-9 w-9 place-items-center rounded-full bg-blue-500"><Link2 size={18} /></span><span className="text-sm font-semibold">Войти по коду</span></Pressable>
    </div>
  </motion.div>;
}

const joinSchema = z.object({ code: z.string().length(6, "Введите 6 символов") });
type JoinForm = z.infer<typeof joinSchema>;

function JoinSheet() {
  const joinByCode = useEmbersStore((s) => s.joinByCode);
  const [role, setRole] = useState("Свет");
  const [code, setCode] = useState("K7Q2X9");
  const { handleSubmit, setValue, formState: { errors } } = useForm<JoinForm>({ resolver: zodResolver(joinSchema), defaultValues: { code: "K7Q2X9" } });
  const updateCode = (value: string) => { const next = value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6); setCode(next); setValue("code", next, { shouldValidate: true }); };
  return <form onSubmit={handleSubmit(({ code: value }) => joinByCode(value))}>
    <SheetTitle title="Присоединиться" subtitle="Введите код приглашения" />
    <div className="relative mt-7">
      <input autoFocus value={code} onChange={(e) => updateCode(e.target.value)} className="absolute inset-0 z-10 opacity-0" />
      <div className="grid grid-cols-6 gap-2">{Array.from({ length: 6 }).map((_, i) => <div key={i} className={cn("grid aspect-square place-items-center rounded-2xl border text-xl font-semibold tabular", code[i] ? "border-orange-500/50 bg-orange-500/10" : "border-white/10 bg-white/[.04]")}>{code[i] || ""}</div>)}</div>
      {errors.code && <p className="mt-2 text-xs text-red-400">{errors.code.message}</p>}
    </div>
    <div className="mt-4 grid grid-cols-2 gap-2">
      <Pressable className="glass flex h-11 items-center justify-center gap-2 rounded-xl text-xs"><Link2 size={15} /> Вставить ссылку</Pressable>
      <Pressable className="glass flex h-11 items-center justify-center gap-2 rounded-xl text-xs"><QrCode size={15} /> Сканировать QR</Pressable>
    </div>
    <div className="mt-6 rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_80%_0%,rgba(255,90,31,.35),transparent_45%),#21120d] p-5">
      <div className="flex items-start justify-between"><div><p className="text-[11px] uppercase tracking-wider text-white/45">Найдено событие</p><h3 className="mt-1 text-xl font-bold">Городское окно</h3></div><span className="rounded-full bg-red-500 px-2 py-1 text-[9px] font-bold">LIVE</span></div>
      <p className="mt-4 text-xs text-white/55">18 октября · ВДНХ, павильон 57</p>
    </div>
    <p className="mb-3 mt-6 text-xs font-medium text-white/45">ВАША РОЛЬ</p>
    <div className="flex flex-wrap gap-2">{["Свет", "Звук", "Видео", "Фото", "Продюсер", "Площадка", "Техник"].map((item) => <Pressable key={item} onClick={() => setRole(item)} className={cn("rounded-full border px-3.5 py-2 text-xs", role === item ? "border-orange-500 bg-orange-500 text-white" : "border-white/10 bg-white/[.04] text-white/60")}>{item}</Pressable>)}</div>
    <Pressable type="submit" className="mt-7 h-14 w-full rounded-2xl bg-gradient-to-b from-[#ff6b32] to-[#d9460f] font-semibold shadow-[0_14px_45px_rgba(255,90,31,.25)]">Присоединиться</Pressable>
  </form>;
}

function SheetTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return <div className="text-center"><h2 className="text-xl font-bold tracking-tight">{title}</h2>{subtitle && <p className="mt-1 text-sm text-white/45">{subtitle}</p>}</div>;
}

function TimelineWidget() {
  const hours = [16, 17, 18, 19, 20, 21, 22];
  return <div className="glass rounded-[28px] p-5">
    <div className="flex items-end justify-between"><div><p className="text-[11px] font-medium uppercase tracking-wider text-white/40">Сейчас</p><div className="mt-1 text-[44px] font-semibold leading-none tracking-[-.06em] tabular">18:54</div></div><div className="mb-1 text-right"><p className="text-xs font-medium">Награждение в 19:30</p><p className="mt-1 text-xs font-semibold text-orange-400 tabular">через 36 мин</p></div></div>
    <div className="relative mt-7 h-11">
      <div className="absolute left-0 right-0 top-2 h-1 rounded-full bg-white/10"><motion.div initial={{ width: 0 }} animate={{ width: "48%" }} transition={{ duration: 1.1, ease: "easeOut" }} className="h-full rounded-full bg-gradient-to-r from-orange-700 to-orange-400 shadow-[0_0_18px_rgba(255,90,31,.7)]" /></div>
      <motion.div initial={{ left: "0%" }} animate={{ left: "48%" }} transition={{ duration: 1.1, ease: "easeOut" }} className="absolute top-0 -ml-1 h-5 w-2 rounded-full bg-white shadow-[0_0_12px_white]" />
      <div className="absolute inset-x-0 bottom-0 flex justify-between text-[10px] text-white/35 tabular">{hours.map((h) => <span key={h}>{h}</span>)}</div>
    </div>
  </div>;
}

function VenueMap() {
  const openSheet = useEmbersStore((s) => s.openSheet);
  return <div className="relative h-[285px] overflow-hidden rounded-[30px] border border-white/10 bg-[#101413]">
    <svg viewBox="0 0 400 300" className="absolute inset-0 h-full w-full opacity-80">
      <defs><pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M24 0H0V24" fill="none" stroke="rgba(255,255,255,.025)" strokeWidth="1" /></pattern></defs>
      <rect width="400" height="300" fill="url(#grid)" />
      <path d="M-30 238C68 178 105 232 190 161S335 96 440 49" fill="none" stroke="#29302d" strokeWidth="28" />
      <path d="M-30 238C68 178 105 232 190 161S335 96 440 49" fill="none" stroke="#4a514d" strokeWidth="1.5" strokeDasharray="8 12" />
      <rect x="50" y="45" width="105" height="60" rx="8" fill="#202622" stroke="#39413c" />
      <rect x="238" y="54" width="94" height="78" rx="9" fill="#1b211e" stroke="#39413c" />
      <rect x="258" y="202" width="105" height="52" rx="8" fill="#202622" stroke="#39413c" />
      <text x="68" y="79" fill="#808983" fontSize="10">СЦЕНА А</text><text x="252" y="95" fill="#808983" fontSize="10">ФОТОЗОНА</text><text x="273" y="232" fill="#808983" fontSize="10">ГРИМВАГОН</text>
    </svg>
    <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full border border-white/10 bg-black/50 px-3 py-2 text-[10px] backdrop-blur-xl"><LocateFixed size={13} className="text-orange-400" /> ВДНХ, павильон 57</div>
    {team.map((member, index) => <motion.button key={member.id} initial={{ scale: 0, y: 12 }} animate={{ scale: 1, y: [0, -4, 0] }} transition={{ scale: { ...spring, delay: index * .08 }, y: { duration: 3 + index * .2, repeat: Infinity } }} onClick={() => openSheet("member", member.id)} style={{ left: `${member.coords.x}%`, top: `${member.coords.y}%` }} className="absolute -ml-5 -mt-5">
      <span className="absolute inset-[-7px] rounded-full opacity-25 pulse-ring" style={{ background: statusMeta[member.status].color }} />
      <Avatar member={member} size="md" />
    </motion.button>)}
    <div className="absolute bottom-4 right-4 grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-black/50 backdrop-blur-xl"><Navigation size={17} fill="white" /></div>
  </div>;
}

function TeamFeed() {
  const filter = useEmbersStore((s) => s.teamFilter);
  const setFilter = useEmbersStore((s) => s.filterTeam);
  const openSheet = useEmbersStore((s) => s.openSheet);
  const filters: Array<{ id: "all" | Status; label: string; count: number }> = [{ id: "all", label: "Все", count: 12 }, { id: "on_site", label: "На площадке", count: 6 }, { id: "in_transit", label: "В пути", count: 3 }];
  const visible = filter === "all" ? team : team.filter((m) => m.status === filter);
  return <div className="pb-6">
    <div className="no-scrollbar mb-4 flex gap-2 overflow-x-auto"><LayoutGroup>{filters.map((item) => <button key={item.id} onClick={() => setFilter(item.id)} className={cn("relative shrink-0 rounded-full px-4 py-2 text-xs", filter === item.id ? "text-white" : "bg-white/[.04] text-white/45")}>{filter === item.id && <motion.span layoutId="team-filter-pill" transition={spring} className="absolute inset-0 rounded-full bg-white/[.14] shadow-[inset_0_1px_0_rgba(255,255,255,.15)]" />}<span className="relative">{item.label} · {item.count}</span></button>)}</LayoutGroup></div>
    <AnimatePresence mode="popLayout">{visible.map((member) => <motion.button layout key={member.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: .96 }} transition={spring} onClick={() => openSheet("member", member.id)} className="glass mb-2.5 flex w-full items-center gap-3 rounded-2xl p-3.5 text-left">
      <Avatar member={member} />
      <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="truncate text-sm font-semibold">{member.name}</p><span className="text-[10px] text-white/35">{member.role}</span></div><div className="mt-1 flex items-center gap-2"><StatusDot status={member.status} /><span className="truncate text-[11px] text-white/35">· {member.spot}</span></div><p className="mt-2 truncate text-xs font-medium" style={{ color: statusMeta[member.status].color }}>{member.currentTask}</p></div>
      <ChevronRight size={16} className="text-white/25" />
    </motion.button>)}</AnimatePresence>
  </div>;
}

function LiveBoardScreen() {
  const setScreen = useEmbersStore((s) => s.setScreen);
  const openSheet = useEmbersStore((s) => s.openSheet);
  const myStatus = useEmbersStore((s) => s.myStatus);
  return <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-full pb-4 pt-11">
    <TopBar back={() => setScreen("hub")} right={<div className="flex gap-2"><Pressable className="grid h-10 w-10 place-items-center rounded-full bg-white/[.06]"><Share2 size={17} /></Pressable><div className="grid h-10 w-10 place-items-center rounded-full bg-orange-600 text-xs font-bold">ВФ</div></div>} />
    <main className="px-4">
      <motion.div layoutId="event-hero-card" transition={spring} className="mb-5 flex items-end justify-between"><div><span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/15 px-2.5 py-1 text-[10px] font-bold text-red-400"><i className="h-1.5 w-1.5 rounded-full bg-red-500" /> LIVE</span><h1 className="mt-2 text-[34px] font-bold tracking-[-.045em]">Городское окно</h1><p className="text-xs text-white/40">Суббота, 18 октября · Москва</p></div></motion.div>
      <TimelineWidget />
      <div className="glass my-3 flex items-center gap-3 rounded-2xl p-3.5"><div className="grid h-9 w-9 place-items-center rounded-full bg-orange-500/15"><Radio size={17} className="text-orange-400" /></div><div className="flex-1"><p className="text-[10px] text-white/35">МОЙ СТАТУС</p><StatusDot status={myStatus} /></div><Pressable onClick={() => openSheet("status")} className="rounded-full bg-orange-500 px-4 py-2 text-xs font-semibold">Сменить</Pressable></div>
      <div className="mb-3 flex items-center justify-between px-1 pt-3"><h2 className="text-sm font-semibold">Команда на площадке</h2><span className="text-xs text-white/35">5 онлайн</span></div>
      <VenueMap />
      <div className="mb-4 mt-7 flex items-center justify-between px-1"><h2 className="text-xl font-bold tracking-tight">Команда</h2><Pressable onClick={() => setScreen("schedule")} className="flex items-center gap-1 text-xs font-medium text-orange-400"><Zap size={14} /> Расписание</Pressable></div>
      <TeamFeed />
    </main>
  </motion.div>;
}

function MemberSheet() {
  const id = useEmbersStore((s) => s.selectedMemberId);
  const closeSheet = useEmbersStore((s) => s.closeSheet);
  const setScreen = useEmbersStore((s) => s.setScreen);
  const member = team.find((item) => item.id === id) ?? team[0];
  return <div>
    <div className="flex flex-col items-center"><Avatar member={member} size="lg" /><h2 className="mt-4 text-2xl font-bold">{member.name}</h2><p className="mt-1 text-sm text-white/45">{member.roleLong ?? member.role}</p><div className="mt-3 rounded-full bg-white/[.06] px-3 py-1.5"><StatusDot status={member.status} /></div></div>
    <div className="mt-6 grid grid-cols-3 gap-2">
      {[{ icon: Phone, label: "Позвонить" }, { icon: MessageCircle, label: "Написать" }, { icon: MapPin, label: "На карте" }].map(({ icon: Icon, label }) => <Pressable key={label} className="glass flex h-20 flex-col items-center justify-center gap-2 rounded-2xl text-[11px]"><Icon size={19} />{label}</Pressable>)}
    </div>
    <div className="glass mt-4 overflow-hidden rounded-2xl">{[{ label: "Где", value: member.spot }, { label: "Сейчас", value: member.currentTask }, { label: "Дальше", value: member.next }].map((row, i) => <div key={row.label} className={cn("flex gap-4 px-4 py-3.5 text-sm", i > 0 && "border-t border-white/[.07]")}><span className="w-16 text-white/35">{row.label}</span><span className="flex-1 font-medium">{row.value}</span></div>)}</div>
    <div className="mt-6"><div className="mb-3 flex items-center justify-between"><p className="text-[11px] font-semibold tracking-[.14em] text-white/40">ДЕНЬ {member.name.split(" ")[0].toUpperCase()}</p><p className="text-[10px] text-white/30">08 — 23</p></div><div className="flex h-4 overflow-hidden rounded-full bg-white/5"><span className="w-[18%] bg-blue-500/70" /><span className="w-[12%] bg-white/10" /><span className="w-[28%] bg-orange-500" /><span className="w-[8%] bg-white/10" /><span className="w-[24%] bg-violet-500" /><span className="flex-1 bg-white/10" /></div><div className="mt-2 flex justify-between text-[9px] text-white/30 tabular"><span>08</span><span>11</span><span>14</span><span>17</span><span>20</span><span>23</span></div></div>
    <Pressable onClick={() => { closeSheet(); setScreen("schedule"); }} className="mt-6 h-13 w-full rounded-2xl bg-white text-sm font-semibold text-black">Открыть расписание</Pressable>
  </div>;
}

function StatusSheet() {
  const myStatus = useEmbersStore((s) => s.myStatus);
  const update = useEmbersStore((s) => s.updateMyStatus);
  const share = useEmbersStore((s) => s.shareLocation);
  const toggleShare = useEmbersStore((s) => s.toggleShareLocation);
  const items = Object.entries(statusMeta) as Array<[Status, { label: string; color: string }]>;
  return <div><SheetTitle title="Мой статус" subtitle="Команда увидит обновление сразу" /><div className="mt-6 grid grid-cols-2 gap-3">{items.map(([id, meta]) => <Pressable key={id} onClick={() => update(id)} className={cn("relative flex h-28 flex-col items-start justify-between rounded-3xl border p-4 text-left", myStatus === id ? "border-white/30 bg-white/[.09]" : "border-white/[.07] bg-white/[.03]")}><span className="h-3 w-3 rounded-full shadow-[0_0_16px_currentColor]" style={{ background: meta.color, color: meta.color }} /><span className="text-sm font-semibold">{meta.label}</span>{myStatus === id && <span className="absolute right-3 top-3 grid h-6 w-6 place-items-center rounded-full bg-white text-black"><Check size={14} /></span>}</Pressable>)}</div><button onClick={toggleShare} className="glass mt-4 flex w-full items-center gap-3 rounded-2xl p-4 text-left"><LocateFixed size={19} className="text-blue-400" /><span className="flex-1 text-sm font-medium">Делиться геопозицией</span><span className={cn("relative h-7 w-12 rounded-full transition-colors", share ? "bg-green-500" : "bg-white/15")}><motion.i layout transition={spring} className={cn("absolute top-1 h-5 w-5 rounded-full bg-white shadow", share ? "left-6" : "left-1")} /></span></button></div>;
}

const eventSchema = z.object({ title: z.string().min(2), date: z.string(), location: z.string() });
type EventForm = z.infer<typeof eventSchema>;

function CreateEventScreen() {
  const setScreen = useEmbersStore((s) => s.setScreen);
  const openSheet = useEmbersStore((s) => s.openSheet);
  const createEvent = useEmbersStore((s) => s.createEvent);
  const { register, handleSubmit, formState: { isValid } } = useForm<EventForm>({ resolver: zodResolver(eventSchema), mode: "onChange", defaultValues: { title: "Городское окно", date: "Сб, 18 октября · 08:00", location: "ВДНХ, павильон 57" } });
  return <motion.form onSubmit={handleSubmit(createEvent)} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative min-h-full pb-8 pt-11">
    <div className="absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_50%_0%,rgba(255,90,31,.45),transparent_70%)]" />
    <TopBar back={() => setScreen("hub")} title="Новое событие" right={<Pressable type="submit" disabled={!isValid} className="text-sm font-semibold text-orange-400">Готово</Pressable>} />
    <main className="relative px-5">
      <Pressable className="glass relative mt-2 flex h-44 w-full items-center justify-center overflow-hidden rounded-[32px]"><div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(255,134,73,.65),transparent_35%),linear-gradient(145deg,#4a180a,#160d0a)]" /><span className="relative flex items-center gap-2 rounded-full bg-black/25 px-4 py-2 text-xs backdrop-blur-xl"><ImagePlus size={15} /> Добавить обложку</span></Pressable>
      <input {...register("title")} className="mt-7 w-full bg-transparent text-center text-[36px] font-bold tracking-[-.05em] outline-none placeholder:text-white/25" placeholder="Название события" />
      <p className="mt-2 text-center text-xs text-white/35">Организатор · Вадим Филатов</p>
      <div className="mt-8 space-y-3">
        <button type="button" onClick={() => openSheet("datetime")} className="glass flex w-full items-center gap-4 rounded-2xl p-4 text-left"><span className="grid h-10 w-10 place-items-center rounded-xl bg-red-500/15 text-red-400"><CalendarDays size={19} /></span><div className="flex-1"><p className="text-[10px] text-white/35">ДАТА И ВРЕМЯ</p><input {...register("date")} readOnly className="mt-1 w-full bg-transparent text-sm font-medium outline-none" /></div><ChevronRight size={17} className="text-white/25" /></button>
        <button type="button" onClick={() => openSheet("location")} className="glass flex w-full items-center gap-4 rounded-2xl p-4 text-left"><span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-500/15 text-blue-400"><MapPin size={19} /></span><div className="flex-1"><p className="text-[10px] text-white/35">МЕСТО</p><input {...register("location")} readOnly className="mt-1 w-full bg-transparent text-sm font-medium outline-none" /></div><ChevronRight size={17} className="text-white/25" /></button>
      </div>
      <div className="glass mt-5 overflow-hidden rounded-2xl">
        <div className="flex items-center gap-3 p-4"><div className="grid h-10 w-10 place-items-center rounded-full bg-orange-600 text-xs font-bold">ВФ</div><div className="flex-1"><p className="text-xs text-white/35">Организатор</p><p className="text-sm font-semibold">Вадим Филатов</p></div><Check size={17} className="text-green-400" /></div>
        <button type="button" onClick={() => openSheet("invite")} className="flex w-full items-center gap-3 border-t border-white/[.07] p-4 text-left"><Users size={18} className="text-violet-400" /><span className="flex-1 text-sm font-medium">Команда и приглашение</span><ChevronRight size={17} className="text-white/25" /></button>
        <button type="button" onClick={() => setScreen("schedule")} className="flex w-full items-center gap-3 border-t border-white/[.07] p-4 text-left"><Clock3 size={18} className="text-orange-400" /><div className="flex-1"><p className="text-sm font-medium">Программа</p><p className="mt-0.5 text-[11px] text-white/35">Загрузите PDF, Excel или фото тайминга</p></div><ChevronRight size={17} className="text-white/25" /></button>
      </div>
    </main>
  </motion.form>;
}

function DateTimeSheet() {
  const [allDay, setAllDay] = useState(false);
  return <div><SheetTitle title="Дата и время" /><div className="glass mt-6 flex items-center rounded-2xl p-4"><span className="flex-1 text-sm font-medium">Весь день</span><button onClick={() => setAllDay(!allDay)} className={cn("relative h-7 w-12 rounded-full", allDay ? "bg-green-500" : "bg-white/15")}><span className={cn("absolute top-1 h-5 w-5 rounded-full bg-white transition-all", allDay ? "left-6" : "left-1")} /></button></div><div className="mt-3 grid grid-cols-2 gap-3"><Pressable className="glass rounded-2xl p-4 text-left"><p className="text-[10px] text-white/35">НАЧАЛО</p><p className="mt-2 text-sm font-semibold">18 октября</p><p className="mt-1 text-xl font-medium text-orange-400 tabular">08:00</p></Pressable><Pressable className="glass rounded-2xl p-4 text-left"><p className="text-[10px] text-white/35">ЗАВЕРШЕНИЕ</p><p className="mt-2 text-sm font-semibold">18 октября</p><p className="mt-1 text-xl font-medium text-orange-400 tabular">23:00</p></Pressable></div><div className="glass mt-3 flex items-center p-4 rounded-2xl"><span className="flex-1 text-sm">Часовой пояс</span><span className="text-sm text-white/45">Москва</span><ChevronRight size={16} className="ml-2 text-white/25" /></div></div>;
}

function LocationSheet() {
  const [selected, setSelected] = useState("ВДНХ, павильон 57");
  return <div><SheetTitle title="Место проведения" /><div className="mt-5 flex h-12 items-center gap-3 rounded-2xl bg-white/[.07] px-4"><Search size={18} className="text-white/35" /><input placeholder="Найти площадку" className="w-full bg-transparent text-sm outline-none placeholder:text-white/30" /></div><div className="mt-4 overflow-hidden rounded-2xl border border-white/[.07]">{["ВДНХ, павильон 57", "Парк Горького", "Мосфильм, павильон 3"].map((place, i) => <button key={place} onClick={() => setSelected(place)} className={cn("flex w-full items-center gap-3 bg-white/[.03] p-4 text-left", i > 0 && "border-t border-white/[.07]")}><MapPin size={17} className="text-orange-400" /><span className="flex-1 text-sm">{place}</span>{selected === place && <Check size={17} className="text-orange-400" />}</button>)}</div><p className="mb-2 mt-5 text-[11px] text-white/40">ЗОНА ИЛИ ОРИЕНТИР</p><input placeholder="Например, Сцена А или Гримвагон" className="glass h-13 w-full rounded-2xl px-4 text-sm outline-none placeholder:text-white/25" /><Pressable className="mt-5 h-13 w-full rounded-2xl bg-orange-500 text-sm font-semibold">Сохранить место</Pressable></div>;
}

function FakeQr() {
  const bits = useMemo(() => Array.from({ length: 81 }, (_, i) => ((i * 17 + i * i * 7 + 3) % 11) < 5), []);
  return <div className="grid h-40 w-40 grid-cols-9 gap-[2px] rounded-2xl bg-white p-3">{bits.map((on, i) => <i key={i} className={on ? "bg-black" : "bg-white"} />)}</div>;
}

function InviteSheet() {
  return <div><SheetTitle title="Команда и приглашение" subtitle="Код события K7Q2X9" /><div className="mt-6 flex justify-center"><FakeQr /></div><div className="glass mt-5 flex items-center gap-3 rounded-2xl p-3.5"><Link2 size={17} className="text-white/40" /><span className="flex-1 text-sm tabular">embers.app/j/K7Q2X9</span><Pressable className="grid h-9 w-9 place-items-center rounded-xl bg-white/10"><Copy size={15} /></Pressable></div><Pressable className="mt-3 flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-white font-semibold text-black"><Share2 size={17} /> Поделиться</Pressable><p className="mb-3 mt-6 text-[11px] text-white/40">РОЛИ В КОМАНДЕ</p><div className="glass overflow-hidden rounded-2xl">{team.slice(0, 3).map((member, i) => <div key={member.id} className={cn("flex items-center gap-3 p-3", i > 0 && "border-t border-white/[.07]")}><Avatar member={member} size="sm" /><span className="flex-1 text-sm">{member.name}</span><span className="rounded-full bg-white/[.07] px-3 py-1.5 text-xs">{member.role}</span></div>)}</div></div>;
}

function ScheduleBuilderScreen() {
  const setScreen = useEmbersStore((s) => s.setScreen);
  const blocks = useEmbersStore((s) => s.schedule);
  const add = useEmbersStore((s) => s.addScheduleBlock);
  const remove = useEmbersStore((s) => s.removeScheduleBlock);
  const [category, setCategory] = useState("Сцена");
  const locations: Record<string, string[]> = { "Сцена": ["Главная сцена", "Малая сцена"], "Служебные": ["Склад", "Офис"], "Гости": ["Фотозона", "Вход / регистрация"] };
  return <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} className="min-h-full pb-[245px] pt-11">
    <TopBar back={() => setScreen("live")} title="Расписание" right={<Pressable className="text-sm font-semibold text-orange-400">Готово</Pressable>} />
    <main className="px-4"><div className="mb-6 px-1"><p className="text-xs text-white/40">Костя Белов · Свет</p><h1 className="mt-1 text-[32px] font-bold tracking-tight">День команды</h1></div>
      <div className="relative"><AnimatePresence initial={false}>{blocks.map((block, index) => <motion.div layout key={block.id} initial={{ opacity: 0, scale: .88, y: 50 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: .9 }} transition={spring}>
        {index > 0 && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex h-16 items-center gap-3 pl-7"><div className="h-full w-px border-l border-dashed border-white/20" /><span className="flex items-center gap-1.5 rounded-full bg-white/[.06] px-3 py-1.5 text-[10px] text-white/45"><Clock3 size={12} /> переход 10 мин</span></motion.div>}
        <div className="glass relative overflow-hidden rounded-[28px] p-5"><div className="absolute inset-y-0 left-0 w-1" style={{ background: block.color }} /><button onClick={() => remove(block.id)} className="absolute right-4 top-4 text-white/25 hover:text-red-400"><Trash2 size={15} /></button><div className="flex items-center gap-2 text-xs font-semibold" style={{ color: block.color }}><MapPin size={14} /> {block.location}</div><p className="mt-5 text-lg font-medium leading-snug">« <span className="rounded-lg bg-white/[.08] px-1.5 py-1">{block.task}</span> »</p><p className="mt-4 text-sm text-white/45">с <span className="rounded-lg bg-white/[.08] px-2 py-1 font-medium text-white tabular">{block.time}</span></p></div>
      </motion.div>)}</AnimatePresence></div>
    </main>
    <div className="absolute inset-x-0 bottom-0 z-20 rounded-t-[32px] border-t border-white/10 bg-[#181716]/95 px-4 pb-8 pt-3 shadow-[0_-20px_70px_rgba(0,0,0,.5)] backdrop-blur-2xl">
      <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20" /><div className="mb-4 flex gap-2">{Object.keys(locations).map((item) => <button key={item} onClick={() => setCategory(item)} className={cn("rounded-full px-3 py-2 text-xs", category === item ? "bg-white text-black" : "bg-white/[.06] text-white/50")}>{item}</button>)}</div><div className="grid grid-cols-2 gap-2">{locations[category].map((location) => <Pressable key={location} onClick={() => add(location)} className="glass flex h-14 items-center gap-3 rounded-2xl px-3 text-left text-xs font-medium"><span className="grid h-8 w-8 place-items-center rounded-xl bg-orange-500/15 text-orange-400"><Plus size={15} /></span>{location}</Pressable>)}</div>
    </div>
  </motion.div>;
}

function ActiveSheet() {
  const sheet = useEmbersStore((s) => s.sheet);
  const close = useEmbersStore((s) => s.closeSheet);
  const content: Partial<Record<Exclude<Sheet, null>, React.ReactNode>> = {
    join: <JoinSheet />, member: <MemberSheet />, status: <StatusSheet />, datetime: <DateTimeSheet />, location: <LocationSheet />, invite: <InviteSheet />,
  };
  return <Drawer.Root open={sheet !== null} onOpenChange={(open) => !open && close()} shouldScaleBackground>
    <Drawer.Portal>
      <Drawer.Overlay className="fixed inset-0 z-[150] bg-black/55 backdrop-blur-[2px]" />
      <Drawer.Content className="sheet fixed inset-x-0 bottom-0 z-[160] mx-auto max-h-[92dvh] max-w-[430px] overflow-y-auto rounded-t-[34px] outline-none">
        <Drawer.Title className="sr-only">{sheet ?? "Embers"}</Drawer.Title>
        <div className="sticky top-0 z-10 flex h-8 items-center justify-center bg-[#161514]/90 backdrop-blur-xl"><div className="h-1 w-10 rounded-full bg-white/20" /></div>
        <div className="safe-bottom px-5 pb-7 pt-2">{sheet && content[sheet]}</div>
      </Drawer.Content>
    </Drawer.Portal>
  </Drawer.Root>;
}

export default function EmbersApp() {
  const screen = useEmbersStore((s) => s.screen);
  const screens = { auth: <AuthScreen />, hub: <EventsHubScreen />, create: <CreateEventScreen />, live: <LiveBoardScreen />, schedule: <ScheduleBuilderScreen /> };
  return <main className="ambient grid min-h-dvh place-items-center overflow-hidden">
    <div className="phone-frame relative h-dvh min-h-dvh w-full max-w-[430px] overflow-hidden bg-[#0D0C0B] text-white" data-vaul-drawer-wrapper="">
      <IOSStatusBar />
      <div className="no-scrollbar h-full overflow-y-auto"><AnimatePresence mode="wait"><motion.div key={screen} className="min-h-full">{screens[screen]}</motion.div></AnimatePresence></div>
      <HomeIndicator />
    </div>
    <ActiveSheet />
  </main>;
}
