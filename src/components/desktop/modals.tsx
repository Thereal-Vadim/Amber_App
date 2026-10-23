"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, FileText, Mic, Plus, Search, Trash2, X } from "lucide-react";
import {
  type LocationIcon, type Sheet, type Status, type ThemePreference, archiveDaysLeft, blankDraft, eventPhase, eventPlace, eventWhen, focusedEvent,
  formatDateLabel, isOnBoard, locationIconNames, presetColors, statusMeta, useEmbersStore,
} from "@/store/useEmbersStore";
import { notificationPermission, requestNotificationPermission, showNotification } from "@/notifications";
import {
  type MapPlace, LocationMark, QrScanner, TrackingMap, accountEmail, cn, knownPlaces, locationIconLabel, locationIconMap, roleSuggestions, ruDays,
  shareInvite, shareResult, startDictation, timezones, useClock,
} from "../EmbersApp";
import { permissionKeys, permissionLabels, type MemberPermissions } from "@/lib/permissions";
import { signOutUser } from "@/lib/auth";
import { Avatar, Button, Chip, EmptyNote, EventThumb, Icon, IconButton, ListGroup, ListRow, Modal, PhaseBadge, Segmented, Switch, TextField, useOrganizer } from "./ui";

export function useArchived() {
  const events = useEmbersStore((s) => s.events);
  const time = useClock().getTime();
  return events.filter((event) => !isOnBoard(event, time));
}

function Note({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn("mt-2 px-4 text-footnote leading-4 text-ink-2", className)}>{children}</p>;
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="mt-5"><p className="mb-2 px-4 text-caption font-medium text-ink-2">{label}</p>{children}</div>;
}

function JoinModal() {
  const code = useEmbersStore((s) => s.joinCode);
  const setCode = useEmbersStore((s) => s.setJoinCode);
  const error = useEmbersStore((s) => s.joinError);
  const join = useEmbersStore((s) => s.joinByCode);
  const event = useEmbersStore((s) => s.events.find((item) => item.code === s.joinCode));
  const [scanning, setScanning] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const onCode = useCallback((value: string) => { useEmbersStore.getState().setJoinCode(value); useEmbersStore.getState().setNotice("Код найден"); setScanning(false); }, []);
  const extract = (text: string) => text.toUpperCase().match(/[A-Z0-9]{6}/g)?.at(-1);
  return <div className="text-center">
    <p className="text-callout text-ink-2">Введите код или вставьте ссылку от организатора</p>
    <div className="relative mx-auto mt-5 w-fit" onClick={() => inputRef.current?.focus()}>
      <input ref={inputRef} autoFocus aria-label="Код приглашения" value={code} onChange={(e) => setCode(e.target.value)} onPaste={(e) => { const found = extract(e.clipboardData.getData("text")); if (found) { e.preventDefault(); setCode(found); } }} onKeyDown={(e) => e.key === "Enter" && join()} className="absolute inset-0 z-10 cursor-text opacity-0" />
      <div className="flex gap-2.5">{Array.from({ length: 6 }, (_, i) => <span key={i} className={cn("grid h-[60px] w-[52px] place-items-center rounded-[14px] bg-field text-[26px] font-semibold tabular", i === code.length && "ring-2 ring-accent")}>{code[i] ?? ""}</span>)}</div>
    </div>
    <p className={cn("mt-3 min-h-4 text-footnote", error ? "text-danger" : "text-ink-2")}>{error || (event ? `${event.details.title} · пригласил ${event.organizer.name} · ${event.team.length} в команде` : "")}</p>
    <div className="my-5 h-px bg-line" />
    <p className="text-caption text-ink-2">или отсканируйте QR с телефона организатора</p>
    <div className="mt-4 flex justify-center">
      {scanning
        ? <div className="w-full overflow-hidden rounded-[20px]"><QrScanner onCode={onCode} /></div>
        : <button type="button" onClick={() => setScanning(true)} aria-label="Включить камеру" className="grid h-[120px] w-[120px] place-items-center rounded-[22px] bg-white transition-transform hover:scale-105"><Icon name="qr-large" size={76} className="text-black" /></button>}
    </div>
    <Button tone="primary" size="lg" className="mt-6 w-full" onClick={() => join()}>Присоединиться</Button>
    <p className="mt-3 text-footnote text-ink-3">{scanning ? <button type="button" onClick={() => setScanning(false)} className="text-link">Выключить камеру</button> : "Камера ноутбука используется только для QR"}</p>
  </div>;
}

