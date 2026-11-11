"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { FlatTurkey } from "@/components/gamification/FlatTurkey";
import { ItemProductShot } from "@/components/gamification/AvatarWithItems";
import { TurkeyCharacter } from "@/components/turkey/TurkeyCharacter";
import { useFlock } from "@/components/turkey/useFlock";
import { EGG_COST } from "@/lib/flock/config";
import { EGG_SKILLS, getTurkeySkill, type TurkeySkillKey } from "@/lib/flock/skills";
import { getSpecies } from "@/lib/companion";
import type { EquippedCosmetics, ShopSlot } from "@/lib/shop";
import { SHOP_SLOTS } from "@/lib/shop";

interface ShopItemRow {
  id: string;
  name: string;
  slot: ShopSlot;
  cost: number;
  accent: string;
  accentBg: string;
  isNew?: boolean;
  unlockAt?: number;
  owned: boolean;
  canAfford: boolean;
}

interface ShopPayload {
  featherBalance: number;
  level: number;
  equipped: EquippedCosmetics;
  items: ShopItemRow[];
}

const SLOT_LABEL: Record<ShopSlot, string> = {
  background: "Backgrounds",
  hat: "Hats",
  face: "Faces",
  neck: "Neck",
  chest: "Chest",
  cape: "Cape",
};

type Filter = "all" | ShopSlot;

