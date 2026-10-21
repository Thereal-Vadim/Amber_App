"use client";

import { useEffect, useRef, useState } from "react";
import { Reorder, useDragControls } from "framer-motion";
import { ArrowDown, Clock3, GripVertical, MoreVertical, Plus } from "lucide-react";
import { type ScheduleBlock, focusedEvent, useEmbersStore } from "@/store/useEmbersStore";
import { LocationMark, clockLabel, cn, minutesOf, spring, splitRange, useClock } from "../EmbersApp";
import { Avatar, Button, Panel, SectionLabel, Segmented, organizer } from "./ui";
import { Menu } from "./live";
import { PageHeader } from "./hub";

const emptyBlocks: ScheduleBlock[] = [];
const placeholderTask = "Добавьте задачу для этой локации";
const dragType = "application/x-amber-location";

function blockWord(count: number) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  return mod10 === 1 && mod100 !== 11 ? "блок" : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? "блока" : "блоков";
}

function useScheduleContext() {
  const record = useEmbersStore(focusedEvent);
  const memberId = useEmbersStore((s) => s.selectedMemberId);
  const people = record.team.length ? record.team : [{ id: "vadim", ...organizer, role: "Организатор" }];
  const person = memberId === "vadim" ? { id: "vadim", ...organizer, role: "Организатор" } : record.team.find((member) => member.id === memberId) ?? people[0];
  return { record, memberId: person.id, person, people };
}

function useIconFor() {
  const groups = useEmbersStore((s) => focusedEvent(s).locationGroups);
  return (name: string) => groups.flatMap((group) => group.locations).find((location) => location.name === name);
}

function ViewSwitch() {
  const view = useEmbersStore((s) => s.scheduleView);
  const setView = useEmbersStore((s) => s.setScheduleView);
  return <Segmented options={[["list", "Список"], ["grid", "Сетка"]] as const} value={view} onChange={setView} />;
}

function goBack() {
  const { scheduleReturn, scheduleOrigin } = useEmbersStore.getState();
  useEmbersStore.setState({ screen: scheduleReturn, sheet: scheduleOrigin === "invite" ? "invite" : null });
}

function TeamColumn() {
  const { record, memberId, people } = useScheduleContext();
  const open = useEmbersStore((s) => s.openSheet);
  return <Panel as="aside" className="flex w-[240px] shrink-0 flex-col p-3">
    <div className="px-2 pt-2">
      <h2 className="text-headline font-bold">Команда</h2>
      <p className="mt-0.5 text-caption text-ink-2">Чьё расписание составляем</p>
    </div>
    <div className="no-scrollbar mt-4 min-h-0 flex-1 space-y-1 overflow-y-auto">
      {people.map((member) => {
        const count = record.schedules[member.id]?.length ?? 0;
        const active = member.id === memberId;
        return <button key={member.id} type="button" onClick={() => useEmbersStore.setState({ selectedMemberId: member.id })} className={cn("flex w-full items-center gap-3 rounded-[18px] border px-2.5 py-2.5 text-left transition-colors", active ? "border-accent/50 bg-accent/15" : "border-transparent hover:bg-ink/5")}>
          <Avatar member={member} size={36} />
          <span className="min-w-0">
            <b className="block truncate text-callout font-semibold">{member.name}</b>
            <small className="block truncate text-footnote text-ink-2">{record.memberRoles[member.id] ?? member.role} · {count ? `${count} ${blockWord(count)}` : "пусто"}</small>
          </span>
        </button>;
      })}
    </div>
    <Button size="sm" className="mt-3 w-full" onClick={() => open("invite")}><Plus size={14} strokeWidth={2.6} />Добавить человека</Button>
  </Panel>;
}

function TaskField({ block }: { block: ScheduleBlock }) {
  const update = useEmbersStore((s) => s.updateScheduleBlock);
  const initial = block.task === placeholderTask ? "" : block.task;
  const [value, setValue] = useState(initial);
  useEffect(() => { setValue(initial); }, [initial]);
  const ref = useRef<HTMLTextAreaElement>(null);
  const commit = () => { if (value.trim() && value.trim() !== initial) update(block.id, { task: value }); };
  return <textarea ref={ref} aria-label="Задача" rows={1} value={value} onChange={(event) => setValue(event.target.value)} onBlur={commit} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); ref.current?.blur(); } if (event.key === "Escape") { setValue(initial); } }} placeholder="Описание — что делать в этой локации" style={{ fieldSizing: "content" } as React.CSSProperties} className="mt-3 block min-h-11 w-full resize-none rounded-[14px] bg-field px-4 py-3 text-callout leading-5 outline-none placeholder:text-ink-3 focus:ring-2 focus:ring-accent/50" />;
}