function DateModal() {
  const draft = useEmbersStore((s) => s.draftEvent?.details ?? blankDraft);
  const toggleAllDay = useEmbersStore((s) => s.toggleAllDay);
  const updateDraft = useEmbersStore((s) => s.updateDraft);
  const field = "ml-auto rounded-[10px] bg-field px-2.5 py-1.5 tabular outline-none focus:ring-2 focus:ring-accent/50";
  return <>
    <ListGroup>
      <ListRow value={<Switch on={draft.allDay} onToggle={toggleAllDay} label="Весь день" />}>Весь день</ListRow>
      <ListRow value={<input type="date" value={draft.date} onChange={(e) => e.target.value && updateDraft({ date: e.target.value, dateLabel: formatDateLabel(e.target.value) })} className={field} />}>Дата</ListRow>
      {!draft.allDay && <ListRow value={<input type="time" value={draft.time} onChange={(e) => e.target.value && updateDraft({ time: e.target.value })} className={field} />}>Начало</ListRow>}
      {draft.endTime
        ? <ListRow value={<span className="flex items-center gap-3"><input type="time" value={draft.endTime} onChange={(e) => updateDraft({ endTime: e.target.value })} className={field} /><button type="button" onClick={() => updateDraft({ endTime: "" })} className="text-caption text-ink-2 hover:text-danger">Убрать</button></span>}>Окончание</ListRow>
        : <ListRow onClick={() => updateDraft({ endTime: "23:00" })} chevron={false}><span className="text-accent">Добавить время окончания</span></ListRow>}
    </ListGroup>
    <Group label="Часовой пояс">
      <div className="flex flex-wrap gap-2 px-1">{timezones.map((zone) => <Chip key={zone} active={draft.timezone === zone} onClick={() => updateDraft({ timezone: zone })}>{zone}</Chip>)}</div>
    </Group>
    <Note className="mt-4">Время начала увидит вся команда. Тайминг программы подстроится под эту дату автоматически.</Note>
  </>;
}

