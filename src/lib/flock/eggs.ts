import { EGG_COST } from "./config";
import { isTurkeySkill } from "./skills";

export function canBuyEgg(
  balance: number,
  ownedSkills: string[],
  skill: string,
): "ok" | "invalid" | "owned" | "insufficient" {
  if (!isTurkeySkill(skill)) return "invalid";
  if (ownedSkills.includes(skill)) return "owned";
  if (balance < EGG_COST) return "insufficient";
  return "ok";
}