function TimeChip({ block }: { block: ScheduleBlock }) {
  const update = useEmbersStore((s) => s.updateScheduleBlock);
  const [editing, setEditing] = useState(false);
  const range = splitRange(block.time);
  const [start, setStart] = useState(range.start);
  const [end, setEnd] = useState(range.end);
  const commit = () => {
    const [from, to] = start <= end ? [start, end] : [end, start];
    update(block.id, { time: `${from} – ${to}` });
    setEditing(false);
  };
  if (editing) return <span onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) commit(); }} className="mt-3 inline-flex h-8 items-center gap-1 rounded-full bg-accent px-3 text-caption font-semibold text-on-accent">
    <Clock3 size={13} />
    <input autoFocus aria-label="Начало" type="time" value={start} onChange={(event) => setStart(event.target.value)} onKeyDown={(event) => event.key === "Enter" && commit()} className="bg-transparent tabular outline-none [color-scheme:dark]" />
    –
    <input aria-label="Конец" type="time" value={end} onChange={(event) => setEnd(event.target.value)} onKeyDown={(event) => event.key === "Enter" && commit()} className="bg-transparent tabular outline-none [color-scheme:dark]" />
  </span>;
  return <button type="button" onClick={() => { const next = splitRange(block.time); setStart(next.start); setEnd(next.end); setEditing(true); }} className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-full bg-accent px-3 text-caption font-semibold tabular text-on-accent transition-[filter] hover:brightness-110"><Clock3 size={13} />{block.time}</button>;
}

function TravelGap({ block }: { block: ScheduleBlock }) {
  const update = useEmbersStore((s) => s.updateScheduleBlock);
  const minutes = block.travel ?? 10;
  return <div className="flex h-10 items-center justify-center gap-1 text-caption text-ink-2">
    <ArrowDown size={13} />переход
    <input aria-label="Время перехода" inputMode="numeric" defaultValue={minutes} key={minutes} onBlur={(event) => { const next = Number.parseInt(event.target.value, 10); if (Number.isFinite(next) && next !== minutes) update(block.id, { travel: next }); }} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }} className="w-8 rounded-md bg-transparent text-center tabular text-ink outline-none hover:bg-field focus:bg-field" />
    мин
  </div>;
}

function BlockCard({ block, index, onDropBefore }: { block: ScheduleBlock; index: number; onDropBefore: (name: string) => void }) {
  const controls = useDragControls();
  const remove = useEmbersStore((s) => s.removeScheduleBlock);
  const iconFor = useIconFor();
  const preset = iconFor(block.location);
  const [over, setOver] = useState(false);
  return <Reorder.Item as="div" value={block} dragListener={false} dragControls={controls} whileDrag={{ scale: 1.02, zIndex: 20 }} transition={spring}
    onDragOver={(event: React.DragEvent) => { if (event.dataTransfer.types.includes(dragType)) { event.preventDefault(); setOver(true); } }}
    onDragLeave={() => setOver(false)}
    onDrop={(event: React.DragEvent) => { setOver(false); const name = event.dataTransfer.getData(dragType); if (name) { event.preventDefault(); onDropBefore(name); } }}>
    {index > 0 && <TravelGap block={block} />}
    {over && <div className="mb-2 h-0.5 rounded-full bg-accent" />}
    <Panel className="rounded-[26px] p-4">
      <div className="flex items-center gap-3">
        <button type="button" aria-label={`Переместить ${block.location}`} onPointerDown={(event) => controls.start(event)} className="-ml-1 cursor-grab touch-none text-ink-3 active:cursor-grabbing"><GripVertical size={16} /></button>
        <LocationMark icon={preset?.icon} color={preset?.color ?? block.color} size={32} />
        <b className="min-w-0 flex-1 truncate text-body font-bold">{block.location}</b>
        <Menu trigger={(toggle) => <button type="button" aria-label="Действия" onClick={toggle} className="grid h-8 w-8 place-items-center rounded-full text-ink-3 hover:bg-field"><MoreVertical size={16} /></button>} items={[{ label: "Удалить блок", danger: true, onClick: () => remove(block.id) }]} />
      </div>
      <TaskField block={block} />
      <TimeChip block={block} />
    </Panel>
  </Reorder.Item>;
}

