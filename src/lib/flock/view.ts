import type { Turkey } from "@prisma/client";
import { getTurkeySkill, isTurkeySkill, type TurkeySkillKey } from "./skills";
import { turkeyNeeds, turkeyMood, type NeedKey, type TurkeyMood } from "./needs";
import { stageForActivityCount, STAGE_NAMES } from "./growth";

export type TurkeyView = {
  id: string;
  skill: TurkeySkillKey;
  skillLabel: string;
  name: string | null;
  hatched: boolean;
  stage: number;
  stageName: string;
  needs: Record<NeedKey, number>;
  mood: TurkeyMood;
  activityCount: number;
  moduleKey: string | null;
};

export function toTurkeyView(row: Turkey, now: Date): TurkeyView {
  if (!isTurkeySkill(row.skill)) throw new Error(`Unknown turkey skill: ${row.skill}`);
  const skill = getTurkeySkill(row.skill);
  const hatched = row.hatchedAt !== null;
  const stage = stageForActivityCount(row.activityCount, hatched);
  const needs = hatched ? turkeyNeeds(row, now) : { hunger: 0, loneliness: 0, sadness: 0 };
  return {
    id: row.id,
    skill: skill.key,
    skillLabel: skill.label,
    name: row.name,
    hatched,
    stage,
    stageName: STAGE_NAMES[stage],
    needs,
    mood: turkeyMood(needs),
    activityCount: row.activityCount,
    moduleKey: skill.moduleKey,
  };
}
