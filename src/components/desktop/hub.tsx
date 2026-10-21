"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Search, Trash2, Archive } from "lucide-react";
import { type EventRecord, eventPhase, eventWhen, useEmbersStore } from "@/store/useEmbersStore";
import { cn, spring, useBoardEvents, useClock } from "../EmbersApp";
import { Avatar, Button, Icon, IconButton, PhaseBadge, Segmented, organizer } from "./ui";
import { useArchived } from "./modals";

export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: React.ReactNode }) {
  return <header className="flex min-h-14 items-center gap-3">
    <div className="min-w-0">
      <h1 className="truncate text-[30px] font-bold leading-tight tracking-[-.02em]">{title}</h1>
      {subtitle && <p className="mt-0.5 truncate text-callout text-ink-2">{subtitle}</p>}
    </div>
    <div className="ml-auto flex shrink-0 items-center gap-2">{children}</div>
  </header>;
}

export function AccountButton() {
  const open = useEmbersStore((s) => s.openSheet);
  return <button type="button" aria-label="Настройки" onClick={() => open("account")} className="rounded-full transition-transform hover:scale-105"><Avatar member={organizer} size={40} ring={false} /></button>;
}

function EventTile({ record, onOpen }: { record: EventRecord; onOpen: () => void }) {
  const now = useClock().getTime();
  const event = record.details;
  const phase = eventPhase(event, now);
  const archiveEvent = useEmbersStore((s) => s.archiveEvent);
  const restoreEvent = useEmbersStore((s) => s.restoreEvent);
  const deleteEvent = useEmbersStore((s) => s.deleteEvent);
  const archived = record.archivedAt != null || (phase === "past" && !record.boardPinned);
  const canRestore = archived;
  return <motion.div layout transition={spring} className="group relative aspect-[2/3] w-full">
    <motion.button type="button" onClick={onOpen} whileHover={{ y: -4 }} whileTap={{ scale: .985 }} transition={spring} className="relative h-full w-full overflow-hidden rounded-[32px] bg-brand text-center text-white shadow-[0_24px_60px_rgba(0,0,0,.28)]">
      {event.cover && <span className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${event.cover})` }} />}
      <span className="absolute -left-16 top-8 h-[280px] w-[280px] rounded-full opacity-90 blur-sm" style={{ background: "var(--ds-brand-glow)" }} />
      <span className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-b from-transparent to-black/55" />
      <span className="glass-tint absolute left-4 top-4 flex h-7 items-center gap-1.5 rounded-full px-2.5 text-footnote font-semibold"><Icon name="crown" size={13} />Организатор</span>
      <span className="absolute right-4 top-4"><PhaseBadge phase={phase} /></span>
      <span className="absolute inset-x-0 bottom-7 flex flex-col items-center px-5">
        <span className="flex -space-x-2">{record.team.slice(0, 4).map((member) => <Avatar key={member.id} member={member} size={32} />)}</span>
        <b className="mt-4 line-clamp-2 text-[26px] font-extrabold leading-tight tracking-[-.02em]">{event.title || "Без названия"}</b>
        <span className="mt-1.5 text-callout font-semibold">{event.date ? eventWhen(event) : "Дата не выбрана"}</span>
        <span className="mt-1 line-clamp-1 text-caption text-white/75">{event.venue || "Локация не выбрана"}</span>
        <span className="mt-4 flex h-8 items-center gap-1.5 rounded-full bg-black/25 px-3.5 text-caption font-semibold backdrop-blur-md"><Icon name="users" size={14} />{record.team.length} в команде</span>
      </span>
    </motion.button>
    <div className="absolute right-4 top-14 flex flex-col gap-2 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
      {!archived && <IconButton label="В архив" tone="tint" size={34} onClick={() => archiveEvent(record.id)}><Archive size={15} /></IconButton>}
      {canRestore && <Button tone="inverse" size="sm" onClick={() => restoreEvent(record.id)}>Вернуть</Button>}
      {archived && <IconButton label="Удалить" tone="danger" size={34} onClick={() => deleteEvent(record.id)}><Trash2 size={15} /></IconButton>}
    </div>
  </motion.div>;
}

function EmptyBoard({ archived }: { archived: boolean }) {
  const resumeCreate = useEmbersStore((s) => s.resumeCreate);
  const open = useEmbersStore((s) => s.openSheet);
  return <div className="grid flex-1 place-items-center pb-16">
    <div className="relative w-[min(460px,100%)]">
      <div className="glass-panel absolute inset-x-14 -top-6 h-12 rounded-[24px] opacity-50" />
      <div className="glass-panel absolute inset-x-7 -top-3 h-12 rounded-[26px] opacity-75" />
      <div className="glass-panel relative flex flex-col items-center rounded-[30px] px-10 pb-8 pt-10 text-center">
        <span className="grid h-[88px] w-[88px] place-items-center rounded-full bg-accent/20 text-accent"><Icon name="calendar" size={40} /></span>
        <h2 className="mt-6 text-headline font-bold">{archived ? "События в архиве" : "Пока нет событий"}</h2>
        <p className="mt-2 text-callout leading-5 text-ink-2">{archived ? <>Прошедшие события лежат в архиве<br />и хранятся там 7 дней</> : <>Создайте событие и пригласите команду<br />или присоединитесь по ссылке от организатора</>}</p>
        <div className="mt-7 flex w-full gap-3">
          <Button tone="primary" size="lg" className="flex-1" onClick={resumeCreate}><Plus size={18} strokeWidth={2.6} />Создать событие</Button>
          <Button tone="secondary" size="lg" className="flex-1" onClick={() => open("join")}>Присоединиться</Button>
        </div>
      </div>
    </div>
  </div>;
}

export function DesktopHub() {
  const board = useBoardEvents();
  const archived = useArchived();
  const events = useEmbersStore((s) => s.events);
  const selectEvent = useEmbersStore((s) => s.selectEvent);
  const setScreen = useEmbersStore((s) => s.setScreen);
  const resumeCreate = useEmbersStore((s) => s.resumeCreate);
  const open = useEmbersStore((s) => s.openSheet);
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState("");
  const source = tab === "upcoming" ? board : archived;
  const typed = query.trim().toLowerCase();
  const visible = typed ? source.filter((item) => `${item.details.title} ${item.details.venue}`.toLowerCase().includes(typed)) : source;
  const empty = !board.length && !archived.length;
  return <div className="flex h-full flex-col">
    <PageHeader title="События">
      {!empty && (searching
        ? <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} onBlur={() => { if (!query) setSearching(false); }} onKeyDown={(event) => { if (event.key === "Escape") { setQuery(""); setSearching(false); } }} placeholder="Поиск по событиям" className="h-10 w-60 rounded-full bg-field px-4 text-callout outline-none placeholder:text-ink-3 focus:ring-2 focus:ring-accent/50" />
        : <IconButton label="Поиск" onClick={() => setSearching(true)}><Search size={17} /></IconButton>)}
      <IconButton label="Новое событие" onClick={resumeCreate}><Plus size={18} /></IconButton>
      <AccountButton />
    </PageHeader>
    {empty || (!board.length && tab === "upcoming" && !typed) ? <>
      {!empty && <Segmented className="mt-4" options={[["upcoming", "Предстоящие"], ["past", "Прошедшие"]] as const} value={tab} onChange={setTab} />}
      <EmptyBoard archived={events.length > 0} />
    </> : <>
      <Segmented className="mt-4 self-start" options={[["upcoming", "Предстоящие"], ["past", "Прошедшие"]] as const} value={tab} onChange={setTab} />
      <div className="no-scrollbar -mx-4 mt-5 min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,320px),1fr))] gap-5">
          {visible.map((record) => <EventTile key={record.id} record={record} onOpen={() => { selectEvent(record.id); setScreen("live"); }} />)}
          {tab === "upcoming" && <button type="button" onClick={resumeCreate} className="col-span-full flex h-[132px] flex-col items-center justify-center rounded-[32px] border-2 border-dashed border-ink/20 text-center transition-colors hover:border-accent/60 hover:bg-accent/5">
            <span className="flex items-center gap-2 text-body font-semibold"><Plus size={18} />Новое событие</span>
            <span className="mt-1.5 text-caption text-ink-2">или <span role="link" tabIndex={0} onClick={(event) => { event.stopPropagation(); open("join"); }} className={cn("underline-offset-2 hover:text-accent hover:underline")}>присоединитесь по ссылке или коду</span></span>
          </button>}
          {!visible.length && <p className="col-span-full py-10 text-center text-callout text-ink-2">{typed ? "Ничего не нашлось" : "Здесь пока пусто"}</p>}
        </div>
      </div>
    </>}
  </div>;
}