function LibraryColumn() {
  const groups = useEmbersStore((s) => focusedEvent(s).locationGroups);
  const add = useEmbersStore((s) => s.addScheduleBlock);
  const [name, setName] = useState("");
  const submit = () => { if (!name.trim()) return; add(name.trim()); setName(""); };
  return <Panel as="aside" className="flex w-[260px] shrink-0 flex-col p-3">
    <h2 className="px-2 pt-2 text-headline font-bold">Локации</h2>
    <div className="relative mt-4">
      <input value={name} onChange={(event) => setName(event.target.value)} onKeyDown={(event) => event.key === "Enter" && submit()} placeholder="Новая локация" className="h-11 w-full rounded-full bg-field pl-4 pr-12 text-callout outline-none placeholder:text-ink-3 focus:ring-2 focus:ring-accent/50" />
      <button type="button" aria-label="Добавить локацию" onClick={submit} className="absolute right-1.5 top-1.5 grid h-8 w-8 place-items-center rounded-full bg-accent text-on-accent"><Plus size={18} strokeWidth={2.6} /></button>
    </div>
    <div className="no-scrollbar mt-5 min-h-0 flex-1 overflow-y-auto px-1">
      <SectionLabel className="px-1">Стандартные локации</SectionLabel>
      {groups.map((group) => <div key={group.name} className="mt-3">
        <p className="mb-2 px-1 text-caption font-semibold text-ink-2">{group.name}</p>
        <div className="space-y-2">{group.locations.map((location) => <button key={location.id} type="button" draggable onDragStart={(event) => { event.dataTransfer.setData(dragType, location.name); event.dataTransfer.effectAllowed = "copy"; }} onClick={() => add(location.name)} className="flex h-12 w-full cursor-grab items-center gap-3 rounded-[16px] bg-raised px-2.5 text-left text-callout font-medium transition-colors hover:bg-ink/10 active:cursor-grabbing">
          <LocationMark icon={location.icon} color={location.color} />
          <span className="truncate">{location.name}</span>
        </button>)}</div>
      </div>)}
      <p className="mt-5 px-1 text-footnote leading-4 text-ink-3">Перетаскивайте карточки в колонку расписания или нажмите, чтобы добавить в конец</p>
    </div>
  </Panel>;
}

export function DesktopScheduleEditor() {
  const { record, memberId, person } = useScheduleContext();
  const blocks = record.schedules[memberId] ?? emptyBlocks;
  const reorder = useEmbersStore((s) => s.reorderScheduleBlocks);
  const insert = useEmbersStore((s) => s.insertScheduleBlock);
  const origin = useEmbersStore((s) => s.scheduleOrigin);
  const [over, setOver] = useState(false);
  useEffect(() => { if (memberId !== useEmbersStore.getState().selectedMemberId) useEmbersStore.setState({ selectedMemberId: memberId }); }, [memberId]);
  const ranges = blocks.map((block) => splitRange(block.time));
  const first = ranges.map((range) => range.start).sort()[0];
  const last = ranges.map((range) => range.end).sort().at(-1);
  const role = record.memberRoles[memberId] ?? person.role;
  return <div className="flex h-full gap-4">
    <TeamColumn />
    <div className="flex min-w-0 flex-1 flex-col">
      <PageHeader title={origin === "invite" ? "Новое расписание" : "Расписание"} subtitle={[person.name, role, record.details.dateLabel].filter(Boolean).join(" · ")}><ViewSwitch /></PageHeader>
      <div className="no-scrollbar mt-4 min-h-0 flex-1 overflow-y-auto pb-4">
        <Reorder.Group as="div" axis="y" values={blocks} onReorder={reorder}>
          {blocks.map((block, index) => <BlockCard key={block.id} block={block} index={index} onDropBefore={(name) => insert(name, index)} />)}
        </Reorder.Group>
        <div onDragOver={(event) => { if (event.dataTransfer.types.includes(dragType)) { event.preventDefault(); setOver(true); } }} onDragLeave={() => setOver(false)} onDrop={(event) => { setOver(false); const name = event.dataTransfer.getData(dragType); if (name) insert(name, blocks.length); }} className={cn("mt-4 grid h-[88px] place-items-center rounded-[26px] border-2 border-dashed text-callout transition-colors", over ? "border-accent bg-accent/10 text-accent" : "border-ink/20 text-ink-2")}>
          {over ? "Отпустите, чтобы добавить" : "Перетащите локацию из библиотеки справа"}
        </div>
      </div>
      <Panel className="flex h-16 shrink-0 items-center gap-3 rounded-full pl-6 pr-2">
        <span className="text-callout font-semibold">Итого: {blocks.length} {blockWord(blocks.length)}{first && last ? ` · ${first} – ${last}` : ""}</span>
        <Button tone="primary" size="lg" className="ml-auto h-12 px-8" onClick={goBack}>Готово</Button>
      </Panel>
    </div>
    <LibraryColumn />
  </div>;
}

