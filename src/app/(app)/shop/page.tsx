"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { LoadingState } from "@/components/ui/LoadingState";
import { PageShell } from "@/components/layout/PageShell";
import { ItemProductShot } from "@/components/gamification/ItemProductShot";
import { MyTurkey } from "@/components/turkey/MyTurkey";
import { TurkeyCharacter } from "@/components/turkey/TurkeyCharacter";
import { useFlock } from "@/components/turkey/useFlock";
import { EGG_COST } from "@/lib/flock/config";
import { EGG_SKILLS, type TurkeySkillKey } from "@/lib/flock/skills";
import type { ShopSlot } from "@/lib/shop";
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
  items: ShopItemRow[];
}

/** Plural labels for the filter chips. */
const FILTER_LABEL: Record<ShopSlot, string> = {
  background: "Backgrounds",
  hat: "Hats",
  face: "Faces",
  neck: "Necks",
  chest: "Chests",
  cape: "Capes",
};

/** Singular labels for the tile badge. */
const SLOT_LABEL: Record<ShopSlot, string> = {
  background: "Background",
  hat: "Hat",
  face: "Face",
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
  /** Errors shown on the card that failed, keyed by item id. */
  const [itemErrors, setItemErrors] = useState<Record<string, string>>({});
  /** Error from taking an item off in the hero. */
  const [heroError, setHeroError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const { turkeys, current, egg, select, reload, loading: flockLoading, error: flockError } = useFlock();
  const [eggBusy, setEggBusy] = useState<TurkeySkillKey | null>(null);
  const [eggError, setEggError] = useState<string | null>(null);

  const load = useCallback(() => {
    return fetch("/api/shop")
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then(setData);
  }, []);

  const [loadError, setLoadError] = useState<string | null>(null);

  const initialLoad = useCallback(() => {
    setLoading(true);
    setLoadError(null);
    load()
      .catch(() => setLoadError("Could not load the shop."))
      .finally(() => setLoading(false));
  }, [load]);

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/"); return; }
    if (status === "authenticated") initialLoad();
  }, [status, router, initialLoad]);

  async function buy(itemId: string) {
    setBusyId(itemId);
    setItemErrors({});
    setHeroError(null);
    try {
      const r = await fetch("/api/shop/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) {
        setItemErrors({ [itemId]: typeof body.error === "string" ? body.error : "Purchase failed" });
        return;
      }
      await load();
      // Refreshes the feather balance in the top bar and sidebar too.
      await reload();
    } catch {
      setItemErrors({ [itemId]: "Purchase failed" });
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
      void reload();
      router.push("/flock");
    } catch {
      setEggError("Could not buy the egg");
    } finally {
      setEggBusy(null);
    }
  }

  /** `errorKey` is the item id whose card shows a failure, or null for the hero. */
  async function equip(slot: ShopSlot, itemId: string | null, errorKey: string | null) {
    if (!current) return;
    setBusyId(`eq-${slot}`);
    setItemErrors({});
    setHeroError(null);
    const fail = (msg: string) => {
      if (errorKey) setItemErrors({ [errorKey]: msg });
      else setHeroError(msg);
    };
    try {
      const r = await fetch("/api/shop/equip", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ turkeyId: current.id, slot, itemId }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) { fail(typeof body.error === "string" ? body.error : "Could not update outfit"); return; }
      await reload();
    } catch {
      fail("Could not update outfit");
    } finally { setBusyId(null); }
  }

  if (loadError) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <p role="alert" className="font-body text-sm text-danger">{loadError}</p>
        <Button onClick={initialLoad}>Try again</Button>
      </div>
    );
  }

  if (loading || !data) {
    return <LoadingState message="Opening the shop..." />;
  }

  const equipped = current?.equipped ?? {};
  const name = current?.name ?? null;
  const hatchedTurkeys = turkeys.filter((t) => t.hatched);

  const ownedSkills = new Set(turkeys.map((t) => t.skill));
  const eggsForSale = EGG_SKILLS.filter((sk) => !ownedSkills.has(sk.key));
  const visible = filter === "all" ? data.items : data.items.filter((i) => i.slot === filter);
  // Equipped items as a list for hero preview chips
  const equippedItems = SHOP_SLOTS
    .map((slot) => {
      const id = equipped[slot];
      return id ? data.items.find((i) => i.id === id) : null;
    })
    .filter(Boolean) as ShopItemRow[];

  const title = name ? `Dress ${name}` : "Dress your turkey";
  const dressNote: "hatch" | "error" | null = flockLoading ? null : flockError ? "error" : current ? null : "hatch";

  return (
    <PageShell
      width="wide"
      eyebrow="Shop"
      title={title}
      aside={
        <div className="hidden items-center gap-1.5 rounded-full border border-ochre bg-ochre-soft px-3.5 py-2 lg:inline-flex">
          <Icon name="feather" size={16} />
          <span className="font-mono text-sm font-semibold text-golden-700 num-tabular">
            {data.featherBalance.toLocaleString()}
          </span>
        </div>
      }
    >
      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-12 lg:items-start lg:gap-8">
        {/* Hero preview */}
        <div className="relative overflow-hidden rounded-3xl border border-line bg-surface p-5 lg:sticky lg:top-6 lg:col-span-5 lg:p-6 xl:col-span-4">
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-ochre-soft/60" />
          <div className="pointer-events-none absolute -bottom-12 -left-12 h-36 w-36 rounded-full bg-primary-soft/55" />
          {hatchedTurkeys.length >= 2 && (
            <div className="relative mb-4 flex flex-wrap gap-2 lg:justify-center" role="group" aria-label="Choose a turkey to dress">
              {hatchedTurkeys.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => select(t.id)}
                  aria-pressed={current?.id === t.id}
                  className={`inline-flex min-h-11 items-center gap-1.5 rounded-full border px-2 py-1 font-body text-xs font-semibold transition-colors ${
                    current?.id === t.id ? "border-primary bg-primary-soft" : "border-line bg-bg hover:border-ink-muted"
                  }`}
                >
                  <MyTurkey turkey={t} size={44} animate={false} decorative />
                  {t.name ?? t.skillLabel}
                </button>
              ))}
            </div>
          )}
          <div className="relative flex items-center gap-4 lg:flex-col lg:items-stretch lg:text-center">
            <div className="shrink-0 lg:mx-auto">
              <MyTurkey turkey={current ?? egg} size={160} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-body text-xs font-semibold text-ink-muted">
                {name ? `${name}'s look` : "Your turkey's look"}
              </div>
              <div className="mt-1 font-display text-[20px] font-bold tracking-[-0.02em]">
                {equippedItems.length > 0 ? "Looking sharp." : "Bare-feathered."}
              </div>
              <div className="mt-2.5 flex flex-wrap gap-1.5 lg:justify-center">
                {equippedItems.length === 0 && (
                  <span className="font-body text-xs text-ink-soft">
                    {current
                      ? "Wear an item to see it here."
                      : dressNote === "hatch"
                        ? "Hatch your egg to dress it."
                        : ""}
                  </span>
                )}
                {equippedItems.map((it) => (
                  <button
                    key={it.id}
                    type="button"
                    onClick={() => equip(it.slot, null, null)}
                    disabled={busyId === `eq-${it.slot}`}
                    aria-label={`Take off ${it.name}`}
                    className="relative inline-flex min-h-11 items-center gap-1.5 rounded-full border border-line bg-bg px-3 py-1 font-body text-xs font-semibold transition-colors hover:border-ink-muted disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {it.name}
                    <Icon name="close" size={12} strokeWidth={2.4} />
                  </button>
                ))}
              </div>
              {heroError && (
                <p role="alert" className="mt-2 font-body text-xs text-danger">{heroError}</p>
              )}
            </div>
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-5 lg:col-span-7 xl:col-span-8">
          {flockError && !flockLoading && (
            <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-3">
              <p className="font-body text-sm text-danger">We could not load your flock.</p>
              <Button size="sm" variant="outline" onClick={() => void reload()}>Try again</Button>
            </div>
          )}

          {/* Eggs: reserve the space while the flock loads so the grid does not jump. */}
          {flockLoading && (
            <section id="eggs" aria-label="Eggs" aria-busy="true" className="scroll-mt-6">
              <div className="h-7 w-24 animate-pulse rounded-lg bg-surface-2 motion-reduce:animate-none" />
              <div className="mt-1 h-4 w-64 max-w-full animate-pulse rounded bg-surface-2 motion-reduce:animate-none" />
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-[236px] animate-pulse rounded-2xl border border-line bg-surface-2 motion-reduce:animate-none" />
                ))}
              </div>
            </section>
          )}
          {!flockLoading && !flockError && current !== null && (
            <section id="eggs" aria-label="Eggs" className="scroll-mt-6">
              <h2 className="font-display text-xl font-bold tracking-[-0.02em]">Eggs</h2>
              <p className="mt-1 font-body text-xs text-ink-soft">Each egg hatches a new turkey for a different skill.</p>
              {eggError && (
                <div role="alert" className="mt-3 rounded-xl bg-plume-100 px-4 py-3 font-body text-sm text-danger">
                  {eggError}
                </div>
              )}
              {eggsForSale.length === 0 ? (
                <p className="mt-3 font-body text-sm text-ink-soft">Your flock covers every skill.</p>
              ) : (
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {eggsForSale.map((sk) => {
                    const short = data.featherBalance < EGG_COST;
                    return (
                      <div key={sk.key} className="rounded-2xl border border-line bg-surface p-2.5">
                        <div className="flex items-center justify-center rounded-xl bg-bg py-2">
                          <TurkeyCharacter stage={1} skill={sk.key} size={96} animate={false} decorative />
                        </div>
                        <div className="px-1 pb-1 pt-2.5">
                          <div className="truncate font-body text-[13px] font-semibold">{sk.label}</div>
                          <div className="mt-1.5 flex items-center justify-between">
                            <span className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-ink num-tabular">
                              <Icon name="feather" size={12} />
                              {EGG_COST.toLocaleString()}
                            </span>
                            <Button
                              size="sm"
                              onClick={() => buyEgg(sk.key)}
                              loading={eggBusy === sk.key}
                              disabled={eggBusy !== null || short}
                            >
                              Buy
                            </Button>
                          </div>
                          {short && (
                            <p className="mt-1.5 font-body text-xs text-ink-muted">
                              Need {(EGG_COST - data.featherBalance).toLocaleString()} more feathers
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* Filter tabs */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 lg:flex-wrap lg:overflow-visible">
            <Chip selected={filter === "all"} onClick={() => setFilter("all")}>All</Chip>
            {SHOP_SLOTS.map((slot) => (
              <Chip key={slot} selected={filter === slot} onClick={() => setFilter(slot)}>
                {FILTER_LABEL[slot]}
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
                balance={data.featherBalance}
                equippedHere={equipped[item.slot] === item.id}
                canDress={current !== null}
                dressNote={dressNote}
                onBuy={() => buy(item.id)}
                onEquip={() => equip(item.slot, item.id, item.id)}
                onUnequip={() => equip(item.slot, null, item.id)}
                buying={busyId === item.id}
                dressBusy={busyId === `eq-${item.slot}`}
                anyBusy={busyId !== null}
                error={itemErrors[item.id] ?? null}
              />
            ))}
          </div>
        </div>
      </div>
    </PageShell>
  );
}

function ShopItemCard({
  item, level, balance, equippedHere, canDress, dressNote, onBuy, onEquip, onUnequip, buying, dressBusy, anyBusy, error,
}: {
  item: ShopItemRow;
  level: number;
  balance: number;
  equippedHere: boolean;
  canDress: boolean;
  dressNote: "hatch" | "error" | null;
  onBuy: () => void;
  onEquip: () => void;
  onUnequip: () => void;
  buying: boolean;
  dressBusy: boolean;
  anyBusy: boolean;
  error: string | null;
}) {
  const locked = !item.owned && item.unlockAt !== undefined && item.unlockAt > level;
  const dim = !item.owned && (locked || !item.canAfford);
  return (
    <div
      className={`overflow-hidden rounded-2xl border bg-surface p-2.5 transition-colors ${
        equippedHere ? "border-primary" : "border-line"
      }`}
    >
      <div
        className="relative flex aspect-square items-center justify-center overflow-hidden rounded-xl"
        style={{ background: item.accentBg }}
      >
        <div className="pointer-events-none absolute inset-2 rounded-xl border border-dashed border-white/45" />
        {/* The wrapper fills the tile: a CSS filter makes it the containing block for backgrounds. */}
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={dim ? { filter: "grayscale(0.6) opacity(0.7)" } : undefined}
        >
          <ItemProductShot itemId={item.id} size={90} />
        </div>
        <Badge tone="dark" size="sm" variant="solid" className="absolute left-2 top-2">
          {SLOT_LABEL[item.slot]}
        </Badge>
      </div>

      <div className="px-1 pb-1 pt-2.5">
        <div className="truncate font-body text-[13px] font-semibold">{item.name}</div>
        <div className="mt-1.5 flex flex-col gap-2">
          {equippedHere ? (
            <>
              <span className="inline-flex items-center gap-1.5 font-body text-xs font-semibold text-forest-fg">
                <Icon name="check" size={12} strokeWidth={3} />
                Wearing
              </span>
              <Button size="sm" variant="outline" className="w-full" onClick={onUnequip} loading={dressBusy} disabled={anyBusy}>
                Take off
              </Button>
            </>
          ) : item.owned ? (
            <>
              <Button
                size="sm"
                variant="dark"
                className="w-full"
                onClick={onEquip}
                loading={dressBusy}
                disabled={anyBusy || !canDress}
              >
                Wear
              </Button>
              {!canDress && dressNote === "hatch" && (
                <span className="font-body text-xs text-ink-muted">Hatch your egg to dress it.</span>
              )}
            </>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5">
                <span className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-ink num-tabular">
                  <Icon name="feather" size={12} />
                  {item.cost.toLocaleString()}
                </span>
                {locked && (
                  <span className="font-body text-xs font-semibold text-ink-muted">Reach level {item.unlockAt}</span>
                )}
              </div>
              {!locked && !item.canAfford && (
                <span className="font-body text-xs text-ink-muted">
                  Need {Math.max(1, item.cost - balance).toLocaleString()} more feathers
                </span>
              )}
              <Button
                size="sm"
                className="w-full"
                variant={item.canAfford && !locked ? "primary" : "outline"}
                onClick={onBuy}
                loading={buying}
                disabled={anyBusy || locked || !item.canAfford}
              >
                {locked ? "Locked" : "Buy"}
              </Button>
            </>
          )}
          {error && (
            <p role="alert" className="font-body text-xs text-danger">{error}</p>
          )}
        </div>
      </div>
    </div>
  );
}
