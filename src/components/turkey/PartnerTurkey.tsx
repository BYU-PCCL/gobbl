"use client";

import { TurkeyCharacter, type TurkeyCharacterProps } from "./TurkeyCharacter";
import { PARTNER_STAGE, personaLook } from "@/lib/flock/personaLook";

type Passthrough = Pick<TurkeyCharacterProps, "size" | "className" | "animate" | "showShadow" | "flip" | "decorative" | "crop">;

/** A conversation partner (an LLM persona), drawn the same in the park and in the conversation. */
export function PartnerTurkey({ personaId, initials, ...rest }: { personaId: string | null | undefined; initials?: string | null } & Passthrough) {
  const look = personaLook(personaId);
  return <TurkeyCharacter stage={PARTNER_STAGE} mood="happy" palette={look.palette} eggPattern={look.eggPattern} label={initials ?? "Your partner"} {...rest} />;
}
