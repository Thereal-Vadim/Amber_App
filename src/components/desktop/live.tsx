"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MoreHorizontal, Plus } from "lucide-react";
import { type Member, type ScheduleBlock, type Status, eventPhase, eventPlace, focusedEvent, statusMeta, useEmbersStore } from "@/store/useEmbersStore";
import { TrackingMap, clockLabel, cn, formatDistance, metersBetween, minutesOf, scheduleRanges, shareInvite, shareResult, spring, splitRange, useClock, useMyLocation } from "../EmbersApp";
import { Avatar, Button, Chip, Icon, IconButton, Panel, PhaseBadge, SectionLabel, StatusPill } from "./ui";

function useOutside(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => { if (!ref.current?.contains(event.target as Node)) close(); };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [open, close]);
  return ref;
}

export function Menu({ items, trigger }: { items: Array<{ label: string; onClick: () => void; danger?: boolean }>; trigger: (toggle: () => void) => React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useOutside(open, () => setOpen(false));
  return <div ref={ref} className="relative">
    {trigger(() => setOpen((value) => !value))}
    <AnimatePresence>{open && <motion.div initial={{ opacity: 0, y: -6, scale: .97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: .14 }} className="glass-modal absolute right-0 top-[calc(100%+8px)] z-40 min-w-[220px] overflow-hidden rounded-[18px] py-1.5 text-ink">
      {items.map((item) => <button key={item.label} type="button" onClick={() => { setOpen(false); item.onClick(); }} className={cn("flex h-10 w-full items-center px-4 text-left text-callout transition-colors hover:bg-ink/5", item.danger && "text-danger")}>{item.label}</button>)}
    </motion.div>}</AnimatePresence>
  </div>;
}

function timelineBounds(ranges: Array<{ from: number; to: number }>) {
  const from = Math.min(8 * 60, ...ranges.map((item) => item.from));
  const to = Math.max(22 * 60, ...ranges.map((item) => item.to));
  const start = Math.floor(from / 120) * 120;
  return { start, end: Math.max(start + 240, Math.ceil(to / 120) * 120) };
}

function DayTimeline() {
  const record = useEmbersStore(focusedEvent);
  const now = useClock();
  const minutes = now.getHours() * 60 + now.getMinutes();
  const ranges = scheduleRanges(record.schedules, ["vadim", ...record.team.map((member) => member.id)]);
  const { start, end } = timelineBounds(ranges);
  const span = end - start;
  const at = (value: number) => `${((value - start) / span) * 100}%`;
  const ticks = Array.from({ length: span / 120 + 1 }, (_, index) => start + index * 120);
  const showNow = minutes >= start && minutes <= end;
  return <div className="mt-6 rounded-[20px] bg-black/25 px-5 pb-3 pt-7 backdrop-blur-md">
    <div className="relative">
      <div className="relative h-2 rounded-full bg-white/15">
        {ranges.map((item) => <span key={`${item.location}-${item.from}-${item.to}`} title={`${item.location} · ${clockLabel(item.from)} – ${clockLabel(item.to)}`} className="absolute inset-y-0 rounded-full" style={{ left: at(item.from), width: `${((item.to - item.from) / span) * 100}%`, background: item.color }} />)}
      </div>
      {ticks.slice(1, -1).map((tick) => <i key={tick} className="absolute top-0 h-2 w-px bg-black/30" style={{ left: at(tick) }} />)}
      {showNow && <div className="pointer-events-none absolute -top-6 bottom-[-6px] z-10 -translate-x-1/2" style={{ left: at(minutes) }}>
        <span className="absolute -top-0.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-black">СЕЙЧАС</span>
        <i className="absolute bottom-0 left-1/2 top-4 w-0.5 -translate-x-1/2 rounded-full bg-white" />
      </div>}
    </div>
    <div className="relative mt-3 h-4 text-footnote text-white/60">
      {ticks.map((tick) => <span key={tick} className="absolute -translate-x-1/2 tabular" style={{ left: at(tick) }}>{clockLabel(tick % (24 * 60))}</span>)}
    </div>
  </div>;
}

function LiveHeader() {
  const record = useEmbersStore(focusedEvent);
  const now = useClock().getTime();
  const open = useEmbersStore((s) => s.openSheet);
  const openSchedule = useEmbersStore((s) => s.openSchedule);
  const setView = useEmbersStore((s) => s.setScheduleView);
  const archiveEvent = useEmbersStore((s) => s.archiveEvent);
  const setScreen = useEmbersStore((s) => s.setScreen);
  const event = record.details;
  const firstMember = record.team[0]?.id ?? "vadim";
  return <section className="relative shrink-0 overflow-hidden rounded-panel p-6 pb-5 text-white shadow-[0_24px_60px_rgba(0,0,0,.25)]" style={{ background: "linear-gradient(180deg, #ff6b00 0%, #c42a1a 42%, #3b0b22 82%, #1a0710 100%)" }}>
    {event.cover && <span className="absolute inset-0 bg-cover bg-center opacity-40" style={{ backgroundImage: `url(${event.cover})` }} />}
    <div className="relative flex items-start gap-4">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-3">
          <h1 className="truncate text-[30px] font-extrabold leading-tight tracking-[-.02em]">{event.title || "Без названия"}</h1>
          <PhaseBadge phase={eventPhase(event, now)} />
        </div>
        <p className="mt-1 truncate text-caption text-white/80">{[event.dateLabel, eventPlace(event)].filter(Boolean).join(" · ")}</p>
      </div>
      <Button tone="tint" onClick={() => { void shareInvite(event.title, record.code).then(shareResult); }}><Icon name="share" size={16} />Поделиться</Button>
      <Menu trigger={(toggle) => <IconButton label="Ещё" tone="tint" size={44} onClick={toggle}><MoreHorizontal size={18} /></IconButton>} items={[
        { label: "Расписание команды", onClick: () => { setView("grid"); openSchedule(firstMember, "live"); } },
        { label: "Пригласить команду", onClick: () => open("invite") },
        { label: "Программа и файлы", onClick: () => open("files") },
        { label: "В архив", danger: true, onClick: () => { archiveEvent(record.id); setScreen("hub"); } },
      ]} />
    </div>
    <div className="relative"><DayTimeline /></div>
  </section>;
}

function MyStatusRow() {
  const record = useEmbersStore(focusedEvent);
  const open = useEmbersStore((s) => s.openSheet);
  const meta = statusMeta[record.myStatus];
  const myBlock = record.schedules.vadim?.[0]?.location;
  return <Panel className="flex h-[68px] shrink-0 items-center gap-4 rounded-[22px] px-4">
    <span className="grid h-9 w-9 place-items-center rounded-full" style={{ background: `color-mix(in srgb, ${meta.color} 22%, transparent)` }}><i className="h-3.5 w-3.5 rounded-full" style={{ background: meta.color }} /></span>
    <div className="min-w-0 flex-1">
      <p className="text-footnote text-ink-2">Мой статус</p>
      <p className="truncate text-callout font-semibold">{meta.label}{myBlock ? ` · ${myBlock}` : ""}</p>
    </div>
    <Button onClick={() => open("status")}>Изменить</Button>
  </Panel>;
}

function MapPanel({ expanded, setExpanded, onMember }: { expanded: boolean; setExpanded: (value: boolean) => void; onMember: (id: string) => void }) {
  const record = useEmbersStore(focusedEvent);
  const event = record.details;
  const location = useMyLocation();
  const lat = event.lat ?? 55.8304;
  const lng = event.lng ?? 37.6326;
  const onSite = record.team.filter((member) => member.status === "on_site").length;
  const inTransit = record.team.filter((member) => member.status === "in_transit").length;
  const distance = location.point ? formatDistance(metersBetween(location.point, { lat, lng })) : null;
  const chip = location.status === "granted" && distance ? `Вы · ${distance}` : location.status === "denied" ? "Геопозиция выключена" : location.status === "unavailable" ? "Геолокация недоступна" : "Ищем вас…";
  const map = (big: boolean) => <div className="relative h-full w-full">
    <TrackingMap lat={lat} lng={lng} address={eventPlace(event)} members={record.team} user={location.point} expanded={big} onMember={onMember} />
    <span className="pointer-events-none absolute left-3 top-3 z-20 rounded-full bg-black/70 px-3 py-1 text-footnote font-semibold text-white backdrop-blur-md">{chip}</span>
  </div>;
  return <>
    <Panel className="shrink-0 p-5">
      <div className="flex items-center gap-3">
        <h2 className="text-body font-bold">Карта</h2>
        <p className="text-caption text-ink-2">{onSite} на площадке · {inTransit} в пути</p>
        <Button size="sm" className="ml-auto" onClick={() => setExpanded(true)}><Icon name="nav" size={14} />Маршрут и карта</Button>
      </div>
      <div className="mt-4 h-[clamp(220px,30vh,320px)] overflow-hidden rounded-[20px] bg-field">{expanded ? null : map(false)}</div>
    </Panel>
    <AnimatePresence>{expanded && <motion.div initial={{ opacity: 0, scale: .98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: .98 }} transition={{ duration: .18 }} className="absolute inset-0 z-30 overflow-hidden rounded-panel bg-canvas shadow-2xl">
      {map(true)}
      <IconButton label="Закрыть карту" tone="inverse" onClick={() => setExpanded(false)} className="absolute right-4 top-4 z-30"><Icon name="close" size={16} /></IconButton>
    </motion.div>}</AnimatePresence>
  </>;
}

const filters: Array<["all" | Status, string]> = [["all", "Все"], ["on_site", "На площадке"], ["in_transit", "В пути"], ["ready", "Готов"], ["gathering", "Сбор"]];

function TeamGrid({ selectedId, onSelect }: { selectedId: string | null; onSelect: (id: string) => void }) {
  const record = useEmbersStore(focusedEvent);
  const filter = useEmbersStore((s) => s.teamFilter);
  const setFilter = useEmbersStore((s) => s.filterTeam);
  const open = useEmbersStore((s) => s.openSheet);
  const team = record.team;
  const visible = filter === "all" ? team : team.filter((member) => member.status === filter);
  return <section className="shrink-0">
    <div className="flex flex-wrap items-center gap-2">
      <h2 className="mr-2 text-headline font-bold">Команда</h2>
      {filters.map(([id, label]) => <Chip key={id} active={filter === id} onClick={() => setFilter(id)}>{label} · {id === "all" ? team.length : team.filter((member) => member.status === id).length}</Chip>)}
      <Button tone="primary" size="sm" className="ml-auto" onClick={() => open("invite")}><Plus size={14} strokeWidth={2.6} />Добавить</Button>
    </div>
    {!team.length && <p className="mt-4 text-callout text-ink-2">Пока никого нет. Добавьте участника или отправьте приглашение.</p>}
    <div className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(min(100%,320px),1fr))] gap-3">
      {visible.map((member) => <button key={member.id} type="button" onClick={() => onSelect(member.id)} className={cn("glass-panel flex items-center gap-3 rounded-[20px] p-3 text-left transition-colors", selectedId === member.id ? "!border-accent/70 !bg-accent/15" : "hover:!bg-ink/10")}>
        <Avatar member={member} size={40} />
        <span className="min-w-0 flex-1">
          <b className="block truncate text-callout font-semibold">{member.name}</b>
          <small className="block truncate text-footnote text-ink-2">{record.memberRoles[member.id] ?? member.role} · {member.spot}</small>
        </span>
        <StatusPill status={member.status} size="sm" />
      </button>)}
    </div>
  </section>;
}

