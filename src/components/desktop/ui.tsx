"use client";

import { useEffect, useId, type CSSProperties, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { type EventPhase, type Member, type Status, focusedEvent, statusMeta, useEmbersStore } from "@/store/useEmbersStore";
import { cn, spring } from "../EmbersApp";

export type IconName =
  | "apple" | "back" | "calendar" | "call" | "check" | "close" | "crown" | "flame" | "link" | "location"
  | "message" | "nav" | "phone" | "pin" | "qr" | "qr-large" | "schedule-back" | "share" | "stage" | "users";

export function Icon({ name, size = 20, className, style }: { name: IconName; size?: number; className?: string; style?: CSSProperties }) {
  return <span aria-hidden className={cn("ds-icon", className)} style={{ width: size, height: size, ["--icon" as string]: `url(/figma-${name}.svg)`, ...style }} />;
}

type ButtonTone = "primary" | "secondary" | "inverse" | "tint" | "hero" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

const toneClass: Record<ButtonTone, string> = {
  primary: "bg-accent text-on-accent shadow-[0_8px_24px_rgba(255,107,0,.32)] hover:brightness-110",
  secondary: "bg-field text-ink hover:bg-ink/15",
  inverse: "bg-inverse text-on-inverse hover:opacity-90",
  tint: "glass-tint text-white hover:bg-white/25",
  hero: "glass-tint text-ink hover:bg-white/25",
  ghost: "text-ink hover:bg-field",
  danger: "bg-danger text-white hover:brightness-110",
};

const sizeClass: Record<ButtonSize, string> = {
  sm: "h-9 gap-1.5 px-4 text-caption font-semibold",
  md: "h-11 gap-2 px-5 text-callout font-semibold",
  lg: "h-[52px] gap-2 px-6 text-body font-semibold",
};

export function Button({ children, tone = "secondary", size = "md", className, onClick, type = "button", disabled, ariaLabel }: {
  children: ReactNode; tone?: ButtonTone; size?: ButtonSize; className?: string; onClick?: () => void; type?: "button" | "submit"; disabled?: boolean; ariaLabel?: string;
}) {
  return <motion.button type={type} aria-label={ariaLabel} disabled={disabled} whileTap={{ scale: .97 }} transition={spring} onClick={onClick} className={cn("inline-flex shrink-0 items-center justify-center rounded-full transition-[background-color,filter,opacity] disabled:opacity-40", toneClass[tone], sizeClass[size], className)}>{children}</motion.button>;
}

export function IconButton({ children, label, onClick, tone = "secondary", size = 40, className }: { children: ReactNode; label: string; onClick?: () => void; tone?: ButtonTone; size?: number; className?: string }) {
  return <motion.button type="button" aria-label={label} title={label} whileTap={{ scale: .94 }} transition={spring} onClick={onClick} style={{ width: size, height: size }} className={cn("grid shrink-0 place-items-center rounded-full transition-[background-color,filter,opacity]", toneClass[tone], className)}>{children}</motion.button>;
}

export function Panel({ children, className, as: Tag = "section" }: { children: ReactNode; className?: string; as?: "section" | "aside" | "div" | "nav" }) {
  return <Tag className={cn("glass-panel rounded-panel", className)}>{children}</Tag>;
}

export function SectionLabel({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("text-footnote font-semibold uppercase tracking-[.04em] text-ink-3", className)}>{children}</p>;
}

export function Avatar({ member, size = 36, ring = true }: { member: Pick<Member, "initials" | "color">; size?: number; ring?: boolean }) {
  return <span style={{ width: size, height: size, background: member.color, fontSize: Math.max(11, Math.round(size * .36)) }} className={cn("grid shrink-0 place-items-center rounded-full font-semibold text-white", ring && "ring-2 ring-white/90")}>{member.initials}</span>;
}

export const organizerFallback = { initials: "ВФ", color: "#9c613d", name: "Вадим Филатов", id: "vadim" };

/** Live organizer from the focused event or signed-in user. */
export function useOrganizer() {
  const currentUser = useEmbersStore((s) => s.currentUser);
  const record = useEmbersStore(focusedEvent);
  if (record.organizer) return record.organizer;
  if (currentUser) {
    return {
      id: currentUser.uid,
      initials: currentUser.initials,
      color: currentUser.color,
      name: currentUser.name,
      role: "Организатор",
      status: "on_site" as const,
      spot: "",
      currentTask: "",
      next: "",
      phone: currentUser.phone,
      coords: { x: 50, y: 50 },
    };
  }
  return { ...organizerFallback, role: "Организатор", status: "on_site" as const, spot: "", currentTask: "", next: "", phone: "", coords: { x: 50, y: 50 } };
}

/** @deprecated use useOrganizer() — kept for static imports during migration */
export const organizer = organizerFallback;

export function StatusPill({ status, size = "md" }: { status: Status; size?: "sm" | "md" }) {
  const meta = statusMeta[status];
  return <span style={{ color: `color-mix(in srgb, ${meta.color} 78%, var(--ds-ink))`, background: `color-mix(in srgb, ${meta.color} 18%, transparent)` }} className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-full font-semibold", size === "md" ? "h-7 px-2.5 text-caption" : "h-6 px-2 text-footnote")}><i style={{ background: meta.color }} className="h-1.5 w-1.5 rounded-full" />{meta.label}</span>;
}

const phaseMeta: Record<EventPhase, { label: string; dot: string }> = {
  live: { label: "LIVE", dot: "#ff3b30" },
  upcoming: { label: "СКОРО", dot: "#ffd60a" },
  past: { label: "ПРОШЛО", dot: "rgba(255,255,255,.5)" },
};

export function PhaseBadge({ phase }: { phase: EventPhase }) {
  const meta = phaseMeta[phase];
  return <span className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full bg-black/30 px-2.5 text-footnote font-bold text-white backdrop-blur-md"><i style={{ background: meta.dot }} className="h-1.5 w-1.5 rounded-full" />{meta.label}</span>;
}

export function PhaseDot({ phase }: { phase: EventPhase }) {
  return <i style={{ background: phase === "past" ? "var(--ds-ink-3)" : phaseMeta[phase].dot }} className="inline-block h-1.5 w-1.5 shrink-0 rounded-full" />;
}

export function phaseLabel(phase: EventPhase) {
  return phaseMeta[phase].label;
}

export function Segmented<T extends string>({ options, value, onChange, className }: { options: ReadonlyArray<readonly [T, string]>; value: T; onChange: (value: T) => void; className?: string }) {
  const id = useId();
  return <div role="tablist" className={cn("inline-flex h-9 shrink-0 items-center rounded-full bg-field p-0.5", className)}>
    {options.map(([key, label]) => <button key={key} type="button" role="tab" aria-selected={value === key} onClick={() => onChange(key)} className={cn("relative h-8 rounded-full px-4 text-caption font-semibold transition-colors", value === key ? "text-on-inverse" : "text-ink-2 hover:text-ink")}>
      {value === key && <motion.i layoutId={`seg-${id}`} transition={spring} className="absolute inset-0 rounded-full bg-inverse shadow-sm" />}
      <span className="relative">{label}</span>
    </button>)}
  </div>;
}

export function Chip({ children, active, onClick }: { children: ReactNode; active?: boolean; onClick?: () => void }) {
  return <button type="button" onClick={onClick} className={cn("h-8 shrink-0 rounded-full px-3 text-caption font-semibold transition-colors", active ? "bg-inverse text-on-inverse" : "bg-field text-ink hover:bg-ink/15")}>{children}</button>;
}

export function Switch({ on, onToggle, label }: { on: boolean; onToggle: () => void; label?: string }) {
  return <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={onToggle} className={cn("h-[31px] w-[51px] shrink-0 rounded-full p-0.5 transition-colors", on ? "bg-success" : "bg-ink/20")}><i className={cn("block h-[27px] w-[27px] rounded-full bg-white shadow-sm transition-transform", on && "translate-x-5")} /></button>;
}

export function TextField({ value, onChange, placeholder, className, onEnter, autoFocus, inputMode, ariaLabel }: { value: string; onChange: (value: string) => void; placeholder?: string; className?: string; onEnter?: () => void; autoFocus?: boolean; inputMode?: "text" | "tel" | "numeric"; ariaLabel?: string }) {
  return <input aria-label={ariaLabel ?? placeholder} autoFocus={autoFocus} inputMode={inputMode} value={value} onChange={(event) => onChange(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && onEnter) { event.preventDefault(); onEnter(); } }} placeholder={placeholder} className={cn("h-11 min-w-0 rounded-full bg-field px-4 text-callout text-ink outline-none placeholder:text-ink-3 focus:ring-2 focus:ring-accent/50", className)} />;
}