export default function ShopPage() {
  const { status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<ShopPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const { turkeys, current, loading: flockLoading, error: flockError } = useFlock();
  const [eggBusy, setEggBusy] = useState<TurkeySkillKey | null>(null);
  const [eggError, setEggError] = useState<string | null>(null);

  const load = useCallback(() => {
    return fetch("/api/shop")
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then(setData);
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/"); return; }
    if (status === "authenticated") {
      setLoading(true);
      load().catch(() => setError("Could not load the bazaar.")).finally(() => setLoading(false));
    }
  }, [status, router, load]);

  async function buy(itemId: string) {
    setBusyId(itemId);
    setError(null);
    try {
      const r = await fetch("/api/shop/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) { setError(typeof body.error === "string" ? body.error : "Purchase failed"); return; }
      await load();
    } finally { setBusyId(null); }
  }

  async function buyEgg(skill: TurkeySkillKey) {
    setEggBusy(skill);
    setEggError(null);
    try {
      const r = await fetch("/api/turkeys/eggs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skill }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) {
        setEggError(
          r.status === 402
            ? "Not enough feathers for that egg yet."
            : r.status === 409
              ? "You already have a turkey for that skill."
              : typeof body.error === "string" ? body.error : "Could not buy the egg",
        );
        return;
      }
      router.push("/hatch");
    } catch {
      setEggError("Could not buy the egg");
    } finally {
      setEggBusy(null);
    }
  }

  async function equip(slot: ShopSlot, itemId: string | null) {
    setBusyId(`eq-${slot}`);
    setError(null);
    try {
      const r = await fetch("/api/shop/equip", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slot, itemId }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) { setError(typeof body.error === "string" ? body.error : "Could not update outfit"); return; }
      await load();
    } finally { setBusyId(null); }
  }

  if (loading || !data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <FlatTurkey stage={1} size="md" animate />
      </div>
    );
  }

  const ownedSkills = new Set(turkeys.map((t) => t.skill));
  const eggsForSale = EGG_SKILLS.filter((sk) => !ownedSkills.has(sk.key));
  const visible = filter === "all" ? data.items : data.items.filter((i) => i.slot === filter);
  // Equipped items as a list for hero preview chips
  const equippedItems = SHOP_SLOTS
    .map((slot) => {
      const id = data.equipped[slot];
      return id ? data.items.find((i) => i.id === id) : null;
    })
    .filter(Boolean) as ShopItemRow[];

  return (
    <div className="flex flex-col gap-5 lg:grid lg:grid-cols-12 lg:items-start lg:gap-8">
      {/* Header */}
      <div className="flex items-start justify-between lg:col-span-12">
        <div>
          <p className="font-body text-sm font-semibold text-primary">The Bazaar</p>
          <h1 className="mt-1 font-display text-[28px] font-bold tracking-[-0.03em] lg:text-[48px]">
            Dress your turkey.
          </h1>
        </div>
        <div className="inline-flex items-center gap-1.5 rounded-full border border-ochre bg-ochre-soft px-3.5 py-2">
          <Icon name="feather" size={16} />
          <span className="font-mono text-sm font-semibold text-golden-700 num-tabular">
            {data.featherBalance.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Hero preview */}
      <div className="relative overflow-hidden rounded-3xl border border-line bg-surface p-5 lg:sticky lg:top-0 lg:col-span-4 lg:p-6">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-ochre-soft/60" />
        <div className="pointer-events-none absolute -bottom-12 -left-12 h-36 w-36 rounded-full bg-primary-soft/55" />
        <div className="relative flex items-center gap-4 lg:flex-col lg:items-stretch lg:text-center">
          <div className="shrink-0">
            {current ? (
              <TurkeyCharacter
                stage={current.stage}
                mood={current.mood}
                skill={current.skill}
                equipped={data.equipped}
                size={160}
                label={current.name ?? current.skillLabel}
              />
            ) : (
              <FlatTurkey stage={1} size={120} />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-body text-xs font-semibold text-ink-muted">
              Your look{current ? `, ${current.name ?? current.skillLabel}` : ""}
            </div>
            <div className="mt-1 font-display text-[20px] font-bold tracking-[-0.02em]">
              {equippedItems.length > 0 ? "Looking sharp." : "Bare-feathered."}
            </div>
            <div className="mt-2.5 flex flex-wrap gap-1.5 lg:justify-center">
              {equippedItems.length === 0 && (
                <span className="font-body text-xs text-ink-soft">Equip an item to see it here.</span>
              )}
              {equippedItems.map((it) => (
                <button
                  key={it.id}
                  type="button"
                  onClick={() => equip(it.slot, null)}
                  className="inline-flex items-center gap-1 rounded-full border border-line bg-bg px-2 py-1 font-body text-[10px] font-semibold transition-colors hover:border-ink-muted"
                  title={`Unequip ${it.name}`}
                >
                  {it.name}
                  <Icon name="close" size={10} strokeWidth={2.4} />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex min-w-0 flex-col gap-5 lg:col-span-8">
      {error && (
        <div className="rounded-xl bg-plume-100 px-4 py-3 font-body text-sm text-plume-700">
          {error}
        </div>
      )}

      {/* Eggs */}
      {!flockLoading && !flockError && turkeys.length === 0 && (
        <section aria-label="Eggs">
          <Link href="/hatch" className="font-body text-sm font-semibold text-primary underline">
            Hatch your free egg first
          </Link>
        </section>
      )}
      {!flockLoading && !flockError && turkeys.length > 0 && (
      <section aria-label="Eggs">
        <h2 className="font-display text-xl font-bold tracking-[-0.02em]">Eggs</h2>
        <p className="mt-1 font-body text-xs text-ink-soft">Each egg hatches a new turkey tied to a skill.</p>
        {eggError && (
          <div role="alert" className="mt-3 rounded-xl bg-plume-100 px-4 py-3 font-body text-sm text-plume-700">
            {eggError}
          </div>
        )}
        {eggsForSale.length === 0 ? (
          <p className="mt-3 font-body text-sm text-ink-soft">Your flock covers every skill.</p>
        ) : (
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {eggsForSale.map((sk) => (
              <div key={sk.key} className="rounded-2xl border border-line bg-surface p-2.5">
                <div className="flex items-center justify-center rounded-xl bg-bg py-2">
                  <FlatTurkey
                    stage={1}
                    size={96}
                    palette={getSpecies(getTurkeySkill(sk.key).species).palette}
                    eggPattern={getSpecies(getTurkeySkill(sk.key).species).eggPattern}
                  />
                </div>
                <div className="px-1 pb-1 pt-2.5">
                  <div className="truncate font-body text-[13px] font-bold">{sk.label}</div>
                  <div className="mt-1.5 flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 font-mono text-xs font-bold text-ink num-tabular">
                      <Icon name="feather" size={11} />
                      {EGG_COST.toLocaleString()}
                    </span>
                    <Button size="sm" onClick={() => buyEgg(sk.key)} disabled={eggBusy !== null || data.featherBalance < EGG_COST}>
                      Buy
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 lg:flex-wrap lg:overflow-visible">
        <Chip selected={filter === "all"} onClick={() => setFilter("all")}>All</Chip>
        {SHOP_SLOTS.map((slot) => (
          <Chip key={slot} selected={filter === slot} onClick={() => setFilter(slot)}>
            {SLOT_LABEL[slot]}
          </Chip>
        ))}
      </div>

      {/* Items grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:gap-4 xl:grid-cols-4">
        {visible.map((item) => (
          <ShopItemCard
            key={item.id}
            item={item}
            level={data.level}
            equippedHere={data.equipped[item.slot] === item.id}
            onBuy={() => buy(item.id)}
            onEquip={() => equip(item.slot, item.id)}
            onUnequip={() => equip(item.slot, null)}
            busy={busyId === item.id || busyId === `eq-${item.slot}`}
          />
        ))}
      </div>
      </div>
    </div>
  );
}

function ShopItemCard({
  item, level, equippedHere, onBuy, onEquip, onUnequip, busy,
}: {
  item: ShopItemRow;
  level: number;
  equippedHere: boolean;
  onBuy: () => void;
  onEquip: () => void;
  onUnequip: () => void;
  busy: boolean;
}) {
  const locked = !item.owned && item.unlockAt !== undefined && item.unlockAt > level;
  return (
    <div
      className={`overflow-hidden rounded-2xl border bg-surface p-2.5 transition-colors ${
        equippedHere ? "border-forest-500" : "border-line"
      }`}
    >
      <div
        className="relative flex aspect-square items-center justify-center overflow-hidden rounded-xl"
        style={{ background: item.accentBg }}
      >
        <div className="pointer-events-none absolute inset-2 rounded-xl border border-dashed border-white/45" />
        <div
          style={!item.owned && (locked || !item.canAfford) ? { filter: "grayscale(0.6) opacity(0.7)" } : undefined}
        >
          <ItemProductShot itemId={item.id} size={90} />
        </div>
        <Badge tone="dark" size="sm" variant="solid" className="absolute left-2 top-2">
          {item.slot}
        </Badge>
      </div>

      <div className="px-1 pb-1 pt-2.5">
        <div className="truncate font-body text-[13px] font-bold">{item.name}</div>
        <div className="mt-1.5 flex items-center justify-between">
          {equippedHere ? (
            <button
              type="button"
              onClick={onUnequip}
              disabled={busy}
              className="inline-flex items-center gap-1 font-mono text-[10px] font-bold uppercase tracking-[0.06em] text-forest-600"
            >
              <Icon name="check" size={10} strokeWidth={3} />
              Equipped
            </button>
          ) : item.owned ? (
            <Button size="sm" variant="dark" onClick={onEquip} disabled={busy}>Equip</Button>
          ) : (
            <span className="inline-flex items-center gap-1 font-mono text-xs font-bold text-ink num-tabular">
              <Icon name="feather" size={11} />
              {item.cost.toLocaleString()}
            </span>
          )}
          {locked && (
            <span className="font-body text-[11px] font-semibold text-ink-muted">Reach level {item.unlockAt}</span>
          )}
          {!item.owned && (
            <Button
              size="sm"
              variant={item.canAfford && !locked ? "primary" : "outline"}
              onClick={onBuy}
              disabled={busy || locked || !item.canAfford}
            >
              {locked ? "Locked" : "Buy"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