export function DesktopScheduleGrid() {
  const record = useEmbersStore(focusedEvent);
  const setView = useEmbersStore((s) => s.setScheduleView);
  const now = useClock();
  const minutes = now.getHours() * 60 + now.getMinutes();
  const iconFor = useIconFor();
  const people = record.team.length ? record.team : [{ id: "vadim", ...organizer, role: "Организатор" }];
  const parsed = people.map((member) => ({ member, blocks: (record.schedules[member.id] ?? []).map((block) => { const range = splitRange(block.time); return { block, from: minutesOf(range.start) ?? 0, to: minutesOf(range.end) ?? 0 }; }) }));
  const all = parsed.flatMap((row) => row.blocks);
  const start = Math.floor(Math.min(8 * 60, ...all.map((item) => item.from)) / 120) * 120;
  const end = Math.ceil(Math.max(22 * 60, ...all.map((item) => item.to)) / 120) * 120;
  const span = end - start;
  const at = (value: number) => `${((value - start) / span) * 100}%`;
  const ticks = Array.from({ length: span / 120 }, (_, index) => start + index * 120);
  const edit = (id: string) => { useEmbersStore.setState({ selectedMemberId: id }); setView("list"); };
  const showNow = minutes >= start && minutes <= end;
  const freshTarget = parsed.find((row) => !row.blocks.length)?.member.id ?? useEmbersStore.getState().selectedMemberId;
  return <div className="flex h-full flex-col">
    <PageHeader title="Расписание команды" subtitle={[record.details.title, record.details.dateLabel].filter(Boolean).join(" · ")}>
      <ViewSwitch />
      <Button tone="primary" onClick={() => edit(freshTarget)}><Plus size={16} strokeWidth={2.6} />Новое расписание</Button>
      <Button onClick={goBack}>Закрыть</Button>
    </PageHeader>
    <Panel className="mt-4 flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex h-12 shrink-0 border-b border-line">
        <div className="w-[200px] shrink-0" />
        <div className="relative mr-6 flex-1">
          {ticks.map((tick) => <span key={tick} className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 text-footnote tabular text-ink-2" style={{ left: at(tick) }}>{clockLabel(tick % 1440)}</span>)}
          {showNow && <span className="absolute bottom-0 z-10 -translate-x-1/2 translate-y-1/2 whitespace-nowrap rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-on-accent" style={{ left: at(minutes) }}>СЕЙЧАС</span>}
        </div>
      </div>
      <div className="no-scrollbar relative flex min-h-0 flex-1 flex-col overflow-y-auto">
        {parsed.map(({ member, blocks }) => <div key={member.id} className="group flex max-h-[140px] min-h-[96px] flex-1 border-b border-line last:border-b-0">
          <button type="button" onClick={() => edit(member.id)} className="flex w-[200px] shrink-0 items-center gap-3 px-5 text-left">
            <Avatar member={member} size={36} />
            <span className="min-w-0"><b className="block truncate text-callout font-semibold">{member.name}</b><small className="block truncate text-footnote text-ink-2">{record.memberRoles[member.id] ?? member.role}</small></span>
          </button>
          <div className="relative mr-6 flex-1">
            {ticks.map((tick) => <i key={tick} className="absolute inset-y-0 w-px bg-line" style={{ left: at(tick) }} />)}
            {blocks.map(({ block, from, to }) => {
              const color = iconFor(block.location)?.color ?? block.color;
              return <button key={block.id} type="button" onClick={() => edit(member.id)} title={`${block.location} · ${block.time}`} className="absolute inset-y-3 overflow-hidden rounded-[12px] border py-2 pl-3.5 pr-2 text-left transition-[filter] hover:brightness-125" style={{ left: at(from), width: `max(28px, calc(${((to - from) / span) * 100}% - 4px))`, background: `color-mix(in srgb, ${color} 32%, transparent)`, borderColor: `color-mix(in srgb, ${color} 45%, transparent)` }}>
                <i className="absolute inset-y-0 left-0 w-[3px]" style={{ background: color }} />
                <b className="block truncate text-footnote font-semibold">{block.location}</b>
                <small className="block truncate text-footnote text-ink-2">{block.task === placeholderTask ? "" : block.task}</small>
              </button>;
            })}
            {!blocks.length && <button type="button" onClick={() => edit(member.id)} className="absolute inset-y-3 left-3 grid w-48 place-items-center rounded-[12px] border-2 border-dashed border-ink/20 text-caption text-ink-2 transition-colors hover:border-accent/60 hover:text-accent">+ Добавить блок</button>}
          </div>
        </div>)}
        {showNow && <div className="pointer-events-none absolute inset-y-0 left-[200px] right-6">
          <i className="absolute inset-y-0 w-0.5 -translate-x-1/2 bg-accent" style={{ left: at(minutes) }} />
        </div>}
      </div>
    </Panel>
  </div>;
}