export function ListGroup({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("overflow-hidden rounded-card bg-raised [&>*+*]:border-t [&>*+*]:border-line", className)}>{children}</div>;
}

export function ListRow({ children, onClick, value, chevron = Boolean(onClick), className, danger }: { children: ReactNode; onClick?: () => void; value?: ReactNode; chevron?: boolean; className?: string; danger?: boolean }) {
  const body = <>
    <span className={cn("min-w-0 flex-1 truncate text-left", danger && "text-danger")}>{children}</span>
    {value != null && <span className="shrink-0 text-ink-2">{value}</span>}
    {chevron && <ChevronRight size={16} className="shrink-0 text-ink-3" />}
  </>;
  if (onClick) return <button type="button" onClick={onClick} className={cn("flex min-h-12 w-full items-center gap-2 px-4 text-callout transition-colors hover:bg-ink/5", className)}>{body}</button>;
  return <div className={cn("flex min-h-12 w-full items-center gap-2 px-4 text-callout", className)}>{body}</div>;
}

export function EventThumb({ cover, size = 32 }: { cover?: string; size?: number }) {
  return <span style={{ width: size, height: size, backgroundImage: cover ? `url(${cover})` : undefined }} className="relative block shrink-0 overflow-hidden rounded-[10px] bg-brand bg-cover bg-center shadow-[inset_0_0_0_1px_rgba(255,255,255,.15)]" />;
}

