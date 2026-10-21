"use client";

import { useState } from "react";
import { useEmbersStore } from "@/store/useEmbersStore";
import { cn } from "../EmbersApp";
import { Button, Icon } from "./ui";

export function DesktopAuth() {
  const setScreen = useEmbersStore((s) => s.setScreen);
  const open = useEmbersStore((s) => s.openSheet);
  const setJoinCode = useEmbersStore((s) => s.setJoinCode);
  const joinByCode = useEmbersStore((s) => s.joinByCode);
  const error = useEmbersStore((s) => s.joinError);
  const [code, setCode] = useState("");
  const join = () => {
    const found = code.toUpperCase().match(/[A-Z0-9]{6}/g)?.at(-1) ?? code;
    setJoinCode(found);
    joinByCode(found);
  };
  return <div className="bg-hero relative flex h-full items-center overflow-hidden px-[clamp(48px,7vw,120px)]">
    <div className="flex min-w-0 flex-1 flex-col items-start pr-12">
      <span className="glass-tint grid h-[104px] w-[104px] place-items-center rounded-[28px] text-ink"><Icon name="flame" size={48} /></span>
      <h1 className="mt-10 text-hero font-extrabold tracking-[-.03em]">Amber</h1>
      <h2 className="mt-5 text-headline font-semibold">Вся команда на одной карте</h2>
      <p className="mt-3 max-w-[420px] text-body leading-6 text-ink-2">Кто где, что делает и сколько осталось — в реальном времени на любом событии</p>
    </div>
    <section className="glass-tint w-[420px] shrink-0 rounded-panel p-8 shadow-[0_32px_80px_rgba(0,0,0,.2)]">
      <h2 className="text-[26px] font-bold tracking-[-.02em]">Войти</h2>
      <p className="mt-2 text-callout leading-5 text-ink-2">Создавайте события, собирайте команду и следите за ней с компьютера</p>
      <div className="mt-7 space-y-3">
        <Button tone="inverse" size="lg" className="w-full" onClick={() => setScreen("hub")}><Icon name="apple" size={20} />Войти через Apple</Button>
        <Button tone="hero" size="lg" className="w-full" onClick={() => open("phone")}><Icon name="phone" size={18} />Войти по номеру</Button>
      </div>
      <div className="my-6 h-px bg-ink/15" />
      <p className="text-callout font-semibold">Есть код от организатора?</p>
      <form onSubmit={(event) => { event.preventDefault(); join(); }} className="mt-3 flex gap-2">
        <input aria-label="Код события" value={code} onChange={(event) => setCode(event.target.value)} placeholder="Код события, напр. 7KQ-24" className={cn("h-11 min-w-0 flex-1 rounded-full bg-black/20 px-4 text-callout uppercase outline-none placeholder:normal-case placeholder:text-ink-3 focus:ring-2 focus:ring-accent/50", error && "ring-2 ring-danger/60")} />
        <Button tone="primary" type="submit">Войти</Button>
      </form>
      {error && <p className="mt-2 px-4 text-footnote text-danger">{error}</p>}
      <p className="mt-6 text-footnote leading-4 text-ink-2">Продолжая, вы принимаете Условия использования<br />и Политику конфиденциальности</p>
    </section>
    <p className="absolute bottom-8 left-[clamp(48px,7vw,120px)] text-footnote text-ink-2">Amber работает и на телефоне — откройте ссылку из приглашения</p>
  </div>;
}
