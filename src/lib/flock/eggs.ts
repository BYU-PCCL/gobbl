import { EGG_COST } from "./config";
import { isEggSkill } from "./skills";

export function canBuyEgg(
  balance: number,
  ownedSkills: string[],
  skill: string,
): "ok" | "invalid" | "owned" | "insufficient" {
  if (!isEggSkill(skill)) return "invalid";
  if (ownedSkills.includes(skill)) return "owned";
  if (balance < EGG_COST) return "insufficient";
  return "ok";
}
