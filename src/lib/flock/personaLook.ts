import { PERSONAS } from "@/lib/personas/pool";
import { getSpecies, type EggPattern, type SpeciesId } from "@/lib/companion";
import type { TurkeyPalette } from "@/lib/turkeyPalette";

/** Every conversation partner is drawn as a grown turkey, in the park and in the conversation. */
export const PARTNER_STAGE = 5;

const SPECIES_ORDER: SpeciesId[] = ["ocellated", "rio", "merriams", "goulds", "eastern"];

/**
 * A partner's colours, fixed per persona so the same initials always look the same. Personas of
 * one difficulty get five different species. An unknown id gets the first species.
 */
export function personaLook(personaId: string | null | undefined): { palette: TurkeyPalette; eggPattern: EggPattern } {
  const persona = PERSONAS.find((p) => p.id === personaId);
  const inTier = persona ? PERSONAS.filter((p) => p.tier === persona.tier).indexOf(persona) : 0;
  const species = getSpecies(SPECIES_ORDER[Math.max(0, inTier) % SPECIES_ORDER.length]);
  return { palette: species.palette, eggPattern: species.eggPattern };
}
