"use client";

import { useRef } from "react";
import { ImagePlus, Plus } from "lucide-react";
import { blankDraft, eventPlace, eventWhen, useEmbersStore } from "@/store/useEmbersStore";
import { TrackingMap, cn } from "../EmbersApp";
import { Avatar, Button, Icon, IconButton, Panel, SectionLabel, useOrganizer } from "./ui";

const emptyTeam: never[] = [];

function CreateOrganizerCard() {
  const organizer = useOrganizer();
  return <>
    <Avatar member={organizer} size={44} ring={false} />
    <p className="mt-2 text-caption text-ink-2">Организатор · {organizer.name}</p>
  </>;
}

export function DesktopCreate() {
  const setScreen = useEmbersStore((s) => s.setScreen);
  const shelveDraft = useEmbersStore((s) => s.shelveDraft);
  const open = useEmbersStore((s) => s.openSheet);
  const draft = useEmbersStore((s) => s.draftEvent?.details ?? blankDraft);
  const team = useEmbersStore((s) => s.draftEvent?.team ?? emptyTeam);
  const roles = useEmbersStore((s) => s.draftEvent?.memberRoles);
  const files = useEmbersStore((s) => s.draftEvent?.programFiles.length ?? 0);
  const updateDraft = useEmbersStore((s) => s.updateDraft);
  const createEvent = useEmbersStore((s) => s.createEvent);
  const coverRef = useRef<HTMLInputElement>(null);
  const hasMap = Boolean(draft.venue) && draft.lat != null && draft.lng != null;
  const bigField = "w-full resize-none bg-transparent text-center text-[30px] font-bold leading-tight tracking-[-.02em] outline-none placeholder:text-ink-3";
  return <div className="flex h-full flex-col">
    <header className="flex h-14 shrink-0 items-center gap-3">
      <IconButton label="Закрыть" tone="hero" onClick={() => setScreen("hub")}><Icon name="close" size={16} /></IconButton>
      <h1 className="text-headline font-semibold">Новое событие</h1>
      <div className="ml-auto flex gap-2">
        <Button tone="hero" onClick={shelveDraft}>Черновик</Button>
        <Button tone="inverse" onClick={createEvent}>Создать</Button>
      </div>
    </header>
    <div className="no-scrollbar mt-2 flex min-h-0 flex-1 gap-6 overflow-y-auto pb-4">
      <div className="flex min-w-0 flex-1 flex-col items-center">
        <input ref={coverRef} type="file" accept="image/*" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) updateDraft({ cover: URL.createObjectURL(file) }); }} />
        <button type="button" onClick={() => coverRef.current?.click()} className="group flex flex-col items-center">
          <span className="glass-tint relative grid h-[76px] w-[76px] place-items-center overflow-hidden rounded-full text-ink transition-transform group-hover:scale-105">{draft.cover ? <span className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${draft.cover})` }} /> : <ImagePlus size={28} />}</span>
          <span className="mt-2 text-footnote font-medium text-ink-2">{draft.cover ? "Сменить обложку" : "Добавить обложку"}</span>
        </button>
        <Panel className="mt-5 w-full max-w-[560px] px-6 [&>*+*]:border-t [&>*+*]:border-line">
          <input value={draft.title} onChange={(event) => updateDraft({ title: event.target.value })} placeholder="Название события" className={cn(bigField, "py-8")} />
          <button type="button" onClick={() => open("datetime")} className="flex w-full flex-col items-center gap-2 py-5 transition-opacity hover:opacity-80">
            <Icon name="calendar" size={18} className="text-ink-2" />
            <span className={cn("text-body", draft.date ? "font-semibold" : "text-ink-2")}>{draft.date ? eventWhen(draft) : "Дата события"}</span>
          </button>
          <button type="button" onClick={() => open("location")} className="flex w-full flex-col items-center gap-2 py-5 transition-opacity hover:opacity-80">
            <Icon name="location" size={18} className="text-ink-2" />
            <span className={cn("text-body", draft.venue ? "font-semibold" : "text-ink-2")}>{draft.venue ? eventPlace(draft) : "Выбрать локацию"}</span>
          </button>
          <textarea value={draft.description} onChange={(event) => updateDraft({ description: event.target.value })} placeholder="Описание" rows={1} style={{ fieldSizing: "content" } as React.CSSProperties} className={cn(bigField, "block py-7")} />
          <div className="flex flex-col items-center py-5">
            <CreateOrganizerCard />
          </div>
        </Panel>
        <p className="mt-6 text-center text-caption text-ink-2">Пригласите команду ссылкой после создания — код появится автоматически</p>
      </div>
      <div className="flex w-[320px] shrink-0 flex-col gap-4">
        <Panel className="p-4">
          <div className="flex h-7 items-center">
            <SectionLabel>Локация</SectionLabel>
            {hasMap && <IconButton label="Убрать локацию" size={26} className="ml-auto" onClick={() => updateDraft({ venue: "", zone: "", lat: null, lng: null })}><Icon name="close" size={12} /></IconButton>}
          </div>
          {hasMap && draft.lat != null && draft.lng != null
            ? <div className="relative mt-3 h-44 overflow-hidden rounded-[18px]"><TrackingMap lat={draft.lat} lng={draft.lng} address={eventPlace(draft)} members={team} user={null} expanded={false} onMember={() => undefined} /></div>
            : <button type="button" onClick={() => open("location")} className="mt-3 grid h-44 w-full place-items-center rounded-[18px] border-2 border-dashed border-ink/20 text-caption text-ink-2 transition-colors hover:border-accent/60"><span className="flex flex-col items-center gap-2"><Icon name="location" size={22} />Выбрать на карте</span></button>}
        </Panel>
        <Panel className="p-4">
          <SectionLabel>Для команды</SectionLabel>
          <div className="mt-3 flex items-center">
            <b className="text-callout font-bold">Команда · {team.length}</b>
            <button type="button" onClick={() => open("invite")} className="ml-auto text-caption font-semibold text-accent">Добавить</button>
          </div>
          <div className="mt-3 space-y-2.5">
            {!team.length && <p className="text-caption text-ink-2">Добавьте людей и роли — расписание можно составить сразу</p>}
            {team.map((member) => <div key={member.id} className="flex items-center gap-2.5">
              <Avatar member={member} size={26} ring={false} />
              <span className="min-w-0 flex-1 truncate text-caption font-semibold">{member.name}</span>
              <span className="shrink-0 text-footnote text-ink-2">{roles?.[member.id] ?? member.role}</span>
            </div>)}
          </div>
          <div className="mt-4 flex items-center gap-3 border-t border-line pt-4">
            <div className="min-w-0 flex-1">
              <b className="block text-callout font-bold">Программа</b>
              <small className="block truncate text-footnote text-ink-2">{files ? `${files} PDF` : "Проходки, инструкции и другие PDF"}</small>
            </div>
            <Button size="sm" onClick={() => open("files")}><Plus size={14} strokeWidth={2.6} />PDF</Button>
          </div>
        </Panel>
      </div>
    </div>
  </div>;
}