function currentBlock(blocks: ScheduleBlock[], minutes: number) {
  const parsed = blocks.map((block) => {
    const range = splitRange(block.time);
    return { block, from: minutesOf(range.start) ?? 0, to: minutesOf(range.end) ?? 0 };
  });
  return { running: parsed.find((item) => item.from <= minutes && minutes < item.to), next: parsed.filter((item) => item.from > minutes).sort((a, b) => a.from - b.from)[0] };
}

function MemberPanel({ member, onClose, onRoute }: { member: Member; onClose: () => void; onRoute: () => void }) {
  const record = useEmbersStore(focusedEvent);
  const openSchedule = useEmbersStore((s) => s.openSchedule);
  const setView = useEmbersStore((s) => s.setScheduleView);
  const setNotice = useEmbersStore((s) => s.setNotice);
  const now = useClock();
  const [updated] = useState(() => clockLabel(now.getHours() * 60 + now.getMinutes()));
  const minutes = now.getHours() * 60 + now.getMinutes();
  const blocks = record.schedules[member.id] ?? [];
  const { running, next } = currentBlock(blocks, minutes);
  const role = record.memberRoles[member.id] ?? member.role;
  const roleLine = role === member.role && member.roleLong ? member.roleLong : role;
  const editSchedule = () => { setView("list"); openSchedule(member.id, "live"); };
  const action = "flex h-[68px] flex-1 flex-col items-center justify-center gap-1.5 rounded-[18px] bg-raised text-footnote font-semibold text-ink transition-colors hover:bg-ink/10";
  const missing = () => setNotice("Номер не указан");
  return <motion.aside key={member.id} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 24 }} transition={spring} className="glass-panel no-scrollbar relative flex w-[320px] shrink-0 flex-col overflow-y-auto rounded-panel">
    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-56" style={{ background: `linear-gradient(180deg, color-mix(in srgb, ${member.color} 38%, transparent), transparent)` }} />
    <IconButton label="Закрыть" onClick={onClose} size={32} className="absolute right-4 top-4 z-10"><Icon name="close" size={14} /></IconButton>
    <div className="relative flex flex-col items-center px-5 pt-8 text-center">
      <Avatar member={member} size={80} />
      <h2 className="mt-4 text-headline font-bold">{member.name}</h2>
      <p className="mt-1 text-callout text-ink-2">{roleLine}</p>
      <div className="mt-3"><StatusPill status={member.status} /></div>
    </div>
    <div className="relative mt-5 flex gap-2 px-4">
      {member.phone ? <a href={`tel:${member.phone}`} className={action}><Icon name="call" size={22} className="text-accent" />Позвонить</a> : <button type="button" onClick={missing} className={action}><Icon name="call" size={22} className="text-accent" />Позвонить</button>}
      {member.phone ? <a href={`sms:${member.phone}`} className={action}><Icon name="message" size={22} className="text-accent" />Написать</a> : <button type="button" onClick={missing} className={action}><Icon name="message" size={22} className="text-accent" />Написать</button>}
      <button type="button" onClick={onRoute} className={action}><Icon name="nav" size={20} className="text-accent" />Маршрут</button>
    </div>
    <div className="relative mx-4 mt-4 rounded-[22px] bg-raised p-4">
      <SectionLabel>{running ? "Сейчас" : next ? `Дальше · ${clockLabel(next.from)}` : "Сейчас"}</SectionLabel>
      <p className="mt-1.5 text-headline font-bold">{running?.block.location ?? next?.block.location ?? member.spot}</p>
      <p className="mt-0.5 text-callout text-ink-2">{running?.block.task ?? next?.block.task ?? member.currentTask}</p>
      {running && <>
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-ink/10"><i className="block h-full rounded-full bg-accent" style={{ width: `${Math.min(100, ((minutes - running.from) / Math.max(1, running.to - running.from)) * 100)}%` }} /></div>
        <div className="mt-2 flex justify-between text-footnote"><b className="font-semibold text-accent">ещё {running.to - minutes} мин</b><span className="text-ink-2">до {clockLabel(running.to)}</span></div>
      </>}
    </div>
    <div className="relative mt-5 flex items-center px-5">
      <h3 className="text-callout font-bold">Расписание на сегодня</h3>
      <button type="button" onClick={editSchedule} className="ml-auto text-caption font-semibold text-link">Изменить</button>
    </div>
    <div className="relative mt-3 space-y-2 px-4">
      {!blocks.length && <button type="button" onClick={editSchedule} className="w-full rounded-[16px] border-2 border-dashed border-ink/20 px-4 py-5 text-caption text-ink-2 transition-colors hover:border-accent/60">Расписание пока пустое — составить</button>}
      {blocks.map((block) => <div key={block.id} className="relative overflow-hidden rounded-[16px] bg-raised py-3 pl-5 pr-4">
        <i className="absolute inset-y-2 left-2 w-[3px] rounded-full" style={{ background: block.color }} />
        <p className="truncate text-caption font-semibold">{block.location} · {block.time}</p>
        <p className="mt-0.5 truncate text-footnote text-ink-2">{block.task}</p>
      </div>)}
    </div>
    <p className="relative mt-auto px-5 pb-5 pt-6 text-center text-footnote text-ink-3">Последнее обновление статуса · {updated}</p>
  </motion.aside>;
}

export function DesktopLive() {
  const record = useEmbersStore(focusedEvent);
  const selectedId = useEmbersStore((s) => s.selectedMemberId);
  const [panel, setPanel] = useState(true);
  const [expanded, setExpanded] = useState(false);
  useEffect(() => { setExpanded(false); }, [record.id]);
  const member = record.team.find((item) => item.id === selectedId) ?? null;
  const select = (id: string) => { useEmbersStore.setState({ selectedMemberId: id }); setPanel(true); };
  return <div className="flex h-full gap-4">
    <div className="relative min-w-0 flex-1">
      <div className="no-scrollbar flex h-full flex-col gap-4 overflow-y-auto pb-2">
        <LiveHeader />
        <MyStatusRow />
        <MapPanel expanded={expanded} setExpanded={setExpanded} onMember={select} />
        <TeamGrid selectedId={panel ? member?.id ?? null : null} onSelect={select} />
      </div>
    </div>
    <AnimatePresence mode="popLayout">{panel && member && <MemberPanel key={member.id} member={member} onClose={() => setPanel(false)} onRoute={() => setExpanded(true)} />}</AnimatePresence>
  </div>;
}