export function BackLink({ label, onClick }: { label: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="flex items-center text-callout text-link"><ChevronLeft size={20} />{label}</button>;
}

export function Modal({ open, onClose, title, children, width = 480, done, leading = "close", back }: {
  open: boolean; onClose: () => void; title?: ReactNode; children: ReactNode; width?: number; done?: () => void; leading?: "close" | "none"; back?: { label: string; onClick: () => void };
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  return <AnimatePresence>
    {open && <motion.div key="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: .18 }} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }} className="fixed inset-0 z-[150] grid place-items-center bg-overlay p-8 backdrop-blur-[6px]">
      <motion.div role="dialog" aria-modal="true" initial={{ opacity: 0, y: 16, scale: .97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: .98 }} transition={spring} style={{ width: `min(${width}px, 100%)` }} className="glass-modal no-scrollbar max-h-[calc(100dvh-64px)] overflow-y-auto rounded-[32px] p-5 text-ink">
        {(title || done || leading === "close" || back) && <div className="relative mb-4 flex h-10 items-center">
          {back ? <BackLink label={back.label} onClick={back.onClick} /> : leading === "close" && <IconButton label="Закрыть" onClick={onClose}><Icon name="close" size={16} /></IconButton>}
          {title && <h2 className="pointer-events-none absolute inset-x-24 truncate text-center text-callout font-semibold">{title}</h2>}
          {done && <IconButton label="Готово" tone="inverse" onClick={done} className="ml-auto"><Icon name="check" size={18} /></IconButton>}
        </div>}
        {children}
      </motion.div>
    </motion.div>}
  </AnimatePresence>;
}

export function EmptyNote({ children }: { children: ReactNode }) {
  return <p className="px-4 py-6 text-center text-callout text-ink-2">{children}</p>;
}

export function shortDate(iso: string) {
  const date = new Date(`${iso}T12:00:00`);
  if (!iso || Number.isNaN(date.getTime())) return "Без даты";
  const weekday = new Intl.DateTimeFormat("ru-RU", { weekday: "short" }).format(date);
  const month = new Intl.DateTimeFormat("ru-RU", { month: "short" }).format(date).replace(".", "");
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)}, ${date.getDate()} ${month}`;
}