function LocationModal() {
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
        .then((rows: Array<{ place_id: number; display_name: string; lat: string; lon: string }>) => setResults(rows.map((row) => {
          const parts = row.display_name.split(",").map((part) => part.trim());
          return { id: String(row.place_id), name: parts.slice(0, 2).join(", "), address: parts.slice(2).join(", ") || row.display_name, lat: Number(row.lat), lng: Number(row.lon) };
        })))
        .catch(() => undefined);
    }, 350);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query]);
  const choose = (place: MapPlace) => updateDraft({ venue: place.address.startsWith(place.name) ? place.address : `${place.name}, ${place.address}`, lat: place.lat, lng: place.lng });
  const useCurrent = () => {
    if (!navigator.geolocation) { setNotice("Геолокация недоступна"); return; }
    navigator.geolocation.getCurrentPosition(async (position) => {
      const { latitude: lat, longitude: lng } = position.coords;
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
  const suggestions = results.length ? results : typed ? knownPlaces.filter((place) => `${place.name} ${place.address}`.toLowerCase().includes(typed)) : knownPlaces;
  return <div className="grid grid-cols-[minmax(0,1fr)_300px] gap-5">
    <div>
      <div className="flex h-11 items-center gap-2 rounded-full bg-field px-4 text-ink-2 focus-within:ring-2 focus-within:ring-accent/50">
        <Search size={16} />
        <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Поиск локации" className="min-w-0 flex-1 bg-transparent text-callout text-ink outline-none placeholder:text-ink-3" />
        <button type="button" aria-label="Голосовой поиск" onClick={() => { if (!startDictation(setQuery)) setNotice("Голосовой поиск недоступен в этом браузере"); }} className="text-ink"><Mic size={16} /></button>
      </div>
      <Group label="Подсказки">
        <ListGroup>
          <button type="button" onClick={useCurrent} className="flex h-14 w-full items-center gap-3 px-4 text-left text-callout hover:bg-ink/5"><span className="grid h-8 w-8 place-items-center rounded-full bg-info text-white"><Icon name="nav" size={14} /></span>Текущее местоположение</button>
          {suggestions.map((place) => <button key={place.id} type="button" onClick={() => choose(place)} className="flex h-14 w-full items-center gap-3 px-4 text-left hover:bg-ink/5">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-field"><Icon name="location" size={15} /></span>
            <span className="min-w-0 flex-1"><b className="block truncate text-callout font-normal">{place.name}</b><small className="block truncate text-footnote text-ink-2">{place.address}</small></span>
            {draft.lat === place.lat && draft.lng === place.lng && <Check size={16} className="text-info" />}
          </button>)}
        </ListGroup>
      </Group>
      <Group label="Название места">
        <TextField value={draft.zone} onChange={(zone) => updateDraft({ zone })} placeholder="Например, дом Вадима Филатова" className="w-full rounded-[16px]" />
        <Note>Необязательно. Будет видно в приглашении.</Note>
      </Group>
    </div>
    <div className="flex flex-col">
      <div className="relative min-h-[300px] flex-1 overflow-hidden rounded-[22px] bg-field">
        {draft.lat != null && draft.lng != null
          ? <TrackingMap lat={draft.lat} lng={draft.lng} address={eventPlace(draft)} members={[]} user={null} expanded={false} onMember={() => undefined} />
          : <div className="grid h-full place-items-center px-6 text-center text-caption text-ink-2">Выберите место слева — здесь появится карта</div>}
      </div>
      {draft.venue && <p className="mt-3 line-clamp-2 px-1 text-caption text-ink-2">{draft.venue}</p>}
    </div>
  </div>;
}

function DesktopPermissions({ memberId }: { memberId: string }) {
  const record = useEmbersStore(focusedEvent);
  const currentUser = useEmbersStore((s) => s.currentUser);
  const setMemberPermissions = useEmbersStore((s) => s.setMemberPermissions);
  if (currentUser?.uid !== record.ownerId || memberId === record.ownerId) return null;
  const value = record.permissions[memberId] ?? permissionKeys.reduce((acc, key) => ({ ...acc, [key]: false }), {} as MemberPermissions);
  return <div className="mt-2 space-y-1 rounded-[14px] bg-field p-2">
    {permissionKeys.map((key) => <button key={key} type="button" onClick={() => setMemberPermissions(memberId, { ...value, [key]: !value[key] })} className="flex w-full items-center gap-2 rounded-[10px] px-2 py-1.5 text-left hover:bg-ink/5">
      <span className="min-w-0 flex-1"><b className="block text-footnote">{permissionLabels[key].title}</b><small className="text-footnote text-ink-3">{permissionLabels[key].hint}</small></span>
      <span className={cn("grid h-5 w-5 place-items-center rounded-full", value[key] ? "bg-accent text-on-accent" : "bg-ink/15")}>{value[key] ? <Check size={12} /> : null}</span>
    </button>)}
  </div>;
}

function InviteModal() {
  const record = useEmbersStore(focusedEvent);
  const organizer = useOrganizer();
  const currentUser = useEmbersStore((s) => s.currentUser);
  const addOpenRole = useEmbersStore((s) => s.addOpenRole);
  const addTeamMember = useEmbersStore((s) => s.addTeamMember);
  const openSchedule = useEmbersStore((s) => s.openSchedule);
  const setView = useEmbersStore((s) => s.setScheduleView);
  const setNotice = useEmbersStore((s) => s.setNotice);
  const isOwner = currentUser?.uid === record.ownerId;
  const [personName, setPersonName] = useState("");
  const [personRole, setPersonRole] = useState("");
  const [roleName, setRoleName] = useState("");
  const [rightsFor, setRightsFor] = useState<string | null>(null);
  const link = `amber.app/j/${record.code}`;
  const savePerson = () => {
    const before = record.team.length;
    addTeamMember(personName, personRole);
    if (focusedEvent(useEmbersStore.getState()).team.length > before) { setPersonName(""); setPersonRole(""); }
  };
  const schedule = (id: string) => { setView("list"); openSchedule(id, "invite"); };
  return <>
    <div className="flex items-center gap-5 rounded-card bg-raised p-4">
      <span className="grid h-[104px] w-[104px] shrink-0 place-items-center rounded-[18px] bg-white"><Icon name="qr-large" size={76} className="text-black" /></span>
      <div className="min-w-0">
        <b className="text-body font-bold">Пригласите команду</b>
        <p className="mt-1 truncate text-callout text-accent">{link}</p>
        <p className="text-footnote text-ink-2">Код: {record.code}</p>
        <div className="mt-3 flex gap-2">
          <Button tone="primary" size="sm" onClick={() => { void shareInvite(record.details.title || "Событие", record.code).then(shareResult); }}><Icon name="share" size={14} />Поделиться</Button>
          <Button size="sm" onClick={() => { void navigator.clipboard.writeText(`https://${link}`).then(() => setNotice("Ссылка скопирована"), () => setNotice("Не удалось скопировать")); }}><Icon name="link" size={14} />Копировать</Button>
        </div>
      </div>
    </div>
    <Group label={`Участники · ${record.team.length + 1 + record.openRoles.length}`}>
      <ListGroup>
        <button type="button" onClick={() => schedule(organizer.id)} className="flex h-14 w-full items-center gap-3 px-4 text-left hover:bg-ink/5">
          <Avatar member={organizer} size={36} ring={false} />
          <span className="min-w-0 flex-1"><b className="flex items-center gap-1.5 text-callout font-semibold">{organizer.name}<Icon name="crown" size={13} className="text-accent" /></b><small className="text-footnote text-ink-2">{record.memberRoles[organizer.id] ?? "Организатор"}</small></span>
          <span className="text-caption text-ink-3">Расписание ›</span>
        </button>
        {record.team.map((member) => <div key={member.id}>
          <button type="button" onClick={() => schedule(member.id)} className="flex h-14 w-full items-center gap-3 px-4 text-left hover:bg-ink/5">
            <Avatar member={member} size={36} ring={false} />
            <span className="min-w-0 flex-1"><b className="block truncate text-callout font-semibold">{member.name}</b><small className="text-footnote text-ink-2">{record.memberRoles[member.id] ?? member.role}</small></span>
            <span className="text-caption text-ink-3">Расписание ›</span>
          </button>
          {isOwner && <button type="button" onClick={() => setRightsFor(rightsFor === member.id ? null : member.id)} className="w-full px-4 pb-2 text-left text-footnote font-semibold text-accent">{rightsFor === member.id ? "Скрыть права" : "Права"}</button>}
          {rightsFor === member.id && <div className="px-3 pb-3"><DesktopPermissions memberId={member.id} /></div>}
        </div>)}
        {record.openRoles.map((role) => <div key={role} className="flex h-14 items-center gap-3 px-4">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-field text-ink-2"><Plus size={16} /></span>
          <span><b className="block text-callout font-semibold">{role}</b><small className="text-footnote text-ink-2">Свободная роль</small></span>
        </div>)}
      </ListGroup>
    </Group>
    <Group label="Добавить участника">
      <div className="rounded-card bg-raised p-3">
        <div className="flex gap-2">
          <TextField value={personName} onChange={setPersonName} onEnter={savePerson} placeholder="Имя" className="flex-1" />
          <TextField value={personRole} onChange={setPersonRole} onEnter={savePerson} placeholder="Роль" className="w-36" />
          <Button tone="primary" onClick={savePerson}>Добавить</Button>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">{roleSuggestions.map((item) => <Chip key={item} active={personRole === item} onClick={() => setPersonRole(item)}>{item}</Chip>)}</div>
      </div>
    </Group>
    <Group label="Свободная роль">
      <div className="flex gap-2">
        <TextField value={roleName} onChange={setRoleName} onEnter={() => { addOpenRole(roleName); setRoleName(""); }} placeholder="Например, продюсер" className="flex-1" />
        <Button onClick={() => { addOpenRole(roleName); setRoleName(""); }}>Добавить роль</Button>
      </div>
    </Group>
  </>;
}

function FilesModal() {
  const files = useEmbersStore((s) => focusedEvent(s).programFiles);
  const addFile = useEmbersStore((s) => s.addProgramFile);
  const removeFile = useEmbersStore((s) => s.removeProgramFile);
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const formatSize = (size: number) => size < 1024 * 1024 ? `${Math.max(1, Math.round(size / 1024))} КБ` : `${(size / 1024 / 1024).toFixed(1)} МБ`;
  const pick = (list: FileList | null) => {
    const picked = [...(list ?? [])];
    const pdfs = picked.filter((file) => file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf"));
    if (picked.length && !pdfs.length) useEmbersStore.getState().setNotice("Можно добавить только PDF");
    pdfs.forEach((file) => addFile({ id: `${file.name}-${file.size}-${Date.now()}`, name: file.name, size: file.size, url: URL.createObjectURL(file) }));
    if (inputRef.current) inputRef.current.value = "";
  };
  return <>
    <p className="px-1 text-caption leading-5 text-ink-2">Проходки на концерт, инструкции и любые другие PDF для команды.</p>
    <input ref={inputRef} type="file" accept="application/pdf,.pdf" multiple className="hidden" onChange={(e) => pick(e.target.files)} />
    <button type="button" onClick={() => inputRef.current?.click()} onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={(e) => { e.preventDefault(); setOver(false); pick(e.dataTransfer.files); }} className={cn("mt-4 flex h-28 w-full flex-col items-center justify-center gap-1 rounded-card border-2 border-dashed transition-colors", over ? "border-accent bg-accent/10" : "border-ink/20 hover:border-accent/60")}>
      <span className="flex items-center gap-2 text-callout font-semibold"><Plus size={16} />Добавить PDF</span>
      <span className="text-footnote text-ink-2">или перетащите файлы сюда</span>
    </button>
    <ListGroup className="mt-4">
      {!files.length && <EmptyNote>Пока нет файлов</EmptyNote>}
      {files.map((file) => <div key={file.id} className="flex items-center gap-3 px-4 py-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-accent/15 text-accent"><FileText size={18} /></span>
        <a href={file.url} target="_blank" rel="noreferrer" className="min-w-0 flex-1"><b className="block truncate text-callout">{file.name}</b><small className="text-footnote text-ink-2">{formatSize(file.size)}</small></a>
        <IconButton label="Удалить файл" size={30} onClick={() => removeFile(file.id)}><X size={14} /></IconButton>
      </div>)}
    </ListGroup>
  </>;
}

function StatusModal() {
  const record = useEmbersStore(focusedEvent);
  const update = useEmbersStore((s) => s.updateMyStatus);
  const toggle = useEmbersStore((s) => s.toggleShareLocation);
  const share = record.shareLocation;
  const requestShare = () => {
    if (share) { toggle(); return; }
    if (!navigator.geolocation) { useEmbersStore.getState().setNotice("Геолокация недоступна"); return; }
    navigator.geolocation.getCurrentPosition(() => toggle(), () => useEmbersStore.getState().setNotice("Разрешите доступ к геопозиции"));
  };
  const items: Array<[Status, string, "pin" | "nav" | "check" | "users"]> = [["on_site", "Я на месте", "pin"], ["in_transit", "Еду, отмечу время в пути", "nav"], ["ready", "Можно начинать", "check"], ["gathering", "Собираю команду", "users"]];
  return <>
    <div className="grid grid-cols-2 gap-3">{items.map(([id, sub, icon]) => {
      const meta = statusMeta[id];
      const active = record.myStatus === id;
      return <button key={id} type="button" onClick={() => update(id)} className={cn("relative flex h-[136px] flex-col items-start rounded-card border-2 bg-raised p-4 text-left transition-colors hover:bg-ink/10", active ? "border-success" : "border-transparent")}>
        <span className="grid h-11 w-11 place-items-center rounded-full" style={{ color: meta.color, background: `color-mix(in srgb, ${meta.color} 20%, transparent)` }}><Icon name={icon} size={20} /></span>
        <b className="mt-auto text-callout font-bold">{meta.label}</b>
        <small className="text-footnote text-ink-2">{sub}</small>
        {active && <span className="absolute right-3 top-3 grid h-6 w-6 place-items-center rounded-full bg-success text-black"><Check size={14} /></span>}
      </button>;
    })}</div>
    <ListGroup className="mt-4"><ListRow value={<Switch on={share} onToggle={requestShare} label="Делиться геопозицией" />}>Делиться геопозицией</ListRow></ListGroup>
    <Note>Команда увидит ваш статус и точку на карте</Note>
  </>;
}

function PhoneModal() {
  const setScreen = useEmbersStore((s) => s.setScreen);
  const setPhone = useEmbersStore((s) => s.setProfilePhone);
  const [value, setValue] = useState("");
  const submit = () => {
    if (value.replace(/\D/g, "").length < 10) { useEmbersStore.getState().setNotice("Введите номер полностью"); return; }
    setPhone(value.trim());
    setScreen("hub");
  };
  return <>
    <p className="px-1 text-caption leading-5 text-ink-2">Номер сохранится в аккаунте. Код подтверждения появится, когда подключим отправку сообщений.</p>
    <TextField autoFocus value={value} onChange={setValue} onEnter={submit} inputMode="tel" placeholder="+7 900 000-00-00" className="mt-4 h-12 w-full text-body" />
    <Button tone="primary" size="lg" className="mt-4 w-full" onClick={submit}>Продолжить</Button>
  </>;
}

function ArchiveList() {
  const selectEvent = useEmbersStore((s) => s.selectEvent);
  const setScreen = useEmbersStore((s) => s.setScreen);
  const restoreEvent = useEmbersStore((s) => s.restoreEvent);
  const deleteEvent = useEmbersStore((s) => s.deleteEvent);
  const time = useClock().getTime();
  const archived = useArchived();
  return <>
    <p className="px-1 text-caption leading-5 text-ink-2">События в архиве хранятся 7 дней, затем архив очищается. Любое из них можно вернуть на доску.</p>
    {!archived.length && <p className="py-10 text-center text-callout text-ink-2">Архив пуст</p>}
    <div className="mt-4 space-y-2">{archived.map((event) => {
      const phase = eventPhase(event.details, time);
      const days = archiveDaysLeft(event.details, time, event.archivedAt);
      return <div key={event.id} className="group flex items-center gap-3 rounded-card bg-raised p-3">
        <button type="button" onClick={() => { selectEvent(event.id); setScreen("live"); }} className="flex min-w-0 flex-1 items-center gap-3 text-left">
          <EventThumb cover={event.details.cover} size={44} />
          <span className="min-w-0 flex-1">
            <b className="block truncate text-callout font-semibold">{event.details.title || "Без названия"}</b>
            <small className="block truncate text-footnote text-ink-2">{eventWhen(event.details)}</small>
            <small className="block text-footnote text-ink-3">{days <= 0 ? "Удалится сегодня" : `Ещё ${ruDays(days)}`}</small>
          </span>
        </button>
        <span className="rounded-full bg-brand"><PhaseBadge phase={phase} /></span>
        <Button tone="inverse" size="sm" onClick={() => restoreEvent(event.id)}>Вернуть</Button>
        <IconButton label="Удалить" size={32} onClick={() => deleteEvent(event.id)} className="opacity-0 transition-opacity group-hover:opacity-100"><Trash2 size={14} /></IconButton>
      </div>;
    })}</div>
  </>;
}

function LocationEditor({ id }: { id: string }) {
  const groups = useEmbersStore((s) => focusedEvent(s).locationGroups);
  const update = useEmbersStore((s) => s.updatePresetLocation);
  const located = groups.flatMap((group) => group.locations.map((location) => ({ ...location, group: group.name }))).find((location) => location.id === id);
  if (!located) return <EmptyNote>Локация удалена</EmptyNote>;
  return <>
    <div className="flex items-center gap-3 rounded-card bg-raised p-4"><LocationMark icon={located.icon} color={located.color} size={52} /><div className="min-w-0"><p className="truncate text-body font-semibold">{located.name}</p><p className="truncate text-caption text-ink-2">{located.group}</p></div></div>
    <Group label="Группа"><div className="flex flex-wrap gap-2 px-1">{groups.map((group) => <Chip key={group.name} active={located.group === group.name} onClick={() => update(id, { group: group.name })}>{group.name}</Chip>)}</div></Group>
    <Group label="Иконка"><div className="grid grid-cols-6 gap-2 rounded-card bg-raised p-3">{locationIconNames.map((icon: LocationIcon) => { const Glyph = locationIconMap[icon]; return <button key={icon} type="button" aria-label={locationIconLabel[icon]} aria-pressed={located.icon === icon} onClick={() => update(id, { icon })} className={cn("grid aspect-square place-items-center rounded-[14px] transition-colors", located.icon === icon ? "bg-accent text-on-accent" : "bg-field text-ink-2 hover:text-ink")}><Glyph size={20} /></button>; })}</div></Group>
    <Group label="Цвет"><div className="flex justify-between rounded-card bg-raised p-4">{presetColors.map((color) => <button key={color} type="button" aria-label={`Цвет ${color}`} aria-pressed={located.color === color} onClick={() => update(id, { color })} style={{ background: color }} className={cn("h-8 w-8 rounded-full transition-transform hover:scale-110", located.color === color && "ring-2 ring-ink ring-offset-2 ring-offset-canvas")} />)}</div></Group>
  </>;
}

function PresetLocations({ onEdit }: { onEdit: (id: string) => void }) {
  const groups = useEmbersStore((s) => focusedEvent(s).locationGroups);
  const add = useEmbersStore((s) => s.addPresetLocation);
  const addGroup = useEmbersStore((s) => s.addLocationGroup);
  const remove = useEmbersStore((s) => s.removePresetLocation);
  const removeGroup = useEmbersStore((s) => s.removeLocationGroup);
  const [category, setCategory] = useState(groups[0]?.name ?? "");
  const [name, setName] = useState("");
  const [groupName, setGroupName] = useState("");
  const current = groups.find((group) => group.name === category) ?? groups[0];
  const submit = () => {
    if (!name.trim() || !current) return;
    const before = current.locations.length;
    add(current.name, name);
    if ((focusedEvent(useEmbersStore.getState()).locationGroups.find((group) => group.name === current.name)?.locations.length ?? before) > before) setName("");
  };
  const submitGroup = () => {
    const title = groupName.trim();
    if (!title) return;
    const before = groups.length;
    addGroup(title);
    if (focusedEvent(useEmbersStore.getState()).locationGroups.length > before) { setCategory(title); setGroupName(""); }
  };
  return <>
    <p className="px-1 text-caption leading-5 text-ink-2">Эти локации появляются в библиотеке расписания. Их можно перетаскивать в программу человека.</p>
    <div className="mt-4 flex flex-wrap items-center gap-2">
      {groups.map((group) => <span key={group.name} className="group relative">
        <Chip active={current?.name === group.name} onClick={() => setCategory(group.name)}>{group.name} · {group.locations.length}</Chip>
        <button type="button" aria-label={`Удалить группу ${group.name}`} onClick={() => { removeGroup(group.name); if (category === group.name) setCategory(""); }} className="absolute -right-1.5 -top-1.5 hidden h-5 w-5 place-items-center rounded-full bg-danger text-white group-hover:grid"><X size={11} /></button>
      </span>)}
      <span className="flex items-center gap-1"><input value={groupName} onChange={(e) => setGroupName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submitGroup()} placeholder="Новая группа" className="h-8 w-32 rounded-full bg-field px-3 text-caption outline-none placeholder:text-ink-3 focus:ring-2 focus:ring-accent/50" />{groupName && <IconButton label="Добавить группу" tone="primary" size={28} onClick={submitGroup}><Plus size={14} /></IconButton>}</span>
    </div>
    {current && <div className="mt-4 flex gap-2"><TextField value={name} onChange={setName} onEnter={submit} placeholder={`Новая локация в «${current.name}»`} className="flex-1" /><IconButton label="Добавить локацию" tone="primary" size={44} onClick={submit}><Plus size={20} /></IconButton></div>}
    <ListGroup className="mt-3">
      {!groups.length && <EmptyNote>Добавьте группу, чтобы начать</EmptyNote>}
      {current && !current.locations.length && <EmptyNote>В этой группе пока нет локаций</EmptyNote>}
      {current?.locations.map((location) => <div key={location.id} className="group flex h-14 items-center gap-2 px-4">
        <button type="button" onClick={() => onEdit(location.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left"><LocationMark icon={location.icon} color={location.color} /><span className="min-w-0 flex-1 truncate text-callout">{location.name}</span><span className="text-caption text-ink-3">Изменить ›</span></button>
        <IconButton label={`Удалить ${location.name}`} size={30} onClick={() => remove(current.name, location.id)} className="opacity-0 transition-opacity group-hover:opacity-100"><X size={14} /></IconButton>
      </div>)}
    </ListGroup>
  </>;
}

type SettingsPage = "root" | "notifications" | "calendar" | "email" | "privacy" | "help" | "terms" | "locations" | "archive" | `edit:${string}`;

const pageTitles: Record<string, string> = { notifications: "Уведомления", calendar: "Календарь", email: "Письма", privacy: "Конфиденциальность", help: "Помощь", terms: "Условия", locations: "Заготовленные локации", archive: "Архив" };

function NotificationsPage() {
  const prefs = useEmbersStore((s) => s.accountPrefs);
  const setPref = useEmbersStore((s) => s.setAccountPref);
  const setNotice = useEmbersStore((s) => s.setNotice);
  const [permission, setPermission] = useState(notificationPermission);
  const enable = async () => {
    if (prefs.notifications) { setPref("notifications", false); return; }
    const result = await requestNotificationPermission();
    setPermission(result);
    if (result !== "granted") { setPref("notifications", false); setNotice(result === "unsupported" ? "Уведомления недоступны в этом браузере" : "Разрешите уведомления в настройках браузера"); return; }
    setPref("notifications", true);
    await showNotification("Amber", "Уведомления включены. Пришлём смену статуса, новости команды и напоминание о смене.");
  };
  const on = prefs.notifications && permission === "granted";
  const kinds = [["notifyStatus", "Смена статуса", "Когда вы отмечаетесь: на площадке, в пути, готов или сбор."], ["notifyTeam", "Команда", "Когда в событие добавляют человека."], ["notifyShifts", "Напоминания о смене", "За 20 минут до начала события и вашей локации."], ["notifyChanges", "Изменения в событии", "Когда меняют команду, расписание, дату или файлы."]] as const;
  return <>
    <ListGroup><ListRow value={<Switch on={on} onToggle={() => { void enable(); }} label="Уведомления" />}>Уведомления</ListRow></ListGroup>
    <Note>{permission === "denied" ? "Браузер запретил уведомления. Разрешите их для Amber в настройках сайта, затем включите переключатель снова." : on ? "Amber пришлёт смену статуса, новости команды и напоминание за 20 минут до смены." : "Включение запросит разрешение. Пока оно выключено, Amber ничего не присылает."}</Note>
    {on && <ListGroup className="mt-4">{kinds.map(([key, title, text]) => <div key={key} className="px-4 py-3"><div className="flex items-center"><span className="text-callout">{title}</span><span className="ml-auto"><Switch on={prefs[key]} onToggle={() => setPref(key, !prefs[key])} label={title} /></span></div><p className="mt-1 pr-16 text-footnote leading-4 text-ink-2">{text}</p></div>)}</ListGroup>}
  </>;
}

function SettingsBody({ page, setPage }: { page: SettingsPage; setPage: (page: SettingsPage) => void }) {
  const prefs = useEmbersStore((s) => s.accountPrefs);
  const setPref = useEmbersStore((s) => s.setAccountPref);
  const theme = useEmbersStore((s) => s.theme);
  const setTheme = useEmbersStore((s) => s.setTheme);
  const user = useEmbersStore((s) => s.currentUser);
  const organizer = useOrganizer();
  const locationCount = useEmbersStore((s) => focusedEvent(s).locationGroups.reduce((sum, group) => sum + group.locations.length, 0));
  const archived = useArchived();
  if (page === "notifications") return <NotificationsPage />;
  if (page === "calendar" || page === "email") {
    const key = page === "calendar" ? "calendar" : "emailUpdates";
    return <>
      <ListGroup><ListRow value={<Switch on={prefs[key]} onToggle={() => setPref(key, !prefs[key])} label={pageTitles[page]} />}>{pageTitles[page]}</ListRow></ListGroup>
      <Note>{page === "calendar" ? "Событие появится в календаре, когда синхронизация будет подключена." : "Письма о приглашениях и изменениях в расписании."}</Note>
    </>;
  }
  if (page === "privacy" || page === "help" || page === "terms") {
    const copy = {
      privacy: "Amber хранит событие, команду и расписание в облаке Firebase. Читать данные могут только участники события.",
      help: "Нажмите на человека в команде, чтобы открыть его карточку и расписание. Организатор выдаёт права в разделе «Команда».",
      terms: "Продолжая пользоваться Amber, вы соглашаетесь с правилами сервиса.",
    }[page];
    return <p className="px-1 text-body leading-6 text-ink-2">{copy}</p>;
  }
  if (page === "archive") return <ArchiveList />;
  if (page === "locations") return <PresetLocations onEdit={(id) => setPage(`edit:${id}`)} />;
  if (page.startsWith("edit:")) return <LocationEditor id={page.slice(5)} />;
  const state = (on: boolean) => on ? "Вкл" : "Выкл";
  const contact = user?.email || user?.phone || accountEmail;
  return <>
    <div className="flex items-center gap-3 rounded-card bg-raised p-3.5">
      <Avatar member={user ? { initials: user.initials, color: user.color } : organizer} size={44} ring={false} />
      <div className="min-w-0"><p className="text-callout font-semibold">{user?.name ?? organizer.name}</p><p className="truncate text-caption text-ink-2">{contact}</p></div>
    </div>
    <Note>Имя и контакты видны команде события, в которое вы вступили.</Note>
    <Group label="События">
      <div className="space-y-2">
        <ListGroup><ListRow onClick={() => setPage("archive")} value={archived.length}>Архив</ListRow></ListGroup>
        <ListGroup><ListRow onClick={() => setPage("notifications")} value={state(prefs.notifications)}>Уведомления</ListRow></ListGroup>
        <ListGroup><ListRow onClick={() => setPage("calendar")} value={state(prefs.calendar)}>Календарь</ListRow></ListGroup>
        <ListGroup><ListRow onClick={() => setPage("email")} value={state(prefs.emailUpdates)}>Письма</ListRow></ListGroup>
      </div>
    </Group>
    <Group label="Локации">
      <ListGroup><ListRow onClick={() => setPage("locations")} value={locationCount}>Заготовленные локации</ListRow></ListGroup>
    </Group>
    <Group label="Оформление">
      <div className="flex items-center rounded-card bg-raised py-2 pl-4 pr-2">
        <span className="text-callout">Тема</span>
        <Segmented className="ml-auto" options={[["system", "Система"], ["light", "Светлая"], ["dark", "Тёмная"]] as ReadonlyArray<readonly [ThemePreference, string]>} value={theme} onChange={setTheme} />
      </div>
    </Group>
    <Group label="Конфиденциальность">
      <ListGroup>
        <ListRow onClick={() => setPage("privacy")}>Как используются данные</ListRow>
        <ListRow onClick={() => setPage("help")} chevron={false}>Помощь</ListRow>
        <ListRow onClick={() => setPage("terms")} chevron={false}>Условия</ListRow>
        <ListRow onClick={() => { void signOutUser().then(() => useEmbersStore.getState().clearSession()); }} chevron={false} danger>Выйти</ListRow>
      </ListGroup>
    </Group>
  </>;
}

const sheetTitles: Partial<Record<Exclude<Sheet, null>, string>> = { join: "Присоединиться", datetime: "Дата и время", location: "Локация", invite: "Команда", files: "Программа", status: "Мой статус", phone: "Номер телефона", account: "Настройки", archive: "Архив", locations: "Заготовленные локации" };
const sheetWidths: Partial<Record<Exclude<Sheet, null>, number>> = { location: 820, invite: 560, account: 480, locations: 520, archive: 520, join: 460, status: 460, phone: 420, datetime: 460, files: 480 };

export function DesktopModals() {
  const sheet = useEmbersStore((s) => s.sheet);
  const close = useEmbersStore((s) => s.closeSheet);
  const [page, setPage] = useState<SettingsPage>("root");
  const [shown, setShown] = useState<Exclude<Sheet, null> | null>(null);
  useEffect(() => {
    if (sheet && sheet !== "member") setShown(sheet);
    if (sheet === "member") close();
    if (sheet === "account") setPage("root");
    if (sheet === "locations") setPage("locations");
    if (sheet === "archive") setPage("archive");
  }, [sheet, close]);
  const settingsLike = shown === "account" || shown === "locations" || shown === "archive";
  const editing = page.startsWith("edit:");
  const back = settingsLike && page !== "root" && (shown === "account" || editing)
    ? { label: editing ? "Локации" : "Настройки", onClick: () => setPage(editing ? "locations" : "root") }
    : undefined;
  const title = settingsLike ? (page === "root" ? "Настройки" : editing ? "Локация" : pageTitles[page]) : shown ? sheetTitles[shown] : "";
  const body = shown === "join" ? <JoinModal />
    : shown === "datetime" ? <DateModal />
    : shown === "location" ? <LocationModal />
    : shown === "invite" ? <InviteModal />
    : shown === "files" ? <FilesModal />
    : shown === "status" ? <StatusModal />
    : shown === "phone" ? <PhoneModal />
    : settingsLike ? <SettingsBody page={page} setPage={setPage} />
    : null;
  const confirm = shown === "datetime" || shown === "location" || shown === "status" || (shown === "account" && page === "root") ? close : undefined;
  return <Modal open={sheet !== null && sheet !== "member"} onClose={close} title={title} width={(shown && sheetWidths[shown]) ?? 480} done={confirm} back={back} leading={shown === "account" && page === "root" ? "none" : "close"}>{body}</Modal>;
}
